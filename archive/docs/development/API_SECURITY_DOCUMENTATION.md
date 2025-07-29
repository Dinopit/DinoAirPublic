# API Security Implementation Documentation

This document details the API security improvements implemented for the DinoAir project, including proper authentication and rate limiting.

## Overview

We've implemented a comprehensive API security system with:
- API key-based authentication
- Per-key rate limiting
- Request logging and monitoring
- CORS protection

## 1. API Authentication System

### Files Created/Modified:
- Created: `web-gui/lib/api-auth.ts`
- Modified: `web-gui/app/api/v1/models/route.ts`
- Modified: `web-gui/app/api/v1/personalities/route.ts`

### Features:

#### API Key Management
```typescript
// Default API keys (for demo purposes)
const VALID_API_KEYS = new Set([
  'dinoair-free-tier-key-001',
  'dinoair-free-tier-key-002',
]);
```

#### Key Validation
- Accepts keys with or without "Bearer " prefix
- Tracks usage statistics per key
- Supports dynamic key management

#### Usage Example:
```bash
# With Bearer prefix
curl -H "Authorization: Bearer dinoair-free-tier-key-001" http://localhost:3000/api/v1/models

# Without Bearer prefix
curl -H "Authorization: dinoair-free-tier-key-001" http://localhost:3000/api/v1/models
```

## 2. Rate Limiting System

### Files Created:
- Created: `web-gui/lib/rate-limiter.ts`

### Features:

#### Flexible Rate Limits
- Default: 30 requests/minute for unauthenticated requests
- API key specific: 60 requests/minute (configurable per key)
- Based on sliding window algorithm

#### Rate Limit Headers
All API responses include:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1674567890
```

#### Rate Limit Exceeded Response
```json
{
  "error": "Rate limit exceeded. Please try again later."
}
```
Status: 429 Too Many Requests
Includes `Retry-After` header

## 3. Implementation Details

### Authentication Flow
1. Request arrives with Authorization header
2. System validates API key
3. If invalid: Returns 401 Unauthorized
4. If valid: Continues to rate limiting

### Rate Limiting Flow
1. Identifies client (by API key or IP)
2. Checks request count in current window
3. If within limit: Process request
4. If exceeded: Return 429 error

### Memory Management
- Rate limit entries are cleaned up every 5 minutes
- Prevents memory leaks from old entries

## 4. Security Best Practices

### Current Implementation
✅ API keys required for all API endpoints
✅ Rate limiting prevents abuse
✅ CORS headers properly configured
✅ Request logging for monitoring
✅ No sensitive data in logs

### Production Recommendations

1. **API Key Storage**
   - Move keys to environment variables
   - Use a database for key management
   - Implement key rotation

2. **Rate Limiting**
   - Use Redis for distributed rate limiting
   - Implement per-endpoint limits
   - Add IP-based blocking for severe abuse

3. **Authentication Enhancement**
   - Add JWT support for user sessions
   - Implement OAuth2 for third-party access
   - Add API key scopes/permissions

4. **Monitoring**
   - Set up alerts for rate limit violations
   - Track API usage metrics
   - Monitor for suspicious patterns

## 5. Testing the Implementation

### Test Authentication
```bash
# Should fail (no API key)
curl http://localhost:3000/api/v1/models

# Should succeed
curl -H "Authorization: dinoair-free-tier-key-001" http://localhost:3000/api/v1/models
```

### Test Rate Limiting
```bash
# Run this in a loop to test rate limiting
for i in {1..70}; do
  curl -H "Authorization: dinoair-free-tier-key-001" http://localhost:3000/api/v1/models
  echo "Request $i"
done
```

## 6. API Key Functions

### Generate New Key
```typescript
import { generateApiKey, addApiKey } from '@/lib/api-auth';

const newKey = generateApiKey();
addApiKey(newKey, 100); // 100 requests per minute
```

### Remove Key
```typescript
import { removeApiKey } from '@/lib/api-auth';

removeApiKey('compromised-key');
```

### Get All Keys (Admin)
```typescript
import { getAllApiKeys } from '@/lib/api-auth';

const keys = getAllApiKeys();
// Returns array of key configurations with usage stats
```

## Migration Notes

The current implementation maintains backward compatibility while adding security:
- APIs now require authentication (breaking change)
- Rate limits are enforced
- CORS is properly configured

To migrate existing clients:
1. Obtain an API key
2. Add Authorization header to all requests
3. Handle 429 rate limit errors with retry logic

## Summary

This implementation provides a solid foundation for API security with:
- Required authentication on all API endpoints
- Configurable rate limiting per API key
- Comprehensive request logging
- Clean, maintainable code structure

The system is designed to be easily extended with additional security features as needed.