const CACHE_NAME = 'highway-racer-v1';

// Cache app shell (same-origin only). Phaser is loaded from a CDN in this project,
// so we don't reliably cache it here.
const CORE_ASSETS = [
  './',
  './index.html',
  './src/config.js',
  './src/AudioManager.js',
  './src/ui.js',
  './src/main.js',
  './src/scenes/BootScene.js',
  './src/scenes/MainMenuScene.js',
  './src/scenes/SettingsScene.js',
  './src/scenes/GameScene.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);
      // Ensure service worker becomes active immediately.
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests.
  if (request.method !== 'GET') return;

  // Navigation: network-first, fallback to cached index.html.
  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          // Cache the index.html navigation result for offline use.
          if (response && response.ok) {
            await cache.put('./index.html', response.clone());
          }
          return response;
        } catch (e) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match('./index.html');
          return cached || new Response('Offline');
        }
      })()
    );
    return;
  }

  // Same-origin assets: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response && response.ok) {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      })()
    );
  }
});

