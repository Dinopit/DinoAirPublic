import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { validateApiKey, updateApiKeyUsage } from './api-auth';
import { checkRateLimit, getRateLimitHeaders, getClientIdentifier } from './rate-limiter';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export interface ApiMiddlewareResult {
  authorized: boolean;
  rateLimited: boolean;
  response?: NextResponse;
  clientId?: string;
}

/**
 * Common API middleware for authentication and rate limiting
 * @param request The incoming request
 * @returns Middleware result with authorization and rate limit status
 */
export async function apiMiddleware(request: NextRequest): Promise<ApiMiddlewareResult> {
  // Check authentication
  const authHeader = request.headers.get('authorization');
  
  if (!validateApiKey(authHeader)) {
    return {
      authorized: false,
      rateLimited: false,
      response: NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401, headers: corsHeaders }
      )
    };
  }
  
  // Check rate limit
  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(request, clientId);
  
  if (!rateLimitResult.allowed) {
    return {
      authorized: true,
      rateLimited: true,
      response: NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429, 
          headers: {
            ...corsHeaders,
            ...getRateLimitHeaders(rateLimitResult),
            'Retry-After': (rateLimitResult.reset - Math.floor(Date.now() / 1000)).toString()
          }
        }
      )
    };
  }
  
  // Update API key usage statistics
  if (authHeader) {
    updateApiKeyUsage(authHeader);
  }
  
  return {
    authorized: true,
    rateLimited: false,
    clientId
  };
}

/**
 * Create a successful JSON response with CORS and rate limit headers
 * @param data The response data
 * @param request The original request
 * @param clientId The client identifier for rate limiting
 * @returns NextResponse with appropriate headers
 */
export function createApiResponse<T>(
  data: T,
  request: NextRequest,
  clientId: string
): NextResponse {
  const rateLimitHeaders = getRateLimitHeaders(checkRateLimit(request, clientId));
  
  return NextResponse.json(data, {
    headers: { ...corsHeaders, ...rateLimitHeaders }
  });
}

/**
 * Handle OPTIONS request for CORS preflight
 * @returns NextResponse for OPTIONS request
 */
export function handleOptionsRequest(): NextResponse {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Create an error response with CORS headers
 * @param message Error message
 * @param status HTTP status code
 * @returns NextResponse with error
 */
export function createErrorResponse(
  message: string,
  status: number = 500
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: corsHeaders }
  );
}
