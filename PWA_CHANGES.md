# PWA: install prompt, offline page, installable icons

## What customers see

- **Android / Chrome / Edge:** a green "Order faster with the app" banner with an **Install** button.
  It opens the browser's own install dialog, and the app lands on the home screen.
- **iPhone / iPad (Safari):** the same banner with **How to install**, which shows the three steps
  (Share, Add to Home Screen, Add). Apple gives websites no install button, so steps are all that is possible.
- **Offline:** if the phone has no connection, a friendly "You are offline" page with *Try again* and
  *Call the store* replaces the browser's error page.
- **Home-screen icon** that fills Android's round / squircle shapes properly (new maskable icons), and
  long-press shortcuts: Shop, My cart, My orders.

## When the banner appears (so it does not nag)

Only when **all** of these are true:
- the browser says the app can be installed (or it is iPhone Safari), and it is not already installed;
- the customer has shown interest: a second visit, something in the cart, or a finished order.
  Never on the very first page view with an empty cart;
- they have not tapped the close button (or declined the browser dialog) in the last 30 days;
- they are not on checkout, login, register or admin pages.

## What the service worker does, and does not do

- It **never** touches `/api/` requests or anything that is not a GET: prices, stock, carts, logins,
  orders and payments are always live from the server.
- Page loads always go to the network first. It only steps in when the network fails.
- Built files in `/static/` (their names change on every release) are kept for speed; pictures are shown
  from cache and refreshed in the background. The cache is capped at 80 files.
- Other websites (Cloudinary images, Razorpay) are left alone.
- Registered in production builds only, so development is never confused by stale files.
- To drop everything a worker cached, change `VERSION` at the top of `frontend/public/service-worker.js`.

## Server changes (backend/index.js, production only)

- `service-worker.js`, `manifest.json`, `offline.html` and `index.html` are sent with `no-cache`, so a new
  release is noticed straight away.
- A missing `/static/...` file or unknown `/api/...` path now returns a real **404**. Before, both returned
  the app page with status 200, which made an outdated script address look like valid JavaScript.
- If the frontend is hosted separately (Cloudflare Pages / Netlify), `frontend/public/_headers` gives
  the same no-cache rule for those files.

## Tests

`npm test` in `frontend/`: 39 tests, 28 of them new:
- 14 for the install banner (when it shows and hides, dismissal for 30 days, event fired before mount,
  accepted / declined, iPhone Safari vs other iPhone browsers, installed app, checkout / login);
- 14 that run the real `service-worker.js` against a fake browser (never intercepts the API, offline page,
  cache cleanup between versions, cache cap, failed and HTML responses never cached).

Also checked against the real backend in production mode: all four icons, manifest and worker are served
with the right content types and cache headers, and the 404 behaviour above.

## Please check on a real phone before launch

I could not run a real browser here, so these are untested:
1. Chrome on Android: the banner appears after a second visit (or with an item in the cart), Install works,
   and the icon looks right.
2. iPhone Safari: the steps banner appears and "Add to Home Screen" shows the icon.
3. Chrome DevTools > Application > Manifest should list no errors, and "Installability" should be green.
The site must be served over **HTTPS** (your Render / Cloudflare domain already is) for any of this to work.
