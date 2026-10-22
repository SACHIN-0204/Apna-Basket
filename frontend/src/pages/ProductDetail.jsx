import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addItem } from "../redux/cartSlice";
import ProductCard from "../components/ProductCard";
import "../styles/product.css";
import { useToast } from '../components/Toast';

const ProductDetail = () => {
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
  const allProducts = Array.isArray(productsState)
    ? productsState
    : productsState?.items ?? productsState?.products ?? [];

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
    return <div className="product-detail-page"><p>Loading product...</p></div>;
  }

  if (error || !product || product.isActive === false) {
    return (
      <div className="product-detail-page">
        <p className="product-error">{error || "This product is not available right now."}</p>
        <Link to="/shop" className="view-details-button">Back to shop</Link>
      </div>
    );
  }

  const inCart = cartItems.find((item) => item._id === product._id)?.quantity ?? 0;
  const remaining = Math.max(0, product.stock - inCart);
  const outOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    if (remaining < 1) return;
    dispatch(addItem({ ...product, quantity: qty }));   // dispatch 1
    toast.success(`${qty} × ${product.name} added to cart`, { actionLabel: 'View Cart', actionTo: '/cart' });
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="product-detail-page">
      <Link to="/shop" className="back-link">← Back to products</Link>

      <div className="product-detail-card">
        <img src={product.imageUrl} alt={product.name} className="product-detail-image" />

        <div className="product-detail-info">
          <p className="product-category">{product.category || "Grocery"}</p>
          <h1>{product.name}</h1>
          {(product.brand || product.unit) && (
            <p style={{ color: "#6b7280", margin: "0 0 8px" }}>
              {[product.brand, product.unit].filter(Boolean).join(" • ")}
            </p>
          )}
          <p className="product-description">
            {product.description || "Fresh and quality product from Apna Basket."}
          </p>

          <div className="product-price-row">
            <span className="product-detail-price">₹{product.price?.toFixed(2)}</span>
            {product.mrp > product.price && (
              <span style={{ color: "#9ca3af", textDecoration: "line-through", marginLeft: 10 }}>
                ₹{product.mrp.toFixed(2)}
              </span>
            )}
            <span className={`stock-badge ${outOfStock ? "out-of-stock" : "in-stock"}`}>
              {outOfStock ? "Out of Stock" : product.stock <= 5 ? `Only ${product.stock} left` : "In Stock"}
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
              {inCart > 0 && <span style={{ color: "#6b7280" }}>{inCart} already in cart</span>}
            </div>
          )}

          <button
            className="view-details-button"
            onClick={handleAddToCart}
            disabled={outOfStock || remaining < 1}
          >
            {outOfStock
              ? "Out of Stock"
              : remaining < 1
              ? "All available stock is in your cart"
              : added
              ? "✓ Added to cart"
              : "Add to Cart"}
          </button>

          {added && (
            <p style={{ marginTop: 10 }}>
              <Link to="/cart">Go to cart →</Link>
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2>You may also like</h2>
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