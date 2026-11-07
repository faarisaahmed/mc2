/* MasjidHub service worker: makes the site installable, opens it instantly and lets it work offline.
   - The site's own files: saved copy first, so the app opens at once even on a weak signal.
     Each time a page is opened, every file in SHELL is refreshed together in the background, so the
     next open shows the new version as one consistent set (never a new page with an old core.js).
     Anything not saved yet comes from the network.
   - Fonts and Leaflet from their CDNs: saved copy first, refreshed in the background.
   - Everything else (map tiles, Overpass, Nominatim) is never touched or stored.
   Bump VERSION when the list of files below changes. */
const VERSION = "v2";
const CACHE = `masjidhub-${VERSION}`;

const SHELL = [
  "./", "index.html", "prayer.html", "qibla.html", "calendar.html", "events.html", "planner.html",
  "community.html", "map.html", "join.html", "donate.html", "mosque.html",
  "assets/css/site.css",
  "assets/js/boot.js", "assets/js/data.js", "assets/js/core.js", "assets/js/planner.js",
  "assets/img/icon.svg", "assets/img/icon-192.png", "assets/img/icon-512.png", "assets/img/icon-maskable-512.png",
  "assets/img/apple-touch-icon.png", "manifest.webmanifest"
];

const CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"];
const REFRESH_EVERY = 10 * 60 * 1000;   // at most one background refresh of SHELL per 10 minutes

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

// Download every SHELL file, and only if all of them arrive, save them together.
let lastRefresh = 0;
async function refreshShell() {
  if (Date.now() - lastRefresh < REFRESH_EVERY) return;
  lastRefresh = Date.now();
  try {
    const res = await Promise.all(SHELL.map(u => fetch(u, { cache: "no-cache" })));
    if (!res.every(r => r.ok)) return;
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map((u, i) => cache.put(u, res[i])));
  } catch (err) { lastRefresh = 0; /* offline: try again on the next open */ }
}

// Site pages and files: the saved copy at once; the network only for files not saved yet.
async function siteFile(event) {
  const { request } = event, cache = await caches.open(CACHE);
  const nav = request.mode === "navigate";
  if (nav) event.waitUntil(refreshShell());
  // Pages are opened with ?ev=… or ?add=…; any saved copy of the same page will do.
  const saved = await cache.match(request, { ignoreSearch: nav });
  if (saved) return saved;
  try {
    const res = await fetch(request);
    if (res.ok && !nav) cache.put(request, res.clone());
    return res;
  } catch (err) {
    if (nav) return (await cache.match("index.html")) || Response.error();
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
  if (url.origin === self.location.origin) event.respondWith(siteFile(event));
  else if (CDN_HOSTS.includes(url.hostname)) event.respondWith(savedFirst(request));
  // Anything else goes straight to the network, unchanged.
});

// Tapping an adhan reminder brings MasjidHub to the front, or opens the prayer times page.
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const open = list.find(c => "focus" in c);
    return open ? open.focus() : self.clients.openWindow("prayer.html");
  }));
});
