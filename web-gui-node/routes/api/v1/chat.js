/**
 * V1 Chat API Routes
 * Minimal implementation for server startup
 */

const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  res.status(501).json({
    error: 'Chat API not implemented',
    message: 'This endpoint is under development'
  });
});

router.get('/history', (req, res) => {
  res.status(501).json({
    error: 'Chat history API not implemented',
    message: 'This endpoint is under development'
  });
});

module.exports = router;
