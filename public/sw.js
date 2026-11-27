// MyCaddie offline support.
// Pages: network first, falling back to the cached app shell when there is no signal on the course.
// Built files, images and fonts: served from cache, refreshed in the background.
const CACHE = 'mycaddie-v1';
const SCOPE = self.registration.scope;
const SHELL = [SCOPE, `${SCOPE}index.html`, `${SCOPE}manifest.webmanifest`, `${SCOPE}assets/mycaddie-mark.svg`, `${SCOPE}assets/map-preview.png`, `${SCOPE}assets/course-overview.png`, `${SCOPE}assets/course-detail.png`, `${SCOPE}assets/fairway-art.svg`];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => { const copy = response.clone(); caches.open(CACHE).then(c => c.put(SCOPE, copy)); return response; })
        .catch(() => caches.match(SCOPE).then(r => r || caches.match(`${SCOPE}index.html`)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok || response.type === 'opaque') { const copy = response.clone(); caches.open(CACHE).then(c => c.put(request, copy)); }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
