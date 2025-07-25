const express = require('express');
const { anyAuth } = require('../../middleware/auth-middleware');
const { resourceManager } = require('../../lib/resource-manager');
const { rateLimits, sanitizeInput } = require('../../middleware/validation');
const { memoryMonitor } = require('../../lib/memory-monitor');
const { CircuitBreakerStats } = require('../../lib/circuit-breaker-stats');

const router = express.Router();

router.get('/stats', rateLimits.api, anyAuth, (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const resourceStats = resourceManager.getStats();
    const monitorStats = memoryMonitor.getStats();
    
    const stats = {
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024 * 100) / 100,
        usageRatio: memUsage.heapUsed / memUsage.heapTotal
      },
      resources: resourceStats,
      monitoring: monitorStats,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({ error: 'Failed to get system stats' });
  }
});

router.post('/gc', rateLimits.api, sanitizeInput, anyAuth, (req, res) => {
  try {
    if (global.gc && typeof global.gc === 'function') {
      const beforeMem = process.memoryUsage();
      global.gc();
      const afterMem = process.memoryUsage();
      
      res.json({
        success: true,
        before: {
          heapUsed: Math.round(beforeMem.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(beforeMem.heapTotal / 1024 / 1024 * 100) / 100
        },
        after: {
          heapUsed: Math.round(afterMem.heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(afterMem.heapTotal / 1024 / 1024 * 100) / 100
        },
        freed: Math.round((beforeMem.heapUsed - afterMem.heapUsed) / 1024 / 1024 * 100) / 100
      });
    } else {
      res.status(400).json({ 
        error: 'Garbage collection not available. Start Node.js with --expose-gc flag.' 
      });
    }
  } catch (error) {
    console.error('Error triggering garbage collection:', error);
    res.status(500).json({ error: 'Failed to trigger garbage collection' });
  }
});

router.get('/resources', rateLimits.api, anyAuth, (req, res) => {
  try {
    const stats = resourceManager.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting resource stats:', error);
    res.status(500).json({ error: 'Failed to get resource stats' });
  }
});


router.get('/circuit-breakers', rateLimits.api, anyAuth, async (req, res) => {
  try {
    const stats = CircuitBreakerStats.getAllStats();
    const health = CircuitBreakerStats.getHealthStatus();
    
    res.json({
      success: true,
      stats: stats,
      health: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting circuit breaker stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit breaker statistics'
    });
  }
});

router.post('/circuit-breakers/reset', rateLimits.api, anyAuth, async (req, res) => {
  try {
    const result = CircuitBreakerStats.resetAll();
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error resetting circuit breakers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breakers'
    });
  }
});

module.exports = router;
