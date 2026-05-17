# PRD: Live Streamer Status Web App

## 1. Product Goal

Build a fast, clean web app that shows which curated streamers are currently live on **YouTube** and **Kick**, with accurate near-real-time status updates every **30–60 seconds**.

Important constraint: the streamer roster lives in Convex and is read server-side by the app. A purely client-only frontend is **not recommended** because YouTube/Kick API keys or tokens must not be exposed in the browser. Best fit: **Next.js App Router with SSR/Server Components plus Route Handlers** for API calls, caching, and secret protection. Next.js supports server-side Route Handlers for this kind of internal API layer. ([Next.js][1])

---

# 2. Users

## Primary Users

### Regular Viewer

Wants to quickly see:

* Who is live now
* Platform: YouTube or Kick
* Stream title
* Thumbnail
* Viewer count
* Category/game
* Stream start time
* Direct watch link

### Admin

Manages the streamer list:

* View streamers stored in Convex
* View streamer requests stored in Convex
* Store platform-specific IDs in Convex

---

# 3. Core Features

## MVP Features

### Live Stream Dashboard

Primary page shows only live streamers first.

Each live card should show:

* Streamer name
* Platform badge: YouTube / Kick
* Stream title
* Thumbnail
* Viewer count
* Category/game if available
* Started at
* “Watch Now” button

### Offline Section

Optional collapsed section:

* Streamer name
* Platform
* Offline indicator
* Last checked time

### Auto Refresh

* Refresh every 30–60 seconds
* Use cached API response
* Avoid calling platform APIs directly from every user browser

### Admin Streamer List

For MVP, this is stored in the Convex `streamers` table.

Example:

```ts
{
  id: "1",
  name: "Streamer Name",
  platform: "youtube",
  youtubeChannelId: "UCxxxx",
  kickSlug: null,
  isActive: true
}
```

Runtime source: Convex `streamers` table.

---

# 4. Success Metrics

| Metric                              | Target                          |
| ----------------------------------- | ------------------------------- |
| Live status accuracy                | 95%+                            |
| Dashboard load time                 | < 2 seconds                     |
| Status refresh delay                | 30–60 seconds                   |
| Failed API calls handled gracefully | 100%                            |
| Mobile usability                    | Fully responsive                |
| Admin update friction               | Add/edit streamer in < 1 minute |

---

# 5. Out of Scope for MVP

* User-added streamers
* User accounts for regular viewers
* Mobile app
* Push notifications
* Historical analytics
* Embedded player
* Personalized recommendations
* Chat integration

---

# 6. System Architecture

## Recommended Architecture

The reliable architecture should be:

```txt
User Browser
   |
   v
Next.js App Router UI (SSR / Server Components)
   |
   v
Next.js Route Handler: /api/status
   |
   v
Cache Layer
   |
   v
YouTube Data API + Kick Developer API
```

## Why This Is Needed

Calling YouTube/Kick APIs directly from the browser creates problems:

* API keys can leak
* Rate limits become harder to control
* Every user refresh triggers external API calls
* Caching becomes weak
* Kick/YouTube request failures affect UX directly

So the better interpretation is:

> No separate Express/FastAPI backend. Use Next.js itself as the server boundary for SSR and Route Handlers.

YouTube Data API v3 supports searching/listing YouTube resources, including live-related video metadata. ([Google for Developers][2]) Kick has an official developer API portal/public API documentation for developer integrations. ([Kick Help Center][3])

---

# 7. Data Flow

## Page Load Flow

```txt
1. User opens dashboard
2. Next.js renders the page with the streamer roster from Convex
3. Frontend or server component calls /api/status
4. /api/status checks cache
5. If cache is fresh, return cached live/offline data
6. If stale, refresh platform statuses
7. Normalize YouTube + Kick responses
8. Return unified streamer status list
9. Frontend renders live streamers first
```

## Auto Refresh Flow

```txt
Every 30–60 seconds:
Frontend calls /api/status
Route handler returns cached/refreshed data
UI updates without full page reload
```

---

# 8. Data Model

## Streamer

```ts
type Streamer = {
  id: string;
  displayName: string;
  platform: "youtube" | "kick";

  youtubeChannelId?: string;
  kickSlug?: string;

  avatarUrl?: string;
  isActive: boolean;
};
```

## Cached Stream Status

```ts
type StreamStatus = {
  streamerId: string;
  platform: "youtube" | "kick";

  isLive: boolean;
  title?: string;
  thumbnailUrl?: string;
  viewerCount?: number;
  category?: string;
  startedAt?: string;
  streamUrl?: string;

  lastCheckedAt: string;
  error?: string;
};
```

## Unified API Response

```ts
type StatusResponse = {
  live: StreamStatus[];
  offline: StreamStatus[];
  lastUpdatedAt: string;
};
```

---

# 9. API Routes

## Public Routes

### `GET /api/status`

Returns all streamer statuses.

Response:

```json
{
  "live": [],
  "offline": [],
  "lastUpdatedAt": "2026-05-17T12:00:00Z"
}
```

### `GET /api/streamers`

Returns curated streamer list from Convex.

Useful for admin/dashboard debugging.

---

## Admin Routes

For MVP, protect with a simple admin password/session.

### `POST /api/admin/streamers`

Add streamer.

### `PATCH /api/admin/streamers/:id`

Update streamer.

### `DELETE /api/admin/streamers/:id`

Disable/remove streamer.

---

# 10. Platform Integration

## YouTube

Recommended approach:

1. Store the **YouTube Channel ID**
2. Use YouTube Data API to check live streams for that channel
3. Fetch video details for live stream metadata
4. Normalize response

YouTube’s `video` resource represents YouTube videos and supports the `videos.list` method. ([Google for Developers][4])

Potential fields:

* `snippet.title`
* `snippet.thumbnails`
* `liveStreamingDetails.actualStartTime`
* `liveStreamingDetails.concurrentViewers`
* stream URL from video ID

Important: YouTube API behavior around live viewer counts can be inconsistent, so treat viewer count as optional.

---

## Kick

Recommended approach:

1. Store Kick channel slug/account name
2. Call Kick channel/livestream endpoint
3. Check `is_live` or livestream object
4. Normalize response

Kick has an official developer portal and public API documentation. ([Kick][5])

Potential fields:

* live status
* stream title
* viewer count
* category
* thumbnail
* start time
* channel URL

---

# 11. Caching Strategy

## MVP Cache

Use one of these:

### Option A: In-memory cache

Good for local MVP.

Problem: not reliable across serverless deployments.

### Option B: Vercel KV / Upstash Redis

Optional if stronger cache persistence is needed.

Store:

```txt
stream_status_cache
TTL: 30–60 seconds
```

Use `last_checked_at` to avoid unnecessary refreshes.

---

# 12. Recommended Tech Stack

## Frontend

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Query or SWR
* Zustand only if state becomes more complex

## Backend Layer

* Next.js SSR / Server Components
* Next.js Route Handlers
* Server-side API calls only
* Environment variables for API keys

## Database

Best options:

### Primary Database

* Convex `streamers` table
* Convex `streamerRequests` table

### Cache

* Optional in-memory cache for local/dev
* Upstash Redis / Vercel KV only if persistent cache is needed

## Deployment

* Vercel
* Environment variables:

  * `YOUTUBE_API_KEY`
  * `KICK_CLIENT_ID`
  * `KICK_CLIENT_SECRET`
  * `REDIS_URL` (optional if using Redis)

---

# 13. Folder Structure

```txt
src/
  app/
    page.tsx
    admin/
      page.tsx
    api/
      status/
        route.ts
      streamers/
        route.ts
      admin/
        streamers/
          route.ts

  components/
    streamer-card.tsx
    live-grid.tsx
    offline-section.tsx
    platform-badge.tsx
    refresh-indicator.tsx

  lib/
    platforms/
      youtube.ts
      kick.ts
      normalize.ts
    cache/
      redis.ts
      memory-cache.ts
    db/
      streamers.ts
    utils.ts

  types/
    streamer.ts
    status.ts

  convex/
    schema.ts
    streamers.ts
    streamerRequests.ts
```

---

# 14. Implementation Plan

## Phase 1: Static MVP

* Create Next.js app
* Add dark streaming-style UI
* Add streamer data in Convex
* Build live/offline cards
* Build refresh indicator
* Use fake API response

## Phase 2: YouTube Integration

* Store YouTube channel IDs
* Create `lib/platforms/youtube.ts`
* Fetch live status
* Normalize data
* Handle API failures

## Phase 3: Kick Integration

* Store Kick slugs
* Create `lib/platforms/kick.ts`
* Fetch live status
* Normalize Kick response

## Phase 4: Cache Layer

* Add Redis/Upstash cache
* Cache `/api/status` result for 30–60 seconds
* Prevent every user from triggering platform API calls

## Phase 5: Admin

* Add simple admin login if write endpoints are needed later
* Add simple admin login
* View Convex streamer records
* View Convex streamer request records

## Phase 6: Production Polish

* Loading skeletons
* Error states
* Last updated timestamp
* Mobile responsive layout
* Basic analytics
* Rate-limit logging

---

# 15. Key Challenges & Solutions

## Challenge: YouTube API Quota

Solution:

* Cache aggressively
* Poll every 60 seconds, not every user request
* Store channel IDs directly
* Avoid repeated channel lookup by username

## Challenge: API Key Exposure

Solution:

* Never call APIs directly from browser
* Use Next.js Route Handlers
* Store keys in `.env`

## Challenge: Accurate Live Detection

Solution:

* Use platform-specific live endpoints
* Normalize statuses
* Add fallback checks
* Show `lastCheckedAt`

## Challenge: Kick API Changes

Solution:

* Isolate Kick logic in `lib/platforms/kick.ts`
* Keep response normalization separate
* Add safe parsing with Zod

## Challenge: Viewer Count Missing

Solution:

* Make viewer count optional
* Show “Viewers unavailable” instead of breaking UI

## Challenge: Channel ID Resolution

Solution:

* Admin should add YouTube Channel ID, not handle
* Add a helper tool later to resolve handles to channel IDs

---

# 16. UX Recommendation

Primary dashboard:

```txt
[Live Now]

Card:
Thumbnail
LIVE badge
Streamer Name
Platform Badge
Title
Viewer Count
Category
Started 42 min ago
Watch Now
```

Offline section:

```txt
[Offline Streamers]
Collapsed by default
```

Refresh indicator:

```txt
Updated 18 seconds ago · Auto-refreshing every 60s
```

---

# 17. Optional Nice-to-Haves

Keep these after MVP:

* Browser push notifications
* Search streamers
* Filter by platform
* Filter by category/game
* Embed player preview
* Historical live stats
* Multi-language support
* “Recently live” section
* PWA/mobile app later

---

# Final Recommendation

Build this as a **Next.js-only app with SSR/Server Components and Route Handlers**, not a separate backend. Use:

* **Next.js + TypeScript**
* **Tailwind + shadcn/ui**
* **SWR/TanStack Query**
* **Convex for streamer and request storage**
* **Upstash Redis for 30–60 sec cache**
* **YouTube Data API v3**
* **Kick Developer API**

This gives you the frontend-heavy simplicity you want while still protecting secrets, respecting rate limits, and keeping live status reliable, without introducing Supabase or a separate backend service.

[1]: https://nextjs.org/?utm_source=chatgpt.com "Next.js by Vercel - The React Framework"
[2]: https://developers.google.com/youtube/v3/docs?utm_source=chatgpt.com "API Reference | YouTube Data API"
[3]: https://help.kick.com/en/collections/5494074-developers-api?utm_source=chatgpt.com "Developers & API"
[4]: https://developers.google.com/youtube/v3/docs/videos?utm_source=chatgpt.com "Videos | YouTube Data API"
[5]: https://dev.kick.com/?utm_source=chatgpt.com "KICK Developer"
