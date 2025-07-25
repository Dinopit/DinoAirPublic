async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    jitter = true,
    retryCondition = (error) => true
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
      
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      console.warn(`Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms delay. Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

function isRetryableError(error) {
  if (error.code === 'ECONNREFUSED' || 
      error.code === 'ENOTFOUND' || 
      error.code === 'ETIMEDOUT' ||
      error.name === 'TimeoutError') {
    return true;
  }
  
  if (error.response && error.response.status >= 500) {
    return true;
  }
  
  return false;
}

module.exports = { withRetry, isRetryableError };
