/**
 * Read-only live checks for a running server (local or deployed):
 *   BASE_URL=https://your-site.com node scripts/smoke.js
 */
const base = (process.env.BASE_URL || "http://localhost:5000").replace(/\/$/, "");
let failed = 0;
const check = async (name, fn) => {
    try { await fn(); console.log(`PASS  ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
};
const ok = (c, m) => { if (!c) throw new Error(m); };

(async () => {
    await check("health is ok and DB is up", async () => {
        const r = await fetch(`${base}/api/health`); const j = await r.json();
        ok(r.status === 200 && j.db === "up", `status ${r.status} ${JSON.stringify(j)}`);
    });
    await check("security headers present", async () => {
        const r = await fetch(`${base}/api/health`);
        ok(r.headers.get("content-security-policy"), "no CSP");
        ok(r.headers.get("x-content-type-options") === "nosniff", "no nosniff");
        ok(!r.headers.get("x-powered-by"), "x-powered-by leaks");
    });
    await check("store config, products and slots are public", async () => {
        for (const p of ["/api/store/config", "/api/products", "/api/products/categories", "/api/store/slots"]) {
            const r = await fetch(base + p); ok(r.status === 200, `${p} -> ${r.status}`);
        }
    });
    await check("private routes are locked", async () => {
        for (const p of ["/api/auth/users", "/api/orders", "/api/analytics", "/api/orders/myorders", "/api/me"]) {
            const r = await fetch(base + p); ok(r.status === 401, `${p} -> ${r.status}`);
        }
    });
    await check("unknown API path is JSON 404", async () => {
        const r = await fetch(`${base}/api/does-not-exist`); ok(r.status === 404 && (r.headers.get("content-type") || "").includes("json"), `got ${r.status}`);
    });
    await check("no OTP / password fields in public JSON", async () => {
        const t = await (await fetch(`${base}/api/products`)).text();
        ok(!/"password"|"otp"|otpHash/i.test(t), "suspicious field in response");
    });
    process.exit(failed ? 1 : 0);
})();
