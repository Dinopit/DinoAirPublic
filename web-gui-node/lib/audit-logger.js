/**
 * Enhanced Audit Logging System
 * Comprehensive audit trail for security events and user actions
 */

const { SecurityDatabase } = require('./db-security-extensions');
const { get_logger } = require('../../structured_logging');

class AuditLogger {
  constructor() {
    this.logger = get_logger('audit_logger');
    this.db = new SecurityDatabase();
    this.eventTypes = {
      AUTH: 'authentication',
      AUTHORIZATION: 'authorization',
      DATA_ACCESS: 'data_access',
      DATA_MODIFICATION: 'data_modification',
      SYSTEM_CONFIG: 'system_configuration',
      SECURITY: 'security_event',
      PRIVACY: 'privacy_event',
      MFA: 'mfa_event',
      SESSION: 'session_management',
      API_ACCESS: 'api_access'
    };
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(userId, action, details = {}) {
    const event = {
      user_id: userId,
      event_type: this.eventTypes.AUTH,
      action,
      timestamp: new Date().toISOString(),
      ip_address: details.ipAddress || 'unknown',
      user_agent: details.userAgent || 'unknown',
      session_id: details.sessionId,
      success: details.success || false,
      failure_reason: details.failureReason,
      metadata: {
        auth_method: details.authMethod,
        mfa_used: details.mfaUsed || false,
        risk_score: details.riskScore,
        device_fingerprint: details.deviceFingerprint
      }
    };

    await this.storeAuditEvent(event);

    this.logger.audit(`Auth event: ${action}`, userId, {
      context: { correlation_id: details.correlationId },
      tags: ['authentication', action, details.success ? 'success' : 'failure']
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(userId, resource, action, details = {}) {
    const event = {
      user_id: userId,
      event_type: this.eventTypes.DATA_ACCESS,
      action: `${action}_${resource}`,
      timestamp: new Date().toISOString(),
      ip_address: details.ipAddress || 'unknown',
      user_agent: details.userAgent || 'unknown',
      resource_type: resource,
      resource_id: details.resourceId,
      success: details.success || true,
      metadata: {
        query_params: details.queryParams,
        response_size: details.responseSize,
        access_level: details.accessLevel,
        data_classification: details.dataClassification
      }
    };

    await this.storeAuditEvent(event);

    this.logger.audit(`Data access: ${action} ${resource}`, userId, {
      context: { correlation_id: details.correlationId },
      tags: ['data_access', resource, action]
    });
  }

  /**
   * Log data modification events
   */
  async logDataModification(userId, resource, action, details = {}) {
    const event = {
      user_id: userId,
      event_type: this.eventTypes.DATA_MODIFICATION,
      action: `${action}_${resource}`,
      timestamp: new Date().toISOString(),
      ip_address: details.ipAddress || 'unknown',
      user_agent: details.userAgent || 'unknown',
      resource_type: resource,
      resource_id: details.resourceId,
      success: details.success || true,
      metadata: {
        old_values: details.oldValues,
        new_values: details.newValues,
        fields_changed: details.fieldsChanged,
        change_reason: details.changeReason,
        approval_required: details.approvalRequired || false
      }
    };

    await this.storeAuditEvent(event);

    this.logger.audit(`Data modification: ${action} ${resource}`, userId, {
      context: { correlation_id: details.correlationId },
      tags: ['data_modification', resource, action]
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(userId, event, severity = 'medium', details = {}) {
    const auditEvent = {
      user_id: userId,
      event_type: this.eventTypes.SECURITY,
      action: event,
      timestamp: new Date().toISOString(),
      ip_address: details.ipAddress || 'unknown',
      user_agent: details.userAgent || 'unknown',
      severity,
      success: details.success !== false,
      metadata: {
        threat_type: details.threatType,
        attack_vector: details.attackVector,
        blocked: details.blocked || false,
        automated_response: details.automatedResponse,
        investigation_required: severity === 'high' || severity === 'critical'
      }
    };

    await this.storeAuditEvent(auditEvent);

    this.logger.security(`Security event: ${event}`, severity, {
      context: { correlation_id: details.correlationId },
      tags: ['security', event, `severity:${severity}`]
    });

    if (severity === 'high' || severity === 'critical') {
      await this.triggerSecurityAlert(auditEvent);
    }
  }

  /**
   * Log privacy events (GDPR compliance)
   */
  async logPrivacyEvent(userId, action, details = {}) {
    const event = {
      user_id: userId,
      event_type: this.eventTypes.PRIVACY,
      action,
      timestamp: new Date().toISOString(),
      ip_address: details.ipAddress || 'unknown',
      user_agent: details.userAgent || 'unknown',
      success: details.success || true,
      metadata: {
        data_subject_id: details.dataSubjectId || userId,
        legal_basis: details.legalBasis,
        data_categories: details.dataCategories,
        retention_period: details.retentionPeriod,
        consent_given: details.consentGiven,
        purpose: details.purpose
      }
    };

    await this.storeAuditEvent(event);

    this.logger.audit(`Privacy event: ${action}`, userId, {
      context: { correlation_id: details.correlationId },
      tags: ['privacy', action, 'gdpr']
    });
  }

  /**
   * Log session management events
   */
  async logSessionEvent(userId, action, details = {}) {
    const event = {
      user_id: userId,
      event_type: this.eventTypes.SESSION,
      action,
      timestamp: new Date().toISOString(),
      ip_address: details.ipAddress || 'unknown',
      user_agent: details.userAgent || 'unknown',
      session_id: details.sessionId,
      success: details.success || true,
      metadata: {
        session_duration: details.sessionDuration,
        concurrent_sessions: details.concurrentSessions,
        device_type: details.deviceType,
        location: details.location,
        suspicious_activity: details.suspiciousActivity || false
      }
    };

    await this.storeAuditEvent(event);

    this.logger.audit(`Session event: ${action}`, userId, {
      context: { correlation_id: details.correlationId },
      tags: ['session', action]
    });
  }

  /**
   * Log API access events
   */
  async logAPIAccess(userId, endpoint, method, details = {}) {
    const event = {
      user_id: userId,
      event_type: this.eventTypes.API_ACCESS,
      action: `${method}_${endpoint}`,
      timestamp: new Date().toISOString(),
      ip_address: details.ipAddress || 'unknown',
      user_agent: details.userAgent || 'unknown',
      success: details.success || true,
      metadata: {
        endpoint,
        method,
        status_code: details.statusCode,
        response_time: details.responseTime,
        request_size: details.requestSize,
        response_size: details.responseSize,
        api_key_used: details.apiKeyUsed || false,
        rate_limited: details.rateLimited || false
      }
    };

    await this.storeAuditEvent(event);
  }

  /**
   * Store audit event in database
   */
  async storeAuditEvent(event) {
    try {
      await this.db.storeAuditLog(event);
    } catch (error) {
      this.logger.error('Failed to store audit event', 'system', { error });
      this.logger.audit(`AUDIT_FALLBACK: ${JSON.stringify(event)}`);
    }
  }

  /**
   * Trigger security alerts for high-severity events
   */
  async triggerSecurityAlert(event) {
    this.logger.fatal(`SECURITY ALERT: ${event.action}`, 'security', {
      context: { correlation_id: event.metadata?.correlationId },
      tags: ['security_alert', 'critical', event.action]
    });

    await this.db.storeSecurityAlert({
      event_id: event.id,
      severity: event.severity,
      alert_type: 'security_event',
      message: `Security event detected: ${event.action}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata: event.metadata
    });
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(filters = {}) {
    const { startDate, endDate, userId, eventType, action, severity } = filters;

    const events = await this.db.getAuditLogs({
      start_date: startDate,
      end_date: endDate,
      user_id: userId,
      event_type: eventType,
      action,
      severity
    });

    return {
      summary: {
        total_events: events.length,
        event_types: this.groupBy(events, 'event_type'),
        users: this.groupBy(events, 'user_id'),
        success_rate: this.calculateSuccessRate(events),
        time_range: { startDate, endDate }
      },
      events: events.map(event => ({
        ...event,
        risk_level: this.calculateRiskLevel(event)
      }))
    };
  }

  /**
   * Helper methods
   */
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  calculateSuccessRate(events) {
    const successful = events.filter(e => e.success).length;
    return events.length > 0 ? (successful / events.length) * 100 : 0;
  }

  calculateRiskLevel(event) {
    let risk = 0;

    const riskByType = {
      [this.eventTypes.AUTH]: 2,
      [this.eventTypes.SECURITY]: 5,
      [this.eventTypes.DATA_MODIFICATION]: 3,
      [this.eventTypes.PRIVACY]: 4
    };

    risk += riskByType[event.event_type] || 1;

    if (!event.success) risk += 3;

    if (event.metadata?.suspicious_activity) risk += 4;

    if (risk <= 3) return 'low';
    if (risk <= 6) return 'medium';
    if (risk <= 8) return 'high';
    return 'critical';
  }
}

module.exports = { AuditLogger };
