# Cloudflare V3 setup

1. Add your domain to Cloudflare.
2. Change your registrar nameservers to the nameservers Cloudflare gives you.
3. For a static frontend, connect the frontend hosting to your custom domain.
4. Cache static assets aggressively.
5. Cache public product GET APIs only after verifying that no personalized data is returned.
6. Do not cache checkout, cart, login, order, payment or admin responses.
7. Keep DNS/proxy enabled for the public web/API hostname where appropriate.

For an initial low-cost setup, Cloudflare Free is enough for DNS/CDN basics. The backend itself should still be on an always-on plan.
