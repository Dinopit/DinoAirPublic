/**
 * Health API Routes
 * System health monitoring and diagnostics with comprehensive service checks
 */

const express = require('express');
const fetch = require('node-fetch');
// const { resourceManager } = require('../../lib/resource-manager');
const { rateLimits } = require('../../middleware/validation');
const { ollamaBreaker, comfyuiBreaker } = require('../../lib/circuit-breaker');
const { withRetry, isRetryableError } = require('../../lib/retry');
const { getPerformanceMetrics, createSpan, getCorrelationId } = require('../../lib/apm');
const { AlertingManager } = require('../../lib/alerting');
const router = express.Router();

// Configuration
const CONFIG = {
  healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10) || 10000,
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  comfyuiUrl: process.env.COMFYUI_URL || 'http://localhost:8188',
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL, 10) || 30000,
  version: '2.0.0'
};

// Health check cache to avoid excessive requests
const healthCache = new Map();
const CACHE_TTL = 5000; // 5 seconds

const alertingManager = new AlertingManager();

async function performDeepServiceCheck(serviceName, baseUrl, timeout = CONFIG.healthCheckTimeout) {
  const startTime = Date.now();
  const cacheKey = `${serviceName}-${Date.now() % CACHE_TTL}`;

  // Check cache first
  if (healthCache.has(cacheKey)) {
    return healthCache.get(cacheKey);
  }

  try {
    const endpoints = [];
    const version = undefined;
    const metrics = {};
    const error = null;

    if (serviceName === 'ollama') {
      // Deep Ollama health check
      const [tagsRes, versionRes, embedRes] = await Promise.allSettled([
        fetch(`${baseUrl}/api/tags`, { timeout }),
        fetch(`${baseUrl}/api/version`, { timeout }),
        fetch(`${baseUrl}/api/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'test', input: 'test' }),
          timeout: timeout / 2 // Shorter timeout for functionality test
        })
      ]);

      if (tagsRes.status === 'fulfilled' && tagsRes.value.ok) {
        const models = await tagsRes.value.json().catch(() => ({}));
        metrics.modelCount = models.models?.length || 0;
        metrics.availableModels = models.models?.map(m => m.name) || [];
        endpoints.push(`${baseUrl}/api/tags`);
      }

      if (versionRes.status === 'fulfilled' && versionRes.value.ok) {
        const versionData = await versionRes.value.json().catch(() => ({}));
        const { version: _version } = versionData;
        endpoints.push(`${baseUrl}/api/version`);
      }

      if (embedRes.status === 'fulfilled') {
        metrics.embedEndpointAvailable = embedRes.value.status !== 404;
        if (embedRes.value.ok || embedRes.value.status === 400) {
          endpoints.push(`${baseUrl}/api/embed`);
        }
      }
    } else if (serviceName === 'comfyui') {
      // Deep ComfyUI health check
      const [rootRes, systemStatsRes, historyRes, queueRes] = await Promise.allSettled([
        fetch(`${baseUrl}/`, { method: 'HEAD', timeout }),
        fetch(`${baseUrl}/system_stats`, { timeout }),
        fetch(`${baseUrl}/history`, { timeout }),
        fetch(`${baseUrl}/queue`, { timeout })
      ]);

      if (rootRes.status === 'fulfilled' && rootRes.value.ok) {
        endpoints.push(`${baseUrl}/`);
      }

      if (systemStatsRes.status === 'fulfilled' && systemStatsRes.value.ok) {
        const stats = await systemStatsRes.value.json().catch(() => ({}));
        metrics.systemStats = stats;
        endpoints.push(`${baseUrl}/system_stats`);
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
        endpoints.push(`${baseUrl}/history`);
        metrics.historyAvailable = true;
      }

      if (queueRes.status === 'fulfilled' && queueRes.value.ok) {
        const queueData = await queueRes.value.json().catch(() => ({}));
        metrics.queueInfo = queueData;
        endpoints.push(`${baseUrl}/queue`);
      }
    }

    const responseTime = Date.now() - startTime;
    const isHealthy = endpoints.length > 0;

    const result = {
      name: serviceName,
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTime,
      version,
      lastCheck: new Date().toISOString(),
      endpoints,
      metrics,
      error,
      dependencies:
        serviceName === 'comfyui' ? ['python', 'torch', 'cuda'] : serviceName === 'ollama' ? ['go', 'cpu/gpu'] : []
    };

    // Cache the result
    healthCache.set(cacheKey, result);
    setTimeout(() => healthCache.delete(cacheKey), CACHE_TTL);

    return result;
  } catch (error) {
    const result = {
      name: serviceName,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString(),
      error: error.message,
      endpoints: [],
      metrics: {}
    };

    // Cache error result too (shorter TTL)
    healthCache.set(cacheKey, result);
    setTimeout(() => healthCache.delete(cacheKey), CACHE_TTL / 2);

    return result;
  }
}

// GET /api/health - Enhanced main health check endpoint
router.get('/', rateLimits.api, async (req, res) => {
  const startTime = Date.now();
  const correlationId = getCorrelationId(req);
  const span = createSpan('health_check_main', {
    attributes: {
      'correlation.id': correlationId,
      'health.check.type': 'main'
    }
  });

  try {
    // Perform deep health checks
    const [ollamaHealth, comfyuiHealth] = await Promise.all([
      performDeepServiceCheck('ollama', CONFIG.ollamaUrl),
      performDeepServiceCheck('comfyui', CONFIG.comfyuiUrl)
    ]);

    // Web GUI health (current service)
    const webGuiHealth = {
      name: 'web-gui-node',
      status: 'healthy',
      responseTime: 0,
      version: require('../../package.json').version,
      uptime: process.uptime(),
      lastCheck: new Date().toISOString(),
      endpoints: ['/api/health', '/api/health/detailed', '/api/health/ping'],
      metrics: {
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        cpuUsage: process.cpuUsage(),
        requestCount: global.requestCount || 0
      },
      dependencies: ['express', 'node.js']
    };

    const services = [webGuiHealth, ollamaHealth, comfyuiHealth];

    // Calculate overall status
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;

    let overallStatus;
    if (unhealthyCount === 0) {
      overallStatus = 'healthy';
    } else if (healthyCount > unhealthyCount) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const totalResponseTime = Date.now() - startTime;
    const performanceMetrics = getPerformanceMetrics();

    const health = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      correlationId,
      version: CONFIG.version,
      uptime: process.uptime(),
      responseTime: {
        total: `${totalResponseTime}ms`,
        breakdown: services.reduce((acc, s) => {
          acc[s.name] = `${s.responseTime}ms`;
          return acc;
        }, {})
      },
      services: services.reduce((acc, service) => {
        acc[service.name] = service;
        return acc;
      }, {}),
      summary: {
        total: services.length,
        healthy: healthyCount,
        unhealthy: unhealthyCount,
        criticalServicesHealthy: ollamaHealth.status === 'healthy' && comfyuiHealth.status === 'healthy'
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        cpu: {
          usage: process.cpuUsage(),
          loadAverage: require('os').loadavg()
        }
      },
      configuration: {
        healthCheckTimeout: `${CONFIG.healthCheckTimeout}ms`,
        healthCheckInterval: `${CONFIG.healthCheckInterval}ms`,
        endpoints: {
          ollama: CONFIG.ollamaUrl,
          comfyui: CONFIG.comfyuiUrl
        }
      },
      performance: performanceMetrics
    };

    // Check for Socket.io (if available)
    if (req.io) {
      const socketCount = req.io.engine.clientsCount || 0;
      health.services.websocket = {
        name: 'websocket',
        status: 'healthy',
        responseTime: 0,
        connectedClients: socketCount,
        lastCheck: new Date().toISOString()
      };
    }

    if (span) {
      span.setAttributes({
        'health.check.status': overallStatus,
        'health.check.response_time_ms': totalResponseTime,
        'health.services.ollama.status': ollamaHealth.status,
        'health.services.comfyui.status': comfyuiHealth.status
      });
      span.end();
    }

    // Check for critical alerts
    if (overallStatus === 'unhealthy') {
      alertingManager.sendAlert({
        severity: 'critical',
        component: 'system',
        type: 'service-unhealthy',
        message: `System health check failed: ${overallStatus}`,
        description: `Health check indicates system is unhealthy. Services: ${JSON.stringify(health.summary)}`,
        metrics: {
          healthyServices: healthyCount,
          unhealthyServices: unhealthyCount,
          totalResponseTime: totalResponseTime
        }
      });
    } else if (overallStatus === 'degraded') {
      alertingManager.sendAlert({
        severity: 'warning',
        component: 'system',
        type: 'service-degraded',
        message: `System performance degraded: ${overallStatus}`,
        description: `Some services are experiencing issues. Services: ${JSON.stringify(health.summary)}`,
        metrics: {
          healthyServices: healthyCount,
          unhealthyServices: unhealthyCount,
          totalResponseTime: totalResponseTime
        }
      });
    }

    // Set response status based on overall health
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    if (span) {
      span.recordException(error);
      span.end();
    }
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      correlationId,
      error: 'Health check failed',
      message: error.message
    });
  }
});

// GET /api/health/detailed - Comprehensive health information with deep diagnostics
router.get('/detailed', rateLimits.api, async (req, res) => {
  const startTime = Date.now();

  try {
    // Perform comprehensive health checks
    const [ollamaHealth, comfyuiHealth] = await Promise.all([
      performDeepServiceCheck('ollama', CONFIG.ollamaUrl),
      performDeepServiceCheck('comfyui', CONFIG.comfyuiUrl)
    ]);

    // Enhanced system information
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: require('os').hostname(),
      pid: process.pid,
      ppid: process.ppid,
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        arrayBuffers: Math.round(process.memoryUsage().arrayBuffers / 1024 / 1024)
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: require('os').loadavg(),
        cpuCount: require('os').cpus().length,
        cpuInfo: require('os').cpus()[0]?.model || 'Unknown'
      },
      disk: {
        tmpdir: require('os').tmpdir(),
        homedir: require('os').homedir()
      },
      network: {
        hostname: require('os').hostname(),
        networkInterfaces: Object.keys(require('os').networkInterfaces())
      }
    };

    // Performance metrics
    const performanceMetrics = {
      eventLoopDelay: process.env.NODE_ENV === 'production' ? 'Available in production' : 'N/A',
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length,
      memoryUsageHistory: global.memoryHistory || [],
      cpuUsageHistory: global.cpuHistory || [],
      requestCount: global.requestCount || 0,
      errorCount: global.errorCount || 0,
      averageResponseTime: global.averageResponseTime || 0
    };

    // Service dependency analysis
    const dependencyStatus = {
      critical: {
        ollama: {
          required: true,
          status: ollamaHealth.status,
          impact: ollamaHealth.status !== 'healthy' ? 'High - LLM capabilities unavailable' : 'None'
        },
        comfyui: {
          required: true,
          status: comfyuiHealth.status,
          impact: comfyuiHealth.status !== 'healthy' ? 'High - Image generation unavailable' : 'None'
        }
      },
      optional: {
        websocket: {
          required: false,
          status: req.io ? 'healthy' : 'unavailable',
          impact: 'Low - Real-time features may be limited'
        }
      }
    };

    const services = [
      {
        name: 'web-gui-node',
        status: 'healthy',
        responseTime: 0,
        version: require('../../package.json').version,
        uptime: process.uptime(),
        lastCheck: new Date().toISOString(),
        endpoints: ['/api/health', '/api/health/detailed', '/api/health/ping'],
        metrics: {
          memoryUsage: systemInfo.memory.used,
          cpuUsage: systemInfo.cpu.usage,
          requestCount: performanceMetrics.requestCount,
          errorCount: performanceMetrics.errorCount
        }
      },
      ollamaHealth,
      comfyuiHealth
    ];

    // Calculate comprehensive status
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    let overallStatus;
    if (unhealthyCount === 0 && degradedCount === 0) {
      overallStatus = 'healthy';
    } else if (unhealthyCount > healthyCount) {
      overallStatus = 'unhealthy';
    } else {
      overallStatus = 'degraded';
    }

    const totalResponseTime = Date.now() - startTime;

    const detailedHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: CONFIG.version,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      responseTime: {
        total: `${totalResponseTime}ms`,
        breakdown: services.reduce((acc, s) => {
          acc[s.name] = `${s.responseTime}ms`;
          return acc;
        }, {})
      },
      services: services.reduce((acc, service) => {
        acc[service.name] = service;
        return acc;
      }, {}),
      summary: {
        total: services.length,
        healthy: healthyCount,
        unhealthy: unhealthyCount,
        degraded: degradedCount,
        criticalServicesHealthy:
          dependencyStatus.critical.ollama.status === 'healthy' &&
          dependencyStatus.critical.comfyui.status === 'healthy',
        lastUpdate: new Date().toISOString()
      },
      system: systemInfo,
      performance: performanceMetrics,
      dependencies: dependencyStatus,
      configuration: {
        healthCheckTimeout: `${CONFIG.healthCheckTimeout}ms`,
        healthCheckInterval: `${CONFIG.healthCheckInterval}ms`,
        cacheEnabled: true,
        cacheTTL: `${CACHE_TTL}ms`,
        endpoints: {
          ollama: CONFIG.ollamaUrl,
          comfyui: CONFIG.comfyuiUrl
        },
        features: {
          deepHealthChecks: true,
          performanceMonitoring: true,
          dependencyTracking: true,
          caching: true,
          realTimeMetrics: Boolean(req.io)
        }
      },
      diagnostics: {
        healthCacheSize: healthCache.size,
        lastHealthCheck: new Date().toISOString(),
        systemResourcesOK: systemInfo.memory.used < 1000, // Less than 1GB
        criticalPathsOperational: services.every(s => s.name === 'web-gui-node' || s.endpoints.length > 0)
      }
    };

    detailedHealth.alerting = {
      enabled: true,
      webhookConfigured: Boolean(process.env.ALERT_WEBHOOK_URL),
      slackConfigured: Boolean(process.env.ALERT_SLACK_WEBHOOK_URL),
      emailConfigured: process.env.ALERT_EMAIL_ENABLED === 'true',
      lastHealthCheck: new Date().toISOString(),
      alertHistory: Array.from(alertingManager.alertHistory.entries()).map(([key, timestamp]) => ({
        alert: key,
        lastSent: new Date(timestamp).toISOString()
      }))
    };

    res.json(detailedHealth);
  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/health/ping - Simple ping endpoint with basic metrics
router.get('/ping', rateLimits.api, (req, res) => {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  const correlationId = getCorrelationId(req);

  res.json({
    status: 'ok',
    timestamp,
    correlationId,
    message: 'pong',
    uptime: `${Math.round(uptime)}s`,
    version: CONFIG.version,
    responseTime: '< 1ms',
    server: 'DinoAir Web GUI Node.js'
  });
});

// GET /api/health/status - Lightweight status check
router.get('/status', rateLimits.api, async (req, res) => {
  try {
    // Quick check of critical services with circuit breaker
    const [ollamaOk, comfyOk] = await Promise.allSettled([
      ollamaBreaker.call(() =>
        withRetry(() => fetch(`${CONFIG.ollamaUrl}/api/tags`, { timeout: 3000 }).then(r => r.ok), {
          maxRetries: 1,
          retryCondition: isRetryableError
        })
      ),
      comfyuiBreaker.call(() =>
        withRetry(() => fetch(`${CONFIG.comfyuiUrl}/`, { timeout: 3000, method: 'HEAD' }).then(r => r.ok), {
          maxRetries: 1,
          retryCondition: isRetryableError
        })
      )
    ]);

    const ollamaHealthy = ollamaOk.status === 'fulfilled' && ollamaOk.value;
    const comfyHealthy = comfyOk.status === 'fulfilled' && comfyOk.value;
    const overallHealthy = ollamaHealthy && comfyHealthy;

    const status = {
      status: overallHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        ollama: ollamaHealthy ? 'healthy' : 'unhealthy',
        comfyui: comfyHealthy ? 'healthy' : 'unhealthy',
        webGui: 'healthy'
      },
      summary: overallHealthy ? 'All systems operational' : 'Some services may be experiencing issues'
    };

    res.status(overallHealthy ? 200 : 503).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Status check failed',
      message: error.message
    });
  }
});

// GET /api/health/metrics - Performance and system metrics
router.get('/metrics', rateLimits.api, (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  const metrics = {
    timestamp: new Date().toISOString(),
    system: {
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      loadAverage: require('os').loadavg()
    },
    application: {
      version: require('../../package.json').version,
      nodeVersion: process.version,
      platform: process.platform,
      requestCount: global.requestCount || 0,
      errorCount: global.errorCount || 0,
      averageResponseTime: global.averageResponseTime || 0,
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    },
    cache: {
      healthCacheSize: healthCache.size,
      cacheTTL: CACHE_TTL
    }
  };

  res.json(metrics);
});

module.exports = router;
