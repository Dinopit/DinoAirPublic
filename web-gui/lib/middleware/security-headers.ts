import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function applySecurityHeaders(_request: NextRequest, response: NextResponse) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline' ${
      process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''
    };
    style-src 'self' 'unsafe-inline' https:;
    img-src 'self' blob: data: https:;
    font-src 'self' data: https:;
    connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL} ${process.env.NEXT_PUBLIC_WS_URL} https://api.github.com wss: https:;
    media-src 'self' blob: data:;
    object-src 'none';
    frame-src 'self';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
    block-all-mixed-content;
  `.replace(/\s{2,}/g, ' ').trim();

  const headers = {
    // Security headers
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Content-Security-Policy': cspHeader,
    'X-Content-Security-Policy': cspHeader,
    'X-WebKit-CSP': cspHeader,
    
    // Additional security headers
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    
    // Remove server information
    'X-Powered-By': '',
    'Server': '',
  };

  // Apply all headers to the response
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Set nonce for inline scripts
  response.headers.set('X-Nonce', nonce);

  return response;
}

// Report URI for CSP violations (optional)
export function getCSPReportUri(): string {
  return process.env.CSP_REPORT_URI || '/api/csp-report';
}

// Helper to generate script tag with nonce
export function generateScriptTag(content: string, nonce: string): string {
  return `<script nonce="${nonce}">${content}</script>`;
}
