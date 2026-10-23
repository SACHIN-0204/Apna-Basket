# Apna Basket V3 — Frontend deployment

The React frontend can be deployed as a static site/CDN independently of the API.

Build:
```bash
npm install
npm run build
```

Publish the generated `build/` directory.

Recommended production setup:
- Custom domain -> Cloudflare
- Static frontend -> CDN/static hosting
- `/api/*` -> always-on backend
- Cloudinary -> product/banner images

Do not proxy the whole site through the sleeping Render Web Service if the goal is to eliminate cold starts.
