const { ErrorHandler } = require('../lib/error-handler');

function errorMiddleware(err, req, res, next) {
  console.error('Error middleware caught:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  const errorInfo = ErrorHandler.handleServiceError(err, 'Application');
  return ErrorHandler.createErrorResponse(res, errorInfo);
}

function notFoundMiddleware(req, res) {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path
  });
}

module.exports = { errorMiddleware, notFoundMiddleware };
