import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../styles/register.css";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const { login } = useContext(AuthContext);
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
        throw new Error(data.message || "Login failed");
      }

      login({
        name: data.username,
        email: data.email,
        role: data.role || "customer",
        token: data.token,
      });

      setMessage({ type: "success", text: "Login successful!" });
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
          <h1>Welcome back</h1>
          <p>Sign in to continue shopping for your daily essentials at Apna Basket.</p>
        </div>

        <div className="auth-form-wrap">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2>Login</h2>
            <p>Enter your credentials to access your account.</p>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {message.text && (
              <div className={`auth-message ${message.type}`}>{message.text}</div>
            )}

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="auth-link">
              Don&apos;t have an account? <Link to="/register">Create one</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
