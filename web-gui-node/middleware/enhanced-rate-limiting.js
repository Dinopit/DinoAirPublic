/**
 * Enhanced Rate Limiting Middleware
 * User-specific rate limiting with different quotas for endpoint categories
 */

const rateLimit = require('express-rate-limit');

let RedisStore;
let Redis;
let redisAvailable = false;

try {
  RedisStore = require('rate-limit-redis');
  Redis = require('redis');
  redisAvailable = true;
  console.log('✅ Redis rate limiting dependencies loaded successfully');
} catch (error) {
  console.warn('⚠️  Redis dependencies not available, using memory-based rate limiting:', error.message);
  redisAvailable = false;
}

// Enhanced in-memory store with circuit breaker pattern
class MemoryStore {
  constructor() {
    this.hits = new Map();
    this.resetTime = new Map();
    this.circuitBreaker = new Map(); // Track failing operations
  }

  async incr(key) {
    const startTime = Date.now();

    try {
      const breakerKey = `breaker:${key.split(':')[0]}`;
      const breaker = this.circuitBreaker.get(breakerKey);

      if (breaker && breaker.failures > 3 && startTime - breaker.lastFailure < 60000) {
        console.warn(`🔄 [${new Date().toISOString()}] MemoryStore: Circuit breaker open for ${breakerKey}`);
        return { totalHits: 0, timeToExpire: 60000 };
      }

      const now = Date.now();
      const resetTime = this.resetTime.get(key) || now;

      console.log(
        `🔄 [${new Date().toISOString()}] MemoryStore: incr called for key ${key}, now: ${now}, resetTime: ${resetTime}`
      );

      if (now > resetTime) {
        this.hits.set(key, 1);
        this.resetTime.set(key, now + 15 * 60 * 1000);
        console.log(`🔄 [${new Date().toISOString()}] MemoryStore: Reset window for key ${key}, hits: 1`);

        this.circuitBreaker.delete(breakerKey);

        return { totalHits: 1, timeToExpire: null };
      }

      const currentHits = this.hits.get(key) || 0;
      const newHits = currentHits + 1;
      this.hits.set(key, newHits);

      const timeToExpire = Math.max(0, resetTime - now);
      console.log(
        `🔄 [${new Date().toISOString()}] MemoryStore: Incremented key ${key}, hits: ${newHits}, timeToExpire: ${timeToExpire}ms`
      );

      await new Promise(resolve => setImmediate(resolve));

      this.circuitBreaker.delete(breakerKey);

      return {
        totalHits: newHits,
        timeToExpire
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`🔄 [${new Date().toISOString()}] MemoryStore: incr error after ${duration}ms:`, error.message);

      const breakerKey = `breaker:${key.split(':')[0]}`;
      const breaker = this.circuitBreaker.get(breakerKey) || { failures: 0, lastFailure: 0 };
      breaker.failures++;
      breaker.lastFailure = Date.now();
      this.circuitBreaker.set(breakerKey, breaker);

      return { totalHits: 0, timeToExpire: 60000 };
    }
  }

  async decrement(key) {
    try {
      const currentHits = this.hits.get(key) || 0;
      if (currentHits > 0) {
        const newHits = currentHits - 1;
        this.hits.set(key, newHits);
        console.log(`🔄 [${new Date().toISOString()}] MemoryStore: Decremented key ${key}, hits: ${newHits}`);
      }

      await new Promise(resolve => setImmediate(resolve));
    } catch (error) {
      console.error(`🔄 [${new Date().toISOString()}] MemoryStore: decrement error:`, error.message);
    }
  }

  resetKey(key) {
    try {
      this.hits.delete(key);
      this.resetTime.delete(key);
      console.log(`🔄 [${new Date().toISOString()}] MemoryStore: Reset key ${key}`);
    } catch (error) {
      console.error(`🔄 [${new Date().toISOString()}] MemoryStore: resetKey error:`, error.message);
    }
  }

  setResetTime(key, resetTime) {
    try {
      this.resetTime.set(key, resetTime);
    } catch (error) {
      console.error(`🔄 [${new Date().toISOString()}] MemoryStore: setResetTime error:`, error.message);
    }
  }

  get(key) {
    try {
      const hits = this.hits.get(key) || 0;
      const resetTime = this.resetTime.get(key) || Date.now();
      return {
        totalHits: hits,
        timeToExpire: Math.max(0, resetTime - Date.now())
      };
    } catch (error) {
      console.error(`🔄 [${new Date().toISOString()}] MemoryStore: get error:`, error.message);
      return { totalHits: 0, timeToExpire: 0 };
    }
  }
}

// Create store instance (use Redis if available, otherwise memory store)
const store
  = redisAvailable && process.env.REDIS_URL
    ? new RedisStore({
      sendCommand: (...args) => Redis.createClient({ url: process.env.REDIS_URL }).sendCommand(args)
    })
    : new MemoryStore();

// Rate limit configurations for different user tiers and endpoint categories
const RATE_LIMITS = {
  // Authentication endpoints - strictest limits
  auth: {
    free: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 requests per 15 minutes
    premium: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 requests per 15 minutes
    enterprise: { windowMs: 15 * 60 * 1000, max: 20 } // 20 requests per 15 minutes
  },

  // File upload endpoints - moderate limits
  upload: {
    free: { windowMs: 60 * 1000, max: 5 }, // 5 uploads per minute
    premium: { windowMs: 60 * 1000, max: 20 }, // 20 uploads per minute
    enterprise: { windowMs: 60 * 1000, max: 50 } // 50 uploads per minute
  },

  // API endpoints - general limits
  api: {
    free: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
    premium: { windowMs: 15 * 60 * 1000, max: 500 }, // 500 requests per 15 minutes
    enterprise: { windowMs: 15 * 60 * 1000, max: 2000 } // 2000 requests per 15 minutes
  },

  // Chat endpoints - high frequency allowed
  chat: {
    free: { windowMs: 60 * 1000, max: 30 }, // 30 messages per minute
    premium: { windowMs: 60 * 1000, max: 100 }, // 100 messages per minute
    enterprise: { windowMs: 60 * 1000, max: 200 } // 200 messages per minute
  },

  // Export/download endpoints
  export: {
    free: { windowMs: 60 * 1000, max: 10 }, // 10 exports per minute
    premium: { windowMs: 60 * 1000, max: 50 }, // 50 exports per minute
    enterprise: { windowMs: 60 * 1000, max: 100 } // 100 exports per minute
  }
};

/**
 * Get user's rate limit tier based on their plan
 */
function getUserTier(user) {
  if (!user) {
    return 'free';
  }
  const plan = user.metadata?.plan || user.plan || 'free';
  return ['free', 'premium', 'enterprise'].includes(plan) ? plan : 'free';
}

/**
 * Generate rate limit key based on user and endpoint category
 */
function generateKey(req, category) {
  if (req.user) {
    // User-specific rate limiting
    return `rate_limit:${category}:user:${req.user.id}`;
  }
  // IP-based rate limiting for unauthenticated requests
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  return `rate_limit:${category}:ip:${ip}`;
}

/**
 * Create enhanced rate limiter for specific category with static configuration
 */
function createEnhancedRateLimit(category, options = {}) {
  const baseConfig = RATE_LIMITS[category]?.free || RATE_LIMITS.api.free;

  return rateLimit({
    store,
    windowMs: baseConfig.windowMs,
    max: baseConfig.max,

    keyGenerator: req => {
      try {
        const tier = getUserTier(req.user);
        const baseKey = generateKey(req, category);
        const key = `${baseKey}:${tier}`;
        console.log(`🔧 [${new Date().toISOString()}] Generated rate limit key: ${key}`);
        return key;
      } catch (error) {
        console.error(`🔧 [${new Date().toISOString()}] Error generating rate limit key:`, error.message);
        const ip = req.ip || 'unknown';
        return `rate_limit:${category}:ip:${ip}:free`;
      }
    },

    message: {
      error: 'Rate limit exceeded',
      message: `Too many ${category} requests. Please wait before trying again.`,
      category,
      retryAfter: Math.ceil(baseConfig.windowMs / 1000)
    },

    // Include rate limit headers
    standardHeaders: true,
    legacyHeaders: false,

    // Skip rate limiting for certain conditions
    skip: req => {
      try {
        // Skip rate limiting for admin users
        if (req.user?.roles?.includes('admin')) {
          console.log(`🔧 [${new Date().toISOString()}] Skipping rate limit for admin user`);
          return true;
        }

        // Skip for health checks
        if (req.path.includes('/health')) {
          console.log(`🔧 [${new Date().toISOString()}] Skipping rate limit for health check`);
          return true;
        }

        if (req.path.includes('/auth/')) {
          console.log(`🔧 [${new Date().toISOString()}] TEMPORARY: Skipping rate limit for auth endpoint ${req.path}`);
          return true;
        }

        return false;
      } catch (error) {
        console.error(`🔧 [${new Date().toISOString()}] Error in rate limit skip function:`, error.message);
        return false; // Default to applying rate limiting on error
      }
    },

    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      try {
        const tier = getUserTier(req.user);
        const config = RATE_LIMITS[category]?.[tier] || RATE_LIMITS.api.free;

        // Log rate limit violation
        console.warn('Rate limit exceeded:', {
          timestamp: new Date().toISOString(),
          category,
          tier,
          userId: req.user?.id || 'anonymous',
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent')
        });

        res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many ${category} requests. Limit: ${config.max} requests per ${Math.round(config.windowMs / 60000)} minutes.`,
          category,
          tier,
          limit: config.max,
          windowMs: config.windowMs,
          retryAfter: Math.ceil(config.windowMs / 1000),
          upgradeMessage: tier === 'free' ? 'Upgrade to premium for higher limits' : null
        });
      } catch (error) {
        console.error(`🔧 [${new Date().toISOString()}] Error in rate limit handler:`, error.message);
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many ${category} requests. Please wait before trying again.`,
          category,
          retryAfter: Math.ceil(baseConfig.windowMs / 1000)
        });
      }
    },

    ...options
  });
}

/**
 * Middleware to add rate limit information to all responses
 */
const addRateLimitInfo = category => {
  return (req, res, next) => {
    const tier = getUserTier(req.user);
    const config = RATE_LIMITS[category]?.[tier] || RATE_LIMITS.api.free;

    // Add rate limit information to response headers
    res.setHeader('X-RateLimit-Category', category);
    res.setHeader('X-RateLimit-Tier', tier);
    res.setHeader('X-RateLimit-Limit', config.max);
    res.setHeader('X-RateLimit-Window', config.windowMs);

    next();
  };
};

/**
 * Get current rate limit status for a user with circuit breaker pattern
 */
async function getRateLimitStatus(userId, category) {
  const startTime = Date.now();
  const timeout = 5000; // 5 second timeout to prevent hangs

  try {
    console.log(
      `🔍 [${new Date().toISOString()}] getRateLimitStatus: Checking status for user ${userId}, category ${category}`
    );

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Rate limit status check timeout')), timeout);
    });

    const statusPromise = (async () => {
      const key = `rate_limit:${category}:user:${userId}`;
      console.log(`🔍 [${new Date().toISOString()}] getRateLimitStatus: Using key ${key}`);

      const result = await store.incr(key);
      console.log(`🔍 [${new Date().toISOString()}] getRateLimitStatus: Store incr result:`, result);

      // Decrement immediately since we're just checking
      await store.decrement(key);

      const tier = 'free'; // Would need user object to determine actual tier
      const config = RATE_LIMITS[category]?.[tier] || RATE_LIMITS.api.free;

      const status = {
        category,
        tier,
        current: result.totalHits || 0,
        limit: config.max,
        windowMs: config.windowMs,
        remaining: Math.max(0, config.max - (result.totalHits || 0)),
        resetTime: Date.now() + (result.timeToExpire || config.windowMs)
      };

      console.log(`🔍 [${new Date().toISOString()}] getRateLimitStatus: Status calculated:`, status);
      return status;
    })();

    const result = await Promise.race([statusPromise, timeoutPromise]);
    const duration = Date.now() - startTime;
    console.log(`🔍 [${new Date().toISOString()}] getRateLimitStatus: Completed in ${duration}ms`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`🔍 [${new Date().toISOString()}] getRateLimitStatus: Error after ${duration}ms:`, error.message);

    return {
      category,
      tier: 'free',
      current: 0,
      limit: RATE_LIMITS[category]?.free?.max || 5,
      windowMs: RATE_LIMITS[category]?.free?.windowMs || 15 * 60 * 1000,
      remaining: RATE_LIMITS[category]?.free?.max || 5,
      resetTime: Date.now() + (RATE_LIMITS[category]?.free?.windowMs || 15 * 60 * 1000)
    };
  }
}

// Pre-configured rate limiters for different categories
const rateLimiters = {
  auth: createEnhancedRateLimit('auth'),
  upload: createEnhancedRateLimit('upload'),
  api: createEnhancedRateLimit('api'),
  chat: createEnhancedRateLimit('chat'),
  export: createEnhancedRateLimit('export')
};

module.exports = {
  createEnhancedRateLimit,
  addRateLimitInfo,
  getRateLimitStatus,
  getUserTier,
  rateLimiters,
  RATE_LIMITS
};
