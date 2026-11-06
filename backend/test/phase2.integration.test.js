// Integration test: needs a MongoDB. Run with:
//   TEST_MONGO_URI=mongodb://127.0.0.1:27017/apna-basket-test npm run test:integration
// It creates and DELETES data in that database, so never point it at real data.
if (!process.env.TEST_MONGO_URI) {
    console.log("Skipping integration tests: set TEST_MONGO_URI to run them.");
    process.exit(0);
}
if (!/test/i.test(process.env.TEST_MONGO_URI)) {
    console.error("TEST_MONGO_URI must contain the word 'test' (safety check).");
    process.exit(1);
}

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-secret";
process.env.SMS_PROVIDER = "console";
process.env.DELIVERY_SLOTS = "off"; // slots and service area have their own tests (phase3.integration.test.js)
process.env.DELIVERY_FEE = "40";
process.env.FREE_DELIVERY_ABOVE = "0";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const mongoose = require("mongoose");

// Capture SMS bodies instead of printing them
const sentSms = [];
const origLog = console.log;
console.log = (...a) => {
    const line = a.join(" ");
    if (line.startsWith("[SMS to")) sentSms.push(line);
    else origLog(...a);
};

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const PhoneOtp = require("../models/PhoneOtp");

let server, base;
let ipSeed = 1;
const call = async (method, path, { token, body } = {}) => {
    // Each simulated customer gets their own IP so the per-IP rate limiter does not interfere
    const ip = `10.${(ipSeed >> 16) & 255}.${(ipSeed >> 8) & 255}.${ipSeed++ & 255}`;
    const res = await fetch(base + path, {
        method,
        headers: { "Content-Type": "application/json", "X-Forwarded-For": ip, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
};

const lastOtp = () => {
    const m = sentSms.filter((l) => /login code/.test(l)).pop().match(/\] (\d{6}) is your/);
    return m[1];
};

const login = async (phone) => {
    const r = await call("POST", "/api/auth/otp/request", { body: { phone } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const v = await call("POST", "/api/auth/otp/verify", { body: { phone, otp: lastOtp() } });
    assert.equal(v.status, 200, JSON.stringify(v.data));
    return v.data;
};

const address = { fullName: "Riya Sharma", street: "12 MG Road", city: "Indore", state: "Madhya Pradesh", zipCode: "452001" };

test.before(async () => {
    await mongoose.connect(process.env.TEST_MONGO_URI);
    await mongoose.connection.dropDatabase();
    await User.syncIndexes();

    const app = express();
    app.set("trust proxy", 1);
    app.use(express.json());
    app.use("/api/auth", require("../routes/authRoutes"));
    app.use("/api/me", require("../routes/meRoutes"));
    app.use("/api/orders", require("../routes/orderRoutes"));
    server = http.createServer(app).listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    server.close();
});

test("phone OTP: wrong code fails, right code signs up silently, code is single-use", async () => {
    const phone = "9876500001";
    await call("POST", "/api/auth/otp/request", { body: { phone } });
    const code = lastOtp();

    const wrong = await call("POST", "/api/auth/otp/verify", { body: { phone, otp: code === "111111" ? "222222" : "111111" } });
    assert.equal(wrong.status, 400);

    const ok = await call("POST", "/api/auth/otp/verify", { body: { phone, otp: code } });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.isNewUser, true);
    assert.ok(ok.data.token);

    const replay = await call("POST", "/api/auth/otp/verify", { body: { phone, otp: code } });
    assert.equal(replay.status, 400); // already used

    const stored = await PhoneOtp.findOne({ phone });
    assert.equal(stored, null);
});

test("phone OTP: resend cooldown, lockout after 5 wrong tries, invalid numbers", async () => {
    const phone = "9876500002";
    assert.equal((await call("POST", "/api/auth/otp/request", { body: { phone } })).status, 200);
    assert.equal((await call("POST", "/api/auth/otp/request", { body: { phone } })).status, 429);
    assert.equal((await call("POST", "/api/auth/otp/request", { body: { phone: "12345" } })).status, 400);

    const real = lastOtp();
    const bad = real === "000000" ? "000001" : "000000";
    for (let i = 0; i < 5; i++) await call("POST", "/api/auth/otp/verify", { body: { phone, otp: bad } });
    const locked = await call("POST", "/api/auth/otp/verify", { body: { phone, otp: real } });
    assert.equal(locked.status, 429); // even the right code is refused after 5 misses
});

test("phone OTP: the stored code is hashed, and admins cannot use phone login", async () => {
    const phone = "9876500003";
    await call("POST", "/api/auth/otp/request", { body: { phone } });
    const stored = await PhoneOtp.findOne({ phone });
    assert.notEqual(stored.otpHash, lastOtp());
    assert.equal(stored.otpHash.length, 64);

    await User.create({ phone: "9876500004", role: "admin", username: "boss", verified: true });
    await call("POST", "/api/auth/otp/request", { body: { phone: "9876500004" } });
    const r = await call("POST", "/api/auth/otp/verify", { body: { phone: "9876500004", otp: lastOtp() } });
    assert.equal(r.status, 403);
});

test("two phone-only customers can exist (no email, no password)", async () => {
    await login("9876500005");
    await login("9876500006");
    assert.equal(await User.countDocuments({ email: { $exists: false }, role: "user" }) >= 2, true);
});

test("saved addresses: add, default switching, limit, delete", async () => {
    const { token } = await login("9876500010");
    const a = await call("POST", "/api/me/addresses", { token, body: { ...address, label: "Home" } });
    assert.equal(a.status, 201);
    assert.equal(a.data.addresses[0].isDefault, true);

    const b = await call("POST", "/api/me/addresses", { token, body: { ...address, street: "Office Park", label: "Work", isDefault: true } });
    assert.equal(b.data.addresses.filter((x) => x.isDefault).length, 1);
    assert.equal(b.data.addresses.find((x) => x.isDefault).label, "Work");

    const bad = await call("POST", "/api/me/addresses", { token, body: { ...address, zipCode: "12" } });
    assert.equal(bad.status, 400);

    for (let i = 0; i < 3; i++) await call("POST", "/api/me/addresses", { token, body: { ...address, street: `Extra ${i}` } });
    const full = await call("POST", "/api/me/addresses", { token, body: { ...address, street: "Too many" } });
    assert.equal(full.status, 400);

    const id = b.data.addresses[0]._id;
    const del = await call("DELETE", `/api/me/addresses/${id}`, { token });
    assert.equal(del.data.addresses.filter((x) => x.isDefault).length, 1);
});

test("order lifecycle: number, history, stock, customer cancel restores stock", async () => {
    const { token } = await login("9876500020");
    const product = await Product.create({ name: "Atta 5kg", description: "Wheat flour", category: "Staples", price: 200, stock: 10, imageUrl: "x" });

    const placed = await call("POST", "/api/orders", {
        token,
        body: { orderItems: [{ productId: product._id, quantity: 3 }], address, contactPhone: "9876500020", paymentMethod: "Cash on Delivery" },
    });
    assert.equal(placed.status, 201, JSON.stringify(placed.data));
    const order = placed.data.order;
    assert.match(order.orderNumber, /^AB-\d+$/);
    assert.equal(order.totalPrice, 640); // 600 + 40 delivery
    assert.equal(order.statusHistory.length, 1);
    assert.equal((await Product.findById(product._id)).stock, 7);

    // the address was remembered, and the customer's name taken from it
    await new Promise((r) => setTimeout(r, 150));
    const addrs = await call("GET", "/api/me/addresses", { token });
    assert.equal(addrs.data.addresses.length, 1);
    assert.equal((await User.findOne({ phone: "9876500020" })).username, "Riya Sharma");

    // someone else cannot see or cancel it
    const other = await login("9876500021");
    assert.equal((await call("GET", `/api/orders/${order._id}`, { token: other.token })).status, 404);
    assert.equal((await call("POST", `/api/orders/${order._id}/cancel`, { token: other.token })).status, 404);

    const detail = await call("GET", `/api/orders/${order._id}`, { token });
    assert.equal(detail.data.canCancel, true);

    const cancelled = await call("POST", `/api/orders/${order._id}/cancel`, { token });
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.data));
    assert.equal((await Product.findById(product._id)).stock, 10); // stock came back
    const after = await Order.findById(order._id);
    assert.equal(after.status, "cancelled");
    assert.equal(after.statusHistory.at(-1).by, "customer");

    // cancelling twice must not return stock twice
    assert.equal((await call("POST", `/api/orders/${order._id}/cancel`, { token })).status, 400);
    assert.equal((await Product.findById(product._id)).stock, 10);
});

test("cancel is refused once the store is packing", async () => {
    const { token } = await login("9876500030");
    const product = await Product.create({ name: "Dal 1kg", description: "Toor dal", category: "Staples", price: 150, stock: 5, imageUrl: "x" });
    const placed = await call("POST", "/api/orders", {
        token,
        body: { orderItems: [{ productId: product._id, quantity: 1 }], address, contactPhone: "9876500030" },
    });
    await Order.updateOne({ _id: placed.data.order._id }, { status: "packed" });
    const r = await call("POST", `/api/orders/${placed.data.order._id}/cancel`, { token });
    assert.equal(r.status, 400);
    assert.equal((await Product.findById(product._id)).stock, 4);
});

test("a paid online order that is cancelled is flagged for refund, not lost", async () => {
    const { token } = await login("9876500040");
    const product = await Product.create({ name: "Oil 1L", description: "Sunflower oil", category: "Oil", price: 180, stock: 5, imageUrl: "x" });
    const placed = await call("POST", "/api/orders", {
        token,
        body: { orderItems: [{ productId: product._id, quantity: 2 }], address, contactPhone: "9876500040", paymentMethod: "Razorpay" },
    });
    assert.equal(placed.data.order.paymentStatus, "payment_pending");
    await Order.updateOne({ _id: placed.data.order._id }, { paymentStatus: "paid" }); // payment arrived

    const r = await call("POST", `/api/orders/${placed.data.order._id}/cancel`, { token });
    assert.equal(r.status, 200);
    assert.equal((await Order.findById(placed.data.order._id)).paymentStatus, "refund_pending");
    assert.equal((await Product.findById(product._id)).stock, 5);
});

test("cancel loses the race to a payment that lands at the same moment", async () => {
    // Simulates: cancel read the order as payment_pending, then payment arrived before the update ran.
    const { cancelMyOrder } = require("../controllers/orderController");
    const { token } = await login("9876500050");
    const product = await Product.create({ name: "Rice 5kg", description: "Basmati", category: "Staples", price: 400, stock: 5, imageUrl: "x" });
    const placed = await call("POST", "/api/orders", {
        token,
        body: { orderItems: [{ productId: product._id, quantity: 1 }], address, contactPhone: "9876500050", paymentMethod: "Razorpay" },
    });
    const id = placed.data.order._id;

    // Flip to paid right after the controller loads the order
    const realFindOne = Order.findOne;
    Order.findOne = function (...args) {
        const q = realFindOne.apply(this, args);
        const realExec = q.exec.bind(q);
        q.exec = async () => {
            const doc = await realExec();
            await Order.updateOne({ _id: id }, { paymentStatus: "paid" });
            return doc;
        };
        return q;
    };
    const user = await User.findOne({ phone: "9876500050" });
    const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    try {
        await cancelMyOrder({ params: { id: String(id) }, user }, res);
    } finally {
        Order.findOne = realFindOne;
    }
    assert.equal(res.code, 409);
    const o = await Order.findById(id);
    assert.equal(o.status, "pending");        // not cancelled
    assert.equal(o.paymentStatus, "paid");    // not wrongly marked failed
    assert.equal((await Product.findById(product._id)).stock, 4); // stock not returned
});

test("reorder uses today's price and stock, and skips what is gone", async () => {
    const { token } = await login("9876500060");
    const a = await Product.create({ name: "Sugar 1kg", description: "Sugar", category: "Staples", price: 50, stock: 20, imageUrl: "x" });
    const b = await Product.create({ name: "Tea 250g", description: "Tea", category: "Beverages", price: 120, stock: 20, imageUrl: "x" });
    const placed = await call("POST", "/api/orders", {
        token,
        body: { orderItems: [{ productId: a._id, quantity: 4 }, { productId: b._id, quantity: 2 }], address, contactPhone: "9876500060" },
    });
    await Product.updateOne({ _id: a._id }, { price: 55, stock: 2 });   // pricier, low stock
    await Product.updateOne({ _id: b._id }, { stock: 0 });              // sold out

    const r = await call("POST", `/api/orders/${placed.data.order._id}/reorder`, { token });
    assert.equal(r.status, 200);
    assert.equal(r.data.items.length, 1);
    assert.equal(r.data.items[0].price, 55);
    assert.equal(r.data.items[0].quantity, 2);
    assert.equal(r.data.skipped.length, 2);
});

test("order numbers are unique and increasing under parallel orders", async () => {
    const { token } = await login("9876500070");
    const p = await Product.create({ name: "Salt 1kg", description: "Salt", category: "Staples", price: 20, stock: 50, imageUrl: "x" });
    const results = await Promise.all(
        Array.from({ length: 8 }, () =>
            call("POST", "/api/orders", { token, body: { orderItems: [{ productId: p._id, quantity: 1 }], address, contactPhone: "9876500070" } })
        )
    );
    const numbers = results.map((r) => r.data.order.orderNumber);
    assert.equal(new Set(numbers).size, 8);
    assert.equal((await Product.findById(p._id)).stock, 42);
});
