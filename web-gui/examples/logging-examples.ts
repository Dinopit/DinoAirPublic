/**
 * Example usage of DinoAir structured logging with correlation IDs
 * This file demonstrates how to use the logging system across the application
 */

import { initializeLogging, getLogger, setUserId } from '../lib/logging/logger';
import { createLoggingConfig } from '../lib/logging/config';
import { CorrelationIdManager } from '../lib/correlation/correlation-id';

// Initialize logging system
const config = createLoggingConfig('development', {
  remoteEndpoint: '/api/logs',
  consoleOutput: true,
  enablePerformanceMetrics: true
});

initializeLogging(config);

// Get loggers for different components
const apiLogger = getLogger('api-client');
const uiLogger = getLogger('ui-component');
const authLogger = getLogger('auth-service');

// Set up correlation ID manager
const correlationManager = CorrelationIdManager.getInstance();

/**
 * Example 1: API Request Flow
 */
async function exampleApiRequest() {
  // Generate a new correlation ID for this request flow
  const correlationId = correlationManager.renewCorrelationId();
  
  apiLogger.info('Starting API request', {
    endpoint: '/api/users',
    method: 'GET',
    correlationId
  });

  try {
    // Simulate API call
    const startTime = performance.now();
    
    // In a real app, this would be an actual fetch call
    // The enhanced API client automatically adds correlation ID headers
    await simulateApiCall();
    
    const duration = performance.now() - startTime;
    
    // Log performance metrics
    apiLogger.performance('api-request', duration, {
      endpoint: '/api/users',
      success: true
    });
    
    apiLogger.info('API request completed successfully', {
      endpoint: '/api/users',
      duration,
      correlationId
    });
    
  } catch (error) {
    apiLogger.error('API request failed', error, {
      endpoint: '/api/users',
      correlationId
    });
    throw error;
  }
}

/**
 * Example 2: User Authentication Flow
 */
async function exampleAuthFlow(username: string) {
  // Renew correlation ID for new session
  const correlationId = correlationManager.renewCorrelationId();
  
  authLogger.info('User authentication started', {
    username,
    method: 'password',
    correlationId
  });
  
  try {
    // Simulate authentication
    const user = await simulateAuth(username);
    
    // Set user ID for logging context
    setUserId(user.id);
    
    authLogger.info('User authenticated successfully', {
      userId: user.id,
      username,
      correlationId
    });
    
    // Log audit event
    authLogger.info('Audit: User login', {
      action: 'login',
      userId: user.id,
      username,
      correlationId,
      audit: true
    });
    
    return user;
    
  } catch (error) {
    authLogger.error('Authentication failed', error, {
      username,
      correlationId
    });
    
    // Log security event
    authLogger.warn('Security: Failed login attempt', {
      username,
      correlationId,
      security: true
    });
    
    throw error;
  }
}

/**
 * Example 3: UI Component Lifecycle
 */
function exampleUIComponent() {
  const correlationId = correlationManager.getCorrelationId();
  
  uiLogger.debug('Component mounting', {
    component: 'UserProfile',
    correlationId
  });
  
  // Simulate component lifecycle
  setTimeout(() => {
    uiLogger.debug('Component mounted', {
      component: 'UserProfile',
      correlationId,
      renderTime: 150
    });
    
    // Simulate user interaction
    setTimeout(() => {
      uiLogger.info('User interaction', {
        component: 'UserProfile',
        action: 'button_click',
        button: 'save_profile',
        correlationId
      });
    }, 2000);
  }, 100);
}

/**
 * Example 4: Error Handling with Context
 */
async function exampleErrorHandling() {
  const correlationId = correlationManager.getCorrelationId();
  
  try {
    // Simulate operation that might fail
    await simulateRiskyOperation();
    
  } catch (error) {
    // Log error with full context
    apiLogger.error('Operation failed with context', error, {
      operation: 'data_processing',
      correlationId,
      context: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        stackTrace: error instanceof Error ? error.stack : undefined
      }
    });
    
    // Log recovery attempt
    apiLogger.info('Attempting error recovery', {
      operation: 'data_processing',
      correlationId,
      recovery: 'retry_with_fallback'
    });
  }
}

// Simulation functions
async function simulateApiCall(): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ users: [] }), 100 + Math.random() * 200);
  });
}

async function simulateAuth(username: string): Promise<any> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (username === 'validuser') {
        resolve({ id: 'user123', username });
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 200);
  });
}

async function simulateRiskyOperation(): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.5) {
        resolve();
      } else {
        reject(new Error('Random failure for demo'));
      }
    }, 100);
  });
}

// Export for use in other parts of the application
export {
  exampleApiRequest,
  exampleAuthFlow,
  exampleUIComponent,
  exampleErrorHandling
};

// Auto-run examples if this file is executed directly
if (typeof window !== 'undefined') {
  console.log('DinoAir Logging Examples - Check console and network for logs');
  
  // Run examples
  exampleUIComponent();
  
  setTimeout(() => exampleApiRequest(), 1000);
  setTimeout(() => exampleAuthFlow('validuser'), 2000);
  setTimeout(() => exampleErrorHandling(), 3000);
}