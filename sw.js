/* MasjidHub service worker: makes the site installable and lets it open offline.
   - The site's own files: network first, so online visitors always get the latest version;
     the saved copy is used only when the network fails.
   - Fonts and Leaflet from their CDNs: saved copy first, refreshed in the background.
   - Everything else (map tiles, Overpass, Nominatim) is never touched or stored.
   Bump VERSION when the list of files below changes. */
const VERSION = "v1";
const CACHE = `masjidhub-${VERSION}`;

const SHELL = [
  "./", "index.html", "prayer.html", "qibla.html", "calendar.html", "events.html", "planner.html",
  "community.html", "map.html", "join.html", "donate.html", "mosque.html",
  "assets/css/site.css",
  "assets/js/boot.js", "assets/js/data.js", "assets/js/core.js", "assets/js/planner.js",
  "assets/img/icon.svg", "assets/img/icon-192.png", "manifest.webmanifest"
];

const CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("masjidhub-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    // Pages are opened with ?age=… or ?add=…; any saved copy of the same page will do.
    const saved = await cache.match(request, { ignoreSearch: request.mode === "navigate" });
    if (saved) return saved;
    if (request.mode === "navigate") return (await cache.match("index.html")) || Response.error();
    throw err;
  }
}

async function savedFirst(request) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(request);
  const fresh = fetch(request).then(res => {
    if (res.ok || res.type === "opaque") cache.put(request, res.clone());
    return res;
  }).catch(err => { if (saved) return saved; throw err; });
  return saved || fresh;
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) event.respondWith(networkFirst(request));
  else if (CDN_HOSTS.includes(url.hostname)) event.respondWith(savedFirst(request));
  // Anything else goes straight to the network, unchanged.
});
