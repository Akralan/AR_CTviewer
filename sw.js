/*
 * Service worker of the Quest PWA: the shell (pages, scripts, styles, icons)
 * network first, the cache only when the network fails. So a redeploy shows
 * up at the next launch, and the app still opens offline.
 *
 * Models are never cached: a GLB is tens of megabytes of medical imaging.
 */
const CACHE = "ctviewer-shell-v1";
const SHELL = /\.(?:html|js|css|png|svg|webmanifest)$/;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const shell = request.mode === "navigate" || SHELL.test(url.pathname);
  if (!shell || /\/(?:out|models)\//.test(url.pathname)) return; // straight to the network

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => (await caches.match(request)) ?? Response.error()),
  );
});
