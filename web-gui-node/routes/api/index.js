/**
 * API Routes Index
 * Main router for all API endpoints
 */

const express = require('express');
const router = express.Router();

// Import API route modules
const chatRoutes = require('./chat');
const v1Routes = require('./v1');
const healthRoutes = require('./health');
const alertsRoutes = require('./alerts');
const ollamaRoutes = require('./ollama');
const docsRoutes = require('./docs');

// Mount API routes
router.use('/chat', chatRoutes);
router.use('/v1', v1Routes);
router.use('/health', healthRoutes);
router.use('/alerts', alertsRoutes);
router.use('/ollama', ollamaRoutes);
router.use('/docs', docsRoutes);
router.use('/openapi', docsRoutes); // Alias for docs

// API root endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'DinoAir Web GUI API',
    version: '1.0.0',
    description: 'Node.js API for DinoAir chat interface',
    endpoints: {
      chat: '/api/chat',
      v1: '/api/v1',
      health: '/api/health',
      alerts: '/api/alerts',
      ollama: '/api/ollama',
      docs: '/api/docs'
    }
  });
});

module.exports = router;
