import React from "react";
import { Link } from "react-router-dom";
import { STORE } from "../config/store";
import { useT } from "../i18n/LanguageContext";
import "../styles/footer.css";

const Footer = () => {
    const { t } = useT();
    return (
        <footer className="footer">
            <div className="footer-content">
                {/* About Section */}
                <div className="footer-section">
                    <h3 className="footer-title">{t("footer.aboutTitle")}</h3>
                    <p className="footer-description">
                        {t("footer.aboutText")}
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
                    <h3 className="footer-title">{t("footer.quickLinks")}</h3>
                    <ul className="footer-links">
                        <li><Link to="/shop">{t("footer.shop")}</Link></li>
                        <li><Link to="/about">{t("footer.about")}</Link></li>
                        <li><Link to="/contact">{t("footer.contact")}</Link></li>
                        <li><Link to="/faq">{t("footer.faq")}</Link></li>
                    </ul>
                </div>

                {/* Customer Support */}
                <div className="footer-section">
                    <h3 className="footer-title">{t("footer.support")}</h3>
                    <ul className="footer-links">
                        <li><Link to="/privacy">{t("footer.privacy")}</Link></li>
                        <li><Link to="/terms">{t("footer.terms")}</Link></li>
                        <li><Link to="/shipping">{t("footer.shipping")}</Link></li>
                        <li><Link to="/returns">{t("footer.returns")}</Link></li>
                    </ul>
                </div>

                {/* Contact Info */}
                <div className="footer-section">
                    <h3 className="footer-title">{t("footer.contactInfo")}</h3>
                    <div className="contact-info">
                        <p>
                            <span className="contact-label">{t("footer.email")}</span>
                            <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
                        </p>
                        <p>
                            <span className="contact-label">{t("footer.phone")}</span>
                            <a href={STORE.phoneHref}>{STORE.phone}</a>
                        </p>
                        <p>
                            <span className="contact-label">{t("footer.address")}</span>
                            {STORE.address}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer Bottom */}
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} Apna Basket. {t("footer.rights")}</p>
                <p className="footer-credits">{t("nav.tagline")}</p>
            </div>
        </footer>
    )
};

export default Footer;