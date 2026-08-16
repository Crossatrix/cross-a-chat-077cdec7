// Service Worker for Push Notifications + media caching

const MEDIA_CACHE = 'cc-media-v1';
const MEDIA_TTL_MS = 12 * 24 * 60 * 60 * 1000; // 12 days

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Cache-first for images/media served from storage or CDNs, refreshed after 12 days.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (!/^https?:$/.test(url.protocol)) return;

  const isMedia =
    /\.(png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mp3|ogg|wav|woff2?|ttf|otf)(\?|$)/i.test(url.pathname) ||
    url.pathname.includes('/storage/v1/object/public/') ||
    url.pathname.startsWith('/__l5e/assets-v1/');

  if (!isMedia) return;

  event.respondWith((async () => {
    const cache = await caches.open(MEDIA_CACHE);
    const cached = await cache.match(req);
    if (cached) {
      const stored = Number(cached.headers.get('x-cc-cached-at') || 0);
      if (stored && Date.now() - stored < MEDIA_TTL_MS) return cached;
    }
    try {
      const res = await fetch(req);
      if (res && (res.status === 200 || res.type === 'opaque')) {
        try {
          const body = await res.clone().blob();
          const headers = new Headers(res.headers);
          headers.set('x-cc-cached-at', String(Date.now()));
          await cache.put(req, new Response(body, { status: res.status, statusText: res.statusText, headers }));
        } catch { /* opaque or unstorable */ }
      }
      return res;
    } catch (e) {
      if (cached) return cached;
      throw e;
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_MEDIA_CACHE') {
    event.waitUntil(caches.delete(MEDIA_CACHE));
  }
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Cross Chat';
  const options = {
    body: data.body || 'You have a new message',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.tag || 'message',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data || {};
  const urlToOpen = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
