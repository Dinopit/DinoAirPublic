const { CircuitOpenError } = require('./circuit-breaker');

class ErrorHandler {
  static handleServiceError(error, serviceName) {
    if (error instanceof CircuitOpenError) {
      return {
        status: 503,
        error: `${serviceName} service is temporarily unavailable`,
        code: 'CIRCUIT_OPEN',
        retryAfter: 60
      };
    }
    
    if (error.code === 'ECONNREFUSED') {
      return {
        status: 503,
        error: `${serviceName} service is not running`,
        code: 'SERVICE_UNAVAILABLE'
      };
    }
    
    if (error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
      return {
        status: 504,
        error: `${serviceName} service timeout`,
        code: 'TIMEOUT'
      };
    }
    
    return {
      status: 500,
      error: `${serviceName} service error`,
      code: 'INTERNAL_ERROR',
      message: error.message
    };
  }
  
  static createErrorResponse(res, errorInfo) {
    const response = {
      success: false,
      ...errorInfo
    };
    
    if (errorInfo.retryAfter) {
      res.set('Retry-After', errorInfo.retryAfter);
    }
    
    return res.status(errorInfo.status).json(response);
  }
}

module.exports = { ErrorHandler };
