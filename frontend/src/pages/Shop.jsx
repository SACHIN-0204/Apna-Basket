import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { fetchProducts } from '../redux/productsSlice';
import { addItem } from '../redux/cartSlice'; // ADJUST 1: your real cart action and path

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  priceLow: { label: 'Price: low to high', fn: (a, b) => a.price - b.price },
  priceHigh: { label: 'Price: high to low', fn: (a, b) => b.price - a.price },
  name: { label: 'Name: A to Z', fn: (a, b) => a.name.localeCompare(b.name) },
};

const Shop = () => {
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();

  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';

  // ADJUST 2: make this match your slice. It handles an array, or { items / products, loading / status, error }
  const productsState = useSelector((state) => state.products);
  const products = Array.isArray(productsState)
    ? productsState
    : productsState?.items ?? productsState?.products ?? [];
  const loading = productsState?.loading === true || productsState?.status === 'loading';
  const error = productsState?.error || null;

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].filter(Boolean).sort(),
    [products]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p.isActive !== false)
      .filter((p) => !category || p.category === category)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        // in-stock items first, then the chosen sort
        const aOut = a.stock <= 0 ? 1 : 0;
        const bOut = b.stock <= 0 ? 1 : 0;
        if (aOut !== bOut) return aOut - bOut;
        return SORTS[sort] ? SORTS[sort].fn(a, b) : 0;
      });
  }, [products, search, category, sort]);

  const handleAddToCart = (product) => {
  dispatch(addItem({ ...product, quantity: 1 }));
};

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: '#111827' }}>Shop</h1>
        <p style={{ margin: '6px 0 0', color: '#6b7280' }}>
          Fresh groceries and daily essentials, delivered from our store.
        </p>
      </div>

      <div style={toolbarStyle}>
        <input
          type="text"
          placeholder="Search products, brands..."
          value={search}
          onChange={(e) => updateParam('search', e.target.value)}
          style={searchStyle}
        />
        <select value={sort} onChange={(e) => updateParam('sort', e.target.value)} style={selectStyle}>
          {Object.entries(SORTS).map(([key, s]) => (
            <option key={key} value={key}>{s.label}</option>
          ))}
        </select>
      </div>

      <div style={chipRowStyle}>
        <button onClick={() => updateParam('category', '')} style={chipStyle(!category)}>All</button>
        {categories.map((c) => (
          <button key={c} onClick={() => updateParam('category', c)} style={chipStyle(category === c)}>
            {c}
          </button>
        ))}
      </div>

      {loading && <p style={mutedStyle}>Loading products...</p>}

      {error && !loading && (
        <div style={messageBoxStyle}>
          <p style={{ margin: '0 0 12px' }}>Could not load products. Please try again.</p>
          <button onClick={() => dispatch(fetchProducts())} style={retryBtnStyle}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <p style={{ ...mutedStyle, marginBottom: 14 }}>
            {visible.length} {visible.length === 1 ? 'product' : 'products'}
            {category && ` in ${category}`}
            {search && ` matching "${search}"`}
          </p>

          {visible.length === 0 ? (
            <div style={messageBoxStyle}>
              <p style={{ margin: '0 0 12px' }}>No products found.</p>
              <button onClick={() => setParams({}, { replace: true })} style={retryBtnStyle}>
                Clear filters
              </button>
            </div>
          ) : (
            <div style={gridStyle}>
              {visible.map((p) => (
                <ProductCard key={p._id} product={p}/>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const pageStyle = { maxWidth: 1200, margin: '0 auto', padding: '32px 20px' };
const toolbarStyle = { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 };
const searchStyle = {
  flex: '2 1 260px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #d1d5db',
  borderRadius: 12, fontSize: '1rem', outline: 'none',
};
const selectStyle = {
  flex: '1 1 180px', padding: '12px 14px', background: '#f8fafc', border: '1px solid #d1d5db',
  borderRadius: 12, fontSize: '1rem',
};
const chipRowStyle = { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 };
const chipStyle = (active) => ({
  flex: '0 0 auto', padding: '8px 16px', borderRadius: 999, cursor: 'pointer', fontSize: '0.9rem',
  border: `1px solid ${active ? '#111827' : '#d1d5db'}`,
  background: active ? '#111827' : '#fff',
  color: active ? '#fff' : '#374151',
  fontWeight: active ? 600 : 400,
});
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 20 };
const mutedStyle = { color: '#6b7280', margin: 0 };
const messageBoxStyle = { textAlign: 'center', padding: '48px 20px', background: '#f9fafb', borderRadius: 16, color: '#4b5563' };
const retryBtnStyle = {
  padding: '10px 18px', borderRadius: 10, border: 'none', background: '#111827',
  color: '#fff', cursor: 'pointer', fontWeight: 600,
};

export default Shop;