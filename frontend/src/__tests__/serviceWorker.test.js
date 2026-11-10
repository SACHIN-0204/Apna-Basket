/**
 * Runs the real public/service-worker.js against a small fake of the browser's
 * worker environment, and checks the rules that matter for a shop:
 * live data is never intercepted, offline shows the offline page, old caches are removed.
 */
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://shop.example';
const source = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'service-worker.js'), 'utf8');

const makeResponse = (body, status = 200, contentType = 'application/javascript') => ({
  body,
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
  clone() { return makeResponse(body, status, contentType); },
});
// Like a real browser cache: a relative URL such as "/offline.html" means that page on this site
const keyOf = (req) => (typeof req === 'string' ? new URL(req, ORIGIN).href : req.url);

const makeCaches = () => {
  const stores = new Map();
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return {
      match: async (req) => m.get(keyOf(req)),
      put: async (req, res) => { m.set(keyOf(req), res); },
      addAll: async (urls) => { urls.forEach((u) => m.set(`${ORIGIN}${u}`, makeResponse(`cached ${u}`))); },
      keys: async () => [...m.keys()].map((url) => ({ url })),
      delete: async (req) => m.delete(keyOf(req)),
    };
  };
  return {
    stores,
    open,
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    match: async (req) => { for (const m of stores.values()) if (m.has(keyOf(req))) return m.get(keyOf(req)); return undefined; },
  };
};

const boot = ({ fetchImpl } = {}) => {
  const handlers = {};
  const caches = makeCaches();
  const fetchMock = jest.fn(fetchImpl || (async () => makeResponse('network')));
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting: jest.fn(),
    clients: { claim: jest.fn() },
  };
  // eslint-disable-next-line no-new-func
  new Function('self', 'caches', 'fetch', 'URL', 'Response', source)(self, caches, fetchMock, URL, { error: () => makeResponse('error', 0) });

  const run = async (type, extra = {}) => {
    let waited;
    let responded;
    const event = { ...extra, waitUntil: (p) => { waited = p; }, respondWith: (p) => { responded = p; } };
    handlers[type](event);
    if (waited) await waited;
    return { intercepted: responded !== undefined, response: responded ? await responded : undefined };
  };
  const request = (urlPath, { method = 'GET', mode = 'cors' } = {}) => ({ url: `${ORIGIN}${urlPath}`, method, mode });
  return { caches, fetchMock, self, run, request };
};

test('install stores the offline page and takes over immediately', async () => {
  const sw = boot();
  await sw.run('install');
  expect(await sw.caches.match(`${ORIGIN}/offline.html`)).toBeDefined();
  expect(sw.self.skipWaiting).toHaveBeenCalled();
});

test('activate removes caches from older versions only', async () => {
  const sw = boot();
  await sw.run('install');
  await sw.caches.open('apna-basket-shell-v0');
  await sw.caches.open('some-other-app');
  await sw.run('activate');
  const names = await sw.caches.keys();
  expect(names).toEqual(['apna-basket-shell-v1']);
  expect(sw.self.clients.claim).toHaveBeenCalled();
});

describe('live data is never intercepted', () => {
  test.each([
    ['API reads (prices, stock, orders)', '/api/products?limit=24', {}],
    ['API writes (placing an order, payment)', '/api/orders', { method: 'POST' }],
    ['any non-GET request', '/shop', { method: 'PUT' }],
  ])('%s', async (_name, urlPath, opts) => {
    const sw = boot();
    const { intercepted } = await sw.run('fetch', { request: sw.request(urlPath, opts) });
    expect(intercepted).toBe(false);
  });

  test('other websites (Cloudinary, Razorpay) are left to the browser', async () => {
    const sw = boot();
    const { intercepted } = await sw.run('fetch', { request: { url: 'https://res.cloudinary.com/x/img.jpg', method: 'GET', mode: 'cors' } });
    expect(intercepted).toBe(false);
  });
});

describe('page navigation', () => {
  test('online: always the live page from the network', async () => {
    const sw = boot({ fetchImpl: async () => makeResponse('live page') });
    await sw.run('install');
    const { response } = await sw.run('fetch', { request: sw.request('/shop', { mode: 'navigate' }) });
    expect(response.body).toBe('live page');
  });

  test('offline: the friendly offline page instead of a browser error', async () => {
    const sw = boot({ fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
    await sw.run('install');
    const { response } = await sw.run('fetch', { request: sw.request('/cart', { mode: 'navigate' }) });
    expect(response.body).toBe('cached /offline.html');
  });

  test('a server error page is passed through, not hidden', async () => {
    const sw = boot({ fetchImpl: async () => makeResponse('server busy', 503) });
    await sw.run('install');
    const { response } = await sw.run('fetch', { request: sw.request('/', { mode: 'navigate' }) });
    expect(response.status).toBe(503);
  });
});

describe('static files', () => {
  test('built files are cached on first use and then served without the network', async () => {
    const sw = boot();
    const req = sw.request('/static/js/main.abc123.js');
    const first = await sw.run('fetch', { request: req });
    expect(first.response.body).toBe('network');
    expect(sw.fetchMock).toHaveBeenCalledTimes(1);

    const second = await sw.run('fetch', { request: req });
    expect(second.response.body).toBe('network');
    expect(sw.fetchMock).toHaveBeenCalledTimes(1); // came from cache
  });

  test('failed responses are never cached', async () => {
    const sw = boot({ fetchImpl: async () => makeResponse('missing', 404) });
    const req = sw.request('/static/js/gone.js');
    await sw.run('fetch', { request: req });
    await sw.run('fetch', { request: req });
    expect(sw.fetchMock).toHaveBeenCalledTimes(2);
  });

  test('a web page answering for a missing script is never cached as that script', async () => {
    const sw = boot({ fetchImpl: async () => makeResponse('<html>app shell</html>', 200, 'text/html; charset=utf-8') });
    const req = sw.request('/static/js/main.deleted.js');
    await sw.run('fetch', { request: req });
    await sw.run('fetch', { request: req });
    expect(sw.fetchMock).toHaveBeenCalledTimes(2); // not served from cache the second time
  });

  test('images show instantly from cache but refresh in the background', async () => {
    let version = 'old';
    const sw = boot({ fetchImpl: async () => makeResponse(version) });
    const req = sw.request('/rice.jpeg');
    expect((await sw.run('fetch', { request: req })).response.body).toBe('old');

    version = 'new'; // the store replaced the picture
    expect((await sw.run('fetch', { request: req })).response.body).toBe('old'); // instant, from cache
    await new Promise((r) => setTimeout(r, 0));
    expect((await sw.run('fetch', { request: req })).response.body).toBe('new'); // refreshed behind the scenes
  });

  test('the asset cache is capped so it cannot grow forever', async () => {
    const sw = boot();
    for (let i = 0; i < 95; i++) await sw.run('fetch', { request: sw.request(`/static/js/chunk.${i}.js`) });
    const assets = sw.caches.stores.get('apna-basket-assets-v1');
    expect(assets.size).toBeLessThanOrEqual(80);
    expect(assets.has(`${ORIGIN}/static/js/chunk.94.js`)).toBe(true);  // newest kept
    expect(assets.has(`${ORIGIN}/static/js/chunk.0.js`)).toBe(false);  // oldest dropped
  });
});
