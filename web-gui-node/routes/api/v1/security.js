/**
 * Security API Routes
 * Handles MFA, audit logs, and privacy controls
 */

const express = require('express');
const router = express.Router();
const { requireAuth, anyAuth } = require('../../../middleware/auth-middleware');
const { MFAManager } = require('../../../lib/mfa-manager');
const { AuditLogger } = require('../../../lib/audit-logger');
const { PrivacyManager } = require('../../../lib/privacy-manager');

const mfaManager = new MFAManager();
const auditLogger = new AuditLogger();
const privacyManager = new PrivacyManager();

/**
 * MFA Endpoints
 */

router.post('/mfa/setup', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    const mfaSetup = await mfaManager.generateTOTPSecret(userId, userEmail);
    const qrCode = await mfaManager.generateQRCode(mfaSetup.qrCodeUrl);

    await auditLogger.logSecurityEvent(userId, 'mfa_setup_initiated', 'medium', {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.headers['x-correlation-id']
    });

    res.json({
      success: true,
      data: {
        secret: mfaSetup.secret,
        qrCode,
        manualEntryKey: mfaSetup.manualEntryKey,
        backupCodes: [] // Will be provided after verification
      }
    });
  } catch (error) {
    await auditLogger.logSecurityEvent(req.user?.id, 'mfa_setup_failed', 'high', {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to setup MFA',
      message: error.message
    });
  }
});

router.post('/mfa/verify', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required'
      });
    }

    const verification = await mfaManager.verifyTOTP(userId, token);

    if (verification.valid) {
      const mfaStatus = await mfaManager.getMFAStatus(userId);
      const mfaData = await mfaManager.getMFAData(userId);

      await auditLogger.logSecurityEvent(userId, 'mfa_setup_completed', 'medium', {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.headers['x-correlation-id']
      });

      res.json({
        success: true,
        data: {
          verified: true,
          backupCodes: mfaData?.backup_codes || [],
          status: mfaStatus
        }
      });
    } else {
      await auditLogger.logSecurityEvent(userId, 'mfa_verification_failed', 'medium', {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        error: verification.error
      });

      res.status(400).json({
        success: false,
        error: verification.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
    });
  }
});

router.get('/mfa/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await mfaManager.getMFAStatus(userId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get MFA status',
      message: error.message
    });
  }
});

router.post('/mfa/backup-codes/regenerate', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const newCodes = await mfaManager.regenerateBackupCodes(userId);

    await auditLogger.logSecurityEvent(userId, 'backup_codes_regenerated', 'medium', {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.headers['x-correlation-id']
    });

    res.json({
      success: true,
      data: {
        backupCodes: newCodes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate backup codes',
      message: error.message
    });
  }
});

router.post('/mfa/disable', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    const verification = await mfaManager.verifyTOTP(userId, token);
    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token'
      });
    }

    await mfaManager.disableMFA(userId);

    await auditLogger.logSecurityEvent(userId, 'mfa_disabled', 'high', {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.headers['x-correlation-id']
    });

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to disable MFA',
      message: error.message
    });
  }
});

/**
 * Privacy Control Endpoints
 */

router.post('/privacy/incognito/enable', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.sessionID || req.headers['x-session-id'];
    const { autoDeleteAfter } = req.body;

    const incognitoSession = await privacyManager.enableIncognitoMode(userId, sessionId, {
      autoDeleteAfter,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: incognitoSession
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to enable incognito mode',
      message: error.message
    });
  }
});

router.post('/privacy/incognito/disable', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.sessionID || req.headers['x-session-id'];

    await privacyManager.disableIncognitoMode(userId, sessionId, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Incognito mode disabled'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to disable incognito mode',
      message: error.message
    });
  }
});

router.post('/privacy/retention', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const retentionSettings = await privacyManager.setDataRetentionPreferences(userId, preferences, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: retentionSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to set retention preferences',
      message: error.message
    });
  }
});

router.get('/privacy/retention', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await privacyManager.getDataRetentionPreferences(userId);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get retention preferences',
      message: error.message
    });
  }
});

router.post('/privacy/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { exportType = 'full' } = req.body;

    const exportRequest = await privacyManager.requestDataExport(userId, exportType, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: exportRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to request data export',
      message: error.message
    });
  }
});

router.post('/privacy/delete', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { deletionType = 'full', legalBasis = 'user_request' } = req.body;

    const deletionRequest = await privacyManager.requestDataDeletion(userId, deletionType, {
      legalBasis,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: deletionRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to request data deletion',
      message: error.message
    });
  }
});

router.get('/privacy/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const dashboard = await privacyManager.getPrivacyDashboard(userId);

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get privacy dashboard',
      message: error.message
    });
  }
});

/**
 * Audit Log Endpoints
 */

router.get('/audit/logs', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, eventType, action, page = 1, limit = 50 } = req.query;

    const filters = {
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      event_type: eventType,
      action
    };

    const auditReport = await auditLogger.generateAuditReport(filters);

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedEvents = auditReport.events.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        summary: auditReport.summary,
        events: paginatedEvents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: auditReport.events.length,
          totalPages: Math.ceil(auditReport.events.length / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get audit logs',
      message: error.message
    });
  }
});

router.get('/security/events', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filters = {
      user_id: userId,
      start_date: startDate.toISOString(),
      event_type: 'security_event'
    };

    const securityReport = await auditLogger.generateAuditReport(filters);

    res.json({
      success: true,
      data: {
        summary: securityReport.summary,
        recentEvents: securityReport.events.slice(0, 10),
        riskAnalysis: {
          totalEvents: securityReport.events.length,
          highRiskEvents: securityReport.events.filter(e => e.risk_level === 'high' || e.risk_level === 'critical')
            .length,
          failedAttempts: securityReport.events.filter(e => !e.success).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get security events',
      message: error.message
    });
  }
});

module.exports = router;
