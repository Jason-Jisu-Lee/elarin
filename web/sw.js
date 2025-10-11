// SW v4
const CACHE = "elarin-static-v4";
const ASSETS = [
  "/", "/index.html", "/styles.css", "/floater.css",
  "/app.bundle.js", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
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
  if (url.origin !== self.location.origin) return;          // same-origin only

  if (url.pathname.startsWith("/api/")) {                   // never cache API
    e.respondWith(fetch(new Request(e.request, { cache: "no-store" })));
    return;
  }

  // cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});
