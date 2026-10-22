import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import "../styles/heroSlider.css";

const SLIDES = [
    {
        title: "Everything Your Home Needs",
        subtitle: "Groceries, snacks and household essentials delivered to your door.",
        image: "/apna-basket-banner.jpg",
        position: "88% center", // keeps the basket artwork visible on narrow screens
        link: "/shop",
        cta: "Start Shopping",
    },
    {
        title: "Fresh Dairy, Every Morning",
        subtitle: "Milk, curd, paneer & more — delivered fresh to your doorstep.",
        image:
            "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=1600&q=80",
        link: "/shop",
        cta: "Shop Dairy",
    },
    {
        title: "Grocery Essentials, All in One Place",
        subtitle: "From atta to spices — everything your kitchen needs.",
        image:
            "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=1600&q=80",
        link: "/shop",
        cta: "Shop Groceries",
    },
    {
        title: "Namkeen & Snacks You'll Love",
        subtitle: "Crunchy, spicy, and always fresh — snack time sorted.",
        image:
            "https://images.unsplash.com/photo-1633536706889-af4e8cd7f64b?auto=format&fit=crop&w=1600&q=80",
        link: "/shop",
        cta: "Shop Snacks",
    },
];

const AUTO_SLIDE_INTERVAL = 4000; // ms

const HeroSlider = () => {
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);

    const goTo = useCallback((index) => {
        setCurrent((index + SLIDES.length) % SLIDES.length);
    }, []);

    const next = useCallback(() => goTo(current + 1), [current, goTo]);
    const prev = useCallback(() => goTo(current - 1), [current, goTo]);

    // Auto-advance
    useEffect(() => {
        if (paused) return;
        const timer = setInterval(() => {
            setCurrent((prevIndex) => (prevIndex + 1) % SLIDES.length);
        }, AUTO_SLIDE_INTERVAL);
        return () => clearInterval(timer);
    }, [paused]);

    return (
        <div
            className="hero-slider"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {SLIDES.map((slide, index) => (
                <div
                    key={slide.title}
                    className={`hero-slide ${index === current ? "active" : ""}`}
                    style={{ backgroundImage: `url(${slide.image})`, backgroundPosition: slide.position }}
                >
                    <div className="hero-slide-overlay" />
                                        <div className="hero-slide-content">
                        <h2>{slide.title}</h2>
                        <p>{slide.subtitle}</p>
                        {slide.disabled ? (
                            <button
                                className="hero-slide-btn hero-slide-btn-disabled"
                                disabled
                            >
                                {slide.cta}
                            </button>
                        ) : (
                            <Link to={slide.link} className="hero-slide-btn">
                                {slide.cta}
                            </Link>
                        )}
                    </div>
                </div>
            ))}

            <button
                className="hero-slider-arrow hero-slider-arrow-left"
                onClick={prev}
                aria-label="Previous slide"
            >
                ‹
            </button>
            <button
                className="hero-slider-arrow hero-slider-arrow-right"
                onClick={next}
                aria-label="Next slide"
            >
                ›
            </button>

            <div className="hero-slider-dots">
                {SLIDES.map((slide, index) => (
                    <button
                        key={slide.title}
                        className={`hero-slider-dot ${index === current ? "active" : ""}`}
                        onClick={() => goTo(index)}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroSlider;