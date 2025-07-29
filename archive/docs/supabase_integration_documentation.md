# DinoAir Supabase Integration Documentation

This document provides comprehensive information about the Supabase integration in the DinoAir web GUI application.

## Overview

The DinoAir web GUI has been integrated with Supabase to provide persistent storage for chat sessions, messages, and metrics. This integration enables:

- **Persistent Chat History**: All chat sessions and messages are stored in Supabase
- **User Session Management**: Track and manage user chat sessions
- **Metrics Collection**: Store and analyze chat performance metrics
- **Scalable Architecture**: Leverage Supabase's PostgreSQL database for reliable data storage

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Usage Examples](#usage-examples)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

## Setup and Configuration

### Prerequisites

- Supabase account and project
- Node.js 18+ installed
- DinoAir web GUI application

### Environment Configuration

Create a `.env` file in the `web-gui-node` directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

### Database Setup

#### Option 1: Manual Setup (Recommended)

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Execute the following SQL commands:

```sql
-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_sessions_user_id_check CHECK (char_length(user_id) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_messages_content_check CHECK (char_length(content) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Create chat_metrics table
CREATE TABLE IF NOT EXISTS chat_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL CHECK (response_time_ms >= 0),
  token_count INTEGER NOT NULL CHECK (token_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT chat_metrics_model_check CHECK (char_length(model) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_metrics_session_id ON chat_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_metrics_created_at ON chat_metrics(created_at);
```

#### Option 2: Automated Setup (Alternative)

```bash
npm run db:setup
```

Note: The automated setup may require additional configuration depending on your Supabase project settings.

### Installation

1. Install dependencies:
```bash
npm install
```

2. Test the connection:
```bash
npm run db:test
```

## Database Schema

### chat_sessions

Stores chat session information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `user_id` | TEXT | User identifier (can be anonymous) |
| `created_at` | TIMESTAMPTZ | Session creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `metadata` | JSONB | Additional session metadata |

### chat_messages

Stores individual chat messages within sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `session_id` | UUID | Foreign key to chat_sessions |
| `role` | TEXT | Message role: 'user', 'assistant', or 'system' |
| `content` | TEXT | Message content |
| `created_at` | TIMESTAMPTZ | Message creation timestamp |
| `metadata` | JSONB | Additional message metadata |

### chat_metrics

Stores performance metrics for chat interactions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `session_id` | UUID | Foreign key to chat_sessions |
| `model` | TEXT | AI model used for the interaction |
| `response_time_ms` | INTEGER | Response time in milliseconds |
| `token_count` | INTEGER | Number of tokens used |
| `created_at` | TIMESTAMPTZ | Metrics creation timestamp |
| `metadata` | JSONB | Additional metrics metadata |

## API Endpoints

### Chat Endpoints

#### POST /api/chat
Send a chat message and receive a streaming response.

**Request Body:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello, how are you?"}
  ],
  "model": "qwen:7b-chat-v1.5-q4_K_M",
  "sessionId": "optional-session-id",
  "userId": "optional-user-id",
  "systemPrompt": "Optional system prompt"
}
```

**Response:** Streaming text response

#### GET /api/chat/metrics
Get chat performance metrics.

**Query Parameters:**
- `timeframe`: `hour`, `day`, `week`, or `month` (default: `day`)

**Response:**
```json
{
  "totalRequests": 150,
  "averageResponseTime": 1250,
  "totalTokens": 45000,
  "timeframe": "day",
  "source": "supabase+fallback"
}
```

#### GET /api/chat/models
Get available AI models (proxied from Ollama).

**Response:**
```json
{
  "models": [
    {
      "name": "qwen:7b-chat-v1.5-q4_K_M",
      "size": 4200000000
    }
  ]
}
```

### Session Management Endpoints

#### POST /api/chat/sessions
Create a new chat session.

**Request Body:**
```json
{
  "userId": "user-123",
  "metadata": {
    "title": "My Chat Session",
    "tags": ["work", "ai"]
  }
}
```

**Response:**
```json
{
  "id": "session-uuid",
  "user_id": "user-123",
  "created_at": "2025-07-25T10:48:00Z",
  "updated_at": "2025-07-25T10:48:00Z",
  "metadata": {...}
}
```

#### GET /api/chat/sessions
Get user chat sessions.

**Query Parameters:**
- `userId`: User ID (default: `anonymous`)
- `limit`: Maximum sessions to return (default: `50`)

**Response:**
```json
{
  "sessions": [...],
  "count": 25
}
```

#### GET /api/chat/sessions/:id
Get specific session details.

**Response:**
```json
{
  "id": "session-uuid",
  "user_id": "user-123",
  "created_at": "2025-07-25T10:48:00Z",
  "updated_at": "2025-07-25T10:48:00Z",
  "metadata": {...}
}
```

#### GET /api/chat/sessions/:id/messages
Get messages for a specific session.

**Query Parameters:**
- `limit`: Maximum messages to return (default: `100`)

**Response:**
```json
{
  "sessionId": "session-uuid",
  "messages": [
    {
      "id": "message-uuid",
      "session_id": "session-uuid",
      "role": "user",
      "content": "Hello!",
      "created_at": "2025-07-25T10:48:00Z",
      "metadata": {...}
    }
  ],
  "count": 10
}
```

#### DELETE /api/chat/sessions/:id
Delete a chat session (removes messages).

**Response:**
```json
{
  "message": "Session messages deleted successfully",
  "sessionId": "session-uuid"
}
```

## Usage Examples

### Basic Chat with Session Persistence

```javascript
// Create a new session
const sessionResponse = await fetch('/api/chat/sessions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    metadata: { title: 'My Chat' }
  })
});
const session = await sessionResponse.json();

// Send a message
const chatResponse = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello!' }],
    sessionId: session.id,
    userId: 'user-123'
  })
});

// Get session history
const historyResponse = await fetch(`/api/chat/sessions/${session.id}/messages`);
const history = await historyResponse.json();
```

### Retrieving User Sessions

```javascript
// Get all sessions for a user
const sessionsResponse = await fetch('/api/chat/sessions?userId=user-123&limit=20');
const { sessions } = await sessionsResponse.json();

// Get messages for each session
for (const session of sessions) {
  const messagesResponse = await fetch(`/api/chat/sessions/${session.id}/messages`);
  const { messages } = await messagesResponse.json();
  console.log(`Session ${session.id} has ${messages.length} messages`);
}
```

### Monitoring Metrics

```javascript
// Get daily metrics
const metricsResponse = await fetch('/api/chat/metrics?timeframe=day');
const metrics = await metricsResponse.json();

console.log(`Today: ${metrics.totalRequests} requests, avg ${metrics.averageResponseTime}ms`);
```

## Testing

### Connection Test

Test Supabase connectivity:

```bash
npm run db:test
```

### CRUD Operations Test

Test all API endpoints:

```bash
npm run test:crud
```

### Complete Supabase Test Suite

Run all Supabase-related tests:

```bash
npm run test:supabase
```

### Manual Testing

1. Start the server:
```bash
npm start
```

2. Test endpoints using curl or Postman:
```bash
# Create session
curl -X POST http://localhost:3000/api/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","metadata":{"test":true}}'

# Send chat message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"sessionId":"your-session-id"}'
```

## Troubleshooting

### Common Issues

#### 1. Connection Errors

**Error:** `Connection failed: relation "public.information_schema.tables" does not exist`

**Solution:** 
- Verify your Supabase URL and keys in `.env`
- Check that your Supabase project is active
- Ensure the database tables are created

#### 2. Table Not Found Errors

**Error:** `relation "public.chat_sessions" does not exist`

**Solution:**
- Run the manual SQL setup in Supabase SQL Editor
- Verify table creation with: `npm run db:test`

#### 3. Permission Errors

**Error:** `insufficient_privilege` or `permission denied`

**Solution:**
- Verify your service role key is correct
- Check Row Level Security (RLS) policies in Supabase
- Ensure your API keys have the necessary permissions

#### 4. Streaming Response Issues

**Error:** Chat responses not streaming properly

**Solution:**
- Check that Ollama is running on `localhost:11434`
- Verify the model name is correct
- Check server logs for detailed error messages

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
```

This will provide detailed error messages and stack traces.

### Health Checks

Monitor system health:

```bash
# Check server status
curl http://localhost:3000/api/health

# Check Supabase connection
npm run db:test

# Check all endpoints
npm run test:crud
```

## Performance Considerations

### Database Optimization

1. **Indexes**: The schema includes optimized indexes for common queries
2. **Connection Pooling**: Supabase handles connection pooling automatically
3. **Query Limits**: API endpoints include reasonable default limits

### Caching Strategy

- Metrics are cached in memory as fallback
- Session data is fetched on-demand
- Consider implementing Redis for high-traffic scenarios

### Monitoring

- Use Supabase dashboard for database monitoring
- Implement application-level logging for API usage
- Monitor response times and error rates

## Security

### Row Level Security (RLS)

The database schema supports RLS policies to ensure users can only access their own data:

```sql
-- Enable RLS on tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies (implement based on your authentication system)
CREATE POLICY "Users can access own sessions" ON chat_sessions
  FOR ALL USING (auth.uid()::text = user_id);
```

### API Security

- Use HTTPS in production
- Implement rate limiting
- Validate all input data
- Use environment variables for sensitive configuration

## Migration and Backup

### Data Export

```sql
-- Export sessions
COPY chat_sessions TO '/path/to/sessions.csv' DELIMITER ',' CSV HEADER;

-- Export messages
COPY chat_messages TO '/path/to/messages.csv' DELIMITER ',' CSV HEADER;
```

### Backup Strategy

- Supabase provides automatic backups
- Consider implementing application-level backup scripts
- Test restore procedures regularly

## Support

For issues related to:

- **Supabase Integration**: Check this documentation and test scripts
- **Database Schema**: Review the SQL setup commands
- **API Endpoints**: Use the provided test scripts for validation
- **Performance**: Monitor metrics and optimize queries as needed

## Changelog

### Version 1.0.0 (2025-07-25)

- Initial Supabase integration
- Complete chat session management
- Metrics collection and reporting
- Comprehensive test suite
- Full API documentation

---

*Last updated: 2025-07-25*