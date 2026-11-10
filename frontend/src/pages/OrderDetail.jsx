import React, { useCallback, useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { STORE } from "../config/store";
import { canPayNow, orderRef } from "../utils/orderLabels";
import { useT } from "../i18n/LanguageContext";
import { payForOrder, PaymentCancelled } from "../utils/razorpay";
import { describeSkipped, reorderIntoCart } from "../utils/reorder";
import "../styles/product.css";
import "../styles/orderDetail.css";

const FLOW = ["pending", "confirmed", "packed", "shipped", "delivered"];
const money = (n) => `₹${Number(n || 0).toFixed(2)}`;
const when = (d, locale) => (d ? new Date(d).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

const OrderDetail = () => {
  const { id } = useParams();
  const { t, tm, tOr, tr, ts, locale } = useT();
  const { user } = useContext(AuthContext);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [canCancel, setCanCancel] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState("");

  const token = user?.token;

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not load this order");
      setOrder(data.order);
      setCanCancel(Boolean(data.canCancel));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [id, token]);

  useEffect(() => { load(); }, [load]);

  // Keep the status fresh while the order is still moving
  const finished = order && ["delivered", "cancelled"].includes(order.status);
  useEffect(() => {
    if (!order || finished) return undefined;
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [order, finished, load]);

  if (!token) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-card success-card">
          <h1>{t("track.loginTitle")}</h1>
          <p>{t("track.loginText")}</p>
          <Link to="/login" className="view-details-button">{t("nav.login")}</Link>
        </div>
      </div>
    );
  }
  if (error) return <div className="product-detail-page"><p className="product-error">{tm(error)}</p><Link to="/myorders">{t("track.allOrders")}</Link></div>;
  if (!order) return <div className="product-detail-page"><p>{t("track.loading")}</p></div>;

  const cancelOrder = async () => {
    if (!window.confirm(t("track.confirmCancel"))) return;
    setBusy("cancel");
    setNote({ type: "", text: "" });
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not cancel the order");
      setNote({ type: "success", text: data.message });
      await load();
    } catch (err) {
      setNote({ type: "error", text: err.message });
    } finally {
      setBusy("");
    }
  };

  const reorder = async () => {
    setBusy("reorder");
    setNote({ type: "", text: "" });
    try {
      const { added, skipped } = await reorderIntoCart({ orderId: id, token, dispatch });
      if (skipped.length === 0) return navigate("/cart");
      setNote({
        type: added ? "success" : "error",
        cart: added > 0,
        text: `${added ? t("orders.added", { count: added }) : ""}${t("orders.notAdded", { list: describeSkipped(skipped.map((s) => ({ ...s, reason: tr(s.reason) }))) })}`,
      });
    } catch (err) {
      setNote({ type: "error", text: err.message });
    } finally {
      setBusy("");
    }
  };

  const payNow = async () => {
    setBusy("pay");
    setNote({ type: "", text: "" });
    try {
      await payForOrder({
        orderId: id,
        token,
        prefill: { name: order.address?.fullName, email: user.email, contact: order.contactPhone },
      });
      setNote({ type: "success", text: t("orders.paymentReceived") });
    } catch (err) {
      setNote({ type: "error", text: err instanceof PaymentCancelled ? "Payment was not completed." : err.message });
    } finally {
      setBusy("");
      load();
    }
  };

  const history = order.statusHistory || [];
  const currentIdx = FLOW.indexOf(order.status);
  const cancelledEntry = [...history].reverse().find((h) => h.status === "cancelled");
  const reachedAt = (key) => history.find((h) => h.status === key)?.at || (key === "pending" ? order.createdAt : null);

  return (
    <div className="product-detail-page">
      <div className="product-detail-card">
        <h1>{t("orders.number", { ref: orderRef(order) })}</h1>
        <p>
          <strong>{tOr(`orderStatus.${order.status}`, order.status)}</strong> · {order.paymentMethod === "Razorpay" ? t("order.methodOnline") : t("order.methodCod")} ·{" "}
          {tOr(`payStatus.${order.paymentStatus}`, order.paymentStatus || "")}
        </p>

        <ol className="timeline" aria-label={t("track.progress")}>
          {FLOW.map((key, i) => {
            const done = order.status !== "cancelled" && i <= currentIdx;
            const wasReached = order.status === "cancelled" && key === "pending";
            const labelKey = key === "pending" ? t("track.placed") : tOr(`orderStatus.${key}`, key);
            return (
              <li key={key} className={`${done || wasReached ? "done" : ""} ${done && i === currentIdx ? "current" : ""}`}>
                <span className="dot">{done || wasReached ? "✓" : ""}</span>
                {labelKey}
                {(done || wasReached) && reachedAt(key) && <small>{when(reachedAt(key), locale)}</small>}
              </li>
            );
          })}
          {order.status === "cancelled" && (
            <li className="cancelled">
              <span className="dot">✕</span>
              {t("track.cancelled")}
              {cancelledEntry && <small>{when(cancelledEntry.at, locale)}{cancelledEntry.note ? ` · ${tm(cancelledEntry.note)}` : ""}</small>}
              {order.paymentStatus === "refund_pending" && <small>{t("track.refund")}</small>}
            </li>
          )}
        </ol>

        {note.text && <div className={`auth-message ${note.type}`}>{tm(note.text)} {note.cart && <Link to="/cart">{t("orders.goToCart")}</Link>}</div>}

        <div className="order-actions">
          {canPayNow(order) && (
            <button type="button" className="view-details-button" onClick={payNow} disabled={busy === "pay"}>
              {busy === "pay" ? t("orders.opening") : t("track.payNow", { total: money(order.totalPrice) })}
            </button>
          )}
          <a className="view-details-button" href={STORE.phoneHref}>{t("track.call")}</a>
          <button type="button" className="view-details-button" onClick={reorder} disabled={busy === "reorder"}>
            {busy === "reorder" ? t("track.adding") : t("track.reorder")}
          </button>
          {canCancel && order.status !== "cancelled" && (
            <button type="button" className="danger-button" onClick={cancelOrder} disabled={busy === "cancel"}>
              {busy === "cancel" ? t("track.cancelling") : t("track.cancelOrder")}
            </button>
          )}
        </div>
        {!canCancel && !finished && <p><small>{t("track.packingNote")}</small></p>}
      </div>

      <div className="product-detail-card" style={{ marginTop: 16 }}>
        <h2>{t("track.items")}</h2>
        {order.orderItems.map((item, i) => (
          <div className="order-line" key={i}>
            <span>{item.productId?.name || t("track.productFallback")} × {item.quantity}</span>
            <strong>{money(item.price * item.quantity)}</strong>
          </div>
        ))}
        <div className="order-line"><span>{t("track.itemsLine")}</span><span>{money(order.itemsTotal ?? order.totalPrice)}</span></div>
        <div className="order-line"><span>{t("track.deliveryFee")}</span><span>{order.deliveryFee > 0 ? money(order.deliveryFee) : t("common.free")}</span></div>
        {order.discount > 0 && <div className="order-line"><span>{t("track.discount")}</span><span>-{money(order.discount)}</span></div>}
        <div className="order-line"><strong>{t("track.total")}</strong><strong>{money(order.totalPrice)}</strong></div>

        <h2 style={{ marginTop: 20 }}>{t("track.deliverySection")}</h2>
        <p>
          {order.address?.fullName}<br />
          {order.address?.street}, {order.address?.city}, {order.address?.state} {order.address?.zipCode}<br />
          {t("track.phone", { phone: order.contactPhone })}
        </p>
        {order.deliverySlot?.label && <p><strong>{t("track.deliveryTime")}</strong> {ts(order.deliverySlot.label)}</p>}
        <Link to="/myorders" className="back-link">{t("track.allOrders")}</Link>
      </div>
    </div>
  );
};

export default OrderDetail;
