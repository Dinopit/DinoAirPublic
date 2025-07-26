// Authentication utilities for Supabase
const { supabase, supabaseAdmin } = require('./supabase');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const PASSWORD_MIN_LENGTH = 8;
const API_KEY_LENGTH = 32;

const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

const failedAttempts = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, data] of failedAttempts.entries()) {
    if (now - data.lastAttempt > LOCKOUT_DURATION) {
      failedAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Validate password complexity
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validatePasswordComplexity(password) {
  const errors = [];
  
  if (!password || password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }
  
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters (aaa, 111, etc.)
    /123456|654321|qwerty|password|admin/i, // Common weak passwords
    /^[a-zA-Z]+$/, // Only letters
    /^\d+$/ // Only numbers
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common weak patterns');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if account is locked due to failed login attempts
 * @param {string} identifier - Email or IP address
 * @returns {Object} Lock status and remaining time
 */
function checkAccountLock(identifier) {
  const attempts = failedAttempts.get(identifier);
  if (!attempts) {
    return { isLocked: false, remainingTime: 0 };
  }
  
  const now = Date.now();
  const timeSinceLastAttempt = now - attempts.lastAttempt;
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS && timeSinceLastAttempt < LOCKOUT_DURATION) {
    const remainingTime = LOCKOUT_DURATION - timeSinceLastAttempt;
    return { isLocked: true, remainingTime };
  }
  
  if (timeSinceLastAttempt >= LOCKOUT_DURATION) {
    failedAttempts.delete(identifier);
    return { isLocked: false, remainingTime: 0 };
  }
  
  return { isLocked: false, remainingTime: 0 };
}

/**
 * Record failed login attempt
 * @param {string} identifier - Email or IP address
 */
function recordFailedAttempt(identifier) {
  const now = Date.now();
  const attempts = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
  
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    attempts.count = 0;
  }
  
  attempts.count++;
  attempts.lastAttempt = now;
  failedAttempts.set(identifier, attempts);
  
  console.log(`⚠️  Failed login attempt for ${identifier}: ${attempts.count}/${MAX_LOGIN_ATTEMPTS}`);
}

/**
 * Clear failed login attempts for successful login
 * @param {string} identifier - Email or IP address
 */
function clearFailedAttempts(identifier) {
  failedAttempts.delete(identifier);
}

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} ip - Client IP address for security logging
 * @returns {Promise<Object>} Auth response with user data or error
 */
async function signUpUser(email, password, ip = 'unknown') {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { data: null, error: { message: 'Invalid email format' } };
    }
    
    const passwordValidation = validatePasswordComplexity(password);
    if (!passwordValidation.isValid) {
      return { 
        data: null, 
        error: { 
          message: 'Password does not meet security requirements',
          details: passwordValidation.errors
        }
      };
    }
    
    const lockStatus = checkAccountLock(ip);
    if (lockStatus.isLocked) {
      return {
        data: null,
        error: {
          message: 'Too many failed attempts. Please try again later.',
          remainingTime: Math.ceil(lockStatus.remainingTime / 1000)
        }
      };
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      recordFailedAttempt(ip);
      console.log(`🚫 Signup failed for ${email} from ${ip}: ${error.message}`);
      return { data, error };
    }
    
    clearFailedAttempts(ip);
    console.log(`✅ User signup successful: ${email} from ${ip}`);
    return { data, error };
    
  } catch (error) {
    console.error('Signup error:', error);
    return { data: null, error: { message: 'Internal server error during signup' } };
  }
}

/**
 * Sign in a user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} ip - Client IP address for security logging
 * @param {string} userAgent - Client user agent for security logging
 * @returns {Promise<Object>} Auth response with session data or error
 */
async function signInUser(email, password, ip = 'unknown', userAgent = 'unknown') {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      recordFailedAttempt(email);
      recordFailedAttempt(ip);
      return { data: null, error: { message: 'Invalid email format' } };
    }
    
    const emailLockStatus = checkAccountLock(email);
    const ipLockStatus = checkAccountLock(ip);
    
    if (emailLockStatus.isLocked || ipLockStatus.isLocked) {
      const maxRemainingTime = Math.max(emailLockStatus.remainingTime, ipLockStatus.remainingTime);
      console.log(`🔒 Login blocked for ${email} from ${ip}: account locked`);
      return {
        data: null,
        error: {
          message: 'Account temporarily locked due to too many failed attempts. Please try again later.',
          remainingTime: Math.ceil(maxRemainingTime / 1000)
        }
      };
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      recordFailedAttempt(email);
      recordFailedAttempt(ip);
      console.log(`🚫 Login failed for ${email} from ${ip}: ${error.message}`);
      
      return { 
        data: null, 
        error: { message: 'Invalid email or password' }
      };
    }
    
    clearFailedAttempts(email);
    clearFailedAttempts(ip);
    
    console.log(`✅ Login successful: ${email} from ${ip}`);
    console.log(`🔐 Session created for user ${data.user?.id} with expiry ${data.session?.expires_at}`);
    
    return { data, error };
    
  } catch (error) {
    console.error('Signin error:', error);
    recordFailedAttempt(email);
    recordFailedAttempt(ip);
    return { data: null, error: { message: 'Internal server error during signin' } };
  }
}

/**
 * Sign out the current user
 * @returns {Promise<Object>} Response with error if any
 */
async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current user session
 * @returns {Promise<Object>} Current session data or null
 */
async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return { session: null, error };
  }

  return { session: data.session, error: null };
}

/**
 * Get the current user
 * @returns {Promise<Object>} Current user data or null
 */
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting user:', error);
    return { user: null, error };
  }

  return { user: data.user, error: null };
}

/**
 * Reset password for a user
 * @param {string} email - User email
 * @returns {Promise<Object>} Response with error if any
 */
async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.PUBLIC_URL}/reset-password`,
  });

  return { error };
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Response with error if any
 */
async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}

/**
 * Generate a cryptographically secure API key
 * @returns {string} Secure API key
 */
function generateSecureApiKey() {
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH);
  const key = 'dinoair_' + randomBytes.toString('base64url');
  return key;
}

/**
 * Hash API key for secure storage
 * @param {string} apiKey - Plain API key
 * @returns {Promise<string>} Hashed API key
 */
async function hashApiKey(apiKey) {
  const saltRounds = 10;
  return await bcrypt.hash(apiKey, saltRounds);
}

/**
 * Verify API key against hash
 * @param {string} apiKey - Plain API key
 * @param {string} hashedKey - Hashed API key from database
 * @returns {Promise<boolean>} Whether key matches
 */
async function verifyApiKeyHash(apiKey, hashedKey) {
  return await bcrypt.compare(apiKey, hashedKey);
}

/**
 * Create a new API key for a user (admin function)
 * @param {string} userId - User ID
 * @param {string} name - Key name/description
 * @param {Object} options - Additional options (permissions, expiry, etc.)
 * @returns {Promise<Object>} Created API key or error
 */
async function createApiKey(userId, name, options = {}) {
  try {
    if (!userId || !name) {
      return { apiKey: null, error: { message: 'User ID and name are required' } };
    }
    
    if (name.length > 100) {
      return { apiKey: null, error: { message: 'API key name must be 100 characters or less' } };
    }
    
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      return { apiKey: null, error: { message: 'User not found' } };
    }
    
    const { data: existingKeys, error: countError } = await supabaseAdmin
      .from('api_keys')
      .select('id')
      .eq('user_id', userId)
      .eq('active', true);
      
    if (countError) {
      console.error('Error checking existing API keys:', countError);
      return { apiKey: null, error: { message: 'Error checking existing API keys' } };
    }
    
    if (existingKeys && existingKeys.length >= 10) {
      return { apiKey: null, error: { message: 'Maximum number of API keys reached (10 per user)' } };
    }
    
    // Generate secure API key
    const plainKey = generateSecureApiKey();
    const hashedKey = await hashApiKey(plainKey);
    
    const expiryMonths = Math.min(options.expiryMonths || 12, 24);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);
    
    const keyData = {
      user_id: userId,
      name: name.trim(),
      key_hash: hashedKey,
      key_prefix: plainKey.substring(0, 12) + '...', // Store prefix for identification
      permissions: options.permissions || ['read', 'write'],
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
      active: true,
      last_used_at: null,
      usage_count: 0
    };

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert([keyData])
      .select();

    if (error) {
      console.error('Error creating API key:', error);
      return { apiKey: null, error: { message: 'Failed to create API key' } };
    }

    console.log(`🔑 API key created for user ${userId}: ${keyData.key_prefix}`);
    
    return { 
      apiKey: {
        ...data[0],
        key: plainKey // Only returned once
      }, 
      error: null 
    };
    
  } catch (error) {
    console.error('Create API key error:', error);
    return { apiKey: null, error: { message: 'Internal server error creating API key' } };
  }
}

/**
 * Verify an API key with enhanced security
 * @param {string} apiKey - API key to verify
 * @param {string} ip - Client IP address for logging
 * @returns {Promise<Object>} User data and key info or null if invalid
 */
async function verifyApiKey(apiKey, ip = 'unknown') {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      return { userId: null, keyData: null, error: { message: 'Invalid API key format' } };
    }
    
    if (!apiKey.startsWith('dinoair_')) {
      console.log(`🚫 Invalid API key prefix from ${ip}`);
      return { userId: null, keyData: null, error: { message: 'Invalid API key' } };
    }
    
    const { data: apiKeys, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('active', true)
      .gte('expires_at', new Date().toISOString()); // Only non-expired keys

    if (error) {
      console.error('Error fetching API keys:', error);
      return { userId: null, keyData: null, error: { message: 'Database error' } };
    }

    if (!apiKeys || apiKeys.length === 0) {
      console.log(`🚫 No active API keys found for verification from ${ip}`);
      return { userId: null, keyData: null, error: { message: 'Invalid API key' } };
    }

    for (const keyRecord of apiKeys) {
      try {
        const isMatch = await verifyApiKeyHash(apiKey, keyRecord.key_hash);
        if (isMatch) {
          await supabaseAdmin
            .from('api_keys')
            .update({
              last_used_at: new Date().toISOString(),
              usage_count: (keyRecord.usage_count || 0) + 1
            })
            .eq('id', keyRecord.id);

          const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', keyRecord.user_id)
            .single();

          if (userError || !userData) {
            console.error(`User not found for API key: ${keyRecord.user_id}`);
            return { userId: null, keyData: null, error: { message: 'User not found' } };
          }

          console.log(`✅ API key verified for user ${userData.id} from ${ip}`);
          
          return {
            userId: userData.id,
            userData: userData,
            keyData: {
              id: keyRecord.id,
              name: keyRecord.name,
              permissions: keyRecord.permissions || ['read', 'write'],
              expires_at: keyRecord.expires_at,
              usage_count: (keyRecord.usage_count || 0) + 1
            },
            error: null
          };
        }
      } catch (hashError) {
        console.error('Error verifying API key hash:', hashError);
        continue; // Try next key
      }
    }

    console.log(`🚫 Invalid API key from ${ip}: ${apiKey.substring(0, 12)}...`);
    return { userId: null, keyData: null, error: { message: 'Invalid API key' } };
    
  } catch (error) {
    console.error('API key verification error:', error);
    return { userId: null, keyData: null, error: { message: 'Internal server error' } };
  }
}

/**
 * Validate JWT token with enhanced security checks
 * @param {string} token - JWT token to validate
 * @returns {Promise<Object>} Token validation result
 */
async function validateJwtToken(token) {
  try {
    if (!token) {
      return { isValid: false, error: 'No token provided' };
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { isValid: false, error: 'Invalid token format' };
    }
    
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return { isValid: false, error: error?.message || 'Invalid token' };
    }
    
    const user = data.user;
    
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('active, banned_at')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      return { isValid: false, error: 'User not found' };
    }
    
    if (userData.active === false) {
      return { isValid: false, error: 'Account deactivated' };
    }
    
    if (userData.banned_at) {
      return { isValid: false, error: 'Account suspended' };
    }
    
    return { 
      isValid: true, 
      user: user,
      userData: userData,
      error: null 
    };
    
  } catch (error) {
    console.error('JWT validation error:', error);
    return { isValid: false, error: 'Token validation failed' };
  }
}

/**
 * Get security metrics for monitoring
 * @returns {Object} Security metrics
 */
function getSecurityMetrics() {
  const now = Date.now();
  const recentAttempts = Array.from(failedAttempts.entries())
    .filter(([_, data]) => now - data.lastAttempt < 60000) // Last minute
    .length;
    
  const lockedAccounts = Array.from(failedAttempts.entries())
    .filter(([_, data]) => data.count >= MAX_LOGIN_ATTEMPTS && now - data.lastAttempt < LOCKOUT_DURATION)
    .length;
  
  return {
    failedAttemptsLastMinute: recentAttempts,
    currentlyLockedAccounts: lockedAccounts,
    totalFailedAttempts: failedAttempts.size,
    lockoutDurationMinutes: LOCKOUT_DURATION / 60000,
    maxLoginAttempts: MAX_LOGIN_ATTEMPTS
  };
}

module.exports = {
  signUpUser,
  signInUser,
  signOutUser,
  getCurrentSession,
  getCurrentUser,
  resetPassword,
  updatePassword,
  createApiKey,
  verifyApiKey,
  validateJwtToken,
  validatePasswordComplexity,
  checkAccountLock,
  recordFailedAttempt,
  clearFailedAttempts,
  getSecurityMetrics,
  generateSecureApiKey,
  hashApiKey,
  verifyApiKeyHash
};
