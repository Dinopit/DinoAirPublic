import { NextRequest, NextResponse } from 'next/server'
import { applySecurityHeaders } from './lib/middleware/security-headers'
import { 
  extractCorrelationId, 
  CORRELATION_ID_HEADER,
  ServerCorrelationContext 
} from './lib/correlation/correlation-id'

export function middleware(request: NextRequest) {
  // Generate or extract correlation ID
  const correlationId = extractCorrelationId(
    request.headers,
    request.nextUrl.searchParams
  )

  // Get request details
  const timestamp = new Date().toISOString()
  const method = request.method
  const url = request.url
  const pathname = request.nextUrl.pathname
  
  // Get client IP (works in production, fallback for development)
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'localhost'
  
  // Structured logging with correlation ID
  const logData = {
    timestamp,
    correlationId,
    method,
    pathname,
    clientIp,
    userAgent: request.headers.get('user-agent') || 'Unknown',
    contentType: request.headers.get('content-type') || 'Unknown',
    hasAuth: request.headers.has('authorization'),
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }

  // Log the request in structured format
  console.log(JSON.stringify({
    level: 'INFO',
    message: `${method} ${pathname}`,
    component: 'middleware',
    type: 'request',
    ...logData
  }))
  
  // Log API requests with more detail
  if (pathname.startsWith('/api/')) {
    console.log(JSON.stringify({
      level: 'DEBUG',
      message: `API request details`,
      component: 'middleware',
      type: 'api_request',
      ...logData
    }))
  }
  
  // Create the response and add correlation ID header
  let response = NextResponse.next()
  response.headers.set(CORRELATION_ID_HEADER, correlationId)
  
  // Apply security headers in production
  if (process.env.NODE_ENV === 'production') {
    response = applySecurityHeaders(request, response)
  }
  
  // Add compression hint
  response.headers.set('Accept-Encoding', 'gzip, deflate, br')
  
  // Add cache control for static assets
  if (pathname.startsWith('/_next/static/') || pathname.startsWith('/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (pathname.startsWith('/_next/image')) {
    response.headers.set('Cache-Control', 'public, max-age=86400, must-revalidate')
  } else if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  }
  
  // Log response
  const endTime = Date.now()
  console.log(JSON.stringify({
    level: 'INFO',
    message: `Response sent`,
    component: 'middleware',
    type: 'response',
    correlationId,
    pathname,
    status: response.status,
    duration: endTime - parseInt(logData.requestId.split('_')[1])
  }))
  
  // Continue with the request in correlation context
  return ServerCorrelationContext.runWithCorrelationId(correlationId, () => response)
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}