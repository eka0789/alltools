/*
 * AllTools service worker — deliberately conservative.
 *
 * Strategy:
 * - Navigations (pages): network-first, fall back to the cached page, then
 *   to a minimal offline notice. Directory content changes; serving stale
 *   pages silently would be worse than an honest offline screen.
 * - Static assets (/_next/static, icons): cache-first — they are
 *   content-hashed by the framework, so a cached hit is always correct.
 *
 * Everything else (API routes, sitemaps, feeds) bypasses the SW entirely.
 */
const VERSION = "alltools-v1";
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — AllTools</title><style>body{font-family:system-ui,sans-serif;background:#0a0a0c;color:#fafafa;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:1rem}main{max-width:24rem}h1{font-size:1.25rem}p{color:#a1a1aa;font-size:.875rem;line-height:1.6}button{margin-top:1rem;background:#4f46e5;color:#fff;border:0;border-radius:.5rem;padding:.5rem 1rem;font-size:.875rem;cursor:pointer}</style></head><body><main><h1>You're offline</h1><p>AllTools needs a connection to search the live catalog. Your saved shortlist is stored in this browser and will still be here when you reconnect.</p><button onclick="location.reload()">Try again</button></main></body></html>`;

self.addEventListener("install", (event) => {
  // No precache list: the install must never block an update waiting on
  // network fetches. skipWaiting is set by the controller message below.
  self.addEventListener("message", (e) => {
    if (e.data === "skip-waiting") self.skipWaiting();
  });
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never touch dynamic data or admin surfaces.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  // Content-hashed build output + icons: immutable, cache-first.
  if (url.pathname.startsWith("/_next/static/") || /^\/(icon-|apple-touch-icon)/.test(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return hit ?? Response.error();
        }
      }),
    );
    return;
  }

  // Navigations: network-first with an honest offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          const hit = await cache.match(req);
          if (hit) return hit;
          return new Response(OFFLINE_HTML, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      })(),
    );
  }
});
