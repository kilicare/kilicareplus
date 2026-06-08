// KilicareGO+ Service Worker v1.0
const CACHE_NAME = 'kilicarego-v1'
const STATIC_CACHE = 'kilicarego-static-v1'
const DYNAMIC_CACHE = 'kilicarego-dynamic-v1'

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/feed',
  '/offline',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icons/icon-72x72.png',
]

// API routes to cache
const CACHEABLE_APIS = [
  '/api/subscriptions/plans/',
  '/api/predictions/leagues/',
  '/api/affiliates/',
  '/api/passport/badges/',
]

// ── Install ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing KilicareGO+ v1...')

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets:', STATIC_ASSETS)

      // HARDENED CACHE INSTALLATION: Use safe error handling
      // Filter out null/undefined values and use Promise.allSettled
      const safeFiles = STATIC_ASSETS.filter(Boolean)

      return Promise.allSettled(
        safeFiles.map(async (file) => {
          try {
            console.log('[SW] Caching file:', file)
            const res = await fetch(file)
            if (res && res.ok) {
              const responseClone = res.clone()
              await cache.put(file, responseClone)
              console.log('[SW] Successfully cached:', file)
            } else {
              console.warn('[SW] File not OK:', file, res?.status)
            }
          } catch (error) {
            console.warn('[SW] Failed to cache file:', file, error)
            // Don't fail entire install if one file fails
          }
        })
      ).then((results) => {
        const failed = results.filter(r => r.status === 'rejected')
        const succeeded = results.filter(r => r.status === 'fulfilled')
        console.log(`[SW] Cache install: ${succeeded.length} succeeded, ${failed.length} failed`)
        if (failed.length > 0) {
          console.warn(`[SW] ${failed.length} files failed to cache, but continuing...`)
        }
        console.log('[SW] Static assets cached successfully')
        return self.skipWaiting()
      })
    }).catch((error) => {
      console.error('[SW] Cache installation failed:', error)
      // Don't fail SW install even if cache fails
      return self.skipWaiting()
    })
  )
})

// ── Activate ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key)
            return caches.delete(key)
          })
      )
    }).then(() => self.clients.claim())
  )
})

// ── Fetch Strategy ────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip WebSocket
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return

  // Skip chrome-extension
  if (url.protocol === 'chrome-extension:') return

  // API requests — Network first, fallback cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // Static assets — Cache first
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(cacheFirstStrategy(request))
    return
  }

  // Pages — Stale while revalidate
  event.respondWith(staleWhileRevalidate(request))
})

// ── Strategies ────────────────────────────────────────────

async function networkFirstStrategy(request) {
  try {
    console.log('[SW] Network first:', request.url)
    const response = await fetch(request, {
      signal: AbortSignal.timeout(5000),
    })
    
    if (!response || response.status !== 200) {
      console.warn('[SW] Network response not OK:', request.url, response?.status)
      return response
    }
    
    const url = new URL(request.url)
    const isCacheable = CACHEABLE_APIS.some((api) =>
      url.pathname.includes(api)
    )
    
    if (isCacheable) {
      // Clone IMMEDIATELY after fetch
      // Only attempt to cache if response body is available
      try {
        if (response.body) {
          const responseClone = response.clone()
          const cache = await caches.open(DYNAMIC_CACHE)
          await cache.put(request, responseClone)
          console.log('[SW] Cached API response:', request.url)
        }
      } catch (error) {
        console.warn('[SW] Failed to cache API response (body may be consumed):', request.url, error.message)
      }
    }
    
    return response
  } catch (error) {
    console.warn('[SW] Network fetch failed:', request.url, error)
    const cached = await caches.match(request)
    if (cached) {
      console.log('[SW] Serving from cache:', request.url)
      return cached
    }
    return offlineResponse(request)
  }
}

async function cacheFirstStrategy(request) {
  try {
    const cached = await caches.match(request)
    if (cached) {
      console.log('[SW] Cache hit:', request.url)
      return cached
    }

    console.log('[SW] Cache miss, fetching:', request.url)
    const response = await fetch(request)

    // 206 (Partial Content) is valid for range requests (media streaming)
    // 0 is opaque response from CORS
    const isValidStatus = response && (
      response.status === 200 ||
      response.status === 206 ||
      response.status === 0
    )

    if (!isValidStatus) {
      console.warn('[SW] Response not OK:', request.url, response?.status)
      return response
    }

    // Clone IMMEDIATELY after fetch, before any other operations
    // Only attempt to cache if response body is available
    try {
      if (response.body) {
        const responseClone = response.clone()
        const cache = await caches.open(STATIC_CACHE)
        await cache.put(request, responseClone)
        console.log('[SW] Cached static asset:', request.url)
      }
    } catch (error) {
      console.warn('[SW] Failed to cache static asset (body may be consumed):', request.url, error.message)
    }

    return response
  } catch (error) {
    console.warn('[SW] Cache first strategy failed:', request.url, error)
    return offlineResponse(request)
  }
}

async function staleWhileRevalidate(request) {
  try {
    console.log('[SW] Stale while revalidate:', request.url)
    const cache = await caches.open(DYNAMIC_CACHE)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      console.log('[SW] Serving stale cached response:', request.url)
    }

    const networkPromise = fetch(request)
      .then(async (networkResponse) => {
        // 206 (Partial Content) is valid for range requests (media streaming)
        // 0 is opaque response from CORS
        const isValidStatus = networkResponse && (
          networkResponse.status === 200 ||
          networkResponse.status === 206 ||
          networkResponse.status === 0
        )

        if (!isValidStatus) {
          console.warn('[SW] Network response not OK:', request.url, networkResponse?.status)
          return networkResponse
        }

        // Clone IMMEDIATELY after fetch, before any other operations
        // Only attempt to cache if response is cloneable
        try {
          // Check if response body is still available
          if (networkResponse.body) {
            const clone = networkResponse.clone()
            await cache.put(request, clone)
            console.log('[SW] Updated cache with fresh response:', request.url)
          }
        } catch (error) {
          console.warn('[SW] Failed to clone/cache response (body may be consumed):', request.url, error.message)
          // Don't fail the entire request if caching fails
        }

        return networkResponse
      })
      .catch((error) => {
        console.warn('[SW] Network fetch failed:', request.url, error)
        return null
      })

    return cachedResponse || await networkPromise || offlineResponse(request)
  } catch (error) {
    console.error('[SW] Stale while revalidate strategy failed:', request.url, error)
    return offlineResponse(request)
  }
}

function offlineResponse(request) {
  const url = new URL(request.url)
  if (request.headers.get('Accept')?.includes('text/html')) {
    return caches.match('/offline') || new Response(
      `<!DOCTYPE html>
      <html lang="sw">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width">
        <title>KilicareGO+ — Bila Mtandao</title>
        <style>
          body {
            background: #0A0A0F; color: #F0F0F5;
            font-family: system-ui; display: flex;
            align-items: center; justify-content: center;
            min-height: 100vh; margin: 0; text-align: center; padding: 20px;
          }
          .emoji { font-size: 64px; margin-bottom: 20px; }
          h1 { color: #F5A623; font-size: 24px; margin: 0 0 10px; }
          p { color: #8B8BA7; margin: 0 0 20px; }
          button {
            background: #F5A623; color: #000; border: none;
            padding: 12px 24px; border-radius: 12px;
            font-weight: bold; font-size: 14px; cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div>
          <div class="emoji">📡</div>
          <h1>Hakuna Mtandao</h1>
          <p>Tafadhali unganisha na mtandao ili kutumia KilicareGO+</p>
          <button onclick="window.location.reload()">Jaribu Tena</button>
        </div>
      </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    )
  }
  return new Response(
    JSON.stringify({ error: 'offline', message: 'Hakuna mtandao' }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

// ── Push Notifications ────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title  = data.title  || 'KilicareGO+'
  const body   = data.body   || 'Una arifa mpya'
  const icon   = data.icon   || '/icon-192.png'
  const badge  = '/icons/icon-72x72.png'
  const tag    = data.tag    || 'kilicarego-notif'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      vibrate: [100, 50, 100],
      data: { url: data.url || '/notifications' },
      actions: [
        { action: 'open',    title: 'Fungua' },
        { action: 'dismiss', title: 'Funga' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      return clients.openWindow(url)
    })
  )
})

// ── Background Sync ───────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncQueuedMessages())
  }
})

async function syncQueuedMessages() {
  // Sync queued messages when back online
  const clients = await self.clients.matchAll()
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_MESSAGES' })
  })
}