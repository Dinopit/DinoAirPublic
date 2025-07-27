import type { NextRequest } from 'next/server';

import { getApiKeyConfig } from './api-auth';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory storage for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if a request is within rate limits
 * @param request The incoming request
 * @param identifier The identifier for rate limiting (API key or IP)
 * @returns Rate limit result
 */
export function checkRateLimit(request: NextRequest, identifier: string): RateLimitResult {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  // Get rate limit based on API key or use default
  const authHeader = request.headers.get('authorization');
  const cleanKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const apiKeyConfig = cleanKey ? getApiKeyConfig(cleanKey) : null;
  const limit = apiKeyConfig?.rateLimit || 30; // Default 30 requests per minute for non-authenticated
  
  const key = `${identifier}:${Math.floor(now / windowMs)}`;
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    // First request in this window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor((now + windowMs) / 1000)
    };
  }
  
  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset: Math.floor(entry.resetTime / 1000)
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    limit,
    remaining: limit - entry.count,
    reset: Math.floor(entry.resetTime / 1000)
  };
}

/**
 * Get rate limit headers for response
 * @param result Rate limit result
 * @returns Headers object
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString()
  };
}

/**
 * Get client identifier for rate limiting
 * @param request The incoming request
 * @returns Client identifier (API key or IP)
 */
export function getClientIdentifier(request: NextRequest): string {
  // First try to use API key
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const cleanKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (cleanKey) return `api:${cleanKey}`;
  }
  
  // Fall back to IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}
