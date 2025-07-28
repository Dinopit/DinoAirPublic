# Enhanced Authentication and Authorization System

## Overview

This document describes the enhanced authentication and authorization system implemented for DinoAir, providing comprehensive security improvements including sliding session timeouts, multi-factor authentication (MFA), progressive account lockouts, and role-based API key permissions.

## Features Implemented

### 🔄 Enhanced Session Management

**Description**: Sliding session timeouts with comprehensive activity tracking and suspicious activity detection.

**Key Features**:
- Sliding timeout mechanism (extends on user activity)
- Database-backed session persistence
- Session metadata tracking (IP, user agent, location)
- Automatic suspicious activity detection
- Concurrent session limits per user
- Manual session invalidation

**Configuration**:
```javascript
SESSION_CONFIG = {
  DEFAULT_TIMEOUT: 8 * 60 * 60 * 1000,    // 8 hours
  SLIDING_TIMEOUT: 30 * 60 * 1000,        // 30 minutes sliding window
  ACTIVITY_UPDATE_INTERVAL: 5 * 60 * 1000, // Update activity every 5 minutes
  MAX_SESSIONS_PER_USER: 5,               // Maximum concurrent sessions
  SUSPICIOUS_ACTIVITY_THRESHOLD: 3        // Threshold for session invalidation
}
```

**API Endpoints**:
- `GET /auth/sessions` - List active sessions
- `DELETE /auth/sessions/:sessionId` - Invalidate specific session
- `POST /auth/sessions/invalidate-others` - Invalidate all other sessions

### 🔐 Multi-Factor Authentication (MFA)

**Description**: Optional TOTP-based multi-factor authentication with backup codes and QR code generation.

**Key Features**:
- TOTP secret generation with QR codes
- Backup code system with encryption
- Progressive failure counting
- MFA requirement validation for sensitive operations
- Authenticator app integration (Google Authenticator, Authy, etc.)

**Setup Process**:
1. User initiates MFA setup
2. System generates TOTP secret and QR code
3. User scans QR code with authenticator app
4. User verifies setup with first TOTP token
5. System provides encrypted backup codes

**API Endpoints**:
- `POST /auth/mfa/setup` - Initiate MFA setup
- `POST /auth/mfa/verify` - Verify TOTP token
- `GET /auth/mfa/status` - Get MFA status
- `POST /auth/mfa/backup-codes/regenerate` - Regenerate backup codes
- `POST /auth/mfa/disable` - Disable MFA

### 🚫 Progressive Account Lockout

**Description**: Database-persistent account lockout system with progressive timeouts.

**Lockout Levels**:
- **Level 1**: 3 attempts → 15 minute lockout
- **Level 2**: 5 attempts → 1 hour lockout
- **Level 3**: 10 attempts → 24 hour lockout
- **Level 4**: 15 attempts → 7 day lockout

**Key Features**:
- Separate tracking for email addresses and IP addresses
- Progressive lockout durations
- Database persistence (no memory-only state)
- Automatic cleanup of expired lockouts
- Manual unlock capability for administrators
- Lockout statistics and monitoring

### 🔑 Role-Based API Key Permissions

**Description**: Granular permission system for API keys with hierarchical permissions and resource scoping.

**Permission Categories**:
- **System**: `system:read`, `system:write`, `system:monitor`
- **Chat**: `chat:read`, `chat:write`, `chat:delete`
- **Artifacts**: `artifacts:read`, `artifacts:write`, `artifacts:delete`
- **Users**: `users:read`, `users:write`, `users:admin`
- **Legacy**: `read`, `write`, `delete`, `admin` (backward compatibility)

**Hierarchical Permissions**:
- Higher-level permissions include lower-level permissions
- Example: `chat:write` includes `chat:read`
- `admin` permission grants access to all resources

**Permission Levels**:
- **Low**: Basic read access
- **Medium**: Write/modify access
- **High**: Delete access
- **Critical**: Administrative access

## Database Schema

### user_sessions Table
```sql
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NULL,
    end_reason VARCHAR(50) NULL,
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    location_country VARCHAR(2) NULL,
    location_city VARCHAR(100) NULL,
    device_fingerprint VARCHAR(128) NULL,
    is_mobile BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    activity_count INTEGER NOT NULL DEFAULT 1,
    suspicious_activity_count INTEGER NOT NULL DEFAULT 0,
    last_suspicious_activity TIMESTAMPTZ NULL
);
```

### api_key_permissions Table
```sql
CREATE TABLE api_key_permissions (
    id BIGSERIAL PRIMARY KEY,
    api_key_id BIGINT NOT NULL REFERENCES api_keys(id),
    permission VARCHAR(50) NOT NULL,
    resource_scope VARCHAR(100) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(api_key_id, permission, resource_scope)
);
```

### user_lockouts Table
```sql
CREATE TABLE user_lockouts (
    id BIGSERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    lockout_type VARCHAR(20) NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 1,
    first_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMPTZ NULL,
    unlock_attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(identifier, lockout_type)
);
```

### security_events Table
```sql
CREATE TABLE security_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(64) REFERENCES user_sessions(session_id),
    event_type VARCHAR(50) NOT NULL,
    event_severity VARCHAR(20) NOT NULL DEFAULT 'info',
    event_description TEXT NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### user_mfa Table
```sql
CREATE TABLE user_mfa (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    mfa_type VARCHAR(20) NOT NULL DEFAULT 'totp',
    secret_key VARCHAR(128) NOT NULL,
    backup_codes TEXT[] NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used TIMESTAMPTZ NULL,
    failure_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, mfa_type)
);
```

## Installation and Setup

### 1. Database Setup

Run the setup script to create the required database tables:

```bash
cd web-gui-node
node scripts/setup-enhanced-security.js
```

Or with sample data:

```bash
node scripts/setup-enhanced-security.js --with-sample-data
```

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```env
# MFA Encryption Key (change in production)
MFA_ENCRYPTION_KEY=your-secure-encryption-key-here

# Session configuration (optional - defaults will be used)
SESSION_DEFAULT_TIMEOUT=28800000
SESSION_SLIDING_TIMEOUT=1800000
SESSION_MAX_PER_USER=5

# Lockout configuration (optional)
LOCKOUT_MAX_ATTEMPTS_LEVEL_1=3
LOCKOUT_DURATION_LEVEL_1=900000
```

### 3. Integration

Update your server.js to use the enhanced authentication:

```javascript
const { enhancedAuth, requirePermission } = require('./middleware/enhanced-auth-middleware');
const authEnhanced = require('./routes/auth-enhanced');

// Use enhanced authentication routes
app.use('/auth', authEnhanced);

// Apply enhanced auth middleware to protected routes
app.use('/api', enhancedAuth);

// Apply permission requirements to specific endpoints
app.get('/api/admin', requirePermission('admin'), (req, res) => {
  // Admin-only endpoint
});

app.get('/api/chat', requirePermission('chat:read'), (req, res) => {
  // Chat read endpoint
});
```

## Usage Examples

### Enhanced Sign-in with MFA

```javascript
// Basic sign-in
const response = await fetch('/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const result = await response.json();

if (result.requiresMFA) {
  // MFA required - prompt user for TOTP token
  const mfaResponse = await fetch('/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password123',
      mfaToken: '123456'
    })
  });
}
```

### Setting up MFA

```javascript
// 1. Initiate MFA setup
const setupResponse = await fetch('/auth/mfa/setup', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${userToken}` }
});

const { qrCode, backupCodes, secret } = await setupResponse.json();

// 2. Display QR code to user
// 3. User scans with authenticator app
// 4. Verify setup

const verifyResponse = await fetch('/auth/mfa/verify', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ token: '123456' })
});
```

### API Key with Permissions

```javascript
// Create API key with specific permissions
const apiKeyResponse = await fetch('/auth/api-keys', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Chat Bot API Key',
    permissions: ['chat:read', 'chat:write'],
    expiryMonths: 12
  })
});

const { apiKey } = await apiKeyResponse.json();

// Use API key
const chatResponse = await fetch('/api/chat', {
  headers: { 'Authorization': `Bearer ${apiKey.key}` }
});
```

### Session Management

```javascript
// List user sessions
const sessionsResponse = await fetch('/auth/sessions', {
  headers: { 'Authorization': `Bearer ${userToken}` }
});

const { sessions } = await sessionsResponse.json();

// Invalidate specific session
await fetch(`/auth/sessions/${sessionId}`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${userToken}` }
});

// Invalidate all other sessions
await fetch('/auth/sessions/invalidate-others', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${userToken}` }
});
```

## Security Considerations

### Encryption

- **MFA Secrets**: Encrypted using AES-256-GCM with scrypt key derivation
- **Backup Codes**: Individually encrypted before database storage
- **API Keys**: Hashed using bcrypt before database storage

### Security Events

All security-relevant actions are logged to the `security_events` table:
- Login attempts (successful and failed)
- MFA setup, verification, and failures
- Session creation and invalidation
- Suspicious activity detection
- Account lockouts and unlocks
- Permission changes

### Rate Limiting

Enhanced rate limiting with different limits for:
- Authenticated vs unauthenticated users
- Different endpoint categories (auth, chat, upload, etc.)
- User tiers (free, premium, admin)

### Database Security

- Row Level Security (RLS) enabled on sensitive tables
- Proper indexing for performance
- Data validation constraints
- Automatic cleanup of expired data

## Monitoring and Alerts

### Security Metrics

Monitor these key metrics:
- Failed login attempts per hour
- Active lockouts
- Suspicious session activity
- MFA adoption rate
- Session duration patterns

### Alert Conditions

Set up alerts for:
- Unusual number of failed login attempts
- Multiple lockouts from same IP
- Suspicious session activity patterns
- MFA bypass attempts
- High-privilege API key usage

## Troubleshooting

### Common Issues

1. **Sessions not updating**: Check database connectivity and session middleware integration
2. **MFA codes not working**: Verify time synchronization between server and authenticator app
3. **Lockouts too aggressive**: Adjust lockout thresholds in configuration
4. **Permission errors**: Check API key permissions and hierarchy rules

### Debug Mode

Enable debug logging by setting:
```env
DEBUG_AUTH=true
```

This will provide detailed console output for authentication operations.

## Migration Guide

### From Legacy System

1. Run database migration script
2. Update middleware imports
3. Test authentication flows
4. Update API documentation
5. Train users on new MFA features

### Backward Compatibility

The system maintains backward compatibility with:
- Existing API keys (legacy permission format)
- Current session handling
- Existing user accounts

## Performance Considerations

### Caching

- Permission checks cached for 5 minutes
- Session activity updates batched every 5 minutes
- Lockout status cached to reduce database queries

### Database Optimization

- Proper indexing on frequently queried columns
- Automatic cleanup of expired records
- Connection pooling for database access

### Monitoring

Monitor performance metrics:
- Authentication request latency
- Database query performance
- Memory usage of caches
- Session storage growth

## Future Enhancements

Potential future improvements:
- Hardware security key support (WebAuthn)
- Risk-based authentication
- Machine learning for anomaly detection
- Advanced device fingerprinting
- Integration with external identity providers
- Advanced audit reporting

This enhanced authentication system provides enterprise-grade security while maintaining usability and performance for DinoAir users.