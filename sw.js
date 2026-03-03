// Daily Word Service Worker v8 — Bible API caching + TTS caching + hardening
const CACHE_NAME = 'daily-word-v8';
const API_CACHE = 'daily-word-api-v1'; // Separate cache for API responses (24hr TTL)
const TTS_CACHE = 'daily-word-tts-v1'; // Cache for TTS audio (7-day TTL, max 50 entries)

// App shell — pre-cached on install so the app opens offline
const PRECACHE_URLS = [
  '/',
  '/index.html',
  // Primary CDN
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.9/babel.min.js',
  // Fallback CDN
  'https://unpkg.com/react@18.2.0/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.23.9/babel.min.js',
  // KJV Bible index (so offline KJV always works)
  '/bible/kjv/index.json',
  // Books
  '/books/church.json',
  '/books/scarcity.json',
  '/books/no_more_fear.json',
  '/books/faith-pathway.json',
  '/books/church/toc.json',
  '/books/church/ch0.json','/books/church/ch1.json','/books/church/ch2.json','/books/church/ch3.json',
  '/books/church/ch4.json','/books/church/ch5.json','/books/church/ch6.json','/books/church/ch7.json',
  '/books/church/ch8.json','/books/church/ch9.json','/books/church/ch10.json','/books/church/ch11.json',
  '/books/church/ch12.json','/books/church/ch13.json','/books/church/ch14.json','/books/church/ch15.json',
  '/books/church/ch16.json','/books/church/ch17.json','/books/church/ch18.json',
  '/books/scarcity/toc.json',
  '/books/scarcity/ch0.json','/books/scarcity/ch1.json','/books/scarcity/ch2.json','/books/scarcity/ch3.json',
  '/books/scarcity/ch4.json','/books/scarcity/ch5.json','/books/scarcity/ch6.json','/books/scarcity/ch7.json',
  '/books/scarcity/ch8.json','/books/scarcity/ch9.json','/books/scarcity/ch10.json','/books/scarcity/ch11.json',
  '/books/scarcity/ch12.json','/books/scarcity/ch13.json','/books/scarcity/ch14.json','/books/scarcity/ch15.json',
  '/books/scarcity/ch16.json','/books/scarcity/ch17.json','/books/scarcity/ch18.json','/books/scarcity/ch19.json',
  '/books/scarcity/ch20.json','/books/scarcity/ch21.json','/books/scarcity/ch22.json'
];

// Install — pre-cache app shell + activate immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// Activate — claim all clients, clean old caches (keep API_CACHE + TTS_CACHE)
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(
    keys.filter(k => k !== CACHE_NAME && k !== API_CACHE && k !== TTS_CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim())
));

// TTS cache helper — creates a cache key from POST body, caches audio for 7 days
async function handleTTSRequest(request, url) {
  try {
    const body = await request.clone().text();
    // Create a unique cache key from function name + body hash
    const cacheKey = new Request(url.origin + url.pathname + '?_body=' + encodeURIComponent(body));
    const cache = await caches.open(TTS_CACHE);
    const cached = await cache.match(cacheKey);

    if (cached) {
      const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0');
      if (Date.now() - cachedAt < 604800000) { // 7 days
        return cached;
      }
    }

    const resp = await fetch(request);
    if (resp.ok) {
      const headers = new Headers(resp.headers);
      headers.set('sw-cached-at', Date.now().toString());
      const cachedResp = new Response(resp.clone().body, { status: resp.status, statusText: resp.statusText, headers });
      await cache.put(cacheKey, cachedResp);

      // Evict oldest entries if cache exceeds 50 items
      const keys = await cache.keys();
      if (keys.length > 50) {
        const toDelete = keys.slice(0, keys.length - 50);
        await Promise.all(toDelete.map(k => cache.delete(k)));
      }
    }
    return resp;
  } catch (err) {
    // Try cache on network failure
    const body = await request.clone().text();
    const cacheKey = new Request(url.origin + url.pathname + '?_body=' + encodeURIComponent(body));
    const cache = await caches.open(TTS_CACHE);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    return new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

// Fetch strategy
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Cache TTS POST requests (polly-tts, elevenlabs-tts, esv-audio)
  if (e.request.method === 'POST' && url.pathname.match(/^\/.netlify\/functions\/(polly-tts|elevenlabs-tts|esv-audio)/)) {
    e.respondWith(handleTTSRequest(e.request, url));
    return;
  }

  // Skip other non-GET requests
  if (e.request.method !== 'GET') return;

  // Skip analytics
  if (url.hostname === 'www.googletagmanager.com' || url.hostname === 'www.google-analytics.com') return;

  // Stale-while-revalidate for Bible API responses (esv, nlt, bolls, esv-audio)
  // Serves cached version instantly while fetching fresh copy in background
  if (url.pathname.match(/^\/.netlify\/functions\/(esv|nlt|bolls|esv-audio)/)) {
    e.respondWith(
      caches.open(API_CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        const fetchPromise = fetch(e.request).then(resp => {
          if (resp.ok) {
            // Store with timestamp header for TTL checking
            const headers = new Headers(resp.headers);
            headers.set('sw-cached-at', Date.now().toString());
            const cachedResp = new Response(resp.clone().body, { status: resp.status, statusText: resp.statusText, headers });
            cache.put(e.request, cachedResp);
          }
          return resp;
        }).catch(() => cached || new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } }));

        if (cached) {
          // Check if cache is older than 24 hours
          const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0');
          const age = Date.now() - cachedAt;
          if (age < 86400000) { // 24 hours
            // Fresh enough — return cache, revalidate in background
            fetchPromise; // fire and forget
            return cached;
          }
        }
        // No cache or stale — wait for network
        return fetchPromise;
      })
    );
    return;
  }

  // Cache-first for book chapter/toc JSON AND KJV Bible files (they never change)
  if (url.pathname.match(/\/books\/.+\/(ch\d+|toc)\.json$/) || url.pathname.match(/\/books\/.+\.json$/) || url.pathname.startsWith('/bible/kjv/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return resp;
        });
      }).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // Cache-first for CDN scripts (versioned, never change)
  if (url.hostname === 'cdnjs.cloudflare.com' || url.hostname === 'unpkg.com') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return resp;
        });
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Network-first for app pages (index.html) — use network when available, fall back to cache
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        return caches.match(e.request).then(r => r || caches.match('/index.html'));
      })
    );
    return;
  }

  // Network-first for everything else, cache responses for offline
  e.respondWith(
    fetch(e.request).then(resp => {
      // Cache successful GET responses for offline use
      if (resp.ok && url.protocol.startsWith('http')) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return resp;
    }).catch(() => {
      return caches.match(e.request).then(r => r || new Response('Offline', { status: 503 }));
    })
  );
});

// Message handler — app can request full KJV pre-download for offline
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'PRECACHE_KJV') {
    const index = e.data.index; // array of {folder, chapters}
    if (!index) return;
    const urls = ['/bible/kjv/index.json'];
    for (const book of index) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        urls.push('/bible/kjv/' + book.folder + '/' + ch + '.json');
      }
    }
    caches.open(CACHE_NAME).then(async cache => {
      let done = 0;
      const total = urls.length;
      for (const url of urls) {
        try {
          const existing = await cache.match(url);
          if (!existing) {
            const resp = await fetch(url);
            if (resp.ok) await cache.put(url, resp);
          }
          done++;
          // Report progress every 50 files
          if (done % 50 === 0 || done === total) {
            self.clients.matchAll().then(clients => {
              clients.forEach(c => c.postMessage({ type: 'KJV_PROGRESS', done, total }));
            });
          }
        } catch (err) {
          done++;
        }
      }
      self.clients.matchAll().then(clients => {
        clients.forEach(c => c.postMessage({ type: 'KJV_COMPLETE', total: done }));
      });
    });
  }
});

// Push notification received
self.addEventListener('push', e => {
  if (!e.data) return;
  try {
    const data = e.data.json();
    const options = {
      body: data.body || 'Your daily reading is ready.',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      tag: 'daily-word-reading',
      renotify: true,
      data: {
        url: data.url || '/',
        passage: data.passage || ''
      },
      actions: [
        { action: 'open', title: 'Read Now' },
        { action: 'dismiss', title: 'Later' }
      ]
    };
    e.waitUntil(
      self.registration.showNotification(data.title || 'Daily Word', options)
    );
  } catch (err) {
    e.waitUntil(
      self.registration.showNotification('Daily Word', {
        body: e.data.text() || 'Your daily reading is ready.',
        icon: '/icons/icon-192x192.png',
        tag: 'daily-word-reading'
      })
    );
  }
});

// Notification click — open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
