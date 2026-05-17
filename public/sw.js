const SHELL_CACHE = "xlantis-live-shell-v2";
const ASSET_CACHE = "xlantis-live-assets-v2";
const STATIC_SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
  "/favicon.ico",
  "/xlantislogo.png",
  "/tvalogo.png",
  "/kvalogo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(STATIC_SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAssetRequest(request, url) {
  return (
    url.origin === self.location.origin &&
    (request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "image" ||
      request.destination === "font")
  );
}

async function cacheNavigation(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (await caches.match(request)) || Response.error();
  }
}

async function cacheStaticAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const networkResponse = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  return cached || (await networkResponse) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(cacheNavigation(request));
    return;
  }

  if (isStaticAssetRequest(request, url)) {
    event.respondWith(cacheStaticAsset(request));
  }
});
