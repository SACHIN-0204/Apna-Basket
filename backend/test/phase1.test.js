// Run with: npm test   (no database needed)
process.env.DELIVERY_FEE = "40";
process.env.FREE_DELIVERY_ABOVE = "500";
process.env.STUDENT_DISCOUNT_PERCENT = "10";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { calculateTotals, isStudentEmail } = require("../utils/pricing");
const { normalizePhone } = require("../utils/phone");
const { hmacHex, safeEqual } = require("../controllers/paymentController");

test("totals: delivery fee is added below the free-delivery threshold", () => {
    const t = calculateTotals(200);
    assert.equal(t.itemsTotal, 200);
    assert.equal(t.deliveryFee, 40);
    assert.equal(t.discount, 0);
    assert.equal(t.totalPrice, 240);
});

test("totals: delivery is free at or above the threshold", () => {
    assert.equal(calculateTotals(500).deliveryFee, 0);
    assert.equal(calculateTotals(750).totalPrice, 750);
});

test("totals: empty cart costs nothing", () => {
    const t = calculateTotals(0);
    assert.equal(t.deliveryFee, 0);
    assert.equal(t.totalPrice, 0);
});

test("totals: student discount needs a college email, and is 10% of items", () => {
    const ok = calculateTotals(300, { studentEmail: "Riya@IET.ac.in" });
    assert.equal(ok.discount, 30);
    assert.equal(ok.totalPrice, 300 + 40 - 30);
    assert.equal(ok.studentDiscountApplied, true);

    const gmail = calculateTotals(300, { studentEmail: "riya@gmail.com" });
    assert.equal(gmail.discount, 0);
    assert.equal(gmail.studentDiscountApplied, false);
});

test("student email check is not fooled by lookalike domains", () => {
    assert.equal(isStudentEmail("a@college.edu"), true);
    assert.equal(isStudentEmail("a@college.edu.evil.com"), false);
    assert.equal(isStudentEmail("not-an-email"), false);
    assert.equal(isStudentEmail(""), false);
});

test("totals are rounded to paise", () => {
    const t = calculateTotals(33.333, { studentEmail: "x@y.ac.in" });
    assert.equal(t.itemsTotal, 33.33);
    assert.equal(t.discount, 3.33);
    assert.equal(t.totalPrice, 70);
});

test("phone: accepts common Indian formats and rejects bad ones", () => {
    assert.equal(normalizePhone("9876543210"), "9876543210");
    assert.equal(normalizePhone("+91 98765-43210"), "9876543210");
    assert.equal(normalizePhone("09876543210"), "9876543210");
    assert.equal(normalizePhone("5876543210"), null); // must start with 6-9
    assert.equal(normalizePhone("98765"), null);
    assert.equal(normalizePhone(undefined), null);
});

test("razorpay signature: uses order_id|payment_id with no spaces", () => {
    const secret = "test_secret";
    const orderId = "order_ABC123";
    const paymentId = "pay_XYZ789";

    // What Razorpay itself computes
    const fromRazorpay = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    assert.equal(hmacHex(secret, `${orderId}|${paymentId}`), fromRazorpay);

    // The old buggy format must NOT match
    assert.notEqual(hmacHex(secret, `${orderId} | ${paymentId}`), fromRazorpay);
});

test("safeEqual: compares signatures safely", () => {
    assert.equal(safeEqual("abc", "abc"), true);
    assert.equal(safeEqual("abc", "abd"), false);
    assert.equal(safeEqual("abc", "abcd"), false);
    assert.equal(safeEqual(undefined, "abc"), false);
});
