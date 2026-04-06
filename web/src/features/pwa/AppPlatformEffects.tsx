import { useEffect } from 'react'

const STATIC_CACHE = 'notes-static-v3'
let platformEffectsStarted = false

function collectCurrentAppAssetUrls(currentOrigin: string) {
  const urls = new Set<string>([
    '/',
    '/site.webmanifest',
    '/apple-touch-icon.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/favicon.ico',
  ])

  for (const element of document.querySelectorAll('script[src], link[href]')) {
    const attributeValue =
      element instanceof HTMLScriptElement
        ? element.src
        : element instanceof HTMLLinkElement
          ? element.href
          : null

    if (attributeValue && attributeValue.startsWith(currentOrigin)) {
      urls.add(attributeValue.replace(currentOrigin, ''))
    }
  }

  for (const entry of performance.getEntriesByType('resource')) {
    if (
      'name' in entry &&
      typeof entry.name === 'string' &&
      entry.name.startsWith(currentOrigin)
    ) {
      urls.add(entry.name.replace(currentOrigin, ''))
    }
  }

  return Array.from(urls)
}

async function primeCurrentAppAssets() {
  if (
    typeof window === 'undefined' ||
    !('caches' in window)
  ) {
    return
  }

  const currentOrigin = window.location.origin
  const urls = collectCurrentAppAssetUrls(currentOrigin)

  try {
    const cache = await caches.open(STATIC_CACHE)
    await Promise.all(
      urls.map(async (url) => {
        try {
          await cache.add(url)
        } catch {
          // Skip asset-specific cache misses so one bad URL does not prevent offline priming.
        }
      }),
    )
  } catch {
    // Offline priming is best-effort and should not break app startup.
  }
}

function startPlatformEffects() {
  if (platformEffectsStarted) {
    return
  }

  platformEffectsStarted = true
  void primeCurrentAppAssets()

  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return
  }

  void navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then(async () => {
      await navigator.serviceWorker.ready
      await primeCurrentAppAssets()
    })
    .catch(() => {
      // Installability should degrade quietly when service worker registration fails.
    })
}

if (typeof window !== 'undefined') {
  startPlatformEffects()
}

export function AppPlatformEffects() {
  useEffect(() => {
    startPlatformEffects()
  }, [])

  return null
}
