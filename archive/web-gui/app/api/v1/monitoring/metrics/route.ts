import { NextRequest, NextResponse } from 'next/server';
import { getAPMInstance } from '@/lib/monitoring/apm';

export async function GET() {
  const startTime = performance.now();
  
  try {
    const apm = getAPMInstance();
    const apmStatus = apm.getStatus();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      service: {
        name: 'dinoair-web-gui',
        version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
      },
      performance: {
        responseTime: performance.now() - startTime,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
      },
      apm: {
        enabled: apmStatus.isStarted,
        metricsPort: apmStatus.config.metricsPort,
        metricsEndpoint: apmStatus.config.metricsEndpoint,
      },
      health: {
        status: 'healthy',
        checks: {
          memory: process.memoryUsage().heapUsed < (1024 * 1024 * 1024), // < 1GB
          uptime: process.uptime() > 0,
        },
      },
    };

    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Failed to collect metrics:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to collect metrics',
        timestamp: new Date().toISOString(),
        service: {
          name: 'dinoair-web-gui',
          status: 'error',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const customMetrics = {
      timestamp: new Date().toISOString(),
      source: 'client',
      metrics: body,
    };

    console.log('Custom metrics received:', customMetrics);

    return NextResponse.json({
      status: 'received',
      timestamp: new Date().toISOString(),
      metricsCount: Object.keys(body).length,
    });
  } catch (error) {
    console.error('Failed to process custom metrics:', error);
    
    return NextResponse.json(
      { error: 'Failed to process custom metrics' },
      { status: 400 }
    );
  }
}
