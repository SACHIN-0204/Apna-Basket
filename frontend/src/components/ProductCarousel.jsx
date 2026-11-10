import React, { useRef } from "react";
import ProductCard from "./ProductCard";
import { useT } from "../i18n/LanguageContext";
import "../styles/carousel.css";

const ProductCarousel = ({ products }) => {
    const { t } = useT();
    const trackRef = useRef(null);

    const scrollByAmount = (direction) => {
        const track = trackRef.current;
        if (!track) return;
        const cardWidth = track.querySelector(".carousel-item")?.offsetWidth || 220;
        track.scrollBy({ left: direction * (cardWidth + 20), behavior: "smooth" });
    };

    return (
        <div className="carousel-wrapper">
            <button
                className="carousel-arrow carousel-arrow-left"
                onClick={() => scrollByAmount(-1)}
                aria-label={t("carousel.left")}
            >
                ‹
            </button>

            <div className="carousel-track" ref={trackRef}>
                {products.map((product) => (
                    <div className="carousel-item" key={product._id}>
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>

            <button
                className="carousel-arrow carousel-arrow-right"
                onClick={() => scrollByAmount(1)}
                aria-label={t("carousel.right")}
            >
                ›
            </button>
        </div>
    );
};

export default ProductCarousel;