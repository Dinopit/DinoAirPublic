/**
 * DinoAir Web GUI - Node.js Express Server
 * Migrated from Next.js to pure Node.js for consistency
 */

require('./lib/apm').initialize({
  serviceName: 'dinoair-web-gui-node',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development'
});

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const { resourceManager } = require('./lib/resource-manager');
const { memoryMonitor } = require('./lib/memory-monitor');
const { middleware: apmMiddleware, shutdown: apmShutdown } = require('./lib/apm');

// Import route modules
const apiRoutes = require('./routes/api');
const pageRoutes = require('./routes/pages');
const { smartRateLimit } = require('./middleware/auth-middleware');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
const { cspMiddleware, cspViolationHandler, reportToMiddleware } = require('./middleware/csp');
app.use(reportToMiddleware);
app.use(cspViolationHandler);
app.use(cspMiddleware);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));

// Compression middleware
app.use(compression());

// APM monitoring middleware
app.use(apmMiddleware());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make Socket.io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api', smartRateLimit);

// Routes
app.use('/api', apiRoutes);
app.use('/api/system', require('./routes/api/system'));
app.use('/api/health/database', require('./routes/api/health/database'));
app.use('/api/performance', require('./routes/api/performance'));
app.use('/', pageRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle chat events
  socket.on('join-chat', (data) => {
    console.log('User joined chat:', data);
    socket.join('chat-room');
  });

  socket.on('leave-chat', (data) => {
    console.log('User left chat:', data);
    socket.leave('chat-room');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  let userMessage = 'We encountered an unexpected issue. Please try again.';
  let category = 'server_error';
  let statusCode = 500;
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    userMessage = 'Please check the information you entered and try again.';
    category = 'validation_error';
    statusCode = 400;
  } else if (err.status === 401 || err.message?.includes('auth')) {
    userMessage = 'You need to be signed in to access this feature.';
    category = 'authentication_error';
    statusCode = 401;
  } else if (err.status === 403) {
    userMessage = 'You don\'t have permission to access this feature.';
    category = 'authorization_error';
    statusCode = 403;
  } else if (err.status === 429 || err.message?.includes('rate limit')) {
    userMessage = 'You\'re making requests too quickly. Please wait a moment and try again.';
    category = 'rate_limit_error';
    statusCode = 429;
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    userMessage = 'We\'re having trouble connecting to our services. Please try again in a few moments.';
    category = 'service_unavailable';
    statusCode = 503;
  }
  
  const errorResponse = {
    error: userMessage,
    category,
    timestamp: new Date().toISOString()
  };
  
  if (NODE_ENV === 'development') {
    errorResponse.technical = {
      message: err.message,
      stack: err.stack
    };
  }
  
  res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'API endpoint not found',
      category: 'not_found',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(404).json({
    error: 'Page not found',
    category: 'not_found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await apmShutdown();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await apmShutdown();
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`DinoAir Web GUI Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Access the application at: http://localhost:${PORT}`);
  
  memoryMonitor.start();
  console.log('🧠 Memory monitoring enabled');
});

// Register server for graceful shutdown
resourceManager.registerResource('server', server, (server) => {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('HTTP server closed');
      resolve();
    });
  });
});

module.exports = { app, server, io };
