import { NextRequest, NextResponse } from 'next/server';
import { withApiAuth } from '@/lib/middleware/api-auth';

interface PerformanceMetrics {
  chatResponseTimes: number[];
  apiResponseTimes: number[];
  tokenUsage: {
    total: number;
    byModel: Record<string, number>;
  };
  activeConnections: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage: NodeJS.CpuUsage;
}

// In-memory storage for performance metrics
const performanceMetrics: PerformanceMetrics = {
  chatResponseTimes: [],
  apiResponseTimes: [],
  tokenUsage: {
    total: 0,
    byModel: {},
  },
  activeConnections: 0,
  memoryUsage: {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    rss: 0,
  },
  cpuUsage: {
    user: 0,
    system: 0,
  },
};

// Helper to record metrics
export function recordChatResponseTime(duration: number) {
  performanceMetrics.chatResponseTimes.push(duration);
  // Keep only last 100 entries
  if (performanceMetrics.chatResponseTimes.length > 100) {
    performanceMetrics.chatResponseTimes.shift();
  }
}

export function recordApiResponseTime(duration: number) {
  performanceMetrics.apiResponseTimes.push(duration);
  // Keep only last 100 entries
  if (performanceMetrics.apiResponseTimes.length > 100) {
    performanceMetrics.apiResponseTimes.shift();
  }
}

export function recordTokenUsage(model: string, tokens: number) {
  performanceMetrics.tokenUsage.total += tokens;
  performanceMetrics.tokenUsage.byModel[model] = 
    (performanceMetrics.tokenUsage.byModel[model] || 0) + tokens;
}

export function updateActiveConnections(delta: number) {
  performanceMetrics.activeConnections = Math.max(0, performanceMetrics.activeConnections + delta);
}

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
