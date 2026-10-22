import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { AuthContext } from '../context/AuthContext';
import { fetchProducts } from '../redux/productsSlice';
import { useNavigate, Link } from 'react-router-dom';


const LOW_STOCK = 5;

const ManageProducts = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockEdits, setStockEdits] = useState({}); // { productId: "12" }
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  const authHeader = { Authorization: `Bearer ${user?.token}` };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products/admin/all', { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load products');
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') loadProducts();
    // eslint-disable-next-line
  }, [user]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesText =
        !q || p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q);
      const matchesCategory = !category || p.category === category;
      return matchesText && matchesCategory;
    });
  }, [products, search, category]);

  const lowStockCount = products.filter((p) => p.stock <= LOW_STOCK).length;

  // Update one product with a small JSON patch
  const patchProduct = async (id, body) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setProducts((prev) => prev.map((p) => (p._id === id ? data : p)));
      dispatch(fetchProducts()); // refresh the shop's Redux list
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const saveStock = async (p) => {
    const value = stockEdits[p._id];
    if (value === undefined || value === '' || Number(value) < 0) return;
    const ok = await patchProduct(p._id, { stock: Number(value) });
    if (ok) {
      setStockEdits((prev) => {
        const next = { ...prev };
        delete next[p._id];
        return next;
      });
    }
  };

  const toggleActive = (p) => patchProduct(p._id, { isActive: p.isActive === false });

  const deleteProduct = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setBusyId(p._id);
    try {
      const res = await fetch(`/api/products/${p._id}`, { method: 'DELETE', headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      setProducts((prev) => prev.filter((x) => x._id !== p._id));
      dispatch(fetchProducts()); // refresh the shop's Redux list
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <div>
          <h2 style={{ margin: 0, color: '#111827' }}>Manage Products</h2>
          <p style={{ margin: '6px 0 0', color: '#6b7280' }}>
            {products.length} products
            {lowStockCount > 0 && (
              <span style={{ color: '#b45309', marginLeft: 10 }}>
                • {lowStockCount} low or out of stock
              </span>
            )}
          </p>
        </div>
        <Link to="/admin/add-product" style={primaryLinkStyle}>+ Add Product</Link>
      </div>

      <div style={filterRowStyle}>
        <input
          type="text"
          placeholder="Search by name or brand"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 2 }}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading && <p>Loading products...</p>}
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}

      {!loading && !error && (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Price</th>
                <th style={thStyle}>Stock</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="6" style={{ ...tdStyle, textAlign: 'center', color: '#6b7280' }}>No products found</td></tr>
              )}
              {filtered.map((p) => {
                const edited = stockEdits[p._id] !== undefined;
                const hidden = p.isActive === false;
                const busy = busyId === p._id;
                return (
                  <tr key={p._id} style={{ opacity: hidden ? 0.55 : 1 }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <img src={p.imageUrl} alt={p.name} style={thumbStyle} />
                        <div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{p.name}</div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            {[p.brand, p.unit].filter(Boolean).join(' • ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>{p.category}</td>
                    <td style={tdStyle}>
                      ₹{p.price}
                      {p.mrp > p.price && (
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', textDecoration: 'line-through' }}>₹{p.mrp}</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          value={edited ? stockEdits[p._id] : p.stock}
                          onChange={(e) => setStockEdits({ ...stockEdits, [p._id]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && saveStock(p)}
                          style={{
                            ...stockInputStyle,
                            borderColor: p.stock <= LOW_STOCK ? '#f59e0b' : '#d1d5db',
                          }}
                        />
                        {edited && (
                          <button onClick={() => saveStock(p)} disabled={busy} style={saveBtnStyle}>Save</button>
                        )}
                      </div>
                      {p.stock === 0 && <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>Out of stock</div>}
                      {p.stock > 0 && p.stock <= LOW_STOCK && (
                        <div style={{ fontSize: '0.8rem', color: '#b45309' }}>Low stock</div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ ...badgeStyle, ...(hidden ? hiddenBadge : liveBadge) }}>
                        {hidden ? 'Hidden' : 'Live'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link to={`/admin/edit-product/${p._id}`} style={actionLinkStyle}>Edit</Link>
                        <button onClick={() => toggleActive(p)} disabled={busy} style={actionBtnStyle}>
                          {hidden ? 'Show' : 'Hide'}
                        </button>
                        <button onClick={() => deleteProduct(p)} disabled={busy} style={{ ...actionBtnStyle, color: '#b91c1c' }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const pageStyle = { maxWidth: '1100px', margin: '40px auto', padding: '0 20px' };
const topBarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 };
const primaryLinkStyle = { padding: '12px 18px', borderRadius: 12, background: '#111827', color: '#fff', textDecoration: 'none', fontWeight: 600 };
const filterRowStyle = { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' };
const inputStyle = { padding: '12px 14px', background: '#f8fafc', border: '1px solid #d1d5db', borderRadius: 12, fontSize: '1rem', outline: 'none', minWidth: 160 };
const tableWrapStyle = { overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16 };
const tableStyle = { width: '100%', borderCollapse: 'collapse', minWidth: 760 };
const thStyle = { textAlign: 'left', padding: '14px 16px', background: '#f9fafb', color: '#4b5563', fontSize: '0.85rem', borderBottom: '1px solid #e5e7eb' };
const tdStyle = { padding: '14px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', color: '#374151' };
const thumbStyle = { width: 48, height: 48, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb' };
const stockInputStyle = { width: 70, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.95rem' };
const saveBtnStyle = { padding: '8px 12px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 600 };
const badgeStyle = { padding: '4px 10px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 };
const liveBadge = { background: '#ecfdf5', color: '#047857' };
const hiddenBadge = { background: '#f3f4f6', color: '#6b7280' };
const actionLinkStyle = { padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', color: '#111827', textDecoration: 'none', fontSize: '0.9rem' };
const actionBtnStyle = { padding: '6px 12px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#111827', cursor: 'pointer', fontSize: '0.9rem' };

export default ManageProducts;