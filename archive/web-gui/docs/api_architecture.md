# API Architecture Documentation

## Overview

This document describes the new API architecture implemented to achieve proper separation of concerns in DinoAir's API routes.

## Architecture Layers

### 1. Service Layer (`/lib/services/`)

The service layer contains all business logic and external service interactions. Services are responsible for:

- Data processing and transformation
- External API calls (Ollama, ComfyUI, etc.)
- Business rule enforcement
- Error handling for business operations

**Example: ChatService**
```typescript
export class ChatService {
  async processChat(request: ChatRequest): Promise<ServiceResult<Response>> {
    // Business logic here
  }
}
```

### 2. Controller Layer (`/lib/controllers/`)

Controllers handle HTTP request/response logic and coordinate between services and routes. Controllers are responsible for:

- Request validation coordination
- Service orchestration
- Response formatting
- HTTP-specific logic

**Example: ChatController**
```typescript
export class ChatController {
  async handleChatRequest(request: NextRequest): Promise<NextResponse> {
    // Validate input
    // Call service
    // Format response
  }
}
```

### 3. Validation Layer (`/lib/validators/`)

Validators handle input validation and data sanitization. They provide:

- Schema-based validation using Zod
- Type-safe input parsing
- Consistent error messages
- Reusable validation patterns

**Example: Chat Validator**
```typescript
export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  model: z.string().optional(),
  // ...
});
```

### 4. Middleware Layer (`/lib/middleware/`)

Middleware provides cross-cutting concerns:

- Error handling (`error-handler.ts`)
- Authentication (`api-auth.ts`)
- Request validation
- Response formatting

### 5. Type Definitions (`/lib/types/`)

Centralized type definitions ensure consistency across layers:

```typescript
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}
```

## Usage Patterns

### 1. Creating a New API Route

1. **Define types** in `/lib/types/`
2. **Create validator** in `/lib/validators/`
3. **Implement service** in `/lib/services/`
4. **Create controller** in `/lib/controllers/`
5. **Update route** to use controller with middleware

### 2. Route Implementation Pattern

```typescript
// app/api/v1/example/route.ts
import { NextRequest } from 'next/server';
import { withApiAuth } from '@/lib/middleware/api-auth';
import { withErrorHandler } from '@/lib/middleware/error-handler';
import { ExampleController } from '@/lib/controllers/example.controller';

const controller = new ExampleController();

async function handleRequest(request: NextRequest) {
  return controller.handleRequest(request);
}

export const POST = withApiAuth(withErrorHandler(handleRequest));
```

### 3. Service Implementation Pattern

```typescript
// lib/services/example.service.ts
export class ExampleService {
  async processRequest(data: ExampleRequest): Promise<ServiceResult<ExampleResponse>> {
    try {
      // Business logic here
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error.message, 
        status: 500 
      };
    }
  }
}
```

### 4. Error Handling

Use custom error classes for different scenarios:

```typescript
import { ValidationError, ServiceUnavailableError } from '@/lib/middleware/error-handler';

// In services
throw new ServiceUnavailableError('Ollama service');

// In validators  
throw new ValidationError('Invalid input data');
```

## Benefits

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Business logic can be tested independently
3. **Reusability**: Services can be used across multiple routes
4. **Maintainability**: Changes are isolated to appropriate layers
5. **Type Safety**: Comprehensive TypeScript coverage
6. **Consistency**: Standardized patterns across all routes

## Testing Strategy

- **Service Tests**: Unit tests for business logic
- **Validator Tests**: Schema validation testing
- **Controller Tests**: Integration tests for request/response handling
- **Route Tests**: End-to-end API testing

## Migration Guide

To migrate existing routes to the new architecture:

1. Extract business logic to service layer
2. Create appropriate validators
3. Implement controller wrapper
4. Update route to use new pattern
5. Add tests for separated components
6. Remove deprecated code

## Best Practices

1. Keep controllers thin - delegate to services
2. Make services pure - no HTTP knowledge
3. Use validators for all input validation
4. Handle errors at appropriate layers
5. Maintain consistent naming conventions
6. Document service interfaces
7. Write comprehensive tests for each layer