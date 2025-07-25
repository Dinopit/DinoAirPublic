// Authentication middleware for Supabase
const auth = require('../lib/auth');
const db = require('../lib/db');

/**
 * Middleware to check if user is authenticated via session
 */
const requireAuth = async (req, res, next) => {
  try {
    const { user, error } = await auth.getCurrentUser();

    if (error || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    req.user = user;
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

    // Get user data
    const userData = await db.getUserById(userId);
    if (!userData) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Add user and API key info to request
    req.user = userData;
    req.apiKey = apiKey;

    // Log API request
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
 */
const anyAuth = async (req, res, next) => {
  try {
    // Try API key first
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const apiKey = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      const { userId, error } = await auth.verifyApiKey(apiKey);

      if (!error && userId) {
        const userData = await db.getUserById(userId);
        if (userData) {
          req.user = userData;
          req.apiKey = apiKey;
          return next();
        }
      }
    }

    // Fall back to session auth
    const { user, error } = await auth.getCurrentUser();

    if (error || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  requireAuth,
  requireApiKey,
  anyAuth
};
