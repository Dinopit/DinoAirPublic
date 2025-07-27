/**
 * DinoAir Request Validation & Sanitization Middleware
 * Validates and sanitizes all incoming requests to prevent security vulnerabilities
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import type { ZodSchema } from 'zod';
import { z, ZodError } from 'zod';

// Types
export interface ValidationConfig {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
  sanitize?: boolean;
  maxBodySize?: number;
  allowedContentTypes?: string[];
  customValidators?: CustomValidator[];
}

export interface CustomValidator {
  name: string;
  validate: (data: any) => boolean | Promise<boolean>;
  errorMessage: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Constants
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB default

// Common validation schemas
export const commonSchemas = {
  // IDs
  uuid: z.string().uuid(),
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  
  // Strings
  username: z.string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username must be alphanumeric'),
  
  email: z.string().email(),
  
  password: z.string()
    .min(8)
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  
  // Numbers
  positiveInt: z.number().int().positive(),
  percentage: z.number().min(0).max(100),
  
  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('asc')
  }),
  
  // File upload
  fileUpload: z.object({
    filename: z.string().max(255),
    mimetype: z.string(),
    size: z.number().positive().max(50 * 1024 * 1024) // 50MB max
  })
};

// Simple sanitization functions (without external dependencies)
export class Sanitizer {
  /**
   * Remove HTML tags
   */
  static html(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Sanitize text (escape HTML entities)
   */
  static text(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Sanitize filename
   */
  static filename(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '_')
      .slice(0, 255);
  }

  /**
   * Sanitize URL
   */
  static url(input: string): string {
    try {
      const url = new URL(input);
      // Only allow http(s) protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      return url.toString();
    } catch {
      return '';
    }
  }

  /**
   * Sanitize SQL-like input
   */
  static sql(input: string): string {
    return input
      .replace(/['";\\]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  /**
   * Sanitize JSON
   */
  static json(input: any): any {
    if (typeof input === 'string') {
      return this.text(input);
    }
    if (Array.isArray(input)) {
      return input.map(item => this.json(item));
    }
    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.text(key)] = this.json(value);
      }
      return sanitized;
    }
    return input;
  }
}

// Validation schemas for API endpoints
export const endpointSchemas: Record<string, ValidationConfig> = {
  // Auth endpoints
  '/api/auth/login': {
    body: z.object({
      username: commonSchemas.username,
      password: commonSchemas.password
    }),
    sanitize: true
  },
  
  '/api/auth/register': {
    body: z.object({
      username: commonSchemas.username,
      email: commonSchemas.email,
      password: commonSchemas.password
    }),
    sanitize: true
  },
  
  // Chat endpoints
  '/api/v1/chat': {
    body: z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(4000)
      })).max(100),
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      max_tokens: z.number().int().min(1).max(4000).optional()
    }),
    sanitize: true
  },
  
  // Image generation
  '/api/generate-image': {
    body: z.object({
      prompt: z.string().min(1).max(1000),
      negative_prompt: z.string().max(1000).optional(),
      width: z.number().int().min(64).max(2048).multipleOf(8),
      height: z.number().int().min(64).max(2048).multipleOf(8),
      steps: z.number().int().min(1).max(150),
      cfg_scale: z.number().min(1).max(30),
      seed: z.number().int().optional()
    }),
    sanitize: true
  },
  
  // Model management
  '/api/v1/models': {
    query: z.object({
      type: z.enum(['checkpoint', 'lora', 'vae', 'embedding']).optional(),
      search: z.string().max(100).optional()
    }).optional()
  },
  
  // Artifacts
  '/api/v1/artifacts': {
    query: commonSchemas.pagination.optional(),
    body: z.object({
      name: z.string().max(255),
      type: z.enum(['image', 'text', 'audio', 'video']),
      data: z.string(),
      metadata: z.record(z.string(), z.any()).optional()
    }).optional()
  }
};

/**
 * Parse request body safely
 */
async function parseBody(request: NextRequest): Promise<any> {
  const contentType = request.headers.get('content-type') || '';
  
  try {
    if (contentType.includes('application/json')) {
      return await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      const body: any = {};
      // Fix for TypeScript iteration
      const entries = Array.from(params.entries());
      for (const [key, value] of entries) {
        body[key] = value;
      }
      return body;
    } else if (contentType.includes('multipart/form-data')) {
      // Handle multipart form data
      const formData = await request.formData();
      const body: any = {};
      // Fix for TypeScript iteration
      const entries = Array.from(formData.entries());
      for (const [key, value] of entries) {
        if (value instanceof File) {
          body[key] = {
            filename: Sanitizer.filename(value.name),
            mimetype: value.type,
            size: value.size
          };
        } else {
          body[key] = value;
        }
      }
      return body;
    }
    return null;
  } catch (error) {
    throw new Error('Invalid request body');
  }
}

/**
 * Validate request against schema
 */
function validateData(data: any, schema: ZodSchema): { success: boolean; data?: any; errors?: ValidationError[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: ValidationError[] = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }));
      return { success: false, errors };
    }
    return { 
      success: false, 
      errors: [{ field: 'unknown', message: 'Validation failed' }] 
    };
  }
}

/**
 * Request validation middleware
 */
export async function validationMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  
  // Skip validation for static assets
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/static/') ||
      pathname === '/api/health') {
    return next();
  }
  
  // Get validation config for endpoint
  const config = endpointSchemas[pathname];
  if (!config) {
    // No validation configured, proceed
    return next();
  }
  
  // Check content type
  if (config.allowedContentTypes) {
    const contentType = request.headers.get('content-type') || '';
    const allowed = config.allowedContentTypes.some(type => contentType.includes(type));
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Invalid Content-Type',
          message: `Content-Type must be one of: ${config.allowedContentTypes.join(', ')}`
        },
        { status: 415 }
      );
    }
  }
  
  // Check body size
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  const maxSize = config.maxBodySize || MAX_BODY_SIZE;
  if (contentLength > maxSize) {
    return NextResponse.json(
      {
        error: 'Request Too Large',
        message: `Request body exceeds maximum size of ${maxSize} bytes`
      },
      { status: 413 }
    );
  }
  
  const errors: ValidationError[] = [];
  const validatedData: any = {};
  
  // Validate body
  if (config.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const body = await parseBody(request);
      const result = validateData(body, config.body);
      if (!result.success) {
        errors.push(...(result.errors || []));
      } else {
        validatedData.body = config.sanitize ? Sanitizer.json(result.data) : result.data;
      }
    } catch (error) {
      errors.push({
        field: 'body',
        message: error instanceof Error ? error.message : 'Invalid request body'
      });
    }
  }
  
  // Validate query parameters
  if (config.query) {
    const query: any = {};
    request.nextUrl.searchParams.forEach((value, key) => {
      query[key] = value;
    });
    
    const result = validateData(query, config.query);
    if (!result.success) {
      errors.push(...(result.errors || []));
    } else {
      validatedData.query = result.data;
    }
  }
  
  // Validate headers
  if (config.headers) {
    const headers: any = {};
    // Get header keys from the schema
    const headerKeys = Object.keys((config.headers as any)._def.shape);
    headerKeys.forEach((key: string) => {
      const value = request.headers.get(key);
      if (value !== null) {
        headers[key] = value;
      }
    });
    
    const result = validateData(headers, config.headers);
    if (!result.success) {
      errors.push(...(result.errors || []));
    } else {
      validatedData.headers = result.data;
    }
  }
  
  // Run custom validators
  if (config.customValidators) {
    for (const validator of config.customValidators) {
      try {
        const isValid = await validator.validate(validatedData);
        if (!isValid) {
          errors.push({
            field: 'custom',
            message: validator.errorMessage,
            code: validator.name
          });
        }
      } catch (error) {
        errors.push({
          field: 'custom',
          message: `Validator ${validator.name} failed`,
          code: 'validator_error'
        });
      }
    }
  }
  
  // Return errors if validation failed
  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: 'Validation Failed',
        message: 'Request validation failed',
        errors
      },
      { status: 400 }
    );
  }
  
  // Add validated data to request for downstream use
  (request as any).validated = validatedData;
  
  // Proceed with validated request
  return next();
}

/**
 * Create validation middleware for specific schema
 */
export function createValidator(config: ValidationConfig) {
  return async function(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    // Apply validation with provided config
    const tempEndpoint = `/_temp_${Date.now()}`;
    endpointSchemas[tempEndpoint] = config;
    
    // Temporarily override pathname
    const originalPathname = request.nextUrl.pathname;
    Object.defineProperty(request.nextUrl, 'pathname', {
      value: tempEndpoint,
      configurable: true
    });
    
    const result = await validationMiddleware(request, next);
    
    // Restore original pathname
    Object.defineProperty(request.nextUrl, 'pathname', {
      value: originalPathname,
      configurable: true
    });
    
    // Clean up
    delete endpointSchemas[tempEndpoint];
    
    return result;
  };
}

/**
 * Input sanitization helpers
 */
export const sanitize = {
  string: (input: string, maxLength: number = 1000): string => {
    return Sanitizer.text(input).slice(0, maxLength);
  },
  
  email: (input: string): string => {
    return input.toLowerCase().trim().slice(0, 254);
  },
  
  url: (input: string): string => {
    return Sanitizer.url(input);
  },
  
  filename: (input: string): string => {
    return Sanitizer.filename(input);
  },
  
  number: (input: any, min?: number, max?: number): number => {
    const num = parseFloat(input);
    if (isNaN(num)) return 0;
    if (min !== undefined && num < min) return min;
    if (max !== undefined && num > max) return max;
    return num;
  },
  
  boolean: (input: any): boolean => {
    return input === true || input === 'true' || input === '1' || input === 1;
  },
  
  array: (input: any, maxLength: number = 100): any[] => {
    if (!Array.isArray(input)) return [];
    return input.slice(0, maxLength);
  }
};

// Export default middleware
export default validationMiddleware;
