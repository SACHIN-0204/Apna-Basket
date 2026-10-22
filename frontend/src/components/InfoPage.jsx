import React from "react";
import { Link } from "react-router-dom";
import "../styles/infoPages.css";

/**
 * Shared layout for Contact, FAQ, Privacy, Terms, Shipping, Returns and 404 pages.
 */
const InfoPage = ({ title, subtitle, updated, children, wide = false }) => {
    return (
        <div className="info-page">
            <header className="info-hero">
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
                {updated && <span className="info-updated">Last updated: {updated}</span>}
            </header>
            <div className={`info-body ${wide ? "info-body-wide" : ""}`}>{children}</div>
            <nav className="info-related" aria-label="Help pages">
                <Link to="/faq">FAQ</Link>
                <Link to="/shipping">Shipping</Link>
                <Link to="/returns">Returns</Link>
                <Link to="/privacy">Privacy</Link>
                <Link to="/terms">Terms</Link>
                <Link to="/contact">Contact</Link>
            </nav>
        </div>
    );
};

export default InfoPage;
