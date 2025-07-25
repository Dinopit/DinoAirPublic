/**
 * Tests for enhanced Node.js health check endpoints
 */

const request = require('supertest');
const express = require('express');
const healthRouter = require('../../web-gui-node/routes/api/health');

// Mock dependencies
jest.mock('node-fetch');
const fetch = require('node-fetch');

describe('Enhanced Health Check Endpoints', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use('/api/health', healthRouter);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mocks
    global.requestCount = 100;
    global.errorCount = 2;
    global.averageResponseTime = 150;
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all services are up', async () => {
      // Mock successful responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ models: [{ name: 'llama2' }] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: '0.1.17' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ system: 'stats' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ history: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ queue: [] })
        });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version', '2.0.0');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('configuration');

      // Check services structure
      expect(response.body.services).toHaveProperty('web-gui-node');
      expect(response.body.services).toHaveProperty('ollama');
      expect(response.body.services).toHaveProperty('comfyui');

      // Check ollama service details
      const ollamaService = response.body.services.ollama;
      expect(ollamaService).toHaveProperty('status', 'healthy');
      expect(ollamaService).toHaveProperty('version', '0.1.17');
      expect(ollamaService.metrics).toHaveProperty('modelCount', 1);
      expect(ollamaService.endpoints).toContain('http://localhost:11434/api/tags');

      // Check summary
      expect(response.body.summary).toHaveProperty('total', 3);
      expect(response.body.summary).toHaveProperty('healthy', 3);
      expect(response.body.summary).toHaveProperty('unhealthy', 0);
    });

    it('should return degraded status when some services are down', async () => {
      // Mock failed ollama, successful comfyui
      fetch
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ system: 'stats' })
        });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'degraded');
      expect(response.body.services.ollama).toHaveProperty('status', 'unhealthy');
      expect(response.body.services.comfyui).toHaveProperty('status', 'healthy');
      expect(response.body.summary).toHaveProperty('unhealthy', 1);
    });

    it('should handle service timeouts correctly', async () => {
      // Mock timeout
      fetch.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
      );

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'degraded');
      expect(response.body.services.ollama).toHaveProperty('status', 'unhealthy');
      expect(response.body.services.ollama).toHaveProperty('error');
    });

    it('should include performance metrics', async () => {
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('responseTime');
      expect(response.body.responseTime).toHaveProperty('total');
      expect(response.body.responseTime).toHaveProperty('breakdown');
      
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
      expect(response.body.system.memory).toHaveProperty('used');
      expect(response.body.system.memory).toHaveProperty('total');
    });
  });

  describe('GET /api/health/detailed', () => {
    beforeEach(() => {
      fetch.mockResolvedValue({ 
        ok: true, 
        json: () => Promise.resolve({ models: [] }) 
      });
    });

    it('should return comprehensive health information', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body).toHaveProperty('configuration');
      expect(response.body).toHaveProperty('diagnostics');

      // Check enhanced system information
      expect(response.body.system).toHaveProperty('hostname');
      expect(response.body.system).toHaveProperty('pid');
      expect(response.body.system).toHaveProperty('ppid');
      expect(response.body.system.cpu).toHaveProperty('cpuCount');
      expect(response.body.system.disk).toHaveProperty('tmpdir');

      // Check performance metrics
      expect(response.body.performance).toHaveProperty('activeHandles');
      expect(response.body.performance).toHaveProperty('activeRequests');
      expect(response.body.performance).toHaveProperty('requestCount');
      expect(response.body.performance).toHaveProperty('errorCount');

      // Check dependencies
      expect(response.body.dependencies).toHaveProperty('critical');
      expect(response.body.dependencies).toHaveProperty('optional');
      expect(response.body.dependencies.critical).toHaveProperty('ollama');
      expect(response.body.dependencies.critical).toHaveProperty('comfyui');

      // Check configuration
      expect(response.body.configuration).toHaveProperty('features');
      expect(response.body.configuration.features).toHaveProperty('deepHealthChecks', true);
      expect(response.body.configuration.features).toHaveProperty('performanceMonitoring', true);
    });

    it('should include dependency impact analysis', async () => {
      // Mock unhealthy ollama
      fetch
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      const ollamaDep = response.body.dependencies.critical.ollama;
      expect(ollamaDep).toHaveProperty('status', 'unhealthy');
      expect(ollamaDep).toHaveProperty('impact');
      expect(ollamaDep.impact).toContain('High');
    });
  });

  describe('GET /api/health/ping', () => {
    it('should return simple pong response', async () => {
      const response = await request(app)
        .get('/api/health/ping')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('message', 'pong');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version', '2.0.0');
      expect(response.body).toHaveProperty('server', 'DinoAir Web GUI Node.js');
    });
  });

  describe('GET /api/health/status', () => {
    it('should return lightweight status when all services are healthy', async () => {
      fetch
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true });

      const response = await request(app)
        .get('/api/health/status')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('ollama', 'healthy');
      expect(response.body.services).toHaveProperty('comfyui', 'healthy');
      expect(response.body.services).toHaveProperty('webGui', 'healthy');
      expect(response.body).toHaveProperty('summary', 'All systems operational');
    });

    it('should return degraded status when services are down', async () => {
      fetch
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: true });

      const response = await request(app)
        .get('/api/health/status')
        .expect(503);

      expect(response.body).toHaveProperty('status', 'degraded');
      expect(response.body.services).toHaveProperty('ollama', 'unhealthy');
      expect(response.body.services).toHaveProperty('comfyui', 'healthy');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toContain('issues');
    });
  });

  describe('GET /api/health/metrics', () => {
    it('should return system and application metrics', async () => {
      const response = await request(app)
        .get('/api/health/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('application');
      expect(response.body).toHaveProperty('cache');

      // Check system metrics
      expect(response.body.system).toHaveProperty('uptime');
      expect(response.body.system).toHaveProperty('memory');
      expect(response.body.system).toHaveProperty('cpu');
      expect(response.body.system).toHaveProperty('loadAverage');

      // Check application metrics
      expect(response.body.application).toHaveProperty('version');
      expect(response.body.application).toHaveProperty('nodeVersion');
      expect(response.body.application).toHaveProperty('requestCount', 100);
      expect(response.body.application).toHaveProperty('errorCount', 2);
      expect(response.body.application).toHaveProperty('activeHandles');

      // Check cache metrics
      expect(response.body.cache).toHaveProperty('healthCacheSize');
      expect(response.body.cache).toHaveProperty('cacheTTL');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.services.ollama).toHaveProperty('status', 'unhealthy');
      expect(response.body.services.ollama).toHaveProperty('error', 'Network error');
    });

    it('should handle JSON parsing errors', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Should still be healthy since the HTTP response was ok
      expect(response.body.services.ollama).toHaveProperty('status', 'healthy');
    });
  });

  describe('Performance', () => {
    it('should complete health checks within reasonable time', async () => {
      fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      const startTime = Date.now();
      
      await request(app)
        .get('/api/health')
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Health check should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });
});