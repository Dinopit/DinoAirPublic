# Knowledge API Routes

This document describes the knowledge management API endpoints that have been added to resolve the merge conflict issues.

## Overview

The Knowledge API provides comprehensive endpoints for managing a knowledge base, including search functionality, CRUD operations, and metadata management.

## Base URL

All knowledge endpoints are available under:
```
/api/knowledge
```

## Authentication

All endpoints require authentication. In the current implementation, a mock authentication middleware is used that creates an anonymous user context.

## Endpoints

### Search Knowledge Base

**POST** `/api/knowledge/search`

Search for knowledge entries by query string.

**Request Body:**
```json
{
  "query": "code execution",
  "options": {
    "limit": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Code Execution Guidelines",
      "content": "When using the code execution feature...",
      "tags": ["code-execution", "guidelines", "security"],
      "category": "documentation",
      "createdAt": "2025-07-27T23:07:00Z",
      "updatedAt": "2025-07-27T23:07:00Z"
    }
  ],
  "total": 1,
  "query": "code execution",
  "timestamp": "2025-07-27T23:07:00Z"
}
```

### List Knowledge Entries

**GET** `/api/knowledge/entries`

Get all knowledge entries with optional filtering.

**Query Parameters:**
- `category` (optional) - Filter by category
- `tag` (optional) - Filter by tag
- `limit` (optional) - Limit number of results (default: 50)

**Response:**
```json
{
  "success": true,
  "entries": [...],
  "total": 2
}
```

### Get Specific Knowledge Entry

**GET** `/api/knowledge/entries/:knowledgeId`

Retrieve a specific knowledge entry by ID.

**Response:**
```json
{
  "success": true,
  "entry": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Getting Started with DinoAir",
    "content": "DinoAir is a comprehensive AI platform...",
    "tags": ["getting-started", "overview"],
    "category": "documentation",
    "createdAt": "2025-07-27T23:07:00Z",
    "updatedAt": "2025-07-27T23:07:00Z"
  }
}
```

### Create Knowledge Entry

**POST** `/api/knowledge/entries`

Create a new knowledge base entry.

**Request Body:**
```json
{
  "title": "New Knowledge Entry",
  "content": "Detailed content about the topic...",
  "tags": ["tag1", "tag2"],
  "category": "documentation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Knowledge entry created successfully",
  "entry": {
    "id": "generated-uuid",
    "title": "New Knowledge Entry",
    "content": "Detailed content about the topic...",
    "tags": ["tag1", "tag2"],
    "category": "documentation",
    "createdAt": "2025-07-27T23:07:00Z",
    "updatedAt": "2025-07-27T23:07:00Z"
  }
}
```

### Update Knowledge Entry

**PUT** `/api/knowledge/entries/:knowledgeId`

Update an existing knowledge entry.

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "tags": ["updated-tag"],
  "category": "updated-category"
}
```

### Delete Knowledge Entry

**DELETE** `/api/knowledge/entries/:knowledgeId`

Delete a knowledge entry.

**Response:**
```json
{
  "success": true,
  "message": "Knowledge entry deleted successfully",
  "entry": {
    "id": "deleted-entry-id",
    ...
  }
}
```

### Get Categories

**GET** `/api/knowledge/categories`

Get all available knowledge categories.

**Response:**
```json
{
  "success": true,
  "categories": ["documentation", "tutorials", "guides"]
}
```

### Get Tags

**GET** `/api/knowledge/tags`

Get all available knowledge tags.

**Response:**
```json
{
  "success": true,
  "tags": ["getting-started", "code-execution", "security", "guidelines"]
}
```

### Health Check

**GET** `/api/knowledge/health`

Check the health status of the knowledge service.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "stats": {
    "totalEntries": 2,
    "categories": 1,
    "tags": 4
  },
  "timestamp": "2025-07-27T23:07:00Z"
}
```

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

Common HTTP status codes:
- `400` - Validation errors
- `404` - Resource not found
- `500` - Internal server error

## Validation

The API includes comprehensive validation for all input data:

- **Title**: Required, 1-200 characters
- **Content**: Required, 1-10,000 characters
- **Tags**: Optional array
- **Category**: Optional string, max 100 characters
- **Query**: Required for search, 1-1,000 characters
- **Knowledge ID**: Must be valid UUID for operations requiring ID

## Integration

The knowledge routes have been integrated into the main API router and are accessible alongside other endpoints:

```javascript
// Main API endpoints
GET /api/ - Lists all available endpoints including knowledge
GET /api/knowledge/health - Knowledge service health check
POST /api/knowledge/search - Search functionality
```

This resolves the merge conflict issues by providing the missing knowledge routes that were referenced in the original merge conflict markers.