-- Enhanced session management database schema
-- Creates table for tracking user sessions with sliding timeouts and activity monitoring

-- Enable the pg_similarity extension if available (for user agent comparison)
-- This needs to be at the beginning before any functions that use SIMILARITY
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_similarity;
EXCEPTION WHEN others THEN
    -- Extension not available, continue without it
    NULL;
END
$$;

-- User sessions table for enhanced session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NULL,
    end_reason VARCHAR(50) NULL, -- 'expired', 'manual', 'suspicious_activity', 'session_limit_exceeded'
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    location_country VARCHAR(2) NULL,
    location_city VARCHAR(100) NULL,
    device_fingerprint VARCHAR(128) NULL,
    is_mobile BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    activity_count INTEGER NOT NULL DEFAULT 1,
    suspicious_activity_count INTEGER NOT NULL DEFAULT 0,
    last_suspicious_activity TIMESTAMPTZ NULL,
    
    -- Indexes for performance
    CONSTRAINT valid_session_id CHECK (session_id ~ '^[a-f0-9]{64}$'),
    CONSTRAINT valid_end_reason CHECK (end_reason IS NULL OR end_reason IN ('expired', 'manual', 'suspicious_activity', 'session_limit_exceeded', 'security')),
    CONSTRAINT valid_activity_count CHECK (activity_count >= 1),
    CONSTRAINT valid_suspicious_count CHECK (suspicious_activity_count >= 0)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_user_sessions_suspicious ON user_sessions(suspicious_activity_count) WHERE suspicious_activity_count > 0;

-- Row Level Security (RLS) policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can manage all sessions (for admin functions)
CREATE POLICY "Service role can manage sessions" ON user_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Enhanced API keys table for role-based permissions
CREATE TABLE IF NOT EXISTS api_key_permissions (
    id BIGSERIAL PRIMARY KEY,
    api_key_id BIGINT NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    resource_scope VARCHAR(100) NULL, -- Optional resource-specific scope
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(api_key_id, permission, resource_scope),
    CONSTRAINT valid_permission CHECK (permission IN (
        'read', 'write', 'delete', 'admin',
        'chat:read', 'chat:write', 'chat:delete',
        'artifacts:read', 'artifacts:write', 'artifacts:delete',
        'system:read', 'system:write', 'system:monitor',
        'users:read', 'users:write', 'users:admin'
    ))
);

-- Index for permission lookups
CREATE INDEX IF NOT EXISTS idx_api_key_permissions_key_id ON api_key_permissions(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_permissions_permission ON api_key_permissions(permission);

-- Enhanced lockout tracking table for persistent account lockouts
CREATE TABLE IF NOT EXISTS user_lockouts (
    id BIGSERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- email or IP address
    lockout_type VARCHAR(20) NOT NULL, -- 'email' or 'ip'
    failed_attempts INTEGER NOT NULL DEFAULT 1,
    first_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ NULL,
    unlock_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(identifier, lockout_type),
    CONSTRAINT valid_lockout_type CHECK (lockout_type IN ('email', 'ip')),
    CONSTRAINT valid_failed_attempts CHECK (failed_attempts >= 0),
    CONSTRAINT valid_unlock_attempts CHECK (unlock_attempts >= 0)
);

-- Indexes for lockout queries
CREATE INDEX IF NOT EXISTS idx_user_lockouts_identifier ON user_lockouts(identifier);
CREATE INDEX IF NOT EXISTS idx_user_lockouts_locked_until ON user_lockouts(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_lockouts_type ON user_lockouts(lockout_type);

-- Security events table for audit logging
CREATE TABLE IF NOT EXISTS security_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(64) REFERENCES user_sessions(session_id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
    event_description TEXT NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'login_success', 'login_failed', 'logout', 'session_created', 'session_invalidated',
        'suspicious_activity', 'account_locked', 'account_unlocked', 'password_changed',
        'mfa_enabled', 'mfa_disabled', 'api_key_created', 'api_key_revoked',
        'permission_denied', 'rate_limit_exceeded'
    )),
    CONSTRAINT valid_severity CHECK (event_severity IN ('info', 'warning', 'critical'))
);

-- Indexes for security event queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(event_severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address);

-- MFA (Multi-Factor Authentication) table
CREATE TABLE IF NOT EXISTS user_mfa (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mfa_type VARCHAR(20) NOT NULL DEFAULT 'totp', -- 'totp', 'sms', 'email'
    secret_key VARCHAR(128) NOT NULL, -- Encrypted TOTP secret
    backup_codes TEXT[] NULL, -- Encrypted backup codes
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used TIMESTAMPTZ NULL,
    failure_count INTEGER NOT NULL DEFAULT 0,
    
    UNIQUE(user_id, mfa_type),
    CONSTRAINT valid_mfa_type CHECK (mfa_type IN ('totp', 'sms', 'email')),
    CONSTRAINT valid_failure_count CHECK (failure_count >= 0)
);

-- Index for MFA lookups
CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_enabled ON user_mfa(enabled) WHERE enabled = TRUE;

-- Row Level Security for MFA
ALTER TABLE user_mfa ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own MFA settings
CREATE POLICY "Users can manage own MFA" ON user_mfa
    FOR ALL USING (auth.uid() = user_id);

-- Function to clean up expired sessions (can be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET active = FALSE, 
        ended_at = NOW(),
        end_reason = 'expired'
    WHERE active = TRUE 
      AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log the cleanup
    INSERT INTO security_events (event_type, event_severity, event_description, ip_address)
    VALUES ('session_cleanup', 'info', 
            'Cleaned up ' || expired_count || ' expired sessions', 
            '127.0.0.1'::inet);
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect suspicious session activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    p_session_id VARCHAR(64),
    p_new_ip INET,
    p_new_user_agent TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    session_record RECORD;
    suspicious BOOLEAN := FALSE;
BEGIN
    SELECT * INTO session_record 
    FROM user_sessions 
    WHERE session_id = p_session_id AND active = TRUE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check for IP address change
    IF session_record.ip_address != p_new_ip THEN
        suspicious := TRUE;
    END IF;
    
    -- Check for significant user agent change (simplified check)
    IF LENGTH(session_record.user_agent) > 10 AND 
       LENGTH(p_new_user_agent) > 10 AND
       session_record.user_agent != p_new_user_agent THEN
        -- Try to use SIMILARITY function if pg_similarity extension is available
        -- Fall back to simple string comparison if not available
        BEGIN
            IF SIMILARITY(session_record.user_agent, p_new_user_agent) < 0.7 THEN
                suspicious := TRUE;
            END IF;
        EXCEPTION WHEN undefined_function THEN
            -- pg_similarity extension not available, fall back to basic string comparison
            -- Flag as suspicious if user agents differ significantly in length or are completely dissimilar
            IF ABS(LENGTH(session_record.user_agent) - LENGTH(p_new_user_agent)) > 20 OR
               POSITION(session_record.user_agent IN p_new_user_agent) = 0 AND
               POSITION(p_new_user_agent IN session_record.user_agent) = 0 THEN
                suspicious := TRUE;
            END IF;
        END;
    END IF;
    
    -- Log suspicious activity
    IF suspicious THEN
        INSERT INTO security_events (
            user_id, session_id, event_type, event_severity, 
            event_description, ip_address, user_agent
        ) VALUES (
            session_record.user_id, p_session_id, 'suspicious_activity', 'warning',
            'Suspicious activity detected: IP or user agent change',
            p_new_ip, p_new_user_agent
        );
    END IF;
    
    RETURN suspicious;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE user_sessions IS 'Enhanced session tracking with sliding timeouts and activity monitoring';
COMMENT ON TABLE api_key_permissions IS 'Granular permissions for API keys';
COMMENT ON TABLE user_lockouts IS 'Persistent account lockout tracking';
COMMENT ON TABLE security_events IS 'Security event audit log';
COMMENT ON TABLE user_mfa IS 'Multi-factor authentication settings';

COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Cleans up expired sessions and logs the action';
COMMENT ON FUNCTION detect_suspicious_activity(VARCHAR, INET, TEXT) IS 'Detects suspicious session activity based on IP and user agent changes';