/**
 * DinoAir Web GUI - Node.js Express Server
 * Migrated from Next.js to pure Node.js for consistency
 */

console.log(`[${new Date().toISOString()}] 🚀 DinoAir Server initialization starting...`);

console.log(`[${new Date().toISOString()}] 📊 Initializing APM monitoring...`);
require('./lib/apm').initialize({
  serviceName: 'dinoair-web-gui-node',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development'
});
console.log(`[${new Date().toISOString()}] ✅ APM monitoring initialized`);

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
// const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

// Validate environment variables before starting server
console.log(`[${new Date().toISOString()}] 🔍 Validating environment configuration...`);
const EnvironmentValidator = require('./lib/environment-validator');
const envValidator = new EnvironmentValidator();
const validationResults = envValidator.validate(process.env.NODE_ENV === 'production');

if (!validationResults.isValid) {
  console.error(`[${new Date().toISOString()}] ❌ Environment validation failed!`);
  envValidator.printResults(validationResults);
  
  if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Refusing to start in production with invalid environment!');
    process.exit(1);
  } else {
    console.warn('⚠️  Starting in development mode with warnings...');
  }
} else {
  console.log(`[${new Date().toISOString()}] ✅ Environment validation passed`);
  if (validationResults.warnings.length > 0) {
    console.warn(`[${new Date().toISOString()}] ⚠️  Found ${validationResults.warnings.length} warnings:`);
    validationResults.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
}

const { resourceManager } = require('./lib/resource-manager');
const { memoryMonitor } = require('./lib/memory-monitor');
const { middleware: apmMiddleware, shutdown: apmShutdown } = require('./lib/apm');
const { alertingSystem } = require('./lib/alerting');

// Import route modules
console.log(`[${new Date().toISOString()}] 📁 Loading route modules...`);
const apiRoutes = require('./routes/api');
console.log(`[${new Date().toISOString()}] ✅ API routes loaded`);
const pageRoutes = require('./routes/pages');
console.log(`[${new Date().toISOString()}] ✅ Page routes loaded`);
const { smartRateLimit } = require('./middleware/auth-middleware');
console.log(`[${new Date().toISOString()}] ✅ Rate limiting middleware loaded`);

// Create Express app
console.log(`[${new Date().toISOString()}] 🏗️  Creating Express app and HTTP server...`);
const app = express();
const server = http.createServer(app);
console.log(`[${new Date().toISOString()}] ✅ Express app and HTTP server created`);

console.log(`[${new Date().toISOString()}] 🔌 Initializing Socket.IO...`);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});
console.log(`[${new Date().toISOString()}] ✅ Socket.IO initialized successfully`);

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
console.log(`[${new Date().toISOString()}] 🛡️  Loading security middleware...`);
const { cspMiddleware, cspViolationHandler, reportToMiddleware } = require('./middleware/csp');
console.log(`[${new Date().toISOString()}] ✅ CSP middleware loaded`);
app.use(reportToMiddleware);
console.log(`[${new Date().toISOString()}] ✅ Report-To middleware applied`);
app.use(cspViolationHandler);
console.log(`[${new Date().toISOString()}] ✅ CSP violation handler applied`);
app.use(cspMiddleware);
console.log(`[${new Date().toISOString()}] ✅ CSP middleware applied`);

// CORS configuration
console.log(`[${new Date().toISOString()}] 🌐 Configuring CORS...`);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  })
);
console.log(`[${new Date().toISOString()}] ✅ CORS configured`);

// Compression middleware
console.log(`[${new Date().toISOString()}] 🗜️  Loading compression middleware...`);
app.use(compression());
console.log(`[${new Date().toISOString()}] ✅ Compression middleware loaded`);

// APM monitoring middleware
console.log(`[${new Date().toISOString()}] 📊 Loading APM monitoring middleware...`);
app.use(apmMiddleware());
console.log(`[${new Date().toISOString()}] ✅ APM monitoring middleware loaded`);

// Body parsing middleware
console.log(`[${new Date().toISOString()}] 📝 Loading body parsing middleware...`);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
console.log(`[${new Date().toISOString()}] ✅ Body parsing middleware loaded`);

// Static file serving
console.log(`[${new Date().toISOString()}] 📁 Configuring static file serving...`);
app.use(express.static(path.join(__dirname, 'public')));
console.log(`[${new Date().toISOString()}] ✅ Static file serving configured`);

// View engine setup
console.log(`[${new Date().toISOString()}] 🎨 Setting up view engine...`);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
console.log(`[${new Date().toISOString()}] ✅ View engine configured`);

console.log(`[${new Date().toISOString()}] 🔍 Adding correlation ID middleware...`);
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  const startTime = Date.now();
  const requestInfo = {
    correlationId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent')?.substring(0, 100) || 'unknown',
    timestamp: new Date().toISOString()
  };

  console.log(
    `📥 [${requestInfo.timestamp}] Request: ${req.method} ${req.originalUrl} [${correlationId}] from ${requestInfo.ip}`
  );

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseInfo = {
      ...requestInfo,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    };

    const logLevel = res.statusCode >= 400 ? '🚨' : res.statusCode >= 300 ? '⚠️' : '✅';
    console.log(
      `📤 [${new Date().toISOString()}] Response: ${logLevel} ${res.statusCode} ${req.method} ${req.originalUrl} [${correlationId}] - ${duration}ms`
    );

    if (duration > 5000) {
      console.warn(
        `🐌 [${new Date().toISOString()}] SlowRequest: Request took ${duration}ms [${correlationId}]:`,
        responseInfo
      );
    }
  });

  next();
});
console.log(`[${new Date().toISOString()}] ✅ Correlation ID middleware configured`);

// Make Socket.io available to routes
console.log(`[${new Date().toISOString()}] 🔌 Making Socket.IO available to routes...`);
app.use((req, res, next) => {
  req.io = io;
  next();
});
console.log(`[${new Date().toISOString()}] ✅ Socket.IO middleware configured`);

console.log(`[${new Date().toISOString()}] 🚦 Applying rate limiting to API routes...`);
app.use('/api', smartRateLimit);
console.log(`[${new Date().toISOString()}] ✅ Rate limiting applied to API routes`);

// Routes
console.log(`[${new Date().toISOString()}] 🛣️  Mounting routes...`);
app.use('/api', apiRoutes);
console.log(`[${new Date().toISOString()}] ✅ Main API routes mounted`);
app.use('/api/system', require('./routes/api/system'));
console.log(`[${new Date().toISOString()}] ✅ System API routes mounted`);
app.use('/api/health/database', require('./routes/api/health/database'));
console.log(`[${new Date().toISOString()}] ✅ Database health routes mounted`);
app.use('/api/health', require('./routes/api/health'));
console.log(`[${new Date().toISOString()}] ✅ Enhanced health check routes mounted`);
app.use('/api/performance', require('./routes/api/performance'));
console.log(`[${new Date().toISOString()}] ✅ Performance API routes mounted`);
app.use('/', pageRoutes);
console.log(`[${new Date().toISOString()}] ✅ Page routes mounted`);

// Socket.io connection handling
io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  // Handle chat events
  socket.on('join-chat', data => {
    console.log('User joined chat:', data);
    socket.join('chat-room');
  });

  socket.on('leave-chat', data => {
    console.log('User left chat:', data);
    socket.leave('chat-room');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.use((err, req, res, _next) => {
  const timestamp = new Date().toISOString();
  const correlationId = req.correlationId || 'unknown';
  const requestInfo = {
    correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent')?.substring(0, 100) || 'unknown',
    timestamp
  };

  const errorDetails = {
    correlationId,
    error: {
      name: err.name,
      message: err.message,
      stack: NODE_ENV === 'development' ? err.stack : err.stack?.split('\n')[0],
      code: err.code,
      status: err.status,
      type: err.constructor.name
    },
    request: requestInfo,
    isAsync: err.isAsync || false,
    severity: err.status >= 500 ? 'error' : err.status >= 400 ? 'warn' : 'info'
  };

  console.error(`🚨 [${timestamp}] ErrorMiddleware: Server error caught [${correlationId}]:`, errorDetails);

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
    userMessage = "You don't have permission to access this feature.";
    category = 'authorization_error';
    statusCode = 403;
  } else if (err.status === 429 || err.message?.includes('rate limit')) {
    userMessage = "You're making requests too quickly. Please wait a moment and try again.";
    category = 'rate_limit_error';
    statusCode = 429;
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    userMessage = "We're having trouble connecting to our services. Please try again in a few moments.";
    category = 'service_unavailable';
    statusCode = 503;
  } else if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
    userMessage = 'The request took too long to process. Please try again.';
    category = 'timeout_error';
    statusCode = 408;
  }

  const errorResponse = {
    error: userMessage,
    category,
    timestamp,
    correlationId,
    requestId: correlationId // Use correlation ID as request ID for consistency
  };

  if (NODE_ENV === 'development') {
    errorResponse.technical = {
      message: err.message,
      stack: err.stack,
      code: err.code,
      request: requestInfo
    };
  }

  if (!res.headersSent) {
    res.status(statusCode).json(errorResponse);
  } else {
    console.error(`🚨 [${timestamp}] ErrorMiddleware: Headers already sent, cannot send error response`);
  }
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

process.on('unhandledRejection', (reason, promise) => {
  const timestamp = new Date().toISOString();
  console.error(`🚨 [${timestamp}] UnhandledRejection: Unhandled Promise Rejection detected:`, {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString().substring(0, 200),
    timestamp
  });

  if (NODE_ENV === 'development') {
    console.error(
      `🚨 [${timestamp}] UnhandledRejection: This might indicate an async error in auth or other middleware`
    );
  }
});

process.on('uncaughtException', error => {
  const timestamp = new Date().toISOString();
  console.error(`🚨 [${timestamp}] UncaughtException: Uncaught Exception detected:`, {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp
  });

  // Graceful shutdown on uncaught exception
  console.error(`🚨 [${timestamp}] UncaughtException: Initiating graceful shutdown...`);
  server.close(async () => {
    await apmShutdown();
    console.log(`🚨 [${timestamp}] UncaughtException: Server closed due to uncaught exception`);
    process.exit(1);
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
console.log(`[${new Date().toISOString()}] 🚀 Starting server on port ${PORT}...`);
server.listen(PORT, () => {
  console.log(
    `[${new Date().toISOString()}] ✅ DinoAir Web GUI Server successfully started and listening on port ${PORT}`
  );
  console.log(`[${new Date().toISOString()}] 🌍 Environment: ${NODE_ENV}`);
  console.log(`[${new Date().toISOString()}] 🔗 Access the application at: http://localhost:${PORT}`);

  console.log(`[${new Date().toISOString()}] 🧠 Starting memory monitoring...`);
  memoryMonitor.start();
  console.log(`[${new Date().toISOString()}] ✅ Memory monitoring enabled`);

  console.log(`[${new Date().toISOString()}] 🚨 Starting alerting system...`);
  const alertingManager = new AlertingManager();
  alertingManager.startHealthMonitoring();
  console.log(`[${new Date().toISOString()}] ✅ Alerting system enabled`);

  console.log(`[${new Date().toISOString()}] 🎉 DinoAir server is ready to accept connections!`);
});

// Register server for graceful shutdown
resourceManager.registerResource('server', server, server => {
  return new Promise(resolve => {
    server.close(() => {
      console.log('HTTP server closed');
      resolve();
    });
  });
});

module.exports = { app, server, io };
