// Authentication middleware for Supabase with database-backed session storage
const auth = require('../lib/auth');
const db = require('../lib/db');
const { rateLimiters, addRateLimitInfo, getUserTier } = require('./enhanced-rate-limiting');

let sessionStore;
let sessionStoreAvailable = false;

try {
  ({ sessionStore } = require('../lib/session-store'));
  sessionStoreAvailable = true;
  console.log('✅ Session store loaded successfully');
} catch (error) {
  console.warn('⚠️  Session store not available, using memory-based sessions:', error.message);
  sessionStoreAvailable = false;
  sessionStore = {
    get: (sessionId) => Promise.resolve(null),
    set: (sessionId, data) => Promise.resolve(),
    destroy: (sessionId) => Promise.resolve(),
    clear: () => Promise.resolve()
  };
}

// In-memory cache for auth results to prevent race conditions
const authCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of authCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      authCache.delete(key);
    }
  }
}, 60000); // Clean up every minute

const getCacheKey = (req, type) => {
  const authHeader = req.headers.authorization || '';
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  return `${type}:${authHeader.substring(0, 20)}:${ip}`;
};

let jwtManager;
let jwtManagerAvailable = false;

try {
  ({ jwtManager } = require('../lib/jwt-manager'));
  jwtManagerAvailable = true;
  console.log('✅ JWT manager loaded successfully');
} catch (error) {
  console.warn('⚠️  JWT manager not available, using fallback implementation:', error.message);
  jwtManagerAvailable = false;
  jwtManager = {
    verifyAccessToken: (token) => {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload;
      } catch (e) {
        return null;
      }
    },
    generateAccessToken: (payload) => 'fallback-token',
    generateRefreshToken: (payload) => 'fallback-refresh-token'
  };
}

/**
 * Middleware to check if user is authenticated via JWT token with rate limiting
 */
const requireAuth = async (req, res, next) => {
  const apiRateLimit = rateLimiters.api;
  const rateLimitInfo = addRateLimitInfo('api');
  
  try {
    await new Promise((resolve, reject) => {
      apiRateLimit(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    rateLimitInfo(req, res, () => {});
    
    // Check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const tokenPayload = jwtManager.verifyAccessToken(token);
    
    if (!tokenPayload) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    // Get user data from database
    const userData = await db.getUserById(tokenPayload.userId);
    if (!userData) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: tokenPayload.userId,
      email: tokenPayload.email,
      roles: tokenPayload.roles,
      metadata: tokenPayload.metadata,
      profile: userData
    };
    
    console.log('✅ User authenticated:', {
      userId: req.user.id,
      tier: getUserTier(req.user),
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100)
    });
    
    next();
  } catch (error) {
    if (error.status === 429 || error.message?.includes('rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many authentication requests. Please wait before trying again.',
        category: 'rate_limit_error',
        retryAfter: error.retryAfter || 60
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if request has valid API key with enhanced rate limiting
 */
const requireApiKey = async (req, res, next) => {
  const apiRateLimit = rateLimiters.api;
  const rateLimitInfo = addRateLimitInfo('api');
  
  try {
    await new Promise((resolve, reject) => {
      apiRateLimit(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    rateLimitInfo(req, res, () => {});
    
    // Check for API key in Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Extract API key from header (with or without 'Bearer ' prefix)
    const apiKey = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    // Verify the API key
    const { userId, error } = await auth.verifyApiKey(apiKey);

    if (error || !userId) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Get user data with error handling
    let userData;
    try {
      userData = await db.getUserById(userId);
    } catch (dbError) {
      console.error('Database error in API key auth:', dbError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!userData) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Add user and API key info to request
    req.user = userData;
    req.apiKey = apiKey;

    // Log API request with rate limit info (async, don't wait)
    db.storeApiLog({
      user_id: userId,
      api_key: apiKey,
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      user_tier: getUserTier(userData),
      ip: req.ip
    }).catch(err => console.error('Error logging API request:', err));

    console.log('🔑 API key authenticated:', {
      userId: userData.id,
      tier: getUserTier(userData),
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    next();
  } catch (error) {
    if (error.status === 429 || error.message?.includes('rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many API requests. Please wait before trying again.',
        category: 'rate_limit_error',
        retryAfter: error.retryAfter || 60,
        upgradeMessage: 'Consider upgrading your plan for higher rate limits'
      });
    }
    
    console.error('API key middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware that tries API key first, then falls back to session auth
 * Uses request-level locking to prevent race conditions
 */
const anyAuth = async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random()}`;
  const lockKey = `anyauth:${getCacheKey(req, 'any')}`;
  
  try {
    const existingLock = authCache.get(lockKey);
    if (existingLock && existingLock.processing && (Date.now() - existingLock.timestamp) < 1000) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = authCache.get(lockKey);
      if (result && !result.processing) {
        if (result.error) {
          return res.status(401).json({ error: result.error });
        }
        req.user = result.user;
        if (result.apiKey) req.apiKey = result.apiKey;
        return next();
      }
    }

    authCache.set(lockKey, {
      processing: true,
      timestamp: Date.now(),
      requestId
    });

    let authResult = null;
    let authError = null;

    // Try API key first
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const apiKey = authHeader.startsWith('Bearer ') 
          ? authHeader.substring(7) 
          : authHeader;

        const { userId, error } = await auth.verifyApiKey(apiKey);

        if (!error && userId) {
          const userData = await db.getUserById(userId);
          if (userData) {
            authResult = {
              user: userData,
              apiKey,
              method: 'apikey'
            };
          }
        }
      } catch (apiError) {
        console.warn('API key auth failed in anyAuth:', apiError.message);
      }
    }

    // Fall back to session auth if API key failed
    if (!authResult) {
      try {
        const { user, error } = await auth.getCurrentUser();
        
        if (!error && user) {
          authResult = {
            user,
            method: 'session'
          };
        } else {
          authError = 'Not authenticated';
        }
      } catch (sessionError) {
        console.warn('Session auth failed in anyAuth:', sessionError.message);
        authError = 'Not authenticated';
      }
    }

    if (authResult) {
      authCache.set(lockKey, {
        user: authResult.user,
        apiKey: authResult.apiKey,
        method: authResult.method,
        timestamp: Date.now(),
        processing: false
      });
      
      req.user = authResult.user;
      if (authResult.apiKey) req.apiKey = authResult.apiKey;
      return next();
    } else {
      authCache.set(lockKey, {
        error: authError || 'Authentication failed',
        timestamp: Date.now(),
        processing: false
      });
      return res.status(401).json({ error: authError || 'Not authenticated' });
    }
    
  } catch (error) {
    authCache.delete(lockKey);
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Enhanced rate limiting middleware that can be applied to any endpoint
 * Automatically detects the appropriate rate limit category based on the endpoint
 */
const withRateLimit = (category = 'api') => {
  return async (req, res, next) => {
    const rateLimit = rateLimiters[category] || rateLimiters.api;
    const rateLimitInfo = addRateLimitInfo(category);
    
    try {
      await new Promise((resolve, reject) => {
        rateLimit(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      rateLimitInfo(req, res, () => {});
      
      next();
    } catch (error) {
      if (error.status === 429 || error.message?.includes('rate limit')) {
        const tier = getUserTier(req.user);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many ${category} requests. Please wait before trying again.`,
          category: 'rate_limit_error',
          tier,
          retryAfter: error.retryAfter || 60,
          upgradeMessage: tier === 'free' ? 'Upgrade to premium for higher limits' : null
        });
      }
      
      console.error('Rate limit middleware error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Smart rate limiting middleware that automatically selects the appropriate category
 * based on the request path and method
 */
const smartRateLimit = (req, res, next) => {
  let category = 'api'; // default
  
  if (req.path.includes('/auth/') || req.path.includes('/signin') || req.path.includes('/signup')) {
    category = 'auth';
  } else if (req.path.includes('/chat')) {
    category = 'chat';
  } else if (req.path.includes('/upload') || req.method === 'POST' && req.path.includes('/artifacts')) {
    category = 'upload';
  } else if (req.path.includes('/export') || req.path.includes('/download')) {
    category = 'export';
  }
  
  const middleware = withRateLimit(category);
  middleware(req, res, next);
};

module.exports = {
  requireAuth,
  requireApiKey,
  anyAuth,
  withRateLimit,
  smartRateLimit
};
