# Deployment guide (Render + MongoDB Atlas)

## 1. MongoDB Atlas
1. Create a cluster. M0 (free) is fine to start; **use M10 or above for real customers because only paid tiers have continuous backups.**
2. Database Access: create a user with a strong password and the `readWrite` role on `apna-basket` only.
3. Network Access: allow Render's outbound IPs (or `0.0.0.0/0` while testing, then tighten).
4. Copy the connection string into Render as `MONGO_URI`, ending with `/apna-basket`.

## 2. Render web service
Use `render.yaml` (New > Blueprint) or create a Web Service by hand:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Environment | Node 20 (`NODE_VERSION=20`) |

The old instruction `npm run render-build` pointed at a script that did not exist, and the previous `build` script never installed the backend packages, so the server crashed on first start. `npm run build` now installs backend + frontend and builds React into `frontend/build`, which Express serves when `NODE_ENV=production`.

## 3. Environment variables
Run `npm run check-env` locally with your production values first. In production the server **refuses to start** when a critical value is missing, JWT_SECRET is short or a placeholder, MONGO_URI points at localhost, or rate limiting is disabled.

Full list with comments: `backend/.env.example`. The important ones:

| Variable | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | your public https URL (CORS) |
| `MONGO_URI` | Atlas string |
| `JWT_SECRET` | 32+ random chars; also used to hash OTPs, so changing it logs everyone out and invalidates pending OTPs |
| `SMTP_USER`, `SMTP_PASS` | Gmail App Password |
| `CLOUDINARY_*` | three values |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | live keys (`rzp_live_...`) only after test-mode QA passes |
| `RAZORPAY_WEBHOOK_SECRET` | see section 4 |
| `SMS_PROVIDER` | `msg91` or `twilio`. With `console`, phone login is disabled in production |
| `SERVICE_PINCODES` | PIN codes you deliver to (empty = everywhere) |

## 4. Razorpay webhook
Dashboard > Settings > Webhooks > Add new:
- URL `https://<your-domain>/api/payments/webhook`
- Secret: the same value as `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured`, `order.paid`

It confirms payments when the customer pays and then loses connection before the browser can confirm. Unpaid online orders release their stock after `PAYMENT_HOLD_MINUTES` (default 15); before cancelling, the server asks Razorpay whether a payment actually landed.

If an order is cancelled after payment, its payment status becomes **refund_pending** and the server tries to refund it through Razorpay automatically. If that fails it stays `refund_pending`: refund it from the Razorpay dashboard. Orders in this state never count as revenue.

## 5. First deploy checklist
1. Open `https://<domain>/api/health` and expect `{"status":"ok","db":"up"}`.
2. **Existing database?** Run once from a Render Shell (or locally with the production `MONGO_URI`):
   `npm --prefix backend run migrate:phase2` (dry run), then `npm --prefix backend run migrate:phase2 -- --apply`.
3. Admin account: either run the additive seed once (`SEED_ALLOW_PRODUCTION=true npm run seed`, prints a random password once, never deletes anything, then remove the variable) or change an existing user's `role` to `admin` in Atlas. Delete or change the demo customer account.
4. Add an uptime monitor (UptimeRobot / Better Stack) on `/api/health`. On the free plan this also avoids the 15-minute cold start.
5. `BASE_URL=https://<domain> npm --prefix backend run smoke` and expect all PASS.

## 6. Backups
- **Primary:** Atlas continuous backup / daily snapshots with 7+ days retention. **Do one test restore** into a scratch cluster so you know it works.
- **Secondary:** `npm --prefix backend run backup` writes JSON for every collection (passwords/OTPs removed). Run it as a Render Cron Job and copy the output off the server (Render's disk is erased on each deploy).
- Product images live in Cloudinary, separate from the database.

## 7. Security reminders
- Rotate any secret that was ever shared or committed (JWT, SMTP app password, Cloudinary, Razorpay).
- Never commit `.env`; only `backend/.env.example` is tracked.
- After going live, delete/rename seed demo accounts.
