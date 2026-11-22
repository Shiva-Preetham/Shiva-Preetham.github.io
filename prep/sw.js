/* Offline support: pages you open once stay readable without a connection.
   Network first for this site (so GitHub edits show up), cache first for the CDN libraries and fonts. */
const CACHE = "field-manual-v1";
const SHELL = ["./", "index.html", "assets/app.css?v=1", "assets/app.js?v=1", "assets/widgets.js?v=1", "assets/icon.svg", "content/manifest.json", "manifest.webmanifest", "vendor/marked.min.js", "vendor/highlight.min.js", "vendor/mermaid.min.js", "vendor/hl-github.min.css", "vendor/hl-github-dark.min.css"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  if (same) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; }).catch(() => caches.match(req, { ignoreSearch: false }).then(r => r || caches.match(req, { ignoreSearch: true }))));
  } else if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
  }
});
