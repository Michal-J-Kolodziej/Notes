const APP_SHELL_CACHE = 'notes-app-shell-v3'
const APP_SHELL_URL = '/'
const STATIC_CACHE = 'notes-static-v3'
const STATIC_ASSETS = [
  '/',
  '/site.webmanifest',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName !== APP_SHELL_CACHE && cacheName !== STATIC_CACHE,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const requestUrl = new URL(request.url)

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          void caches
            .open(APP_SHELL_CACHE)
            .then((cache) => cache.put(APP_SHELL_URL, responseClone))
          return response
        })
        .catch(async () => {
          return (
            (await caches.match(APP_SHELL_URL)) ||
            Response.error()
          )
        }),
    )
    return
  }

  const isStaticAssetPath = requestUrl.pathname.startsWith('/assets/')
  const isStaticAsset =
    isStaticAssetPath ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'manifest'

  if (!isStaticAsset) {
    return
  }

  event.respondWith((async () => {
    const staticCache = await caches.open(STATIC_CACHE)
    const cachedResponse =
      (await staticCache.match(request.url, { ignoreVary: true })) ||
      (await staticCache.match(requestUrl.pathname, { ignoreVary: true })) ||
      (await caches.match(request, { ignoreVary: true }))

    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      void staticCache.put(request, responseClone)
    }

    return networkResponse
  })())
})
