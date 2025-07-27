// Authentication middleware for Supabase with database-backed session storage
console.log(`🛡️  [${new Date().toISOString()}] AuthMiddleware: Loading authentication middleware...`);
const auth = require('../lib/auth');
const db = require('../lib/db');
const { rateLimiters, addRateLimitInfo, getUserTier } = require('./enhanced-rate-limiting');
const { MFAManager } = require('../lib/mfa-manager');
const { AuditLogger } = require('../lib/audit-logger');
console.log(
  `🛡️  [${new Date().toISOString()}] AuthMiddleware: Authentication middleware dependencies loaded successfully`
);

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
    get: sessionId => Promise.resolve(null),
    set: (sessionId, data) => Promise.resolve(),
    destroy: sessionId => Promise.resolve(),
    clear: () => Promise.resolve()
  };
}

// In-memory cache for auth results to prevent race conditions
const authCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

const mfaManager = new MFAManager();
const auditLogger = new AuditLogger();

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
    verifyAccessToken: token => {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload;
      } catch (e) {
        return null;
      }
    },
    generateAccessToken: payload => 'fallback-token',
    generateRefreshToken: payload => 'fallback-refresh-token'
  };
}

/**
 * Middleware to check if user is authenticated via JWT token
 */
const requireAuth = async (req, res, next) => {
  console.log(
    `🛡️  [${new Date().toISOString()}] AuthMiddleware: requireAuth called for ${req.method} ${req.originalUrl} from ${req.ip}`
  );
  console.time('requireAuth');

  try {
    // Check for JWT token in Authorization header
    console.log(`🛡️  [${new Date().toISOString()}] AuthMiddleware: Checking JWT authorization header`);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`🛡️  [${new Date().toISOString()}] AuthMiddleware: No valid JWT authorization header from ${req.ip}`);
      console.timeEnd('requireAuth');
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    console.log(`🛡️  [${new Date().toISOString()}] AuthMiddleware: Extracted JWT token (${token.substring(0, 20)}...)`);

    console.log(`🛡️  [${new Date().toISOString()}] AuthMiddleware: Verifying JWT token with jwtManager`);
    console.time('jwtTokenVerification');
    const tokenPayload = jwtManager.verifyAccessToken(token);
    console.timeEnd('jwtTokenVerification');

    if (!tokenPayload) {
      console.log(`🛡️  [${new Date().toISOString()}] AuthMiddleware: JWT token verification failed`);
      console.timeEnd('requireAuth');
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    // Get user data from database
    console.log(`🛡️  [${new Date().toISOString()}] AuthMiddleware: Getting user data for ${tokenPayload.userId}`);
    console.time('getUserData');
    const userData = await db.getUserById(tokenPayload.userId);
    console.timeEnd('getUserData');

    if (!userData) {
      console.log(`🛡️  [${new Date().toISOString()}] AuthMiddleware: User not found for ${tokenPayload.userId}`);
      console.timeEnd('requireAuth');
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: tokenPayload.userId,
      email: tokenPayload.email,
      roles: tokenPayload.roles,
      metadata: tokenPayload.metadata,
      profile: userData
    };

    console.log(`✅ [${new Date().toISOString()}] AuthMiddleware: User authenticated:`, {
      userId: req.user.id,
      tier: getUserTier(req.user),
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100)
    });

    console.timeEnd('requireAuth');
    console.log(
      `🛡️  [${new Date().toISOString()}] AuthMiddleware: requireAuth completed successfully for ${req.user.id}`
    );
    next();
  } catch (error) {
    console.error(`🛡️  [${new Date().toISOString()}] AuthMiddleware: requireAuth error:`, error);
    console.timeEnd('requireAuth');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if request has valid API key
 */
const requireApiKey = async (req, res, next) => {
  console.log(
    `🔑 [${new Date().toISOString()}] AuthMiddleware: requireApiKey called for ${req.method} ${req.originalUrl} from ${req.ip}`
  );
  console.time('requireApiKey');

  try {
    // Check for API key in Authorization header
    console.log(`🔑 [${new Date().toISOString()}] AuthMiddleware: Checking API key authorization header`);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log(`🔑 [${new Date().toISOString()}] AuthMiddleware: No authorization header provided from ${req.ip}`);
      console.timeEnd('requireApiKey');
      return res.status(401).json({ error: 'API key required' });
    }

    // Extract API key from header (with or without 'Bearer ' prefix)
    const apiKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    console.log(`🔑 [${new Date().toISOString()}] AuthMiddleware: Extracted API key (${apiKey.substring(0, 12)}...)`);

    // Verify the API key with enhanced security
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    console.log(`🔑 [${new Date().toISOString()}] AuthMiddleware: Verifying API key from ${ip}`);
    console.time('apiKeyVerification');
    const { userId, userData, keyData, error } = await auth.verifyApiKey(apiKey, ip);
    console.timeEnd('apiKeyVerification');

    if (error || !userId) {
      console.log(`🔑 [${new Date().toISOString()}] AuthMiddleware: API key verification failed: ${error?.message}`);
      console.timeEnd('requireApiKey');
      return res.status(401).json({
        error: 'Invalid API key',
        category: 'invalid_api_key'
      });
    }

    if (!userData) {
      console.log(`🔑 [${new Date().toISOString()}] AuthMiddleware: User data not found for API key`);
      console.timeEnd('requireApiKey');
      return res.status(401).json({
        error: 'User not found',
        category: 'user_not_found'
      });
    }

    // Add user and API key info to request
    req.user = userData;
    req.apiKey = apiKey;
    req.keyData = keyData;

    // Log API request with rate limit info (async, don't wait)
    console.log(`🔑 [${new Date().toISOString()}] AuthMiddleware: Logging API request`);
    db.storeApiLog({
      user_id: userId,
      api_key: apiKey,
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      user_tier: getUserTier(userData),
      ip: req.ip
    }).catch(err => console.error(`🔑 [${new Date().toISOString()}] AuthMiddleware: Error logging API request:`, err));

    console.log(`🔑 [${new Date().toISOString()}] AuthMiddleware: API key authenticated:`, {
      userId: userData.id,
      tier: getUserTier(userData),
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });

    console.timeEnd('requireApiKey');
    console.log(
      `🔑 [${new Date().toISOString()}] AuthMiddleware: requireApiKey completed successfully for ${userData.id}`
    );
    next();
  } catch (error) {
    console.error(`🔑 [${new Date().toISOString()}] AuthMiddleware: requireApiKey error:`, error);
    console.timeEnd('requireApiKey');
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
    if (existingLock && existingLock.processing && Date.now() - existingLock.timestamp < 1000) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = authCache.get(lockKey);
      if (result && !result.processing) {
        if (result.error) {
          return res.status(401).json({ error: result.error });
        }
        req.user = result.user;
        if (result.apiKey) {
          req.apiKey = result.apiKey;
        }
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
        const apiKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

        const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
        const { userId, userData, keyData, error } = await auth.verifyApiKey(apiKey, ip);

        if (!error && userId && userData) {
          authResult = {
            user: userData,
            apiKey,
            keyData,
            method: 'apikey'
          };
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
      if (authResult.apiKey) {
        req.apiKey = authResult.apiKey;
      }
      return next();
    }
    authCache.set(lockKey, {
      error: authError || 'Authentication failed',
      timestamp: Date.now(),
      processing: false
    });
    return res.status(401).json({ error: authError || 'Not authenticated' });
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
    console.log(
      `🚦 [${new Date().toISOString()}] AuthMiddleware: withRateLimit called for category '${category}' on ${req.method} ${req.originalUrl} from ${req.ip}`
    );
    console.time(`rateLimit_${category}`);

    const rateLimit = rateLimiters[category] || rateLimiters.api;
    const rateLimitInfo = addRateLimitInfo(category);

    console.log(`🚦 [${new Date().toISOString()}] AuthMiddleware: Using rate limiter for category '${category}'`);

    try {
      console.log(`🚦 [${new Date().toISOString()}] AuthMiddleware: Applying rate limit check`);
      console.time('rateLimitCheck');

      await new Promise((resolve, reject) => {
        rateLimit(req, res, err => {
          if (err) {
            console.log(`🚦 [${new Date().toISOString()}] AuthMiddleware: Rate limit check failed:`, err.message);
            reject(err);
          } else {
            console.log(`🚦 [${new Date().toISOString()}] AuthMiddleware: Rate limit check passed`);
            resolve();
          }
        });
      });

      console.timeEnd('rateLimitCheck');
      console.log(`🚦 [${new Date().toISOString()}] AuthMiddleware: Adding rate limit info to response headers`);
      rateLimitInfo(req, res, () => {});

      console.timeEnd(`rateLimit_${category}`);
      console.log(
        `🚦 [${new Date().toISOString()}] AuthMiddleware: Rate limiting completed successfully for ${category}`
      );
      next();
    } catch (error) {
      console.timeEnd('rateLimitCheck');
      console.timeEnd(`rateLimit_${category}`);

      if (error.status === 429 || error.message?.includes('rate limit')) {
        const tier = getUserTier(req.user);
        console.log(
          `🚦 [${new Date().toISOString()}] AuthMiddleware: Rate limit exceeded for ${category} from ${req.ip}, tier: ${tier}, retryAfter: ${error.retryAfter || 60}`
        );

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many ${category} requests. Please wait before trying again.`,
          category: 'rate_limit_error',
          tier,
          retryAfter: error.retryAfter || 60,
          upgradeMessage: tier === 'free' ? 'Upgrade to premium for higher limits' : null
        });
      }

      console.error(`🚦 [${new Date().toISOString()}] AuthMiddleware: Rate limit middleware error:`, error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Smart rate limiting middleware that automatically selects the appropriate category
 * based on the request path and method
 */
const smartRateLimit = (req, res, next) => {
  console.log(
    `🚦 [${new Date().toISOString()}] AuthMiddleware: smartRateLimit called for ${req.method} ${req.originalUrl} from ${req.ip}`
  );
  console.time('smartRateLimit');

  let category = 'api'; // default

  console.log(`🚦 [${new Date().toISOString()}] AuthMiddleware: Determining rate limit category for path: ${req.path}`);

  if (req.path.includes('/auth/') || req.path.includes('/signin') || req.path.includes('/signup')) {
    category = 'auth';
  } else if (req.path.includes('/chat')) {
    category = 'chat';
  } else if (req.path.includes('/upload') || (req.method === 'POST' && req.path.includes('/artifacts'))) {
    category = 'upload';
  } else if (req.path.includes('/export') || req.path.includes('/download')) {
    category = 'export';
  }

  console.log(
    `🚦 [${new Date().toISOString()}] AuthMiddleware: Selected rate limit category: '${category}' for ${req.path}`
  );

  const middleware = withRateLimit(category);

  const wrappedNext = () => {
    console.timeEnd('smartRateLimit');
    console.log(`🚦 [${new Date().toISOString()}] AuthMiddleware: smartRateLimit completed for category '${category}'`);
    next();
  };

  middleware(req, res, wrappedNext);
};

module.exports = {
  requireAuth,
  requireApiKey,
  anyAuth,
  withRateLimit,
  smartRateLimit
};
