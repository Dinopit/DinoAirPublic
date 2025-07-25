const express = require('express');
const { anyAuth } = require('../../middleware/auth-middleware');
const { resourceManager } = require('../../lib/resource-manager');
const { memoryMonitor } = require('../../lib/memory-monitor');

const router = express.Router();

router.get('/stats', anyAuth, (req, res) => {
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

router.post('/gc', anyAuth, (req, res) => {
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

router.get('/resources', anyAuth, (req, res) => {
  try {
    const stats = resourceManager.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting resource stats:', error);
    res.status(500).json({ error: 'Failed to get resource stats' });
  }
});

module.exports = router;
