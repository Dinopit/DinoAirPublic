import { NextRequest, NextResponse } from 'next/server'
import { applySecurityHeaders } from './lib/middleware/security-headers'

export function middleware(request: NextRequest) {
  // Get request details
  const timestamp = new Date().toISOString()
  const method = request.method
  const url = request.url
  const pathname = request.nextUrl.pathname
  
  // Get client IP (works in production, fallback for development)
  const clientIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'localhost'
  
  // Log the request
  console.log(`[${timestamp}] ${method} ${pathname} - IP: ${clientIp}`)
  
  // Log API requests with more detail
  if (pathname.startsWith('/api/')) {
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const contentType = request.headers.get('content-type') || 'Unknown'
    
    console.log(`  User-Agent: ${userAgent}`)
    console.log(`  Content-Type: ${contentType}`)
    
    // Log authorization header presence (not the actual value for security)
    const hasAuth = request.headers.has('authorization')
    console.log(`  Authorization: ${hasAuth ? 'Present' : 'Not present'}`)
  }
  
  // Create the response
  let response = NextResponse.next()
  
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
  
  // Continue with the request
  return response
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