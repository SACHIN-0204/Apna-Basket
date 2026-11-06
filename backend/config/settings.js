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
    // PIN codes we deliver to, comma separated (for example 452001,452002). Empty = deliver everywhere.
    SERVICE_PINCODES: list(process.env.SERVICE_PINCODES, ""),
    // Delivery windows as HH:MM-HH:MM, comma separated, or "off" to switch slots off.
    DELIVERY_SLOTS: String(process.env.DELIVERY_SLOTS ?? "09:00-12:00,12:00-15:00,15:00-18:00,18:00-21:00").trim(),
    // A slot closes this many minutes before it starts (time to pick and pack the order).
    SLOT_LEAD_MINUTES: num(process.env.SLOT_LEAD_MINUTES, 60),
    // How many days can be booked: 2 = today and tomorrow.
    SLOT_DAYS_AHEAD: Math.max(1, Math.min(7, Math.floor(num(process.env.SLOT_DAYS_AHEAD, 2)))),
    PAYMENT_METHODS: ["Cash on Delivery", "Razorpay"],
};
