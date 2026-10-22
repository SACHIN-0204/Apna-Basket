import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
  containerStyle, headerStyle, titleStyle, subtitleStyle, formStyle, fieldRowStyle,
  fieldStyle, labelStyle, inputStyle, uploadBoxStyle, uploadLabelStyle, uploadInputStyle,
  submitStyle, secondaryBtnStyle, dangerBtnStyle, previewImgStyle,
} from './productFormStyles';
import { useDispatch } from 'react-redux';
import { fetchProducts } from '../redux/productsSlice';

const CATEGORIES = [
  'Atta & Rice', 'Dal & Pulses', 'Oil & Ghee', 'Masala & Spices',
  'Snacks & Biscuits', 'Dairy', 'Beverages', 'Cleaning & Household', 'Personal Care',
];
const MAX_SIZE_MB = 5;

const EditProduct = () => {
  const { user } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: '', brand: '', description: '', price: '', mrp: '',
    unit: '', category: '', stock: '', isActive: true,
  });
  const [currentImage, setCurrentImage] = useState('');
  const [image, setImage] = useState(null);        // new image, optional
  const [preview, setPreview] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  // Admin guard
  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  // Load the existing product
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) { setNotFound(true); return; }
        const p = await res.json();
        setFormData({
          name: p.name || '',
          brand: p.brand || '',
          description: p.description || '',
          price: p.price ?? '',
          mrp: p.mrp ?? '',
          unit: p.unit || '',
          category: p.category || '',
          stock: p.stock ?? '',
          isActive: p.isActive !== false,
        });
        setCurrentImage(p.imageUrl || '');
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setPageLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  // Preview for a newly chosen image
  useEffect(() => {
    if (!image) { setPreview(''); return; }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  if (!user || user.role !== 'admin') return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) { setImage(null); return; }
    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Image must be smaller than ${MAX_SIZE_MB} MB`);
      e.target.value = '';
      return;
    }
    setImage(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.mrp !== '' && Number(formData.mrp) < Number(formData.price)) {
      return alert('MRP cannot be less than the selling price');
    }

    setSaving(true);
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, typeof value === 'string' ? value.trim() : value);
    });
    if (image) data.append('image', image); // only send if the admin picked a new one

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${user.token}` },
        body: data,
      });
      const responseData = await res.json();

      if (res.ok) {
        dispatch(fetchProducts());
        alert('Product updated successfully!');
        navigate('/shop');
      } else {
        alert(responseData.message || 'Error updating product');
      }
    } catch (error) {
      console.error(error);
      alert('Network error. Is the server running?');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${formData.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const responseData = await res.json();
      if (res.ok) {
        navigate('/shop');
      } else {
        alert(responseData.message || 'Error deleting product');
      }
    } catch (error) {
      console.error(error);
      alert('Network error. Is the server running?');
    }
  };

  if (pageLoading) return <div style={containerStyle}>Loading product...</div>;
  if (notFound) return <div style={containerStyle}>Product not found.</div>;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Edit Product</h2>
          <p style={subtitleStyle}>Update price, stock, details or replace the product photo.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={fieldRowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Product Name</label>
            <input type="text" required value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Brand</label>
            <input type="text" placeholder="e.g. Tata, Fortune" value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={fieldRowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Category</label>
            <input list="category-list" type="text" required value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={inputStyle} />
            <datalist id="category-list">
              {CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Pack Size / Unit</label>
            <input type="text" placeholder="e.g. 1 kg, 500 ml" value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={fieldRowStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Selling Price (₹)</label>
            <input type="number" min="0" step="0.01" required value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>MRP (₹, optional)</label>
            <input type="number" min="0" step="0.01" value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: e.target.value })} style={inputStyle} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Stock Quantity</label>
            <input type="number" min="0" required value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description</label>
          <textarea required rows="5" value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' }} />
        </div>

        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
          Show this product in the shop
        </label>

        <div style={uploadBoxStyle}>
          <label style={uploadLabelStyle}>Product Image (leave empty to keep the current one)</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={uploadInputStyle} />
          {(preview || currentImage) && (
            <div>
              <img src={preview || currentImage} alt="Product" style={previewImgStyle} />
              <div style={{ ...labelStyle, marginTop: 6, fontSize: '0.85rem' }}>
                {preview ? 'New image (not saved yet)' : 'Current image'}
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn" style={submitStyle}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={() => navigate('/shop')} style={{ ...secondaryBtnStyle, flex: 1 }}>
            Cancel
          </button>
          <button type="button" onClick={handleDelete} style={{ ...dangerBtnStyle, flex: 1 }}>
            Delete Product
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;