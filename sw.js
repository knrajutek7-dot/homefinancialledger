const CACHE_NAME = 'knr-ledger-v3';
const SHELL = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './logo-wide.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Never cache calls to the Google Apps Script backend — always go to network
  if (url.includes('script.google.com')) return;

  const isHTML = event.request.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/');

  if (isHTML) {
    // Network-first for the app shell itself, so updates show up right away.
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets (icons, logo, manifest, fonts) — instant
    // load on repeat visits, with a background refresh to stay current.
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
