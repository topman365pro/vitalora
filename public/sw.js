const SHELL_CACHE = "vitaloria-shell-v1";
const API_CACHE = "vitaloria-api-v1";
const SHELL_URLS = ["/", "/login", "/register", "/dashboard", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.pathname.startsWith("/api/readings") || url.pathname.startsWith("/api/chat/threads")) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(request);
          return cached ?? Response.error();
        }
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) {
        return cached;
      }

      const response = await fetch(request);

      if (url.origin === location.origin) {
        const cache = await caches.open(SHELL_CACHE);
        cache.put(request, response.clone());
      }

      return response;
    }),
  );
});
