/**
 * DinoAir Health Monitoring System for Web GUI
 * Client-side health monitoring and service status tracking with APM integration
 */

import { getAPMInstance, PerformanceMetrics } from '@/lib/monitoring/apm';

export interface EnhancedPerformanceMetrics extends PerformanceMetrics {
  healthMetrics?: {
    servicesCount: number;
    healthyServices: number;
    unhealthyServices: number;
    averageResponseTime: number;
    totalConsecutiveFailures: number;
    recentEventsCount: number;
  };
}

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  STARTING = 'starting',
  STOPPING = 'stopping',
  STOPPED = 'stopped'
}

export interface ServiceHealth {
  name: string;
  status: ServiceStatus;
  uptime?: string | undefined;
  consecutiveFailures: number;
  restartAttempts: number;
  cpuUsage: number;
  memoryUsageMb: number;
  lastCheck?: string | undefined;
  lastMessage?: string | undefined;
  responseTime?: number | undefined;
}

export interface HealthReport {
  overallStatus: ServiceStatus;
  timestamp: string;
  services: Record<string, ServiceHealth>;
  recentEvents: HealthEvent[];
}

export interface HealthEvent {
  service: string;
  status: ServiceStatus;
  message: string;
  timestamp: string;
}

export interface HealthCheckConfig {
  url: string;
  interval?: number; // ms
  timeout?: number; // ms
  retries?: number;
}

export class HealthMonitor {
  private services: Map<string, ServiceHealth> = new Map();
  private checkIntervals: Map<string, number> = new Map();
  private eventHistory: HealthEvent[] = [];
  private maxHistorySize = 50;
  
  // Callbacks
  public onServiceStatusChange?: (service: string, oldStatus: ServiceStatus, newStatus: ServiceStatus) => void;
  public onOverallStatusChange?: (oldStatus: ServiceStatus, newStatus: ServiceStatus) => void;
  public onHealthUpdate?: (report: HealthReport) => void;
  
  constructor(private config: Record<string, HealthCheckConfig>) {}
  
  /**
   * Start health monitoring
   */
  start(): void {
    Object.entries(this.config).forEach(([serviceName, config]) => {
      // Initialize service health
      this.services.set(serviceName, {
        name: serviceName,
        status: ServiceStatus.STARTING,
        consecutiveFailures: 0,
        restartAttempts: 0,
        cpuUsage: 0,
        memoryUsageMb: 0
      });
      
      // Start periodic health checks
      const interval = setInterval(
        () => this.checkService(serviceName, config),
        config.interval || 30000
      ) as unknown as number;
      
      this.checkIntervals.set(serviceName, interval);
      
      // Perform initial check
      this.checkService(serviceName, config);
    });
  }
  
  /**
   * Stop health monitoring
   */
  stop(): void {
    this.checkIntervals.forEach(interval => clearInterval(interval));
    this.checkIntervals.clear();
  }
  
  /**
   * Perform health check for a service
   */
  private async checkService(serviceName: string, config: HealthCheckConfig): Promise<void> {
    const startTime = Date.now();
    const service = this.services.get(serviceName);
    if (!service) return;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 10000);
      
      const response = await fetch(config.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        // Parse health data if available
        let healthData: any = {};
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            healthData = await response.json();
          }
        } catch {
          // Ignore JSON parse errors
        }
        
        this.updateServiceHealth(serviceName, {
          status: ServiceStatus.HEALTHY,
          message: 'Service is healthy',
          responseTime,
          healthData
        });
      } else {
        this.updateServiceHealth(serviceName, {
          status: ServiceStatus.UNHEALTHY,
          message: `HTTP ${response.status}`,
          responseTime,
          error: `Unexpected status code: ${response.status}`
        });
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        this.updateServiceHealth(serviceName, {
          status: ServiceStatus.UNHEALTHY,
          message: 'Request timeout',
          responseTime,
          error: `Timeout after ${config.timeout || 10000}ms`
        });
      } else {
        this.updateServiceHealth(serviceName, {
          status: ServiceStatus.UNHEALTHY,
          message: 'Connection failed',
          responseTime,
          error: error.message || 'Service unreachable'
        });
      }
    }
  }
  
  /**
   * Update service health information
   */
  private updateServiceHealth(
    serviceName: string,
    result: {
      status: ServiceStatus;
      message: string;
      responseTime?: number;
      error?: string;
      healthData?: any;
    }
  ): void {
    const service = this.services.get(serviceName);
    if (!service) return;
    
    const oldStatus = service.status;
    
    // Update service info
    service.status = result.status;
    service.lastCheck = new Date().toISOString();
    service.lastMessage = result.message;
    service.responseTime = result.responseTime;
    
    // Update consecutive failures
    if (result.status === ServiceStatus.UNHEALTHY) {
      service.consecutiveFailures++;
    } else {
      service.consecutiveFailures = 0;
    }
    
    // Update resource usage if provided
    if (result.healthData) {
      service.cpuUsage = result.healthData.cpuUsage || 0;
      service.memoryUsageMb = result.healthData.memoryUsageMb || 0;
      service.uptime = result.healthData.uptime;
    }
    
    // Add to event history
    const event: HealthEvent = {
      service: serviceName,
      status: result.status,
      message: result.message,
      timestamp: new Date().toISOString()
    };
    
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
    
    // Trigger callbacks
    if (oldStatus !== result.status && this.onServiceStatusChange) {
      this.onServiceStatusChange(serviceName, oldStatus, result.status);
    }
    
    // Check overall status change
    const oldOverallStatus = this.getOverallStatus(oldStatus, serviceName);
    const newOverallStatus = this.getOverallStatus();
    
    if (oldOverallStatus !== newOverallStatus && this.onOverallStatusChange) {
      this.onOverallStatusChange(oldOverallStatus, newOverallStatus);
    }
    
    // Trigger health update
    if (this.onHealthUpdate) {
      this.onHealthUpdate(this.getHealthReport());
    }
  }
  
  /**
   * Get overall system health status
   */
  getOverallStatus(overrideStatus?: ServiceStatus, overrideService?: string): ServiceStatus {
    const statuses = Array.from(this.services.values()).map(service => {
      if (service.name === overrideService && overrideStatus) {
        return overrideStatus;
      }
      return service.status;
    });
    
    if (statuses.length === 0) {
      return ServiceStatus.STOPPED;
    }
    
    if (statuses.every(s => s === ServiceStatus.HEALTHY)) {
      return ServiceStatus.HEALTHY;
    } else if (statuses.some(s => s === ServiceStatus.UNHEALTHY)) {
      return ServiceStatus.UNHEALTHY;
    } else if (statuses.some(s => s === ServiceStatus.DEGRADED)) {
      return ServiceStatus.DEGRADED;
    } else if (statuses.some(s => s === ServiceStatus.STARTING)) {
      return ServiceStatus.STARTING;
    } else {
      return ServiceStatus.STOPPED;
    }
  }
  
  /**
   * Get health report
   */
  getHealthReport(): HealthReport {
    const services: Record<string, ServiceHealth> = {};
    
    this.services.forEach((service, name) => {
      services[name] = { ...service };
    });
    
    return {
      overallStatus: this.getOverallStatus(),
      timestamp: new Date().toISOString(),
      services,
      recentEvents: [...this.eventHistory].slice(-10) // Last 10 events
    };
  }
  
  /**
   * Get service health
   */
  getServiceHealth(serviceName: string): ServiceHealth | undefined {
    return this.services.get(serviceName);
  }
  
  /**
   * Force check all services
   */
  async checkAll(): Promise<void> {
    const promises = Object.entries(this.config).map(([serviceName, config]) =>
      this.checkService(serviceName, config)
    );
    
    await Promise.all(promises);
  }

  /**
   * Collect comprehensive performance metrics for APM integration
   */
  collectPerformanceMetrics(): EnhancedPerformanceMetrics {
    const startTime = performance.now();
    
    const apm = getAPMInstance();
    const apmMetrics = apm.collectPerformanceMetrics();
    
    const healthMetrics = {
      servicesCount: this.services.size,
      healthyServices: Array.from(this.services.values()).filter(s => s.status === ServiceStatus.HEALTHY).length,
      unhealthyServices: Array.from(this.services.values()).filter(s => s.status === ServiceStatus.UNHEALTHY).length,
      averageResponseTime: this.calculateAverageResponseTime(),
      totalConsecutiveFailures: Array.from(this.services.values()).reduce((sum, s) => sum + s.consecutiveFailures, 0),
      recentEventsCount: this.eventHistory.length,
    };
    
    return {
      responseTime: performance.now() - startTime,
      memoryUsage: apmMetrics.memoryUsage,
      cpuUsage: apmMetrics.cpuUsage,
      uptime: apmMetrics.uptime,
      timestamp: new Date().toISOString(),
      healthMetrics,
    };
  }

  /**
   * Calculate average response time across all services
   */
  private calculateAverageResponseTime(): number {
    const services = Array.from(this.services.values());
    const responseTimes = services
      .map(s => s.responseTime)
      .filter((time): time is number => time !== undefined);
    
    if (responseTimes.length === 0) return 0;
    
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  /**
   * Get enhanced health report with APM metrics
   */
  getEnhancedHealthReport(): HealthReport & { performanceMetrics: EnhancedPerformanceMetrics } {
    const baseReport = this.getHealthReport();
    const performanceMetrics = this.collectPerformanceMetrics();
    
    return {
      ...baseReport,
      performanceMetrics,
    };
  }
}

/**
 * Default health check configurations for DinoAir services
 */
export const defaultHealthConfig: Record<string, HealthCheckConfig> = {
  comfyui: {
    url: '/api/proxy/comfyui/system_stats',
    interval: 30000,
    timeout: 10000,
    retries: 3
  },
  ollama: {
    url: '/api/proxy/ollama/api/tags',
    interval: 30000,
    timeout: 10000,
    retries: 3
  },
  'web-api': {
    url: '/api/health',
    interval: 20000,
    timeout: 5000,
    retries: 2
  }
};
