import { DinoAirError, ErrorType } from '../services/error-handler';

/**
 * Configuration interface for retry operations
 * @interface RetryConfig
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds before first retry */
  initialDelay: number;
  /** Maximum delay in milliseconds between retries */
  maxDelay: number;
  /** Multiplication factor for exponential backoff (default: 2) */
  factor?: number;
  /** Whether to add random jitter to delays (default: true) */
  jitter?: boolean;
  /** Array of error types that should trigger retries */
  retryableErrors?: ErrorType[];
  /** Callback function called on each retry attempt */
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Default retry configuration with conservative settings
 * @constant
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2, // Reduced from 3 to prevent excessive retries
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  jitter: true,
  retryableErrors: [
    ErrorType.NETWORK,
    ErrorType.TIMEOUT,
    ErrorType.RATE_LIMIT,
    ErrorType.SERVER
    // Explicitly excluding ErrorType.AUTH to prevent retrying 401 errors
  ]
};

/**
 * Circuit breaker states enumeration
 * @enum {string}
 */
export enum CircuitState {
  /** Circuit is closed, requests flow normally */
  CLOSED = 'CLOSED',
  /** Circuit is open, requests are blocked */
  OPEN = 'OPEN',
  /** Circuit is half-open, testing if service has recovered */
  HALF_OPEN = 'HALF_OPEN'
}

/**
 * Configuration interface for circuit breaker behavior
 * @interface CircuitBreakerConfig
 */
export interface CircuitBreakerConfig {
  /** Number of failures required to open the circuit */
  failureThreshold: number;
  /** Time in milliseconds before attempting to close an open circuit */
  resetTimeout: number;
  /** Number of requests allowed in half-open state */
  halfOpenRequests: number;
  /** Time period in milliseconds for monitoring failures */
  monitoringPeriod: number;
  /** Callback function called when circuit state changes */
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;
}

// Default circuit breaker configuration
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  halfOpenRequests: 3,
  monitoringPeriod: 60000 // 1 minute
};

// Retry strategies
export class RetryStrategies {
  // Exponential backoff with jitter
  static exponentialBackoff(attempt: number, config: RetryConfig): number {
    const factor = config.factor || 2;
    const delay = Math.min(
      config.initialDelay * Math.pow(factor, attempt - 1),
      config.maxDelay
    );

    if (config.jitter) {
      // Add random jitter (±25% of delay)
      const jitterRange = delay * 0.25;
      const jitter = Math.random() * jitterRange * 2 - jitterRange;
      return Math.max(0, delay + jitter);
    }

    return delay;
  }

  // Linear retry strategy
  static linear(attempt: number, config: RetryConfig): number {
    const delay = Math.min(
      config.initialDelay * attempt,
      config.maxDelay
    );
    return delay;
  }

  // Fixed delay strategy
  static fixed(_attempt: number, config: RetryConfig): number {
    return config.initialDelay;
  }

  // Fibonacci sequence delay
  static fibonacci(attempt: number, config: RetryConfig): number {
    const fib = (n: number): number => {
      if (n <= 1) return n;
      return fib(n - 1) + fib(n - 2);
    };
    
    const delay = Math.min(
      config.initialDelay * fib(attempt),
      config.maxDelay
    );
    return delay;
  }
}

// Circuit breaker implementation
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private readonly config: CircuitBreakerConfig;
  private resetTimer?: NodeJS.Timeout | undefined;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeout) {
        this.transitionToHalfOpen();
      } else {
        throw new DinoAirError(
          'Circuit breaker is OPEN',
          ErrorType.CLIENT,
          'HIGH' as any,
          {
            retryable: false,
            userMessage: 'Service temporarily unavailable. Please try again later.'
          }
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenRequests) {
        this.transitionToClosed();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count after monitoring period
      if (Date.now() - this.lastFailureTime > this.config.monitoringPeriod) {
        this.failures = 0;
      }
    }
  }

  private onFailure(): void {
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      this.failures++;
      if (this.failures >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  private transitionToOpen(): void {
    const oldState = this.state;
    this.state = CircuitState.OPEN;
    this.successCount = 0;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    
    this.resetTimer = setTimeout(() => {
      this.transitionToHalfOpen();
    }, this.config.resetTimeout);

    this.config.onStateChange?.(oldState, this.state);
  }

  private transitionToHalfOpen(): void {
    const oldState = this.state;
    this.state = CircuitState.HALF_OPEN;
    this.successCount = 0;
    this.failures = 0;
    this.config.onStateChange?.(oldState, this.state);
  }

  private transitionToClosed(): void {
    const oldState = this.state;
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }

    this.config.onStateChange?.(oldState, this.state);
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.transitionToClosed();
  }
}

// Strategy type
export type RetryStrategy = 'exponentialBackoff' | 'linear' | 'fixed' | 'fibonacci';

// Retry utility function
export async function retry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  strategy: RetryStrategy = 'exponentialBackoff'
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      if (error instanceof DinoAirError) {
        // Never retry AUTH errors (401 Unauthorized)
        if (error.type === ErrorType.AUTH) {
          throw error;
        }
        
        if (!error.retryable ||
            (finalConfig.retryableErrors &&
             !finalConfig.retryableErrors.includes(error.type))) {
          throw error;
        }
      }
      
      // Check for HTTP 401 status in regular errors
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === finalConfig.maxAttempts) {
        throw error;
      }

      // Calculate delay based on strategy
      let delayMs: number;
      switch (strategy) {
        case 'exponentialBackoff':
          delayMs = RetryStrategies.exponentialBackoff(attempt, finalConfig);
          break;
        case 'linear':
          delayMs = RetryStrategies.linear(attempt, finalConfig);
          break;
        case 'fixed':
          delayMs = RetryStrategies.fixed(attempt, finalConfig);
          break;
        case 'fibonacci':
          delayMs = RetryStrategies.fibonacci(attempt, finalConfig);
          break;
        default:
          delayMs = RetryStrategies.exponentialBackoff(attempt, finalConfig);
      }
      
      // Call onRetry callback if provided
      finalConfig.onRetry?.(error, attempt);

      // Wait before next attempt
      await delay(delayMs);
    }
  }

  throw lastError || new Error('Retry failed');
}

// Utility function to create a delay
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry with circuit breaker
export class RetryWithCircuitBreaker {
  private circuitBreaker: CircuitBreaker;
  private retryConfig: RetryConfig;

  constructor(
    retryConfig: Partial<RetryConfig> = {},
    circuitBreakerConfig: Partial<CircuitBreakerConfig> = {}
  ) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
  }

  async execute<T>(
    fn: () => Promise<T>,
    strategy: RetryStrategy = 'exponentialBackoff'
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return retry(fn, this.retryConfig, strategy);
    });
  }

  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  resetCircuit(): void {
    this.circuitBreaker.reset();
  }
}

// Batch retry for multiple operations
export async function batchRetry<T>(
  operations: Array<() => Promise<T>>,
  config: Partial<RetryConfig> = {},
  strategy: RetryStrategy = 'exponentialBackoff'
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
  const results = await Promise.allSettled(
    operations.map(op => retry(op, config, strategy))
  );

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return { success: true, result: result.value };
    } else {
      return { success: false, error: result.reason };
    }
  });
}

// Decorator for retry logic (for use with TypeScript decorators)
export function withRetry(
  config: Partial<RetryConfig> = {},
  strategy: RetryStrategy = 'exponentialBackoff'
) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retry(
        () => originalMethod.apply(this, args),
        config,
        strategy
      );
    };

    return descriptor;
  };
}
