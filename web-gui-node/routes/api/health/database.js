/**
 * Database Health Check API Routes
 * Provides endpoints for monitoring database connection pools and health
 */

const express = require('express');
const { dbPool } = require('../../../lib/db-pool');
const router = express.Router();

/**
 * GET /api/health/database - Get overall database health status
 */
router.get('/', async (req, res) => {
  try {
    const healthCheck = await dbPool.performHealthCheck();
    
    const status = healthCheck.overall ? 200 : 503;
    
    res.status(status).json({
      success: healthCheck.overall,
      timestamp: new Date().toISOString(),
      status: healthCheck.overall ? 'healthy' : 'unhealthy',
      pools: healthCheck.pools,
      metrics: healthCheck.metrics,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Database health check error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'Failed to perform health check',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/database/pools - Get detailed pool statistics
 */
router.get('/pools', async (req, res) => {
  try {
    const poolStats = dbPool.getPoolStats();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      pools: poolStats.pools,
      health: poolStats.health,
      metrics: poolStats.metrics,
      summary: {
        totalPools: Object.keys(poolStats.pools).length,
        healthyPools: Object.values(poolStats.health).filter(h => h.healthy).length,
        totalConnections: poolStats.metrics.totalConnections,
        activeConnections: poolStats.metrics.activeConnections,
        idleConnections: poolStats.metrics.idleConnections,
        waitingClients: poolStats.metrics.waitingClients
      }
    });
  } catch (error) {
    console.error('Pool stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pool statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/database/pools/:poolName - Get specific pool health
 */
router.get('/pools/:poolName', async (req, res) => {
  try {
    const { poolName } = req.params;
    const poolStats = dbPool.getPoolStats();
    
    if (!poolStats.pools[poolName]) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found',
        availablePools: Object.keys(poolStats.pools),
        timestamp: new Date().toISOString()
      });
    }
    
    // Perform specific health check for this pool
    const healthCheck = await dbPool.performHealthCheck();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      poolName,
      pool: poolStats.pools[poolName],
      health: poolStats.health[poolName],
      lastHealthCheck: healthCheck.pools[poolName],
      status: healthCheck.pools[poolName]?.healthy ? 'healthy' : 'unhealthy'
    });
  } catch (error) {
    console.error(`Pool ${req.params.poolName} health check error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pool health',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/database/metrics - Get database performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const poolStats = dbPool.getPoolStats();
    const healthCheck = await dbPool.performHealthCheck();
    
    // Calculate additional metrics
    const metrics = {
      ...poolStats.metrics,
      pools: {},
      performance: {
        successRate: poolStats.metrics.totalQueries > 0 
          ? ((poolStats.metrics.totalQueries - poolStats.metrics.failedQueries) / poolStats.metrics.totalQueries * 100).toFixed(2)
          : 100,
        errorRate: poolStats.metrics.totalQueries > 0 
          ? (poolStats.metrics.failedQueries / poolStats.metrics.totalQueries * 100).toFixed(2)
          : 0,
        avgResponseTimeMs: Math.round(poolStats.metrics.avgResponseTime),
        totalErrors: Object.values(poolStats.health).reduce((sum, h) => sum + h.errors, 0)
      }
    };
    
    // Add per-pool metrics
    Object.entries(healthCheck.pools).forEach(([poolName, poolHealth]) => {
      metrics.pools[poolName] = {
        healthy: poolHealth.healthy,
        responseTime: poolHealth.responseTime || null,
        totalConnections: poolHealth.totalConnections || 0,
        idleConnections: poolHealth.idleConnections || 0,
        waitingClients: poolHealth.waitingClients || 0,
        errors: poolStats.health[poolName]?.errors || 0,
        lastCheck: poolHealth.lastCheck
      };
    });
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      collectionInterval: process.env.DB_METRICS_INTERVAL || 60000,
      healthCheckInterval: process.env.DB_HEALTH_CHECK_INTERVAL || 30000
    });
  } catch (error) {
    console.error('Database metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database metrics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/health/database/test - Test database connectivity
 */
router.post('/test', async (req, res) => {
  try {
    const { poolType = 'transaction', query = 'SELECT NOW() as current_time, version() as pg_version' } = req.body;
    
    const startTime = Date.now();
    const result = await dbPool.executeQuery(poolType, query);
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      poolType,
      responseTime,
      query,
      result: result.rows,
      rowCount: result.rowCount,
      connectionInfo: {
        poolType,
        responseTimeMs: responseTime,
        queryExecutedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database test query error:', error);
    res.status(500).json({
      success: false,
      error: 'Database test query failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      poolType: req.body.poolType || 'transaction'
    });
  }
});

/**
 * GET /api/health/database/config - Get database configuration (non-sensitive)
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      pools: {
        transaction: {
          max: process.env.DB_POOL_MAX || 20,
          min: process.env.DB_POOL_MIN || 2,
          idleTimeoutMs: process.env.DB_IDLE_TIMEOUT || 30000,
          connectionTimeoutMs: process.env.DB_CONNECTION_TIMEOUT || 10000,
          acquireTimeoutMs: process.env.DB_ACQUIRE_TIMEOUT || 60000
        },
        session: {
          max: process.env.DB_SESSION_POOL_MAX || 10,
          min: process.env.DB_SESSION_POOL_MIN || 1,
          idleTimeoutMs: process.env.DB_SESSION_IDLE_TIMEOUT || 60000,
          connectionTimeoutMs: process.env.DB_SESSION_CONNECTION_TIMEOUT || 15000,
          acquireTimeoutMs: process.env.DB_SESSION_ACQUIRE_TIMEOUT || 30000
        }
      },
      retry: {
        maxRetries: process.env.DB_MAX_RETRIES || 3,
        baseDelay: process.env.DB_BASE_DELAY || 1000,
        maxDelay: process.env.DB_MAX_DELAY || 10000,
        backoffFactor: process.env.DB_BACKOFF_FACTOR || 2,
        jitterFactor: process.env.DB_JITTER_FACTOR || 0.1
      },
      monitoring: {
        healthCheckInterval: process.env.DB_HEALTH_CHECK_INTERVAL || 30000,
        metricsInterval: process.env.DB_METRICS_INTERVAL || 60000
      },
      environment: process.env.NODE_ENV || 'development',
      ssl: process.env.NODE_ENV === 'production'
    };
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      config
    });
  } catch (error) {
    console.error('Database config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get database configuration',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/health/database/pools/:poolName/reset - Reset pool statistics
 */
router.post('/pools/:poolName/reset', async (req, res) => {
  try {
    const { poolName } = req.params;
    
    // Reset health status for the specific pool
    if (dbPool.healthStatus[poolName]) {
      dbPool.healthStatus[poolName].errors = 0;
      dbPool.healthStatus[poolName].lastCheck = null;
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: `Pool ${poolName} statistics reset successfully`,
      poolName
    });
  } catch (error) {
    console.error(`Pool ${req.params.poolName} reset error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset pool statistics',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;