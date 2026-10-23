# Apna Basket — Performance V3

## Goal
Remove the Render Free cold-start from normal customer page loads by separating the static React frontend from the API.

## Recommended production architecture

Customer
  -> Cloudflare DNS/CDN
      -> Static React frontend (CDN)
      -> /api/* -> always-on Node/Express backend
                         -> MongoDB
                         -> Cloudinary

### Why
A static React site does not need a sleeping Node server just to render the homepage.
The backend can remain focused on API/database work.

## Deployment
1. Build the frontend with `npm run build`.
2. Deploy `frontend/build` to a static host/CDN.
3. Put the custom domain behind Cloudflare.
4. Deploy `backend` to an always-on Render paid instance or another production Node host.
5. Set `CLIENT_URL` on the backend.
6. Configure CORS for the production frontend origin.
7. Point API requests to the production backend URL (or use Cloudflare routing/reverse proxy for `/api/*`).
8. Never put MongoDB credentials, JWT secrets, payment secrets, or API secrets in the frontend.

## Caching
Safe candidates:
- JS/CSS bundles
- Cloudinary images
- public product/category GET responses for short periods

Do not cache:
- login/session responses
- cart
- checkout
- orders
- payment
- profile
- admin APIs

## Reliability
- Use `/health` for health checks.
- Keep database connection pooling enabled.
- Use an always-on backend for real customers.
- Add a second backend instance only after traffic/load testing shows the need.

## Expected result
The homepage can be served directly from the CDN without waiting for Node or MongoDB to wake up.
The first API request still depends on backend/database latency, but the customer should see the application shell immediately.
