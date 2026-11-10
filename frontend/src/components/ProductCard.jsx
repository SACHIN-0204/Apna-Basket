import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addItem, addToCart, removeToCart } from '../redux/cartSlice';
import { optimizeImage } from '../utils/image';
import { useToast } from './Toast';
import { useT } from '../i18n/LanguageContext';

const LOW_STOCK = 5;

const ProductCard = ({ product, onAddToCart }) => {
  const dispatch = useDispatch();
  const toast = useToast();
  const { t } = useT();

  const cartItems = useSelector((state) => state.cart?.cartItems ?? []);

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
    dispatch(addItem({ ...product, quantity: 1 }));
    toast.success(t('card.added', { name }), { actionLabel: t('card.viewCart'), actionTo: '/cart' });
  };

  // The stepper sets the exact quantity, capped at stock; going below 1 removes the item
  const setQuantity = (qty) => {
    if (qty <= 0) {
      dispatch(removeToCart(_id));
      return;
    }
    if (qty > stock) {
      toast.warning(t('card.onlyAvailable', { count: stock }), { actionLabel: t('card.viewCart'), actionTo: '/cart' });
      return;
    }
    dispatch(addToCart({ ...product, quantity: qty }));
  };

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
          {discount > 0 && !outOfStock && <span style={discountBadgeStyle}>{t('card.off', { percent: discount })}</span>}
          {outOfStock && <span style={soldOutBadgeStyle}>{t('card.outOfStock')}</span>}
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

        {lowStock && <div style={lowStockStyle}>{t('card.onlyLeft', { count: stock })}</div>}

        {outOfStock ? (
          <button disabled style={{ ...addBtnStyle, background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' }}>
            {t('card.unavailable')}
          </button>
        ) : inCart > 0 ? (
          <div style={stepperStyle} role="group" aria-label={t('card.qtyOf', { name })}>
            <button type="button" onClick={() => setQuantity(inCart - 1)} style={stepBtnStyle} aria-label={t('card.removeOne', { name })}>
              {inCart === 1 ? '🗑' : '−'}
            </button>
            <span style={stepQtyStyle} aria-live="polite">{inCart}</span>
            <button
              type="button"
              onClick={() => setQuantity(inCart + 1)}
              disabled={maxedOut}
              style={{ ...stepBtnStyle, opacity: maxedOut ? 0.4 : 1, cursor: maxedOut ? 'not-allowed' : 'pointer' }}
              aria-label={t('card.addOne', { name })}
            >
              +
            </button>
          </div>
        ) : (
          <button onClick={handleAdd} style={{ ...addBtnStyle, background: '#111827', color: '#fff', cursor: 'pointer' }}>
            {t('card.add')}
          </button>
        )}
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
const addBtnStyle = {
  width: '100%', marginTop: 12, minHeight: 44, padding: '11px 0', border: 'none',
  borderRadius: 10, fontWeight: 600, fontSize: '0.95rem', transition: 'background 150ms ease',
};
// 44px tap targets, comfortable on a phone
const stepperStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12,
  background: '#111827', borderRadius: 10, overflow: 'hidden',
};
const stepBtnStyle = {
  width: 48, minHeight: 44, border: 'none', background: 'transparent', color: '#fff',
  fontSize: '1.25rem', fontWeight: 600, cursor: 'pointer',
};
const stepQtyStyle = { color: '#fff', fontWeight: 700, minWidth: 28, textAlign: 'center' };

export default ProductCard;