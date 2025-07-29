/**
 * DinoAir Advanced Caching System
 * Implements HTTP/2 server push, service worker caching, and client-side caching
 */

class AdvancedCachingManager {
  constructor() {
    this.queryCache = new Map();
    this.cacheConfig = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 100,
      staleWhileRevalidate: true
    };
    this.serverPushResources = new Set();

    this.init();
  }

  async init() {
    console.log('[Advanced Caching] Initializing...');

    // Setup client-side query caching
    this.setupQueryCaching();

    // Setup HTTP/2 server push
    this.setupServerPush();

    // Enhance service worker caching
    this.enhanceServiceWorkerCaching();

    // Setup stale-while-revalidate
    this.setupStaleWhileRevalidate();

    console.log('[Advanced Caching] Initialized successfully');
  }

  // Client-side Query Result Caching with TTL
  setupQueryCaching() {
    // Override fetch for API calls
    this.originalFetch = window.fetch;
    window.fetch = this.cachedFetch.bind(this);
  }

  async cachedFetch(url, options = {}) {
    const method = options.method || 'GET';

    // Only cache GET requests
    if (method !== 'GET') {
      return this.originalFetch(url, options);
    }

    // Check if URL should be cached
    if (!this.shouldCacheRequest(url)) {
      return this.originalFetch(url, options);
    }

    const cacheKey = this.generateCacheKey(url, options);
    const cachedEntry = this.queryCache.get(cacheKey);

    // Check if we have a valid cached response
    if (cachedEntry && !this.isCacheExpired(cachedEntry)) {
      console.log(`[Advanced Caching] Cache hit for: ${url}`);

      // Implement stale-while-revalidate if enabled
      if (this.cacheConfig.staleWhileRevalidate && this.isCacheStale(cachedEntry)) {
        this.revalidateInBackground(url, options, cacheKey);
      }

      return this.createResponseFromCache(cachedEntry);
    }

    // Cache miss - fetch from network
    console.log(`[Advanced Caching] Cache miss for: ${url}`);

    try {
      const response = await this.originalFetch(url, options);

      // Cache successful responses
      if (response.ok) {
        await this.cacheResponse(cacheKey, response.clone(), url);
      }

      return response;
    } catch (error) {
      // Return stale cache if available during network error
      if (cachedEntry) {
        console.log(`[Advanced Caching] Network error, serving stale cache for: ${url}`);
        return this.createResponseFromCache(cachedEntry);
      }

      throw error;
    }
  }

  shouldCacheRequest(url) {
    const cacheablePatterns = [
      '/api/artifacts',
      '/api/system/status',
      '/api/health',
      '/api/search'
    ];

    const nonCacheablePatterns = [
      '/api/auth',
      '/api/upload',
      '/api/chat'
    ];

    // Check non-cacheable patterns first
    if (nonCacheablePatterns.some(pattern => url.includes(pattern))) {
      return false;
    }

    // Check cacheable patterns
    return cacheablePatterns.some(pattern => url.includes(pattern));
  }

  generateCacheKey(url, options) {
    const urlObj = new URL(url, window.location.origin);
    const params = Array.from(urlObj.searchParams.entries()).sort();
    const headers = options.headers ? JSON.stringify(options.headers) : '';

    return `${urlObj.pathname}?${params.map(([k, v]) => `${k}=${v}`).join('&')}|${headers}`;
  }

  isCacheExpired(cachedEntry) {
    return Date.now() > cachedEntry.expiresAt;
  }

  isCacheStale(cachedEntry) {
    const staleThreshold = cachedEntry.ttl * 0.75; // 75% of TTL
    return Date.now() > (cachedEntry.timestamp + staleThreshold);
  }

  async cacheResponse(cacheKey, response, url) {
    try {
      const data = await response.text();
      const ttl = this.getTTLForUrl(url);

      const cacheEntry = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        timestamp: Date.now(),
        ttl,
        expiresAt: Date.now() + ttl,
        url
      };

      // Implement LRU eviction
      if (this.queryCache.size >= this.cacheConfig.maxCacheSize) {
        this.evictOldestEntry();
      }

      this.queryCache.set(cacheKey, cacheEntry);
      console.log(`[Advanced Caching] Cached response for: ${url} (TTL: ${ttl}ms)`);
    } catch (error) {
      console.error('[Advanced Caching] Failed to cache response:', error);
    }
  }

  getTTLForUrl(url) {
    const ttlMap = {
      '/api/system/status': 30 * 1000, // 30 seconds
      '/api/health': 60 * 1000, // 1 minute
      '/api/artifacts': 5 * 60 * 1000, // 5 minutes
      '/api/search': 10 * 60 * 1000 // 10 minutes
    };

    for (const [pattern, ttl] of Object.entries(ttlMap)) {
      if (url.includes(pattern)) {
        return ttl;
      }
    }

    return this.cacheConfig.defaultTTL;
  }

  createResponseFromCache(cachedEntry) {
    return new Response(cachedEntry.data, {
      status: cachedEntry.status,
      statusText: cachedEntry.statusText,
      headers: new Headers(cachedEntry.headers)
    });
  }

  async revalidateInBackground(url, options, cacheKey) {
    try {
      console.log(`[Advanced Caching] Background revalidation for: ${url}`);

      const response = await this.originalFetch(url, options);

      if (response.ok) {
        await this.cacheResponse(cacheKey, response.clone(), url);
        console.log(`[Advanced Caching] Background revalidation completed for: ${url}`);
      }
    } catch (error) {
      console.error(`[Advanced Caching] Background revalidation failed for: ${url}`, error);
    }
  }

  evictOldestEntry() {
    let oldestKey = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.queryCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.queryCache.delete(oldestKey);
      console.log('[Advanced Caching] Evicted oldest cache entry');
    }
  }

  // HTTP/2 Server Push Setup
  setupServerPush() {
    // Define critical resources for server push
    this.criticalResources = [
      '/js/main.js',
      '/css/main.css',
      '/js/components/chat.js',
      '/js/components/artifacts.js',
      '/js/performance/lazy-loading.js',
      '/js/performance/bundle-optimizer.js'
    ];

    // Setup server push hints
    this.addServerPushHints();

    // Setup preload links
    this.setupPreloadLinks();
  }

  addServerPushHints() {
    // Add Link headers for server push (would be handled by server)
    const pushHints = this.criticalResources.map(resource => {
      const resourceType = this.getResourceType(resource);
      return `<${resource}>; rel=preload; as=${resourceType}`;
    }).join(', ');

    // Store for server implementation
    this.serverPushHints = pushHints;

    console.log('[Advanced Caching] Server push hints prepared:', this.serverPushHints);
  }

  setupPreloadLinks() {
    // Add preload links to document head
    this.criticalResources.forEach(resource => {
      if (!this.serverPushResources.has(resource)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = resource;
        link.as = this.getResourceType(resource);

        // Add crossorigin for scripts
        if (resource.endsWith('.js')) {
          link.crossOrigin = 'anonymous';
        }

        document.head.appendChild(link);
        this.serverPushResources.add(resource);

        console.log(`[Advanced Caching] Added preload link for: ${resource}`);
      }
    });
  }

  getResourceType(resource) {
    if (resource.endsWith('.js')) { return 'script'; }
    if (resource.endsWith('.css')) { return 'style'; }
    if (resource.endsWith('.woff2') || resource.endsWith('.woff')) { return 'font'; }
    if (resource.match(/\.(png|jpg|jpeg|gif|svg)$/)) { return 'image'; }
    return 'fetch';
  }

  // Enhanced Service Worker Caching
  enhanceServiceWorkerCaching() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Advanced Caching] Service Worker not supported');
      return;
    }

    // Send caching configuration to service worker
    navigator.serviceWorker.ready.then(registration => {
      this.sendCacheConfigToSW(registration);
    });
  }

  sendCacheConfigToSW(registration) {
    const cacheConfig = {
      type: 'CACHE_CONFIG',
      config: {
        strategies: {
          '/api/artifacts': 'stale-while-revalidate',
          '/api/system': 'network-first',
          '/api/health': 'cache-first',
          '/js/': 'cache-first',
          '/css/': 'cache-first'
        },
        ttl: {
          '/api/artifacts': 5 * 60 * 1000,
          '/api/system': 30 * 1000,
          '/api/health': 60 * 1000,
          '/js/': 24 * 60 * 60 * 1000, // 24 hours
          '/css/': 24 * 60 * 60 * 1000
        }
      }
    };

    registration.active.postMessage(cacheConfig);
    console.log('[Advanced Caching] Cache configuration sent to service worker');
  }

  // Stale-While-Revalidate Implementation
  setupStaleWhileRevalidate() {
    // Configure stale-while-revalidate for specific endpoints
    this.staleWhileRevalidateConfig = {
      '/api/artifacts': {
        maxAge: 5 * 60 * 1000, // 5 minutes
        staleAge: 10 * 60 * 1000 // 10 minutes
      },
      '/api/search': {
        maxAge: 2 * 60 * 1000, // 2 minutes
        staleAge: 5 * 60 * 1000 // 5 minutes
      },
      '/api/system/status': {
        maxAge: 30 * 1000, // 30 seconds
        staleAge: 60 * 1000 // 1 minute
      }
    };
  }

  // Cache Management
  clearCache(pattern = null) {
    if (pattern) {
      // Clear specific pattern
      const keysToDelete = [];
      for (const [key, entry] of this.queryCache.entries()) {
        if (entry.url.includes(pattern)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.queryCache.delete(key));
      console.log(`[Advanced Caching] Cleared ${keysToDelete.length} cache entries matching: ${pattern}`);
    } else {
      // Clear all cache
      this.queryCache.clear();
      console.log('[Advanced Caching] Cleared all cache entries');
    }
  }

  invalidateCache(url) {
    const keysToDelete = [];
    for (const [key, entry] of this.queryCache.entries()) {
      if (entry.url === url || entry.url.includes(url)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.queryCache.delete(key));
    console.log(`[Advanced Caching] Invalidated ${keysToDelete.length} cache entries for: ${url}`);
  }

  // Cache Statistics
  getCacheStats() {
    const stats = {
      totalEntries: this.queryCache.size,
      totalSize: 0,
      hitRate: 0,
      entries: [],
      memoryUsage: 0
    };

    for (const [key, entry] of this.queryCache.entries()) {
      const entrySize = JSON.stringify(entry).length;
      stats.totalSize += entrySize;
      stats.memoryUsage += entrySize;

      stats.entries.push({
        key,
        url: entry.url,
        size: entrySize,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        expired: this.isCacheExpired(entry),
        stale: this.isCacheStale(entry)
      });
    }

    // Sort by age (newest first)
    stats.entries.sort((a, b) => a.age - b.age);

    return stats;
  }

  // Performance Monitoring
  getPerformanceMetrics() {
    const stats = this.getCacheStats();

    return {
      cacheStats: stats,
      serverPushResources: Array.from(this.serverPushResources),
      cacheConfig: this.cacheConfig,
      staleWhileRevalidateConfig: this.staleWhileRevalidateConfig
    };
  }

  // Cache Warming
  async warmCache(urls) {
    console.log(`[Advanced Caching] Warming cache for ${urls.length} URLs...`);

    const warmPromises = urls.map(async url => {
      try {
        await fetch(url);
        console.log(`[Advanced Caching] Warmed cache for: ${url}`);
      } catch (error) {
        console.error(`[Advanced Caching] Failed to warm cache for: ${url}`, error);
      }
    });

    await Promise.allSettled(warmPromises);
    console.log('[Advanced Caching] Cache warming completed');
  }

  // Automatic Cache Cleanup
  startCacheCleanup() {
    // Clean expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  cleanupExpiredEntries() {
    const expiredKeys = [];

    for (const [key, entry] of this.queryCache.entries()) {
      if (this.isCacheExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.queryCache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`[Advanced Caching] Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }
}

// HTTP/2 Server Push Helper
class ServerPushManager {
  constructor() {
    this.pushManifest = new Map();
    this.pushedResources = new Set();
  }

  addPushResource(route, resources) {
    this.pushManifest.set(route, resources);
  }

  getPushResources(route) {
    return this.pushManifest.get(route) || [];
  }

  generatePushHeaders(route) {
    const resources = this.getPushResources(route);

    return resources.map(resource => {
      const resourceType = this.getResourceType(resource);
      return `Link: <${resource}>; rel=preload; as=${resourceType}`;
    });
  }

  getResourceType(resource) {
    if (resource.endsWith('.js')) { return 'script'; }
    if (resource.endsWith('.css')) { return 'style'; }
    if (resource.endsWith('.woff2') || resource.endsWith('.woff')) { return 'font'; }
    if (resource.match(/\.(png|jpg|jpeg|gif|svg)$/)) { return 'image'; }
    return 'fetch';
  }
}

// Global instances
window.advancedCachingManager = new AdvancedCachingManager();
window.serverPushManager = new ServerPushManager();

// Setup default push resources
window.serverPushManager.addPushResource('/', [
  '/js/main.js',
  '/css/main.css',
  '/js/components/dashboard.js'
]);

window.serverPushManager.addPushResource('/chat', [
  '/js/components/chat.js',
  '/js/components/message-handler.js',
  '/js/components/ai-interface.js'
]);

window.serverPushManager.addPushResource('/artifacts', [
  '/js/components/artifacts.js',
  '/js/components/artifact-viewer.js',
  '/js/components/file-handler.js'
]);

// Start automatic cache cleanup
window.advancedCachingManager.startCacheCleanup();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AdvancedCachingManager,
    ServerPushManager
  };
}

console.log('[Advanced Caching] Script loaded');
