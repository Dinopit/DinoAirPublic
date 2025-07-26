# Supabase Credentials Setup Guide

## Overview

This guide documents the secure setup of Supabase credentials for the DinoAir project. All sensitive credentials are properly configured to avoid being committed to GitHub.

## Security Configuration ✅

### Environment Files Updated
- **`web-gui-node/.env`**: Updated with new Supabase credentials
- **`web-gui-node/.env.example`**: Updated with proper placeholder structure

### Credentials Configured
- ✅ **SUPABASE_URL**: `https://zqtnhqqquzyynzuhaibl.supabase.co`
- ✅ **SUPABASE_ANON_KEY**: JWT token for anonymous access
- ✅ **SUPABASE_SERVICE_ROLE_KEY**: JWT token for admin operations
- ✅ **SUPABASE_API_KEY**: Same as anon key for compatibility
- ✅ **SUPABASE_PUBLISHABLE_KEY**: API publishable key
- ✅ **SUPABASE_SECRET_KEY**: API secret key
- ✅ **DATABASE_URL**: PostgreSQL connection string

### Security Measures Verified
- ✅ **Main .gitignore**: Excludes `.env` files (line 80)
- ✅ **web-gui/.gitignore**: Excludes all `.env*` variants (lines 29-33)
- ✅ **web-gui-node/.gitignore**: Excludes environment files (lines 2-5, 45)
- ✅ **No hardcoded credentials**: Verified no sensitive data in codebase
- ✅ **Connection tested**: Supabase connection working correctly

## Database Setup Required

The Supabase connection is working, but database tables need to be created manually. Use the Supabase SQL Editor to run these commands:

```sql
-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_sessions_user_id_check CHECK (char_length(user_id) > 0)
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_messages_content_check CHECK (char_length(content) > 0)
);

-- Chat Metrics Table
CREATE TABLE IF NOT EXISTS chat_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  model TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  token_count INTEGER NOT NULL CHECK (token_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_metrics_model_check CHECK (char_length(model) > 0)
);

-- Artifacts Table (if not already exists)
CREATE TABLE IF NOT EXISTS artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES artifacts(id),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- User Sessions Table (if not already exists)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  session_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh Tokens Table (if not already exists)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
```

## Testing the Setup

After creating the tables, test the configuration:

```bash
cd web-gui-node
npm run db:test
```

## Environment Variables Reference

### Required Variables in `.env`
```bash
# Supabase Configuration
SUPABASE_URL=https://zqtnhqqquzyynzuhaibl.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database Configuration
DATABASE_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres

# Supabase API Keys
SUPABASE_API_KEY=your-anon-key-here
SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
SUPABASE_SECRET_KEY=your-secret-key-here
```

## Security Best Practices

1. **Never commit `.env` files** - They are excluded by `.gitignore`
2. **Use `.env.example`** - Template for other developers
3. **Rotate credentials regularly** - Update keys periodically
4. **Use service role key carefully** - Only for admin operations
5. **Monitor access logs** - Check Supabase dashboard for unusual activity

## Troubleshooting

### Connection Issues
- Verify Supabase URL format
- Check that keys are not truncated
- Ensure database password is correct

### Permission Issues
- Use service role key for admin operations
- Use anon key for client-side operations
- Check Row Level Security (RLS) policies

### Table Creation Issues
- Use Supabase SQL Editor directly
- Check for syntax errors in SQL
- Verify database permissions

## Status: ✅ COMPLETE

- ✅ Credentials updated and secured
- ✅ Environment files properly configured
- ✅ .gitignore files verified
- ✅ No hardcoded credentials in codebase
- ✅ Connection tested successfully
- ⚠️ Database tables need manual creation (SQL provided above)

---

**Last Updated**: 2025-07-26  
**Security Status**: All sensitive credentials properly secured and excluded from version control