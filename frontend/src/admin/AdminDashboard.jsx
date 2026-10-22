import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    if (user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/analytics', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setStats(data);
        } else {
          if (res.status === 401) {
            navigate('/login');
          }
          setStats({ totalOrders: 0, totalProducts: 0, totalUsers: 0, totalRevenue: 0 });
        }
      } catch (error) {
        console.error(error);
        setStats({ totalOrders: 0, totalProducts: 0, totalUsers: 0, totalRevenue: 0 });
      }
    };
    fetchStats();
  }, [user, navigate]);

  const cardStyle = {
    padding: '25px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '12px'
  };

  const numberStyle = {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#111827'
  };

  const panelStyle = {
    marginTop: '40px',
    padding: '30px',
    background: '#ffffff',
    borderRadius: '14px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)'
  };

  const buttonPrimaryStyle = {
    background: '#111827',
    color: '#ffffff',
    border: '1px solid #111827'
  };

  const buttonSecondaryStyle = {
    background: '#f8fafc',
    color: '#111827',
    border: '1px solid #d1d5db'
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: '#111827' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '5px' }}>
        <img src="/logo.png" alt="Logo" style={{ height: '40px', width: '40px', borderRadius: '10px', objectFit: 'cover', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)' }} />
        <h2 style={{ margin: 0, color: '#111827' }}>Admin Dashboard</h2>
      </div>
      <p style={{ color: '#4b5563', marginBottom: '30px', fontSize: '1.05rem' }}>
        Welcome back, <span style={{ color: '#111827', fontWeight: 600 }}>{user?.name}</span>
      </p>
      
      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div style={cardStyle}>
            <h4 style={{ color: '#4b5563', fontSize: '1rem' }}>Total Orders</h4>
            <div style={numberStyle}>{stats.totalOrders}</div>
          </div>
          <div style={cardStyle}>
            <h4 style={{ color: '#4b5563', fontSize: '1rem' }}>Total Products</h4>
            <div style={numberStyle}>{stats.totalProducts}</div>
          </div>
          <div style={cardStyle}>
            <h4 style={{ color: '#4b5563', fontSize: '1rem' }}>Total Users</h4>
            <div style={numberStyle}>{stats.totalUsers}</div>
          </div>
          <div style={cardStyle}>
            <h4 style={{ color: '#4b5563', fontSize: '1rem' }}>Total Revenue</h4>
            <div style={numberStyle}>₹{Number(stats.totalRevenue || 0).toFixed(2)}</div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', margin: '50px 0', color: '#111827' }}>Loading metrics...</div>
      )}

      <div style={panelStyle}>
        <h3 style={{ marginBottom: '25px', color: '#111827' }}>Administrative Controls</h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => navigate('/admin/add-product')} style={buttonPrimaryStyle}>+ Add Product</button>
          <button className="btn" onClick={() => navigate('/admin/products')} style={buttonSecondaryStyle}>📦 Manage Products</button>
          <button className="btn" onClick={() => navigate('/admin/orders')} style={buttonSecondaryStyle}>🚚 Manage Orders</button>
          <button className="btn" onClick={() => navigate('/admin/users')} style={buttonSecondaryStyle}>👥 Users Directory</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;