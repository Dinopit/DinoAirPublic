/**
 * DinoAir Authentication Middleware
 * Provides API key authentication and user session management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { z } from 'zod';

// Simple JWT implementation without external dependencies
class SimpleJWT {
  private static encode(payload: any): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHash('sha256')
      .update(`${encodedHeader}.${encodedPayload}.${process.env.JWT_SECRET || 'secret'}`)
      .digest('base64url');
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  private static decode(token: string): any | null {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');
      
      if (!encodedHeader || !encodedPayload || !signature) {
        return null;
      }
      
      const expectedSignature = createHash('sha256')
        .update(`${encodedHeader}.${encodedPayload}.${process.env.JWT_SECRET || 'secret'}`)
        .digest('base64url');
      
      if (signature !== expectedSignature) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
      
      // Check expiration
      if (payload.exp && payload.exp < Date.now() / 1000) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  static sign(payload: any, expiresIn: string = '24h'): string {
    const expirationHours = parseInt(expiresIn) || 24;
    const exp = Math.floor(Date.now() / 1000) + (expirationHours * 60 * 60);
    return this.encode({ ...payload, exp, iat: Math.floor(Date.now() / 1000) });
  }

  static verify(token: string): any | null {
    return this.decode(token);
  }
}

// Environment variables validation
const envSchema = z.object({
  DINOAIR_API_KEY: z.string().min(32),
  JWT_SECRET: z.string().min(32).default('change-this-secret-in-production'),
  SESSION_DURATION: z.string().default('24h'),
  SECURE_COOKIES: z.string().default('true')
});

// Validate environment
let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('Invalid environment configuration for auth middleware');
  // Use defaults for development
  env = {
    DINOAIR_API_KEY: process.env.DINOAIR_API_KEY || 'development-key-do-not-use-in-production',
    JWT_SECRET: process.env.JWT_SECRET || 'development-secret-do-not-use-in-production',
    SESSION_DURATION: '24h',
    SECURE_COOKIES: 'true'
  };
}

// Types
export interface AuthContext {
  authenticated: boolean;
  userId?: string;
  sessionId?: string;
  apiKey?: boolean;
  permissions?: string[];
}

export interface JWTPayload {
  userId: string;
  sessionId: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

// Constants
const AUTH_COOKIE_NAME = 'dinoair-auth';
const API_KEY_HEADER = 'x-api-key';
const BEARER_PREFIX = 'Bearer ';

// Exempt paths that don't require authentication
const EXEMPT_PATHS = new Set([
  '/api/health',
  '/api/v1/system/health',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api-docs',
  '/api/openapi'
]);

// API-only paths that require API key
const API_ONLY_PATHS = new Set([
  '/api/v1/models',
  '/api/v1/chat',
  '/api/v1/artifacts'
]);

/**
 * Hash API key for secure comparison
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Verify API key
 */
function verifyApiKey(providedKey: string): boolean {
  if (!providedKey || !env.DINOAIR_API_KEY) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  const providedHash = hashApiKey(providedKey);
  const expectedHash = hashApiKey(env.DINOAIR_API_KEY);
  
  if (providedHash.length !== expectedHash.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < providedHash.length; i++) {
    result |= providedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Create JWT token
 */
export function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return SimpleJWT.sign(payload, env.SESSION_DURATION);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  return SimpleJWT.verify(token) as JWTPayload | null;
}

/**
 * Extract auth context from request
 */
export function extractAuthContext(request: NextRequest): AuthContext {
  const context: AuthContext = {
    authenticated: false
  };

  // Check API key header
  const apiKey = request.headers.get(API_KEY_HEADER);
  if (apiKey && verifyApiKey(apiKey)) {
    context.authenticated = true;
    context.apiKey = true;
    context.permissions = ['api.full']; // API keys get full access
    return context;
  }

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    const token = authHeader.slice(BEARER_PREFIX.length);
    const payload = verifyToken(token);
    if (payload) {
      context.authenticated = true;
      context.userId = payload.userId;
      context.sessionId = payload.sessionId;
      context.permissions = payload.permissions;
      return context;
    }
  }

  // Check session cookie
  const cookieValue = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieValue) {
    const payload = verifyToken(cookieValue);
    if (payload) {
      context.authenticated = true;
      context.userId = payload.userId;
      context.sessionId = payload.sessionId;
      context.permissions = payload.permissions;
      return context;
    }
  }

  return context;
}

/**
 * Authentication middleware
 */
export async function authMiddleware(
  request: NextRequest,
  next: () => Promise<NextResponse>
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // Skip auth for exempt paths
  if (EXEMPT_PATHS.has(pathname)) {
    return next();
  }

  // Extract auth context
  const authContext = extractAuthContext(request);

  // Check if path requires API key
  if (API_ONLY_PATHS.has(pathname) && !authContext.apiKey) {
    return NextResponse.json(
      {
        error: 'API key required',
        message: 'This endpoint requires a valid API key'
      },
      { status: 401 }
    );
  }

  // Check general authentication
  if (!authContext.authenticated) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Authentication required'
      },
      { status: 401 }
    );
  }

  // Add auth context to request headers for downstream use
  const response = await next();
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

/**
 * Create auth cookie options
 */
export function getAuthCookieOptions() {
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: env.SECURE_COOKIES === 'true',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 24 * 60 * 60 // 24 hours
  };
}

/**
 * Check if user has required permissions
 */
export function hasPermission(
  context: AuthContext,
  requiredPermissions: string | string[]
): boolean {
  if (!context.authenticated || !context.permissions) {
    return false;
  }

  const required = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];

  // API keys have full access
  if (context.apiKey) {
    return true;
  }

  // Check if user has all required permissions
  return required.every(perm => context.permissions!.includes(perm));
}

/**
 * Permission check middleware factory
 */
export function requirePermissions(permissions: string | string[]) {
  return async (
    _request: NextRequest,
    context: AuthContext,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    if (!hasPermission(context, permissions)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Insufficient permissions'
        },
        { status: 403 }
      );
    }
    return next();
  };
}

/**
 * Validate and sanitize auth inputs
 */
export const authInputSchema = z.object({
  username: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username must be alphanumeric'),
  password: z.string()
    .min(8)
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number')
});

export type AuthInput = z.infer<typeof authInputSchema>;

/**
 * Session management utilities
 */
export class SessionManager {
  private static sessions = new Map<string, {
    userId: string;
    createdAt: number;
    lastActivity: number;
    data: Record<string, any>;
  }>();

  static createSession(userId: string): string {
    const sessionId = createHash('sha256')
      .update(`${userId}-${Date.now()}-${Math.random()}`)
      .digest('hex');

    this.sessions.set(sessionId, {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      data: {}
    });

    // Clean up old sessions
    this.cleanupSessions();

    return sessionId;
  }

  static getSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  static deleteSession(sessionId: string) {
    this.sessions.delete(sessionId);
  }

  static cleanupSessions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Fix for TypeScript iteration error
    const entries = Array.from(this.sessions.entries());
    for (const [sessionId, session] of entries) {
      if (now - session.lastActivity > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

// Export middleware for use in Next.js middleware
export default authMiddleware;
