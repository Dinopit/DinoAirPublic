/**
 * Enhanced Rate Limiting Middleware
 * User-specific rate limiting with different quotas for endpoint categories
 */

const rateLimit = require('express-rate-limit');

let RedisStore, Redis;
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

// In-memory store for development (replace with Redis in production)
class MemoryStore {
  constructor() {
    this.hits = new Map();
    this.resetTime = new Map();
  }

  async incr(key) {
    const now = Date.now();
    const resetTime = this.resetTime.get(key) || now;
    
    if (now > resetTime) {
      this.hits.set(key, 1);
      return { totalHits: 1, timeToExpire: null };
    }
    
    const currentHits = this.hits.get(key) || 0;
    const newHits = currentHits + 1;
    this.hits.set(key, newHits);
    
    return { 
      totalHits: newHits, 
      timeToExpire: Math.max(0, resetTime - now) 
    };
  }

  async decrement(key) {
    const currentHits = this.hits.get(key) || 0;
    if (currentHits > 0) {
      this.hits.set(key, currentHits - 1);
    }
  }

  async resetKey(key) {
    this.hits.delete(key);
    this.resetTime.delete(key);
  }

  setResetTime(key, resetTime) {
    this.resetTime.set(key, resetTime);
  }
}

// Create store instance (use Redis if available, otherwise memory store)
const store = (redisAvailable && process.env.REDIS_URL) ? 
  new RedisStore({
    sendCommand: (...args) => Redis.createClient({ url: process.env.REDIS_URL }).sendCommand(args),
  }) : 
  new MemoryStore();

// Rate limit configurations for different user tiers and endpoint categories
const RATE_LIMITS = {
  // Authentication endpoints - strictest limits
  auth: {
    free: { windowMs: 15 * 60 * 1000, max: 5 },      // 5 requests per 15 minutes
    premium: { windowMs: 15 * 60 * 1000, max: 10 },   // 10 requests per 15 minutes
    enterprise: { windowMs: 15 * 60 * 1000, max: 20 } // 20 requests per 15 minutes
  },
  
  // File upload endpoints - moderate limits
  upload: {
    free: { windowMs: 60 * 1000, max: 5 },           // 5 uploads per minute
    premium: { windowMs: 60 * 1000, max: 20 },       // 20 uploads per minute
    enterprise: { windowMs: 60 * 1000, max: 50 }     // 50 uploads per minute
  },
  
  // API endpoints - general limits
  api: {
    free: { windowMs: 15 * 60 * 1000, max: 100 },    // 100 requests per 15 minutes
    premium: { windowMs: 15 * 60 * 1000, max: 500 }, // 500 requests per 15 minutes
    enterprise: { windowMs: 15 * 60 * 1000, max: 2000 } // 2000 requests per 15 minutes
  },
  
  // Chat endpoints - high frequency allowed
  chat: {
    free: { windowMs: 60 * 1000, max: 30 },          // 30 messages per minute
    premium: { windowMs: 60 * 1000, max: 100 },      // 100 messages per minute
    enterprise: { windowMs: 60 * 1000, max: 200 }    // 200 messages per minute
  },
  
  // Export/download endpoints
  export: {
    free: { windowMs: 60 * 1000, max: 10 },          // 10 exports per minute
    premium: { windowMs: 60 * 1000, max: 50 },       // 50 exports per minute
    enterprise: { windowMs: 60 * 1000, max: 100 }    // 100 exports per minute
  }
};

/**
 * Get user's rate limit tier based on their plan
 */
function getUserTier(user) {
  if (!user) return 'free';
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
  } else {
    // IP-based rate limiting for unauthenticated requests
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    return `rate_limit:${category}:ip:${ip}`;
  }
}

/**
 * Create enhanced rate limiter for specific category
 */
function createEnhancedRateLimit(category, options = {}) {
  return rateLimit({
    store: store,
    
    // Dynamic window and max based on user tier
    windowMs: (req) => {
      const tier = getUserTier(req.user);
      const config = RATE_LIMITS[category]?.[tier] || RATE_LIMITS.api.free;
      return config.windowMs;
    },
    
    max: (req) => {
      const tier = getUserTier(req.user);
      const config = RATE_LIMITS[category]?.[tier] || RATE_LIMITS.api.free;
      return config.max;
    },
    
    // Custom key generator
    keyGenerator: (req) => generateKey(req, category),
    
    // Enhanced error message with user-specific information
    message: (req) => {
      const tier = getUserTier(req.user);
      const config = RATE_LIMITS[category]?.[tier] || RATE_LIMITS.api.free;
      
      return {
        error: 'Rate limit exceeded',
        message: `Too many ${category} requests. Limit: ${config.max} requests per ${Math.round(config.windowMs / 60000)} minutes.`,
        category,
        tier,
        limit: config.max,
        windowMs: config.windowMs,
        retryAfter: Math.ceil(config.windowMs / 1000)
      };
    },
    
    // Include rate limit headers
    standardHeaders: true,
    legacyHeaders: false,
    
    // Custom headers with additional information (onLimitReached is deprecated in v7)
    
    // Skip rate limiting for certain conditions
    skip: (req) => {
      // Skip rate limiting for admin users
      if (req.user?.roles?.includes('admin')) {
        return true;
      }
      
      // Skip for health checks
      if (req.path.includes('/health')) {
        return true;
      }
      
      return false;
    },
    
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
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
    },
    
    ...options
  });
}

/**
 * Middleware to add rate limit information to all responses
 */
const addRateLimitInfo = (category) => {
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
 * Get current rate limit status for a user
 */
async function getRateLimitStatus(userId, category) {
  try {
    const key = `rate_limit:${category}:user:${userId}`;
    const result = await store.incr(key);
    
    // Decrement immediately since we're just checking
    await store.decrement(key);
    
    const tier = 'free'; // Would need user object to determine actual tier
    const config = RATE_LIMITS[category]?.[tier] || RATE_LIMITS.api.free;
    
    return {
      category,
      tier,
      current: result.totalHits || 0,
      limit: config.max,
      windowMs: config.windowMs,
      remaining: Math.max(0, config.max - (result.totalHits || 0)),
      resetTime: Date.now() + (result.timeToExpire || config.windowMs)
    };
  } catch (error) {
    console.error('Error getting rate limit status:', error);
    return null;
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
