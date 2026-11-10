import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addItem } from "../redux/cartSlice";
import ProductCard from "../components/ProductCard";
import "../styles/product.css";
import { useToast } from '../components/Toast';
import { useT } from '../i18n/LanguageContext';

const ProductDetail = () => {
  const { t, tm, tc } = useT();
  const { id } = useParams();
  const dispatch = useDispatch();
  const toast = useToast(); 

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const cartItems = useSelector((state) => state.cart.cartItems);
  const productsState = useSelector((state) => state.products);
  const allProducts = useMemo(
    () => (Array.isArray(productsState) ? productsState : productsState?.items ?? productsState?.products ?? []),
    [productsState]
  );

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");
        setQty(1);
        setAdded(false);
        window.scrollTo(0, 0);

        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Product not found");
        }
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const related = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((p) => p.category === product.category && p._id !== product._id)
      .filter((p) => p.isActive !== false && p.stock > 0)
      .slice(0, 4);
  }, [allProducts, product]);

  if (loading) {
    return <div className="product-detail-page"><p>{t('pd.loading')}</p></div>;
  }

  if (error || !product || product.isActive === false) {
    return (
      <div className="product-detail-page">
        <p className="product-error">{tm(error) || t('pd.notAvailable')}</p>
        <Link to="/shop" className="view-details-button">{t('pd.backToShop')}</Link>
      </div>
    );
  }

  const inCart = cartItems.find((item) => item._id === product._id)?.quantity ?? 0;
  const remaining = Math.max(0, product.stock - inCart);
  const outOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    if (remaining < 1) return;
    dispatch(addItem({ ...product, quantity: qty }));   // dispatch 1
    toast.success(t('pd.addedToast', { qty, name: product.name }), { actionLabel: t('card.viewCart'), actionTo: '/cart' });
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="product-detail-page">
      <Link to="/shop" className="back-link">{t('pd.backToProducts')}</Link>

      <div className="product-detail-card">
        <img src={product.imageUrl} alt={product.name} className="product-detail-image" />

        <div className="product-detail-info">
          <p className="product-category">{tc(product.category || 'Grocery')}</p>
          <h1>{product.name}</h1>
          {(product.brand || product.unit) && (
            <p style={{ color: "#6b7280", margin: "0 0 8px" }}>
              {[product.brand, product.unit].filter(Boolean).join(" • ")}
            </p>
          )}
          <p className="product-description">
            {product.description || t('pd.defaultDesc')}
          </p>

          <div className="product-price-row">
            <span className="product-detail-price">₹{product.price?.toFixed(2)}</span>
            {product.mrp > product.price && (
              <span style={{ color: "#9ca3af", textDecoration: "line-through", marginLeft: 10 }}>
                ₹{product.mrp.toFixed(2)}
              </span>
            )}
            <span className={`stock-badge ${outOfStock ? "out-of-stock" : "in-stock"}`}>
              {outOfStock ? t('pd.outOfStock') : product.stock <= 5 ? t('pd.onlyLeft', { count: product.stock }) : t('pd.inStock')}
            </span>
          </div>

          {!outOfStock && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
              >
                −
              </button>
              <strong>{remaining < 1 ? 0 : qty}</strong>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(remaining, q + 1))}
                disabled={qty >= remaining}
              >
                +
              </button>
              {inCart > 0 && <span style={{ color: "#6b7280" }}>{t('pd.alreadyInCart', { count: inCart })}</span>}
            </div>
          )}

          <button
            className="view-details-button"
            onClick={handleAddToCart}
            disabled={outOfStock || remaining < 1}
          >
            {outOfStock
              ? t('pd.outOfStock')
              : remaining < 1
              ? t('pd.allInCart')
              : added
              ? t('pd.added')
              : t('pd.add')}
          </button>

          {added && (
            <p style={{ marginTop: 10 }}>
              <Link to="/cart">{t('pd.goToCart')}</Link>
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2>{t('pd.related')}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 20 }}>
            {related.map((p) => (
              <ProductCard
                key={p._id}
                product={p}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;