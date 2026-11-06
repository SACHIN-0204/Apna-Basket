// Integration test for part B: shop listing API, delivery slots, service area.
//   TEST_MONGO_URI=mongodb://127.0.0.1:27017/apna-basket-test npm run test:integration
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
process.env.DELIVERY_FEE = "40";
process.env.FREE_DELIVERY_ABOVE = "500";
process.env.DELIVERY_SLOTS = "09:00-12:00,12:00-15:00,15:00-18:00,18:00-21:00";
process.env.SERVICE_PINCODES = "452001,452002";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const mongoose = require("mongoose");

const sentSms = [];
const origLog = console.log;
console.log = (...a) => {
    const line = a.join(" ");
    if (line.startsWith("[SMS to")) sentSms.push(line);
    else origLog(...a);
};

const Product = require("../models/Product");
const Order = require("../models/Order");

let server, base, ipSeed = 1;
const call = async (method, path, { token, body } = {}) => {
    const ip = `10.7.${(ipSeed >> 8) & 255}.${ipSeed++ & 255}`;
    const res = await fetch(base + path, {
        method,
        headers: { "Content-Type": "application/json", "X-Forwarded-For": ip, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json().catch(() => ({})), headers: res.headers };
};

const login = async (phone) => {
    await call("POST", "/api/auth/otp/request", { body: { phone } });
    const otp = sentSms.filter((l) => /login code/.test(l)).pop().match(/\] (\d{6}) is your/)[1];
    return (await call("POST", "/api/auth/otp/verify", { body: { phone, otp } })).data;
};

const address = { fullName: "Riya Sharma", street: "12 MG Road", city: "Indore", state: "Madhya Pradesh", zipCode: "452001" };
const mk = (name, extra) => Product.create({ name, description: name, category: "Staples", price: 100, stock: 10, imageUrl: "x", ...extra });

test.before(async () => {
    await mongoose.connect(process.env.TEST_MONGO_URI);
    await mongoose.connection.dropDatabase();
    const app = express();
    app.set("trust proxy", 1);
    app.use(express.json());
    app.use("/api/auth", require("../routes/authRoutes"));
    app.use("/api/products", require("../routes/productRoutes"));
    app.use("/api/store", require("../routes/storeRoutes"));
    app.use("/api/orders", require("../routes/orderRoutes"));
    server = http.createServer(app).listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    server.close();
});

test("products: pagination, totals, and a stable order across pages", async () => {
    for (let i = 1; i <= 7; i++) await mk(`Item ${String(i).padStart(2, "0")}`, { price: 10 * i });
    const p1 = await call("GET", "/api/products?limit=3&page=1&sort=name");
    const p2 = await call("GET", "/api/products?limit=3&page=2&sort=name");
    const p3 = await call("GET", "/api/products?limit=3&page=3&sort=name");
    assert.equal(p1.data.total, 7);
    assert.equal(p1.data.totalPages, 3);
    assert.equal(p1.data.hasMore, true);
    assert.equal(p3.data.hasMore, false);
    assert.equal(p3.data.products.length, 1);
    const names = [...p1.data.products, ...p2.data.products, ...p3.data.products].map((p) => p.name);
    assert.equal(new Set(names).size, 7);                   // no duplicates or gaps across pages
    assert.deepEqual(names, [...names].sort());             // sorted by name
});

test("products: in-stock first, price sorts, search across name/brand/category, category filter", async () => {
    await Product.deleteMany({});
    await mk("Cheap Soldout", { price: 5, stock: 0 });
    await mk("Mid Rice", { price: 50, brand: "Daawat", category: "Grocery" });
    await mk("Dear Oil", { price: 300, category: "Oil" });

    const low = await call("GET", "/api/products?limit=10&sort=priceLow");
    assert.deepEqual(low.data.products.map((p) => p.name), ["Mid Rice", "Dear Oil", "Cheap Soldout"]); // sold out last despite lowest price
    const high = await call("GET", "/api/products?limit=10&sort=priceHigh");
    assert.equal(high.data.products[0].name, "Dear Oil");

    assert.equal((await call("GET", "/api/products?limit=10&search=daawat")).data.total, 1);   // brand, any case
    assert.equal((await call("GET", "/api/products?limit=10&search=oil")).data.total, 1);      // category / name
    assert.equal((await call("GET", "/api/products?limit=10&category=Grocery")).data.total, 1);
    assert.equal((await call("GET", "/api/products?limit=10&search=(.*")).status, 200);        // regex characters are escaped
    assert.equal((await call("GET", "/api/products?limit=10&search=(.*")).data.total, 0);
});

test("products: hidden products never appear; ids and categories endpoints work", async () => {
    await Product.deleteMany({});
    const a = await mk("Visible A", { category: "Grocery" });
    const b = await mk("Visible B", { category: "Oil" });
    const hidden = await mk("Hidden", { category: "Secret", isActive: false });

    const list = await call("GET", "/api/products?limit=10");
    assert.equal(list.data.total, 2);

    const byIds = await call("GET", `/api/products?ids=${a._id},${hidden._id},not-an-id`);
    assert.deepEqual(byIds.data.map((p) => p.name), ["Visible A"]);   // hidden and invalid ids are dropped

    const cats = await call("GET", "/api/products/categories");
    assert.deepEqual(cats.data, ["Grocery", "Oil"]);                  // no "Secret"
    assert.ok(b);
});

test("products: legacy call without limit still returns a plain array", async () => {
    const r = await call("GET", "/api/products");
    assert.ok(Array.isArray(r.data));
});

test("store endpoints: config, slots (never cached) and pincode check", async () => {
    const cfg = await call("GET", "/api/store/config");
    assert.equal(cfg.data.deliveryFee, 40);
    assert.equal(cfg.data.freeDeliveryAbove, 500);
    assert.equal(cfg.data.slotsEnabled, true);
    assert.equal(cfg.data.serviceAreaEnabled, true);

    const slots = await call("GET", "/api/store/slots");
    assert.equal(slots.data.enabled, true);
    assert.ok(slots.data.days.length >= 1);
    assert.match(slots.headers.get("cache-control"), /no-store/);

    assert.equal((await call("GET", "/api/store/pincode/452001")).data.serviceable, true);
    assert.equal((await call("GET", "/api/store/pincode/110001")).data.serviceable, false);
    assert.equal((await call("GET", "/api/store/pincode/12")).status, 400);
});

test("orders: slot is required, validated, and stored; bad PIN is refused before stock is touched", async () => {
    const { token } = await login("9876511111");
    const product = await mk("Atta", { price: 200, stock: 10 });
    const items = [{ productId: product._id, quantity: 2 }];
    const slotId = (await call("GET", "/api/store/slots")).data.days[0].slots[0].id;

    // no slot
    const none = await call("POST", "/api/orders", { token, body: { orderItems: items, address, contactPhone: "9876511111" } });
    assert.equal(none.status, 400);
    assert.match(none.data.message, /delivery time/i);

    // made-up slot, and a slot in the past
    for (const bad of ["2026-01-01|09:00-12:00", "garbage"]) {
        const r = await call("POST", "/api/orders", { token, body: { orderItems: items, address, contactPhone: "9876511111", deliverySlot: bad } });
        assert.equal(r.status, 400);
    }

    // PIN outside the service area
    const far = await call("POST", "/api/orders", {
        token,
        body: { orderItems: items, address: { ...address, zipCode: "110001" }, contactPhone: "9876511111", deliverySlot: slotId },
    });
    assert.equal(far.status, 400);
    assert.match(far.data.message, /do not deliver/i);
    assert.equal((await Product.findById(product._id)).stock, 10); // nothing reserved by the failed attempts

    // valid
    const ok = await call("POST", "/api/orders", { token, body: { orderItems: items, address, contactPhone: "9876511111", deliverySlot: slotId } });
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
    assert.equal(ok.data.order.deliverySlot.date, slotId.split("|")[0]);
    assert.match(ok.data.order.deliverySlot.label, /(Today|Tomorrow), /);
    assert.equal((await Product.findById(product._id)).stock, 8);

    const stored = await Order.findById(ok.data.order._id);
    assert.equal(stored.deliverySlot.start, slotId.split("|")[1].split("-")[0]);
    assert.ok(sentSms.some((l) => /Delivery: /.test(l)));          // the SMS mentions the window
});
