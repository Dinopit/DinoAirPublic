import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

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
  private sdk: NodeSDK;
  private metricsExporter: PrometheusExporter;
  private config: APMConfig;
  private isStarted: boolean = false;

  constructor(config: APMConfig = {}) {
    this.config = {
      serviceName: 'dinoair-web-gui',
      serviceVersion: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
      metricsPort: 9090,
      metricsEndpoint: '/metrics',
      enableConsoleExporter: process.env.NODE_ENV === 'development',
      ...config,
    };

    this.metricsExporter = new PrometheusExporter({
      port: this.config.metricsPort!,
      endpoint: this.config.metricsEndpoint!,
    });

    this.sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName!,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion!,
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'dinoair',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      }),
      instrumentations: [getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation to reduce noise
        },
      })],
      metricReader: this.metricsExporter,
    });
  }

  start(): void {
    if (this.isStarted) {
      console.warn('APM monitoring is already started');
      return;
    }

    try {
      this.sdk.start();
      this.isStarted = true;
      console.log(`APM monitoring started for ${this.config.serviceName} v${this.config.serviceVersion}`);
      console.log(`Metrics available at http://localhost:${this.config.metricsPort}${this.config.metricsEndpoint}`);
    } catch (error) {
      console.error('Failed to start APM monitoring:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isStarted) {
      console.warn('APM monitoring is not started');
      return;
    }

    try {
      await this.sdk.shutdown();
      this.isStarted = false;
      console.log('APM monitoring shutdown completed');
    } catch (error) {
      console.error('Failed to shutdown APM monitoring:', error);
      throw error;
    }
  }

  collectPerformanceMetrics(): PerformanceMetrics {
    const startTime = process.hrtime.bigint();
    
    const metrics: PerformanceMetrics = {
      responseTime: Number(process.hrtime.bigint() - startTime) / 1000000, // Convert to milliseconds
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    return metrics;
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

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down APM monitoring...');
    await apm.shutdown();
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down APM monitoring...');
    await apm.shutdown();
  });

  return apm;
}
