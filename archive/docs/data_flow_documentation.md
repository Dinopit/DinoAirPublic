# DinoAir Data Flow Documentation

**Last Updated:** July 28, 2025

## Overview

This document provides a comprehensive overview of how data flows through the DinoAir system, including collection points, processing, storage, and deletion procedures.

## Data Collection Points

### 1. User Registration and Authentication

**Collection Point**: `/api/auth/signup`, `/api/auth/signin`

**Data Collected**:
- Email address (required)
- Password (hashed before storage)
- Name (optional)
- Registration timestamp

**Processing**:
1. Input validation and sanitization
2. Password hashing using bcrypt
3. Email normalization
4. User record creation in Supabase
5. Session token generation

**Storage Location**: `users` table in Supabase database

### 2. Chat Interactions

**Collection Point**: `/api/chat`, WebSocket connections

**Data Collected**:
- Chat messages (user and AI responses)
- Session metadata
- Model selection
- System prompts
- Response times
- Token counts

**Processing**:
1. Message validation and sanitization
2. Session creation or retrieval
3. AI model processing (local Ollama)
4. Response streaming
5. Metrics calculation
6. Database storage

**Storage Locations**:
- `chat_sessions` table
- `chat_messages` table
- `chat_metrics` table

### 3. User Preferences and Settings

**Collection Point**: Settings panel, profile updates

**Data Collected**:
- Theme preferences
- Default AI model
- Auto-save settings
- Tutorial preferences
- Personality selections
- Privacy consent choices

**Processing**:
1. Preference validation
2. Local storage (browser)
3. Database synchronization
4. Real-time updates

**Storage Locations**:
- Browser localStorage
- `users` table (preferences column)
- `consent_preferences` table

### 4. Performance and Analytics Data

**Collection Point**: Frontend performance hooks, API middleware

**Data Collected**:
- Page load times
- Component render metrics
- API response times
- Error rates
- Memory usage
- Feature usage statistics

**Processing**:
1. Metric aggregation
2. Privacy filtering (if consent withdrawn)
3. Anonymization for analytics
4. Retention policy application

**Storage Locations**:
- `performance_metrics` table
- `api_logs` table
- Local browser storage (temporary)

### 5. API Key Management

**Collection Point**: `/api/auth/api-keys`

**Data Collected**:
- API key names
- Generated keys (hashed)
- Creation timestamps
- Usage statistics

**Processing**:
1. Key generation with crypto-secure randomness
2. Hashing before storage
3. Usage tracking
4. Expiration management

**Storage Location**: `api_keys` table

## Data Processing Flows

### Chat Flow
```
User Input → Validation → Session Management → AI Processing → Response Storage → User Display
     ↓              ↓              ↓              ↓              ↓              ↓
Sanitization → Rate Limiting → Local Ollama → Streaming → Database → Frontend
```

### Authentication Flow
```
Credentials → Validation → Hashing → Database → Session → Token → Client Storage
     ↓              ↓         ↓         ↓         ↓        ↓         ↓
Input Check → Rate Limit → bcrypt → Supabase → Create → JWT → Secure Cookie
```

### Settings Flow
```
User Changes → Validation → Local Storage → Database Sync → Real-time Update
     ↓              ↓              ↓              ↓              ↓
UI Input → Type Check → Browser → Supabase → WebSocket/Polling
```

## Data Storage Architecture

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  bio TEXT,
  preferences JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Chat Sessions Table
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
```

#### Chat Messages Table
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
```

#### Consent Preferences Table
```sql
CREATE TABLE consent_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  essential BOOLEAN DEFAULT true,
  analytics BOOLEAN DEFAULT false,
  improvements BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

All tables implement RLS policies to ensure users can only access their own data:

```sql
-- Users can only access their own sessions
CREATE POLICY "Users can access own sessions" ON chat_sessions
  FOR ALL USING (auth.uid()::text = user_id);

-- Users can only access messages from their own sessions
CREATE POLICY "Users can access own session messages" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = chat_messages.session_id 
      AND chat_sessions.user_id = auth.uid()::text
    )
  );
```

## Data Retention Policies

### Automatic Cleanup

#### Chat Data
- **Sessions**: Deleted after 2 years of inactivity
- **Messages**: Cascade deleted with sessions
- **Metrics**: Aggregated and anonymized after 1 year

#### System Data
- **API Logs**: Deleted after 6 months
- **Performance Metrics**: Aggregated after 1 year, raw data deleted
- **Error Logs**: Deleted after 3 months

#### User Data
- **Preferences**: Retained until account deletion
- **Consent Records**: Retained for 3 years for compliance
- **Authentication Logs**: Deleted after 1 year

### Manual Cleanup Triggers

1. **User-Initiated Deletion**
   - Individual conversation deletion
   - Bulk data deletion
   - Account closure

2. **Privacy Rights Requests**
   - GDPR Article 17 (Right to Erasure)
   - CCPA deletion requests
   - Data portability requests

3. **Administrative Actions**
   - Policy violations
   - Security incidents
   - Legal requirements

## Data Export Procedures

### User Data Export Format

```json
{
  "export_metadata": {
    "timestamp": "2025-07-28T03:41:16Z",
    "user_id": "uuid",
    "export_type": "complete",
    "version": "1.0"
  },
  "user_profile": {
    "email": "user@example.com",
    "name": "User Name",
    "bio": "User bio",
    "preferences": {},
    "created_at": "2025-01-01T00:00:00Z"
  },
  "chat_data": {
    "sessions": [],
    "messages": [],
    "metrics": []
  },
  "consent_preferences": {
    "essential": true,
    "analytics": false,
    "improvements": true
  },
  "api_keys": [
    {
      "name": "Key Name",
      "created_at": "2025-01-01T00:00:00Z",
      "last_used": "2025-07-28T00:00:00Z"
    }
  ]
}
```

### Export Process

1. **Authentication**: Verify user identity
2. **Data Collection**: Query all user-related tables
3. **Anonymization**: Remove sensitive system data
4. **Formatting**: Structure data in portable format
5. **Delivery**: Secure download or email delivery

## Data Deletion Procedures

### Soft Deletion
- Mark records as deleted without immediate removal
- Maintain referential integrity
- Allow for recovery period (30 days)
- Anonymize personal identifiers

### Hard Deletion
- Permanent removal from all systems
- Cascade deletion of dependent records
- Secure deletion of file system data
- Audit trail maintenance

### Deletion Verification
- Automated verification scripts
- Manual spot checks for sensitive data
- Third-party deletion confirmation
- Compliance reporting

## Security Measures

### Data in Transit
- TLS 1.3 encryption for all API communications
- WebSocket Secure (WSS) for real-time features
- Certificate pinning for mobile applications
- HSTS headers for web applications

### Data at Rest
- AES-256 encryption for database storage
- Encrypted backups with separate key management
- Secure key rotation procedures
- Hardware security modules for key storage

### Access Controls
- Multi-factor authentication for admin access
- Role-based access control (RBAC)
- Principle of least privilege
- Regular access reviews and audits

## Compliance Monitoring

### Automated Monitoring
- Data retention policy enforcement
- Consent preference compliance
- Access pattern analysis
- Anomaly detection

### Manual Reviews
- Quarterly privacy impact assessments
- Annual data flow audits
- Third-party security assessments
- Compliance certification renewals

### Incident Response
- Data breach notification procedures
- Privacy incident escalation
- Regulatory reporting requirements
- User notification protocols

## Integration Points

### External Services
- **Supabase**: Database and authentication
- **Ollama**: Local AI model processing
- **ComfyUI**: Image generation (local)

### Data Sharing
- No third-party data sharing by default
- Explicit consent required for any external integrations
- Data processing agreements for service providers
- Regular vendor security assessments

---

This documentation is maintained by the DinoAir development team and updated with each system change that affects data flows.
