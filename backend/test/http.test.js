// HTTP checks that need no database: headers, routing, validation order, rate limiting.
process.env.JWT_SECRET = "http-test-jwt-secret-http-test-jwt-secret-1234";
process.env.NODE_ENV = "test";
delete process.env.DISABLE_RATE_LIMIT;

const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../index");

let server, base, ipSeed = 1;
test.before(async () => {
    await new Promise((resolve) => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

// Each call pretends to come from a different client so rate limits do not bleed between tests
const call = (path, { method = "GET", body, headers = {}, ip } = {}) =>
    fetch(base + path, {
        method,
        headers: { "Content-Type": "application/json", "X-Forwarded-For": ip || `10.9.0.${ipSeed++ % 250}`, ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

test("health reports degraded (503) when the database is not connected", async () => {
    const res = await call("/api/health");
    assert.equal(res.status, 503);
    assert.equal((await res.json()).db, "down");
});

test("security headers: CSP allows Razorpay, nosniff, no x-powered-by", async () => {
    const res = await call("/api/health");
    const csp = res.headers.get("content-security-policy");
    assert.ok(csp.includes("https://checkout.razorpay.com") && csp.includes("frame-src"));
    assert.ok(csp.includes("res.cloudinary.com"));
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-powered-by"), null);
});

test("all route groups are mounted (store, me, contact were missing before)", async () => {
    assert.equal((await call("/api/store/config")).status, 200);
    assert.equal((await call("/api/me")).status, 401);          // mounted and protected, not a 404
    const contact = await call("/api/contact", { method: "POST", body: { website: "bot" } }); // honeypot answers without touching email
    assert.equal(contact.status, 200);
});

test("unknown API paths and bad JSON return JSON errors", async () => {
    const nf = await call("/api/nope");
    assert.equal(nf.status, 404);
    assert.deepEqual(await nf.json(), { message: "Not found" });
    const bad = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
    assert.equal(bad.status, 400);
});

test("private routes reject missing and malformed tokens", async () => {
    for (const p of ["/api/orders/myorders", "/api/orders", "/api/analytics", "/api/auth/users", "/api/orders/507f1f77bcf86cd799439011"]) {
        assert.equal((await call(p)).status, 401, p);
    }
    assert.equal((await call("/api/orders/myorders", { headers: { Authorization: "Bearer nonsense" } })).status, 401);
    assert.equal((await call("/api/payments/verify", { method: "POST", body: {} })).status, 401);
    assert.equal((await call("/api/payments/order", { method: "POST", body: {} })).status, 401);
});

test("payment webhook refuses an unsigned or wrongly signed call", async () => {
    assert.equal((await call("/api/payments/webhook", { method: "POST", body: { event: "payment.captured" } })).status, 400);
    assert.equal((await call("/api/payments/webhook", { method: "POST", body: {}, headers: { "x-razorpay-signature": "00" } })).status, 400);
});

test("login rejects operator injection before touching the database", async () => {
    const res = await call("/api/auth/login", { method: "POST", body: { email: { $ne: null }, password: { $ne: null } } });
    assert.equal(res.status, 400);
});

test("price quote validates input without a database", async () => {
    assert.equal((await call("/api/orders/quote", { method: "POST", body: { orderItems: [] } })).status, 400);
    assert.equal((await call("/api/orders/quote", { method: "POST", body: { orderItems: [{ productId: "x", quantity: 1 }] } })).status, 400);
});

test("login is rate limited per IP", async () => {
    let last;
    for (let i = 0; i < 35; i++) last = await call("/api/auth/login", { method: "POST", body: { email: "x@y.co", password: "" }, ip: "10.99.99.99" });
    assert.equal(last.status, 429);
});
