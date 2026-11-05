const settings = require("../config/settings");

const round2 = (n) => Math.round(n * 100) / 100;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isStudentEmail = (email) => {
    const e = normalizeEmail(email);
    if (!EMAIL_REGEX.test(e)) return false;
    return settings.STUDENT_EMAIL_SUFFIXES.some((suffix) => e.endsWith(suffix));
};

/**
 * The one place where an order total is calculated.
 * itemsTotal: sum of (database price x quantity)
 * studentEmail: optional; discount applies only if it passes isStudentEmail
 */
const calculateTotals = (itemsTotal, { studentEmail } = {}) => {
    const items = round2(itemsTotal);
    const studentDiscountApplied = items > 0 && isStudentEmail(studentEmail);
    const discount = studentDiscountApplied
        ? round2((items * settings.STUDENT_DISCOUNT_PERCENT) / 100)
        : 0;

    let deliveryFee = items > 0 ? settings.DELIVERY_FEE : 0;
    if (settings.FREE_DELIVERY_ABOVE > 0 && items >= settings.FREE_DELIVERY_ABOVE) {
        deliveryFee = 0;
    }

    return {
        itemsTotal: items,
        deliveryFee,
        discount,
        totalPrice: round2(Math.max(0, items + deliveryFee - discount)),
        studentDiscountApplied,
    };
};

module.exports = { calculateTotals, isStudentEmail, normalizeEmail, round2 };
