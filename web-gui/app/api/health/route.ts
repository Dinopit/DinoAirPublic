import { NextRequest, NextResponse } from 'next/server';

interface ServiceHealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  version?: string;
  details?: any;
  error?: string;
}

async function checkOllama(): Promise<ServiceHealthCheck> {
  const startTime = Date.now();
  try {
    // Check if Ollama is responsive
    const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Check multiple endpoints for deep health verification
    const [tagsResponse, versionResponse] = await Promise.allSettled([
      fetch(`${ollamaUrl}/api/tags`, {
        signal: controller.signal,
        method: 'GET',
      }),
      fetch(`${ollamaUrl}/api/version`, {
        signal: controller.signal,
        method: 'GET',
      })
    ]);
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (tagsResponse.status === 'fulfilled' && tagsResponse.value?.ok) {
      const models = await tagsResponse.value.json().catch(() => ({}));
      let version = undefined;
      
      if (versionResponse.status === 'fulfilled' && versionResponse.value?.ok) {
        const versionData = await versionResponse.value.json().catch(() => ({}));
        version = versionData.version;
      }
      
      return {
        status: 'healthy',
        responseTime,
        version,
        details: {
          models: models.models || [],
          modelCount: models.models?.length || 0,
          endpoint: ollamaUrl
        }
      };
    } else {
      const error = tagsResponse.status === 'rejected' ? 
        tagsResponse.reason?.message : 
        `HTTP ${tagsResponse.value?.status}`;
      
      return {
        status: 'unhealthy',
        responseTime,
        error,
        details: { endpoint: ollamaUrl }
      };
    }
  } catch (error: any) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message || 'Connection failed',
      details: { endpoint: process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434' }
    };
  }
}

async function checkComfyUI(): Promise<ServiceHealthCheck> {
  const startTime = Date.now();
  try {
    // Check if ComfyUI backend is responsive
    const comfyUrl = process.env.COMFYUI_API_URL || 'http://localhost:8188';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Check multiple endpoints for deep health verification
    const [healthResponse, systemStatsResponse] = await Promise.allSettled([
      fetch(`${comfyUrl}/`, {
        signal: controller.signal,
        method: 'HEAD',
      }),
      fetch(`${comfyUrl}/system_stats`, {
        signal: controller.signal,
        method: 'GET',
      })
    ]);
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (healthResponse.status === 'fulfilled' && healthResponse.value?.ok) {
      let systemStats = undefined;
      
      if (systemStatsResponse.status === 'fulfilled' && systemStatsResponse.value?.ok) {
        systemStats = await systemStatsResponse.value.json().catch(() => ({}));
      }
      
      return {
        status: 'healthy',
        responseTime,
        details: {
          endpoint: comfyUrl,
          systemStats: systemStats || {},
          hasSystemStats: !!systemStats
        }
      };
    } else {
      const error = healthResponse.status === 'rejected' ? 
        healthResponse.reason?.message : 
        `HTTP ${healthResponse.value?.status}`;
      
      return {
        status: 'unhealthy',
        responseTime,
        error,
        details: { endpoint: comfyUrl }
      };
    }
  } catch (error: any) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message || 'Connection failed',
      details: { endpoint: process.env.COMFYUI_API_URL || 'http://localhost:8188' }
    };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Perform comprehensive health checks
  const [ollamaHealth, comfyUIHealth] = await Promise.all([
    checkOllama(),
    checkComfyUI(),
  ]);
  
  // Calculate overall system health
  const allHealthy = ollamaHealth.status === 'healthy' && comfyUIHealth.status === 'healthy';
  const anyUnhealthy = ollamaHealth.status === 'unhealthy' || comfyUIHealth.status === 'unhealthy';
  
  const overallStatus = allHealthy ? 'healthy' : anyUnhealthy ? 'degraded' : 'degraded';
  const totalResponseTime = Date.now() - startTime;
  
  // Get system information
  const memoryUsage = process.memoryUsage();
  const systemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: process.uptime(),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024)
    },
    cpuUsage: process.cpuUsage()
  };
  
  // Get deployment environment info for blue-green deployment
  const deploymentEnvironment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown';
  const isReady = allHealthy && totalResponseTime < 10000; // Ready if healthy and responsive
  
  const healthStatus = {
    status: overallStatus,
    ready: isReady,
    timestamp: new Date().toISOString(),
    responseTime: `${totalResponseTime}ms`,
    version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    deployment: {
      environment: deploymentEnvironment,
      instance_id: process.env.HOSTNAME || 'unknown',
      started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    },
    system: systemInfo,
    checks: {
      webGui: {
        status: 'healthy',
        responseTime: 0,
        version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
        details: {
          framework: 'Next.js',
          deployment: process.env.VERCEL ? 'Vercel' : 'Local'
        }
      },
      ollama: {
        status: ollamaHealth.status,
        responseTime: ollamaHealth.responseTime,
        version: ollamaHealth.version,
        details: ollamaHealth.details,
        error: ollamaHealth.error
      },
      comfyui: {
        status: comfyUIHealth.status,
        responseTime: comfyUIHealth.responseTime,
        details: comfyUIHealth.details,
        error: comfyUIHealth.error
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
      }
    },
    dependencies: {
      ollama: {
        required: true,
        status: ollamaHealth.status,
        criticalForOperation: true
      },
      comfyui: {
        required: true,
        status: comfyUIHealth.status,
        criticalForOperation: true
      }
    },
    performance: {
      totalResponseTime: `${totalResponseTime}ms`,
      individualChecks: {
        ollama: `${ollamaHealth.responseTime}ms`,
        comfyui: `${comfyUIHealth.responseTime}ms`
      }
    }
  };
  
  // Return appropriate status code based on health
  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  
  return NextResponse.json(healthStatus, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Environment': deploymentEnvironment,
      'X-Instance-ID': process.env.HOSTNAME || 'unknown',
      'X-Health-Check-Version': '2.0.0',
      'X-Response-Time': `${totalResponseTime}ms`
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
  const [ollamaHealth, comfyUIHealth] = await Promise.all([
    checkOllama(),
    checkComfyUI(),
  ]);
  
  const allHealthy = ollamaHealth.status === 'healthy' && comfyUIHealth.status === 'healthy';
  const statusCode = allHealthy ? 200 : 503;
  
  return new NextResponse(null, { 
    status: statusCode,
    headers: {
      'X-Health-Status': allHealthy ? 'healthy' : 'unhealthy',
      'X-Health-Check-Version': '2.0.0'
    }
  });
}
