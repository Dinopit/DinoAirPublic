/**
 * Enhanced File Security Middleware
 * Comprehensive file upload security with virus scanning, validation, and quotas
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { execSync } = require('child_process');

// File type validation using magic numbers (file signatures)
const FILE_SIGNATURES = {
  // Text files
  'text/plain': [],
  'application/json': [],

  // Images
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  'image/webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])],

  // Documents
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  'application/zip': [Buffer.from([0x50, 0x4B, 0x03, 0x04]), Buffer.from([0x50, 0x4B, 0x05, 0x06])],

  // Archives
  'application/x-tar': [Buffer.from([0x75, 0x73, 0x74, 0x61, 0x72])],
  'application/gzip': [Buffer.from([0x1F, 0x8B])]
};

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.dll', '.so', '.dylib',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.psd1'
];

// Per-user storage quotas (can be made configurable)
const USER_QUOTAS = {
  free: {
    maxFiles: 100,
    maxTotalSize: 50 * 1024 * 1024, // 50MB
    maxFileSize: 5 * 1024 * 1024 // 5MB per file
  },
  premium: {
    maxFiles: 1000,
    maxTotalSize: 500 * 1024 * 1024, // 500MB
    maxFileSize: 50 * 1024 * 1024 // 50MB per file
  },
  enterprise: {
    maxFiles: 10000,
    maxTotalSize: 5 * 1024 * 1024 * 1024, // 5GB
    maxFileSize: 100 * 1024 * 1024 // 100MB per file
  }
};

/**
 * Validate file signature against known magic numbers
 */
function validateFileSignature(buffer, mimeType) {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures || signatures.length === 0) {
    // For text files and unknown types, we'll rely on content analysis
    return true;
  }

  return signatures.some(signature => {
    if (buffer.length < signature.length) { return false; }
    return buffer.subarray(0, signature.length).equals(signature);
  });
}

/**
 * Scan file for malicious content using ClamAV (if available)
 */
async function scanFileForViruses(filePath) {
  try {
    // Check if ClamAV is available
    execSync('which clamscan', { stdio: 'ignore' });

    // Run virus scan
    const result = execSync(`clamscan --no-summary "${filePath}"`, {
      encoding: 'utf8',
      timeout: 30000 // 30 second timeout
    });

    return {
      clean: !result.includes('FOUND'),
      result: result.trim()
    };
  } catch (error) {
    // ClamAV not available or scan failed
    console.warn('Virus scanning not available or failed:', error.message);

    // Fallback: Basic content analysis for suspicious patterns
    try {
      const content = await fs.readFile(filePath);
      const suspiciousPatterns = [
        /eval\s*\(/gi,
        /exec\s*\(/gi,
        /system\s*\(/gi,
        /shell_exec\s*\(/gi,
        /<script[^>]*>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi
      ];

      const contentStr = content.toString('utf8', 0, Math.min(content.length, 10000));
      const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(contentStr));

      return {
        clean: !hasSuspiciousContent,
        result: hasSuspiciousContent ? 'Suspicious content detected' : 'Basic scan passed'
      };
    } catch (readError) {
      return {
        clean: true,
        result: 'Could not scan file content'
      };
    }
  }
}

/**
 * Get user's current storage usage
 */
async function getUserStorageUsage(userId) {
  try {
    // This would typically query your database
    // For now, we'll return mock data - replace with actual DB query
    const { artifacts } = require('../lib/supabase');
    const stats = await artifacts.getStats(userId);

    return {
      fileCount: stats.count || 0,
      totalSize: stats.totalSize || 0
    };
  } catch (error) {
    console.error('Error getting user storage usage:', error);
    return { fileCount: 0, totalSize: 0 };
  }
}

/**
 * Get user's quota limits based on their plan
 */
function getUserQuota(user) {
  // Determine user plan from user object
  const plan = user?.metadata?.plan || user?.plan || 'free';
  return USER_QUOTAS[plan] || USER_QUOTAS.free;
}

/**
 * Enhanced file filter with comprehensive security checks
 */
const secureFileFilter = async (req, file, cb) => {
  try {
    // Check file extension for dangerous types
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      return cb(new Error(`File type ${ext} is not allowed for security reasons`));
    }

    // Validate MIME type
    const allowedMimeTypes = [
      'text/plain',
      'application/json',
      'text/javascript',
      'text/html',
      'text/css',
      'application/javascript',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error(`MIME type ${file.mimetype} is not allowed`));
    }

    // Check user quotas
    if (req.user) {
      const quota = getUserQuota(req.user);
      const usage = await getUserStorageUsage(req.user.id);

      if (usage.fileCount >= quota.maxFiles) {
        return cb(new Error(`File quota exceeded. Maximum ${quota.maxFiles} files allowed.`));
      }

      if (file.size > quota.maxFileSize) {
        return cb(new Error(`File too large. Maximum ${quota.maxFileSize / (1024 * 1024)}MB per file allowed.`));
      }
    }

    cb(null, true);
  } catch (error) {
    cb(error);
  }
};

/**
 * Enhanced multer configuration with security features
 */
const createSecureUpload = (options = {}) => {
  const uploadDir = options.uploadDir || 'uploads';

  return multer({
    storage: multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          // Create user-specific upload directory
          const userDir = req.user ? path.join(uploadDir, req.user.id) : uploadDir;
          await fs.mkdir(userDir, { recursive: true });
          cb(null, userDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        // Generate secure filename
        const timestamp = Date.now();
        const randomBytes = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${randomBytes}_${safeName}`);
      }
    }),

    limits: {
      fileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB default
      files: options.maxFiles || 10,
      fields: 20,
      fieldNameSize: 100,
      fieldSize: 1024 * 1024 // 1MB for form fields
    },

    fileFilter: secureFileFilter
  });
};

/**
 * Post-upload security validation middleware
 */
const postUploadValidation = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const validationPromises = req.files.map(async file => {
      // Read file header for signature validation
      const buffer = Buffer.alloc(32);
      const fd = await fs.open(file.path, 'r');
      await fd.read(buffer, 0, 32, 0);
      await fd.close();

      // Validate file signature
      if (!validateFileSignature(buffer, file.mimetype)) {
        await fs.unlink(file.path); // Delete invalid file
        throw new Error(`File signature validation failed for ${file.originalname}`);
      }

      // Virus scan
      const scanResult = await scanFileForViruses(file.path);
      if (!scanResult.clean) {
        await fs.unlink(file.path); // Delete infected file
        throw new Error(`File ${file.originalname} failed security scan: ${scanResult.result}`);
      }

      // Check total user storage quota after upload
      if (req.user) {
        const quota = getUserQuota(req.user);
        const usage = await getUserStorageUsage(req.user.id);

        if (usage.totalSize > quota.maxTotalSize) {
          await fs.unlink(file.path); // Delete file that exceeds quota
          throw new Error(`Total storage quota exceeded. Maximum ${quota.maxTotalSize / (1024 * 1024)}MB allowed.`);
        }
      }

      return {
        ...file,
        securityScan: {
          signatureValid: true,
          virusScan: scanResult.result,
          scanTimestamp: new Date().toISOString()
        }
      };
    });

    req.files = await Promise.all(validationPromises);
    next();
  } catch (error) {
    // Clean up any remaining files on error
    if (req.files) {
      await Promise.all(req.files.map(async file => {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }));
    }

    res.status(400).json({
      error: 'File security validation failed',
      message: error.message
    });
  }
};

/**
 * Middleware to add security headers for file downloads
 */
const secureDownloadHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Force download instead of inline display for potentially dangerous files
  const ext = path.extname(req.path).toLowerCase();
  const dangerousForInline = ['.html', '.htm', '.svg', '.xml'];

  if (dangerousForInline.includes(ext)) {
    res.setHeader('Content-Disposition', 'attachment');
  }

  // Add CSP for any HTML content
  if (ext === '.html' || ext === '.htm') {
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; object-src 'none';");
  }

  next();
};

module.exports = {
  createSecureUpload,
  postUploadValidation,
  secureDownloadHeaders,
  getUserQuota,
  getUserStorageUsage,
  validateFileSignature,
  scanFileForViruses,
  USER_QUOTAS
};
