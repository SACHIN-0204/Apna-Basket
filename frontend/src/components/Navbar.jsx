import React, { useContext, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useSelector } from 'react-redux';
import SearchBar from "./SearchBar"
import "../styles/navbar.css";

const Navbar = () => {
    
    const { user, logout } = useContext(AuthContext);
    const [menuOpen, setMenuOpen] = useState(false);
    const cartItems = useSelector((state) => state.cart.cartItems);
    const products = useSelector((state) => state.products.items);
    const navigate = useNavigate();
    const location = useLocation();
    const showSearch = location.pathname === "/" || location.pathname === "/shop";

    const handleLogout = () => {
        logout();
        navigate('/login');
        setMenuOpen(false);
    }

    const toggleMenu = () => {
        setMenuOpen((prev) => !prev);
    };

    const closeMenu = () => {
        setMenuOpen(false);
    };

    return (
        <>
        <nav className="navbar">
            <div className="navbar-brand">
               <Link to="/" onClick={closeMenu}>
                   <img src="/logo-icon.svg" alt="Apna Basket logo" className="navbar-logo" />
                   <span className="brand-text">
                       <span className="brand-name">
                           <span className="brand-apna">Apna</span> <span className="brand-basket">Basket</span>
                       </span>
                       <span className="brand-tagline">Groceries • Daily Essentials • Household Needs</span>
                   </span>
               </Link>
            </div>

            <button className="navbar-toggle" onClick={toggleMenu} aria-label="Toggle menu">
                <span className="navbar-toggle-bar"></span>
                <span className="navbar-toggle-bar"></span>
                <span className="navbar-toggle-bar"></span>
            </button>

            <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                <li><Link to="/shop" onClick={closeMenu}>Shop</Link></li>
                <li><Link to="/cart" onClick={closeMenu}>Cart ({cartItems.length})</Link></li>
                {user ? (
                    <>
                      <li><Link to="/profile" onClick={closeMenu}>Hi, {user.name}</Link></li>
                      {user.role === "admin" && <li><Link to="/admin" onClick={closeMenu}>Admin</Link></li>}
                      <li><button onClick={handleLogout} className="btn-logout">Logout</button></li>
                    </>
                ) : (
                    <li><Link to="/login" onClick={closeMenu}>Login</Link></li>
                )}
            </ul>
        </nav>
        {showSearch && (
            <div className="navbar-search-row">
                <SearchBar items={products} placeholder="Search groceries, snacks, essentials…" />
            </div>
        )}
        </>
    )
};

export default Navbar;