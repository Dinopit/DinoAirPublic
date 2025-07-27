import { NextRequest, NextResponse } from 'next/server';

// Error classification types
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTH = 'AUTH',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

// Error severity levels
export enum ErrorSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

// Error context interface
export interface ErrorContext {
  userId?: string | undefined;
  sessionId?: string | undefined;
  requestId?: string | undefined;
  endpoint?: string | undefined;
  method?: string | undefined;
  timestamp: number;
  userAgent?: string | undefined;
  additionalData?: Record<string, any> | undefined;
}

// Enhanced error class
export class DinoAirError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly originalError?: Error | undefined;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly recoveryActions?: string[];

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options?: {
      originalError?: Error | undefined;
      context?: Partial<ErrorContext> | undefined;
      retryable?: boolean | undefined;
      userMessage?: string | undefined;
      recoveryActions?: string[] | undefined;
    }
  ) {
    super(message);
    this.name = 'DinoAirError';
    this.type = type;
    this.severity = severity;
    this.originalError = options?.originalError;
    this.retryable = options?.retryable ?? this.isRetryableError(type);
    this.userMessage = options?.userMessage || this.getDefaultUserMessage(type);
    this.recoveryActions = options?.recoveryActions || this.getDefaultRecoveryActions(type);
    
    this.context = {
      timestamp: Date.now(),
      ...options?.context
    };

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DinoAirError);
    }
  }

  private isRetryableError(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.RATE_LIMIT,
      ErrorType.SERVER
    ].includes(type);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: 'Connection issue detected. Please check your internet connection.',
      [ErrorType.VALIDATION]: 'Invalid input provided. Please check your data and try again.',
      [ErrorType.AUTH]: 'Authentication failed. Please sign in again.',
      [ErrorType.RATE_LIMIT]: 'Too many requests. Please wait a moment before trying again.',
      [ErrorType.SERVER]: 'Server error occurred. Our team has been notified.',
      [ErrorType.CLIENT]: 'An error occurred. Please refresh and try again.',
      [ErrorType.TIMEOUT]: 'Request timed out. Please try again.',
      [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
    };
    return messages[type];
  }

  private getDefaultRecoveryActions(type: ErrorType): string[] {
    const actions: Record<ErrorType, string[]> = {
      [ErrorType.NETWORK]: ['Check internet connection', 'Try again'],
      [ErrorType.VALIDATION]: ['Review input data', 'Check required fields'],
      [ErrorType.AUTH]: ['Sign in again', 'Reset password'],
      [ErrorType.RATE_LIMIT]: ['Wait before retrying', 'Reduce request frequency'],
      [ErrorType.SERVER]: ['Try again later', 'Contact support'],
      [ErrorType.CLIENT]: ['Refresh page', 'Clear cache'],
      [ErrorType.TIMEOUT]: ['Check connection', 'Try again'],
      [ErrorType.UNKNOWN]: ['Refresh page', 'Contact support']
    };
    return actions[type];
  }
}

// Error classification service
export class ErrorClassificationService {
  static classifyError(error: any): { type: ErrorType; severity: ErrorSeverity } {
    // Already classified
    if (error instanceof DinoAirError) {
      return { type: error.type, severity: error.severity };
    }

    // Network errors
    if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      return { type: ErrorType.NETWORK, severity: ErrorSeverity.HIGH };
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return { type: ErrorType.TIMEOUT, severity: ErrorSeverity.MEDIUM };
    }

    // HTTP status based classification
    if (error.status || error.response?.status) {
      const status = error.status || error.response?.status;
      return this.classifyByHttpStatus(status);
    }

    // Validation errors
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      return { type: ErrorType.VALIDATION, severity: ErrorSeverity.LOW };
    }

    // Default
    return { type: ErrorType.UNKNOWN, severity: ErrorSeverity.MEDIUM };
  }

  private static classifyByHttpStatus(status: number): { type: ErrorType; severity: ErrorSeverity } {
    if (status >= 400 && status < 500) {
      switch (status) {
        case 401:
        case 403:
          return { type: ErrorType.AUTH, severity: ErrorSeverity.HIGH };
        case 429:
          return { type: ErrorType.RATE_LIMIT, severity: ErrorSeverity.MEDIUM };
        case 400:
        case 422:
          return { type: ErrorType.VALIDATION, severity: ErrorSeverity.LOW };
        default:
          return { type: ErrorType.CLIENT, severity: ErrorSeverity.MEDIUM };
      }
    } else if (status >= 500) {
      return { type: ErrorType.SERVER, severity: ErrorSeverity.CRITICAL };
    }
    return { type: ErrorType.UNKNOWN, severity: ErrorSeverity.MEDIUM };
  }
}

// Error handler callbacks
export type ErrorHandler = (error: DinoAirError) => void | Promise<void>;

// Main error handling service
export class ErrorHandlerService {
  private static instance: ErrorHandlerService;
  private handlers: Map<ErrorType, ErrorHandler[]> = new Map();
  private globalHandlers: ErrorHandler[] = [];
  private errorHistory: DinoAirError[] = [];
  private readonly maxHistorySize = 50;

  private constructor() {
    // Setup global error handlers
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorHandlerService {
    if (!ErrorHandlerService.instance) {
      ErrorHandlerService.instance = new ErrorHandlerService();
    }
    return ErrorHandlerService.instance;
  }

  // Process and handle errors
  async handleError(error: any, context?: Partial<ErrorContext>): Promise<DinoAirError> {
    // Classify the error
    const { type, severity } = ErrorClassificationService.classifyError(error);

    // Create or enhance error
    const dinoAirError = error instanceof DinoAirError
      ? error
      : new DinoAirError(
          error.message || 'An error occurred',
          type,
          severity,
          {
            originalError: error instanceof Error ? error : undefined,
            context,
            userMessage: typeof error.userMessage === 'string' ? error.userMessage : undefined,
            recoveryActions: Array.isArray(error.recoveryActions) ? error.recoveryActions : undefined
          }
        );

    // Add to history
    this.addToHistory(dinoAirError);

    // Log error
    this.logError(dinoAirError);

    // Execute handlers
    await this.executeHandlers(dinoAirError);

    return dinoAirError;
  }

  // Register error handlers
  registerHandler(handler: ErrorHandler, type?: ErrorType): void {
    if (type) {
      const handlers = this.handlers.get(type) || [];
      handlers.push(handler);
      this.handlers.set(type, handlers);
    } else {
      this.globalHandlers.push(handler);
    }
  }

  // Remove error handler
  removeHandler(handler: ErrorHandler, type?: ErrorType): void {
    if (type) {
      const handlers = this.handlers.get(type) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.handlers.set(type, handlers);
      }
    } else {
      const index = this.globalHandlers.indexOf(handler);
      if (index > -1) {
        this.globalHandlers.splice(index, 1);
      }
    }
  }

  // Get error history
  getErrorHistory(): DinoAirError[] {
    return [...this.errorHistory];
  }

  // Clear error history
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  // Get errors by type
  getErrorsByType(type: ErrorType): DinoAirError[] {
    return this.errorHistory.filter(error => error.type === type);
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorSeverity): DinoAirError[] {
    return this.errorHistory.filter(error => error.severity === severity);
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          additionalData: { source: 'unhandledrejection' }
        });
      });

      // Handle global errors
      window.addEventListener('error', (event) => {
        this.handleError(event.error || new Error(event.message), {
          additionalData: { 
            source: 'window.error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      });
    }
  }

  private addToHistory(error: DinoAirError): void {
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  private logError(error: DinoAirError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.type}] ${error.message}`;
    const logData = {
      error: error.originalError,
      context: error.context,
      stack: error.stack
    };

    switch (logLevel) {
      case 'error':
        console.error(logMessage, logData);
        break;
      case 'warn':
        console.warn(logMessage, logData);
        break;
      case 'info':
        console.info(logMessage, logData);
        break;
      default:
        console.log(logMessage, logData);
    }
  }

  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'log';
    }
  }

  private async executeHandlers(error: DinoAirError): Promise<void> {
    // Execute type-specific handlers
    const typeHandlers = this.handlers.get(error.type) || [];
    for (const handler of typeHandlers) {
      try {
        await handler(error);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }

    // Execute global handlers
    for (const handler of this.globalHandlers) {
      try {
        await handler(error);
      } catch (handlerError) {
        console.error('Error in global error handler:', handlerError);
      }
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandlerService.getInstance();

export function withErrorHandler<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      const dinoAirError = await errorHandler.handleError(error, {
        endpoint: request.url,
        method: request.method,
        requestId: request.headers.get('x-request-id') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined
      });

      return NextResponse.json(
        {
          error: dinoAirError.userMessage,
          type: dinoAirError.type,
          recoveryActions: dinoAirError.recoveryActions
        },
        { status: dinoAirError.type === ErrorType.SERVER ? 500 : 400 }
      );
    }
  };
}
