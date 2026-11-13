const helmet = require("helmet");

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy tuned to what the React app really loads:
// Razorpay checkout (script + iframe), Cloudinary / Unsplash product images,
// Google Fonts and cdnjs (icons) stylesheets, and its own service worker.
const securityHeaders = () =>
    helmet({
        contentSecurityPolicy: {
            useDefaults: false,
            directives: {
                "default-src": ["'self'"],
                "script-src": ["'self'", "https://checkout.razorpay.com"],
                "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
                "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
                "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://images.unsplash.com", "https://*.razorpay.com"],
                "connect-src": ["'self'", "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
                "frame-src": ["https://api.razorpay.com", "https://checkout.razorpay.com"],
                "worker-src": ["'self'"],
                "manifest-src": ["'self'"],
                "object-src": ["'none'"],
                "base-uri": ["'self'"],
                "form-action": ["'self'"],
                "frame-ancestors": ["'self'"],
                ...(isProd ? { "upgrade-insecure-requests": [] } : {}),
            },
        },
        crossOriginEmbedderPolicy: false, // Razorpay's iframe breaks under COEP
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
        crossOriginResourcePolicy: { policy: "cross-origin" }, // Cloudflare / separate static host may call the API
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    });

module.exports = { securityHeaders };
