import React from "react";
import { Link } from "react-router-dom";
import "../styles/product.css";

const OrderSuccess = () => {
  return (
    <div className="product-detail-page">
      <div className="product-detail-card success-card">
        <h1>🎉 Order placed successfully!</h1>
        <p>Your order has been confirmed and will be delivered shortly.</p>
        <p className="success-subtext">A confirmation message has been sent to your email.</p>

        <div className="success-actions">
          <Link to="/" className="view-details-button">Continue shopping</Link>
          <Link to="/myorders" className="back-link">View my orders</Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
