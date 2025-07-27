/**
 * DinoAir Rate Limiting Middleware
 * Protects API endpoints from abuse and ensures fair usage
 */

import { createHash } from 'crypto';

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';


// Types
export interface RateLimitConfig {
  windowMs: number;          // Time window in milliseconds
  maxRequests: number;       // Max requests per window
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
  keyGenerator?: (req: NextRequest) => string;  // Custom key generator
  handler?: (req: NextRequest) => NextResponse; // Custom response
  store?: RateLimitStore;    // Custom store implementation
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitInfo>;
  decrement(key: string): Promise<void>;
  reset(key: string): Promise<void>;
  resetAll(): Promise<void>;
}

// Default in-memory store
class MemoryStore implements RateLimitStore {
  private requests = new Map<string, {
    count: number;
    resetTime: number;
  }>();

  async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
    const now = Date.now();
    const resetTime = now + windowMs;

    let record = this.requests.get(key);
    
    // Clean up expired entries
    if (record && record.resetTime < now) {
      record = undefined;
    }

    if (!record) {
      record = { count: 1, resetTime };
      this.requests.set(key, record);
    } else {
      record.count++;
    }

    // Periodic cleanup of old entries
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }

    return {
      limit: 0, // Will be set by middleware
      current: record.count,
      remaining: 0, // Will be calculated by middleware
      resetTime: new Date(record.resetTime)
    };
  }

  async decrement(key: string): Promise<void> {
    const record = this.requests.get(key);
    if (record && record.count > 0) {
      record.count--;
    }
  }

  async reset(key: string): Promise<void> {
    this.requests.delete(key);
  }

  async resetAll(): Promise<void> {
    this.requests.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Fix for TypeScript iteration error
    const entries = Array.from(this.requests.entries());
    for (const [key, record] of entries) {
      if (record.resetTime < now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.requests.delete(key);
    }
  }
}

// Rate limit configurations for different endpoints
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Strict limits for auth endpoints
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3
  },
  
  // Moderate limits for chat/generation endpoints
  '/api/v1/chat': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10
  },
  '/api/generate-image': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5
  },
  
  // Lenient limits for read operations
  '/api/v1/models': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30
  },
  '/api/v1/artifacts': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60
  },
  
  // Default for all other endpoints
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100
  }
};

// Default key generator
function defaultKeyGenerator(req: NextRequest): string {
  // Use IP address + user ID (if authenticated) as key
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  const userId = req.headers.get('x-user-id') || '';
  
  return createHash('sha256')
    .update(`${ip}-${userId}`)
    .digest('hex');
}

// Default rate limit exceeded handler
function defaultHandler(_req: NextRequest, info: RateLimitInfo): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((info.resetTime.getTime() - Date.now()) / 1000),
      limit: info.limit,
      remaining: info.remaining,
      reset: info.resetTime.toISOString()
    },
    { 
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((info.resetTime.getTime() - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(info.limit),
        'X-RateLimit-Remaining': String(info.remaining),
        'X-RateLimit-Reset': info.resetTime.toISOString()
      }
    }
  );
}

// Shared stores for different rate limit windows
const stores = new Map<number, RateLimitStore>();

function getStore(windowMs: number): RateLimitStore {
  let store = stores.get(windowMs);
  if (!store) {
    store = new MemoryStore();
    stores.set(windowMs, store);
  }
  return store;
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimiter(config?: Partial<RateLimitConfig>) {
  const finalConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute default
    maxRequests: 100,    // 100 requests per minute default
    ...config
  };

  const keyGenerator = finalConfig.keyGenerator || defaultKeyGenerator;
  const handler = finalConfig.handler || defaultHandler;
  const store = finalConfig.store || getStore(finalConfig.windowMs);

  return async function rateLimitMiddleware(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(request);
    
    // Increment counter
    const info = await store.increment(key, finalConfig.windowMs);
    info.limit = finalConfig.maxRequests;
    info.remaining = Math.max(0, finalConfig.maxRequests - info.current);

    // Check if limit exceeded
    if (info.current > finalConfig.maxRequests) {
      return handler(request, info);
    }

    // Process request
    const response = await next();

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(info.limit));
    response.headers.set('X-RateLimit-Remaining', String(info.remaining));
    response.headers.set('X-RateLimit-Reset', info.resetTime.toISOString());

    // Optionally skip counting based on response
    if (finalConfig.skipSuccessfulRequests && response.status < 400) {
      await store.decrement(key);
    } else if (finalConfig.skipFailedRequests && response.status >= 400) {
      await store.decrement(key);
    }

    return response;
  };
}

/**
 * Get rate limiter for specific endpoint
 */
export function getRateLimiter(pathname: string) {
  // Find matching config
  let config = rateLimitConfigs[pathname];
  
  if (!config) {
    // Try prefix matching
    for (const [path, cfg] of Object.entries(rateLimitConfigs)) {
      if (pathname.startsWith(path)) {
        config = cfg;
        break;
      }
    }
  }

  // Use default if no match
  if (!config) {
    config = rateLimitConfigs.default;
  }

  return createRateLimiter(config);
}

/**
 * Combined rate limiting middleware for all endpoints
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  
  // Skip rate limiting for static assets and health checks
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/static/') ||
      pathname === '/api/health') {
    return next();
  }

  const limiter = getRateLimiter(pathname);
  return limiter(request, next);
}

/**
 * Advanced rate limiting features
 */
export class AdvancedRateLimiter {
  // Sliding window rate limiter
  static createSlidingWindow(config: RateLimitConfig) {
    const store = new Map<string, number[]>();
    
    return async function(
      request: NextRequest,
      next: () => Promise<NextResponse>
    ): Promise<NextResponse> {
      const key = (config.keyGenerator || defaultKeyGenerator)(request);
      const now = Date.now();
      const windowStart = now - config.windowMs;
      
      // Get or create request timestamps
      let timestamps = store.get(key) || [];
      
      // Remove old timestamps
      timestamps = timestamps.filter(t => t > windowStart);
      
      // Check if limit exceeded
      if (timestamps.length >= config.maxRequests) {
        const oldestTimestamp = timestamps[0];
        if (!oldestTimestamp) {
          throw new Error('No timestamps available for rate limit calculation');
        }
        const resetTime = new Date(oldestTimestamp + config.windowMs);
        
        return (config.handler || defaultHandler)(request, {
          limit: config.maxRequests,
          current: timestamps.length,
          remaining: 0,
          resetTime
        });
      }
      
      // Add current timestamp
      timestamps.push(now);
      store.set(key, timestamps);
      
      // Process request
      const response = await next();
      
      // Add headers
      const remaining = Math.max(0, config.maxRequests - timestamps.length);
      response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
      response.headers.set('X-RateLimit-Remaining', String(remaining));
      
      return response;
    };
  }

  // Token bucket rate limiter
  static createTokenBucket(config: {
    capacity: number;
    refillRate: number; // tokens per second
    keyGenerator?: (req: NextRequest) => string;
  }) {
    const buckets = new Map<string, {
      tokens: number;
      lastRefill: number;
    }>();
    
    return async function(
      request: NextRequest,
      next: () => Promise<NextResponse>
    ): Promise<NextResponse> {
      const key = (config.keyGenerator || defaultKeyGenerator)(request);
      const now = Date.now();
      
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { tokens: config.capacity, lastRefill: now };
        buckets.set(key, bucket);
      }
      
      // Refill tokens
      const timeSinceLastRefill = (now - bucket.lastRefill) / 1000;
      const tokensToAdd = timeSinceLastRefill * config.refillRate;
      bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
      
      // Check if we have tokens
      if (bucket.tokens < 1) {
        const waitTime = (1 - bucket.tokens) / config.refillRate;
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Token bucket empty',
            retryAfter: Math.ceil(waitTime)
          },
          { status: 429 }
        );
      }
      
      // Consume token
      bucket.tokens -= 1;
      
      // Process request
      const response = await next();
      
      // Add headers
      response.headers.set('X-RateLimit-Tokens', String(Math.floor(bucket.tokens)));
      response.headers.set('X-RateLimit-Capacity', String(config.capacity));
      
      return response;
    };
  }
}

// Export default middleware
export default rateLimitMiddleware;
