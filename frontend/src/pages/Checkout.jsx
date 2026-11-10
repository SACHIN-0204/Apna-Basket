import React, { useContext, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { clearToCart } from "../redux/cartSlice";
import "../styles/product.css";

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.cartItems);
  const { user: authUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    fullName: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    paymentMethod: "Cash on Delivery",
  });
  const [studentBypass, setStudentBypass] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const subtotal = cartItems.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
  const deliveryFee = cartItems.length > 0 ? 40 : 0;
  const studentDiscount = studentBypass ? subtotal * 0.1 : 0;
  const total = subtotal + deliveryFee - studentDiscount;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${authUser?.token || ""}`,
  });

  const postJson = async (url, body, method = "POST") => {
    const res = await fetch(url, { method, headers: authHeaders(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  };

  const finishOrder = () => {
    dispatch(clearToCart());
    navigate("/order-success");
  };

  const loadRazorpay = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
      document.body.appendChild(script);
    });

  // Pay for an order that already exists on the server. The amount is read from the saved
  // order on the server - the browser never tells the server how much to charge.
  const payOnline = async (order) => {
    // Give the stock back if the customer walks away from the payment window
    const releaseOrder = async () => {
      try {
        await postJson(`/api/orders/${order._id}/cancel`, null, "PUT");
      } catch (err) {
        console.error("Could not release order:", err);
      }
    };

    try {
      await loadRazorpay();
      const paymentData = await postJson("/api/payments/order", { orderId: order._id });

      const key = paymentData.key || process.env.REACT_APP_RAZORPAY_KEY_ID;
      if (!key) throw new Error("Razorpay key is not configured.");

      let paymentDone = false;

      const rzp = new window.Razorpay({
        key,
        amount: paymentData.amount,
        currency: paymentData.currency || "INR",
        name: "Abhishek Kirana Store",
        description: "Order payment",
        order_id: paymentData.id,
        handler: async (response) => {
          paymentDone = true;
          try {
            await postJson("/api/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            finishOrder();
          } catch (err) {
            setMessage({
              type: "error",
              text: `${err.message} If money was deducted, do not pay again - check My Orders (order #${String(order._id).slice(-6).toUpperCase()}) or contact us.`,
            });
            setLoading(false);
          }
        },
        modal: {
          ondismiss: async () => {
            if (paymentDone) return;
            await releaseOrder();
            setMessage({ type: "error", text: "Payment was cancelled. Your cart is still saved - you can try again." });
            setLoading(false);
          },
        },
        prefill: {
          name: formData.fullName,
          email: authUser?.email || "",
        },
        theme: {
          color: "#f97316",
        },
      });

      rzp.on("payment.failed", (resp) => {
        setMessage({
          type: "error",
          text: resp?.error?.description || "Payment failed. You can retry in the payment window.",
        });
      });

      rzp.open();
    } catch (err) {
      // Never got as far as opening the payment window, so the order would sit unpaid
      await releaseOrder();
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!cartItems.length) {
      setMessage({ type: "error", text: "Your cart is empty." });
      return;
    }

    if (!authUser?.token) {
      setMessage({ type: "error", text: "Please log in to place an order." });
      return;
    }

    if (studentBypass && !studentEmail.trim()) {
      setMessage({ type: "error", text: "Please enter your student email to use the student bypass." });
      return;
    }

    // Only say WHAT is wanted. Prices, delivery fee, discount and the total are decided by the server.
    const { paymentMethod, ...address } = formData;
    const orderPayload = {
      orderItems: cartItems.map((item) => ({
        productId: item._id,
        quantity: item.quantity || 1,
      })),
      address,
      paymentMethod,
      studentBypass,
      studentEmail: studentBypass ? studentEmail.trim() : "",
    };

    let waitingForPaymentWindow = false;
    try {
      setLoading(true);

      const { order } = await postJson("/api/orders", orderPayload);

      if (paymentMethod === "Razorpay") {
        await payOnline(order);
        waitingForPaymentWindow = true; // loading is switched off by the payment window callbacks
        return;
      }

      finishOrder();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      if (!waitingForPaymentWindow) setLoading(false);
    }
  };

  return (
    <div className="product-detail-page">
      <h1>Checkout</h1>

      <div className="cart-layout">
        <form className="product-detail-card" onSubmit={handleSubmit}>
          <h2>Shipping Details</h2>

          <div className="form-group">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="street">Street address</label>
            <input id="street" name="street" value={formData.street} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="city">City</label>
            <input id="city" name="city" value={formData.city} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="state">State</label>
            <input id="state" name="state" value={formData.state} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="zipCode">ZIP code</label>
            <input id="zipCode" name="zipCode" value={formData.zipCode} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="paymentMethod">Payment method</label>
            <select id="paymentMethod" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
              <option value="Cash on Delivery">Cash on Delivery</option>
              <option value="Razorpay">Razorpay</option>
            </select>
          </div>

          <div className="student-bypass-card">
            <label className="student-toggle">
              <input type="checkbox" checked={studentBypass} onChange={() => setStudentBypass((prev) => !prev)} />
              <span>Student bypass</span>
            </label>
            <p>Students get a 10% discount on the items total.</p>
            {studentBypass && (
              <input
                className="student-input"
                type="email"
                placeholder="Enter student email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
              />
            )}
          </div>

          {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}

          <button className="view-details-button" type="submit" disabled={loading}>
            {loading ? "Processing..." : "Place order"}
          </button>
        </form>

        <div className="cart-summary-card">
          <h2>Order Summary</h2>
          {cartItems.map((item) => (
            <div className="summary-row" key={item._id}>
              <span>{item.name} × {item.quantity || 1}</span>
              <strong>₹{(item.price * (item.quantity || 1)).toFixed(2)}</strong>
            </div>
          ))}
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>₹{subtotal.toFixed(2)}</strong>
          </div>
          <div className="summary-row">
            <span>Delivery</span>
            <strong>₹{deliveryFee.toFixed(2)}</strong>
          </div>
          {studentBypass && (
            <div className="summary-row">
              <span>Student bypass</span>
              <strong>-₹{studentDiscount.toFixed(2)}</strong>
            </div>
          )}
          <div className="summary-row total-row">
            <span>Total</span>
            <strong>₹{Math.max(0, total).toFixed(2)}</strong>
          </div>
          <Link to="/cart" className="back-link">← Back to cart</Link>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
