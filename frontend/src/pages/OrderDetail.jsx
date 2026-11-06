import React, { useCallback, useContext, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { STORE } from "../config/store";
import { canPayNow, orderRef, orderStatusLabel, paymentStatusLabel } from "../utils/orderLabels";
import { payForOrder, PaymentCancelled } from "../utils/razorpay";
import { describeSkipped, reorderIntoCart } from "../utils/reorder";
import "../styles/product.css";
import "../styles/orderDetail.css";

const FLOW = ["pending", "confirmed", "packed", "shipped", "delivered"];
const money = (n) => `₹${Number(n || 0).toFixed(2)}`;
const when = (d) => (d ? new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

const OrderDetail = () => {
  const { id } = useParams();
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
          <h1>Track your order</h1>
          <p>Please log in to see this order.</p>
          <Link to="/login" className="view-details-button">Login</Link>
        </div>
      </div>
    );
  }
  if (error) return <div className="product-detail-page"><p className="product-error">{error}</p><Link to="/myorders">← My orders</Link></div>;
  if (!order) return <div className="product-detail-page"><p>Loading order...</p></div>;

  const cancelOrder = async () => {
    if (!window.confirm("Cancel this order?")) return;
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
        text: `${added ? `${added} item(s) added to your cart. ` : ""}Not added: ${describeSkipped(skipped)}.`,
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
      setNote({ type: "success", text: "Payment received. Thank you!" });
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
        <h1>Order {orderRef(order)}</h1>
        <p>
          <strong>{orderStatusLabel(order.status)}</strong> · {order.paymentMethod === "Razorpay" ? "Online" : "Cash on Delivery"} ·{" "}
          {paymentStatusLabel(order.paymentStatus)}
        </p>

        <ol className="timeline" aria-label="Order progress">
          {FLOW.map((key, i) => {
            const done = order.status !== "cancelled" && i <= currentIdx;
            const wasReached = order.status === "cancelled" && key === "pending";
            const labelKey = key === "pending" ? "Order placed" : orderStatusLabel(key);
            return (
              <li key={key} className={`${done || wasReached ? "done" : ""} ${done && i === currentIdx ? "current" : ""}`}>
                <span className="dot">{done || wasReached ? "✓" : ""}</span>
                {labelKey}
                {(done || wasReached) && reachedAt(key) && <small>{when(reachedAt(key))}</small>}
              </li>
            );
          })}
          {order.status === "cancelled" && (
            <li className="cancelled">
              <span className="dot">✕</span>
              Cancelled
              {cancelledEntry && <small>{when(cancelledEntry.at)}{cancelledEntry.note ? ` · ${cancelledEntry.note}` : ""}</small>}
              {order.paymentStatus === "refund_pending" && <small>Your payment will be refunded by the store.</small>}
            </li>
          )}
        </ol>

        {note.text && <div className={`auth-message ${note.type}`}>{note.text}</div>}

        <div className="order-actions">
          {canPayNow(order) && (
            <button type="button" className="view-details-button" onClick={payNow} disabled={busy === "pay"}>
              {busy === "pay" ? "Opening..." : `Pay now · ${money(order.totalPrice)}`}
            </button>
          )}
          <a className="view-details-button" href={STORE.phoneHref}>Call store</a>
          <button type="button" className="view-details-button" onClick={reorder} disabled={busy === "reorder"}>
            {busy === "reorder" ? "Adding..." : "Reorder"}
          </button>
          {canCancel && order.status !== "cancelled" && (
            <button type="button" className="danger-button" onClick={cancelOrder} disabled={busy === "cancel"}>
              {busy === "cancel" ? "Cancelling..." : "Cancel order"}
            </button>
          )}
        </div>
        {!canCancel && !finished && <p><small>This order is already being packed. Please call the store if you need to change it.</small></p>}
      </div>

      <div className="product-detail-card" style={{ marginTop: 16 }}>
        <h2>Items</h2>
        {order.orderItems.map((item, i) => (
          <div className="order-line" key={i}>
            <span>{item.productId?.name || "Product"} × {item.quantity}</span>
            <strong>{money(item.price * item.quantity)}</strong>
          </div>
        ))}
        <div className="order-line"><span>Items</span><span>{money(order.itemsTotal ?? order.totalPrice)}</span></div>
        <div className="order-line"><span>Delivery</span><span>{order.deliveryFee > 0 ? money(order.deliveryFee) : "Free"}</span></div>
        {order.discount > 0 && <div className="order-line"><span>Student discount</span><span>-{money(order.discount)}</span></div>}
        <div className="order-line"><strong>Total</strong><strong>{money(order.totalPrice)}</strong></div>

        <h2 style={{ marginTop: 20 }}>Delivery</h2>
        <p>
          {order.address?.fullName}<br />
          {order.address?.street}, {order.address?.city}, {order.address?.state} {order.address?.zipCode}<br />
          Phone: {order.contactPhone}
        </p>
        {order.deliverySlot?.label && <p><strong>Delivery time:</strong> {order.deliverySlot.label}</p>}
        <Link to="/myorders" className="back-link">← All my orders</Link>
      </div>
    </div>
  );
};

export default OrderDetail;
