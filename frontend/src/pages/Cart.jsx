import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { addToCart, removeToCart } from "../redux/cartSlice";
import { useCartStock } from "../hooks/useCartStock";
import { deliveryFeeFor, useStoreConfig } from "../hooks/useStoreConfig";
import { optimizeImage } from "../utils/image";
import { useT } from "../i18n/LanguageContext";
import "../styles/product.css";

const Cart = () => {
  const { t } = useT();
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.cartItems);
  const { issues, hasIssues, stockOf, fixCart } = useCartStock(cartItems);
  const config = useStoreConfig();

  const updateQuantity = (item, quantity) => {
    if (quantity <= 0) {
      dispatch(removeToCart(item._id));
      return;
    }
    dispatch(addToCart({ ...item, quantity }));
  };

  const subtotal = cartItems.reduce((total, item) => total + item.price * (item.quantity || 1), 0);
  // Display only: the server calculates the real total at checkout with the same rule
  const deliveryFee = deliveryFeeFor(config, subtotal);
  const amountToFreeDelivery = config.freeDeliveryAbove > 0 ? config.freeDeliveryAbove - subtotal : 0;
  const total = subtotal + deliveryFee;

  const issueMessage = (issue) => {
    switch (issue.type) {
      case 'reduced':
        return t('cart.issue.reduced', { available: issue.available, name: issue.name });
      case 'price':
        return t('cart.issue.price', { name: issue.name, price: issue.newPrice });
      default:
        return t('cart.issue.removed', { name: issue.name });
    }
  };

  return (
    <div className="product-detail-page">
      <h1>{t('cart.title')}</h1>

      {cartItems.length === 0 ? (
        <div className="product-detail-card">
          <p>{t('cart.empty')}</p>
          <Link to="/shop" className="view-details-button">{t('common.continueShopping')}</Link>
        </div>
      ) : (
        <>
          {hasIssues && (
            <div style={bannerStyle}>
              {issues.map((issue) => (
                <div key={issue.id} style={{ marginBottom: 6 }}>{issueMessage(issue)}</div>
              ))}
              <button type="button" onClick={fixCart} style={fixBtnStyle}>
                {t('cart.update')}
              </button>
            </div>
          )}

          <div className="cart-layout">
            <div className="cart-items-list">
              {cartItems.map((item) => {
                const quantity = item.quantity || 1;
                return (
                  <div className="cart-item-card" key={item._id}>
                    <img src={optimizeImage(item.imageUrl, 200)} alt={item.name} className="cart-item-image" />

                    <div className="cart-item-details">
                      <h3>{item.name}</h3>
                      {item.unit && <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>{item.unit}</p>}
                      <p>₹{Number(item.price).toFixed(2)}</p>

                      <div className="quantity-controls">
                        <button onClick={() => updateQuantity(item, quantity - 1)}>-</button>
                        <span>{quantity}</span>
                        <button
                          onClick={() => updateQuantity(item, quantity + 1)}
                          disabled={quantity >= stockOf(item._id)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button className="remove-btn" onClick={() => dispatch(removeToCart(item._id))}>
                      {t('cart.remove')}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary-card">
              <h2>{t('cart.summary')}</h2>
              <div className="summary-row">
                <span>{t('cart.subtotal')}</span>
                <strong>₹{subtotal.toFixed(2)}</strong>
              </div>
              <div className="summary-row">
                <span>{t('cart.delivery')}</span>
                <strong>{deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : t('common.free')}</strong>
              </div>
              {config.freeDeliveryAbove > 0 && (
                <p style={{ fontSize: '0.85rem', color: amountToFreeDelivery > 0 ? '#92400e' : '#047857', margin: '4px 0 8px' }}>
                  {amountToFreeDelivery > 0
                    ? t('cart.addMoreFree', { amount: amountToFreeDelivery.toFixed(0) })
                    : t('cart.gotFree')}
                </p>
              )}
              <div className="summary-row total-row">
                <span>{t('cart.total')}</span>
                <strong>₹{total.toFixed(2)}</strong>
              </div>

              {hasIssues ? (
                <>
                  <button className="view-details-button" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    {t('cart.checkout')}
                  </button>
                  <p style={{ fontSize: '0.85rem', color: '#92400e', marginTop: 8 }}>
                    {t('cart.fixFirst')}
                  </p>
                </>
              ) : (
                <Link to="/checkout" className="view-details-button">{t('cart.checkout')}</Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const bannerStyle = {
  background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e',
  padding: '12px 16px', borderRadius: 12, marginBottom: 16,
};
const fixBtnStyle = {
  marginTop: 6, padding: '8px 16px', borderRadius: 8, border: 'none',
  background: '#111827', color: '#fff', fontWeight: 600, cursor: 'pointer',
};

export default Cart;