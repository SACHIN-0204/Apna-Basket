# Apna Basket — Performance V1

## What changed
- Added HTTP compression middleware to the Express backend (when applicable).
- Added conservative public GET caching headers while excluding personalized/auth-style API paths.
- Added React lazy loading for obvious page/screen imports where the app structure allowed a safe automatic conversion.
- Added `compression` to the backend package dependencies when Express is present.

## Important next steps
1. Run `npm install` in the backend/frontend directories as appropriate.
2. Test login, cart, checkout, orders, admin and payment flows.
3. Deploy to Render.
4. Keep personalized endpoints uncached.
5. Move hero/banner images to optimized Cloudinary assets if they are still remote originals.
6. Next optimization should be product API pagination + MongoDB indexes.

## Render
For production traffic, use an always-on instance rather than the Free Web Service if cold starts are affecting customers.
