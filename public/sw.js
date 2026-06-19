const CACHE_NAME = "gargut-hero-cache-v2";
const SUPABASE_PATTERN = /supabase\.co/;
const VIDEO_EXT = /\.(mp4|mov|webm|ogg)$/i;
const MAX_CACHE_ITEMS = 5;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function pruneCache(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_CACHE_ITEMS) {
    const toDelete = keys.slice(0, keys.length - MAX_CACHE_ITEMS);
    await Promise.all(toDelete.map((req) => cache.delete(req)));
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (SUPABASE_PATTERN.test(url.hostname) && VIDEO_EXT.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (
              !networkResponse ||
              networkResponse.status !== 200 ||
              (networkResponse.type !== "basic" &&
                networkResponse.type !== "cors")
            ) {
              return networkResponse;
            }

            const responseClone = networkResponse.clone();
            event.waitUntil(
              caches
                .open(CACHE_NAME)
                .then(async (cache) => {
                  await cache.put(event.request, responseClone);
                  await pruneCache(cache);
                })
            );

            return networkResponse;
          })
          .catch((err) => {
            console.error("[SW] Fetch failed for video:", err);
            throw err;
          });
      })
    );
  }
});
