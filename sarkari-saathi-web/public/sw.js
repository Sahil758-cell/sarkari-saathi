// Service worker: lets Sarkari Saathi open when the network is poor or gone.
//  - pages and static files: network first, the last good copy as the fallback
//  - scheme data from the API (details, search, latest): same, so schemes the
//    user already looked at still open offline
// Live search (/search/live), the assistant, report and admin calls are never cached.

const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const DATA = `data-${VERSION}`;
const MAX_DATA_ENTRIES = 80;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, DATA]);
      for (const key of await caches.keys()) {
        if (!keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

async function networkFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      if (limit) {
        const keys = await cache.keys();
        for (const old of keys.slice(0, Math.max(0, keys.length - limit))) await cache.delete(old);
      }
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

function isCacheableApi(url) {
  const path = url.pathname;
  if (path.startsWith("/search/live") || path.startsWith("/admin")) return false;
  return path.startsWith("/schemes/") || path === "/search";
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    // Next.js build files and pages. Never serve a stale page when the network works.
    event.respondWith(
      networkFirst(request, PAGES).catch(async () => {
        const home = await caches.match("/");
        return home ?? Response.error();
      })
    );
    return;
  }

  if (isCacheableApi(url)) {
    event.respondWith(networkFirst(request, DATA, MAX_DATA_ENTRIES));
  }
});
