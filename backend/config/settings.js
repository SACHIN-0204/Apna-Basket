// Single source of truth for pricing and checkout rules.
// The server calculates every total from these values; the browser only displays them.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const num = (value, fallback) => {
    if (value === undefined || value === "") return fallback;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const list = (value, fallback) =>
    String(value ?? fallback)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

module.exports = {
    // Flat delivery charge in rupees. Keep in sync with frontend/src/config/store.js (display only).
    DELIVERY_FEE: num(process.env.DELIVERY_FEE, 40),
    // Delivery is free when the items total reaches this amount. 0 turns the feature off.
    FREE_DELIVERY_ABOVE: num(process.env.FREE_DELIVERY_ABOVE, 0),
    STUDENT_DISCOUNT_PERCENT: num(process.env.STUDENT_DISCOUNT_PERCENT, 10),
    // A student discount is accepted only for emails ending with one of these.
    // NOTE: this is a basic check, not proof of enrolment (see PHASE1_CHANGES.md).
    STUDENT_EMAIL_SUFFIXES: list(process.env.STUDENT_EMAIL_SUFFIXES, ".ac.in,.edu,.edu.in"),
    // How long an unpaid online order holds the customer's stock.
    PAYMENT_HOLD_MINUTES: num(process.env.PAYMENT_HOLD_MINUTES, 15),
    PAYMENT_METHODS: ["Cash on Delivery", "Razorpay"],
};
