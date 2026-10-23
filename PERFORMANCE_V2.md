# Apna Basket — Performance V2

## Included
- Product API supports bounded server-side pagination while preserving the old array response when no pagination is requested.
- Redux product loading now requests at most 60 products initially and suppresses duplicate fetches for 30 seconds.
- Product cards use responsive Cloudinary `srcSet` widths and async image decoding.
- Reduced remote Unsplash hero image width/quality.
- MongoDB connection pool settings added for steadier production performance.
- Product indexes support active/newest listings and text search.
- Existing authentication, cart, checkout and order endpoints were left uncached/private.

## Important deployment notes
- Run `npm install` after replacing the project.
- Test login, cart, checkout, orders and admin flows before production.
- Render Free can still cold-start; an always-on backend is required to eliminate that delay.
- For the next stage, move the frontend to static/CDN hosting and put Cloudflare in front of the domain.
