# DinoAir Logging Standards and Correlation ID Usage

## Overview

DinoAir implements structured logging with correlation IDs to improve debugging and request tracing capabilities across all services. This document outlines the logging standards, correlation ID usage, and best practices.

## Correlation IDs

### What are Correlation IDs?

Correlation IDs are unique identifiers that trace a request through multiple services and components. They help connect related log entries across the entire system, making debugging and monitoring much easier.

### Format

Correlation IDs follow this format: `{timestamp}-{random-hex}`
- Example: `1a2b3c4d5e-f0123456789abcdef`
- Timestamp: Base36 encoded milliseconds
- Random: 16-character hexadecimal string

### Generation and Propagation

1. **Client-side**: Generated automatically when the application starts
2. **Server-side**: Extracted from request headers or generated if missing
3. **Cross-service**: Propagated via HTTP headers (`x-correlation-id`)

## Logging Levels

| Level | Code | Usage |
|-------|------|-------|
| DEBUG | 0 | Detailed diagnostic information |
| INFO | 1 | General application flow |
| WARN | 2 | Warning conditions |
| ERROR | 3 | Error conditions that don't stop the application |
| CRITICAL | 4 | Critical errors that may stop the application |

## Log Entry Structure

All log entries follow this JSON structure:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": 1,
  "logger": "api-handler",
  "message": "Processing user request",
  "correlationId": "1a2b3c4d5e-f0123456789abcdef",
  "context": {
    "userId": "user123",
    "operation": "getUserProfile"
  },
  "sessionId": "session456",
  "url": "https://app.dinoair.com/api/user/profile",
  "userAgent": "Mozilla/5.0..."
}
```

## Implementation

### Client-Side (TypeScript/React)

```typescript
import { getLogger } from '@/lib/logging/logger';

const logger = getLogger('my-component');

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('API call failed', error, { endpoint: '/api/users' });

// Performance logging
logger.performance('database-query', 150.5, { table: 'users' });
```

### Server-Side (Python)

```python
from lib.logging.safe_logger import get_logger
from lib.correlation_id import with_correlation_id

logger = get_logger('my-service')

@with_correlation_id('my-correlation-id')
def process_request():
    logger.info('Processing request', user_id='123')
    logger.error('Database connection failed', exception=e)
```

### API Routes (Next.js)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCorrelationId } from '@/lib/correlation/correlation-id';
import { getLogger } from '@/lib/logging/logger';

const logger = getLogger('api-users');

export async function GET(request: NextRequest) {
  const correlationId = getCurrentCorrelationId();
  
  logger.info('Fetching users', { correlationId });
  
  try {
    // Process request
    const users = await getUsers();
    
    logger.info('Users fetched successfully', { 
      correlationId, 
      count: users.length 
    });
    
    return NextResponse.json(users);
  } catch (error) {
    logger.error('Failed to fetch users', error, { correlationId });
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
```

## Configuration

### Environment Variables

```bash
# Log levels
LOG_LEVEL=INFO                    # Minimum log level
CONSOLE_LOG_LEVEL=DEBUG          # Console output level

# Correlation IDs
ENABLE_CORRELATION_IDS=true      # Enable correlation ID tracking
CORRELATION_ID_HEADER=x-correlation-id

# Remote logging
REMOTE_LOG_ENDPOINT=/api/logs    # Remote logging endpoint
LOG_BATCH_SIZE=50               # Batch size for remote logging
LOG_FLUSH_INTERVAL=5000         # Flush interval in ms

# Performance
ENABLE_PERFORMANCE_LOGGING=true  # Enable performance metrics
PERFORMANCE_THRESHOLD_SLOW=1000  # Slow operation threshold (ms)
PERFORMANCE_THRESHOLD_WARNING=5000 # Warning threshold (ms)
PERFORMANCE_THRESHOLD_ERROR=10000  # Error threshold (ms)

# Security
SANITIZE_PASSWORDS=true         # Redact passwords from logs
SANITIZE_TOKENS=true           # Redact tokens from logs
REDACT_FIELDS=password,token,secret,apiKey
```

### Application Configuration

```typescript
import { createLoggingConfig } from '@/lib/logging/config';

const config = createLoggingConfig('production', {
  minConsoleLevel: LogLevel.WARN,
  batchSize: 200,
  flushInterval: 30000,
  enablePerformanceMetrics: true
});
```

## Best Practices

### 1. Use Appropriate Log Levels

- **DEBUG**: Detailed diagnostic information, only visible in development
- **INFO**: General information about application flow
- **WARN**: Something unusual happened but the application continues
- **ERROR**: An error occurred but the application continues
- **CRITICAL**: A serious error occurred that may stop the application

### 2. Include Context

Always include relevant context in log entries:

```typescript
// Good
logger.info('User authenticated', { 
  userId: user.id, 
  method: 'oauth',
  provider: 'google'
});

// Bad
logger.info('User authenticated');
```

### 3. Log Request Boundaries

Log at the beginning and end of request processing:

```typescript
export async function POST(request: NextRequest) {
  const correlationId = getCurrentCorrelationId();
  
  logger.info('Request started', { 
    correlationId,
    method: 'POST',
    path: request.url
  });
  
  try {
    // Process request
    const result = await processRequest();
    
    logger.info('Request completed', { 
      correlationId,
      duration: Date.now() - startTime,
      success: true
    });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Request failed', error, { correlationId });
    throw error;
  }
}
```

### 4. Performance Logging

Use performance logging for operations that might be slow:

```typescript
const monitor = new PerformanceMonitor('database');

monitor.mark('query-start');
const users = await db.users.findMany();
monitor.measure('user-query', 'query-start');
```

### 5. Error Logging

Include full error context when logging errors:

```typescript
try {
  await risky_operation();
} catch (error) {
  logger.error('Risky operation failed', error, {
    operation: 'user_creation',
    userId: user.id,
    attempt: retryCount
  });
}
```

### 6. Security Considerations

- Never log sensitive information (passwords, tokens, personal data)
- Use sanitization features to automatically redact sensitive fields
- Be careful with user-generated content in logs

```typescript
// Automatically sanitized
logger.info('User data processed', {
  user: {
    id: '123',
    email: 'user@example.com',
    password: 'secret123'  // Will be redacted
  }
});
```

## Middleware Integration

### Request/Response Logging

The middleware automatically:
- Generates or extracts correlation IDs
- Logs all incoming requests with structured format
- Adds correlation ID to response headers
- Measures request duration

### Microservice Communication

When making requests to other services, correlation IDs are automatically propagated:

```typescript
// API client automatically adds correlation ID headers
const response = await apiClient.request({
  url: '/api/external-service',
  method: 'POST',
  body: data
});
```

## Monitoring and Debugging

### Finding Related Logs

Use correlation IDs to find all logs related to a specific request:

```bash
# Search logs by correlation ID
grep "1a2b3c4d5e-f0123456789abcdef" /var/log/dinoair/*.log

# In structured log systems
{"correlationId": "1a2b3c4d5e-f0123456789abcdef"}
```

### Performance Analysis

Monitor performance metrics in logs:

```json
{
  "level": 1,
  "message": "Performance: database-query",
  "context": {
    "performance": {
      "operation": "database-query",
      "duration": 150.5,
      "timestamp": 1704067200000
    }
  }
}
```

### Error Tracking

Track errors across the system:

```json
{
  "level": 3,
  "message": "Database connection failed",
  "correlationId": "1a2b3c4d5e-f0123456789abcdef",
  "error": {
    "name": "ConnectionError",
    "message": "Unable to connect to database",
    "stack": "ConnectionError: Unable to connect..."
  }
}
```

## Testing

### Testing with Correlation IDs

```typescript
import { CorrelationIdManager } from '@/lib/correlation/correlation-id';

describe('API endpoints', () => {
  beforeEach(() => {
    const manager = CorrelationIdManager.getInstance();
    manager.setCorrelationId('test-correlation-id');
  });
  
  it('should include correlation ID in response', async () => {
    const response = await fetch('/api/test');
    expect(response.headers.get('x-correlation-id')).toBe('test-correlation-id');
  });
});
```

### Mock Logging in Tests

```typescript
// Disable remote logging in tests
const testConfig = createLoggingConfig('test', {
  consoleOutput: false,
  remoteEndpoint: undefined
});
```

## Troubleshooting

### Common Issues

1. **Missing Correlation IDs**: Check middleware configuration
2. **Logs not appearing**: Verify log level configuration
3. **Performance impact**: Adjust batch size and flush interval
4. **Storage issues**: Configure log rotation and cleanup

### Debugging Steps

1. Check correlation ID generation and propagation
2. Verify log level configuration
3. Test remote logging endpoint
4. Monitor log file sizes and rotation

## Related Files

- `lib/correlation/correlation-id.ts` - Correlation ID utilities
- `lib/logging/logger.ts` - Client-side logging system
- `lib/logging/config.ts` - Logging configuration
- `lib/logging/safe_logger.py` - Server-side logging (Python)
- `lib/correlation_id.py` - Python correlation ID utilities
- `middleware.ts` - Request middleware with correlation ID support
- `app/api/logs/route.ts` - Centralized logging endpoint