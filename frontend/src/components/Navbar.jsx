import React, { useContext, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useSelector } from 'react-redux';
import SearchBar from "./SearchBar"
import LanguageToggle from "./LanguageToggle";
import { useT } from "../i18n/LanguageContext";
import "../styles/navbar.css";

const Navbar = () => {
    
    const { user, logout } = useContext(AuthContext);
    const { t } = useT();
    const [menuOpen, setMenuOpen] = useState(false);
    const cartItems = useSelector((state) => state.cart.cartItems);
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
                   <img src="/logo-navbar.png" alt={t("nav.logoAlt")} className="navbar-logo" />
               </Link>
            </div>

            <button className="navbar-toggle" onClick={toggleMenu} aria-label={t("nav.toggleMenu")}>
                <span className="navbar-toggle-bar"></span>
                <span className="navbar-toggle-bar"></span>
                <span className="navbar-toggle-bar"></span>
            </button>

            <ul className={`navbar-links ${menuOpen ? 'open' : ''}`}>
                <li><Link to="/shop" onClick={closeMenu}>{t("nav.shop")}</Link></li>
                <li><Link to="/cart" onClick={closeMenu}>{t("nav.cart", { count: cartItems.length })}</Link></li>
                {user ? (
                    <>
                      <li><Link to="/profile" onClick={closeMenu}>{t("nav.hi", { name: user.name })}</Link></li>
                      {user.role === "admin" && <li><Link to="/admin" onClick={closeMenu}>{t("nav.admin")}</Link></li>}
                      <li><button onClick={handleLogout} className="btn-logout">{t("nav.logout")}</button></li>
                    </>
                ) : (
                    <li><Link to="/login" onClick={closeMenu}>{t("nav.login")}</Link></li>
                )}
                <li><LanguageToggle onChange={closeMenu} /></li>
            </ul>
        </nav>
        {showSearch && (
            <div className="navbar-search-row">
                <SearchBar remote placeholder={t("nav.searchPlaceholder")} />
            </div>
        )}
        </>
    )
};

export default Navbar;