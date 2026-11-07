const CACHE_NAME = "isikhnas-vaksinasi-shell-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./install.html",
  "./field-ui.js",
  "./login.css",
  "./styles.css",
  "./app.js",
  "./backend.js",
  "./coverage-map.js",
  "./supabase-config.js",
  "./login.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET") return;
  if (url.hostname.endsWith("esm.sh")) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      try { const response = await fetch(request); if (response.ok) await cache.put(request, response.clone()); return response; }
      catch { return cached || new Response("Offline dependency unavailable", { status: 503 }); }
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  const scope = new URL("./", self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;

  if (request.mode === "navigate") {
    const fallback = url.pathname.endsWith("/install.html") ? "./install.html" : "./index.html";
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(fallback, copy));
      return response;
    }).catch(() => caches.match(fallback) || caches.match("./index.html")));
    return;
  }

  const areaDataPath = new URL("./data/wilayah.gz.b64", self.registration.scope).pathname;
  if (url.pathname === areaDataPath) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      const fresh = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
      return cached || fresh;
    }));
    return;
  }

  if (APP_SHELL.some(path => new URL(path, self.registration.scope).pathname === url.pathname)) {
    event.respondWith(caches.match(request).then(cached => {
      const fresh = fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => cached);
      return cached || fresh;
    }));
  }
});
