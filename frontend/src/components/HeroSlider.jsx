import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useT } from "../i18n/LanguageContext";
import "../styles/heroSlider.css";

const SLIDES = [
    {
        id: "s1",
        image: "/kusora-banner.jpg",
        position: "88% center", // keeps the basket artwork visible on narrow screens
        link: "/shop",
    },
    {
        id: "s2",
        image:
            "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=1200&q=70",
        link: "/shop",
    },
    {
        id: "s3",
        image:
            "https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=1200&q=70",
        link: "/shop",
    },
    {
        id: "s4",
        image:
            "https://images.unsplash.com/photo-1633536706889-af4e8cd7f64b?auto=format&fit=crop&w=1200&q=70",
        link: "/shop",
    },
];

const AUTO_SLIDE_INTERVAL = 4000; // ms

const HeroSlider = () => {
    const { t } = useT();
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
                    key={slide.id}
                    className={`hero-slide ${index === current ? "active" : ""}`}
                    style={{ backgroundImage: `url(${slide.image})`, backgroundPosition: slide.position }}
                >
                    <div className="hero-slide-overlay" />
                                        <div className="hero-slide-content">
                        <h2>{t(`hero.${slide.id}.title`)}</h2>
                        <p>{t(`hero.${slide.id}.subtitle`)}</p>
                        {slide.disabled ? (
                            <button
                                className="hero-slide-btn hero-slide-btn-disabled"
                                disabled
                            >
                                {t(`hero.${slide.id}.cta`)}
                            </button>
                        ) : (
                            <Link to={slide.link} className="hero-slide-btn">
                                {t(`hero.${slide.id}.cta`)}
                            </Link>
                        )}
                    </div>
                </div>
            ))}

            <button
                className="hero-slider-arrow hero-slider-arrow-left"
                onClick={prev}
                aria-label={t("hero.prev")}
            >
                ‹
            </button>
            <button
                className="hero-slider-arrow hero-slider-arrow-right"
                onClick={next}
                aria-label={t("hero.next")}
            >
                ›
            </button>

            <div className="hero-slider-dots">
                {SLIDES.map((slide, index) => (
                    <button
                        key={slide.id}
                        className={`hero-slider-dot ${index === current ? "active" : ""}`}
                        onClick={() => goTo(index)}
                        aria-label={t("hero.goTo", { n: index + 1 })}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroSlider;