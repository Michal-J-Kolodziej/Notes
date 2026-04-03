import { useEffect } from 'react'

const STATIC_CACHE = 'notes-static-v1'

async function primeCurrentAppAssets() {
  if (
    typeof window === 'undefined' ||
    !('caches' in window)
  ) {
    return
  }

  const currentOrigin = window.location.origin
  const urls = new Set<string>([
    '/',
    '/site.webmanifest',
    '/apple-touch-icon.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/favicon.ico',
  ])

  for (const entry of performance.getEntriesByType('resource')) {
    if (
      'name' in entry &&
      typeof entry.name === 'string' &&
      entry.name.startsWith(currentOrigin)
    ) {
      urls.add(entry.name.replace(currentOrigin, ''))
    }
  }

  try {
    const cache = await caches.open(STATIC_CACHE)
    await cache.addAll(Array.from(urls))
  } catch {
    // Offline priming is best-effort and should not break app startup.
  }
}

export function AppPlatformEffects() {
  useEffect(() => {
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
  }, [])

  return null
}
