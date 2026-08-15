const VERSION = 'minha-lista-v2';
const SHELL = `${VERSION}-shell`;
const MEDIA = `${VERSION}-media`;
const APP_SHELL = ['./', './index.html', './manifest.json', './icone.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, MEDIA]);
    const names = await caches.keys();
    await Promise.all(names.filter(name => !keep.has(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function navigationResponse(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(SHELL);
      cache.put('./index.html', fresh.clone());
    }
    return fresh;
  } catch {
    return (await caches.match(request)) || (await caches.match('./index.html')) || (await caches.match('./'));
  }
}

async function sameOriginAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(SHELL);
    cache.put(request, response.clone());
  }
  return response;
}

async function tmdbImage(request) {
  const cache = await caches.open(MEDIA);
  const cached = await cache.match(request);
  const refresh = fetch(request).then(response => {
    if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || (await refresh) || Response.error();
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(sameOriginAsset(request));
    return;
  }

  if (url.hostname === 'image.tmdb.org') {
    event.respondWith(tmdbImage(request));
  }
});
