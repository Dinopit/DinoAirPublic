import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyToken } from './auth';

export async function analyticsAuthMiddleware(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const authHeader = request.headers.get('authorization');

  if (apiKey) {
    if (!process.env.DINOAIR_API_KEYS) {
      if (process.env.NODE_ENV === 'development') {
        throw new Error(
          'DINOAIR_API_KEYS environment variable is not set. Please configure it for development.'
        );
      } else {
        return NextResponse.json(
          { error: 'API key validation is not configured' },
          { status: 500 }
        );
      }
    }

    // Basic API key format validation
    if (apiKey.length < 16 || !apiKey.includes('_')) {
      return NextResponse.json({ error: 'Invalid API key format' }, { status: 401 });
    }

    const validKeys = process.env.DINOAIR_API_KEYS.split(',').map((key) => key.trim());
    if (!validKeys.includes(apiKey)) {
      return NextResponse.json({ error: 'Invalid API key for analytics access' }, { status: 401 });
    }

    return null;
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // Proper JWT validation instead of simple length check
    const payload = verifyToken(token);
    if (payload) {
      return null; // Authentication successful
    }

    // If token is provided but invalid, return error
    return NextResponse.json({ error: 'Invalid or expired authentication token' }, { status: 401 });
  }

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Enhanced development mode validation - prevent leak to production
  if (process.env.NODE_ENV === 'development' && !process.env.VERCEL_ENV && !process.env.RENDER) {
    try {
      const originHostname = origin ? new URL(origin).hostname : null;
      const refererHostname = referer ? new URL(referer).hostname : null;

      // Only allow localhost in true development environment
      if (
        originHostname === 'localhost' ||
        originHostname === '127.0.0.1' ||
        refererHostname === 'localhost' ||
        refererHostname === '127.0.0.1'
      ) {
        return null;
      }
    } catch (e) {
      // Ignore invalid URLs in origin or referer
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
