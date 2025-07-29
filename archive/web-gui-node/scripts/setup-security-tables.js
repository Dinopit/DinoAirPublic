/**
 * Setup Security Tables for DinoAir
 * Creates necessary database tables for MFA, audit logging, and privacy controls
 */

const { supabaseAdmin } = require('../lib/supabase');

async function createSecurityTables() {
  console.log('🔐 Setting up security tables...');

  const tables = [
    {
      name: 'user_mfa',
      sql: `
        CREATE TABLE IF NOT EXISTS user_mfa (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL DEFAULT 'totp',
          secret TEXT NOT NULL,
          backup_codes JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          verified BOOLEAN DEFAULT FALSE,
          UNIQUE(user_id)
        );
      `
    },
    {
      name: 'audit_logs',
      sql: `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          event_type VARCHAR(100) NOT NULL,
          action VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          ip_address INET,
          user_agent TEXT,
          session_id VARCHAR(255),
          success BOOLEAN DEFAULT TRUE,
          failure_reason TEXT,
          resource_type VARCHAR(100),
          resource_id VARCHAR(255),
          severity VARCHAR(20) DEFAULT 'medium',
          metadata JSONB DEFAULT '{}'
        );
      `
    },
    {
      name: 'security_alerts',
      sql: `
        CREATE TABLE IF NOT EXISTS security_alerts (
          id SERIAL PRIMARY KEY,
          event_id INTEGER REFERENCES audit_logs(id) ON DELETE CASCADE,
          severity VARCHAR(20) NOT NULL,
          alert_type VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          acknowledged BOOLEAN DEFAULT FALSE,
          acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          acknowledged_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB DEFAULT '{}'
        );
      `
    },
    {
      name: 'incognito_sessions',
      sql: `
        CREATE TABLE IF NOT EXISTS incognito_sessions (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          session_id VARCHAR(255) UNIQUE NOT NULL,
          enabled_at TIMESTAMP WITH TIME ZONE NOT NULL,
          auto_delete_after INTEGER DEFAULT 24,
          data_retention VARCHAR(50) DEFAULT 'minimal',
          tracking_disabled BOOLEAN DEFAULT TRUE,
          analytics_disabled BOOLEAN DEFAULT TRUE
        );
      `
    },
    {
      name: 'user_retention_preferences',
      sql: `
        CREATE TABLE IF NOT EXISTS user_retention_preferences (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          chat_retention_days INTEGER DEFAULT 365,
          artifact_retention_days INTEGER DEFAULT 730,
          analytics_retention_days INTEGER DEFAULT 90,
          auto_delete_enabled BOOLEAN DEFAULT FALSE,
          minimal_data_collection BOOLEAN DEFAULT FALSE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `
    },
    {
      name: 'data_export_requests',
      sql: `
        CREATE TABLE IF NOT EXISTS data_export_requests (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          export_type VARCHAR(50) NOT NULL,
          requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          estimated_completion TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          file_path TEXT,
          file_size BIGINT,
          download_expires_at TIMESTAMP WITH TIME ZONE,
          includes JSONB DEFAULT '[]'
        );
      `
    },
    {
      name: 'data_deletion_requests',
      sql: `
        CREATE TABLE IF NOT EXISTS data_deletion_requests (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          deletion_type VARCHAR(50) NOT NULL,
          requested_at TIMESTAMP WITH TIME ZONE NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          legal_basis VARCHAR(100),
          retention_override BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMP WITH TIME ZONE,
          deleted_records JSONB DEFAULT '{}',
          retained_records JSONB DEFAULT '{}',
          includes JSONB DEFAULT '[]'
        );
      `
    }
  ];

  for (const table of tables) {
    try {
      console.log(`Creating table: ${table.name}`);
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: table.sql });

      if (error) {
        console.error(`Error creating table ${table.name}:`, error);
      } else {
        console.log(`✅ Table ${table.name} created successfully`);
      }
    } catch (error) {
      console.error(`Error creating table ${table.name}:`, error);
    }
  }

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);',
    'CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp);',
    'CREATE INDEX IF NOT EXISTS idx_export_requests_user_id ON data_export_requests(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON data_deletion_requests(user_id);'
  ];

  console.log('Creating indexes...');
  for (const indexSQL of indexes) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: indexSQL });
      if (error) {
        console.error('Error creating index:', error);
      }
    } catch (error) {
      console.error('Error creating index:', error);
    }
  }

  console.log('🔐 Security tables setup complete!');
}

if (require.main === module) {
  createSecurityTables()
    .then(() => {
      console.log('Security tables setup completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Security tables setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createSecurityTables };
