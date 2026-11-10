// Cache the public app shell and fingerprinted assets. Account data stays in Supabase.
const CACHE = "flightbook-shell-v1";
const scope = new URL(self.registration.scope);

async function cacheShell(cache, response) {
  const html = await response.clone().text();
  const assets = Array.from(html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g),
    ([, path]) => new URL(path, scope).href);
  const missing = await Promise.all(assets.map(async (url) => (await cache.match(url)) ? null : url));
  await cache.addAll(missing.filter(Boolean));
  await cache.put(scope.href, response);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const shell = await fetch(scope.href, { cache: "reload" });
    if (!shell.ok) throw new Error("Flightbook app shell is unavailable");
    const cache = await caches.open(CACHE);
    await cache.addAll([
      new URL("manifest.webmanifest", scope).href,
      new URL("icons/flightbook-192.png", scope).href,
      new URL("icons/flightbook-512.png", scope).href,
    ]);
    await cacheShell(cache, shell);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key.startsWith("flightbook-shell-") && key !== CACHE)
      .map((key) => caches.delete(key)))),
  ]));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== scope.origin) return;

  if (request.mode === "navigate" && url.pathname === scope.pathname) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) await cacheShell(cache, response.clone()).catch(() => {});
        return response;
      } catch {
        return (await cache.match(scope.href)) ?? Response.error();
      }
    })());
    return;
  }

  if (url.pathname.startsWith(new URL("assets/", scope).pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const existing = await cache.match(request);
      if (existing) return existing;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
