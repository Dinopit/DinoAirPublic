let NodeSDK, getNodeAutoInstrumentations, Resource, SemanticResourceAttributes;
let OTLPTraceExporter, OTLPMetricExporter, PeriodicExportingMetricReader;
let trace, metrics, context, uuidv4;
let apmAvailable = false;

try {
  ({ NodeSDK } = require('@opentelemetry/sdk-node'));
  ({ getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node'));
  ({ Resource } = require('@opentelemetry/resources'));
  ({ SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions'));
  ({ OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http'));
  ({ OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http'));
  ({ PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics'));
  ({ trace, metrics, context } = require('@opentelemetry/api'));
  ({ v4: uuidv4 } = require('uuid'));
  apmAvailable = true;
  console.log('✅ APM monitoring dependencies loaded successfully');
} catch (error) {
  console.warn('⚠️  APM monitoring dependencies not available, running without telemetry:', error.message);
  apmAvailable = false;
  uuidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class APMManager {
  constructor() {
    this.sdk = null;
    this.tracer = null;
    this.meter = null;
    this.isInitialized = false;
    this.correlationIds = new Map();
    
    this.metrics = {
      requestDuration: null,
      requestCount: null,
      errorCount: null,
      memoryUsage: null,
      cpuUsage: null,
      activeConnections: null
    };
  }

  initialize(config = {}) {
    if (this.isInitialized) {
      return;
    }

    if (!apmAvailable) {
      console.log('📊 APM monitoring skipped - dependencies not available');
      return;
    }

    const serviceName = config.serviceName || 'dinoair-web-gui-node';
    const serviceVersion = config.serviceVersion || '1.0.0';
    const environment = config.environment || process.env.NODE_ENV || 'development';

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    });

    const traceExporter = new OTLPTraceExporter({
      url: config.traceEndpoint || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
    });

    const metricExporter = new OTLPMetricExporter({
      url: config.metricEndpoint || process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
    });

    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: config.metricExportInterval || 30000,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              const correlationId = this.getCorrelationId(request);
              if (correlationId) {
                span.setAttributes({
                  'correlation.id': correlationId,
                  'http.route': request.url,
                });
              }
            },
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
        }),
      ],
    });

    try {
      this.sdk.start();
      this.tracer = trace.getTracer(serviceName, serviceVersion);
      this.meter = metrics.getMeter(serviceName, serviceVersion);
      this.initializeMetrics();
      this.isInitialized = true;
      console.log('APM monitoring initialized successfully');
    } catch (error) {
      console.error('Failed to initialize APM monitoring:', error);
    }
  }

  initializeMetrics() {
    this.metrics.requestDuration = this.meter.createHistogram('http_request_duration_ms', {
      description: 'Duration of HTTP requests in milliseconds',
      unit: 'ms',
    });

    this.metrics.requestCount = this.meter.createCounter('http_requests_total', {
      description: 'Total number of HTTP requests',
    });

    this.metrics.errorCount = this.meter.createCounter('http_errors_total', {
      description: 'Total number of HTTP errors',
    });

    this.metrics.memoryUsage = this.meter.createObservableGauge('process_memory_usage_bytes', {
      description: 'Process memory usage in bytes',
      unit: 'bytes',
    });

    this.metrics.cpuUsage = this.meter.createObservableGauge('process_cpu_usage_percent', {
      description: 'Process CPU usage percentage',
      unit: 'percent',
    });

    this.metrics.activeConnections = this.meter.createObservableGauge('active_connections_total', {
      description: 'Number of active connections',
    });

    this.metrics.memoryUsage.addCallback((result) => {
      const memUsage = process.memoryUsage();
      result.observe(memUsage.heapUsed, { type: 'heap_used' });
      result.observe(memUsage.heapTotal, { type: 'heap_total' });
      result.observe(memUsage.rss, { type: 'rss' });
      result.observe(memUsage.external, { type: 'external' });
    });

    this.metrics.cpuUsage.addCallback((result) => {
      const cpuUsage = process.cpuUsage();
      result.observe(cpuUsage.user / 1000, { type: 'user' });
      result.observe(cpuUsage.system / 1000, { type: 'system' });
    });
  }

  generateCorrelationId() {
    return uuidv4();
  }

  setCorrelationId(req, correlationId) {
    if (!correlationId) {
      correlationId = this.generateCorrelationId();
    }
    req.correlationId = correlationId;
    this.correlationIds.set(req, correlationId);
    return correlationId;
  }

  getCorrelationId(req) {
    return req.correlationId || this.correlationIds.get(req);
  }

  createSpan(name, options = {}) {
    if (!this.tracer) {
      return null;
    }
    return this.tracer.startSpan(name, options);
  }

  recordMetric(metricName, value, attributes = {}) {
    if (!this.metrics[metricName]) {
      return;
    }

    if (this.metrics[metricName].add) {
      this.metrics[metricName].add(value, attributes);
    } else if (this.metrics[metricName].record) {
      this.metrics[metricName].record(value, attributes);
    }
  }

  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const correlationId = req.headers['x-correlation-id'] || this.generateCorrelationId();
      
      this.setCorrelationId(req, correlationId);
      res.setHeader('x-correlation-id', correlationId);

      const span = this.createSpan(`${req.method} ${req.route?.path || req.path}`, {
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.route': req.route?.path || req.path,
          'correlation.id': correlationId,
          'user.agent': req.headers['user-agent'],
        },
      });

      if (span) {
        context.with(trace.setSpan(context.active(), span), () => {
          res.on('finish', () => {
            const duration = Date.now() - startTime;
            
            span.setAttributes({
              'http.status_code': res.statusCode,
              'http.response_size': res.get('content-length') || 0,
            });

            if (res.statusCode >= 400) {
              span.recordException(new Error(`HTTP ${res.statusCode}`));
              this.recordMetric('errorCount', 1, {
                method: req.method,
                route: req.route?.path || req.path,
                status_code: res.statusCode.toString(),
              });
            }

            this.recordMetric('requestDuration', duration, {
              method: req.method,
              route: req.route?.path || req.path,
              status_code: res.statusCode.toString(),
            });

            this.recordMetric('requestCount', 1, {
              method: req.method,
              route: req.route?.path || req.path,
              status_code: res.statusCode.toString(),
            });

            span.end();
          });

          next();
        });
      } else {
        next();
      }
    };
  }

  getPerformanceMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        userMs: Math.round(cpuUsage.user / 1000),
        systemMs: Math.round(cpuUsage.system / 1000),
      },
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }

  async shutdown() {
    if (this.sdk && this.isInitialized) {
      try {
        await this.sdk.shutdown();
        this.isInitialized = false;
        console.log('APM monitoring shutdown successfully');
      } catch (error) {
        console.error('Error shutting down APM monitoring:', error);
      }
    }
  }
}

const apmManager = new APMManager();

module.exports = {
  APMManager,
  apmManager,
  initialize: (config) => apmManager.initialize(config),
  middleware: () => apmManager.middleware(),
  createSpan: (name, options) => apmManager.createSpan(name, options),
  recordMetric: (metricName, value, attributes) => apmManager.recordMetric(metricName, value, attributes),
  getPerformanceMetrics: () => apmManager.getPerformanceMetrics(),
  getCorrelationId: (req) => apmManager.getCorrelationId(req),
  setCorrelationId: (req, correlationId) => apmManager.setCorrelationId(req, correlationId),
  shutdown: () => apmManager.shutdown(),
};
