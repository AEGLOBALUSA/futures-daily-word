/**
 * Futures Daily Word — Service Worker v23
 * Strategy: Network-first for API, Cache-first for static assets,
 * Stale-while-revalidate for fonts and images.
 * V22: Removed aggressive tab reload on activate — uses gentle postMessage instead
 * V23: Image/asset stale-while-revalidate with network-failure cache fallback (hero frames)
 */

const CACHE_NAME = 'fdw-v50';
const STATIC_CACHE = 'fdw-static-v50';
const BIBLE_CACHE = 'fdw-bible-v1';
const FONT_CACHE = 'fdw-fonts-v1';

// Pre-cache on install
const PRE_CACHE = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRE_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE && key !== BIBLE_CACHE && key !== FONT_CACHE)
          .map((key) => caches.delete(key).catch(() => false))
      )
    ).then(() => {
      // Notify open tabs that a new version is available (gentle — no forced reload)
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: always pass through to network (GET + POST for TTS etc.)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503,
        })
      )
    );
    return;
  }

  // Skip non-GET for everything else
  if (event.request.method !== 'GET') return;

  // Bible data (KJV offline): cache-first, long-lived
  if (url.pathname.startsWith('/bible/') || url.pathname.startsWith('/books/')) {
    event.respondWith(
      caches.open(BIBLE_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Google Fonts: stale-while-revalidate
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const networkFetch = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Hashed assets (JS/CSS with hash in filename): cache-first (immutable)
  if (url.pathname.match(/\/assets\/.*-[a-zA-Z0-9]{8}\.(js|css)$/)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Icons and images: stale-while-revalidate. Serve the cached copy instantly when we
  // have one, refresh it in the background, and — critically — if the network fetch
  // fails (flaky mobile connection) fall back to the cached copy instead of rejecting.
  // Hero frames are CSS background-images, so a rejected fetch silently leaves a BLANK
  // hero; this keeps a previously-seen image on screen instead.
  if (url.pathname.startsWith('/icons/') || url.pathname.match(/\.(png|jpe?g|svg|ico|webp|avif|gif)$/)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          const network = fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // HTML navigation: network-first, fall back to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/') || caches.match(event.request))
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Listen for skip-waiting message from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Futures Daily Word', body: 'Time for your daily reading' };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // Use defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Futures Daily Word', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
      actions: data.actions || [],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification.data?.url || '/';
  // Validate URL: only allow relative paths or our own domains
  const ALLOWED_HOSTS = ['futuresdailyword.com', 'www.futuresdailyword.com', 'futures-daily-word.netlify.app', 'futures.church', 'www.futures.church', 'futures.global', 'www.futures.global', 'futures-church.netlify.app'];
  let url = '/';
  if (raw.startsWith('/')) {
    url = raw;
  } else {
    try {
      const parsed = new URL(raw);
      if (ALLOWED_HOSTS.includes(parsed.hostname)) url = parsed.pathname + parsed.search + parsed.hash;
    } catch {}
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
