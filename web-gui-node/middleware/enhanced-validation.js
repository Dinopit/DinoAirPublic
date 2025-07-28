/**
 * Enhanced API Input Validation Schemas
 * Comprehensive validation for all API endpoints with strict security measures
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Advanced validation utilities
 */
const ValidationUtils = {
  // SQL injection pattern detection
  containsSqlInjection: (value) => {
    const sqlPatterns = [
      /('|\\')|(;\s*)|(\/\*.*?\*\/)|(\b(select|insert|update|delete|drop|create|alter|exec|execute|sp_|xp_)\b)/gi,
      /(union\s+select|or\s+1\s*=\s*1|and\s+1\s*=\s*1)/gi,
      /(script\s*>|<\s*script)/gi,
      /(\|\||&&|;|\|)/g // Command injection
    ];
    return sqlPatterns.some(pattern => pattern.test(value));
  },

  // XSS pattern detection
  containsXss: (value) => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];
    return xssPatterns.some(pattern => pattern.test(value));
  },

  // Path traversal detection
  containsPathTraversal: (value) => {
    const pathPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
      /\.\.\%2f/gi
    ];
    return pathPatterns.some(pattern => pattern.test(value));
  },

  // Command injection detection
  containsCommandInjection: (value) => {
    const cmdPatterns = [
      /[;&|`$(){}[\]]/g,
      /\b(rm|del|format|shutdown|reboot|halt|poweroff)\b/gi,
      /nc\s|netcat\s|wget\s|curl\s/gi
    ];
    return cmdPatterns.some(pattern => pattern.test(value));
  }
};

/**
 * Custom validator functions
 */
const customValidators = {
  isSecureString: (value) => {
    if (ValidationUtils.containsSqlInjection(value)) {
      throw new Error('Input contains potentially malicious SQL patterns');
    }
    if (ValidationUtils.containsXss(value)) {
      throw new Error('Input contains potentially malicious XSS patterns');
    }
    if (ValidationUtils.containsPathTraversal(value)) {
      throw new Error('Input contains path traversal patterns');
    }
    if (ValidationUtils.containsCommandInjection(value)) {
      throw new Error('Input contains command injection patterns');
    }
    return true;
  },

  isSecureFilename: (value) => {
    // Check for dangerous file extensions
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
      '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.dll', '.so', '.dylib',
      '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.psd1', '.php', '.asp', '.jsp'
    ];
    
    const ext = value.toLowerCase().substring(value.lastIndexOf('.'));
    if (dangerousExtensions.includes(ext)) {
      throw new Error('File extension not allowed for security reasons');
    }
    
    if (ValidationUtils.containsPathTraversal(value)) {
      throw new Error('Filename contains path traversal patterns');
    }
    
    return true;
  },

  isSecureUrl: (value) => {
    const url = value.toLowerCase().trim();
    const dangerousProtocols = [
      'javascript:', 'vbscript:', 'data:', 'file:', 'ftp:', 'sftp:'
    ];
    
    if (dangerousProtocols.some(protocol => url.startsWith(protocol))) {
      throw new Error('URL protocol not allowed');
    }
    
    return true;
  },

  isValidUUID: (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Invalid UUID format');
    }
    return true;
  },

  isValidJsonStructure: (value, maxDepth = 5) => {
    try {
      const parsed = JSON.parse(value);
      
      function checkDepth(obj, depth = 0) {
        if (depth > maxDepth) {
          throw new Error('JSON structure too deeply nested');
        }
        
        if (typeof obj === 'object' && obj !== null) {
          if (Array.isArray(obj)) {
            obj.forEach(item => checkDepth(item, depth + 1));
          } else {
            Object.values(obj).forEach(val => checkDepth(val, depth + 1));
          }
        }
      }
      
      checkDepth(parsed);
      return true;
    } catch (error) {
      throw new Error('Invalid JSON structure or too complex');
    }
  }
};

/**
 * Enhanced authentication validation schemas
 */
const enhancedAuthValidation = {
  signup: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 254 })
      .custom(customValidators.isSecureString)
      .withMessage('Valid email is required'),

    body('password')
      .isLength({ min: 12, max: 128 })
      .matches(PASSWORD_VALIDATION_REGEX)
      .custom(customValidators.isSecureString)
      .withMessage('Password must be 12+ characters with uppercase, lowercase, numbers, and special characters'),

    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .custom(customValidators.isSecureString)
      .withMessage('Name contains invalid characters'),

    body('captchaToken')
      .optional()
      .isLength({ min: 10, max: 2000 })
      .custom(customValidators.isSecureString)
      .withMessage('Invalid captcha token')
  ],

  signin: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .custom(customValidators.isSecureString)
      .withMessage('Valid email is required'),

    body('password')
      .isLength({ min: 1, max: 128 })
      .custom(customValidators.isSecureString)
      .withMessage('Password is required'),

    body('mfaCode')
      .optional()
      .isNumeric()
      .isLength({ min: 6, max: 8 })
      .withMessage('Invalid MFA code format'),

    body('deviceId')
      .optional()
      .custom(customValidators.isValidUUID)
      .withMessage('Invalid device ID')
  ],

  changePassword: [
    body('currentPassword')
      .isLength({ min: 1, max: 128 })
      .custom(customValidators.isSecureString),

    body('newPassword')
      .isLength({ min: 12, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d@$!%*?&^#()_+\-=\[\]{};':"\\|,.<>\/?]/)
      .custom(customValidators.isSecureString),

    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match');
        }
        return true;
      })
  ]
};

/**
 * Enhanced chat validation schemas
 */
const enhancedChatValidation = {
  sendMessage: [
    body('messages')
      .isArray({ min: 1, max: 50 })
      .withMessage('Messages must be an array with 1-50 items'),

    body('messages.*.role')
      .isIn(['user', 'assistant', 'system'])
      .withMessage('Invalid message role'),

    body('messages.*.content')
      .trim()
      .isLength({ min: 1, max: 10000 })
      .custom(customValidators.isSecureString)
      .escape()
      .withMessage('Message content invalid or contains dangerous patterns'),

    body('model')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9\-_:\/\.]+$/)
      .custom(customValidators.isSecureString)
      .withMessage('Invalid model name'),

    body('systemPrompt')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .custom(customValidators.isSecureString)
      .escape()
      .withMessage('System prompt contains dangerous patterns'),

    body('sessionId')
      .optional()
      .custom(customValidators.isValidUUID)
      .withMessage('Invalid session ID'),

    body('metadata')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          return customValidators.isValidJsonStructure(value, 3);
        } else if (typeof value === 'object') {
          return customValidators.isValidJsonStructure(JSON.stringify(value), 3);
        }
        return true;
      })
      .withMessage('Invalid metadata structure')
  ]
};

/**
 * Enhanced file upload validation schemas
 */
const enhancedFileValidation = {
  upload: [
    body('filename')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .custom(customValidators.isSecureFilename)
      .withMessage('Invalid filename'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .custom(customValidators.isSecureString)
      .escape()
      .withMessage('Description contains dangerous patterns'),

    body('tags')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Too many tags'),

    body('tags.*')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .matches(/^[a-zA-Z0-9\-_\s]+$/)
      .custom(customValidators.isSecureString)
      .withMessage('Invalid tag format'),

    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be boolean'),

    body('contentType')
      .optional()
      .matches(/^[a-zA-Z0-9\-_\/]+$/)
      .custom(customValidators.isSecureString)
      .withMessage('Invalid content type')
  ]
};

/**
 * Enhanced API validation schemas
 */
const enhancedApiValidation = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Page must be between 1 and 10000'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    query('sort')
      .optional()
      .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .custom(customValidators.isSecureString)
      .withMessage('Invalid sort field'),

    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be asc or desc')
  ],

  search: [
    query('q')
      .trim()
      .isLength({ min: 1, max: 200 })
      .custom(customValidators.isSecureString)
      .escape()
      .withMessage('Search query invalid or contains dangerous patterns'),

    query('type')
      .optional()
      .matches(/^[a-zA-Z0-9_]+$/)
      .custom(customValidators.isSecureString)
      .withMessage('Invalid search type'),

    query('filters')
      .optional()
      .custom((value) => customValidators.isValidJsonStructure(value, 2))
      .withMessage('Invalid filter structure')
  ],

  resourceAccess: [
    param('id')
      .custom(customValidators.isValidUUID)
      .withMessage('Invalid resource ID'),

    query('fields')
      .optional()
      .matches(/^[a-zA-Z0-9_,]+$/)
      .custom(customValidators.isSecureString)
      .withMessage('Invalid field selection'),

    query('include')
      .optional()
      .matches(/^[a-zA-Z0-9_,]+$/)
      .custom(customValidators.isSecureString)
      .withMessage('Invalid include parameter')
  ]
};

/**
 * Input sanitization middleware with enhanced security
 */
const enhancedSanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove null bytes and control characters
      let sanitized = value.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Additional security: Remove potential script tags and event handlers
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      sanitized = sanitized.replace(/on\w+\s*=/gi, '');
      sanitized = sanitized.replace(/javascript:/gi, '');
      
      return sanitized.trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = sanitizeValue(key);
        if (sanitizedKey && sanitizedKey.length <= 100) { // Limit key length
          sanitized[sanitizedKey] = sanitizeObject(value);
        }
      }
      return sanitized;
    }
    return sanitizeValue(obj);
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  // Limit request size
  const bodySize = JSON.stringify(req.body || {}).length;
  if (bodySize > 10 * 1024 * 1024) { // 10MB limit
    return res.status(413).json({
      error: 'Request body too large',
      maxSize: '10MB'
    });
  }

  next();
};

module.exports = {
  enhancedAuthValidation,
  enhancedChatValidation,
  enhancedFileValidation,
  enhancedApiValidation,
  enhancedSanitizeInput,
  customValidators,
  ValidationUtils
};