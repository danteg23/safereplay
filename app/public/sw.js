const CACHE_NAME = "safereplay-shell-v24";
const scopeUrl = new URL(self.registration.scope);
const scopedUrl = (path = "") => new URL(path, scopeUrl).toString();
const SHELL = [
  "",
  "styles.css?v=20260711-1",
  "v2.css?v=20260712-1",
  "app.js?v=20260711-11",
  "icons.js?v=20260711-1",
  "time-zone.js",
  "youtube-player.js?v=20260710-1",
  "youtube-lab.js?v=20260711-1",
  "manifest.webmanifest",
  "icon.svg",
  "brand-mark.svg",
  "icon-512.png",
  "apple-touch-icon.png",
].map(scopedUrl);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  const scopePath = scopeUrl.pathname;
  if (url.pathname.startsWith(`${scopePath}api/`) || url.pathname.startsWith(`${scopePath}go/`)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => response ?? caches.match(scopedUrl()))),
  );
});
