import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchProducts } from './redux/productsSlice';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Shipping from './pages/Shipping';
import Returns from './pages/Returns';
import NotFound from './pages/NotFound';
import ScrollToTop from './components/ScrollToTop';
import Register from './pages/Register';
import Login from './pages/Login';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import Shop from './pages/Shop';
import Profile from './pages/Profile';
import MyOrders from './pages/MyOrders';
import AdminDashboard from './admin/AdminDashboard';
import AddProducts from './admin/AddProducts';
import AdminOrders from './admin/AdminOrders';
// import AdminProducts from './admin/AdminProducts';
import ManageProducts from './admin/ManageProducts';
import AdminUsers from './admin/AdminUsers';
import EditProduct from './admin/EditProduct';
import { ToastProvider } from "./components/Toast";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  return (
   <Router>
    <ToastProvider >
     <ScrollToTop />
     <Navbar />
     <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/myorders" element={<MyOrders />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/add-product" element={<AddProducts />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          {/* <Route path="/admin/products" element={<AdminProducts />} /> */}
          <Route path="/admin/products" element={<ManageProducts />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/edit-product/:id" element={<EditProduct />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div> 
     <Footer />
     </ToastProvider>
   </Router>
  );
}

export default App;
