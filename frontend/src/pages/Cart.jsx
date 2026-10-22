import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { addToCart, removeToCart, syncCartStock } from "../redux/cartSlice";
import { useCartStock } from "../hooks/useCartStock";
import { optimizeImage } from "../utils/image";
import "../styles/product.css";

const Cart = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.cartItems);
  const { products, issues, hasIssues, stockOf } = useCartStock(cartItems);

  const updateQuantity = (item, quantity) => {
    if (quantity <= 0) {
      dispatch(removeToCart(item._id));
      return;
    }
    dispatch(addToCart({ ...item, quantity }));
  };

  const subtotal = cartItems.reduce((total, item) => total + item.price * (item.quantity || 1), 0);
  const deliveryFee = cartItems.length > 0 ? 40 : 0;
  const total = subtotal + deliveryFee;

  const issueMessage = (issue) => {
    switch (issue.type) {
      case 'reduced':
        return `Only ${issue.available} of "${issue.name}" left. Your quantity will be reduced.`;
      case 'price':
        return `The price of "${issue.name}" has changed to ₹${issue.newPrice}.`;
      default:
        return `"${issue.name}" is no longer available and will be removed.`;
    }
  };

  return (
    <div className="product-detail-page">
      <h1>Your Cart</h1>

      {cartItems.length === 0 ? (
        <div className="product-detail-card">
          <p>Your cart is empty.</p>
          <Link to="/shop" className="view-details-button">Continue shopping</Link>
        </div>
      ) : (
        <>
          {hasIssues && (
            <div style={bannerStyle}>
              {issues.map((issue) => (
                <div key={issue.id} style={{ marginBottom: 6 }}>{issueMessage(issue)}</div>
              ))}
              <button type="button" onClick={() => dispatch(syncCartStock(products))} style={fixBtnStyle}>
                Update cart
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
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary-card">
              <h2>Order Summary</h2>
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>₹{subtotal.toFixed(2)}</strong>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <strong>₹{deliveryFee.toFixed(2)}</strong>
              </div>
              <div className="summary-row total-row">
                <span>Total</span>
                <strong>₹{total.toFixed(2)}</strong>
              </div>

              {hasIssues ? (
                <>
                  <button className="view-details-button" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                    Proceed to Checkout
                  </button>
                  <p style={{ fontSize: '0.85rem', color: '#92400e', marginTop: 8 }}>
                    Please update your cart to continue.
                  </p>
                </>
              ) : (
                <Link to="/checkout" className="view-details-button">Proceed to Checkout</Link>
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