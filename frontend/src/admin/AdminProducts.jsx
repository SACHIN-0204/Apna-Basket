import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const AdminProducts = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    };
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you strictly sure you want to delete this?')) {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (res.ok) {
        setProducts(products.filter(p => p._id !== id));
      }
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#111827' }}>Manage Products</h2>
        <Link to="/admin/add-product" className="btn" style={addBtnStyle}>+ Add Product</Link>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={rowStyle}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>NAME</th>
              <th style={thStyle}>PRICE</th>
              <th style={thStyle}>CATEGORY</th>
              <th style={thStyle}>STOCK</th>
              <th style={thStyle}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product._id} style={rowStyle}>
                <td style={tdStyle}>{product._id.substring(0, 8)}...</td>
                <td style={tdStyle}>{product.name}</td>
                <td style={tdStyle}>₹{product.price.toFixed(2)}</td>
                <td style={tdStyle}>{product.category}</td>
                <td style={tdStyle}>{product.stock}</td>
                <td style={tdStyle}>
                  <Link to={`/admin/edit-product/${product._id}`} style={editBtn}>Edit</Link>
                  <button onClick={() => handleDelete(product._id)} style={deleteBtn}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const containerStyle = { maxWidth: '1200px', margin: '40px auto', padding: '32px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', color: '#111827', boxShadow: '0 18px 50px rgba(15,23,42,0.06)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', background: '#ffffff' };
const rowStyle = { borderBottom: '1px solid #e5e7eb' };
const thStyle = { padding: '16px', textAlign: 'left', color: '#6b7280', fontSize: '0.95rem', fontWeight: 600, background: '#f8fafc' };
const tdStyle = { padding: '16px', textAlign: 'left', color: '#111827' };
const addBtnStyle = { padding: '10px 18px', borderRadius: '12px', background: '#111827', color: '#ffffff', border: '1px solid #111827', textDecoration: 'none', fontWeight: 600 };
const editBtn = { background: '#1f2937', color: '#fff', padding: '8px 14px', borderRadius: '10px', marginRight: '10px', border: 'none', textDecoration: 'none', display: 'inline-block' };
const deleteBtn = { background: '#ef4444', color: '#fff', padding: '8px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer' };

export default AdminProducts;