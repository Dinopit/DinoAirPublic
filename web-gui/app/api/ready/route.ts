import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Readiness endpoint for blue-green deployments
 * This endpoint checks if the service is ready to receive traffic
 * Used by load balancers to determine when to switch traffic
 */

async function checkDependencies(): Promise<{ ready: boolean; details: any }> {
  const checks = [];
  
  // Check ComfyUI availability
  try {
    const comfyUrl = process.env.COMFYUI_API_URL || 'http://localhost:8188';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${comfyUrl}/`, {
      signal: controller.signal,
      method: 'HEAD'
    });
    
    clearTimeout(timeoutId);
    checks.push({
      name: 'comfyui',
      ready: response.ok,
      endpoint: comfyUrl
    });
  } catch (error) {
    checks.push({
      name: 'comfyui',
      ready: false,
      endpoint: process.env.COMFYUI_API_URL || 'http://localhost:8188',
      error: 'Connection failed'
    });
  }
  
  // Check Ollama availability (optional for readiness)
  try {
    const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: controller.signal,
      method: 'GET'
    });
    
    clearTimeout(timeoutId);
    checks.push({
      name: 'ollama',
      ready: response.ok,
      endpoint: ollamaUrl
    });
  } catch (error) {
    checks.push({
      name: 'ollama',
      ready: false,
      endpoint: process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434',
      error: 'Connection failed'
    });
  }
  
  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryHealthy = memoryUsage.heapUsed / memoryUsage.heapTotal < 0.95;
  checks.push({
    name: 'memory',
    ready: memoryHealthy,
    usage_percent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
  });
  
  // Check if application has been running long enough to be stable
  const uptime = process.uptime();
  const uptimeHealthy = uptime > 10; // At least 10 seconds
  checks.push({
    name: 'startup',
    ready: uptimeHealthy,
    uptime_seconds: Math.round(uptime)
  });
  
  // Determine overall readiness
  // ComfyUI is required, others are optional but should be checked
  const comfyUIReady = checks.find(c => c.name === 'comfyui')?.ready || false;
  const memoryReady = checks.find(c => c.name === 'memory')?.ready || false;
  const startupReady = checks.find(c => c.name === 'startup')?.ready || false;
  
  const overallReady = comfyUIReady && memoryReady && startupReady;
  
  return {
    ready: overallReady,
    details: checks
  };
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { ready, details } = await checkDependencies();
    const responseTime = Date.now() - startTime;
    
    const readinessStatus = {
      ready,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown',
      version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
      checks: details
    };
    
    // Return 200 if ready, 503 if not ready
    const statusCode = ready ? 200 : 503;
    
    return NextResponse.json(readinessStatus, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Environment': process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown',
        'X-Ready': ready.toString()
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      ready: false,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown',
      error: 'Readiness check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Environment': process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown',
        'X-Ready': 'false'
      }
    });
  }
}

// Support HEAD requests for lighter readiness checks
export async function HEAD(_request: NextRequest) {
  try {
    const { ready } = await checkDependencies();
    const statusCode = ready ? 200 : 503;
    
    return new NextResponse(null, {
      status: statusCode,
      headers: {
        'X-Environment': process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown',
        'X-Ready': ready.toString()
      }
    });
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Environment': process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown',
        'X-Ready': 'false'
      }
    });
  }
}
