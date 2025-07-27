/**
 * Input Validation and Sanitization Middleware
 * Provides comprehensive validation for all API endpoints
 */

const { body, param, query, validationResult } = require('express-validator');
const { rateLimiters, addRateLimitInfo } = require('./enhanced-rate-limiting');

let helmet;
let helmetAvailable = false;

try {
  helmet = require('helmet');
  helmetAvailable = true;
  console.log('✅ Helmet security middleware loaded successfully');
} catch (error) {
  console.warn('⚠️  Helmet dependency not available, security middleware disabled:', error.message);
  helmetAvailable = false;
  helmet = () => (req, res, next) => next();
}

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fieldErrors = errors.array().map(error => ({
      field: error.path,
      message: getFieldErrorMessage(error.path, error.msg),
      value: error.value
    }));

    return res.status(400).json({
      error: 'Please check the information you entered and try again.',
      details: fieldErrors,
      category: 'validation_error'
    });
  }
  next();
};

/**
 * Get user-friendly field error messages
 */
const getFieldErrorMessage = (field, technicalMessage) => {
  const fieldMessages = {
    email: 'Please enter a valid email address.',
    password: 'Password must be at least 8 characters with uppercase, lowercase, numbers, and special characters.',
    name: 'Name should only contain letters, spaces, and common punctuation.',
    messages: 'Please provide valid chat messages.',
    'messages.*.content': 'Message cannot be empty and must be under 10,000 characters.',
    model: 'Please select a valid AI model.',
    content: 'Content cannot be empty.',
    sessionId: 'Please provide a valid session ID.',
    userId: 'Please provide a valid user ID.'
  };

  return fieldMessages[field] || technicalMessage || 'Please enter a valid value for this field.';
};

/**
 * Enhanced rate limiting configurations with user-specific quotas
 */
const rateLimits = {
  // Enhanced rate limiters with user-specific quotas
  auth: rateLimiters.auth,
  chat: rateLimiters.chat,
  api: rateLimiters.api,
  upload: rateLimiters.upload,
  export: rateLimiters.export,

  // Rate limit info middleware for adding headers
  addInfo: {
    auth: addRateLimitInfo('auth'),
    chat: addRateLimitInfo('chat'),
    api: addRateLimitInfo('api'),
    upload: addRateLimitInfo('upload'),
    export: addRateLimitInfo('export')
  }
};

/**
 * Authentication validation schemas
 */
const authValidation = {
  signup: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
      .isLength({ max: 254 })
      .withMessage('Email must be less than 254 characters'),

    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),

    handleValidationErrors
  ],

  signin: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),

    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ max: 128 })
      .withMessage('Password is too long'),

    handleValidationErrors
  ],

  resetPassword: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),

    handleValidationErrors
  ],

  updatePassword: [
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

    handleValidationErrors
  ],

  createApiKey: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('API key name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z0-9\s\-_]+$/)
      .withMessage('API key name can only contain letters, numbers, spaces, hyphens, and underscores'),

    handleValidationErrors
  ]
};

/**
 * Chat validation schemas
 */
const chatValidation = {
  chat: [
    body('messages')
      .isArray({ min: 1, max: 50 })
      .withMessage('Messages must be an array with 1-50 items'),

    body('messages.*.role')
      .isIn(['user', 'assistant', 'system'])
      .withMessage('Message role must be user, assistant, or system'),

    body('messages.*.content')
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Message content must be between 1 and 10,000 characters')
      .escape(), // Sanitize HTML entities

    body('model')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Model name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9\-_:\/\.]+$/)
      .withMessage('Model name contains invalid characters'),

    body('systemPrompt')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('System prompt must be less than 5,000 characters')
      .escape(),

    body('sessionId')
      .optional()
      .isUUID()
      .withMessage('Session ID must be a valid UUID'),

    body('userId')
      .optional()
      .isUUID()
      .withMessage('User ID must be a valid UUID'),

    handleValidationErrors
  ]
};

/**
 * User validation schemas
 */
const userValidation = {
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z\s\-'\.]+$/)
      .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),

    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters')
      .escape(),

    body('preferences')
      .optional()
      .isObject()
      .withMessage('Preferences must be an object'),

    handleValidationErrors
  ],

  getUserById: [
    param('id')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),

    handleValidationErrors
  ]
};

/**
 * General API validation schemas
 */
const apiValidation = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be a number between 1 and 1000'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be a number between 1 and 100'),

    handleValidationErrors
  ],

  search: [
    query('q')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Search query must be between 1 and 200 characters')
      .escape(),

    handleValidationErrors
  ]
};

/**
 * File upload validation
 */
const fileValidation = {
  upload: [
    body('filename')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Filename must be between 1 and 255 characters')
      .matches(/^[a-zA-Z0-9\-_\.\s]+$/)
      .withMessage('Filename contains invalid characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters')
      .escape(),

    handleValidationErrors
  ]
};

/**
 * Security middleware configuration
 * Note: CSP is now handled by dedicated middleware in csp.js
 */
const securityMiddleware = helmetAvailable ? helmet({
  contentSecurityPolicy: false, // Handled by dedicated CSP middleware
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}) : (req, res, next) => {
  console.log('📊 Security middleware skipped - helmet not available');
  next();
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Recursively sanitize all string inputs
  const sanitizeObject = obj => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove null bytes and control characters
        obj[key] = obj[key].replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        // Trim whitespace
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params);
  }

  next();
};

module.exports = {
  rateLimits,
  authValidation,
  chatValidation,
  userValidation,
  apiValidation,
  fileValidation,
  securityMiddleware,
  sanitizeInput,
  handleValidationErrors,
  getFieldErrorMessage
};
