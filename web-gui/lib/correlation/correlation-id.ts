/**
 * Correlation ID utilities for DinoAir
 * Provides correlation ID generation, storage, and propagation across requests
 */

import { randomBytes } from 'crypto';

/**
 * Header name for correlation IDs
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Context key for storing correlation ID in async local storage
 */
export const CORRELATION_ID_CONTEXT_KEY = 'correlationId';

/**
 * Generates a new correlation ID
 * Format: {timestamp}-{random-hex}
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Validates a correlation ID format
 */
export function isValidCorrelationId(id: string): boolean {
  // Basic format validation: timestamp-hex
  const pattern = /^[a-z0-9]+-[a-f0-9]{16}$/i;
  return pattern.test(id);
}

/**
 * Extracts correlation ID from various sources in priority order:
 * 1. Request headers
 * 2. Query parameters
 * 3. Generate new one
 */
export function extractCorrelationId(
  headers?: Headers | Record<string, string>,
  searchParams?: URLSearchParams
): string {
  // Try headers first
  if (headers) {
    const fromHeaders = headers instanceof Headers 
      ? headers.get(CORRELATION_ID_HEADER)
      : headers[CORRELATION_ID_HEADER];
    
    if (fromHeaders && isValidCorrelationId(fromHeaders)) {
      return fromHeaders;
    }
  }

  // Try query parameters
  if (searchParams) {
    const fromQuery = searchParams.get('correlationId');
    if (fromQuery && isValidCorrelationId(fromQuery)) {
      return fromQuery;
    }
  }

  // Generate new one
  return generateCorrelationId();
}

/**
 * Creates headers object with correlation ID
 */
export function createCorrelationHeaders(correlationId: string): Record<string, string> {
  return {
    [CORRELATION_ID_HEADER]: correlationId
  };
}

/**
 * Browser-side correlation ID storage
 */
export class CorrelationIdManager {
  private static instance: CorrelationIdManager;
  private currentId: string | null = null;

  private constructor() {}

  static getInstance(): CorrelationIdManager {
    if (!CorrelationIdManager.instance) {
      CorrelationIdManager.instance = new CorrelationIdManager();
    }
    return CorrelationIdManager.instance;
  }

  /**
   * Set the current correlation ID for the session
   */
  setCorrelationId(id: string): void {
    this.currentId = id;
    // Store in session storage for persistence across tabs
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dinoair-correlation-id', id);
    }
  }

  /**
   * Get the current correlation ID, generating one if none exists
   */
  getCorrelationId(): string {
    if (this.currentId) {
      return this.currentId;
    }

    // Try to get from session storage
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('dinoair-correlation-id');
      if (stored && isValidCorrelationId(stored)) {
        this.currentId = stored;
        return stored;
      }
    }

    // Generate new one
    const newId = generateCorrelationId();
    this.setCorrelationId(newId);
    return newId;
  }

  /**
   * Clear the current correlation ID (useful for new sessions)
   */
  clearCorrelationId(): void {
    this.currentId = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('dinoair-correlation-id');
    }
  }

  /**
   * Create new correlation ID and set it as current
   */
  renewCorrelationId(): string {
    const newId = generateCorrelationId();
    this.setCorrelationId(newId);
    return newId;
  }
}

/**
 * Server-side async local storage for correlation IDs
 * Note: This requires AsyncLocalStorage which is available in Node.js 12.17.0+
 */
let asyncLocalStorage: any = null;

// Initialize async local storage only on server side
if (typeof window === 'undefined') {
  try {
    const { AsyncLocalStorage } = require('async_hooks');
    asyncLocalStorage = new AsyncLocalStorage();
  } catch (error) {
    console.warn('AsyncLocalStorage not available, correlation ID context will be limited');
  }
}

/**
 * Server-side correlation ID context management
 */
export class ServerCorrelationContext {
  /**
   * Run code with correlation ID context
   */
  static runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
    if (!asyncLocalStorage) {
      // Fallback: just run the function
      return fn();
    }

    const context = new Map();
    context.set(CORRELATION_ID_CONTEXT_KEY, correlationId);
    return asyncLocalStorage.run(context, fn);
  }

  /**
   * Get correlation ID from current context
   */
  static getCorrelationId(): string | null {
    if (!asyncLocalStorage) {
      return null;
    }

    const context = asyncLocalStorage.getStore();
    return context?.get(CORRELATION_ID_CONTEXT_KEY) || null;
  }

  /**
   * Set correlation ID in current context
   */
  static setCorrelationId(correlationId: string): void {
    if (!asyncLocalStorage) {
      return;
    }

    const context = asyncLocalStorage.getStore();
    if (context) {
      context.set(CORRELATION_ID_CONTEXT_KEY, correlationId);
    }
  }
}

/**
 * Utility to get correlation ID from either browser or server context
 */
export function getCurrentCorrelationId(): string {
  // Server side
  if (typeof window === 'undefined') {
    return ServerCorrelationContext.getCorrelationId() || generateCorrelationId();
  }
  
  // Browser side
  return CorrelationIdManager.getInstance().getCorrelationId();
}

/**
 * Utility to set correlation ID in appropriate context
 */
export function setCurrentCorrelationId(id: string): void {
  // Server side
  if (typeof window === 'undefined') {
    ServerCorrelationContext.setCorrelationId(id);
    return;
  }
  
  // Browser side
  CorrelationIdManager.getInstance().setCorrelationId(id);
}