import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/middleware/api-auth';

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: string;
  responseTime?: number;
  error?: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    ollama: ServiceHealth;
    comfyui: ServiceHealth;
    webGui: ServiceHealth;
  };
  uptime: number;
}

async function checkOllamaHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    } else {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkComfyUIHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const response = await fetch('http://localhost:8188/system_stats', {
      signal: AbortSignal.timeout(5000),
    });
    
    if (response.ok) {
      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
    } else {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getSystemHealth(request: NextRequest) {
  try {
    // Check all services in parallel
    const [ollamaHealth, comfyuiHealth] = await Promise.all([
      checkOllamaHealth(),
      checkComfyUIHealth(),
    ]);

    const webGuiHealth: ServiceHealth = {
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: 0,
    };

    // Determine overall system status
    const healthyCount = [ollamaHealth, comfyuiHealth, webGuiHealth]
      .filter(s => s.status === 'healthy').length;
    
    let overallStatus: SystemHealth['status'] = 'healthy';
    if (healthyCount === 0) {
      overallStatus = 'unhealthy';
    } else if (healthyCount < 3) {
      overallStatus = 'degraded';
    }

    const health: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        ollama: ollamaHealth,
        comfyui: comfyuiHealth,
        webGui: webGuiHealth,
      },
      uptime: process.uptime(),
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error('System health check error:', error);
    return NextResponse.json(
      { error: 'Failed to check system health' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(getSystemHealth);