/**
 * Enhanced Content Security Policy Middleware
 * Comprehensive CSP configuration with nonce-based script execution and violation reporting
 */

const helmet = require('helmet');
const crypto = require('crypto');

/**
 * Generate a cryptographically secure nonce for CSP
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * CSP violation reporting endpoint handler
 */
const handleCSPViolation = (req, res, next) => {
  if (req.path === '/api/security/csp-violation-report' && req.method === 'POST') {
    try {
      const violation = req.body;

      // Log CSP violation with detailed information
      console.warn('CSP Violation Report:', {
        timestamp: new Date().toISOString(),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        violation: {
          documentURI: violation['document-uri'],
          referrer: violation.referrer,
          violatedDirective: violation['violated-directive'],
          effectiveDirective: violation['effective-directive'],
          originalPolicy: violation['original-policy'],
          blockedURI: violation['blocked-uri'],
          statusCode: violation['status-code'],
          sourceFile: violation['source-file'],
          lineNumber: violation['line-number'],
          columnNumber: violation['column-number']
        }
      });

      // In production, you might want to store violations in a database
      // or send them to a monitoring service like Sentry

      res.status(204).end();
      return;
    } catch (error) {
      console.error('Error processing CSP violation report:', error);
      res.status(400).json({ error: 'Invalid violation report' });
      return;
    }
  }
  next();
};

/**
 * Enhanced CSP middleware with nonce support
 */
const enhancedCSPMiddleware = (req, res, next) => {
  // Generate unique nonce for this request
  const nonce = generateNonce();
  req.nonce = nonce;

  // Make nonce available to templates
  res.locals.nonce = nonce;

  // Apply helmet with enhanced CSP configuration
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        // Scripts: Only allow self and nonce-based inline scripts
        scriptSrc: [
          "'self'",
          `'nonce-${nonce}'`
          // Remove 'unsafe-inline' for better security
          // Only allow specific trusted domains if needed
        ],

        // Styles: Use nonce for inline styles instead of unsafe-inline
        styleSrc: [
          "'self'",
          `'nonce-${nonce}'`,
          'https://fonts.googleapis.com',
          // Keep unsafe-inline only if absolutely necessary for third-party components
          "'unsafe-inline'"
        ],

        // Fonts
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com'
        ],

        // Images: Restrict to self, data URIs, and HTTPS only
        imgSrc: [
          "'self'",
          'data:',
          'https:'
        ],

        // WebSocket connections for real-time features
        connectSrc: [
          "'self'",
          'ws:',
          'wss:'
          // Add specific API endpoints if needed
        ],

        // Prevent framing (clickjacking protection)
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],

        // Prevent object/embed tags
        objectSrc: ["'none'"],

        // Restrict base URI
        baseUri: ["'self'"],

        // Form submissions
        formAction: ["'self'"],

        // Prevent MIME type sniffing
        // This is handled by helmet's noSniff middleware

        // Media sources
        mediaSrc: ["'self'"],

        // Worker sources
        workerSrc: ["'self'"],

        // Manifest sources
        manifestSrc: ["'self'"],

        // Upgrade insecure requests in production
        ...(process.env.NODE_ENV === 'production' && {
          upgradeInsecureRequests: []
        })
      },

      // Enable violation reporting
      reportUri: '/api/security/csp-violation-report',

      // Use report-to directive for modern browsers
      reportTo: 'csp-endpoint'
    },

    // Additional security headers
    crossOriginEmbedderPolicy: false, // May interfere with some features
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },

    // HSTS configuration
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // Prevent MIME type sniffing
    noSniff: true,

    // XSS Protection (legacy but still useful)
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }

  })(req, res, next);
};

// Set up Report-To header for modern CSP reporting
const reportToMiddleware = (req, res, next) => {
  res.setHeader('Report-To', JSON.stringify({
    group: 'csp-endpoint',
    max_age: 10886400, // 126 days
    endpoints: [{ url: '/api/security/csp-violation-report' }]
  }));
  next();
};

module.exports = {
  cspMiddleware: enhancedCSPMiddleware,
  cspViolationHandler: handleCSPViolation,
  reportToMiddleware,
  generateNonce
};
