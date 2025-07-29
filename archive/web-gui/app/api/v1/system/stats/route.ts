import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/middleware/api-auth';
import { getPerformanceMetrics } from '@/lib/utils/performance-metrics';

function calculateStats(numbers: number[]) {
  if (numbers.length === 0) {
    return { avg: 0, min: 0, max: 0, p50: 0, p95: 0 };
  }
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  
  return { avg, min, max, p50, p95 };
}

async function getSystemStats(_request: NextRequest) {
  try {
    const performanceMetrics = getPerformanceMetrics();
    
    // Update memory usage
    const memUsage = process.memoryUsage();
    performanceMetrics.memoryUsage = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    };
    
    // Update CPU usage
    performanceMetrics.cpuUsage = process.cpuUsage();

    // Calculate statistics
    const chatStats = calculateStats(performanceMetrics.chatResponseTimes);
    const apiStats = calculateStats(performanceMetrics.apiResponseTimes);

    // Get localStorage usage estimate (if available in browser context)
    let storageUsage = {
      used: 0,
      quota: 0,
      percentage: 0,
    };

    const stats = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      performance: {
        chat: {
          responseTimeMs: chatStats,
          totalRequests: performanceMetrics.chatResponseTimes.length,
        },
        api: {
          responseTimeMs: apiStats,
          totalRequests: performanceMetrics.apiResponseTimes.length,
        },
        tokenUsage: performanceMetrics.tokenUsage,
      },
      resources: {
        activeConnections: performanceMetrics.activeConnections,
        memory: {
          heapUsedMB: Math.round(performanceMetrics.memoryUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(performanceMetrics.memoryUsage.heapTotal / 1024 / 1024),
          externalMB: Math.round(performanceMetrics.memoryUsage.external / 1024 / 1024),
          rssMB: Math.round(performanceMetrics.memoryUsage.rss / 1024 / 1024),
        },
        cpu: {
          userMs: performanceMetrics.cpuUsage.user / 1000,
          systemMs: performanceMetrics.cpuUsage.system / 1000,
        },
        storage: storageUsage,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('System stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get system stats' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(getSystemStats);
