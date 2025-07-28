import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function analyticsAuthMiddleware(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const authHeader = request.headers.get('authorization');

  if (apiKey) {
    if (!process.env.DINOAIR_API_KEYS) {
      if (process.env.NODE_ENV === 'development') {
        throw new Error('DINOAIR_API_KEYS environment variable is not set. Please configure it for development.');
      } else {
        return NextResponse.json({ error: 'API key validation is not configured' }, { status: 500 });
      }
    }

    const validKeys = process.env.DINOAIR_API_KEYS.split(',');
    if (!validKeys.includes(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key for analytics access' }, { status: 401 });
    }

    return null;
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    if (token && token.length > 10) {
      return null;
    }
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (process.env.NODE_ENV === 'development') {
    if (origin?.includes('localhost') || referer?.includes('localhost')) {
      return null;
    }
  }

  return NextResponse.json(
    {
      error: 'Analytics access requires authentication',
      details: 'Provide x-api-key header or Authorization Bearer token',
    },
    { status: 401 }
  );
}

export function withAnalyticsAuth<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T) => {
    const authError = await analyticsAuthMiddleware(request);
    if (authError) return authError;

    return handler(request, ...args);
  };
}
