import React from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { deliveryFeeFor, useStoreConfig } from "../hooks/useStoreConfig";
import { useT } from "../i18n/LanguageContext";

// Pages where a "view cart" bar would only get in the way
const HIDDEN_ON = /^\/(cart|checkout|order-success|login|register|admin)(\/|$)/;

const money = (n) => `₹${Number(n).toFixed(0)}`;

const StickyCartBar = () => {
  const { pathname } = useLocation();
  const cartItems = useSelector((state) => state.cart.cartItems);
  const config = useStoreConfig();
  const { t } = useT();

  if (cartItems.length === 0 || HIDDEN_ON.test(pathname)) return null;

  const count = cartItems.reduce((n, i) => n + (i.quantity || 1), 0);
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);
  const remaining = config.freeDeliveryAbove > 0 ? config.freeDeliveryAbove - subtotal : 0;
  const fee = deliveryFeeFor(config, subtotal);

  return (
    <>
      {/* Keeps the footer from being hidden behind the bar */}
      <div aria-hidden="true" style={{ height: 84 }} />
      <div style={barWrapStyle}>
        <Link to="/cart" style={barStyle} aria-label={t("bar.summaryAria", { count, unit: count === 1 ? t("bar.item") : t("bar.items"), total: money(subtotal) })}>
          <span>
            <strong>{count} {count === 1 ? t("bar.item") : t("bar.items")}</strong> · {money(subtotal)}
            {config.freeDeliveryAbove > 0 && (
              <small style={hintStyle}>
                {remaining > 0
                  ? t("bar.addMore", { amount: money(remaining) })
                  : t("bar.freeDelivery")}
              </small>
            )}
            {config.freeDeliveryAbove === 0 && fee > 0 && <small style={hintStyle}>{t("bar.plusDelivery", { fee: money(fee) })}</small>}
          </span>
          <span style={ctaStyle}>{t("bar.viewCart")}</span>
        </Link>
      </div>
    </>
  );
};

const barWrapStyle = {
  position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 900,
  padding: "10px 12px calc(10px + env(safe-area-inset-bottom, 0px))",
  pointerEvents: "none",
};
const barStyle = {
  pointerEvents: "auto", maxWidth: 560, margin: "0 auto", minHeight: 52,
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  background: "#1f8a43", color: "#fff", textDecoration: "none",
  padding: "10px 18px", borderRadius: 14, boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
};
const hintStyle = { display: "block", fontSize: "0.78rem", opacity: 0.92, marginTop: 2 };
const ctaStyle = { fontWeight: 700, whiteSpace: "nowrap" };

export default StickyCartBar;
