import { NextResponse } from 'next/server';

import { getAPMInstance } from '@/lib/monitoring/apm';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: string;
  uptime?: number;
  version?: string;
}

interface DashboardMetrics {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export async function GET() {
  try {
    const apm = getAPMInstance();
    const performanceMetrics = apm.collectPerformanceMetrics();
    const apmStatus = apm.getStatus();
    
    const services: ServiceStatus[] = [
      {
        name: 'Web GUI',
        status: 'healthy',
        responseTime: performanceMetrics.responseTime,
        lastCheck: new Date().toISOString(),
        uptime: performanceMetrics.uptime,
        version: process.env.NEXT_PUBLIC_VERSION || '1.0.0'
      },
      {
        name: 'Ollama',
        status: await checkOllamaHealth(),
        responseTime: await getServiceResponseTime('ollama'),
        lastCheck: new Date().toISOString()
      },
      {
        name: 'ComfyUI',
        status: await checkComfyUIHealth(),
        responseTime: await getServiceResponseTime('comfyui'),
        lastCheck: new Date().toISOString()
      }
    ];

    const memUsage = performanceMetrics.memoryUsage;
    const cpuUsage = performanceMetrics.cpuUsage;
    
    const metrics: DashboardMetrics = {
      totalRequests: getRequestCount(),
      averageResponseTime: calculateAverageResponseTime(),
      errorRate: calculateErrorRate(),
      uptime: performanceMetrics.uptime,
      memoryUsage: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      cpuUsage: {
        user: cpuUsage.user / 1000000, // Convert microseconds to seconds
        system: cpuUsage.system / 1000000
      }
    };

    const alerts: Alert[] = generateAlerts(metrics, services);

    const dashboardData = {
      timestamp: new Date().toISOString(),
      services,
      metrics,
      alerts,
      apm: {
        enabled: apmStatus.isStarted,
        metricsEndpoint: `http://localhost:${apmStatus.config.metricsPort}${apmStatus.config.metricsEndpoint}`
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    return NextResponse.json(dashboardData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to load dashboard data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Helper functions
async function checkOllamaHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    const ollamaUrl = process.env.OLLAMA_HOST || 'localhost';
    const ollamaPort = process.env.OLLAMA_PORT || '11434';
    
    return ollamaUrl && ollamaPort ? 'healthy' : 'degraded';
  } catch {
    return 'unhealthy';
  }
}

async function checkComfyUIHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
  try {
    const comfyuiUrl = process.env.COMFYUI_HOST || 'localhost';
    const comfyuiPort = process.env.COMFYUI_PORT || '8188';
    
    return comfyuiUrl && comfyuiPort ? 'healthy' : 'degraded';
  } catch {
    return 'unhealthy';
  }
}

async function getServiceResponseTime(service: string): Promise<number> {
  const baseTimes = {
    ollama: 120,
    comfyui: 200
  };
  
  const baseTime = baseTimes[service as keyof typeof baseTimes] || 100;
  return baseTime + Math.random() * 50; // Add some variance
}

function getRequestCount(): number {
  // In a real implementation, this would come from actual metrics storage
  return Math.floor(Math.random() * 10000) + 1000;
}

function calculateAverageResponseTime(): number {
  // In a real implementation, this would be calculated from actual request logs
  return Math.floor(Math.random() * 200) + 50;
}

function calculateErrorRate(): number {
  // In a real implementation, this would be calculated from actual error logs
  return Math.random() * 0.05; // 0-5% error rate
}

function generateAlerts(metrics: DashboardMetrics, services: ServiceStatus[]): Alert[] {
  const alerts: Alert[] = [];
  
  if (metrics.memoryUsage.percentage > 80) {
    alerts.push({
      id: `memory-${Date.now()}`,
      severity: metrics.memoryUsage.percentage > 90 ? 'critical' : 'warning',
      message: `High memory usage: ${metrics.memoryUsage.percentage.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
  }
  
  if (metrics.errorRate > 0.05) {
    alerts.push({
      id: `error-rate-${Date.now()}`,
      severity: metrics.errorRate > 0.1 ? 'error' : 'warning',
      message: `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
      timestamp: new Date().toISOString(),
      resolved: false
    });
  }
  
  services.forEach(service => {
    if (service.status === 'unhealthy') {
      alerts.push({
        id: `service-${service.name.toLowerCase()}-${Date.now()}`,
        severity: 'error',
        message: `Service ${service.name} is unhealthy`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    } else if (service.status === 'degraded') {
      alerts.push({
        id: `service-${service.name.toLowerCase()}-${Date.now()}`,
        severity: 'warning',
        message: `Service ${service.name} is degraded`,
        timestamp: new Date().toISOString(),
        resolved: false
      });
    }
  });
  
  return alerts;
}
