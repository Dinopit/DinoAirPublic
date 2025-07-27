/**
 * Privacy Controls Manager
 * Implements GDPR compliance, data retention, and privacy controls
 */

const { SecurityDatabase } = require('./db-security-extensions');
const crypto = require('crypto');
const { AuditLogger } = require('./audit-logger');

class PrivacyManager {
  constructor() {
    this.auditLogger = new AuditLogger();
    this.db = new SecurityDatabase();
    this.dataRetentionPolicies = {
      chat_messages: { days: 365, auto_delete: true },
      audit_logs: { days: 2555, auto_delete: false }, // 7 years for compliance
      user_sessions: { days: 30, auto_delete: true },
      api_logs: { days: 90, auto_delete: true },
      artifacts: { days: 730, auto_delete: false }, // 2 years
      user_preferences: { days: -1, auto_delete: false } // Indefinite
    };
  }

  /**
   * Enable incognito mode for user session
   */
  async enableIncognitoMode(userId, sessionId, details = {}) {
    const incognitoSession = {
      user_id: userId,
      session_id: sessionId,
      enabled_at: new Date().toISOString(),
      auto_delete_after: details.autoDeleteAfter || 24, // hours
      data_retention: 'minimal',
      tracking_disabled: true,
      analytics_disabled: true
    };

    await this.db.storeIncognitoSession(incognitoSession);

    await this.auditLogger.logPrivacyEvent(userId, 'incognito_enabled', {
      sessionId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      autoDeleteAfter: incognitoSession.auto_delete_after
    });

    return incognitoSession;
  }

  /**
   * Disable incognito mode
   */
  async disableIncognitoMode(userId, sessionId, details = {}) {
    await this.db.deleteIncognitoSession(sessionId);

    await this.auditLogger.logPrivacyEvent(userId, 'incognito_disabled', {
      sessionId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent
    });
  }

  /**
   * Check if session is in incognito mode
   */
  async isIncognitoMode(sessionId) {
    const session = await this.db.getIncognitoSession(sessionId);
    return !!session;
  }

  /**
   * Set data retention preferences for user
   */
  async setDataRetentionPreferences(userId, preferences, details = {}) {
    const retentionSettings = {
      user_id: userId,
      chat_retention_days: preferences.chatRetentionDays || 365,
      artifact_retention_days: preferences.artifactRetentionDays || 730,
      analytics_retention_days: preferences.analyticsRetentionDays || 90,
      auto_delete_enabled: preferences.autoDeleteEnabled || false,
      minimal_data_collection: preferences.minimalDataCollection || false,
      updated_at: new Date().toISOString()
    };

    await this.db.storeUserRetentionPreferences(userId, retentionSettings);

    await this.auditLogger.logPrivacyEvent(userId, 'retention_preferences_updated', {
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      preferences: retentionSettings
    });

    return retentionSettings;
  }

  /**
   * Get user's data retention preferences
   */
  async getDataRetentionPreferences(userId) {
    const preferences = await this.db.getUserRetentionPreferences(userId);
    return preferences || this.getDefaultRetentionPreferences();
  }

  /**
   * Request data export (GDPR Article 20)
   */
  async requestDataExport(userId, exportType = 'full', details = {}) {
    const exportRequest = {
      user_id: userId,
      export_type: exportType,
      requested_at: new Date().toISOString(),
      status: 'pending',
      estimated_completion: this.calculateExportTime(exportType),
      includes: this.getExportIncludes(exportType)
    };

    const requestId = await this.db.storeDataExportRequest(exportRequest);

    await this.auditLogger.logPrivacyEvent(userId, 'data_export_requested', {
      requestId,
      exportType,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent
    });

    this.processDataExport(requestId, userId, exportType);

    return { requestId, estimatedCompletion: exportRequest.estimated_completion };
  }

  /**
   * Process data export request
   */
  async processDataExport(requestId, userId, exportType) {
    try {
      await this.db.updateDataExportRequest(requestId, { status: 'processing' });

      const exportData = await this.collectUserData(userId, exportType);
      const exportFile = await this.generateExportFile(exportData, exportType);

      await this.db.updateDataExportRequest(requestId, {
        status: 'completed',
        file_path: exportFile.path,
        file_size: exportFile.size,
        completed_at: new Date().toISOString(),
        download_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

      await this.auditLogger.logPrivacyEvent(userId, 'data_export_completed', {
        requestId,
        exportType,
        fileSize: exportFile.size
      });
    } catch (error) {
      await this.db.updateDataExportRequest(requestId, {
        status: 'failed',
        error_message: error.message,
        failed_at: new Date().toISOString()
      });

      await this.auditLogger.logPrivacyEvent(userId, 'data_export_failed', {
        requestId,
        exportType,
        error: error.message
      });
    }
  }

  /**
   * Request data deletion (GDPR Article 17 - Right to be forgotten)
   */
  async requestDataDeletion(userId, deletionType = 'full', details = {}) {
    const deletionRequest = {
      user_id: userId,
      deletion_type: deletionType,
      requested_at: new Date().toISOString(),
      status: 'pending',
      legal_basis: details.legalBasis || 'user_request',
      retention_override: details.retentionOverride || false,
      includes: this.getDeletionIncludes(deletionType)
    };

    const requestId = await this.db.storeDeletionRequest(deletionRequest);

    await this.auditLogger.logPrivacyEvent(userId, 'data_deletion_requested', {
      requestId,
      deletionType,
      legalBasis: deletionRequest.legal_basis,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent
    });

    if (deletionType === 'full') {
      setTimeout(
        () => this.processDeletionRequest(requestId, userId, deletionType),
        details.immediateDelete ? 0 : 24 * 60 * 60 * 1000
      ); // 24 hour delay
    } else {
      this.processDeletionRequest(requestId, userId, deletionType);
    }

    return { requestId, status: 'pending' };
  }

  /**
   * Process data deletion request
   */
  async processDeletionRequest(requestId, userId, deletionType) {
    try {
      await this.db.updateDeletionRequest(requestId, { status: 'processing' });

      const deletionResults = await this.deleteUserData(userId, deletionType);

      await this.db.updateDeletionRequest(requestId, {
        status: 'completed',
        deleted_records: deletionResults.deletedRecords,
        retained_records: deletionResults.retainedRecords,
        completed_at: new Date().toISOString()
      });

      await this.auditLogger.logPrivacyEvent(userId, 'data_deletion_completed', {
        requestId,
        deletionType,
        deletedRecords: deletionResults.deletedRecords,
        retainedRecords: deletionResults.retainedRecords
      });
    } catch (error) {
      await this.db.updateDeletionRequest(requestId, {
        status: 'failed',
        error_message: error.message,
        failed_at: new Date().toISOString()
      });

      await this.auditLogger.logPrivacyEvent(userId, 'data_deletion_failed', {
        requestId,
        deletionType,
        error: error.message
      });
    }
  }

  /**
   * Anonymize user data instead of deletion
   */
  async anonymizeUserData(userId, details = {}) {
    const anonymizationId = crypto.randomUUID();

    const anonymizationResults = {
      user_profile: await db.anonymizeUserProfile(userId, anonymizationId),
      chat_messages: await db.anonymizeChatMessages(userId, anonymizationId),
      artifacts: await db.anonymizeArtifacts(userId, anonymizationId),
      api_logs: await db.anonymizeApiLogs(userId, anonymizationId)
    };

    await this.auditLogger.logPrivacyEvent(userId, 'data_anonymized', {
      anonymizationId,
      results: anonymizationResults,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent
    });

    return { anonymizationId, results: anonymizationResults };
  }

  /**
   * Apply automatic data retention policies
   */
  async applyRetentionPolicies() {
    const results = {};

    for (const [dataType, policy] of Object.entries(this.dataRetentionPolicies)) {
      if (policy.auto_delete && policy.days > 0) {
        const cutoffDate = new Date(Date.now() - policy.days * 24 * 60 * 60 * 1000);

        try {
          const deletedCount = await db.deleteExpiredData(dataType, cutoffDate);
          results[dataType] = { deleted: deletedCount, cutoffDate };

          await this.auditLogger.logPrivacyEvent(null, 'automatic_data_retention', {
            dataType,
            deletedRecords: deletedCount,
            cutoffDate: cutoffDate.toISOString()
          });
        } catch (error) {
          results[dataType] = { error: error.message };
        }
      }
    }

    return results;
  }

  /**
   * Get privacy dashboard data for user
   */
  async getPrivacyDashboard(userId) {
    const [retentionPreferences, exportRequests, deletionRequests, dataUsage, consentStatus] = await Promise.all([
      this.getDataRetentionPreferences(userId),
      db.getUserExportRequests(userId),
      db.getUserDeletionRequests(userId),
      this.calculateDataUsage(userId),
      this.getConsentStatus(userId)
    ]);

    return {
      retentionPreferences,
      exportRequests,
      deletionRequests,
      dataUsage,
      consentStatus,
      privacyScore: this.calculatePrivacyScore(userId)
    };
  }

  /**
   * Helper methods
   */
  getDefaultRetentionPreferences() {
    return {
      chat_retention_days: 365,
      artifact_retention_days: 730,
      analytics_retention_days: 90,
      auto_delete_enabled: false,
      minimal_data_collection: false
    };
  }

  calculateExportTime(exportType) {
    const estimatedMinutes = {
      basic: 5,
      full: 30,
      chat_only: 10,
      artifacts_only: 15
    };

    const minutes = estimatedMinutes[exportType] || 30;
    return new Date(Date.now() + minutes * 60 * 1000).toISOString();
  }

  getExportIncludes(exportType) {
    const includes = {
      basic: ['profile', 'preferences'],
      full: ['profile', 'preferences', 'chat_messages', 'artifacts', 'api_logs'],
      chat_only: ['profile', 'chat_messages'],
      artifacts_only: ['profile', 'artifacts']
    };

    return includes[exportType] || includes.full;
  }

  getDeletionIncludes(deletionType) {
    const includes = {
      full: ['profile', 'chat_messages', 'artifacts', 'preferences', 'sessions'],
      chat_only: ['chat_messages'],
      artifacts_only: ['artifacts'],
      sessions_only: ['sessions']
    };

    return includes[deletionType] || includes.full;
  }

  async collectUserData(userId, exportType) {
    return {
      user_id: userId,
      export_type: exportType,
      generated_at: new Date().toISOString(),
      data: {} // Actual user data would be collected here
    };
  }

  async generateExportFile(exportData, exportType) {
    return {
      path: `/exports/${exportData.user_id}_${Date.now()}.json`,
      size: JSON.stringify(exportData).length
    };
  }

  async deleteUserData(userId, deletionType) {
    return {
      deletedRecords: 0,
      retainedRecords: 0
    };
  }

  async calculateDataUsage(userId) {
    return {
      chatMessages: 0,
      artifacts: 0,
      totalSize: 0
    };
  }

  async getConsentStatus(userId) {
    return {
      analytics: false,
      marketing: false,
      thirdParty: false
    };
  }

  async calculatePrivacyScore(userId) {
    return 85; // Placeholder score
  }
}

module.exports = { PrivacyManager };
