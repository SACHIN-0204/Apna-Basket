import React from "react";
import { Link } from "react-router-dom";
import { STORE } from "../config/store";
import "../styles/footer.css";

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                {/* About Section */}
                <div className="footer-section">
                    <h3 className="footer-title">About Us</h3>
                    <p className="footer-description">
                        Apna Basket is your one-stop shop for groceries, daily essentials and household needs. 
                        Quality products, best value and easy shopping — delivered to your door.
                    </p>
                    <div className="social-links">
                        <a href="https://www.facebook.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="Facebook">
                            <i className="fab fa-facebook"></i>
                        </a>
                        <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="Twitter">
                            <i className="fab fa-twitter"></i>
                        </a>
                        <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="Instagram">
                            <i className="fab fa-instagram"></i>
                        </a>
                        <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="LinkedIn">
                            <i className="fab fa-linkedin"></i>
                        </a>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="footer-section">
                    <h3 className="footer-title">Quick Links</h3>
                    <ul className="footer-links">
                        <li><Link to="/shop">Shop</Link></li>
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                        <li><Link to="/faq">FAQ</Link></li>
                    </ul>
                </div>

                {/* Customer Support */}
                <div className="footer-section">
                    <h3 className="footer-title">Customer Support</h3>
                    <ul className="footer-links">
                        <li><Link to="/privacy">Privacy Policy</Link></li>
                        <li><Link to="/terms">Terms & Conditions</Link></li>
                        <li><Link to="/shipping">Shipping Info</Link></li>
                        <li><Link to="/returns">Returns</Link></li>
                    </ul>
                </div>

                {/* Contact Info */}
                <div className="footer-section">
                    <h3 className="footer-title">Contact Info</h3>
                    <div className="contact-info">
                        <p>
                            <span className="contact-label">Email:</span>
                            <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
                        </p>
                        <p>
                            <span className="contact-label">Phone:</span>
                            <a href={STORE.phoneHref}>{STORE.phone}</a>
                        </p>
                        <p>
                            <span className="contact-label">Address:</span>
                            {STORE.address}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer Bottom */}
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} Apna Basket. All rights reserved.</p>
                <p className="footer-credits">Groceries • Daily Essentials • Household Needs</p>
            </div>
        </footer>
    )
};

export default Footer;