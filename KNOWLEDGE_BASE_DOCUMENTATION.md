# Intelligent Knowledge Base & Memory System

## Overview

The Intelligent Knowledge Base & Memory System is an advanced feature that enhances DinoAir's AI assistant with long-term memory, automatic knowledge extraction, and semantic search capabilities. This system learns from user interactions, builds a personal knowledge graph, and provides contextually relevant information during conversations.

## Features

### 🧠 **Core Capabilities**
- **Automatic Knowledge Extraction**: Extracts entities, facts, and relationships from conversations
- **Semantic Memory Search**: Find relevant information using natural language queries
- **Cross-Session Memory**: AI remembers information across different chat sessions
- **Vector Embeddings**: Uses semantic similarity for intelligent information retrieval
- **Privacy-First Design**: Complete user control over memory retention and sharing

### 📊 **Knowledge Types**
- **Entities**: People, places, organizations, dates, numbers
- **Facts**: Subject-predicate-object relationships (e.g., "Alice works at Google")
- **Relationships**: Connections between entities and concepts
- **Context**: Session and conversation metadata

### 🔒 **Privacy Controls**
- Enable/disable memory per user
- Set retention periods (days, months, indefinite)
- Delete all memories instantly
- Control automatic extraction
- Opt-in anonymized data sharing

## Architecture

### Database Schema

The system extends DinoAir's existing Supabase database with three new tables:

```sql
-- Main knowledge storage
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id UUID,
  message_id UUID,
  content TEXT NOT NULL,
  embedding vector(384),        -- Vector embeddings for semantic search
  entities JSONB DEFAULT '[]',  -- Extracted entities
  facts JSONB DEFAULT '[]',     -- Extracted facts
  relationships JSONB DEFAULT '[]', -- Entity relationships
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User privacy settings
CREATE TABLE user_memory_settings (
  user_id TEXT PRIMARY KEY,
  memory_enabled BOOLEAN DEFAULT true,
  retention_days INTEGER DEFAULT NULL,
  share_anonymized BOOLEAN DEFAULT false,
  auto_extract BOOLEAN DEFAULT true
);

-- Search analytics
CREATE TABLE knowledge_search_history (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  search_type TEXT DEFAULT 'semantic'
);
```

### API Endpoints

The knowledge base system provides REST API endpoints:

- `POST /api/knowledge/extract` - Extract knowledge from text
- `GET /api/knowledge/search` - Search knowledge base
- `GET /api/knowledge/memories` - Get relevant memories for context
- `GET /api/knowledge/summary` - Get user's knowledge statistics
- `GET /api/knowledge/settings` - Get user privacy settings
- `PUT /api/knowledge/settings` - Update privacy settings
- `DELETE /api/knowledge/memories` - Delete user memories
- `POST /api/knowledge/context` - Generate memory context for chat

## Installation & Setup

### 1. Database Migration

Run the knowledge base migration to create required tables:

```bash
cd web-gui-node
npm run db:setup-kb
```

Or manually run the SQL in your Supabase dashboard (see `scripts/setup-knowledge-base.js`).

### 2. Environment Variables

Ensure your `.env` file has the required Supabase configuration:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Start DinoAir

The knowledge base is automatically integrated with the chat system:

```bash
npm start
```

## Usage Examples

### Automatic Knowledge Extraction

When users chat with the AI, knowledge is automatically extracted:

```javascript
// Example conversation
User: "My name is John Smith and I work at Google in San Francisco."

// Automatically extracted:
// Entities: [
//   { type: "person", value: "John Smith" },
//   { type: "organization", value: "Google" },
//   { type: "location", value: "San Francisco" }
// ]
// Facts: [
//   { subject: "John Smith", predicate: "works", object: "at Google" }
// ]
```

### Memory-Enhanced Chat

The AI uses stored memories to provide better context:

```javascript
// Later conversation
User: "Tell me about my job"

// AI retrieves relevant memories and responds:
AI: "Based on our previous conversation, I remember you work at Google in San Francisco..."
```

### Manual Knowledge Extraction

Use the API to extract knowledge from any text:

```bash
curl -X POST /api/knowledge/extract \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"text": "Alice is a software engineer at Microsoft"}'
```

### Semantic Search

Search your knowledge base using natural language:

```bash
curl "/api/knowledge/search?q=software engineers&limit=5" \
  -H "Authorization: Bearer your_token"
```

## Integration with Chat System

The knowledge base seamlessly integrates with DinoAir's existing chat system:

### 1. Message Processing
- User messages are automatically processed for knowledge extraction
- Assistant responses are also analyzed for facts and entities
- Knowledge is stored with session and message context

### 2. Memory Injection
- Before generating responses, relevant memories are retrieved
- Memory context is injected into the AI prompt
- AI responses become more personalized and contextual

### 3. Session Continuity
- Knowledge spans across multiple chat sessions
- AI maintains awareness of previous conversations
- Long-term relationship building with users

## Configuration

### User Settings

Users can control their memory preferences:

```javascript
{
  "memory_enabled": true,        // Enable/disable memory
  "retention_days": null,        // null = indefinite, or days count
  "share_anonymized": false,     // Share data for AI improvement
  "auto_extract": true          // Automatic knowledge extraction
}
```

### System Configuration

Administrators can configure system-wide settings:

```javascript
// In knowledge-base.js
const CONFIG = {
  EMBEDDING_DIMENSIONS: 384,     // Vector embedding size
  MAX_ENTITIES_PER_TEXT: 10,     // Limit entities extracted
  MIN_SIMILARITY_THRESHOLD: 0.3, // Minimum similarity for search
  DEFAULT_SEARCH_LIMIT: 10      // Default search result count
};
```

## Testing

### Run Tests

```bash
# Run knowledge base specific tests
npm run test:knowledge

# Run all tests
npm test
```

### Demo Script

See the system in action:

```bash
node scripts/demo-knowledge-base.js
```

### Manual Testing

1. Start DinoAir server
2. Chat with the AI about personal topics
3. Check `/api/knowledge/summary` for extracted knowledge
4. Search using `/api/knowledge/search?q=your_query`
5. Continue chatting and see AI remember previous context

## Performance Considerations

### Vector Embeddings
- Uses a simple character-frequency based embedding for demonstration
- In production, consider upgrading to proper embedding models:
  - sentence-transformers
  - OpenAI embeddings
  - Local BERT models

### Database Optimization
- Indexes on `user_id`, `created_at`, and `embedding` columns
- Consider partitioning for large datasets
- Regular cleanup of expired memories based on retention settings

### Memory Usage
- Embeddings stored as PostgreSQL vectors (requires pgvector extension)
- JSON storage for entities and facts
- Efficient similarity search using vector indexes

## Privacy & Security

### Data Protection
- All knowledge is isolated per user
- No cross-user data contamination
- Encryption at rest via Supabase
- Local processing - no external API calls for embeddings

### User Rights
- Right to be forgotten (delete all memories)
- Data export capabilities
- Granular privacy controls
- Transparent about data usage

### Compliance
- GDPR compliant with proper deletion mechanisms
- User consent for data processing
- Audit logs for data access
- Minimal data collection principle

## Troubleshooting

### Common Issues

**Knowledge not being extracted:**
- Check if `auto_extract` is enabled in user settings
- Verify text length is sufficient (>20 characters)
- Check server logs for extraction errors

**Search returning no results:**
- Lower the similarity threshold
- Check if user has any stored knowledge
- Verify search query is meaningful

**Database errors:**
- Ensure knowledge base tables are created
- Check Supabase connection and permissions
- Verify pgvector extension is enabled

### Debug Tools

```bash
# Check knowledge base status
curl /api/knowledge/summary -H "Authorization: Bearer token"

# Test knowledge extraction
node -e "
const {extractKnowledge} = require('./lib/knowledge-base');
console.log(extractKnowledge('Test text with entities'));
"

# Check database tables
npm run db:test
```

## Future Enhancements

### Planned Features
- Visual knowledge graph representation
- Import from external sources (files, URLs)
- Fact verification and source attribution
- Advanced relationship inference
- Multi-modal knowledge (images, audio)

### Upgrade Paths
- Integration with production embedding models
- Graph database backend (Neo4j, etc.)
- Federated learning across instances
- Advanced NLP for better extraction

## API Reference

### Knowledge Extraction

```http
POST /api/knowledge/extract
Content-Type: application/json
Authorization: Bearer {token}

{
  "text": "Text to extract knowledge from",
  "context": {
    "session_id": "optional-session-id"
  }
}
```

### Semantic Search

```http
GET /api/knowledge/search?q={query}&limit={limit}&threshold={threshold}
Authorization: Bearer {token}
```

### Memory Settings

```http
GET /api/knowledge/settings
Authorization: Bearer {token}

PUT /api/knowledge/settings
Content-Type: application/json
Authorization: Bearer {token}

{
  "memory_enabled": true,
  "auto_extract": true,
  "retention_days": 365
}
```

For complete API documentation, see the OpenAPI spec at `/api/docs`.

## Support

For questions or issues with the Knowledge Base system:

1. Check the troubleshooting section above
2. Review server logs for error messages  
3. Test with the demo script: `node scripts/demo-knowledge-base.js`
4. Open an issue on the DinoAir GitHub repository

---

*The Intelligent Knowledge Base & Memory System makes DinoAir truly personal - an AI that learns, remembers, and grows with you.* 🧠✨