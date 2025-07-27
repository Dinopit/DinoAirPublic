import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'starting';
  responseTime: number;
  version?: string | undefined;
  uptime?: number;
  lastCheck: string;
  error?: string;
  dependencies?: string[];
  metrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    errorRate?: number;
    requestCount?: number;
  };
  endpoints?: string[];
}

interface SystemMetrics {
  cpu: {
    usage: NodeJS.CpuUsage;
    loadAverage?: number[];
  };
  memory: {
    used: number;
    total: number;
    external: number;
    rss: number;
    percentage: number;
  };
  network?: {
    activeConnections: number;
  };
  disk?: {
    usage: string;
  };
}

async function performDeepHealthCheck(serviceName: string, url: string, timeout = 10000): Promise<ServiceHealth> {
  const startTime = Date.now();
  const lastCheck = new Date().toISOString();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const endpoints: string[] = [];
    let version: string | undefined;
    let metrics: any = {};
    
    if (serviceName === 'ollama') {
      // Deep check for Ollama
      const [tagsResponse, versionResponse, embedResponse] = await Promise.allSettled([
        fetch(`${url}/api/tags`, { signal: controller.signal }),
        fetch(`${url}/api/version`, { signal: controller.signal }),
        fetch(`${url}/api/embed`, { 
          signal: controller.signal,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'test', input: 'test' })
        })
      ]);
      
      clearTimeout(timeoutId);
      
      if (tagsResponse.status === 'fulfilled' && tagsResponse.value.ok) {
        const models = await tagsResponse.value.json().catch(() => ({}));
        metrics.modelCount = models.models?.length || 0;
        metrics.availableModels = models.models?.map((m: any) => m.name) || [];
        endpoints.push(`${url}/api/tags`);
      }
      
      if (versionResponse.status === 'fulfilled' && versionResponse.value.ok) {
        const versionData = await versionResponse.value.json().catch(() => ({}));
        version = versionData.version;
        endpoints.push(`${url}/api/version`);
      }
      
      // Test embed functionality (basic capability test)
      if (embedResponse.status === 'fulfilled') {
        endpoints.push(`${url}/api/embed`);
        metrics.embedEndpointResponsive = embedResponse.value.status !== 404;
      }
      
    } else if (serviceName === 'comfyui') {
      // Deep check for ComfyUI
      const [rootResponse, systemStatsResponse, historyResponse] = await Promise.allSettled([
        fetch(`${url}/`, { signal: controller.signal, method: 'HEAD' }),
        fetch(`${url}/system_stats`, { signal: controller.signal }),
        fetch(`${url}/history`, { signal: controller.signal })
      ]);
      
      clearTimeout(timeoutId);
      
      if (rootResponse.status === 'fulfilled' && rootResponse.value.ok) {
        endpoints.push(`${url}/`);
      }
      
      if (systemStatsResponse.status === 'fulfilled' && systemStatsResponse.value.ok) {
        const stats = await systemStatsResponse.value.json().catch(() => ({}));
        metrics = { ...metrics, ...stats };
        endpoints.push(`${url}/system_stats`);
      }
      
      if (historyResponse.status === 'fulfilled' && historyResponse.value.ok) {
        endpoints.push(`${url}/history`);
        metrics.historyEndpointResponsive = true;
      }
    }
    
    const responseTime = Date.now() - startTime;
    const hasMainEndpoint = endpoints.length > 0;
    
    return {
      name: serviceName,
      status: hasMainEndpoint ? 'healthy' : 'unhealthy',
      responseTime,
      version,
      lastCheck,
      metrics,
      endpoints,
      dependencies: serviceName === 'comfyui' ? ['python', 'torch'] : 
                   serviceName === 'ollama' ? ['go'] : []
    };
    
  } catch (error: any) {
    return {
      name: serviceName,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck,
      error: error.message || 'Connection failed',
      endpoints: []
    };
  }
}

function getSystemMetrics(): SystemMetrics {
  const memoryUsage = process.memoryUsage();
  const totalMemory = memoryUsage.heapTotal;
  
  return {
    cpu: {
      usage: process.cpuUsage(),
      loadAverage: require('os').loadavg?.() || []
    },
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(totalMemory / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      percentage: Math.round((memoryUsage.heapUsed / totalMemory) * 100)
    },
    network: {
      activeConnections: 0 // Would need additional monitoring for real count
    }
  };
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  // Configuration from environment or defaults
  const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
  const comfyUrl = process.env.COMFYUI_API_URL || 'http://localhost:8188';
  const healthCheckTimeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '10000');
  
  // Perform deep health checks for all services
  const [ollamaHealth, comfyUIHealth] = await Promise.all([
    performDeepHealthCheck('ollama', ollamaUrl, healthCheckTimeout),
    performDeepHealthCheck('comfyui', comfyUrl, healthCheckTimeout)
  ]);
  
  // Add Web GUI health
  const webGuiHealth: ServiceHealth = {
    name: 'web-gui',
    status: 'healthy',
    responseTime: 0,
    version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
    uptime: process.uptime(),
    lastCheck: new Date().toISOString(),
    dependencies: ['next.js', 'react'],
    metrics: {
      cpuUsage: 0, // Would be calculated from process monitoring
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      requestCount: (global as any).requestCount || 0
    },
    endpoints: ['/api/health', '/api/health/aggregated', '/api/v1/system/health']
  };
  
  const services = [webGuiHealth, ollamaHealth, comfyUIHealth];
  
  // Calculate overall system status
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
  
  let overallStatus: string;
  if (unhealthyCount === 0) {
    overallStatus = 'healthy';
  } else if (healthyCount > unhealthyCount) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'unhealthy';
  }
  
  // Get system metrics
  const systemMetrics = getSystemMetrics();
  
  // Calculate response time metrics
  const totalResponseTime = Date.now() - startTime;
  const avgResponseTime = services.reduce((sum, s) => sum + s.responseTime, 0) / services.length;
  
  const aggregatedHealth = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    responseTime: {
      total: `${totalResponseTime}ms`,
      average: `${Math.round(avgResponseTime)}ms`,
      breakdown: services.reduce((acc, s) => {
        acc[s.name] = `${s.responseTime}ms`;
        return acc;
      }, {} as Record<string, string>)
    },
    services: services.reduce((acc, service) => {
      acc[service.name] = service;
      return acc;
    }, {} as Record<string, ServiceHealth>),
    summary: {
      total: services.length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      degraded: services.filter(s => s.status === 'degraded').length,
      uptime: `${Math.round(process.uptime())}s`,
      lastUpdate: new Date().toISOString()
    },
    system: {
      ...systemMetrics,
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      pid: process.pid
    },
    configuration: {
      healthCheckTimeout: `${healthCheckTimeout}ms`,
      endpoints: {
        ollama: ollamaUrl,
        comfyui: comfyUrl
      },
      features: {
        deepHealthChecks: true,
        performanceMetrics: true,
        dependencyTracking: true,
        systemMonitoring: true
      }
    },
    dependencies: {
      critical: services.filter(s => ['ollama', 'comfyui'].includes(s.name))
        .map(s => ({ name: s.name, status: s.status, required: true })),
      optional: []
    }
  };
  
  // Determine HTTP status code
  const statusCode = overallStatus === 'healthy' ? 200 : 
                    overallStatus === 'degraded' ? 200 : 503;
  
  return NextResponse.json(aggregatedHealth, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Check-Version': '2.0.0',
      'X-Overall-Status': overallStatus,
      'X-Response-Time': `${totalResponseTime}ms`,
      'X-Service-Count': services.length.toString(),
      'X-Healthy-Count': healthyCount.toString()
    }
  });
}

export async function HEAD(_request: NextRequest) {
  // Lightweight health check for monitoring systems
  const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';
  const comfyUrl = process.env.COMFYUI_API_URL || 'http://localhost:8188';
  
  const [ollamaOk, comfyOk] = await Promise.allSettled([
    fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) }).then(r => r.ok),
    fetch(`${comfyUrl}/`, { signal: AbortSignal.timeout(5000), method: 'HEAD' }).then(r => r.ok)
  ]);
  
  const ollamaHealthy = ollamaOk.status === 'fulfilled' && ollamaOk.value;
  const comfyHealthy = comfyOk.status === 'fulfilled' && comfyOk.value;
  const overallHealthy = ollamaHealthy && comfyHealthy;
  
  return new NextResponse(null, {
    status: overallHealthy ? 200 : 503,
    headers: {
      'X-Health-Status': overallHealthy ? 'healthy' : 'unhealthy',
      'X-Ollama-Status': ollamaHealthy ? 'healthy' : 'unhealthy',
      'X-ComfyUI-Status': comfyHealthy ? 'healthy' : 'unhealthy',
      'X-Health-Check-Version': '2.0.0'
    }
  });
}
