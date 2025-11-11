// SW v13 (SPA + static)
const CACHE = "elarin-static-v13";
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/floater.css",
  "/styles.css",
  "/app.js",
  "/modules/settings.js",
  "/modules/textRotation.js",
  "/modules/overlay.js",
  "/modules/auth.js",
  "/modules/billing.js",
  "/modules/news.js",
  // Pretty URL entries to work offline
  "/about/",
  "/login/",
  "/account/",
  "/signup/",
  "/contact/",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Always bypass SW for sprites and images
  if (
    url.pathname.startsWith("/assets/") ||
    e.request.destination === "image"
  ) {
    e.respondWith(fetch(new Request(e.request, { cache: "no-store" })));
    return;
  }

  // Never cache API
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(new Request(e.request, { cache: "no-store" })));
    return;
  }

  const dest = e.request.destination;

  // Network-first for HTML/JS/CSS with SPA fallback
  if (dest === "document" || dest === "script" || dest === "style") {
    e.respondWith(
      fetch(new Request(e.request, { cache: "no-store" }))
        .catch(() => caches.match(e.request))
        .then(
          (res) =>
            res ||
            (dest === "document" ? caches.match("/index.html") : undefined)
        )
    );
    return;
  }

  // Cache-first for other assets
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res.ok)
            caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
    )
  );
});
