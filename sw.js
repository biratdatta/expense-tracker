// Offline support: caches the app's own files only. No data is ever sent anywhere.
// Bump CACHE whenever you deploy a change so installed apps pick up the new version.
const CACHE = 'expense-tracker-v6';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache: 'reload' bypasses the browser's HTTP cache so we always store the newest files
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Serve from cache instantly, refresh the cache in the background (stale-while-revalidate).
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await cache.match('./index.html') : undefined); // offline fallback for any page URL
    const fresh = fetch(req).then(res => { if (res.ok && !req.url.includes('?')) cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || fresh;
  }));
});
