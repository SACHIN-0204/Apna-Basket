import React, { useContext, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PhoneLogin from "../components/PhoneLogin";
import { useStoreConfig } from "../hooks/useStoreConfig";
import { clearToCart } from "../redux/cartSlice";
import { payForOrder, PaymentCancelled } from "../utils/razorpay";
import "../styles/product.css";

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

const addressToForm = (a) => ({
  fullName: a.fullName,
  street: a.street,
  city: a.city,
  state: a.state,
  zipCode: a.zipCode,
  ...(a.phone ? { phone: a.phone } : {}),
});

const chipBtn = (active) => ({
  minHeight: 44, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: "0.9rem",
  border: `1px solid ${active ? "#1f8a43" : "#d1d5db"}`,
  background: active ? "#e8f5ec" : "#fff",
  color: active ? "#14532d" : "#374151",
  fontWeight: active ? 700 : 500,
});

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.cartItems);
  const { user: authUser } = useContext(AuthContext);
  const config = useStoreConfig();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "Indore",
    state: "Madhya Pradesh",
    zipCode: "",
    paymentMethod: "Cash on Delivery",
  });
  const [studentBypass, setStudentBypass] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Delivery windows (from the server, which re-checks the choice when the order is placed)
  const [slotDays, setSlotDays] = useState([]);
  const [slotsLoaded, setSlotsLoaded] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [activeDay, setActiveDay] = useState("");
  const [slotsReload, setSlotsReload] = useState(0);

  // "" = not checked, "checking", "ok" or "no" (outside the delivery area)
  const [pinStatus, setPinStatus] = useState("");

  // Saved addresses: the default one is filled in automatically
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("new");
  const [saveAddress, setSaveAddress] = useState(true);

  // Order already saved on the server but not yet paid (customer closed the payment window)
  const [pendingOrder, setPendingOrder] = useState(null); // { id, total }
  const pendingOrderId = pendingOrder?.id || null;

  // Totals come from the server. The browser only displays them.
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  const orderItems = useMemo(
    () => cartItems.map((item) => ({ productId: item._id, quantity: item.quantity || 1 })),
    [cartItems]
  );
  const discountEmail = studentBypass ? studentEmail.trim() : "";

  useEffect(() => {
    if (!orderItems.length) {
      setQuote(null);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setQuoting(true);
      try {
        const res = await fetch("/api/orders/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderItems, studentEmail: discountEmail }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not calculate your total");
        setQuote(data);
        setQuoteError("");
      } catch (err) {
        if (err.name !== "AbortError") {
          setQuote(null);
          setQuoteError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) setQuoting(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [orderItems, discountEmail]);

  const token = authUser?.token;
  const knownPhone = authUser?.phone;

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/addresses", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const list = data.addresses || [];
        setAddresses(list);
        const preferred = list.find((a) => a.isDefault) || list[0];
        if (preferred) {
          setSelectedAddressId(preferred._id);
          setFormData((prev) => ({ ...prev, ...addressToForm(preferred) }));
        }
      } catch {
        /* saved addresses are a convenience; typing a new one still works */
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Their verified number is the natural contact number
  useEffect(() => {
    if (knownPhone) setFormData((prev) => (prev.phone ? prev : { ...prev, phone: knownPhone }));
  }, [knownPhone]);

  const chooseAddress = (id) => {
    setSelectedAddressId(id);
    if (id === "new") {
      setFormData((prev) => ({ ...prev, street: "", zipCode: "" }));
      return;
    }
    const chosen = addresses.find((a) => a._id === id);
    if (chosen) setFormData((prev) => ({ ...prev, ...addressToForm(chosen) }));
  };

  useEffect(() => {
    if (!token || !config.slotsEnabled) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/store/slots", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const days = data.days || [];
        setSlotDays(days);
        setSlotsLoaded(true);
        const all = days.flatMap((d) => d.slots);
        // Keep the earlier choice if it is still open, otherwise offer the first open slot
        setSelectedSlot((prev) => (all.some((sl) => sl.id === prev) ? prev : all[0]?.id || ""));
        setActiveDay((prev) => (days.some((d) => d.date === prev) ? prev : days[0]?.date || ""));
      } catch {
        if (!cancelled) setSlotsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [token, config.slotsEnabled, slotsReload]);

  useEffect(() => {
    const pin = formData.zipCode;
    if (!config.serviceAreaEnabled || !/^\d{6}$/.test(pin)) {
      setPinStatus("");
      return undefined;
    }
    let cancelled = false;
    setPinStatus("checking");
    fetch(`/api/store/pincode/${pin}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setPinStatus(d.serviceable ? "ok" : "no"); })
      .catch(() => { if (!cancelled) setPinStatus(""); }); // if the check fails, the server still checks on order
    return () => { cancelled = true; };
  }, [formData.zipCode, config.serviceAreaEnabled]);

  const unavailable = quote?.unavailable || [];
  const studentEmailInvalid = studentBypass && discountEmail && quote?.studentEmailValid === false;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const finishSuccess = (orderId, online, number) => {
    dispatch(clearToCart());
    navigate("/order-success", { state: { orderId, orderNumber: number, online } });
  };

  const startPayment = async (orderId, number) => {
    try {
      await payForOrder({
        orderId,
        token: authUser?.token,
        prefill: { name: formData.fullName, email: authUser?.email || "", contact: formData.phone },
      });
      finishSuccess(orderId, true, number);
    } catch (err) {
      if (err instanceof PaymentCancelled) {
        setMessage({
          type: "error",
          text: "Payment was not completed. Your items are held for a few minutes: tap “Pay now” to try again.",
        });
      } else {
        setMessage({ type: "error", text: err.message });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!authUser?.token) {
      setMessage({ type: "error", text: "Please log in to place your order." });
      return;
    }
    if (!cartItems.length) {
      setMessage({ type: "error", text: "Your cart is empty." });
      return;
    }
    if (config.slotsEnabled && !selectedSlot) {
      setMessage({ type: "error", text: "Please choose a delivery time." });
      return;
    }
    if (pinStatus === "no") {
      setMessage({ type: "error", text: "Sorry, we do not deliver to this PIN code yet." });
      return;
    }
    if (studentBypass && !discountEmail) {
      setMessage({ type: "error", text: "Please enter your college email to get the student discount." });
      return;
    }

    try {
      setLoading(true);

      // Retry for an order that is already saved: never create a second order
      if (pendingOrderId) {
        await startPayment(pendingOrderId, pendingOrder.number);
        return;
      }

      const { phone, ...address } = formData;
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authUser.token}` },
        body: JSON.stringify({
          orderItems, // ids and quantities only: the server looks up prices
          address,
          contactPhone: phone,
          paymentMethod: formData.paymentMethod,
          studentEmail: discountEmail,
          saveAddress: selectedAddressId === "new" ? saveAddress : false,
          deliverySlot: config.slotsEnabled ? selectedSlot : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (config.slotsEnabled) setSlotsReload((n) => n + 1); // the chosen window may have just closed
        throw new Error(data.message || "Unable to place order");
      }

      const orderId = data.order?._id;

      if (formData.paymentMethod === "Razorpay") {
        // The order exists and its stock is reserved, so the cart is done with.
        // If payment is interrupted, the customer can retry here or from My Orders.
        setPendingOrder({ id: orderId, total: data.order?.totalPrice, number: data.order?.orderNumber });
        dispatch(clearToCart());
        await startPayment(orderId, data.order?.orderNumber);
        return;
      }

      finishSuccess(orderId, false, data.order?.orderNumber);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const slotOk = !config.slotsEnabled || Boolean(selectedSlot);
  const canSubmit = pendingOrderId
    ? !loading
    : !loading && !quoting && Boolean(quote) && unavailable.length === 0 && !studentEmailInvalid && slotOk && pinStatus !== "no";
  const buttonLabel = loading
    ? "Processing..."
    : pendingOrderId
    ? `Pay now · ${money(pendingOrder.total)}`
    : formData.paymentMethod === "Razorpay"
    ? "Place order & pay"
    : "Place order";

  if (!cartItems.length && !pendingOrderId) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-card success-card">
          <h1>Your cart is empty</h1>
          <p>Add a few items to place an order.</p>
          <Link to="/shop" className="view-details-button">Start shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <h1>Checkout</h1>

      <div className="cart-layout">
        {!authUser?.token ? (
          <div className="product-detail-card">
            <PhoneLogin
              heading="Verify your mobile number"
              hint="We use it to confirm your order and for the delivery person to reach you. No password needed."
            />
            <p style={{ marginTop: 16 }}>
              Prefer email? <Link to="/login">Log in with email</Link>
            </p>
          </div>
        ) : (
        <form className="product-detail-card" onSubmit={handleSubmit}>
          <h2>Delivery Details</h2>

          <fieldset disabled={Boolean(pendingOrderId)} style={{ border: 0, padding: 0, margin: 0 }}>
            {addresses.length > 0 && (
              <div className="form-group">
                <label htmlFor="savedAddress">Deliver to</label>
                <select id="savedAddress" value={selectedAddressId} onChange={(e) => chooseAddress(e.target.value)}>
                  {addresses.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.label}: {a.street}, {a.zipCode}{a.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                  <option value="new">+ Use a new address</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} autoComplete="name" required />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Mobile number (for delivery)</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit mobile number"
                pattern="(\+?91|0)?[6-9][0-9]{9}"
                title="Enter a valid 10-digit Indian mobile number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="street">Street address</label>
              <input id="street" name="street" value={formData.street} onChange={handleChange} autoComplete="street-address" required />
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
              <label htmlFor="zipCode">PIN code</label>
              <input
                id="zipCode"
                name="zipCode"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                title="Enter a 6-digit PIN code"
                autoComplete="postal-code"
                value={formData.zipCode}
                onChange={handleChange}
                required
              />
              {pinStatus === "ok" && <small style={{ color: "#047857" }}>✓ We deliver to this PIN code</small>}
              {pinStatus === "no" && <small style={{ color: "#b91c1c" }}>Sorry, we do not deliver to this PIN code yet. Please call the store.</small>}
            </div>

            {selectedAddressId === "new" && (
              <label className="student-toggle" style={{ marginBottom: 12 }}>
                <input type="checkbox" checked={saveAddress} onChange={() => setSaveAddress((v) => !v)} />
                <span>Save this address for next time</span>
              </label>
            )}

            {config.slotsEnabled && (
              <div className="form-group">
                <label>Delivery time</label>
                {!slotsLoaded ? (
                  <small>Loading delivery times...</small>
                ) : slotDays.length === 0 ? (
                  <small style={{ color: "#b91c1c" }}>No delivery times are open right now. Please try again later or call the store.</small>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      {slotDays.map((d) => (
                        <button
                          type="button"
                          key={d.date}
                          onClick={() => setActiveDay(d.date)}
                          style={chipBtn(activeDay === d.date)}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="radiogroup" aria-label="Delivery time">
                      {(slotDays.find((d) => d.date === activeDay)?.slots || []).map((sl) => (
                        <button
                          type="button"
                          key={sl.id}
                          role="radio"
                          aria-checked={selectedSlot === sl.id}
                          onClick={() => setSelectedSlot(sl.id)}
                          style={chipBtn(selectedSlot === sl.id)}
                        >
                          {sl.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="paymentMethod">Payment method</label>
              <select id="paymentMethod" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange}>
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Razorpay">Pay online (UPI / Card / Netbanking)</option>
              </select>
            </div>

            <div className="student-bypass-card">
              <label className="student-toggle">
                <input type="checkbox" checked={studentBypass} onChange={() => setStudentBypass((prev) => !prev)} />
                <span>I am a student</span>
              </label>
              <p>Students with a college email (for example name@college.ac.in) get a discount.</p>
              {studentBypass && (
                <>
                  <input
                    className="student-input"
                    type="email"
                    placeholder="Enter your college email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                  />
                  {studentEmailInvalid && (
                    <p className="product-error">This does not look like a college email, so no discount will be applied.</p>
                  )}
                </>
              )}
            </div>
          </fieldset>

          {pendingOrderId && (
            <div className="auth-message success">
              Your order is saved. Complete the payment to confirm it, or find it later in{" "}
              <Link to="/myorders">My Orders</Link>.
            </div>
          )}
          {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}
          <button className="view-details-button" type="submit" disabled={!canSubmit}>
            {buttonLabel}
            {!pendingOrderId && quote ? ` · ${money(quote.totalPrice)}` : ""}
          </button>
        </form>
        )}

        <div className="cart-summary-card">
          <h2>Order Summary</h2>
          {cartItems.map((item) => (
            <div className="summary-row" key={item._id}>
              <span>{item.name} × {item.quantity || 1}</span>
              <strong>{money(item.price * (item.quantity || 1))}</strong>
            </div>
          ))}

          {unavailable.length > 0 && (
            <div className="auth-message error">
              {unavailable.map((u) => (
                <div key={u.productId}>
                  {u.name}: {u.available > 0 ? `only ${u.available} left` : "no longer available"}
                </div>
              ))}
              <Link to="/cart">Update your cart</Link>
            </div>
          )}
          {quoteError && <div className="auth-message error">{quoteError}</div>}

          {quote ? (
            <>
              <div className="summary-row">
                <span>Items</span>
                <strong>{money(quote.itemsTotal)}</strong>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <strong>{quote.deliveryFee > 0 ? money(quote.deliveryFee) : "Free"}</strong>
              </div>
              {quote.discount > 0 && (
                <div className="summary-row">
                  <span>Student discount</span>
                  <strong>-{money(quote.discount)}</strong>
                </div>
              )}
              <div className="summary-row total-row">
                <span>Total</span>
                <strong>{money(quote.totalPrice)}</strong>
              </div>
            </>
          ) : (
            !quoteError && <p>{quoting ? "Calculating your total..." : "Your total will appear here."}</p>
          )}
          <Link to="/cart" className="back-link">← Back to cart</Link>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
