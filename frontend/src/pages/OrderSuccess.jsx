import React from "react";
import { Link, useLocation } from "react-router-dom";
import { shortOrderId } from "../utils/orderLabels";
import { useT } from "../i18n/LanguageContext";
import "../styles/product.css";

const OrderSuccess = () => {
  const { state } = useLocation();
  const { t } = useT();
  const orderId = state?.orderId;
  const online = Boolean(state?.online);

  return (
    <div className="product-detail-page">
      <div className="product-detail-card success-card">
        <h1>{t("success.title")}</h1>
        {orderId && <p><strong>{t("success.order", { ref: state?.orderNumber || shortOrderId(orderId) })}</strong></p>}
        <p>{online ? t("success.paid") : t("success.cod")}</p>
        <p className="success-subtext">{t("success.note")}</p>

        <div className="success-actions">
          <Link to="/" className="view-details-button">{t("success.continue")}</Link>
          {orderId && <Link to={`/orders/${orderId}`} className="back-link">{t("success.track")}</Link>}
          <Link to="/myorders" className="back-link">{t("success.viewAll")}</Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
