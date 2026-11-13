// No database needed: npm test
process.env.JWT_SECRET = "unit-test-jwt-secret-unit-test-jwt-secret-1234";
process.env.RAZORPAY_KEY_SECRET = "rzp_secret_for_tests";

const test = require("node:test");
const assert = require("node:assert/strict");

const validate = require("../middleware/validate");
const { checkEnv } = require("../config/env");
const User = require("../models/User");
const Order = require("../models/Order");
const { FLOW, CUSTOMER_CANCELLABLE, ADMIN_CANCELLABLE } = require("../utils/orderService");

const run = (mw, body, extra = {}) => {
    const req = { body, params: {}, ...extra };
    const out = { status: 200, json: null, nexted: false };
    const res = { status(c) { out.status = c; return this; }, json(j) { out.json = j; return this; } };
    mw(req, res, () => { out.nexted = true; });
    return { req, out };
};

test("User JSON never exposes password or OTP fields; name is an alias of username", () => {
    const u = new User({ username: "Asha", email: "A@B.co", password: "hash", otp: "x", otpExpires: new Date(), otpAttempts: 3 });
    const json = u.toJSON();
    for (const k of ["password", "otp", "otpExpires", "otpAttempts"]) assert.equal(k in json, false, k);
    assert.equal(json.name, "Asha");
    assert.equal(json.username, "Asha");
    assert.equal(json.email, "a@b.co"); // lower-cased so logins are not case-sensitive
    for (const k of ["password", "otp", "otpExpires", "otpAttempts"]) assert.equal(User.schema.path(k).options.select, false, `${k} must be select:false`);
});

test("User and Order have automatic timestamps; Order keeps a read-only `timestamp` alias", () => {
    assert.ok(User.schema.path("createdAt") && User.schema.path("updatedAt"));
    assert.ok(Order.schema.path("createdAt") && Order.schema.path("updatedAt"));
    const o = new Order({});
    o.createdAt = new Date("2026-01-02T03:04:05Z");
    assert.equal(o.toJSON().timestamp.toISOString(), "2026-01-02T03:04:05.000Z");
});

test("Order status and payment status sets match what the app uses", () => {
    assert.deepEqual(Order.ORDER_STATUSES, ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"]);
    for (const s of ["cod_pending", "payment_pending", "paid", "failed", "refund_pending", "refunded"]) {
        assert.ok(Order.PAYMENT_STATUSES.includes(s), s);
    }
    assert.deepEqual(CUSTOMER_CANCELLABLE, ["pending", "confirmed"]);
    assert.ok(!ADMIN_CANCELLABLE.includes("delivered"));
    assert.equal(FLOW.at(-1), "delivered");
});

test("validate.register / login block weak input and operator injection", () => {
    assert.equal(run(validate.register, { username: "A", email: "a@b.co", password: "abcdefg1" }).out.status, 400);
    assert.equal(run(validate.register, { username: "Asha", email: "nope", password: "abcdefg1" }).out.status, 400);
    assert.equal(run(validate.register, { username: "Asha", email: "a@b.co", password: "abcdefgh" }).out.status, 400);
    const ok = run(validate.register, { username: " Asha ", email: "Asha@Example.COM ", password: "abcdefg1" });
    assert.deepEqual(ok.req.body, { username: "Asha", email: "asha@example.com", password: "abcdefg1" });
    assert.equal(run(validate.login, { email: { $ne: null }, password: { $ne: null } }).out.status, 400);
    assert.equal(run(validate.verifyEmailOtp, { email: "a@b.co", otp: { $gt: "" } }).out.status, 400);
    assert.equal(run(validate.verifyEmailOtp, { email: "a@b.co", otp: "12345" }).out.status, 400);
});

const goodOrder = () => ({
    orderItems: [{ productId: "507f1f77bcf86cd799439011", quantity: 2, price: 1 }],
    address: { fullName: "A", street: "S", city: "C", state: "ST", zipCode: "452001", isAdmin: true },
    contactPhone: "9876543210",
    paymentMethod: "Razorpay",
});

test("validate.order drops client prices/unknown fields and checks PIN, phone, quantity, method", () => {
    const ok = run(validate.order, goodOrder());
    assert.equal(ok.out.nexted, true);
    assert.deepEqual(ok.req.body.orderItems, [{ productId: "507f1f77bcf86cd799439011", quantity: 2 }]);
    assert.equal("isAdmin" in ok.req.body.address, false);
    assert.equal(ok.req.body.contactPhone, "9876543210");

    const bad = (patch) => run(validate.order, { ...goodOrder(), ...patch }).out.status;
    assert.equal(bad({ address: { ...goodOrder().address, zipCode: "123" } }), 400);
    assert.equal(bad({ paymentMethod: "Bitcoin" }), 400);
    assert.equal(bad({ contactPhone: "12345" }), 400);
    assert.equal(bad({ orderItems: [] }), 400);
    assert.equal(bad({ orderItems: [{ productId: "x", quantity: 1 }] }), 400);
    assert.equal(bad({ orderItems: [{ productId: "507f1f77bcf86cd799439011", quantity: 0 }] }), 400);
    assert.equal(bad({ orderItems: [{ productId: "507f1f77bcf86cd799439011", quantity: 1000 }] }), 400);
    assert.equal(bad({ studentBypass: true }), 400);
});

test("validate.orderStatus accepts only known statuses", () => {
    assert.equal(run(validate.orderStatus, { status: "paid" }).out.status, 400);
    assert.equal(run(validate.orderStatus, { status: { $ne: 1 } }).out.status, 400);
    assert.equal(run(validate.orderStatus, { status: "packed" }).out.nexted, true);
});

test("environment check: production refuses placeholders, localhost DB and missing secrets", () => {
    const good = {
        NODE_ENV: "production", JWT_SECRET: "x".repeat(48), MONGO_URI: "mongodb+srv://u:p@cluster.mongodb.net/apna-basket",
        FRONTEND_URL: "https://shop.example.com", RAZORPAY_KEY_ID: "rzp_live_abc", RAZORPAY_KEY_SECRET: "s",
        RAZORPAY_WEBHOOK_SECRET: "w", SMTP_USER: "a@b.co", SMTP_PASS: "p",
        CLOUDINARY_CLOUD_NAME: "c", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s", SMS_PROVIDER: "msg91",
        MSG91_AUTH_KEY: "k", MSG91_OTP_TEMPLATE_ID: "t",
    };
    assert.deepEqual(checkEnv(good).errors, []);
    assert.ok(checkEnv({ ...good, JWT_SECRET: "super_secret_key" }).errors.length >= 1);
    assert.ok(checkEnv({ ...good, MONGO_URI: "mongodb://127.0.0.1:27017/x" }).errors.some((e) => /localhost/.test(e)));
    assert.ok(checkEnv({ ...good, SMTP_PASS: "" }).errors.some((e) => /SMTP/.test(e)));
    assert.ok(checkEnv({ ...good, DISABLE_RATE_LIMIT: "true" }).errors.some((e) => /RATE_LIMIT/.test(e)));
    assert.ok(checkEnv({ ...good, RAZORPAY_KEY_ID: "rzp_test_abc" }).warnings.some((w) => /TEST key/.test(w)));
    assert.ok(checkEnv({ ...good, SMS_PROVIDER: "console" }).warnings.some((w) => /phone login/i.test(w)));
});
