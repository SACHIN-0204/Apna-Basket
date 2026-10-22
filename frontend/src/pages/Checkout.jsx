import React, { useContext, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../styles/product.css";

const Checkout = () => {
  const navigate = useNavigate();
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

  const submitOrder = async (orderPayload) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authUser?.token || ""}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Unable to place order");
    }

    setMessage({ type: "success", text: data.message || "Order placed successfully!" });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!cartItems.length) {
      setMessage({ type: "error", text: "Your cart is empty." });
      return;
    }

    if (studentBypass && !studentEmail.trim()) {
      setMessage({ type: "error", text: "Please enter your student email to use the student bypass." });
      return;
    }

    const orderPayload = {
      orderItems: cartItems.map((item) => ({
        productId: item._id,
        quantity: item.quantity || 1,
        price: item.price,
      })),
      totalPrice: Math.max(0, total),
      address: formData,
      paymentMethod: formData.paymentMethod,
      studentBypass,
      studentEmail: studentBypass ? studentEmail : "",
    };

    try {
      setLoading(true);

      if (formData.paymentMethod === "Razorpay") {
        if (!authUser?.token) {
          throw new Error("Please log in before paying with Razorpay.");
        }

        await loadRazorpay();
        const paymentRes = await fetch("/api/payments/order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authUser.token}`,
          },
          body: JSON.stringify({ amount: Math.round(Math.max(0, total)) }),
        });

        const paymentData = await paymentRes.json();
        if (!paymentRes.ok) {
          throw new Error(paymentData.message || "Unable to initialize Razorpay");
        }

        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID || "",
          amount: paymentData.amount,
          currency: paymentData.currency || "INR",
          name: "Apna Basket",
          description: "Order payment",
          order_id: paymentData.id,
          handler: async (response) => {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authUser.token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              setMessage({ type: "error", text: verifyData.message || "Payment verification failed" });
              return;
            }

            await submitOrder(orderPayload);
          },
          prefill: {
            name: formData.fullName,
            email: authUser?.email || "",
          },
          theme: {
            color: "#f97316",
          },
        };

        if (!options.key) {
          throw new Error("Razorpay key is not configured. Please set REACT_APP_RAZORPAY_KEY_ID.");
        }

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      await submitOrder(orderPayload);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
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
            <p>Students get a 10% discount on the order total.</p>
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
