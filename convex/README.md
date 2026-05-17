# Convex setup

This project stores streamers in the `streamers` table and user submissions in the `streamerRequests` table. Convex is the runtime source of truth for both tables.

Useful commands:

```bash
npx convex dev
```

Set `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` in `.env`. Set `ADMIN_PASSWORD` to access `/admin/streamers` and `/admin/requests`.
