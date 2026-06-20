const CACHE_NAME = "aegisdata-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/logo.svg",
  "/favicon.svg",
  "/manifest.json"
];

// Install Service Worker and cache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Intercept requests and serve from cache or network
self.addEventListener("fetch", (event) => {
  // Only handle HTTP/HTTPS requests (ignores chrome extensions, web sockets)
  if (!event.request.url.startsWith("http")) {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Skip caching API requests or non-GET requests
  if (
    event.request.method !== "GET" ||
    requestUrl.pathname.includes("/api/") ||
    requestUrl.pathname.includes("/ws")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Cache basic and cors response types with status 200
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            (networkResponse.type !== "basic" && networkResponse.type !== "cors")
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch((err) => {
              console.warn("SW failed to cache asset:", err);
            });
          }).catch((err) => {
            console.warn("SW failed to open cache:", err);
          });

          return networkResponse;
        })
        .catch((err) => {
          console.error("SW network fetch failed for:", event.request.url, err);
          // Fallback to offline index.html if navigating page
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          // For static resources, rethrow so browser fails natively rather than SW intercept erroring
          throw err;
        });
    })
  );
});
