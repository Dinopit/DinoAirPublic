// Enhanced authentication routes with MFA, session management, and security monitoring
const express = require('express');
const router = express.Router();
const auth = require('../lib/auth');
const { MFAManager } = require('../lib/mfa-manager');
const { LockoutManager } = require('../lib/lockout-manager');
const { PermissionsManager } = require('../lib/permissions-manager');
const sessionManager = require('../lib/session-manager');
const { requireAuth, anyAuth } = require('../middleware/auth-middleware');
const { rateLimits, authValidation, sanitizeInput } = require('../middleware/validation');

// Initialize managers
const mfaManager = new MFAManager();
const lockoutManager = new LockoutManager();
const permissionsManager = new PermissionsManager();

// Helper function to get client metadata
function getClientMetadata(req) {
  return {
    ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    country: req.get('CF-IPCountry') || null, // Cloudflare header
    city: req.get('CF-IPCity') || null,
    isMobile: req.get('User-Agent')?.toLowerCase().includes('mobile') || false,
    deviceFingerprint: req.get('X-Device-Fingerprint') || null
  };
}

// Enhanced signin with MFA and session management
router.post('/signin', rateLimits.auth, sanitizeInput, authValidation.signin, async (req, res) => {
  try {
    const { email, password, mfaToken } = req.body;
    const metadata = getClientMetadata(req);

    console.log(`🔐 [${new Date().toISOString()}] Enhanced signin attempt for ${email} from ${metadata.ip}`);

    // Check for lockouts
    const emailLockout = await lockoutManager.checkLockout(email, 'email');
    const ipLockout = await lockoutManager.checkLockout(metadata.ip, 'ip');

    if (emailLockout.isLocked || ipLockout.isLocked) {
      const lockout = emailLockout.isLocked ? emailLockout : ipLockout;
      return res.status(429).json({
        error: 'Account temporarily locked',
        message: `Too many failed attempts. Please try again later.`,
        remainingTime: Math.ceil(lockout.remainingTime / 1000),
        lockLevel: lockout.lockLevel,
        category: 'account_locked'
      });
    }

    // Attempt basic authentication
    const { data, error } = await auth.signInUser(email, password, metadata.ip, metadata.userAgent);

    if (error) {
      // Record failed attempt
      await lockoutManager.recordFailedAttempt(email, 'email', metadata);
      await lockoutManager.recordFailedAttempt(metadata.ip, 'ip', metadata);

      return res.status(401).json({
        error: error.message,
        category: 'signin_error'
      });
    }

    const userId = data.user.id;

    // Check if MFA is enabled
    const mfaEnabled = await mfaManager.isMFAEnabled(userId);
    
    if (mfaEnabled) {
      if (!mfaToken) {
        // MFA required but no token provided
        return res.status(202).json({
          requiresMFA: true,
          message: 'Multi-factor authentication required',
          user: {
            id: userId,
            email: data.user.email
          }
        });
      }

      // Verify MFA token
      const mfaResult = await mfaManager.verifyTOTP(userId, mfaToken, metadata);
      if (!mfaResult.valid) {
        await lockoutManager.recordFailedAttempt(email, 'email', { ...metadata, reason: 'mfa_failed' });
        return res.status(401).json({
          error: mfaResult.error || 'Invalid MFA token',
          category: 'mfa_error',
          usedBackupCode: mfaResult.usedBackupCode,
          remainingCodes: mfaResult.remainingCodes
        });
      }

      if (mfaResult.usedBackupCode) {
        // Warn about backup code usage
        console.warn(`🚨 Backup code used for ${email}, remaining: ${mfaResult.remainingCodes}`);
      }
    }

    // Clear failed attempts on successful login
    await lockoutManager.clearLockout(email, 'email');
    await lockoutManager.clearLockout(metadata.ip, 'ip');

    // Create enhanced session
    const { session: sessionData, error: sessionError } = await sessionManager.createSession(userId, metadata);
    
    if (sessionError) {
      console.error('Error creating session:', sessionError);
      // Fall back to basic session handling
    }

    // Set session data
    if (data?.session) {
      req.session.token = data.session.access_token;
      req.session.userId = userId;
      req.session.sessionId = sessionData?.session_id;
      req.session.loginTime = new Date().toISOString();
      req.session.loginIp = metadata.ip;

      req.session.cookie.secure = process.env.NODE_ENV === 'production';
      req.session.cookie.httpOnly = true;
      req.session.cookie.sameSite = 'strict';
      req.session.cookie.maxAge = 8 * 60 * 60 * 1000; // 8 hours
    }

    console.log(`✅ Enhanced signin successful for ${email}`);

    return res.status(200).json({
      message: 'Sign in successful',
      user: {
        id: userId,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        last_sign_in_at: data.user.last_sign_in_at
      },
      session: {
        expires_at: data?.session?.expires_at,
        session_id: sessionData?.session_id
      },
      mfa: {
        enabled: mfaEnabled,
        usedBackupCode: mfaResult?.usedBackupCode,
        remainingCodes: mfaResult?.remainingCodes
      }
    });

  } catch (error) {
    console.error('Enhanced signin error:', error);
    return res.status(500).json({
      error: 'Authentication system error. Please try again.',
      category: 'signin_error'
    });
  }
});

// Enhanced signout with session invalidation
router.post('/signout', anyAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.session?.sessionId;

    // Invalidate enhanced session
    if (sessionId) {
      await sessionManager.invalidateSession(sessionId, 'manual_logout');
    }

    // Clear traditional session
    req.session.destroy();

    // Supabase signout
    const { error } = await auth.signOutUser();
    if (error) {
      console.warn('Supabase signout error:', error);
    }

    console.log(`✅ Enhanced signout completed for user ${userId || 'unknown'}`);

    return res.status(200).json({ 
      message: 'Sign out successful',
      sessionInvalidated: Boolean(sessionId)
    });

  } catch (error) {
    console.error('Enhanced signout error:', error);
    return res.status(500).json({
      error: 'Signout error. Please try again.',
      category: 'signout_error'
    });
  }
});

// MFA setup initiation
router.post('/mfa/setup', requireAuth, rateLimits.auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const metadata = getClientMetadata(req);

    console.log(`🔐 Setting up MFA for user ${userId}`);

    const mfaResult = await mfaManager.generateTOTPSecret(userId, userEmail);
    const qrCode = await mfaManager.generateQRCode(mfaResult.qrCodeUrl);

    return res.status(200).json({
      secret: mfaResult.secret,
      qrCode,
      manualEntryKey: mfaResult.manualEntryKey,
      backupCodes: mfaResult.backupCodes,
      setupInstructions: [
        '1. Install an authenticator app (Google Authenticator, Authy, etc.)',
        '2. Scan the QR code or enter the manual key',
        '3. Enter the 6-digit code from your app to verify setup'
      ]
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to setup MFA',
      category: 'mfa_setup_error'
    });
  }
});

// MFA verification (to complete setup)
router.post('/mfa/verify', requireAuth, rateLimits.auth, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;
    const metadata = getClientMetadata(req);

    if (!token) {
      return res.status(400).json({
        error: 'MFA token is required',
        category: 'validation_error'
      });
    }

    const result = await mfaManager.verifyTOTP(userId, token, metadata);

    if (!result.valid) {
      return res.status(401).json({
        error: result.error || 'Invalid MFA token',
        category: 'mfa_verification_error'
      });
    }

    return res.status(200).json({
      message: 'MFA verification successful',
      enabled: true,
      firstTimeSetup: result.firstTimeSetup,
      usedBackupCode: result.usedBackupCode,
      remainingCodes: result.remainingCodes
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    return res.status(500).json({
      error: 'MFA verification failed',
      category: 'mfa_verification_error'
    });
  }
});

// MFA status
router.get('/mfa/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await mfaManager.getMFAStatus(userId);

    return res.status(200).json(status);

  } catch (error) {
    console.error('MFA status error:', error);
    return res.status(500).json({
      error: 'Failed to get MFA status',
      category: 'mfa_status_error'
    });
  }
});

// Regenerate backup codes
router.post('/mfa/backup-codes/regenerate', requireAuth, rateLimits.auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const metadata = getClientMetadata(req);

    const newCodes = await mfaManager.regenerateBackupCodes(userId, metadata);

    return res.status(200).json({
      message: 'Backup codes regenerated successfully',
      backupCodes: newCodes,
      warning: 'Previous backup codes are no longer valid. Store these new codes securely.'
    });

  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to regenerate backup codes',
      category: 'backup_codes_error'
    });
  }
});

// Disable MFA
router.post('/mfa/disable', requireAuth, rateLimits.auth, async (req, res) => {
  try {
    const { password, mfaToken } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const metadata = getClientMetadata(req);

    // Verify password for sensitive operation
    const authResult = await auth.signInUser(userEmail, password, metadata.ip, metadata.userAgent);
    if (authResult.error) {
      return res.status(401).json({
        error: 'Password verification failed',
        category: 'password_verification_error'
      });
    }

    // Verify MFA token before disabling
    const mfaResult = await mfaManager.verifyTOTP(userId, mfaToken, metadata);
    if (!mfaResult.valid) {
      return res.status(401).json({
        error: 'MFA token verification failed',
        category: 'mfa_verification_error'
      });
    }

    const result = await mfaManager.disableMFA(userId, metadata);

    return res.status(200).json({
      message: result.message,
      mfaDisabled: true,
      warning: 'Multi-factor authentication has been disabled. Your account is less secure.'
    });

  } catch (error) {
    console.error('MFA disable error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to disable MFA',
      category: 'mfa_disable_error'
    });
  }
});

// Get user sessions
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessions, error } = await sessionManager.getUserSessions(userId);

    if (error) {
      return res.status(500).json({
        error: 'Failed to fetch sessions',
        category: 'session_fetch_error'
      });
    }

    return res.status(200).json({
      sessions: sessions.map(session => ({
        session_id: session.session_id.substring(0, 8) + '...',
        created_at: session.created_at,
        last_activity: session.last_activity,
        expires_at: session.expires_at,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        location: {
          country: session.location_country,
          city: session.location_city
        },
        is_mobile: session.is_mobile,
        activity_count: session.activity_count,
        suspicious_activity_count: session.suspicious_activity_count,
        is_current: session.session_id === req.session?.sessionId
      }))
    });

  } catch (error) {
    console.error('Sessions fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch sessions',
      category: 'session_fetch_error'
    });
  }
});

// Invalidate specific session
router.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    // For security, only allow users to invalidate their own sessions
    // We need to verify the session belongs to the user
    const { sessions } = await sessionManager.getUserSessions(userId);
    const sessionExists = sessions.some(s => s.session_id.startsWith(sessionId));

    if (!sessionExists) {
      return res.status(404).json({
        error: 'Session not found',
        category: 'session_not_found'
      });
    }

    const fullSessionId = sessions.find(s => s.session_id.startsWith(sessionId))?.session_id;
    const result = await sessionManager.invalidateSession(fullSessionId, 'manual_invalidation');

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to invalidate session',
        category: 'session_invalidation_error'
      });
    }

    return res.status(200).json({
      message: 'Session invalidated successfully'
    });

  } catch (error) {
    console.error('Session invalidation error:', error);
    return res.status(500).json({
      error: 'Failed to invalidate session',
      category: 'session_invalidation_error'
    });
  }
});

// Invalidate all other sessions (keep current)
router.post('/sessions/invalidate-others', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentSessionId = req.session?.sessionId;

    const result = await sessionManager.invalidateAllUserSessions(
      userId, 
      'user_requested', 
      currentSessionId
    );

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to invalidate sessions',
        category: 'session_invalidation_error'
      });
    }

    return res.status(200).json({
      message: 'All other sessions invalidated successfully',
      invalidatedCount: result.invalidatedCount
    });

  } catch (error) {
    console.error('Sessions invalidation error:', error);
    return res.status(500).json({
      error: 'Failed to invalidate sessions',
      category: 'session_invalidation_error'
    });
  }
});

module.exports = router;