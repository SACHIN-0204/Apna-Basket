import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCarousel from "../components/ProductCarousel";
import HeroSlider from "../components/HeroSlider";
import "../styles/home.css";

const Home = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await fetch('/api/products');
                if (!res.ok) {
                    const details = await res.text();
                    throw new Error(`Products request failed (${res.status})${details ? `: ${details}` : ''}`);
                }
                if (!res.headers.get('content-type')?.includes('application/json')) {
                    throw new Error('Products API returned a non-JSON response. Check that the backend is running.');
                }
                const data = await res.json();
                if (!Array.isArray(data)) {
                    throw new Error('Products API returned an invalid response.');
                }
                setProducts(data); // keep ALL products, don't slice here
            } catch (error) {
                console.error('Failed to load products:', error);
                setFetchError(error.message || 'Could not load products. Check that the backend is running.');
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
    }, []);

    // Derive each section's list from the full products array
    // const readyToCook = products.slice(0, 6);
    const readyToCook = products
        .filter((p) => p.category === "Cooking")
        .slice(0, 6);

    const namkeenAndWafers = products.filter(
        (p) => p.category === "Namkeen" || p.category === "Wafers"
    );
    const cleaningEssentials = products.filter(
        (p) => p.category === "Household"
    );
    // const featured = products.slice(0, 6);
    const groceries = products
        .filter((p) => p.category === "Grocery");

    return (
        <div className="home-container">

            <HeroSlider />

            <div className="hero-banner">
                <h1>Welcome to Apna Basket</h1>
                <p>Groceries • Daily Essentials • Household Needs</p>
                <div className="hero-badges">
                    <span>✔ Quality Products</span>
                    <span>✔ Best Value</span>
                    <span>✔ Easy Shopping</span>
                </div>
                <Link to="/shop" className="btn hero-banner-btn">Start Shopping</Link>
            </div>

            {fetchError && <div role="alert">{fetchError}</div>}

            <div className="content-section">
                <h2>Ready To Cook</h2>
                {loading ? (
                    <div>Loading...</div>
                ) : readyToCook.length > 0 ? (
                    <ProductCarousel products={readyToCook} />
                ) : (
                    <div>No ready-to-cook products yet.</div>
                )}
            </div>

            <div className="content-section">
                <h2>Namkeen & Wafers</h2>
                {loading ? (
                    <div>Loading...</div>
                ) : namkeenAndWafers.length > 0 ? (
                    <ProductCarousel products={namkeenAndWafers} />
                ) : (
                    <div>No namkeen or wafers products yet.</div>
                )}
            </div>

            {/* Cleaning / Household essentials promo banner */}
            <div className="cleaning-banner">
                <div className="cleaning-banner-text">
                    <h2>Home Cleaning Essentials</h2>
                    <p>
                        Dishwash liquids, Harpic toilet cleaners, handwash & more —
                        everything to keep your home spotless.
                    </p>
                    <Link to="/shop?category=Household" className="btn cleaning-banner-btn">
                        Shop Cleaning Essentials
                    </Link>
                </div>
                <div className="cleaning-banner-icons">
                    <span role="img" aria-label="cleaning">🧴</span>
                    <span role="img" aria-label="cleaning">🧼</span>
                    <span role="img" aria-label="cleaning">🧽</span>
                </div>
            </div>

            <div className="content-section">
                <h2>Household & Cleaning Products</h2>
                {loading ? (
                    <div>Loading...</div>
                ) : cleaningEssentials.length > 0 ? (
                    <ProductCarousel products={cleaningEssentials} />
                ) : (
                    <div>No cleaning products yet.</div>
                )}
            </div>

            <div className="content-section">
                <h2>Grocery</h2>
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <ProductCarousel products={groceries} />
                )}
            </div>
        </div>
    )
};

export default Home;