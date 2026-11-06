import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import "../styles/product.css";

// Mobile number + SMS code. Signs the customer in, or creates their account on first use:
// no password and no registration form.
const PhoneLogin = ({ onSuccess, heading = "Sign in with your mobile number", hint }) => {
  const { login } = useContext(AuthContext);
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (waitSeconds <= 0) return undefined;
    const timer = setTimeout(() => setWaitSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [waitSeconds]);

  const post = async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
    return data;
  };

  const sendCode = async (e) => {
    if (e) e.preventDefault();
    setMessage({ type: "", text: "" });
    setBusy(true);
    try {
      const data = await post("/api/auth/otp/request", { phone });
      setStep("otp");
      setOtp("");
      setWaitSeconds(data.resendAfterSeconds || 30);
      setMessage({ type: "success", text: `We sent a 6-digit code to ${phone}.` });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setBusy(true);
    try {
      const data = await post("/api/auth/otp/verify", { phone, otp });
      login({
        id: data._id,
        name: data.username,
        email: data.email || "",
        phone: data.phone,
        role: data.role || "user",
        token: data.token,
      });
      if (onSuccess) onSuccess(data);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>{heading}</h2>
      {hint && <p>{hint}</p>}

      {step === "phone" ? (
        <form onSubmit={sendCode}>
          <div className="form-group">
            <label htmlFor="login-phone">Mobile number</label>
            <input
              id="login-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
              pattern="(\+?91|0)?[6-9][0-9]{9}"
              title="Enter a valid 10-digit Indian mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}
          <button className="view-details-button" type="submit" disabled={busy}>
            {busy ? "Sending..." : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <div className="form-group">
            <label htmlFor="login-otp">6-digit code sent to {phone}</label>
            <input
              id="login-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              placeholder="Enter code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
            />
          </div>
          {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}
          <button className="view-details-button" type="submit" disabled={busy || otp.length !== 6}>
            {busy ? "Checking..." : "Verify and continue"}
          </button>
          <p style={{ marginTop: 12 }}>
            <button type="button" className="back-link" style={{ background: "none", border: 0, cursor: "pointer", padding: 0 }}
              onClick={() => { setStep("phone"); setMessage({ type: "", text: "" }); }}>
              Change number
            </button>
            {" · "}
            <button type="button" className="back-link" style={{ background: "none", border: 0, cursor: waitSeconds > 0 ? "default" : "pointer", padding: 0 }}
              onClick={sendCode} disabled={busy || waitSeconds > 0}>
              {waitSeconds > 0 ? `Resend code in ${waitSeconds}s` : "Resend code"}
            </button>
          </p>
        </form>
      )}
    </div>
  );
};

export default PhoneLogin;
