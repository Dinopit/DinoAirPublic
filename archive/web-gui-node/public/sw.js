// DinoAir Service Worker for PWA capabilities
// Provides offline functionality, caching, and background sync

const CACHE_NAME = 'dinoair-v1.2.0';
const STATIC_CACHE = 'dinoair-static-v1.2.0';
const DYNAMIC_CACHE = 'dinoair-dynamic-v1.2.0';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/css/main.css',
  '/js/main.js',
  '/js/chat.js',
  '/js/artifacts.js',
  '/offline.html'
];

// API endpoints that should be cached
const CACHEABLE_APIS = [
  '/api/health',
  '/api/system/status',
  '/api/artifacts'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(error => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests with network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Default: network-first strategy
  event.respondWith(networkFirstStrategy(request));
});

// Network-first strategy for API calls and dynamic content
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses for cacheable APIs
    if (networkResponse.ok && shouldCacheAPI(request.url)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for failed API calls
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'This feature is not available offline'
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    throw error;
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url, error);
    throw error;
  }
}

// Navigation strategy with offline fallback
async function navigationStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation failed, serving offline page');

    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }

    // Fallback offline page if not cached
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>DinoAir - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-message { max-width: 400px; margin: 0 auto; }
            .dino { font-size: 4em; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="dino">🦕</div>
            <h1>You're Offline</h1>
            <p>DinoAir is not available right now. Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background sync for artifact uploads
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'artifact-upload') {
    event.waitUntil(syncArtifactUploads());
  }

  if (event.tag === 'chat-message') {
    event.waitUntil(syncChatMessages());
  }
});

// Push notification handling
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');

  const options = {
    body: 'DinoAir has an update for you',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open DinoAir',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/close-icon.png'
      }
    ]
  };

  if (event.data) {
    const payload = event.data.json();
    options.body = payload.body || options.body;
    options.title = payload.title || 'DinoAir';
  }

  event.waitUntil(
    self.registration.showNotification('DinoAir', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper functions
function isStaticAsset(pathname) {
  return pathname.startsWith('/css/')
         || pathname.startsWith('/js/')
         || pathname.startsWith('/images/')
         || pathname.endsWith('.css')
         || pathname.endsWith('.js')
         || pathname.endsWith('.png')
         || pathname.endsWith('.jpg')
         || pathname.endsWith('.svg')
         || pathname.endsWith('.ico');
}

function shouldCacheAPI(url) {
  return CACHEABLE_APIS.some(api => url.includes(api));
}

// Background sync functions
async function syncArtifactUploads() {
  try {
    console.log('[SW] Syncing artifact uploads...');

    // Get pending uploads from IndexedDB
    const pendingUploads = await getPendingUploads();

    for (const upload of pendingUploads) {
      try {
        const response = await fetch('/api/artifacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${upload.token}`
          },
          body: JSON.stringify(upload.data)
        });

        if (response.ok) {
          await removePendingUpload(upload.id);
          console.log('[SW] Successfully synced artifact upload:', upload.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync artifact upload:', upload.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

async function syncChatMessages() {
  try {
    console.log('[SW] Syncing chat messages...');

    // Get pending messages from IndexedDB
    const pendingMessages = await getPendingMessages();

    for (const message of pendingMessages) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${message.token}`
          },
          body: JSON.stringify(message.data)
        });

        if (response.ok) {
          await removePendingMessage(message.id);
          console.log('[SW] Successfully synced chat message:', message.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync chat message:', message.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Chat sync failed:', error);
  }
}

// IndexedDB helper functions (simplified - would need full implementation)
async function getPendingUploads() {
  // Implementation would use IndexedDB to retrieve pending uploads
  return [];
}

async function removePendingUpload(id) {
  // Implementation would remove upload from IndexedDB
  console.log('[SW] Removing pending upload:', id);
}

async function getPendingMessages() {
  // Implementation would use IndexedDB to retrieve pending messages
  return [];
}

async function removePendingMessage(id) {
  // Implementation would remove message from IndexedDB
  console.log('[SW] Removing pending message:', id);
}

console.log('[SW] Service worker script loaded');
