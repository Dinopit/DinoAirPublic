import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCorrelationId } from '@/lib/correlation/correlation-id';
import { getLogger } from '@/lib/logging/logger';

const logger = getLogger('health-api');

async function checkOllama(): Promise<boolean> {
  const correlationId = getCurrentCorrelationId();
  
  try {
    // Check if Ollama is responsive
    const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    logger.debug('Checking Ollama health', { ollamaUrl, correlationId });
    
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: controller.signal,
      method: 'GET',
    }).catch(() => null);
    
    clearTimeout(timeoutId);
    
    const isHealthy = response?.ok || false;
    logger.info('Ollama health check completed', { 
      ollamaUrl, 
      isHealthy, 
      status: response?.status,
      correlationId 
    });
    
    return isHealthy;
  } catch (error) {
    logger.error('Ollama health check failed', error, { correlationId });
    return false;
  }
}

async function checkComfyUI(): Promise<boolean> {
  const correlationId = getCurrentCorrelationId();
  
  try {
    // Check if ComfyUI backend is responsive
    const comfyUrl = process.env.COMFYUI_API_URL || 'http://localhost:8188';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    logger.debug('Checking ComfyUI health', { comfyUrl, correlationId });
    
    const response = await fetch(`${comfyUrl}/`, {
      signal: controller.signal,
      method: 'HEAD',
    }).catch(() => null);
    
    clearTimeout(timeoutId);
    
    const isHealthy = response?.ok || false;
    logger.info('ComfyUI health check completed', { 
      comfyUrl, 
      isHealthy, 
      status: response?.status,
      correlationId 
    });
    
    return isHealthy;
  } catch (error) {
    logger.error('ComfyUI health check failed', error, { correlationId });
    return false;
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const correlationId = getCurrentCorrelationId();
  
  logger.info('Health check started', { correlationId });
  
  // Perform health checks
  const [ollamaHealthy, comfyUIHealthy] = await Promise.all([
    checkOllama(),
    checkComfyUI(),
  ]);
  
  const allHealthy = ollamaHealthy && comfyUIHealthy;
  const responseTime = Date.now() - startTime;
  
  // Get deployment environment info for blue-green deployment
  const deploymentEnvironment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown';
  const memoryUsage = process.memoryUsage();
  const isReady = allHealthy && responseTime < 10000; // Ready if healthy and responsive
  
  const healthStatus = {
    status: allHealthy ? 'healthy' : 'degraded',
    ready: isReady,
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    correlationId,
    version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    deployment: {
      environment: deploymentEnvironment,
      instance_id: process.env.HOSTNAME || 'unknown',
      started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    },
    checks: {
      ollama: {
        status: ollamaHealthy ? 'healthy' : 'unhealthy',
        endpoint: process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434',
      },
      comfyui: {
        status: comfyUIHealthy ? 'healthy' : 'unhealthy',
        endpoint: process.env.COMFYUI_API_URL || 'http://localhost:8188',
      },
      memory: {
        status: memoryUsage.heapUsed / memoryUsage.heapTotal < 0.9 ? 'healthy' : 'warning',
        usage: {
          used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        },
      },
      uptime: {
        status: 'healthy',
        seconds: Math.round(process.uptime()),
        human_readable: formatUptime(process.uptime()),
      },
    },
  };
  
  logger.info('Health check completed', { 
    correlationId,
    allHealthy,
    responseTime,
    ollamaHealthy,
    comfyUIHealthy
  });
  
  // Return appropriate status code based on health
  const statusCode = allHealthy ? 200 : 503;
  
  return NextResponse.json(healthStatus, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Environment': deploymentEnvironment,
      'X-Instance-ID': process.env.HOSTNAME || 'unknown',
    },
  });
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

// Support HEAD requests for lighter health checks
export async function HEAD(request: NextRequest) {
  const [ollamaHealthy, comfyUIHealthy] = await Promise.all([
    checkOllama(),
    checkComfyUI(),
  ]);
  
  const allHealthy = ollamaHealthy && comfyUIHealthy;
  const statusCode = allHealthy ? 200 : 503;
  
  return new NextResponse(null, { status: statusCode });
}