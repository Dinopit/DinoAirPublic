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
    byModel: {}
  },
  activeConnections: 0,
  memoryUsage: {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    rss: 0
  },
  cpuUsage: {
    user: 0,
    system: 0
  }
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

export function getPerformanceMetrics(): PerformanceMetrics {
  return performanceMetrics;
}
