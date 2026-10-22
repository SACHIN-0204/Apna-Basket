import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  containerStyle, headerStyle, titleStyle, subtitleStyle, formStyle, fieldRowStyle,
  fieldStyle, labelStyle, inputStyle, uploadBoxStyle, uploadLabelStyle,
  uploadInputStyle, submitStyle,
} from './productFormStyles';
import { useDispatch } from 'react-redux';
import { fetchProducts } from '../redux/productsSlice';

const AddProduct = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState({
    name: '', description: '', price: '', category: '', stock: ''
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return alert('Please select an image');
    
    setLoading(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('price', formData.price);
    data.append('category', formData.category);
    data.append('stock', formData.stock);
    data.append('image', image);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: data
      });
      const responseData = await res.json();
      
      if (res.ok) {
          dispatch(fetchProducts());
          alert('Product created successfully!');
          navigate('/shop');
      }  else {
        alert(responseData.message || 'Error creating product');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Add New Product</h2>
          <p style={subtitleStyle}>Add a new product with image, price, category and inventory details.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={fieldRowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Product Name</label>
            <input
              type="text"
              placeholder="Enter product name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Category</label>
            <input
              type="text"
              placeholder="Enter product category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={fieldRowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Price</label>
            <input
              type="number"
              placeholder="₹0.00"
              min="0"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Stock Quantity</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              required
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <textarea
            placeholder="Write a short product description"
            required
            rows="5"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' }}
          />
        </div>

        <div style={uploadBoxStyle}>
          <label style={uploadLabelStyle}>Upload Product Image</label>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setImage(e.target.files[0])}
            style={uploadInputStyle}
          />
        </div>

        <button type="submit" disabled={loading} className="btn" style={submitStyle}>
          {loading ? 'Uploading & Creating...' : 'Publish Product'}
        </button>
      </form>
    </div>
  );
};


export default AddProduct;