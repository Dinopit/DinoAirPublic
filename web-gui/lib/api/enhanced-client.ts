import { DinoAirError, ErrorType, ErrorContext, errorHandler } from '../services/error-handler';
import { retry, RetryConfig, RetryStrategy, RetryWithCircuitBreaker, CircuitBreakerConfig } from '../utils/retry-strategies';
import { requestDeduplication } from './request-deduplication';
import { useCacheStore, cacheTTL } from '../stores/cache-store';
import { getCurrentCorrelationId, createCorrelationHeaders } from '../correlation/correlation-id';

// Request interceptor type
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

// Response interceptor type
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

// Error interceptor type
export type ErrorInterceptor = (error: any) => any | Promise<any>;

// Request configuration
export interface RequestConfig extends RequestInit {
  url: string;
  retryConfig?: Partial<RetryConfig>;
  retryStrategy?: RetryStrategy;
  useCircuitBreaker?: boolean;
  timeout?: number;
  context?: Partial<ErrorContext>;
  skipErrorHandling?: boolean;
  skipDeduplication?: boolean;
  skipCache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
}

// Enhanced response type
export interface EnhancedResponse<T = any> extends Response {
  data?: T;
  error?: DinoAirError;
}

// API client configuration
export interface ApiClientConfig {
  baseURL?: string;
  defaultHeaders?: HeadersInit;
  defaultRetryConfig?: Partial<RetryConfig>;
  defaultRetryStrategy?: RetryStrategy;
  defaultTimeout?: number;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  requestInterceptors?: RequestInterceptor[];
  responseInterceptors?: ResponseInterceptor[];
  errorInterceptors?: ErrorInterceptor[];
}

// Enhanced API client
export class EnhancedApiClient {
  private config: ApiClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private circuitBreaker?: RetryWithCircuitBreaker;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: '',
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
      defaultRetryConfig: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 30000,
      },
      defaultRetryStrategy: 'exponentialBackoff',
      defaultTimeout: 30000,
      ...config,
    };

    // Initialize interceptors
    this.requestInterceptors = config.requestInterceptors || [];
    this.responseInterceptors = config.responseInterceptors || [];
    this.errorInterceptors = config.errorInterceptors || [];

    // Initialize circuit breaker if configured
    if (config.circuitBreakerConfig || config.defaultRetryConfig) {
      this.circuitBreaker = new RetryWithCircuitBreaker(
        config.defaultRetryConfig,
        config.circuitBreakerConfig
      );
    }
  }

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Add error interceptor
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  // Remove interceptors
  removeRequestInterceptor(interceptor: RequestInterceptor): void {
    const index = this.requestInterceptors.indexOf(interceptor);
    if (index > -1) {
      this.requestInterceptors.splice(index, 1);
    }
  }

  removeResponseInterceptor(interceptor: ResponseInterceptor): void {
    const index = this.responseInterceptors.indexOf(interceptor);
    if (index > -1) {
      this.responseInterceptors.splice(index, 1);
    }
  }

  removeErrorInterceptor(interceptor: ErrorInterceptor): void {
    const index = this.errorInterceptors.indexOf(interceptor);
    if (index > -1) {
      this.errorInterceptors.splice(index, 1);
    }
  }

  // Main request method
  async request<T = any>(config: RequestConfig): Promise<EnhancedResponse<T>> {
    try {
      // Apply request interceptors
      let finalConfig = await this.applyRequestInterceptors(config);

      // Build full URL
      const url = this.buildURL(finalConfig.url);

      // Merge headers
      const headers = this.mergeHeaders(finalConfig.headers);
      
      // Check cache for GET requests
      if (finalConfig.method === 'GET' || !finalConfig.method) {
        if (!finalConfig.skipCache) {
          const cache = useCacheStore.getState();
          const cacheKey = finalConfig.cacheKey || url;
          const cachedData = cache.get<T>(cacheKey);
          
          if (cachedData) {
            // Return cached response
            const cachedResponse = new Response(JSON.stringify(cachedData), {
              status: 200,
              statusText: 'OK',
              headers: new Headers({
                'content-type': 'application/json',
                'x-cache': 'hit'
              })
            }) as EnhancedResponse<T>;
            
            cachedResponse.data = cachedData;
            return cachedResponse;
          }
        }
      }

      // Create request function
      const requestFn = async () => {
        const controller = new AbortController();
        const timeoutId = finalConfig.timeout
          ? setTimeout(() => controller.abort(), finalConfig.timeout)
          : null;

        try {
          const response = await fetch(url, {
            ...finalConfig,
            headers,
            signal: controller.signal,
          });

          if (timeoutId) clearTimeout(timeoutId);

          // Apply response interceptors
          const interceptedResponse = await this.applyResponseInterceptors(response);

          // Check for HTTP errors
          if (!interceptedResponse.ok) {
            throw await this.createHttpError(interceptedResponse, finalConfig);
          }

          // Parse response data
          const enhancedResponse = interceptedResponse as EnhancedResponse<T>;
          
          try {
            const contentType = interceptedResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              enhancedResponse.data = await interceptedResponse.json();
            } else {
              enhancedResponse.data = await interceptedResponse.text() as any;
            }
          } catch (parseError) {
            // If parsing fails, leave data undefined
          }

          // Cache successful GET responses
          if ((finalConfig.method === 'GET' || !finalConfig.method) && !finalConfig.skipCache) {
            const cache = useCacheStore.getState();
            const cacheKey = finalConfig.cacheKey || url;
            const ttl = finalConfig.cacheTTL || cacheTTL.standard;
            
            if (enhancedResponse.data) {
              cache.set(cacheKey, enhancedResponse.data, ttl);
            }
          }

          return enhancedResponse;
        } catch (error: any) {
          if (timeoutId) clearTimeout(timeoutId);
          
          if (error.name === 'AbortError') {
            throw new DinoAirError(
              'Request timeout',
              ErrorType.TIMEOUT,
              'MEDIUM' as any,
              {
                context: finalConfig.context,
                retryable: true,
                userMessage: 'The request took too long. Please try again.',
              }
            );
          }
          throw error;
        }
      };

      // Execute request with deduplication and retry logic
      let response: EnhancedResponse<T>;
      
      // Wrap request with deduplication
      const dedupedRequestFn = () => requestDeduplication.deduplicate(
        url,
        finalConfig,
        requestFn
      );
      
      if (finalConfig.useCircuitBreaker && this.circuitBreaker) {
        response = await this.circuitBreaker.execute(
          dedupedRequestFn,
          finalConfig.retryStrategy || this.config.defaultRetryStrategy!
        );
      } else {
        response = await retry(
          dedupedRequestFn,
          finalConfig.retryConfig || this.config.defaultRetryConfig,
          finalConfig.retryStrategy || this.config.defaultRetryStrategy
        );
      }

      return response;
    } catch (error: any) {
      // Apply error interceptors
      const interceptedError = await this.applyErrorInterceptors(error);

      // Handle error if not skipped
      if (!config.skipErrorHandling) {
        const handledError = await errorHandler.handleError(interceptedError, config.context);
        
        // Create error response
        const errorResponse: EnhancedResponse<T> = new Response(null, {
          status: 500,
          statusText: 'Internal Server Error',
        }) as EnhancedResponse<T>;
        
        errorResponse.error = handledError;
        return errorResponse;
      }

      throw interceptedError;
    }
  }

  // Convenience methods
  async get<T = any>(url: string, config?: Partial<RequestConfig>): Promise<EnhancedResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'GET',
    });
  }

  async post<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<EnhancedResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async put<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<EnhancedResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async patch<T = any>(url: string, data?: any, config?: Partial<RequestConfig>): Promise<EnhancedResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
    });
  }

  async delete<T = any>(url: string, config?: Partial<RequestConfig>): Promise<EnhancedResponse<T>> {
    return this.request<T>({
      ...config,
      url,
      method: 'DELETE',
    });
  }

  // Helper methods
  private buildURL(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.config.baseURL}${url}`;
  }

  private mergeHeaders(headers?: HeadersInit): Headers {
    const merged = new Headers(this.config.defaultHeaders);
    
    // Add correlation ID headers
    const correlationHeaders = createCorrelationHeaders(getCurrentCorrelationId());
    Object.entries(correlationHeaders).forEach(([key, value]) => {
      merged.set(key, value);
    });
    
    if (headers) {
      const headersObj = headers instanceof Headers
        ? headers
        : new Headers(headers);
      
      headersObj.forEach((value, key) => {
        merged.set(key, value);
      });
    }

    return merged;
  }

  private async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let interceptedConfig = config;
    
    for (const interceptor of this.requestInterceptors) {
      interceptedConfig = await interceptor(interceptedConfig);
    }

    return interceptedConfig;
  }

  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let interceptedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      interceptedResponse = await interceptor(interceptedResponse);
    }

    return interceptedResponse;
  }

  private async applyErrorInterceptors(error: any): Promise<any> {
    let interceptedError = error;
    
    for (const interceptor of this.errorInterceptors) {
      interceptedError = await interceptor(interceptedError);
    }

    return interceptedError;
  }

  private async createHttpError(
    response: Response,
    config: RequestConfig
  ): Promise<DinoAirError> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorData: any;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else {
        errorData = await response.text();
      }
    } catch {
      // Ignore parsing errors
    }

    const errorType = this.getErrorTypeFromStatus(response.status);
    
    return new DinoAirError(
      errorMessage,
      errorType,
      'HIGH' as any,
      {
        context: {
          ...config.context,
          endpoint: config.url,
          method: config.method,
          additionalData: {
            status: response.status,
            statusText: response.statusText,
            responseData: errorData,
          },
        },
        retryable: this.isRetryableStatus(response.status),
      }
    );
  }

  private getErrorTypeFromStatus(status: number): ErrorType {
    if (status === 401 || status === 403) return ErrorType.AUTH;
    if (status === 429) return ErrorType.RATE_LIMIT;
    if (status === 400 || status === 422) return ErrorType.VALIDATION;
    if (status >= 500) return ErrorType.SERVER;
    if (status >= 400) return ErrorType.CLIENT;
    return ErrorType.UNKNOWN;
  }

  private isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 429;
  }

  // Get circuit breaker state
  getCircuitBreakerState(): string | undefined {
    return this.circuitBreaker?.getCircuitState();
  }

  // Reset circuit breaker
  resetCircuitBreaker(): void {
    this.circuitBreaker?.resetCircuit();
  }
  
  // Get deduplication stats
  getDeduplicationStats() {
    return requestDeduplication.getStats();
  }
  
  // Clear deduplication cache
  clearDeduplication(): void {
    requestDeduplication.clear();
  }
  
  // Invalidate cache by pattern
  invalidateCache(pattern?: string): void {
    const cache = useCacheStore.getState();
    if (pattern) {
      cache.invalidatePattern(pattern);
    } else {
      cache.clear();
    }
  }
}

// Create default API client instance
export const apiClient = new EnhancedApiClient({
  baseURL: '/api',
  defaultTimeout: 30000,
  defaultRetryConfig: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    jitter: true,
  },
});

// Helper function to create custom API clients
export function createApiClient(config: ApiClientConfig): EnhancedApiClient {
  return new EnhancedApiClient(config);
}
