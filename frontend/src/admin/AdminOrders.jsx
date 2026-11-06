import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ORDER_STATUS_LABELS, paymentStatusLabel, orderRef } from '../utils/orderLabels';

const AdminOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const getOrderUserName = (order) => order.user?.username || 'Deleted User';
  const getOrderDate = (order) => {
    const dateValue = order.createdAt || order.timestamp;
    return dateValue
      ? new Date(dateValue).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Unknown Date';
  };

  useEffect(() => {
    if (!user?.token) return;

    const fetchOrders = async () => {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      } else {
        console.error(data.message || 'Failed to load admin orders');
        setOrders([]);
      }
    };
    fetchOrders();
  }, [user]);

  const updateStatus = async (id, status) => {
    if (!user?.token) return;

    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (res.ok) {
      // The server also changes the payment state on cancel (for example "refund pending"), so use its copy
      setOrders(orders.map(order => order._id === id
        ? { ...order, status: data.order?.status ?? status, paymentStatus: data.order?.paymentStatus ?? order.paymentStatus }
        : order));
      setSuccessMessage(`Order ${orderRef(orders.find(o => o._id === id) || { _id: id })} status updated to ${ORDER_STATUS_LABELS[status] || status}.`);
      setErrorMessage("");
      setTimeout(() => setSuccessMessage(""), 3000);
    } else {
      setErrorMessage(data.message || 'Failed to update order status');
      setSuccessMessage("");
      console.error(data.message || 'Failed to update order status');
    }
  };

  if (!user?.token) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <h2 style={{ color: '#111827', marginBottom: '20px' }}>Manage Orders</h2>
      {successMessage && (
        <div style={{ marginBottom: '18px', padding: '12px 16px', background: '#ecfdf5', color: '#065f46', borderRadius: '10px' }}>
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div style={{ marginBottom: '18px', padding: '12px 16px', background: '#fef2f2', color: '#991b1b', borderRadius: '10px' }}>
          {errorMessage}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr style={rowStyle}>
              <th style={thStyle}>ORDER ID</th>
              <th style={thStyle}>CUSTOMER</th>
              <th style={thStyle}>PHONE</th>
              <th style={thStyle}>DELIVER BY</th>
              <th style={thStyle}>TOTAL</th>
              <th style={thStyle}>PAYMENT</th>
              <th style={thStyle}>DATE</th>
              <th style={thStyle}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order._id} style={rowStyle}>
                <td style={tdStyle}>{orderRef(order)}</td>
                <td style={tdStyle}>{getOrderUserName(order)}</td>
                <td style={tdStyle}>
                  {order.contactPhone ? <a href={`tel:+91${order.contactPhone}`}>{order.contactPhone}</a> : '—'}
                </td>
                <td style={tdStyle}>{order.deliverySlot?.label || '—'}</td>
                <td style={tdStyle}>₹{Number(order.totalPrice || 0).toFixed(2)}</td>
                <td style={tdStyle}>
                  {order.paymentMethod === 'Razorpay' ? 'Online' : 'COD'} · {paymentStatusLabel(order.paymentStatus)}
                </td>
                <td style={tdStyle}>{getOrderDate(order)}</td>
                <td style={tdStyle}>
                  <select 
                    value={order.status}
                    onChange={(e) => updateStatus(order._id, e.target.value)}
                    style={{ background: '#f8fafc', color: '#111827', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none' }}
                  >
                    {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value} disabled={order.status === 'cancelled' && value !== 'cancelled'}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const containerStyle = { maxWidth: '1200px', margin: '40px auto', padding: '30px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', color: '#111827', boxShadow: '0 18px 50px rgba(15,23,42,0.06)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', background: '#ffffff' };
const rowStyle = { borderBottom: '1px solid #e5e7eb', background: '#ffffff' };
const thStyle = { padding: '15px', textAlign: 'left', color: '#6b7280', fontSize: '0.95rem', fontWeight: 600, background: '#f8fafc' };
const tdStyle = { padding: '15px', textAlign: 'left', color: '#111827' };

export default AdminOrders;