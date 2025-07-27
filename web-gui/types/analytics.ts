export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface ChatAnalytics {
  totalSessions: number;
  totalMessages: number;
  averageSessionDuration: number;
  averageMessagesPerSession: number;
  responseTimeMetrics: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  popularModels: Array<{
    model: string;
    usage: number;
    percentage: number;
  }>;
  hourlyActivity: TimeSeriesDataPoint[];
  dailyActivity: TimeSeriesDataPoint[];
  weeklyActivity: TimeSeriesDataPoint[];
  monthlyActivity: TimeSeriesDataPoint[];
  errorRate: number;
  successRate: number;
}

export interface SystemAnalytics {
  resourceUtilization: {
    cpu: {
      average: number;
      peak: number;
      trend: TimeSeriesDataPoint[];
    };
    memory: {
      average: number;
      peak: number;
      trend: TimeSeriesDataPoint[];
    };
    disk: {
      usage: number;
      available: number;
      trend: TimeSeriesDataPoint[];
    };
    network: {
      bytesIn: number;
      bytesOut: number;
      trend: TimeSeriesDataPoint[];
    };
  };
  serviceHealth: {
    ollama: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      uptime: number;
      responseTime: number;
      errorRate: number;
    };
    comfyui: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      uptime: number;
      responseTime: number;
      errorRate: number;
    };
    webgui: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      uptime: number;
      responseTime: number;
      errorRate: number;
    };
  };
  performanceMetrics: {
    requestsPerSecond: TimeSeriesDataPoint[];
    averageResponseTime: TimeSeriesDataPoint[];
    errorRateOverTime: TimeSeriesDataPoint[];
    throughput: TimeSeriesDataPoint[];
  };
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  userEngagement: {
    averageSessionsPerUser: number;
    averageSessionDuration: number;
    retentionRate: {
      day1: number;
      day7: number;
      day30: number;
    };
  };
  userBehavior: {
    mostActiveHours: Array<{
      hour: number;
      activity: number;
    }>;
    mostActiveDays: Array<{
      day: string;
      activity: number;
    }>;
    featureUsage: Array<{
      feature: string;
      usage: number;
      percentage: number;
    }>;
  };
  geographicDistribution: Array<{
    region: string;
    users: number;
    percentage: number;
  }>;
}

export interface TrendAnalytics {
  growth: {
    users: {
      current: number;
      previous: number;
      change: number;
      changePercentage: number;
    };
    sessions: {
      current: number;
      previous: number;
      change: number;
      changePercentage: number;
    };
    messages: {
      current: number;
      previous: number;
      change: number;
      changePercentage: number;
    };
  };
  predictions: {
    nextWeekUsers: number;
    nextWeekSessions: number;
    nextWeekMessages: number;
    confidence: number;
  };
  anomalies: Array<{
    type: 'spike' | 'drop' | 'unusual_pattern';
    metric: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    value: number;
    expectedValue: number;
  }>;
  seasonality: {
    hourlyPatterns: TimeSeriesDataPoint[];
    dailyPatterns: TimeSeriesDataPoint[];
    weeklyPatterns: TimeSeriesDataPoint[];
    monthlyPatterns: TimeSeriesDataPoint[];
  };
}

export interface AnalyticsInsight {
  id: string;
  type: 'performance' | 'usage' | 'optimization' | 'alert' | 'trend';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  impact: 'low' | 'medium' | 'high';
  timestamp: string;
  metrics: Record<string, number>;
  actionable: boolean;
}

export interface AnalyticsData {
  timeframe: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: string;
  endDate: string;
  generatedAt: string;
  metrics: {
    chat: ChatAnalytics;
    system: SystemAnalytics;
    user: UserAnalytics;
    trends: TrendAnalytics;
  };
  insights: AnalyticsInsight[];
  summary: {
    totalDataPoints: number;
    dataQuality: number;
    completeness: number;
    lastUpdated: string;
  };
}

export interface AnalyticsFilter {
  timeframe: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  metrics?: Array<'chat' | 'system' | 'user' | 'trends'>;
  granularity?: 'minute' | 'hour' | 'day' | 'week' | 'month';
  includeInsights?: boolean;
  includePredictions?: boolean;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'heatmap';
  title: string;
  data: TimeSeriesDataPoint[] | Array<{ label: string; value: number }>;
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    animation?: boolean;
    legend?: boolean;
    tooltip?: boolean;
    colors?: string[];
    height?: number;
    width?: number;
  };
}

export interface DashboardConfig {
  layout: 'grid' | 'tabs' | 'accordion';
  refreshInterval: number;
  autoRefresh: boolean;
  charts: Array<{
    id: string;
    position: { row: number; col: number; width: number; height: number };
    config: ChartConfig;
  }>;
  filters: AnalyticsFilter;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    density: 'compact' | 'comfortable' | 'spacious';
    showInsights: boolean;
    showPredictions: boolean;
  };
}

export interface AnalyticsExport {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  data: AnalyticsData;
  filename: string;
  generatedAt: string;
  size: number;
}
