# Production repair: what changed

## What I found first
The backend order/payment layer was older than the frontend and the repo's own tests. The tests (`phase1/2/3`) and the React pages expected order numbers, status history, `GET /api/orders/:id`, cancel, reorder, delivery slots, `payment_pending` / `cod_pending` statuses and a price quote endpoint; the backend had none of them (baseline: 2 failing unit tests and 10 of 17 integration tests failing). The `/api/me`, `/api/store` and `/api/contact` routes existed but were **never mounted**, so in production they returned the React page instead of JSON. The checkout page was an older copy still branded "Abhishek Kirana Store". Those gaps are closed as part of this work.

## Phase 2: Database and admin
- **Revenue**: counts only money received, i.e. `paymentStatus: paid` and not cancelled. Refunded, refund-pending, unpaid and cancelled orders are excluded; a COD order joins revenue when delivered.
- **username / name**: one stored field (`username`) plus a `name` alias returned everywhere (login, OTP, phone login, admin lists, populated orders). Emails are lower-cased on write.
- **Timestamps**: `User` and `Order` use `timestamps: true`. The old `Order.timestamp` is kept as a read-only alias. `migrate:phase2` upgrades existing data.
- **OTP exposure**: `password`, `otp`, `otpExpires`, `otpAttempts` are `select:false` and stripped from JSON; the admin user list also omits saved addresses. Failed-OTP handling returns the generic 500 instead of leaking error text.
- **Safe seed**: additive by default (upsert, never overwrites edited prices/stock), `--reset` is blocked in production and needs the database name typed, random passwords printed once, no hard-coded credentials. The old script deleted all data and could do so in production with one env flag.
- Order data model: `orderNumber`, `statusHistory`, `contactPhone`, `deliverySlot`, `expiresAt`, separate `paymentStatus`.

## Phase 3: Security
- `helmet` + a CSP matched to this app (Razorpay, Cloudinary, Unsplash, Google Fonts, service worker), global API rate limit, plus limits on orders, payments and the public contact form (login/OTP limits already existed), 100 kB body limit, `trust proxy`, JSON 404/error handlers.
- Validation on register, login, OTP, phone, orders (whitelisted fields, 6-digit PIN, phone, quantities 1–99, ObjectIds) and status updates; rejects NoSQL operator injection.
- **Payments**: amount always comes from the saved server-priced order; signature check is constant-time; verify is ownership-checked and idempotent; a payment that arrives for an order cancelled meanwhile is claimed and refunded instead of lost; **webhook added** for customers who pay and lose connection; unpaid online orders expire (after asking Razorpay whether a payment landed) and release stock; cancel-versus-pay race returns 409 instead of cancelling a paid order; automatic refunds with `refund_pending` as the safe fallback.
- Pricing is computed in one place (`utils/pricing.js`) with free-delivery and server-validated student discount; stock is reserved atomically.
- Customer cancel (`PUT` or `POST /api/orders/:id/cancel`), reorder, order detail and `/api/orders/quote` implemented to match what the frontend already called. Admin transitions only move forward and cancelled/delivered are final.

## Phase 4: Deployment
- Root `build` now installs **backend and frontend** packages; `render-build` alias added (the README referenced a script that did not exist). `render.yaml`, `/api/health`, graceful shutdown, startup environment validation (production refuses placeholders, localhost DB, missing secrets), `backend/.env.example` (there was none), `check-env`, `backup` and `smoke` scripts, `docs/DEPLOYMENT.md`. README no longer advertises a default admin password.
- DB name default is now `apna-basket` (was `abhishek-kirana-store`) and production requires `MONGO_URI`.

## Phase 5: Testing
- `npm test`: 32 backend tests (no DB) + 57 React tests. `npm --prefix backend run test:integration`: 30 database tests. `docs/TESTING.md` is the manual matrix (COD, Razorpay test mode, cancellation, admin, mobile, production).

## Frontend
- Checkout rewritten to the flow the rest of the app already expects: PIN service check, delivery slot, contact phone, saved addresses, server-side price quote, `payForOrder` with retry, success page state. My Orders uses the shared status labels and links to the order page. Admin tables tolerate missing dates/names.

## Needs your action
1. Run `npm --prefix backend run migrate:phase2` once on any existing database (dry run first).
2. Add the Razorpay webhook + `RAZORPAY_WEBHOOK_SECRET`; set `SMS_PROVIDER=msg91|twilio` (phone login is off in production with `console`).
3. Rotate any secrets that were ever shared; set up Atlas backups (M10+) and do a test restore.
4. Run the manual QA in `docs/TESTING.md` with real Razorpay test keys, SMTP and SMS: those external services could not be exercised from my sandbox.
5. Seed products use product-page URLs (not image files) as `imageUrl`; replace them with real images in the admin panel.

## Test caveat
Integration tests ran against a MongoDB-compatible emulator (FerretDB). 26/30 pass there. The 4 that fail are limits of the emulator, not of the code: it does not support the collation option the product list uses (3 tests) and does not make concurrent `$inc` atomic (parallel order numbers, 1 test). Run them once against real MongoDB or Atlas before launch.
