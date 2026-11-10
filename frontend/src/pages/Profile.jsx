import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { orderRef } from "../utils/orderLabels";
import { useT } from "../i18n/LanguageContext";
import "../styles/product.css";

const Profile = () => {
  const { user } = useContext(AuthContext);
  const { t, tm, tOr } = useT();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [addressNote, setAddressNote] = useState("");

  const token = user?.token;

  useEffect(() => {
    if (!token) return;
    fetch("/api/me/addresses", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setAddresses(d.addresses || []))
      .catch(() => {});
  }, [token]);

  const changeAddress = async (method, id, body) => {
    setAddressNote("");
    try {
      const res = await fetch(`/api/me/addresses/${id}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not update the address");
      setAddresses(data.addresses || []);
    } catch (err) {
      setAddressNote(err.message);
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/orders/myorders", {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to load orders");
        }

        setOrders(data.orders || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-card success-card">
          <h1>{t("profile.loginTitle")}</h1>
          <p>{t("profile.loginText")}</p>
          <Link to="/login" className="view-details-button">{t("nav.login")}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <h1>{t("profile.title")}</h1>
      <div className="product-detail-card profile-card">
        <div>
          <h2>{user.name || t("profile.user")}</h2>
          {user.phone && <p>{t("profile.mobile", { phone: user.phone })}</p>}
          {user.email && <p>{user.email}</p>}
          <p className="profile-role">{t("profile.role", { role: user.role || "customer" })}</p>
        </div>
        <Link to="/" className="view-details-button">{t("common.continueShopping")}</Link>
      </div>

      <div className="product-detail-card" style={{ marginBottom: 16 }}>
        <h2>{t("profile.addresses")}</h2>
        {addressNote && <p className="product-error">{tm(addressNote)}</p>}
        {addresses.length === 0 ? (
          <p>{t("profile.noAddresses")}</p>
        ) : (
          addresses.map((a) => (
            <div key={a._id} style={{ padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
              <strong>{a.label}{a.isDefault ? t("profile.default") : ""}</strong>
              <p style={{ margin: "4px 0" }}>{a.fullName}, {a.street}, {a.city}, {a.state} {a.zipCode}</p>
              {!a.isDefault && (
                <button type="button" className="back-link" style={{ background: "none", border: 0, cursor: "pointer", padding: 0, marginRight: 14 }}
                  onClick={() => changeAddress("PUT", a._id, { ...a, isDefault: true })}>
                  {t("profile.makeDefault")}
                </button>
              )}
              <button type="button" className="back-link" style={{ background: "none", border: 0, cursor: "pointer", padding: 0, color: "#b91c1c" }}
                onClick={() => window.confirm(t("profile.confirmDelete")) && changeAddress("DELETE", a._id)}>
                {t("profile.delete")}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="profile-orders">
        <h2>{t("profile.ordersTitle")}</h2>
        {loading ? (
          <p>{t("orders.loading")}</p>
        ) : error ? (
          <p className="product-error">{tm(error)}</p>
        ) : orders.length === 0 ? (
          <p>{t("profile.noOrders")}</p>
        ) : (
          <div className="cart-items-list">
            {orders.map((order) => (
              <div className="cart-item-card" key={order._id}>
                <div className="cart-item-details">
                  <h3>{t("orders.number", { ref: orderRef(order) })}</h3>
                  <p>{t("orders.total", { total: Number(order.totalPrice || 0).toFixed(2) })}</p>
                  <p>{t("profile.orderStatus", { status: tOr(`orderStatus.${order.status || "pending"}`, order.status) })}</p>
                  <p>{t("profile.orderPayment", { payment: order.paymentMethod === "Razorpay" ? t("order.methodOnline") : t("order.methodCod") })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
