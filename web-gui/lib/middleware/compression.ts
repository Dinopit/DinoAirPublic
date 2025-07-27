import { promisify } from 'util';
import { gzip as gzipCallback } from 'zlib';

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';


const gzip = promisify(gzipCallback);

export interface CompressionOptions {
  threshold?: number; // Minimum size in bytes to compress (default: 1024)
  level?: number; // Compression level 0-9 (default: 6)
  filter?: (req: NextRequest) => boolean; // Filter function to determine if compression should be applied
}

const DEFAULT_OPTIONS: CompressionOptions = {
  threshold: 1024, // 1KB
  level: 6,
  filter: (req) => {
    // Don't compress if already compressed
    const contentEncoding = req.headers.get('content-encoding');
    if (contentEncoding) return false;
    
    // Check if client accepts compression
    const acceptEncoding = req.headers.get('accept-encoding') || '';
    return acceptEncoding.includes('gzip');
  }
};

export async function compressResponse(
  response: NextResponse,
  request: NextRequest,
  options: CompressionOptions = {}
): Promise<NextResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Check if compression should be applied
  if (!opts.filter?.(request)) {
    return response;
  }
  
  // Get response body
  const body = await response.text();
  
  // Check if body is large enough to compress
  if (body.length < (opts.threshold || 1024)) {
    return response;
  }
  
  // Check content type - only compress text-based content
  const contentType = response.headers.get('content-type') || '';
  const compressibleTypes = [
    'text/',
    'application/json',
    'application/javascript',
    'application/xml',
    'application/xhtml+xml',
    'application/rss+xml',
    'application/atom+xml',
    'application/x-font-ttf',
    'application/x-font-otf',
    'application/x-font-woff',
    'image/svg+xml'
  ];
  
  const shouldCompress = compressibleTypes.some(type => contentType.includes(type));
  if (!shouldCompress) {
    return response;
  }
  
  try {
    // Compress the body
    const compressed = await gzip(Buffer.from(body), { level: opts.level });
    
    // Create new response with compressed body
    const compressedResponse = new NextResponse(compressed, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });
    
    // Update headers
    compressedResponse.headers.set('Content-Encoding', 'gzip');
    compressedResponse.headers.set('Vary', 'Accept-Encoding');
    compressedResponse.headers.delete('Content-Length'); // Remove as it will be different
    
    return compressedResponse;
  } catch (error) {
    console.error('Compression error:', error);
    return response; // Return original response on error
  }
}

// Brotli compression for static assets (handled by Next.js automatically)
export function configureBrotliCompression() {
  // This is handled by Next.js build process automatically
  // Files are pre-compressed during build with .br extension
  return {
    brotli: true,
    gzip: true
  };
}
