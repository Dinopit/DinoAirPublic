/**
 * Health API Routes
 * System health monitoring and diagnostics
 */

const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// GET /api/health - Main health check endpoint
router.get('/', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {},
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: {
        loadAverage: require('os').loadavg()
      }
    }
  };

  // Check Ollama service
  try {
    const ollamaResponse = await fetch('http://localhost:11434/api/tags', {
      timeout: 5000
    });
    
    if (ollamaResponse.ok) {
      const models = await ollamaResponse.json();
      health.services.ollama = {
        status: 'healthy',
        models: models.models ? models.models.length : 0,
        responseTime: Date.now() - startTime
      };
    } else {
      health.services.ollama = {
        status: 'unhealthy',
        error: `HTTP ${ollamaResponse.status}`,
        responseTime: Date.now() - startTime
      };
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.ollama = {
      status: 'unhealthy',
      error: error.message,
      responseTime: Date.now() - startTime
    };
    health.status = 'degraded';
  }

  // Check Socket.io (if available)
  if (req.io) {
    const socketCount = req.io.engine.clientsCount || 0;
    health.services.websocket = {
      status: 'healthy',
      connectedClients: socketCount
    };
  }

  // Set response status based on overall health
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(health);
});

// GET /api/health/detailed - Detailed health information
router.get('/detailed', async (req, res) => {
  const health = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('../../package.json').version,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: require('os').hostname(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      cpu: {
        loadAverage: require('os').loadavg(),
        cpuCount: require('os').cpus().length
      },
      disk: {
        // Basic disk info (would need additional libraries for detailed info)
        tmpdir: require('os').tmpdir()
      }
    },
    services: {},
    metrics: {
      // Add basic metrics here
      requestCount: global.requestCount || 0,
      errorCount: global.errorCount || 0
    }
  };

  // Detailed Ollama check
  try {
    const ollamaStart = Date.now();
    const [tagsResponse, versionResponse] = await Promise.allSettled([
      fetch('http://localhost:11434/api/tags', { timeout: 5000 }),
      fetch('http://localhost:11434/api/version', { timeout: 5000 })
    ]);

    if (tagsResponse.status === 'fulfilled' && tagsResponse.value.ok) {
      const models = await tagsResponse.value.json();
      health.services.ollama = {
        status: 'healthy',
        models: models.models || [],
        modelCount: models.models ? models.models.length : 0,
        responseTime: Date.now() - ollamaStart
      };

      if (versionResponse.status === 'fulfilled' && versionResponse.value.ok) {
        const version = await versionResponse.value.json();
        health.services.ollama.version = version.version;
      }
    } else {
      health.services.ollama = {
        status: 'unhealthy',
        error: 'Failed to connect to Ollama service',
        responseTime: Date.now() - ollamaStart
      };
    }
  } catch (error) {
    health.services.ollama = {
      status: 'unhealthy',
      error: error.message
    };
  }

  res.json(health);
});

// GET /api/health/ping - Simple ping endpoint
router.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'pong'
  });
});

module.exports = router;