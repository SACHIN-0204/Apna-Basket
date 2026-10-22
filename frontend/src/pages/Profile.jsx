import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../styles/product.css";

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          <h1>Profile</h1>
          <p>Please log in to view your account details.</p>
          <Link to="/login" className="view-details-button">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <h1>My Profile</h1>
      <div className="product-detail-card profile-card">
        <div>
          <h2>{user.name || "User"}</h2>
          <p>{user.email}</p>
          <p className="profile-role">Role: {user.role || "customer"}</p>
        </div>
        <Link to="/" className="view-details-button">Continue shopping</Link>
      </div>

      <div className="profile-orders">
        <h2>My Orders</h2>
        {loading ? (
          <p>Loading orders...</p>
        ) : error ? (
          <p className="product-error">{error}</p>
        ) : orders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          <div className="cart-items-list">
            {orders.map((order) => (
              <div className="cart-item-card" key={order._id}>
                <div className="cart-item-details">
                  <h3>Order #{order._id?.slice(-6).toUpperCase()}</h3>
                  <p>Total: ₹{order.totalPrice?.toFixed(2)}</p>
                  <p>Status: {order.status || "pending"}</p>
                  <p>Payment: {order.paymentMethod || "N/A"}</p>
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
