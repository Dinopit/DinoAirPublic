/**
 * Database Security Extensions
 * Extends the existing database layer with security-related functionality
 */

const db = require('./db');
const { supabaseAdmin } = require('./supabase');

class SecurityDatabase {
  constructor() {
    this.supabase = supabaseAdmin;
    this.initialized = false;
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeSecurityTables();
      this.initialized = true;
    }
  }

  /**
   * MFA Data Management
   */
  async storeMFASecret(userId, mfaData) {
    await this.ensureInitialized();

    try {
      const { data, error } = await this.supabase
        .from('user_mfa')
        .upsert({
          user_id: userId,
          type: mfaData.type,
          secret: mfaData.secret,
          backup_codes: mfaData.backup_codes,
          created_at: mfaData.created_at,
          verified: mfaData.verified
        })
        .select();

      if (error) throw error;
      return data[0]?.id;
    } catch (error) {
      console.error('Error storing MFA secret:', error);
      throw error;
    }
  }

  async getMFAData(userId) {
    await this.ensureInitialized();

    try {
      const { data, error } = await this.supabase
        .from('user_mfa')
        .select('type, secret, backup_codes, created_at, verified')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      if (!data) return null;

      return {
        type: data.type,
        secret: data.secret,
        backup_codes: data.backup_codes || [],
        created_at: data.created_at,
        verified: data.verified
      };
    } catch (error) {
      console.error('Error getting MFA data:', error);
      throw error;
    }
  }

  async updateMFAData(userId, updates) {
    await this.ensureInitialized();

    try {
      const { data, error } = await this.supabase
        .from('user_mfa')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error updating MFA data:', error);
      throw error;
    }
  }

  async deleteMFAData(userId) {
    await this.ensureInitialized();

    try {
      const { error } = await this.supabase.from('user_mfa').delete().eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting MFA data:', error);
      throw error;
    }
  }

  /**
   * Audit Logging
   */
  async storeAuditLog(auditEvent) {
    await this.ensureInitialized();

    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .insert({
          user_id: auditEvent.user_id,
          event_type: auditEvent.event_type,
          action: auditEvent.action,
          timestamp: auditEvent.timestamp,
          ip_address: auditEvent.ip_address,
          user_agent: auditEvent.user_agent,
          session_id: auditEvent.session_id,
          success: auditEvent.success,
          failure_reason: auditEvent.failure_reason,
          resource_type: auditEvent.resource_type,
          resource_id: auditEvent.resource_id,
          severity: auditEvent.severity,
          metadata: auditEvent.metadata || {}
        })
        .select();

      if (error) throw error;
      return data[0]?.id;
    } catch (error) {
      console.error('Error storing audit log:', error);
      throw error;
    }
  }

  async getAuditLogs(filters = {}) {
    await this.ensureInitialized();

    try {
      let query = this.supabase.from('audit_logs').select('*');

      if (filters.start_date) {
        query = query.gte('timestamp', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('timestamp', filters.end_date);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.event_type) {
        query = query.eq('event_type', filters.event_type);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      const { data, error } = await query.order('timestamp', { ascending: false }).limit(1000);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Security Alerts
   */
  async storeSecurityAlert(alert) {
    await this.ensureInitialized();

    try {
      const { data, error } = await this.supabase
        .from('security_alerts')
        .insert({
          event_id: alert.event_id,
          severity: alert.severity,
          alert_type: alert.alert_type,
          message: alert.message,
          timestamp: alert.timestamp,
          acknowledged: alert.acknowledged,
          metadata: alert.metadata || {}
        })
        .select();

      if (error) throw error;
      return data[0]?.id;
    } catch (error) {
      console.error('Error storing security alert:', error);
      throw error;
    }
  }

  /**
   * Privacy Management
   */
  async storeIncognitoSession(session) {
    await this.ensureInitialized();

    try {
      const { error } = await this.supabase.from('incognito_sessions').upsert({
        user_id: session.user_id,
        session_id: session.session_id,
        enabled_at: session.enabled_at,
        auto_delete_after: session.auto_delete_after,
        data_retention: session.data_retention,
        tracking_disabled: session.tracking_disabled,
        analytics_disabled: session.analytics_disabled
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing incognito session:', error);
      throw error;
    }
  }

  async getIncognitoSession(sessionId) {
    await this.ensureInitialized();

    try {
      const { data, error } = await this.supabase
        .from('incognito_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting incognito session:', error);
      throw error;
    }
  }

  async deleteIncognitoSession(sessionId) {
    await this.ensureInitialized();

    try {
      const { error } = await this.supabase.from('incognito_sessions').delete().eq('session_id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting incognito session:', error);
      throw error;
    }
  }

  async storeUserRetentionPreferences(userId, preferences) {
    const query = `
      INSERT INTO user_retention_preferences (
        user_id, chat_retention_days, artifact_retention_days, 
        analytics_retention_days, auto_delete_enabled, minimal_data_collection, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        chat_retention_days = EXCLUDED.chat_retention_days,
        artifact_retention_days = EXCLUDED.artifact_retention_days,
        analytics_retention_days = EXCLUDED.analytics_retention_days,
        auto_delete_enabled = EXCLUDED.auto_delete_enabled,
        minimal_data_collection = EXCLUDED.minimal_data_collection,
        updated_at = EXCLUDED.updated_at
    `;

    const values = [
      userId,
      preferences.chat_retention_days,
      preferences.artifact_retention_days,
      preferences.analytics_retention_days,
      preferences.auto_delete_enabled,
      preferences.minimal_data_collection,
      preferences.updated_at
    ];

    try {
      await this.db.query(query, values);
    } catch (error) {
      console.error('Error storing retention preferences:', error);
      throw error;
    }
  }

  async getUserRetentionPreferences(userId) {
    const query = 'SELECT * FROM user_retention_preferences WHERE user_id = $1';

    try {
      const result = await this.db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting retention preferences:', error);
      throw error;
    }
  }

  async storeDataExportRequest(exportRequest) {
    const query = `
      INSERT INTO data_export_requests (
        user_id, export_type, requested_at, status, estimated_completion, includes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const values = [
      exportRequest.user_id,
      exportRequest.export_type,
      exportRequest.requested_at,
      exportRequest.status,
      exportRequest.estimated_completion,
      JSON.stringify(exportRequest.includes)
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0]?.id;
    } catch (error) {
      console.error('Error storing export request:', error);
      throw error;
    }
  }

  async updateDataExportRequest(requestId, updates) {
    const setClause = [];
    const values = [requestId];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      setClause.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    const query = `
      UPDATE data_export_requests 
      SET ${setClause.join(', ')}
      WHERE id = $1
    `;

    try {
      await this.db.query(query, values);
    } catch (error) {
      console.error('Error updating export request:', error);
      throw error;
    }
  }

  async getUserExportRequests(userId) {
    const query = `
      SELECT * FROM data_export_requests 
      WHERE user_id = $1 
      ORDER BY requested_at DESC
    `;

    try {
      const result = await this.db.query(query, [userId]);
      return result.rows.map(row => ({
        ...row,
        includes: JSON.parse(row.includes || '[]')
      }));
    } catch (error) {
      console.error('Error getting export requests:', error);
      throw error;
    }
  }

  async storeDeletionRequest(deletionRequest) {
    const query = `
      INSERT INTO data_deletion_requests (
        user_id, deletion_type, requested_at, status, legal_basis, 
        retention_override, includes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    const values = [
      deletionRequest.user_id,
      deletionRequest.deletion_type,
      deletionRequest.requested_at,
      deletionRequest.status,
      deletionRequest.legal_basis,
      deletionRequest.retention_override,
      JSON.stringify(deletionRequest.includes)
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0]?.id;
    } catch (error) {
      console.error('Error storing deletion request:', error);
      throw error;
    }
  }

  async updateDeletionRequest(requestId, updates) {
    const setClause = [];
    const values = [requestId];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'object') {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    }

    const query = `
      UPDATE data_deletion_requests 
      SET ${setClause.join(', ')}
      WHERE id = $1
    `;

    try {
      await this.db.query(query, values);
    } catch (error) {
      console.error('Error updating deletion request:', error);
      throw error;
    }
  }

  async getUserDeletionRequests(userId) {
    const query = `
      SELECT * FROM data_deletion_requests 
      WHERE user_id = $1 
      ORDER BY requested_at DESC
    `;

    try {
      const result = await this.db.query(query, [userId]);
      return result.rows.map(row => ({
        ...row,
        includes: JSON.parse(row.includes || '[]')
      }));
    } catch (error) {
      console.error('Error getting deletion requests:', error);
      throw error;
    }
  }

  /**
   * Data cleanup operations
   */
  async deleteExpiredData(dataType, cutoffDate) {
    const tableMap = {
      chat_messages: 'chat_messages',
      audit_logs: 'audit_logs',
      user_sessions: 'user_sessions',
      api_logs: 'api_logs',
      artifacts: 'artifacts'
    };

    const table = tableMap[dataType];
    if (!table) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    const query = `
      DELETE FROM ${table} 
      WHERE created_at < $1 
      AND auto_delete = true
    `;

    try {
      const result = await this.db.query(query, [cutoffDate]);
      return result.rowCount || 0;
    } catch (error) {
      console.error(`Error deleting expired ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Initialize security tables
   */
  async initializeSecurityTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS user_mfa (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        secret TEXT NOT NULL,
        backup_codes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        verified BOOLEAN DEFAULT FALSE
      )`,

      `CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        event_type VARCHAR(100) NOT NULL,
        action VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        session_id VARCHAR(255),
        success BOOLEAN DEFAULT TRUE,
        failure_reason TEXT,
        resource_type VARCHAR(100),
        resource_id VARCHAR(255),
        severity VARCHAR(20) DEFAULT 'medium',
        metadata JSONB DEFAULT '{}'
      )`,

      `CREATE TABLE IF NOT EXISTS security_alerts (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES audit_logs(id),
        severity VARCHAR(20) NOT NULL,
        alert_type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        acknowledged BOOLEAN DEFAULT FALSE,
        acknowledged_by VARCHAR(255),
        acknowledged_at TIMESTAMP,
        metadata JSONB DEFAULT '{}'
      )`,

      `CREATE TABLE IF NOT EXISTS incognito_sessions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        enabled_at TIMESTAMP NOT NULL,
        auto_delete_after INTEGER DEFAULT 24,
        data_retention VARCHAR(50) DEFAULT 'minimal',
        tracking_disabled BOOLEAN DEFAULT TRUE,
        analytics_disabled BOOLEAN DEFAULT TRUE
      )`,

      `CREATE TABLE IF NOT EXISTS user_retention_preferences (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        chat_retention_days INTEGER DEFAULT 365,
        artifact_retention_days INTEGER DEFAULT 730,
        analytics_retention_days INTEGER DEFAULT 90,
        auto_delete_enabled BOOLEAN DEFAULT FALSE,
        minimal_data_collection BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT NOW()
      )`,

      `CREATE TABLE IF NOT EXISTS data_export_requests (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        export_type VARCHAR(50) NOT NULL,
        requested_at TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        estimated_completion TIMESTAMP,
        completed_at TIMESTAMP,
        file_path TEXT,
        file_size BIGINT,
        download_expires_at TIMESTAMP,
        includes JSONB DEFAULT '[]'
      )`,

      `CREATE TABLE IF NOT EXISTS data_deletion_requests (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        deletion_type VARCHAR(50) NOT NULL,
        requested_at TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        legal_basis VARCHAR(100),
        retention_override BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        deleted_records JSONB DEFAULT '{}',
        retained_records JSONB DEFAULT '{}',
        includes JSONB DEFAULT '[]'
      )`
    ];

    for (const tableSQL of tables) {
      try {
        await this.db.query(tableSQL);
      } catch (error) {
        console.error('Error creating security table:', error);
        throw error;
      }
    }

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type)',
      'CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_export_requests_user_id ON data_export_requests(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON data_deletion_requests(user_id)'
    ];

    for (const indexSQL of indexes) {
      try {
        await this.db.query(indexSQL);
      } catch (error) {
        console.error('Error creating index:', error);
      }
    }
  }
}

module.exports = { SecurityDatabase };
