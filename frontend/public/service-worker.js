/* Kusora service worker.
 *
 * Deliberately small and safe for a shop that takes real orders:
 *  - It NEVER touches /api/ requests or anything that is not a GET, so prices, stock,
 *    carts, logins and payments always come live from the server.
 *  - Page loads always try the network first. If the phone is offline, a friendly
 *    offline page is shown instead of the browser's error.
 *  - Built files under /static/ have a unique name per release, so they are kept for speed.
 *
 * Bump VERSION to throw away everything cached by an older worker.
 */
const VERSION = "v1";
const SHELL_CACHE = `kusora-shell-${VERSION}`;
const ASSET_CACHE = `kusora-assets-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/logo192.png", "/logo-navbar.png"];
const MAX_ASSETS = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== SHELL_CACHE && n !== ASSET_CACHE).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

// Keep the asset cache from growing with every release: drop the oldest entries
const trim = async (cache) => {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_ASSETS; i++) await cache.delete(keys[i]);
};

const cacheFirst = async (request) => {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  // Only keep a real file. A web page answering for a missing script must never be cached as that script.
  const type = (response && response.headers && response.headers.get && response.headers.get("content-type")) || "";
  if (response && response.status === 200 && !type.includes("text/html")) {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
};

// Show the cached copy immediately and refresh it in the background
const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      if (response && response.status === 200) {
        await cache.put(request, response.clone());
        await trim(cache);
      }
      return response;
    })
    .catch(() => undefined);
  return hit || (await refresh) || Response.error();
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Cloudinary images, Razorpay, fonts: leave to the browser
  if (url.pathname.startsWith("/api/")) return; // live data only
  if (url.pathname === "/service-worker.js") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error())
    );
    return;
  }

  if (url.pathname.startsWith("/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (/\.(png|svg|ico|webp|jpe?g|gif|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
