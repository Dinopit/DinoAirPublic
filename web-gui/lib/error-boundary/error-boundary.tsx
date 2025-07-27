/**
 * DinoAir Error Boundary and Recovery System for React
 * Provides comprehensive error handling and recovery mechanisms
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RecoveryStrategy {
  IGNORE = 'ignore',
  RETRY = 'retry',
  RELOAD = 'reload',
  FALLBACK = 'fallback',
  REPORT = 'report'
}

export interface ErrorContext {
  errorType: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: string;
  stackTrace?: string | undefined;
  componentStack?: string | undefined;
  component: string;
  userId?: string | undefined;
  sessionId?: string | undefined;
  metadata?: Record<string, any> | undefined;
  recoveryAttempts: number;
}

export interface RecoveryConfig {
  strategy: RecoveryStrategy;
  maxRetries?: number;
  retryDelay?: number;
  fallbackComponent?: React.ComponentType<{ error: Error }>;
  onRecoveryFailure?: (context: ErrorContext) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorContext: ErrorContext | null;
  retryCount: number;
}

interface ErrorBoundaryProps {
  component: string;
  severity?: ErrorSeverity | undefined;
  recovery?: RecoveryConfig | undefined;
  onError?: ((context: ErrorContext) => void) | undefined;
  onRecovery?: ((context: ErrorContext) => void) | undefined;
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId?: NodeJS.Timeout;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorContext: null,
      retryCount: 0
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }
  
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { component, severity = ErrorSeverity.MEDIUM, onError } = this.props;
    
    // Create error context
    const errorContext: ErrorContext = {
      errorType: error.name,
      message: error.message,
      severity,
      timestamp: new Date().toISOString(),
      stackTrace: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      component,
      sessionId: this.getSessionId(),
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      recoveryAttempts: this.state.retryCount
    };
    
    // Log error
    this.logError(errorContext);
    
    // Save error context
    this.setState({ errorInfo, errorContext });
    
    // Call error handler
    if (onError) {
      onError(errorContext);
    }
    
    // Send error to server
    this.reportError(errorContext);
    
    // Attempt recovery
    this.attemptRecovery(errorContext);
  }
  
  override componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }
  
  private getSessionId(): string {
    // Get or create session ID
    let sessionId = sessionStorage.getItem('dinoair_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('dinoair_session_id', sessionId);
    }
    return sessionId;
  }
  
  private logError(context: ErrorContext) {
    const message = `Error in ${context.component}: ${context.message}`;
    const details = [
      '\nStack:', context.stackTrace,
      '\nComponent Stack:', context.componentStack
    ];
    
    switch (context.severity) {
      case ErrorSeverity.LOW:
        console.info(message, ...details);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(message, ...details);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        console.error(message, ...details);
        break;
    }
  }
  
  private async reportError(context: ErrorContext) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  }
  
  private attemptRecovery(context: ErrorContext) {
    const { recovery = { strategy: RecoveryStrategy.FALLBACK }, onRecovery } = this.props;
    
    switch (recovery.strategy) {
      case RecoveryStrategy.RETRY:
        this.handleRetryRecovery(context, recovery);
        break;
        
      case RecoveryStrategy.RELOAD:
        this.handleReloadRecovery();
        break;
        
      case RecoveryStrategy.IGNORE:
        // Just log and continue
        if (onRecovery) onRecovery(context);
        break;
        
      case RecoveryStrategy.FALLBACK:
      case RecoveryStrategy.REPORT:
      default:
        // Show fallback UI
        break;
    }
  }
  
  private handleRetryRecovery(context: ErrorContext, config: RecoveryConfig) {
    const maxRetries = config.maxRetries || 3;
    const retryDelay = config.retryDelay || 1000;
    
    if (this.state.retryCount < maxRetries) {
      this.retryTimeoutId = setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          errorInfo: null,
          errorContext: null,
          retryCount: prevState.retryCount + 1
        }));
      }, retryDelay * Math.pow(2, this.state.retryCount)); // Exponential backoff
    } else if (config.onRecoveryFailure) {
      config.onRecoveryFailure(context);
    }
  }
  
  private handleReloadRecovery() {
    // Reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }
  
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorContext: null,
      retryCount: 0
    });
  };
  
  override render() {
    if (this.state.hasError && this.state.error) {
      const { recovery = { strategy: RecoveryStrategy.FALLBACK } } = this.props;
      
      // Use custom fallback component if provided
      if (recovery.fallbackComponent) {
        const FallbackComponent = recovery.fallbackComponent;
        return <FallbackComponent error={this.state.error} />;
      }
      
      // Default fallback UI
      return (
        <div className="error-boundary-fallback p-8 max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Something went wrong
            </h2>
            <p className="text-red-600 mb-4">
              {this.state.error.message}
            </p>
            
            {this.state.errorContext?.severity === ErrorSeverity.HIGH && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                  Technical details
                </summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

/**
 * Hook for error handling in functional components
 */
export function useErrorHandler(_component: string) {
  const [error, setError] = React.useState<Error | null>(null);
  
  const resetError = React.useCallback(() => {
    setError(null);
  }, []);
  
  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);
  
  // Throw error to nearest boundary
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  return { captureError, resetError };
}

/**
 * Async error boundary for handling errors in async operations
 */
export function useAsyncError() {
  const [, setError] = React.useState();
  
  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError]
  );
}

/**
 * Error boundary provider for global error handling
 */
interface ErrorProviderProps {
  children: ReactNode;
  onError?: ((context: ErrorContext) => void) | undefined;
}

export function ErrorProvider({ children, onError }: ErrorProviderProps) {
  return (
    <ErrorBoundary
      component="root"
      severity={ErrorSeverity.HIGH}
      recovery={{
        strategy: RecoveryStrategy.RETRY,
        maxRetries: 3,
        onRecoveryFailure: (context) => {
          console.error('Recovery failed:', context);
          // Could trigger a full app reload or show maintenance page
        }
      }}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Default fallback components
 */
export const ErrorFallback = {
  Default: ({ error }: { error: Error }) => (
    <div className="p-4 bg-red-50 border border-red-200 rounded">
      <h3 className="text-red-800 font-semibold">Error</h3>
      <p className="text-red-600">{error.message}</p>
    </div>
  ),
  
  Minimal: ({ error: _error }: { error: Error }) => (
    <div className="text-red-600 text-sm">
      Something went wrong. Please try again.
    </div>
  ),
  
  Detailed: ({ error }: { error: Error }) => (
    <div className="p-6 bg-white shadow-lg rounded-lg max-w-lg mx-auto">
      <div className="flex items-center mb-4">
        <svg className="w-6 h-6 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold">An error occurred</h3>
      </div>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={() => window.location.reload()}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Reload Page
      </button>
    </div>
  )
};

/**
 * HOC for adding error boundary to components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary
      component={Component.displayName || Component.name || 'Unknown'}
      {...errorBoundaryProps}
    >
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
