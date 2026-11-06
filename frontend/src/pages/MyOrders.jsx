import React, { useCallback, useEffect, useState, useContext } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { canCustomerCancel, canPayNow, orderRef, orderStatusLabel, paymentStatusLabel } from "../utils/orderLabels";
import { payForOrder, PaymentCancelled } from "../utils/razorpay";
import { describeSkipped, reorderIntoCart } from "../utils/reorder";
import "../styles/product.css";
import "../styles/orderDetail.css";

const MyOrders = () => {
  const { user } = useContext(AuthContext);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null); // `${action}:${orderId}`
  const [note, setNote] = useState({ type: "", text: "" });

  const token = user?.token;

  const fetchOrders = useCallback(async () => {
    if (!token) {
      setError("Please log in to view your orders.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/orders/myorders", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load orders.");
      setOrders(data.orders || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const run = async (key, fn) => {
    setNote({ type: "", text: "" });
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      setNote({ type: "error", text: err instanceof PaymentCancelled ? "Payment was not completed." : err.message });
    } finally {
      setBusy(null);
      fetchOrders();
    }
  };

  const payNow = (order) =>
    run(`pay:${order._id}`, async () => {
      await payForOrder({
        orderId: order._id,
        token,
        prefill: { name: order.address?.fullName, email: user.email, contact: order.contactPhone },
      });
      setNote({ type: "success", text: "Payment received. Thank you!" });
    });

  const cancel = (order) => {
    if (!window.confirm(`Cancel order ${orderRef(order)}?`)) return;
    return run(`cancel:${order._id}`, async () => {
      const res = await fetch(`/api/orders/${order._id}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not cancel the order");
      setNote({ type: "success", text: data.message });
    });
  };

  const reorder = (order) =>
    run(`reorder:${order._id}`, async () => {
      const { added, skipped } = await reorderIntoCart({ orderId: order._id, token, dispatch });
      if (skipped.length === 0) {
        navigate("/cart");
        return;
      }
      setNote({
        type: added ? "success" : "error",
        text: `${added ? `${added} item(s) added to your cart. ` : ""}Not added: ${describeSkipped(skipped)}.`,
      });
    });

  if (!user) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-card success-card">
          <h1>My Orders</h1>
          <p>Please log in to see your order history.</p>
          <Link to="/login" className="view-details-button">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <div className="product-detail-card profile-card">
        <div>
          <h1>My Orders</h1>
          <p>Track, cancel or reorder your purchases.</p>
        </div>
        <Link to="/profile" className="view-details-button">Back to profile</Link>
      </div>

      <div className="profile-orders">
        {note.text && <p className={`auth-message ${note.type}`}>{note.text} {note.type === "success" && note.text.includes("cart") && <Link to="/cart">Go to cart</Link>}</p>}
        {loading ? (
          <p>Loading orders...</p>
        ) : error ? (
          <p className="product-error">{error}</p>
        ) : orders.length === 0 ? (
          <p>No orders yet. <Link to="/shop">Start shopping</Link></p>
        ) : (
          <div className="cart-items-list">
            {orders.map((order) => (
              <div className="cart-item-card" key={order._id}>
                <div className="cart-item-details">
                  <h3><Link to={`/orders/${order._id}`}>Order {orderRef(order)}</Link></h3>
                  <p><strong>Total: ₹{Number(order.totalPrice).toFixed(2)}</strong> · {new Date(order.createdAt).toLocaleDateString()}</p>
                  <p>Status: {orderStatusLabel(order.status)}</p>
                  {order.deliverySlot?.label && order.status !== "cancelled" && order.status !== "delivered" && (
                    <p>Delivery: {order.deliverySlot.label}</p>
                  )}
                  <p>Payment: {order.paymentMethod === "Razorpay" ? "Online" : "Cash on Delivery"} · {paymentStatusLabel(order.paymentStatus)}</p>

                  <div className="order-actions">
                    <Link to={`/orders/${order._id}`} className="view-details-button">Track</Link>
                    {canPayNow(order) && (
                      <button type="button" className="view-details-button" onClick={() => payNow(order)} disabled={busy === `pay:${order._id}`}>
                        {busy === `pay:${order._id}` ? "Opening..." : "Pay now"}
                      </button>
                    )}
                    <button type="button" className="view-details-button" onClick={() => reorder(order)} disabled={busy === `reorder:${order._id}`}>
                      Reorder
                    </button>
                    {canCustomerCancel(order) && (
                      <button type="button" className="danger-button" onClick={() => cancel(order)} disabled={busy === `cancel:${order._id}`}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
