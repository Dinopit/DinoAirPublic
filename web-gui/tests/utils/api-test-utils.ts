import { NextRequest } from 'next/server';

// Helper to create a mock NextRequest
export function createMockRequest(options: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
} = {}) {
  const {
    url = 'http://localhost:3000/api/test',
    method = 'GET',
    headers = {},
    body
  } = options;

  const request = new NextRequest(url, {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers
    }),
    body: body ? JSON.stringify(body) : undefined
  });

  return request;
}

// Mock middleware result
export function createMockMiddlewareResult(overrides: any = {}) {
  return {
    authorized: true,
    rateLimited: false,
    clientId: 'test-client',
    response: null,
    ...overrides
  };
}

// Mock cache functions
export const mockWithCache = jest.fn(async (key: string, fn: () => Promise<any>, ttl?: number) => {
  return await fn();
});

export const mockGenerateCacheKey = jest.fn((key: string) => `test-${key}`);

// Helper to parse API response
export async function parseApiResponse(response: Response) {
  const body = await response.json();
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body
  };
}