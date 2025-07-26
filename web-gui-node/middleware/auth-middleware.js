// Authentication middleware for Supabase with database-backed session storage
const auth = require('../lib/auth');
const db = require('../lib/db');
const { sessionStore } = require('../lib/session-store');
const { jwtManager } = require('../lib/jwt-manager');

/**
 * Middleware to check if user is authenticated via JWT token
 */
const requireAuth = async (req, res, next) => {
  try {
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
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if request has valid API key
 */
const requireApiKey = async (req, res, next) => {
  try {
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

    // Log API request (async, don't wait)
    db.storeApiLog({
      user_id: userId,
      api_key: apiKey,
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    }).catch(err => console.error('Error logging API request:', err));

    next();
  } catch (error) {
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

module.exports = {
  requireAuth,
  requireApiKey,
  anyAuth
};
