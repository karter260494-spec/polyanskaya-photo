/* Polyanskaya_Photo — офлайн-кэш. Поднимите VERSION при каждом обновлении файлов. */
const VERSION = "pp-v2";
const CORE = [
  "./", "index.html", "style.css", "config.js", "manifest.json",
  "js/utils.js", "js/store.js", "js/sync.js", "js/ui.js", "js/charts.js", "js/forms.js", "js/views.js", "js/app.js",
  "booking/", "booking/index.html", "booking/booking.css", "booking/booking.js",
  "assets/icons/icon-180.png", "assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/favicon-32.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) =>
      Promise.all(CORE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // запросы к Worker/внешним сайтам не кэшируем
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) { e.waitUntil(net); return cached; }   // stale-while-revalidate
      const res = await net;
      if (res) return res;
      if (req.mode === "navigate") return (await cache.match("index.html")) || Response.error();
      return Response.error();
    })
  );
});
