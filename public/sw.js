/**
 * QATRA Emergency Blood Response Platform — Service Worker
 * Enables PWA capabilities, offline asset caching, and fast app shell loads.
 */

const CACHE_NAME = 'qatra-v2.5.0';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/static/css/tokens.css',
  '/static/css/apple.css',
  '/static/js/api.js',
  '/static/js/auth-modal.js',
  '/static/js/motion-interactions.js',
  '/static/js/pwa.js',
  '/media/logo.png',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png',
  '/static/icons/favicon.png',
  '/static/icons/apple-touch-icon.png',
  '/manifest.json'
];

// 1. Install: Precache essential app shell assets with individual resilience
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[QATRA SW] Optional precache skipped:', asset);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate: Clear legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch: Dynamic strategy (Network-first for APIs/pages, Stale-while-revalidate for static assets)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude non-GET requests, API calls, and map tile hosts from SW cache
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('cartocdn.com')
  ) {
    return;
  }

  // Static Assets: Stale-While-Revalidate
  if (url.pathname.startsWith('/static/') || url.pathname.startsWith('/media/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // HTML Navigation: Network-first, fallback to cache
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/index.html');
          });
        })
    );
  }
});
