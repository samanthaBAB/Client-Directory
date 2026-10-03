// Minimal offline fallback for BAB Tasker. This app always needs a live
// network connection to show real data, so there's no point caching pages —
// the only job here is to replace the browser/WebView's bare connection-error
// screen with offline.html when a page navigation fails outright (the
// App Store rejection reason this exists for: "blank screen when offline").
const OFFLINE_URL = "/offline.html";
const CACHE_NAME = "bab-tasker-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL))
    )
  );
});
