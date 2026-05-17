Xlantis Live is a Next.js app that shows curated Kick and YouTube streamers, backed by Convex.

## Getting Started

First, run the local development servers:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Streamer data and streamer requests come from Convex. Set these environment variables before running the app:

```env
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
ADMIN_PASSWORD=your-admin-password
```

That single command starts both Convex and the Next.js frontend. To run only the frontend:

```bash
npm run dev:next
```

Admin pages:

- `/admin/streamers`
- `/admin/requests`

## Build

```bash
npm run lint
npm run build
```
