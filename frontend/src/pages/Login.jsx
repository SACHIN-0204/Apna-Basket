import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PhoneLogin from "../components/PhoneLogin";
import { useT } from "../i18n/LanguageContext";
import "../styles/register.css";

const Login = () => {
  const [mode, setMode] = useState("phone"); // "phone" (default) or "email"
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const { login } = useContext(AuthContext);
  const { t, tm } = useT();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || t("login.failed"));
      }

      login({
        id: data._id,
        name: data.username,
        email: data.email,
        phone: data.phone || "",
        role: data.role || "customer",
        token: data.token,
      });

      setMessage({ type: "success", text: t("login.success") });
      navigate("/");
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hero">
          <h1>{t("login.welcomeBack")}</h1>
          <p>{t("login.welcomeText")}</p>
        </div>

        <div className="auth-form-wrap">
          {mode === "phone" ? (
            <div className="auth-form">
              <PhoneLogin
                heading={t("login.mobileHeading")}
                hint={t("login.mobileHint")}
                onSuccess={() => navigate("/")}
              />
              <p className="auth-link">
                <button type="button" className="back-link" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => setMode("email")}>
                  {t("login.useEmail")}
                </button>
              </p>
            </div>
          ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2>{t("login.title")}</h2>
            <p>{t("login.credentials")}</p>

            <div className="form-group">
              <label htmlFor="email">{t("login.email")}</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder={t("login.emailPlaceholder")}
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t("login.password")}</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder={t("login.passwordPlaceholder")}
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {message.text && (
              <div className={`auth-message ${message.type}`}>{tm(message.text)}</div>
            )}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? t("login.signingIn") : t("login.signIn")}
            </button>

            <p className="auth-link">
              {t("login.noAccount")} <Link to="/register">{t("login.create")}</Link>
            </p>
            <p className="auth-link">
              <button type="button" className="back-link" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => setMode("phone")}>
                {t("login.useMobile")}
              </button>
            </p>
          </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
