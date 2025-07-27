/**
 * DinoAir Circuit Breaker Implementation for TypeScript
 * Prevents cascading failures when external services are unavailable
 */

export enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',         // Failing fast
  HALF_OPEN = 'half_open' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold?: number;      // Failures before opening (default: 5)
  successThreshold?: number;      // Successes in half-open before closing (default: 3)
  timeout?: number;              // Request timeout in ms (default: 30000)
  resetTimeout?: number;         // Time before trying half-open in ms (default: 60000)
  
  // Sliding window configuration
  windowSize?: number;           // Window size in ms (default: 60000)
  windowBuckets?: number;        // Number of buckets in window (default: 6)
  
  // Response time tracking
  slowCallDuration?: number;     // Threshold for slow calls in ms (default: 5000)
  slowCallRateThreshold?: number; // Rate of slow calls to open circuit (default: 0.5)
  
  // Error filtering
  isFailure?: (error: any) => boolean; // Custom error filter
  onStateChange?: (from: CircuitState, to: CircuitState, reason: string) => void;
}

interface CircuitStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  rejectedCalls: number;
  slowCalls: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  stateChanges: Array<{
    from: CircuitState;
    to: CircuitState;
    time: string;
    reason: string;
  }>;
}

interface WindowBucket {
  calls: number;
  failures: number;
  slow: number;
}

interface WindowStats {
  totalCalls: number;
  failureRate: number;
  slowRate: number;
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker<T = any> {
  private config: Required<CircuitBreakerConfig>;
  private state: CircuitState = CircuitState.CLOSED;
  private stats: CircuitStats = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    rejectedCalls: 0,
    slowCalls: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0,
    stateChanges: []
  };
  
  private lastStateChange: number = Date.now();
  private halfOpenCalls: number = 0;
  
  // Sliding window
  private windowBuckets: WindowBucket[];
  private currentBucketIdx: number = 0;
  private rotationInterval?: NodeJS.Timeout;
  
  constructor(config: CircuitBreakerConfig) {
    // Set defaults
    this.config = {
      name: config.name,
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 3,
      timeout: config.timeout ?? 30000,
      resetTimeout: config.resetTimeout ?? 60000,
      windowSize: config.windowSize ?? 60000,
      windowBuckets: config.windowBuckets ?? 6,
      slowCallDuration: config.slowCallDuration ?? 5000,
      slowCallRateThreshold: config.slowCallRateThreshold ?? 0.5,
      isFailure: config.isFailure ?? (() => true),
      onStateChange: config.onStateChange ?? (() => {})
    };
    
    // Initialize window buckets
    this.windowBuckets = Array(this.config.windowBuckets).fill(null).map(() => ({
      calls: 0,
      failures: 0,
      slow: 0
    }));
    
    // Start window rotation
    this.startWindowRotation();
  }
  
  private startWindowRotation(): void {
    const rotationTime = this.config.windowSize / this.config.windowBuckets;
    this.rotationInterval = setInterval(() => {
      this.currentBucketIdx = (this.currentBucketIdx + 1) % this.config.windowBuckets;
      this.windowBuckets[this.currentBucketIdx] = {
        calls: 0,
        failures: 0,
        slow: 0
      };
    }, rotationTime);
  }
  
  public stop(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
  }
  
  private getWindowStats(): WindowStats {
    const totals = this.windowBuckets.reduce(
      (acc, bucket) => ({
        calls: acc.calls + bucket.calls,
        failures: acc.failures + bucket.failures,
        slow: acc.slow + bucket.slow
      }),
      { calls: 0, failures: 0, slow: 0 }
    );
    
    const failureRate = totals.calls > 0 ? totals.failures / totals.calls : 0;
    const slowRate = totals.calls > 0 ? totals.slow / totals.calls : 0;
    
    return {
      totalCalls: totals.calls,
      failureRate,
      slowRate
    };
  }
  
  private recordCall(success: boolean, duration: number): void {
    this.stats.totalCalls++;
    
    const bucket = this.windowBuckets[this.currentBucketIdx];
    if (!bucket) return;
    bucket.calls++;
    
    if (success) {
      this.stats.successfulCalls++;
      this.stats.lastSuccessTime = Date.now();
      this.stats.consecutiveSuccesses++;
      this.stats.consecutiveFailures = 0;
    } else {
      this.stats.failedCalls++;
      this.stats.lastFailureTime = Date.now();
      this.stats.consecutiveFailures++;
      this.stats.consecutiveSuccesses = 0;
      if (bucket) bucket.failures++;
    }
    
    if (duration > this.config.slowCallDuration) {
      this.stats.slowCalls++;
      if (bucket) bucket.slow++;
    }
  }
  
  private shouldAllowRequest(): boolean {
    switch (this.state) {
      case CircuitState.CLOSED:
        return true;
        
      case CircuitState.OPEN:
        // Check if we should transition to half-open
        if (Date.now() - this.lastStateChange > this.config.resetTimeout) {
          this.transitionTo(CircuitState.HALF_OPEN, 'Testing recovery');
          return true;
        }
        return false;
        
      case CircuitState.HALF_OPEN:
        // Allow limited requests in half-open state
        if (this.halfOpenCalls < this.config.successThreshold) {
          this.halfOpenCalls++;
          return true;
        }
        return false;
        
      default:
        return false;
    }
  }
  
  private transitionTo(newState: CircuitState, reason: string): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.lastStateChange = Date.now();
      this.halfOpenCalls = 0;
      
      this.stats.stateChanges.push({
        from: oldState,
        to: newState,
        time: new Date().toISOString(),
        reason
      });
      
      // Keep only last 10 state changes
      if (this.stats.stateChanges.length > 10) {
        this.stats.stateChanges.shift();
      }
      
      console.log(`[CircuitBreaker ${this.config.name}] ${oldState} -> ${newState}: ${reason}`);
      this.config.onStateChange(oldState, newState, reason);
    }
  }
  
  private handleSuccess(duration: number): void {
    this.recordCall(true, duration);
    
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.stats.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED, 'Service recovered');
      }
    }
  }
  
  private handleFailure(duration: number, error: any): void {
    // Check if this error should trigger circuit
    if (!this.config.isFailure(error)) {
      return;
    }
    
    this.recordCall(false, duration);
    
    // Check failure threshold
    if (this.stats.consecutiveFailures >= this.config.failureThreshold) {
      this.transitionTo(CircuitState.OPEN, `Failure threshold reached: ${this.stats.consecutiveFailures}`);
      return;
    }
    
    // Check failure rate in window
    const windowStats = this.getWindowStats();
    if (windowStats.totalCalls >= 10) { // Minimum calls for rate calculation
      if (windowStats.failureRate > 0.5) {
        this.transitionTo(CircuitState.OPEN, `High failure rate: ${(windowStats.failureRate * 100).toFixed(1)}%`);
      } else if (windowStats.slowRate > this.config.slowCallRateThreshold) {
        this.transitionTo(CircuitState.OPEN, `High slow call rate: ${(windowStats.slowRate * 100).toFixed(1)}%`);
      }
    }
    
    // If in half-open, single failure opens circuit
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN, 'Failure during recovery test');
    }
  }
  
  public async call<R = T>(
    fn: () => Promise<R> | R,
    fallback?: () => Promise<R> | R
  ): Promise<R> {
    if (!this.shouldAllowRequest()) {
      this.stats.rejectedCalls++;
      
      if (fallback) {
        return fallback();
      }
      
      throw new CircuitOpenError(`Circuit ${this.config.name} is open`);
    }
    
    const startTime = Date.now();
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${this.config.timeout}ms`)), this.config.timeout);
      });
      
      // Race between function and timeout
      const result = await Promise.race([
        Promise.resolve(fn()),
        timeoutPromise
      ]) as R;
      
      const duration = Date.now() - startTime;
      this.handleSuccess(duration);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.handleFailure(duration, error);
      throw error;
    }
  }
  
  public getState(): CircuitState {
    return this.state;
  }
  
  public getStats(): CircuitStats & { state: CircuitState; windowStats: WindowStats } {
    return {
      ...this.stats,
      state: this.state,
      windowStats: this.getWindowStats()
    };
  }
  
  public reset(): void {
    this.state = CircuitState.CLOSED;
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0,
      slowCalls: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      stateChanges: []
    };
    this.lastStateChange = Date.now();
    this.halfOpenCalls = 0;
    
    // Reset buckets
    this.windowBuckets = this.windowBuckets.map(() => ({
      calls: 0,
      failures: 0,
      slow: 0
    }));
    
    console.log(`[CircuitBreaker ${this.config.name}] Manually reset`);
  }
}

/**
 * Circuit breaker decorator for class methods
 */
export function circuitBreaker(config: CircuitBreakerConfig) {
  const breaker = new CircuitBreaker(config);
  
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      return breaker.call(() => originalMethod.apply(this, args));
    };
    
    // Attach breaker for inspection
    (descriptor.value).circuitBreaker = breaker;
    
    return descriptor;
  };
}

/**
 * Pre-configured circuit breakers for DinoAir services
 */
export class DinoAirCircuitBreakers {
  private static comfyUIBreaker?: CircuitBreaker;
  private static ollamaBreaker?: CircuitBreaker;
  private static modelDownloadBreaker?: CircuitBreaker;
  
  static getComfyUIBreaker(): CircuitBreaker {
    if (!this.comfyUIBreaker) {
      this.comfyUIBreaker = new CircuitBreaker({
        name: 'ComfyUI',
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 120000, // 2 minutes for image generation
        resetTimeout: 30000,
        slowCallDuration: 30000,
        slowCallRateThreshold: 0.7,
        isFailure: (error) => {
          // Don't open circuit for user cancellations
          return error?.code !== 'USER_CANCELLED';
        }
      });
    }
    return this.comfyUIBreaker;
  }
  
  static getOllamaBreaker(): CircuitBreaker {
    if (!this.ollamaBreaker) {
      this.ollamaBreaker = new CircuitBreaker({
        name: 'Ollama',
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000, // 1 minute for text generation
        resetTimeout: 20000,
        slowCallDuration: 10000,
        slowCallRateThreshold: 0.5,
        isFailure: (error) => {
          // Don't open circuit for model not found errors
          return error?.status !== 404;
        }
      });
    }
    return this.ollamaBreaker;
  }
  
  static getModelDownloadBreaker(): CircuitBreaker {
    if (!this.modelDownloadBreaker) {
      this.modelDownloadBreaker = new CircuitBreaker({
        name: 'ModelDownload',
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 600000, // 10 minutes for large downloads
        resetTimeout: 120000,
        slowCallDuration: 60000,
        slowCallRateThreshold: 0.8
      });
    }
    return this.modelDownloadBreaker;
  }
  
  static stopAll(): void {
    this.comfyUIBreaker?.stop();
    this.ollamaBreaker?.stop();
    this.modelDownloadBreaker?.stop();
  }
}

/**
 * Example usage with fetch wrapper
 */
export async function fetchWithCircuitBreaker(
  url: string,
  options: RequestInit,
  breaker: CircuitBreaker
): Promise<Response> {
  return breaker.call(async () => {
    const response = await fetch(url, options);
    
    // Consider 5xx errors as failures
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return response;
  });
}

// Export convenience function for API calls
export const protectedFetch = {
  comfyui: (url: string, options: RequestInit) => 
    fetchWithCircuitBreaker(url, options, DinoAirCircuitBreakers.getComfyUIBreaker()),
    
  ollama: (url: string, options: RequestInit) =>
    fetchWithCircuitBreaker(url, options, DinoAirCircuitBreakers.getOllamaBreaker()),
    
  modelDownload: (url: string, options: RequestInit) =>
    fetchWithCircuitBreaker(url, options, DinoAirCircuitBreakers.getModelDownloadBreaker())
};
