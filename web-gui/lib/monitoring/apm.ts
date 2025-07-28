/**
 * APM (Application Performance Monitoring)
 * Simplified monitoring setup for DinoAir
 */

export interface APMConfig {
  serviceName?: string;
  serviceVersion?: string;
  metricsPort?: number;
  metricsEndpoint?: string;
  enableConsoleExporter?: boolean;
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
  timestamp: string;
}

export class APMMonitor {
  private config: APMConfig;
  private isStarted: boolean = false;
  private metrics: Map<string, number> = new Map();

  constructor(config: APMConfig = {}) {
    this.config = {
      serviceName: 'dinoair-web-gui',
      serviceVersion: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
      metricsPort: 9090,
      metricsEndpoint: '/metrics',
      enableConsoleExporter: process.env.NODE_ENV === 'development',
      ...config,
    };
  }

  start(): void {
    if (this.isStarted) {
      return;
    }

    console.log(`APM: Starting monitoring for ${this.config.serviceName}`);
    this.isStarted = true;
  }

  async shutdown(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    console.log('APM: Stopping monitoring');
    this.isStarted = false;
  }

  recordMetric(name: string, value: number): void {
    this.metrics.set(name, value);

    if (this.config.enableConsoleExporter) {
      console.log(`APM Metric: ${name} = ${value}`);
    }
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  collectPerformanceMetrics(): PerformanceMetrics {
    const memoryUsage =
      typeof process !== 'undefined'
        ? process.memoryUsage()
        : { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 };

    const cpuUsage = typeof process !== 'undefined' ? process.cpuUsage() : { user: 0, system: 0 };

    const uptime = typeof process !== 'undefined' ? process.uptime() : 0;

    return {
      responseTime: 0,
      memoryUsage,
      cpuUsage,
      uptime,
      timestamp: new Date().toISOString(),
    };
  }

  startSpan(name: string): { end: () => void } {
    const startTime = Date.now();
    return {
      end: () => {
        const duration = Date.now() - startTime;
        this.recordMetric(`span.${name}.duration`, duration);
      },
    };
  }

  getStatus(): { isStarted: boolean; config: APMConfig } {
    return {
      isStarted: this.isStarted,
      config: this.config,
    };
  }
}

let apmInstance: APMMonitor | null = null;

export function getAPMInstance(config?: APMConfig): APMMonitor {
  if (!apmInstance) {
    apmInstance = new APMMonitor(config);
  }
  return apmInstance;
}

export function initializeAPM(config?: APMConfig): APMMonitor {
  const apm = getAPMInstance(config);

  if (process.env.NODE_ENV === 'production' || process.env.DINOAIR_APM_ENABLED === 'true') {
    apm.start();
  }

  return apm;
}
