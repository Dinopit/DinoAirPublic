// Enhanced authentication middleware with session validation and activity tracking
console.log(`🛡️  [${new Date().toISOString()}] EnhancedAuthMiddleware: Loading enhanced authentication middleware...`);
const auth = require('../lib/auth');
const sessionManager = require('../lib/session-manager');
const { PermissionsManager } = require('../lib/permissions-manager');
const { LockoutManager } = require('../lib/lockout-manager');

// Initialize managers
const permissionsManager = new PermissionsManager();
const lockoutManager = new LockoutManager();

/**
 * Enhanced authentication middleware with session validation
 */
const enhancedAuth = async (req, res, next) => {
  console.log(`🛡️  [${new Date().toISOString()}] EnhancedAuth: Processing request ${req.method} ${req.originalUrl} from ${req.ip}`);
  console.time('enhancedAuth');

  try {
    const metadata = {
      ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown'
    };

    // Try API key authentication first
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const apiKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      
      // Check if it looks like an API key (starts with dinoair_)
      if (apiKey.startsWith('dinoair_')) {
        return await handleApiKeyAuth(req, res, next, apiKey, metadata);
      }
      
      // Check if it's a JWT token
      if (apiKey.split('.').length === 3) {
        return await handleJWTAuth(req, res, next, apiKey, metadata);
      }
    }

    // Fall back to session-based authentication
    return await handleSessionAuth(req, res, next, metadata);

  } catch (error) {
    console.error(`🛡️  [${new Date().toISOString()}] EnhancedAuth: Error:`, sanitizeError(error));
    console.timeEnd('enhancedAuth');
    return res.status(500).json({ error: 'Authentication system error' });
  }
};

/**
 * Handle API key authentication with enhanced permissions
 */
async function handleApiKeyAuth(req, res, next, apiKey, metadata) {
  console.log(`🔑 [${new Date().toISOString()}] EnhancedAuth: API key authentication`);
  
  try {
    const { userId, userData, keyData, error } = await auth.verifyApiKey(apiKey, metadata.ip);

    if (error || !userId) {
      console.log(`🔑 [${new Date().toISOString()}] EnhancedAuth: API key verification failed`);
      return res.status(401).json({
        error: 'Invalid API key',
        category: 'invalid_api_key'
      });
    }

    // Add enhanced user and key info to request
    req.user = userData;
    req.apiKey = apiKey;
    req.keyData = keyData;
    req.authMethod = 'api_key';

    console.log(`✅ [${new Date().toISOString()}] EnhancedAuth: API key authenticated for user ${userId}`);
    console.timeEnd('enhancedAuth');
    next();

  } catch (error) {
    console.error(`🔑 [${new Date().toISOString()}] EnhancedAuth: API key auth error:`, error);
    console.timeEnd('enhancedAuth');
    return res.status(500).json({ error: 'API key verification error' });
  }
}

/**
 * Handle JWT token authentication
 */
async function handleJWTAuth(req, res, next, token, metadata) {
  console.log(`🎫 [${new Date().toISOString()}] EnhancedAuth: JWT authentication`);
  
  try {
    const { isValid, user, userData, error } = await auth.validateJwtToken(token);

    if (!isValid || error) {
      console.log(`🎫 [${new Date().toISOString()}] EnhancedAuth: JWT validation failed: ${error}`);
      return res.status(401).json({
        error: 'Invalid or expired token',
        category: 'invalid_jwt'
      });
    }

    req.user = userData || user;
    req.authMethod = 'jwt';

    console.log(`✅ [${new Date().toISOString()}] EnhancedAuth: JWT authenticated for user ${user.id}`);
    console.timeEnd('enhancedAuth');
    next();

  } catch (error) {
    console.error(`🎫 [${new Date().toISOString()}] EnhancedAuth: JWT auth error:`, error);
    console.timeEnd('enhancedAuth');
    return res.status(500).json({ error: 'JWT verification error' });
  }
}

/**
 * Handle session-based authentication with enhanced validation
 */
async function handleSessionAuth(req, res, next, metadata) {
  console.log(`🔄 [${new Date().toISOString()}] EnhancedAuth: Session authentication`);
  
  try {
    const sessionId = req.session?.sessionId;
    const userId = req.session?.userId;

    if (!sessionId || !userId) {
      console.log(`🔄 [${new Date().toISOString()}] EnhancedAuth: No session data found`);
      return res.status(401).json({
        error: 'Authentication required',
        category: 'no_session'
      });
    }

    // Validate and update session activity
    const { valid, session, error } = await sessionManager.validateAndUpdateSession(sessionId, metadata);

    if (!valid || error) {
      console.log(`🔄 [${new Date().toISOString()}] EnhancedAuth: Session validation failed: ${error}`);
      
      // Clear invalid session
      req.session.destroy();
      
      return res.status(401).json({
        error: error || 'Session invalid or expired',
        category: 'session_invalid'
      });
    }

    // Check for suspicious activity
    if (session.suspicious_activity) {
      console.warn(`🚨 [${new Date().toISOString()}] EnhancedAuth: Suspicious activity detected for session ${sessionId.substring(0, 8)}`);
      
      // Log but don't block - session manager handles invalidation if needed
    }

    // Get user data
    const { user, error: userError } = await auth.getCurrentUser();
    if (userError || !user) {
      console.log(`🔄 [${new Date().toISOString()}] EnhancedAuth: User data fetch failed`);
      return res.status(401).json({
        error: 'User not found',
        category: 'user_not_found'
      });
    }

    req.user = user;
    req.session.lastActivity = new Date().toISOString();
    req.authMethod = 'session';

    console.log(`✅ [${new Date().toISOString()}] EnhancedAuth: Session authenticated for user ${userId}`);
    console.timeEnd('enhancedAuth');
    next();

  } catch (error) {
    console.error(`🔄 [${new Date().toISOString()}] EnhancedAuth: Session auth error:`, error);
    console.timeEnd('enhancedAuth');
    return res.status(500).json({ error: 'Session verification error' });
  }
}

/**
 * Middleware to check specific API permissions
 */
const requirePermission = (permission, resourceScope = null) => {
  return async (req, res, next) => {
    console.log(`🔐 [${new Date().toISOString()}] RequirePermission: Checking '${permission}' for ${req.authMethod}`);
    
    try {
      // For session-based auth, allow all permissions (backward compatibility)
      if (req.authMethod === 'session' || req.authMethod === 'jwt') {
        console.log(`✅ Session/JWT auth - permission granted: ${permission}`);
        return next();
      }

      // For API key auth, check explicit permissions
      if (req.authMethod === 'api_key' && req.keyData) {
        const keyId = req.keyData.id;
        const { allowed, error } = await permissionsManager.hasPermission(keyId, permission, resourceScope);

        if (error) {
          console.error(`🔐 Permission check error: ${error}`);
          return res.status(500).json({
            error: 'Permission verification error',
            category: 'permission_error'
          });
        }

        if (!allowed) {
          console.log(`❌ Permission denied: ${permission} for API key ${keyId}`);
          return res.status(403).json({
            error: 'Insufficient permissions',
            required: permission,
            category: 'permission_denied'
          });
        }

        console.log(`✅ Permission granted: ${permission} for API key ${keyId}`);
        return next();
      }

      // Fallback - deny if we can't determine auth method
      console.log(`❌ Permission denied: Unknown auth method`);
      return res.status(403).json({
        error: 'Permission verification failed',
        category: 'permission_denied'
      });

    } catch (error) {
      console.error(`🔐 RequirePermission error:`, error);
      return res.status(500).json({
        error: 'Permission system error',
        category: 'permission_error'
      });
    }
  };
};

/**
 * Middleware to require authentication (any method)
 */
const requireAuth = enhancedAuth;

/**
 * Middleware specifically for API key authentication
 */
const requireApiKey = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'API key required' });
  }

  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  
  if (!apiKey.startsWith('dinoair_')) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }

  const metadata = {
    ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown'
  };

  return await handleApiKeyAuth(req, res, next, apiKey, metadata);
};

/**
 * Rate limiting middleware that respects user authentication status
 */
const intelligentRateLimit = (baseCategory = 'api') => {
  return async (req, res, next) => {
    try {
      // Higher limits for authenticated users
      let category = baseCategory;
      
      if (req.user) {
        // Authenticated users get higher limits
        category = `${baseCategory}_authenticated`;
      }

      // Apply the appropriate rate limit
      const rateLimitMiddleware = require('../middleware/auth-middleware').withRateLimit(category);
      return rateLimitMiddleware(req, res, next);

    } catch (error) {
      console.error('Intelligent rate limit error:', error);
      return res.status(500).json({ error: 'Rate limiting error' });
    }
  };
};

/**
 * Security monitoring middleware
 */
const securityMonitor = async (req, res, next) => {
  const startTime = Date.now();
  
  // Log security-relevant requests
  const securityEndpoints = [
    '/auth/', '/api/auth/', '/mfa/', '/sessions/', '/api-keys/'
  ];
  
  const isSecurityEndpoint = securityEndpoints.some(endpoint => 
    req.originalUrl.includes(endpoint)
  );

  if (isSecurityEndpoint) {
    console.log(`🔍 [${new Date().toISOString()}] SecurityMonitor: ${req.method} ${req.originalUrl} from ${req.ip}`);
  }

  // Continue with request
  next();

  // Log completion time for security endpoints
  if (isSecurityEndpoint) {
    const duration = Date.now() - startTime;
    console.log(`🔍 [${new Date().toISOString()}] SecurityMonitor: Completed in ${duration}ms`);
  }
};

module.exports = {
  enhancedAuth,
  requireAuth,
  requireApiKey,
  requirePermission,
  intelligentRateLimit,
  securityMonitor
};

console.log(`✅ [${new Date().toISOString()}] EnhancedAuthMiddleware: Enhanced authentication middleware loaded successfully`);