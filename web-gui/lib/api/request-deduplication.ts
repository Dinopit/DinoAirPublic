import type { RequestConfig } from './enhanced-client';

interface InFlightRequest {
  promise: Promise<Response>;
  timestamp: number;
  requestId: string;
}

// Request deduplication middleware for preventing duplicate API calls
export class RequestDeduplication {
  private inFlightRequests: Map<string, InFlightRequest> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxAge: number = 30000; // 30 seconds max age for in-flight requests

  constructor(maxAge?: number) {
    if (maxAge) {
      this.maxAge = maxAge;
    }

    // Start cleanup interval to remove old in-flight requests
    this.startCleanupInterval();
  }

  /**
   * Generate a unique key for a request based on URL and relevant parameters
   */
  private generateRequestKey(url: string, config: RequestConfig): string {
    const method = config.method || 'GET';
    const body = config.body || '';
    
    // Create a stable key based on method, URL, and body
    // For GET requests, include query parameters in the URL
    let key = `${method}:${url}`;
    
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      // Include body in key for requests that send data
      key += `:${this.hashString(body.toString())}`;
    }
    
    // Include important headers that might affect the response
    const headers = config.headers;
    if (headers) {
      const headerEntries = headers instanceof Headers
        ? Array.from(headers.entries())
        : Object.entries(headers);
        
      const importantHeaders = headerEntries
        .filter(([key]) => 
          key.toLowerCase() === 'authorization' || 
          key.toLowerCase() === 'accept' ||
          key.toLowerCase() === 'content-type'
        )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
        
      if (importantHeaders) {
        key += `:${this.hashString(importantHeaders)}`;
      }
    }
    
    return key;
  }

  /**
   * Simple hash function for consistent string hashing
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if a request is dedupable (only GET requests by default)
   */
  private isDedupable(config: RequestConfig): boolean {
    const method = config.method || 'GET';
    
    // Only dedupe GET requests by default
    // POST/PUT/PATCH/DELETE can have side effects
    if (method !== 'GET') {
      return false;
    }
    
    // Check if deduplication is explicitly disabled
    if (config.skipDeduplication) {
      return false;
    }
    
    return true;
  }

  /**
   * Wrap a request with deduplication logic
   */
  public async deduplicate(
    url: string,
    config: RequestConfig,
    requestFn: () => Promise<Response>
  ): Promise<Response> {
    // Check if request is dedupable
    if (!this.isDedupable(config)) {
      return requestFn();
    }

    const requestKey = this.generateRequestKey(url, config);
    const existing = this.inFlightRequests.get(requestKey);

    // If there's an existing in-flight request, return its promise
    if (existing) {
      console.debug(`[Deduplication] Returning existing request for ${requestKey}`);
      return existing.promise.then(response => response.clone());
    }

    // Create a new request ID for tracking
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Execute the request and store the promise
    const requestPromise = requestFn()
      .then(response => {
        // Remove from in-flight requests on success
        this.removeInFlightRequest(requestKey, requestId);
        return response;
      })
      .catch(error => {
        // Remove from in-flight requests on error
        this.removeInFlightRequest(requestKey, requestId);
        throw error;
      });

    // Store the in-flight request
    this.inFlightRequests.set(requestKey, {
      promise: requestPromise,
      timestamp: Date.now(),
      requestId
    });

    console.debug(`[Deduplication] New request initiated for ${requestKey}`);
    return requestPromise;
  }

  /**
   * Remove an in-flight request if it matches the request ID
   */
  private removeInFlightRequest(key: string, requestId: string): void {
    const existing = this.inFlightRequests.get(key);
    if (existing && existing.requestId === requestId) {
      this.inFlightRequests.delete(key);
      console.debug(`[Deduplication] Removed completed request ${key}`);
    }
  }

  /**
   * Start the cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      return;
    }

    // Run cleanup every 10 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 10000);

    // Clean up interval when in Node environment
    if (typeof process !== 'undefined' && process.on) {
      process.on('exit', () => this.destroy());
    }
  }

  /**
   * Clean up old in-flight requests
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.inFlightRequests.forEach((request, key) => {
      if (now - request.timestamp > this.maxAge) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.inFlightRequests.delete(key);
      console.debug(`[Deduplication] Cleaned up stale request ${key}`);
    });

    if (keysToDelete.length > 0) {
      console.debug(`[Deduplication] Cleaned up ${keysToDelete.length} stale requests`);
    }
  }

  /**
   * Get the number of in-flight requests
   */
  public getInFlightCount(): number {
    return this.inFlightRequests.size;
  }

  /**
   * Clear all in-flight requests
   */
  public clear(): void {
    this.inFlightRequests.clear();
    console.debug('[Deduplication] Cleared all in-flight requests');
  }

  /**
   * Destroy the deduplication instance
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  /**
   * Get statistics about deduplication
   */
  public getStats(): {
    inFlightCount: number;
    oldestRequestAge: number | null;
    requestKeys: string[];
  } {
    const now = Date.now();
    let oldestAge: number | null = null;

    this.inFlightRequests.forEach(request => {
      const age = now - request.timestamp;
      if (oldestAge === null || age > oldestAge) {
        oldestAge = age;
      }
    });

    return {
      inFlightCount: this.inFlightRequests.size,
      oldestRequestAge: oldestAge,
      requestKeys: Array.from(this.inFlightRequests.keys())
    };
  }
}

// Create a singleton instance
export const requestDeduplication = new RequestDeduplication();

// Extend RequestConfig to include deduplication option
declare module './enhanced-client' {
  interface RequestConfig {
    skipDeduplication?: boolean;
  }
}
