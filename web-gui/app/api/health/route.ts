import { NextRequest, NextResponse } from 'next/server';

async function checkAPI(): Promise<boolean> {
  try {
    // Check if the API is responsive
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:8080';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${apiUrl}/health`, {
      signal: controller.signal,
      method: 'HEAD',
    }).catch(() => null);
    
    clearTimeout(timeoutId);
    return response?.ok || false;
  } catch {
    return false;
  }
}

async function checkComfyUI(): Promise<boolean> {
  try {
    // Check if ComfyUI backend is responsive
    const comfyUrl = process.env.COMFYUI_API_URL || 'http://localhost:8188';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${comfyUrl}/`, {
      signal: controller.signal,
      method: 'HEAD',
    }).catch(() => null);
    
    clearTimeout(timeoutId);
    return response?.ok || false;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Perform health checks
  const [apiHealthy, comfyUIHealthy] = await Promise.all([
    checkAPI(),
    checkComfyUI(),
  ]);
  
  const allHealthy = apiHealthy && comfyUIHealthy;
  const responseTime = Date.now() - startTime;
  
  const healthStatus = {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      api: {
        status: apiHealthy ? 'healthy' : 'unhealthy',
        endpoint: process.env.API_BASE_URL || 'http://localhost:8080',
      },
      comfyui: {
        status: comfyUIHealthy ? 'healthy' : 'unhealthy',
        endpoint: process.env.COMFYUI_API_URL || 'http://localhost:8188',
      },
      memory: {
        status: 'healthy',
        usage: process.memoryUsage(),
      },
      uptime: {
        status: 'healthy',
        seconds: process.uptime(),
      },
    },
  };
  
  // Return appropriate status code based on health
  const statusCode = allHealthy ? 200 : 503;
  
  return NextResponse.json(healthStatus, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

// Support HEAD requests for lighter health checks
export async function HEAD(request: NextRequest) {
  const [apiHealthy, comfyUIHealthy] = await Promise.all([
    checkAPI(),
    checkComfyUI(),
  ]);
  
  const allHealthy = apiHealthy && comfyUIHealthy;
  const statusCode = allHealthy ? 200 : 503;
  
  return new NextResponse(null, { status: statusCode });
}