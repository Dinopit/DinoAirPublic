import { NextRequest, NextResponse } from 'next/server';

declare const process: any;

export interface ApiKeyConfig {
  key: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
}

// Helper to get API keys from localStorage (client-side only)
export function getApiKeys(): ApiKeyConfig[] {
  if (typeof window === 'undefined') return [];
  
  const keys = localStorage.getItem('dinoair-api-keys');
  return keys ? JSON.parse(keys) : [];
}

// Helper to save API keys to localStorage
export function saveApiKeys(keys: ApiKeyConfig[]) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('dinoair-api-keys', JSON.stringify(keys));
}

// Generate a new API key
export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'dinoair_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// API Authentication Middleware
export async function apiAuthMiddleware(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key required' },
      { status: 401 }
    );
  }

  // For server-side validation, we'll check against a temporary in-memory store
  // In production, this would be checked against a database
  const validKeys = process?.env?.DINOAIR_API_KEYS?.split(',') || ['dinoair_development_key'];
  
  if (!validKeys.includes(apiKey)) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }

  return null; // Authentication successful
}

// Create a wrapper for protected API routes
export function withApiAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T) => {
    const authError = await apiAuthMiddleware(request);
    if (authError) return authError;
    
    return handler(request, ...args);
  };
}
