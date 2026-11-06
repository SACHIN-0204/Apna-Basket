import React from "react";
import { Link, useLocation } from "react-router-dom";
import { shortOrderId } from "../utils/orderLabels";
import "../styles/product.css";

const OrderSuccess = () => {
  const { state } = useLocation();
  const orderId = state?.orderId;
  const online = Boolean(state?.online);

  return (
    <div className="product-detail-page">
      <div className="product-detail-card success-card">
        <h1>🎉 Order placed successfully!</h1>
        {orderId && <p><strong>Order {state?.orderNumber || shortOrderId(orderId)}</strong></p>}
        <p>
          {online
            ? "Your payment was received and your order is confirmed."
            : "Your order is confirmed. Please keep the cash ready for the delivery person."}
        </p>
        <p className="success-subtext">We will call you on your mobile number if we need anything. A confirmation has been sent to your email.</p>

        <div className="success-actions">
          <Link to="/" className="view-details-button">Continue shopping</Link>
          {orderId && <Link to={`/orders/${orderId}`} className="back-link">Track this order</Link>}
          <Link to="/myorders" className="back-link">View my orders</Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
