/**
 * V1 API Routes Index
 * Version 1 API endpoints
 */

const express = require('express');
const router = express.Router();

// Import V1 route modules
const artifactsRoutes = require('./artifacts');
const chatRoutes = require('./chat');
const modelsRoutes = require('./models');
const personalitiesRoutes = require('./personalities');
const exportProgressRoutes = require('./export-progress');

// Mount V1 routes
router.use('/artifacts', artifactsRoutes);
router.use('/chat', chatRoutes);
router.use('/models', modelsRoutes);
router.use('/personalities', personalitiesRoutes);
router.use('/export-progress', exportProgressRoutes);

// V1 API root endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'DinoAir Web GUI API v1',
    version: '1.0.0',
    description: 'Version 1 of the DinoAir API',
    endpoints: {
      artifacts: '/api/v1/artifacts',
      chat: '/api/v1/chat',
      models: '/api/v1/models',
      personalities: '/api/v1/personalities',
      'export-progress': '/api/v1/export-progress'
    },
    documentation: '/api/docs'
  });
});

module.exports = router;
