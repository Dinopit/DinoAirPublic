/**
 * DinoAir Service Worker
 * 
 * Provides comprehensive offline support including:
 * - Static asset caching with cache-first strategy
 * - API response caching with network-first strategy
 * - Background sync for offline requests
 * - Offline page fallback
 * - Cache management and cleanup
 * 
 * Version: 1.0.0
 */

const CACHE_NAME = 'dinoair-v1';
const OFFLINE_CACHE = 'dinoair-offline-v1';
const API_CACHE = 'dinoair-api-v1';
const STATIC_CACHE = 'dinoair-static-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  // Add other critical static assets
];

// API endpoints that should be cached
const CACHEABLE_API_PATTERNS = [
  /^\/api\/models/,
  /^\/api\/personalities/,
  /^\/api\/health/,
  /^\/api\/system/,
];

// API endpoints that should never be cached
const NON_CACHEABLE_API_PATTERNS = [
  /^\/api\/chat/,
  /^\/api\/auth/,
  /^\/api\/upload/,
];

/**
 * Service Worker Installation
 * 
 * During installation, we pre-cache critical static assets to ensure
 * the app can function offline. This uses a cache-first strategy for
 * static resources.
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Cache offline page
      caches.open(OFFLINE_CACHE).then((cache) => {
        console.log('[SW] Caching offline page');
        return cache.add('/offline');
      })
    ]).then(() => {
      console.log('[SW] Installation complete');
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

/**
 * Service Worker Activation
 * 
 * During activation, we clean up old caches and take control of all clients.
 * This ensures users get the latest version of cached resources.
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== OFFLINE_CACHE && 
                cacheName !== API_CACHE && 
                cacheName !== STATIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

/**
 * Fetch Event Handler
 * 
 * Implements different caching strategies based on request type:
 * - Static assets: Cache-first with fallback to network
 * - API requests: Network-first with cache fallback
 * - Navigation requests: Network-first with offline page fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

/**
 * Background Sync Event Handler
 * 
 * Handles background sync events to retry failed requests when
 * the user comes back online. This ensures data consistency
 * and improves user experience.
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineRequests());
  }
});

/**
 * Message Event Handler
 * 
 * Handles messages from the main thread for cache management,
 * sync triggers, and other service worker operations.
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(payload.urls));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(payload.cacheName));
      break;
      
    case 'SYNC_OFFLINE_REQUESTS':
      event.waitUntil(syncOfflineRequests());
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Helper Functions

/**
 * Check if request is for an API endpoint
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

/**
 * Check if request is a navigation request
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

/**
 * Check if API endpoint should be cached
 */
function shouldCacheApiRequest(url) {
  const pathname = url.pathname;
  
  // Check if it matches non-cacheable patterns
  if (NON_CACHEABLE_API_PATTERNS.some(pattern => pattern.test(pathname))) {
    return false;
  }
  
  // Check if it matches cacheable patterns
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses for cacheable endpoints
    if (networkResponse.ok && shouldCacheApiRequest(url)) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving API request from cache:', request.url);
      return cachedResponse;
    }
    
    // Queue request for background sync if it's a POST/PUT/DELETE
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      await queueOfflineRequest(request);
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: 'Network unavailable', 
        offline: true,
        queued: ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    
    // Try to serve from cache one more time
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return 404 for missing static assets
    return new Response('Not Found', { status: 404 });
  }
}

/**
 * Handle navigation requests with network-first strategy and offline fallback
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful navigation responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for navigation:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Last resort: basic offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>DinoAir - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-icon { font-size: 64px; margin-bottom: 20px; }
            .offline-message { font-size: 24px; margin-bottom: 10px; }
            .offline-description { color: #666; }
          </style>
        </head>
        <body>
          <div class="offline-icon">📡</div>
          <div class="offline-message">You're offline</div>
          <div class="offline-description">Please check your internet connection and try again.</div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

/**
 * Handle generic requests with cache-first strategy
 */
async function handleGenericRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Network Error', { status: 503 });
  }
}

/**
 * Queue offline requests for background sync
 */
async function queueOfflineRequest(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB
    const db = await openDB();
    const tx = db.transaction(['requests'], 'readwrite');
    const store = tx.objectStore('requests');
    await store.add(requestData);
    
    console.log('[SW] Queued offline request:', request.url);
  } catch (error) {
    console.error('[SW] Failed to queue offline request:', error);
  }
}

/**
 * Sync offline requests when back online
 */
async function syncOfflineRequests() {
  try {
    const db = await openDB();
    const tx = db.transaction(['requests'], 'readwrite');
    const store = tx.objectStore('requests');
    const requests = await store.getAll();
    
    console.log(`[SW] Syncing ${requests.length} offline requests`);
    
    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        if (response.ok) {
          // Remove successful request from queue
          await store.delete(requestData.id);
          console.log('[SW] Successfully synced request:', requestData.url);
        } else {
          console.log('[SW] Failed to sync request (will retry):', requestData.url);
        }
      } catch (error) {
        console.log('[SW] Network still unavailable for:', requestData.url);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync offline requests:', error);
  }
}

/**
 * Open IndexedDB for offline request storage
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dinoair-offline', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  return cache.addAll(urls);
}

/**
 * Clear specific cache
 */
async function clearCache(cacheName) {
  return caches.delete(cacheName);
}

console.log('[SW] Service worker loaded successfully');