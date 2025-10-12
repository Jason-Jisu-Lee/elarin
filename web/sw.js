// SW v7
const CACHE = "elarin-static-v7";
const PRECACHE = [
  "/", "/index.html",
  "/manifest.webmanifest",
  "/icon-192.png", "/icon-512.png",
  "/floater.css", "/styles.css"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
});

self.addEventListener("activate", e => {
  e.waitUntil(Promise.all([
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ),
    self.clients.claim()
  ]));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(new Request(e.request, { cache: "no-store" })));
    return;
  }

  // Always get latest for HTML/JS/CSS. Fallback to cache if offline.
  const dest = e.request.destination;
  if (dest === "document" || dest === "script" || dest === "style") {
    e.respondWith(
      fetch(new Request(e.request, { cache: "no-store" }))
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for other static assets
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});
