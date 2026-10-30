/* Service worker: lets the app open offline. Change CACHE name (v1 -> v2) whenever you update files so phones refresh. */
const CACHE = "expense-tracker-v7";
const FILES = ["./", "index.html", "manifest.webmanifest", "app-icon-192.png", "app-icon-512.png", "app-icon-180.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    // own files: try the network first (so updates arrive), fall back to the saved copy when offline
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
  } else if (u.hostname === "cdnjs.cloudflare.com") {
    // Excel library: saved after the first online use
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })));
  }
});
