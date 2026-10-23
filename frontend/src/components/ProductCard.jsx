import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addItem } from '../redux/cartSlice';
import { optimizeImage } from '../utils/image';
import { useToast } from './Toast';

const LOW_STOCK = 5;

const ProductCard = ({ product, onAddToCart }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const [justAdded, setJustAdded] = useState(false);
  const timerRef = useRef(null);

  const cartItems = useSelector((state) => state.cart?.cartItems ?? []);

  // Clear the "Added" timer if the card unmounts
  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!product) return null;

  const { _id, name, brand, unit, price, mrp, stock, imageUrl } = product;
  const cloudinaryImage = (width) => optimizeImage(imageUrl, width);
  const isCloudinary = typeof imageUrl === 'string' && imageUrl.includes('res.cloudinary.com');
  const outOfStock = stock <= 0;
  const lowStock = !outOfStock && stock <= LOW_STOCK;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const inCart = cartItems.find((i) => i._id === _id)?.quantity ?? 0;
  const maxedOut = !outOfStock && inCart >= stock;

  const handleAdd = () => {
    // A page can still override the default behavior
    if (typeof onAddToCart === 'function') {
      onAddToCart(product);
      return;
    }

    if (maxedOut) {
      toast.warning(`Only ${stock} available, and all of them are already in your cart.`, {
        actionLabel: 'View Cart',
        actionTo: '/cart',
      });
      return;
    }

    dispatch(addItem({ ...product, quantity: 1 }));
    toast.success(`${name} added to cart`, { actionLabel: 'View Cart', actionTo: '/cart' });

    setJustAdded(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustAdded(false), 1500);
  };

  const buttonDisabled = outOfStock;
  const buttonLabel = outOfStock
    ? 'Unavailable'
    : justAdded
    ? '✓ Added'
    : 'Add to Cart';

  return (
    <div style={cardStyle}>
      <Link to={`/product/${_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={imageWrapStyle}>
          <img
            src={cloudinaryImage(400)}
            srcSet={isCloudinary ? `${cloudinaryImage(240)} 240w, ${cloudinaryImage(400)} 400w, ${cloudinaryImage(600)} 600w` : undefined}
            sizes="(max-width: 600px) 45vw, (max-width: 1000px) 30vw, 240px"
            alt={name}
            loading="lazy"
            decoding="async"
            style={{ ...imageStyle, opacity: outOfStock ? 0.5 : 1 }}
          />
          {discount > 0 && !outOfStock && <span style={discountBadgeStyle}>{discount}% OFF</span>}
          {outOfStock && <span style={soldOutBadgeStyle}>Out of stock</span>}
        </div>

        <div style={{ padding: '14px 14px 0' }}>
          {brand && <div style={brandStyle}>{brand}</div>}
          <div style={nameStyle}>{name}</div>
          {unit && <div style={unitStyle}>{unit}</div>}
        </div>
      </Link>

      <div style={{ padding: '10px 14px 14px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={priceStyle}>₹{price}</span>
          {mrp > price && <span style={mrpStyle}>₹{mrp}</span>}
        </div>

        {lowStock && <div style={lowStockStyle}>Only {stock} left</div>}
        {inCart > 0 && !outOfStock && <div style={inCartStyle}>{inCart} in cart</div>}

        <button
          onClick={handleAdd}
          disabled={buttonDisabled}
          style={{
            ...addBtnStyle,
            background: outOfStock ? '#e5e7eb' : justAdded ? '#16a34a' : '#111827',
            color: outOfStock ? '#9ca3af' : '#fff',
            cursor: outOfStock ? 'not-allowed' : 'pointer',
            opacity: maxedOut && !justAdded ? 0.75 : 1,
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
};

const cardStyle = {
  display: 'flex', flexDirection: 'column', background: '#fff',
  border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden',
};
const imageWrapStyle = { position: 'relative', aspectRatio: '1 / 1', background: '#f8fafc' };
const imageStyle = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
const discountBadgeStyle = {
  position: 'absolute', top: 10, left: 10, background: '#16a34a', color: '#fff',
  padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
};
const soldOutBadgeStyle = {
  position: 'absolute', top: 10, left: 10, background: '#111827', color: '#fff',
  padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700,
};
const brandStyle = { fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 };
const nameStyle = { fontWeight: 600, color: '#111827', margin: '4px 0 2px', lineHeight: 1.3 };
const unitStyle = { fontSize: '0.85rem', color: '#6b7280' };
const priceStyle = { fontSize: '1.2rem', fontWeight: 700, color: '#111827' };
const mrpStyle = { fontSize: '0.9rem', color: '#9ca3af', textDecoration: 'line-through' };
const lowStockStyle = { fontSize: '0.8rem', color: '#b45309', marginTop: 4 };
const inCartStyle = { fontSize: '0.8rem', color: '#047857', marginTop: 4 };
const addBtnStyle = {
  width: '100%', marginTop: 12, padding: '11px 0', border: 'none',
  borderRadius: 10, fontWeight: 600, fontSize: '0.95rem', transition: 'background 150ms ease',
};

export default ProductCard;