const express = require('express');
const { getPerformanceMetrics, createSpan, getCorrelationId } = require('../../lib/apm');
const router = express.Router();

router.get('/metrics', async (req, res) => {
  const correlationId = getCorrelationId(req);
  const span = createSpan('performance_metrics', {
    attributes: {
      'correlation.id': correlationId,
      'performance.metrics.type': 'current'
    }
  });

  try {
    const metrics = getPerformanceMetrics();
    
    if (span) {
      span.setAttributes({
        'performance.memory.heap_used_mb': metrics.memory.heapUsedMB,
        'performance.memory.heap_total_mb': metrics.memory.heapTotalMB,
        'performance.uptime_seconds': metrics.uptime
      });
      span.end();
    }

    res.json({
      success: true,
      correlationId,
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (error) {
    if (span) {
      span.recordException(error);
      span.end();
    }
    
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      correlationId,
      error: 'Failed to retrieve performance metrics',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/dashboard', async (req, res) => {
  const correlationId = getCorrelationId(req);
  const span = createSpan('performance_dashboard', {
    attributes: {
      'correlation.id': correlationId,
      'performance.dashboard.type': 'overview'
    }
  });

  try {
    const metrics = getPerformanceMetrics();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const dashboard = {
      overview: {
        status: 'healthy',
        uptime: metrics.uptime,
        uptimeFormatted: formatUptime(metrics.uptime),
        pid: metrics.pid,
        version: metrics.version,
        platform: metrics.platform,
        arch: metrics.arch
      },
      memory: {
        current: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          rss: memoryUsage.rss,
          external: memoryUsage.external
        },
        formatted: {
          heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
          rssMB: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
          externalMB: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
        },
        utilization: {
          heapUsedPercent: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
          heapFreePercent: Math.round(((memoryUsage.heapTotal - memoryUsage.heapUsed) / memoryUsage.heapTotal) * 100)
        }
      },
      cpu: {
        current: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        formatted: {
          userMs: Math.round(cpuUsage.user / 1000),
          systemMs: Math.round(cpuUsage.system / 1000),
          totalMs: Math.round((cpuUsage.user + cpuUsage.system) / 1000)
        }
      },
      alerts: generateAlerts(memoryUsage, cpuUsage, metrics.uptime),
      recommendations: generateRecommendations(memoryUsage, cpuUsage)
    };

    if (span) {
      span.setAttributes({
        'performance.memory.utilization_percent': dashboard.memory.utilization.heapUsedPercent,
        'performance.alerts.count': dashboard.alerts.length,
        'performance.recommendations.count': dashboard.recommendations.length
      });
      span.end();
    }

    res.json({
      success: true,
      correlationId,
      timestamp: new Date().toISOString(),
      dashboard
    });
  } catch (error) {
    if (span) {
      span.recordException(error);
      span.end();
    }
    
    console.error('Error generating performance dashboard:', error);
    res.status(500).json({
      success: false,
      correlationId,
      error: 'Failed to generate performance dashboard',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/traces/:correlationId?', async (req, res) => {
  const correlationId = req.params.correlationId || getCorrelationId(req);
  const span = createSpan('performance_traces', {
    attributes: {
      'correlation.id': correlationId,
      'performance.traces.lookup': !!req.params.correlationId
    }
  });

  try {
    const traceInfo = {
      correlationId,
      message: 'Trace information would be available with a proper APM backend',
      note: 'This endpoint provides correlation ID tracking for request tracing',
      timestamp: new Date().toISOString(),
      requestInfo: {
        method: req.method,
        url: req.url,
        headers: {
          userAgent: req.headers['user-agent'],
          contentType: req.headers['content-type']
        }
      }
    };

    if (span) {
      span.setAttributes({
        'performance.traces.correlation_id': correlationId,
        'performance.traces.method': req.method
      });
      span.end();
    }

    res.json({
      success: true,
      correlationId,
      timestamp: new Date().toISOString(),
      trace: traceInfo
    });
  } catch (error) {
    if (span) {
      span.recordException(error);
      span.end();
    }
    
    console.error('Error getting trace information:', error);
    res.status(500).json({
      success: false,
      correlationId,
      error: 'Failed to retrieve trace information',
      timestamp: new Date().toISOString()
    });
  }
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

function generateAlerts(memoryUsage, cpuUsage, uptime) {
  const alerts = [];
  
  const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  if (heapUsedPercent > 90) {
    alerts.push({
      level: 'critical',
      type: 'memory',
      message: `Heap memory usage is critically high: ${Math.round(heapUsedPercent)}%`,
      recommendation: 'Consider restarting the application or investigating memory leaks'
    });
  } else if (heapUsedPercent > 75) {
    alerts.push({
      level: 'warning',
      type: 'memory',
      message: `Heap memory usage is high: ${Math.round(heapUsedPercent)}%`,
      recommendation: 'Monitor memory usage and consider optimization'
    });
  }
  
  const rssMB = memoryUsage.rss / 1024 / 1024;
  if (rssMB > 1024) {
    alerts.push({
      level: 'warning',
      type: 'memory',
      message: `RSS memory usage is high: ${Math.round(rssMB)}MB`,
      recommendation: 'Monitor overall memory consumption'
    });
  }
  
  if (uptime < 300) {
    alerts.push({
      level: 'info',
      type: 'uptime',
      message: 'Application recently restarted',
      recommendation: 'Monitor for stability after restart'
    });
  }
  
  return alerts;
}

function generateRecommendations(memoryUsage, cpuUsage) {
  const recommendations = [];
  
  const heapUsedPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  if (heapUsedPercent > 60) {
    recommendations.push({
      type: 'memory',
      priority: 'medium',
      title: 'Memory Optimization',
      description: 'Consider implementing memory cleanup strategies',
      actions: [
        'Review and optimize data structures',
        'Implement proper cleanup in event handlers',
        'Consider using memory profiling tools'
      ]
    });
  }
  
  const totalCpuMs = (cpuUsage.user + cpuUsage.system) / 1000;
  if (totalCpuMs > 10000) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      title: 'CPU Usage Optimization',
      description: 'High CPU usage detected',
      actions: [
        'Profile CPU-intensive operations',
        'Consider async/await optimization',
        'Review algorithmic complexity'
      ]
    });
  }
  
  recommendations.push({
    type: 'monitoring',
    priority: 'low',
    title: 'Enhanced Monitoring',
    description: 'Consider implementing additional monitoring',
    actions: [
      'Set up automated alerts',
      'Implement custom metrics collection',
      'Add performance benchmarking'
    ]
  });
  
  return recommendations;
}

module.exports = router;
