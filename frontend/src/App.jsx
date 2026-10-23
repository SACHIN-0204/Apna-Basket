import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchProducts } from './redux/productsSlice';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import AddProducts from './admin/AddProducts';
import ManageProducts from './admin/ManageProducts';
import EditProduct from './admin/EditProduct';
import { ToastProvider } from "./components/Toast";

const PageLoading = () => <div style={{minHeight:'50vh',display:'grid',placeItems:'center'}}>Loading…</div>;

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Shipping = lazy(() => import('./pages/Shipping'));
const Returns = lazy(() => import('./pages/Returns'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Shop = lazy(() => import('./pages/Shop'));
const Profile = lazy(() => import('./pages/Profile'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const AdminOrders = lazy(() => import('./admin/AdminOrders'));
// import AdminProducts from './admin/AdminProducts';
const AdminUsers = lazy(() => import('./admin/AdminUsers'));


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
        <Suspense fallback={<PageLoading />}>
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
</Suspense>
      </div> 
     <Footer />
     </ToastProvider>
   </Router>
  );
}

export default App;