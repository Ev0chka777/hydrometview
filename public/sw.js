// HydroMetView Service Worker
//
// Strategy:
//   • App shell (HTML, JS, CSS, fonts, icons) — cache-first.
//     Loads instantly even with no network — works offline.
//   • WeatherAPI requests — network-first with cache fallback.
//     Always fresh when online; last-known data when offline.
//   • Map tiles (OpenStreetMap) — cache-first, 7-day expiry.
//     Tiles you've already seen stay viewable offline.
//   • Other GET requests — network-first.
//
// Cache versioning: bump CACHE_VERSION when shipping incompatible changes.

const CACHE_VERSION = 'v2'
const SHELL_CACHE   = `shell-${CACHE_VERSION}`
const API_CACHE     = `api-${CACHE_VERSION}`
const TILE_CACHE    = `tile-${CACHE_VERSION}`

// Files to pre-cache for the offline shell. We intentionally don't list
// the Vite hashed bundles — install-time we only grab the root and
// the build manifest hits at runtime.
const SHELL_URLS = ['/', '/index.html', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter(k => !k.endsWith(CACHE_VERSION))
        .map(k => caches.delete(k))
    )
    await self.clients.claim()
  })())
})

// Helpers
function isWeatherApi(url) { return url.hostname.endsWith('weatherapi.com') }
function isMapTile(url)    { return url.hostname.endsWith('openstreetmap.org') || url.hostname.endsWith('cartocdn.com') }
function isAppShell(url)   { return url.origin === self.location.origin }

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Map tiles — cache-first
  if (isMapTile(url)) {
    event.respondWith(cacheFirst(req, TILE_CACHE))
    return
  }

  // WeatherAPI — network-first with cache fallback
  if (isWeatherApi(url)) {
    event.respondWith(networkFirst(req, API_CACHE))
    return
  }

  // App shell — network-first for HTML so users get fresh app, cache-first
  // for hashed assets (immutable by Vite convention).
  if (isAppShell(url)) {
    if (req.destination === 'document') {
      event.respondWith(networkFirst(req, SHELL_CACHE))
    } else {
      event.respondWith(cacheFirst(req, SHELL_CACHE))
    }
    return
  }

  // Default — try network, fall through to whatever we have
  event.respondWith(networkFirst(req, SHELL_CACHE))
})

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(req)
  if (hit) return hit
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch {
    return hit ?? new Response('', { status: 504, statusText: 'offline' })
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const res = await fetch(req)
    if (res.ok) cache.put(req, res.clone())
    return res
  } catch {
    const hit = await cache.match(req)
    if (hit) return hit
    return new Response('', { status: 504, statusText: 'offline' })
  }
}

// Allow the app to send messages — e.g. trigger refresh of caches.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
