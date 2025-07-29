/**
 * Simple Code Execution Server
 * Minimal server for testing code execution functionality
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const codeExecutionRoutes = require('./routes/api/code-execution');
const projectRoutes = require('./routes/api/projects');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Mock authentication middleware for testing
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user', name: 'Test User' };
  next();
};

// Mount code execution routes
app.use('/api/code-execution', codeExecutionRoutes);
app.use('/api/projects', projectRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'DinoAir Code Execution',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});

// Serve code execution UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'code-execution.html'));
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DinoAir Code Execution Server running on http://localhost:${PORT}`);
  console.log(`📝 Open http://localhost:${PORT} to access the code execution interface`);
  console.log(`🔗 API endpoints available at http://localhost:${PORT}/api/code-execution`);
  console.log(`🔗 Project management at http://localhost:${PORT}/api/projects`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n📴 Server shutting down gracefully...');
  process.exit(0);
});