// Integration test for the production-repair work. Needs a MongoDB:
//   TEST_MONGO_URI=mongodb://127.0.0.1:27017/apna-basket-test npm run test:integration
// It DELETES data in that database, so never point it at real data.
if (!process.env.TEST_MONGO_URI) {
    console.log("Skipping integration tests: set TEST_MONGO_URI to run them.");
    process.exit(0);
}
if (!/test/i.test(process.env.TEST_MONGO_URI)) {
    console.error("TEST_MONGO_URI must contain the word 'test' (safety check).");
    process.exit(1);
}

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "hardening-test-jwt-secret-hardening-test-1234";
process.env.RAZORPAY_KEY_SECRET = "rzp_secret_for_tests";
process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_for_tests";
process.env.DISABLE_RATE_LIMIT = "true";
process.env.SMS_PROVIDER = "console";
process.env.DELIVERY_SLOTS = "off";
process.env.DELIVERY_FEE = "40";
process.env.FREE_DELIVERY_ABOVE = "0";
process.env.SERVICE_PINCODES = "";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = require("../index");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { expireUnpaidOrders } = require("../utils/orderService");

let server, base;
const call = async (method, path, { token, body, headers = {}, raw } = {}) => {
    const res = await fetch(base + path, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
        body: raw ?? (body ? JSON.stringify(body) : undefined),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
};
const tokenFor = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET);
const address = { fullName: "Riya Sharma", street: "12 MG Road", city: "Indore", state: "Madhya Pradesh", zipCode: "452001" };

let admin, adminToken, customer, customerToken, product;

test.before(async () => {
    await mongoose.connect(process.env.TEST_MONGO_URI);
    await mongoose.connection.dropDatabase();
    await User.syncIndexes();
    await Order.syncIndexes();
    server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
    base = `http://127.0.0.1:${server.address().port}`;

    admin = await User.create({ username: "boss", email: "boss@shop.in", password: "x", role: "admin", verified: true });
    customer = await User.create({ username: "Riya", email: "riya@shop.in", password: "x", role: "user", verified: true, otp: "leak-me", otpExpires: new Date(), otpAttempts: 2 });
    adminToken = tokenFor(admin);
    customerToken = tokenFor(customer);
    product = await Product.create({ name: "Atta", description: "Flour", category: "Staples", price: 100, stock: 50, imageUrl: "x" });
});

test.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    server.close();
});

const place = async (body = {}) =>
    call("POST", "/api/orders", {
        token: customerToken,
        body: { orderItems: [{ productId: product._id, quantity: 1 }], address, contactPhone: "9876543210", ...body },
    });

test("admin users list: names present, joined dates present, no password/OTP data", async () => {
    const { status, data } = await call("GET", "/api/auth/users", { token: adminToken });
    assert.equal(status, 200);
    const riya = data.find((u) => u.email === "riya@shop.in");
    assert.equal(riya.name, "Riya");
    assert.equal(riya.username, "Riya");
    assert.ok(riya.createdAt, "createdAt must exist");
    for (const k of ["password", "otp", "otpExpires", "otpAttempts", "addresses"]) assert.equal(k in riya, false, k);
    assert.equal((await call("GET", "/api/auth/users", { token: customerToken })).status, 403);
});

test("email login and OTP verify respond with both username and name, and no secrets", async () => {
    await User.create({ username: "Mohan", email: "mohan@shop.in", password: await require("bcryptjs").hash("secret123", 10), verified: true });
    const r = await call("POST", "/api/auth/login", { body: { email: "MOHAN@shop.in", password: "secret123" } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.username, "Mohan");
    assert.equal(r.data.name, "Mohan");
    for (const k of ["password", "otp"]) assert.equal(k in r.data, false);
    assert.equal((await call("POST", "/api/auth/login", { body: { email: "mohan@shop.in", password: "wrong-pass" } })).status, 401);
});

test("orders have createdAt, order number, history; admin order list shows customer name", async () => {
    const placed = await place();
    assert.equal(placed.status, 201, JSON.stringify(placed.data));
    const o = placed.data.order;
    assert.ok(o.createdAt && o.updatedAt);
    assert.match(o.orderNumber, /^AB-\d+$/);
    assert.equal(o.paymentStatus, "cod_pending");
    assert.equal(o.totalPrice, 140);

    const list = await call("GET", "/api/orders", { token: adminToken });
    const row = list.data.orders.find((x) => x._id === o._id);
    assert.equal(row.user.username, "Riya");
    assert.equal(row.user.name, "Riya");
    assert.equal("password" in row.user, false);
});

test("revenue counts only money received: paid and not cancelled/refunded", async () => {
    await Order.deleteMany({});
    const mk = (extra) => Order.create({
        user: customer._id, orderItems: [{ productId: product._id, quantity: 1, price: 100 }], totalPrice: 100,
        address, ...extra,
    });
    await mk({ paymentMethod: "Razorpay", paymentStatus: "paid", status: "delivered" });                    // counts: 100
    await mk({ paymentMethod: "Razorpay", paymentStatus: "paid", status: "pending", totalPrice: 250 });     // counts: 250
    await mk({ paymentMethod: "Razorpay", paymentStatus: "refunded", status: "cancelled", totalPrice: 999 });
    await mk({ paymentMethod: "Razorpay", paymentStatus: "refund_pending", status: "cancelled", totalPrice: 888 });
    await mk({ paymentMethod: "Razorpay", paymentStatus: "payment_pending", status: "pending", totalPrice: 777 });
    const cod = await mk({ paymentMethod: "Cash on Delivery", paymentStatus: "cod_pending", status: "pending", totalPrice: 70 });

    let stats = await call("GET", "/api/analytics", { token: adminToken });
    assert.equal(stats.status, 200);
    assert.equal(stats.data.totalRevenue, 350);
    assert.equal(stats.data.totalOrders, 6);
    assert.equal(typeof stats.data.totalRevenue, "number"); // never NaN

    // Delivering a COD order is the moment its cash is received
    const done = await call("PUT", `/api/orders/${cod._id}/status`, { token: adminToken, body: { status: "delivered" } });
    assert.equal(done.status, 200, JSON.stringify(done.data));
    assert.equal(done.data.order.paymentStatus, "paid");
    stats = await call("GET", "/api/analytics", { token: adminToken });
    assert.equal(stats.data.totalRevenue, 420);
});

test("admin status changes only move forward; cancelled/delivered are final; stock returns once", async () => {
    await Order.deleteMany({});
    await Product.updateOne({ _id: product._id }, { stock: 50 });
    const placed = await place({ orderItems: [{ productId: product._id, quantity: 5 }] });
    const id = placed.data.order._id;
    assert.equal((await Product.findById(product._id)).stock, 45);

    const put = (status) => call("PUT", `/api/orders/${id}/status`, { token: adminToken, body: { status } });
    assert.equal((await put("shipped")).status, 200);
    assert.equal((await put("confirmed")).status, 400);          // cannot go backwards
    assert.equal((await call("PUT", `/api/orders/${id}/status`, { token: adminToken, body: { status: "paid" } })).status, 400);
    assert.equal((await call("PUT", `/api/orders/${id}/status`, { token: customerToken, body: { status: "delivered" } })).status, 403);

    assert.equal((await put("cancelled")).status, 200);
    assert.equal((await Product.findById(product._id)).stock, 50);
    assert.equal((await put("cancelled")).data.message, "Order status unchanged");
    assert.equal((await put("pending")).status, 400);            // cancelled cannot be reopened
    assert.equal((await Product.findById(product._id)).stock, 50);

    const order = await Order.findById(id);
    assert.deepEqual(order.statusHistory.map((h) => h.status), ["pending", "shipped", "cancelled"]);
    assert.equal(order.statusHistory.at(-1).by, "admin");
});

test("student discount is applied on the server and a fake student email is refused", async () => {
    await Order.deleteMany({});
    const ok = await place({ studentBypass: true, studentEmail: "riya@iet.ac.in", orderItems: [{ productId: product._id, quantity: 2 }] });
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
    assert.equal(ok.data.order.discount, 20);
    assert.equal(ok.data.order.totalPrice, 220); // 200 + 40 - 20

    const stockBefore = (await Product.findById(product._id)).stock;
    const bad = await place({ studentBypass: true, studentEmail: "riya@gmail.com" });
    assert.equal(bad.status, 400);
    assert.equal((await Product.findById(product._id)).stock, stockBefore); // nothing reserved for a refused order

    // a browser cannot choose its own price
    const cheap = await place({ orderItems: [{ productId: product._id, quantity: 1, price: 1 }], totalPrice: 1, itemsTotal: 1 });
    assert.equal(cheap.data.order.totalPrice, 140);
});

const online = async () => {
    const placed = await place({ paymentMethod: "Razorpay" });
    assert.equal(placed.status, 201, JSON.stringify(placed.data));
    assert.equal(placed.data.order.paymentStatus, "payment_pending");
    assert.ok(placed.data.order.expiresAt);
    const rzp = `order_${crypto.randomBytes(6).toString("hex")}`;
    await Order.updateOne({ _id: placed.data.order._id }, { razorpayOrderId: rzp });
    return { id: placed.data.order._id, rzp };
};
const sign = (orderId, paymentId, secret = process.env.RAZORPAY_KEY_SECRET) =>
    crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

test("payment verify: bad signature refused, good one marks paid once (idempotent), other user cannot confirm", async () => {
    const { id, rzp } = await online();
    const pay = (extra = {}, token = customerToken) => call("POST", "/api/payments/verify", {
        token,
        body: { razorpay_order_id: rzp, razorpay_payment_id: "pay_1", razorpay_signature: sign(rzp, "pay_1"), ...extra },
    });

    assert.equal((await pay({ razorpay_signature: "deadbeef" })).status, 400);
    assert.equal((await pay({ razorpay_signature: sign(rzp, "pay_1").replace(/.$/, "0") })).status, 400);
    assert.equal((await Order.findById(id)).paymentStatus, "payment_pending");

    const stranger = await User.create({ username: "Other", email: "other@shop.in", password: "x", verified: true });
    assert.equal((await pay({}, tokenFor(stranger))).status, 404);
    assert.equal((await Order.findById(id)).paymentStatus, "payment_pending");

    const first = await pay();
    assert.equal(first.status, 200, JSON.stringify(first.data));
    const again = await pay();
    assert.equal(again.status, 200);
    const o = await Order.findById(id);
    assert.equal(o.paymentStatus, "paid");
    assert.equal(o.razorpayPaymentId, "pay_1");
    assert.ok(o.paidAt);
});

test("payment webhook: signed event marks the order paid; wrong signature does not", async () => {
    const { id, rzp } = await online();
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_w1", order_id: rzp } } } });
    const goodSig = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");

    assert.equal((await call("POST", "/api/payments/webhook", { raw: body, headers: { "x-razorpay-signature": "00".repeat(32) } })).status, 400);
    assert.equal((await Order.findById(id)).paymentStatus, "payment_pending");

    assert.equal((await call("POST", "/api/payments/webhook", { raw: body, headers: { "x-razorpay-signature": goodSig } })).status, 200);
    assert.equal((await Order.findById(id)).paymentStatus, "paid");
    // replay is harmless
    assert.equal((await call("POST", "/api/payments/webhook", { raw: body, headers: { "x-razorpay-signature": goodSig } })).status, 200);
});

test("cancelling an unpaid online order marks the payment failed and returns stock; a late payment is flagged for refund", async () => {
    await Product.updateOne({ _id: product._id }, { stock: 20 });
    const { id, rzp } = await online();
    assert.equal((await Product.findById(product._id)).stock, 19);

    const cancel = await call("PUT", `/api/orders/${id}/cancel`, { token: customerToken });
    assert.equal(cancel.status, 200, JSON.stringify(cancel.data));
    let o = await Order.findById(id);
    assert.equal(o.status, "cancelled");
    assert.equal(o.paymentStatus, "failed");
    assert.equal((await Product.findById(product._id)).stock, 20);

    // The customer had already paid in the Razorpay window: money must not be lost
    const late = await call("POST", "/api/payments/verify", {
        token: customerToken,
        body: { razorpay_order_id: rzp, razorpay_payment_id: "pay_late", razorpay_signature: sign(rzp, "pay_late") },
    });
    assert.equal(late.status, 409);
    o = await Order.findById(id);
    assert.equal(o.paymentStatus, "refund_pending");
    assert.equal((await Product.findById(product._id)).stock, 20); // not decremented again
});

test("expiry job cancels abandoned online orders (and only those) and releases their stock", async () => {
    await Order.deleteMany({});
    await Product.updateOne({ _id: product._id }, { stock: 30 });
    const stale = await place({ paymentMethod: "Razorpay" });
    const fresh = await place({ paymentMethod: "Razorpay" });
    const cod = await place();
    assert.equal((await Product.findById(product._id)).stock, 27);

    await Order.updateOne({ _id: stale.data.order._id }, { expiresAt: new Date(Date.now() - 60000) }); // no razorpayOrderId: nothing to ask Razorpay
    const n = await expireUnpaidOrders();
    assert.equal(n, 1);

    assert.equal((await Order.findById(stale.data.order._id)).status, "cancelled");
    assert.equal((await Order.findById(stale.data.order._id)).statusHistory.at(-1).by, "system");
    assert.equal((await Order.findById(fresh.data.order._id)).status, "pending");
    assert.equal((await Order.findById(cod.data.order._id)).status, "pending");
    assert.equal((await Product.findById(product._id)).stock, 28);
    assert.equal(await expireUnpaidOrders(), 0); // running again changes nothing
});

test("quote endpoint prices a cart on the server and reports stock problems", async () => {
    const q = await call("POST", "/api/orders/quote", { body: { orderItems: [{ productId: product._id, quantity: 2 }], studentEmail: "a@b.ac.in" } });
    assert.equal(q.status, 200);
    assert.equal(q.data.itemsTotal, 200);
    assert.equal(q.data.discount, 20);
    assert.equal(q.data.totalPrice, 220);
    const over = await call("POST", "/api/orders/quote", { body: { orderItems: [{ productId: product._id, quantity: 9999 }] } });
    assert.equal(over.status, 400); // quantity cap
});

test("customers can read only their own order; admin can read any", async () => {
    const placed = await place();
    const id = placed.data.order._id;
    const stranger = await User.create({ username: "S2", email: "s2@shop.in", password: "x", verified: true });
    assert.equal((await call("GET", `/api/orders/${id}`, { token: tokenFor(stranger) })).status, 404);
    assert.equal((await call("GET", `/api/orders/${id}`, { token: customerToken })).data.canCancel, true);
    assert.equal((await call("GET", `/api/orders/${id}`, { token: adminToken })).status, 200);
    assert.equal((await call("GET", "/api/orders/not-an-id", { token: customerToken })).status, 404);
});

test("health is ok once the database is connected", async () => {
    const r = await call("GET", "/api/health");
    assert.equal(r.status, 200);
    assert.equal(r.data.db, "up");
});
