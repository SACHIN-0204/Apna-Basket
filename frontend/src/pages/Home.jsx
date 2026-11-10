import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import ProductCarousel from "../components/ProductCarousel";
import HeroSlider from "../components/HeroSlider";
import { useT } from "../i18n/LanguageContext";
import "../styles/home.css";

const Home = () => {
    const { t } = useT();
    const productsState = useSelector((state) => state.products);
    const products = Array.isArray(productsState)
        ? productsState
        : productsState?.items ?? [];
    const loading = productsState?.status === "loading" || productsState?.status === "idle";
    const fetchError = productsState?.error || "";

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
                <h1>{t("home.welcome")}</h1>
                <p>{t("nav.tagline")}</p>
                <div className="hero-badges">
                    <span>{t("home.badge1")}</span>
                    <span>{t("home.badge2")}</span>
                    <span>{t("home.badge3")}</span>
                </div>
                <Link to="/shop" className="btn hero-banner-btn">{t("common.startShopping")}</Link>
            </div>

            {fetchError && <div role="alert">{fetchError}</div>}

            <div className="content-section">
                <h2>{t("home.readyToCook")}</h2>
                {loading ? (
                    <div>{t("common.loading")}</div>
                ) : readyToCook.length > 0 ? (
                    <ProductCarousel products={readyToCook} />
                ) : (
                    <div>{t("home.noReadyToCook")}</div>
                )}
            </div>

            <div className="content-section">
                <h2>{t("home.namkeen")}</h2>
                {loading ? (
                    <div>{t("common.loading")}</div>
                ) : namkeenAndWafers.length > 0 ? (
                    <ProductCarousel products={namkeenAndWafers} />
                ) : (
                    <div>{t("home.noNamkeen")}</div>
                )}
            </div>

            {/* Cleaning / Household essentials promo banner */}
            <div className="cleaning-banner">
                <div className="cleaning-banner-text">
                    <h2>{t("home.cleaningTitle")}</h2>
                    <p>{t("home.cleaningText")}</p>
                    <Link to="/shop?category=Household" className="btn cleaning-banner-btn">
                        {t("home.cleaningCta")}
                    </Link>
                </div>
                <div className="cleaning-banner-icons">
                    <span role="img" aria-label="cleaning">🧴</span>
                    <span role="img" aria-label="cleaning">🧼</span>
                    <span role="img" aria-label="cleaning">🧽</span>
                </div>
            </div>

            <div className="content-section">
                <h2>{t("home.household")}</h2>
                {loading ? (
                    <div>{t("common.loading")}</div>
                ) : cleaningEssentials.length > 0 ? (
                    <ProductCarousel products={cleaningEssentials} />
                ) : (
                    <div>{t("home.noCleaning")}</div>
                )}
            </div>

            <div className="content-section">
                <h2>{t("home.grocery")}</h2>
                {loading ? (
                    <div>{t("common.loading")}</div>
                ) : (
                    <ProductCarousel products={groceries} />
                )}
            </div>
        </div>
    )
};

export default Home;