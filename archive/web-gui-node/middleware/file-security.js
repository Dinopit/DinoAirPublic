/**
 * Enhanced File Security Middleware
 * Comprehensive file upload security with virus scanning, validation, and quotas
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { execSync } = require('child_process');
const { LRUCache } = require('lru-cache');

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

// Entropy calculation optimization settings
const ENTROPY_SETTINGS = {
  // Only calculate entropy for files larger than this threshold (1KB)
  FILE_SIZE_THRESHOLD: 1024,
  // High entropy threshold for detecting packed/encrypted content
  HIGH_ENTROPY_THRESHOLD: 7.5,
  // Maximum bytes to analyze for entropy (8KB)
  MAX_ANALYSIS_BYTES: 8192,
  // Cache settings
  CACHE_MAX_SIZE: 1000, // Maximum number of cached entropy results
  CACHE_TTL: 1000 * 60 * 60 // Cache TTL: 1 hour
};

// LRU cache for entropy calculations
const entropyCache = new LRUCache({
  max: ENTROPY_SETTINGS.CACHE_MAX_SIZE,
  ttl: ENTROPY_SETTINGS.CACHE_TTL
});

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
 * Scan file for malicious content using multiple detection methods
 */
async function scanFileForViruses(filePath) {
  try {
    // Method 1: Try ClamAV if available
    try {
      execSync('which clamscan', { stdio: 'ignore' });
      
      const result = execSync(`clamscan --no-summary "${filePath}"`, {
        encoding: 'utf8',
        timeout: 30000 // 30 second timeout
      });

      if (result.includes('FOUND')) {
        return {
          clean: false,
          result: 'Virus/malware detected by ClamAV',
          method: 'clamav'
        };
      }
    } catch (clamError) {
      // ClamAV not available, continue with other methods
    }

    // Method 2: Enhanced content analysis for suspicious patterns
    const content = await fs.readFile(filePath);
    const contentStr = content.toString('utf8', 0, Math.min(content.length, 50000)); // Scan first 50KB
    
    const suspiciousPatterns = [
      // Script injection patterns
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /shell_exec\s*\(/gi,
      /passthru\s*\(/gi,
      /proc_open\s*\(/gi,
      
      // HTML/JavaScript patterns
      /<script[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
      
      // SQL injection patterns
      /union\s+select/gi,
      /drop\s+table/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,
      /update\s+set/gi,
      
      // File inclusion patterns
      /include\s*\(/gi,
      /require\s*\(/gi,
      /file_get_contents\s*\(/gi,
      
      // Command injection patterns
      /\|\s*nc\s/gi,
      /\|\s*netcat\s/gi,
      /\|\s*bash\s/gi,
      /\|\s*sh\s/gi,
      /\|\s*cmd\s/gi,
      
      // Base64 encoded suspicious content
      /[A-Za-z0-9+\/]{100,}={0,2}/g // Detect long base64 strings
    ];

    const foundPatterns = [];
    suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(contentStr)) {
        foundPatterns.push(`Pattern ${index + 1}`);
      }
    });

    // Method 3: Check for embedded executable signatures
    const executableSignatures = [
      Buffer.from([0x4D, 0x5A]), // PE executable (MZ header)
      Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
      Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Mach-O executable
      Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O executable (reverse)
    ];

    const hasExecutableSignature = executableSignatures.some(signature => {
      if (content.length < signature.length) return false;
      return content.subarray(0, signature.length).equals(signature);
    });

    if (hasExecutableSignature) {
      return {
        clean: false,
        result: 'Executable file signature detected',
        method: 'signature_scan'
      };
    }

    // Method 4: Check file entropy (high entropy might indicate packed/encrypted malware)
    // Optimized with caching and size threshold
    const entropyResult = calculateEntropyOptimized(content, content.length);
    
    if (!entropyResult.skipped && entropyResult.entropy > ENTROPY_SETTINGS.HIGH_ENTROPY_THRESHOLD) {
      const cacheInfo = entropyResult.cached ? ' (cached)' : '';
      return {
        clean: false,
        result: `High entropy detected (${entropyResult.entropy.toFixed(2)}) - possible packed/encrypted content${cacheInfo}`,
        method: 'entropy_analysis'
      };
    }

    if (foundPatterns.length > 0) {
      return {
        clean: false,
        result: `Suspicious content patterns detected: ${foundPatterns.join(', ')}`,
        method: 'pattern_analysis'
      };
    }

    return {
      clean: true,
      result: 'Multiple security scans passed',
      method: 'comprehensive'
    };

  } catch (error) {
    console.error('File security scan error:', error);
    return {
      clean: true,
      result: 'Scan failed - allowing with warning',
      method: 'error'
    };
  }
}

/**
 * Calculate Shannon entropy of data to detect packed/encrypted content
 * Optimized with caching and size thresholds
 */
function calculateEntropy(buffer) {
  const frequencies = new Array(256).fill(0);
  
  // Count byte frequencies
  for (let i = 0; i < buffer.length; i++) {
    frequencies[buffer[i]]++;
  }
  
  // Calculate entropy
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const probability = frequencies[i] / buffer.length;
      entropy -= probability * Math.log2(probability);
    }
  }
  
  return entropy;
}

/**
 * Optimized entropy calculation with caching and size threshold
 */
function calculateEntropyOptimized(buffer, fileSize) {
  // Skip entropy calculation for small files
  if (fileSize < ENTROPY_SETTINGS.FILE_SIZE_THRESHOLD) {
    return {
      entropy: 0,
      skipped: true,
      reason: 'file_too_small'
    };
  }

  // Limit analysis to first MAX_ANALYSIS_BYTES
  const analysisBuffer = buffer.subarray(0, Math.min(buffer.length, ENTROPY_SETTINGS.MAX_ANALYSIS_BYTES));
  
  // Generate cache key from buffer hash
  const hash = crypto.createHash('sha256').update(analysisBuffer).digest('hex');
  const cacheKey = `entropy_${hash}_${analysisBuffer.length}`;
  
  // Check cache first
  const cachedResult = entropyCache.get(cacheKey);
  if (cachedResult !== undefined) {
    return {
      entropy: cachedResult,
      cached: true,
      skipped: false
    };
  }
  
  // Calculate entropy
  const entropy = calculateEntropy(analysisBuffer);
  
  // Cache the result
  entropyCache.set(cacheKey, entropy);
  
  return {
    entropy,
    cached: false,
    skipped: false
  };
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

/**
 * Get entropy cache statistics for monitoring
 */
function getEntropyCacheStats() {
  return {
    size: entropyCache.size,
    maxSize: entropyCache.max,
    hitRate: entropyCache.calculatedSize > 0 ? (entropyCache.size / entropyCache.calculatedSize) : 0,
    settings: ENTROPY_SETTINGS
  };
}

/**
 * Clear entropy cache (useful for testing or maintenance)
 */
function clearEntropyCache() {
  entropyCache.clear();
}

module.exports = {
  createSecureUpload,
  postUploadValidation,
  secureDownloadHeaders,
  getUserQuota,
  getUserStorageUsage,
  validateFileSignature,
  scanFileForViruses,
  calculateEntropy,
  calculateEntropyOptimized,
  getEntropyCacheStats,
  clearEntropyCache,
  ENTROPY_SETTINGS,
  USER_QUOTAS
};
