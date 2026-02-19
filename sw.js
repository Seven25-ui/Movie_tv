const CACHE_NAME = 'se7en-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. Install Event: I-cache ang mga files para offline use [cite: 2026-01-31]
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // I-activate dayon ang bag-ong SW [cite: 2026-01-31]
});

// 2. Activate Event: Limpyohan ang karaan nga cache kung naay update [cite: 2026-01-31]
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // Kontrolahon dayon ang tanang tabs [cite: 2026-01-31]
});

// 3. Fetch Event: "Cache First" strategy para sa static, "Network First" para sa uban [cite: 2026-01-31]
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // I-return ang file gikan sa cache kung naa [cite: 2026-01-31]
      }
      return fetch(event.request); // Kung wala, kuhaon sa internet [cite: 2026-01-31]
    })
  );
});
