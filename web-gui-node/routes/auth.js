// Authentication routes for Supabase integration
const express = require('express');
const router = express.Router();
const auth = require('../lib/auth');
const db = require('../lib/db');
const { supabaseAdmin } = require('../lib/supabase');
const { rateLimits, authValidation, sanitizeInput } = require('../middleware/validation');

const authTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    console.log(`⏱️  [${new Date().toISOString()}] AuthTimeout: Setting ${timeoutMs}ms timeout for ${req.method} ${req.originalUrl}`);
    
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`⏱️  [${new Date().toISOString()}] AuthTimeout: Request timeout after ${timeoutMs}ms for ${req.method} ${req.originalUrl} from ${req.ip}`);
        res.status(408).json({
          error: 'Request timeout',
          message: 'The authentication request took too long to process. Please try again.',
          category: 'timeout_error',
          timeout: timeoutMs
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      console.log(`⏱️  [${new Date().toISOString()}] AuthTimeout: Request completed successfully for ${req.method} ${req.originalUrl}`);
      clearTimeout(timeout);
    });

    res.on('error', () => {
      console.log(`⏱️  [${new Date().toISOString()}] AuthTimeout: Request errored, clearing timeout for ${req.method} ${req.originalUrl}`);
      clearTimeout(timeout);
    });

    next();
  };
};

// Sign up route
router.post('/signup', authTimeout(30000), rateLimits.auth, sanitizeInput, authValidation.signup, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';

    const { data, error } = await auth.signUpUser(email, password, ip);

    if (error) {
      if (error.details && Array.isArray(error.details)) {
        return res.status(400).json({ 
          error: error.message,
          details: error.details,
          category: 'password_validation_error'
        });
      }
      
      if (error.remainingTime) {
        return res.status(429).json({
          error: error.message,
          remainingTime: error.remainingTime,
          category: 'rate_limit_error'
        });
      }
      
      return res.status(400).json({ 
        error: error.message,
        category: 'signup_error'
      });
    }

    // Create user profile in database with enhanced security logging
    if (data?.user) {
      await db.createUser({
        id: data.user.id,
        email: data.user.email,
        name: name || email.split('@')[0],
        created_at: new Date().toISOString(),
        signup_ip: ip,
        email_verified: data.user.email_confirmed_at ? true : false
      });
      
      console.log(`👤 New user profile created: ${data.user.id} (${email}) from ${ip}`);
    }

    return res.status(201).json({ 
      message: 'User created successfully. Please check your email to verify your account.',
      user: {
        id: data?.user?.id,
        email: data?.user?.email,
        email_confirmed_at: data?.user?.email_confirmed_at
      }
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue creating your account. Please try again.',
      category: 'signup_error'
    });
  }
});

// Sign in route
router.post('/signin', authTimeout(30000), rateLimits.auth, sanitizeInput, authValidation.signin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    const { data, error } = await auth.signInUser(email, password, ip, userAgent);

    if (error) {
      if (error.remainingTime) {
        return res.status(429).json({
          error: error.message,
          remainingTime: error.remainingTime,
          category: 'account_locked_error'
        });
      }
      
      return res.status(401).json({ 
        error: error.message,
        category: 'signin_error'
      });
    }

    if (data?.session) {
      req.session.token = data.session.access_token;
      req.session.userId = data.user.id;
      req.session.loginTime = new Date().toISOString();
      req.session.loginIp = ip;
      
      req.session.cookie.secure = process.env.NODE_ENV === 'production';
      req.session.cookie.httpOnly = true;
      req.session.cookie.sameSite = 'strict';
      req.session.cookie.maxAge = 8 * 60 * 60 * 1000; // 8 hours
    }

    return res.status(200).json({ 
      message: 'Sign in successful',
      user: {
        id: data?.user?.id,
        email: data?.user?.email,
        email_confirmed_at: data?.user?.email_confirmed_at,
        last_sign_in_at: data?.user?.last_sign_in_at
      },
      session: {
        expires_at: data?.session?.expires_at
      }
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue signing you in. Please try again.',
      category: 'signin_error'
    });
  }
});

// Sign out route
router.post('/signout', authTimeout(15000), async (req, res) => {
  try {
    const { error } = await auth.signOutUser();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Clear session
    req.session.destroy();

    return res.status(200).json({ message: 'Sign out successful' });
  } catch (error) {
    console.error('Sign out error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue signing you out. Please try again.',
      category: 'signout_error'
    });
  }
});

// Get current user route
router.get('/me', authTimeout(20000), async (req, res) => {
  try {
    const { user, error } = await auth.getCurrentUser();

    if (error || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get additional user data from database
    const userData = await db.getUserById(user.id);

    return res.status(200).json({ 
      user: {
        ...user,
        profile: userData
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue loading your profile. Please try again.',
      category: 'profile_error'
    });
  }
});

// Reset password request route
router.post('/reset-password', authTimeout(25000), rateLimits.auth, sanitizeInput, authValidation.resetPassword, async (req, res) => {
  try {
    const { email } = req.body;

    const { error } = await auth.resetPassword(email);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue sending the password reset email. Please try again.',
      category: 'password_reset_error'
    });
  }
});

// Update password route
router.post('/update-password', authTimeout(25000), rateLimits.auth, sanitizeInput, authValidation.updatePassword, async (req, res) => {
  try {
    const { password } = req.body;

    const { error } = await auth.updatePassword(password);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue updating your password. Please try again.',
      category: 'password_update_error'
    });
  }
});

// Create API key route (requires authentication)
router.post('/api-keys', authTimeout(20000), rateLimits.auth, sanitizeInput, authValidation.createApiKey, async (req, res) => {
  try {
    const { user, error: authError } = await auth.getCurrentUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, permissions, expiryMonths } = req.body;
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';

    const options = {
      permissions: permissions || ['read', 'write'],
      expiryMonths: expiryMonths || 12
    };

    const { apiKey, error } = await auth.createApiKey(user.id, name, options);

    if (error) {
      return res.status(400).json({ 
        error: error.message,
        category: 'api_key_creation_error'
      });
    }

    console.log(`🔑 API key created by user ${user.id} from ${ip}: ${apiKey.name}`);

    return res.status(201).json({ 
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key, // Only returned once
        key_prefix: apiKey.key_prefix,
        permissions: apiKey.permissions,
        expires_at: apiKey.expires_at,
        created_at: apiKey.created_at
      },
      warning: 'This is the only time the full API key will be shown. Please save it securely.'
    });
  } catch (error) {
    console.error('Create API key error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue creating your API key. Please try again.',
      category: 'api_key_error'
    });
  }
});

// List API keys route (requires authentication)
router.get('/api-keys', authTimeout(15000), rateLimits.auth, async (req, res) => {
  try {
    const { user, error: authError } = await auth.getCurrentUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: apiKeys, error } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, key_prefix, permissions, expires_at, created_at, last_used_at, usage_count, active')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching API keys:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch API keys',
        category: 'api_key_fetch_error'
      });
    }

    return res.status(200).json({ 
      apiKeys: apiKeys || [],
      count: apiKeys?.length || 0
    });
  } catch (error) {
    console.error('List API keys error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue fetching your API keys. Please try again.',
      category: 'api_key_error'
    });
  }
});

// Revoke API key route (requires authentication)
router.delete('/api-keys/:keyId', authTimeout(15000), rateLimits.auth, async (req, res) => {
  try {
    const { user, error: authError } = await auth.getCurrentUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { keyId } = req.params;
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';

    const { data: keyData, error: fetchError } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, user_id')
      .eq('id', keyId)
      .eq('user_id', user.id)
      .eq('active', true)
      .single();

    if (fetchError || !keyData) {
      return res.status(404).json({ 
        error: 'API key not found',
        category: 'api_key_not_found'
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from('api_keys')
      .update({ 
        active: false, 
        revoked_at: new Date().toISOString(),
        revoked_by_ip: ip
      })
      .eq('id', keyId);

    if (updateError) {
      console.error('Error revoking API key:', updateError);
      return res.status(500).json({ 
        error: 'Failed to revoke API key',
        category: 'api_key_revoke_error'
      });
    }

    console.log(`🗑️  API key revoked by user ${user.id} from ${ip}: ${keyData.name}`);

    return res.status(200).json({ 
      message: 'API key revoked successfully',
      revokedKey: {
        id: keyData.id,
        name: keyData.name
      }
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    return res.status(500).json({ 
      error: 'We encountered an issue revoking your API key. Please try again.',
      category: 'api_key_error'
    });
  }
});

module.exports = router;
