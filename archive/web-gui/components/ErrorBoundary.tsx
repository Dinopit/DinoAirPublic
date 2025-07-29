'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ExternalLink, Copy } from 'lucide-react';
import { ErrorHandlerService, DinoAirError, ErrorSeverity } from '../lib/services/error-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: DinoAirError) => void;
}

interface State {
  hasError: boolean;
  dinoAirError: DinoAirError | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private errorHandler = ErrorHandlerService.getInstance();

  public override state: State = {
    hasError: false,
    dinoAirError: null,
    retryCount: 0,
  };

  public static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  public override async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Use the comprehensive error handler service
    const dinoAirError = await this.errorHandler.handleError(error, {
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    this.setState({ dinoAirError });

    // Call custom error handler if provided
    this.props.onError?.(dinoAirError);
  }

  private handleReset = () => {
    this.setState((prevState) => ({
      hasError: false,
      dinoAirError: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private copyErrorDetails = async () => {
    if (!this.state.dinoAirError) return;

    const errorDetails = {
      message: 'An error occurred. Please contact support if the issue persists.', // Redacted for security
      type: this.state.dinoAirError.type,
      severity: this.state.dinoAirError.severity,
      userMessage: this.state.dinoAirError.userMessage,
      context: this.state.dinoAirError.context,
      retryCount: this.state.retryCount,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      alert('Error details copied to clipboard');
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(errorDetails, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Error details copied to clipboard');
    }
  };

  public override render() {
    if (this.state.hasError && this.state.dinoAirError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.dinoAirError;
      const isRetryable = error.retryable && this.state.retryCount < 3;

      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
          <div className="max-w-lg w-full rounded-lg bg-white shadow-lg border">
            {/* Header */}
            <div
              className={`p-6 rounded-t-lg text-white ${
                error.severity === ErrorSeverity.CRITICAL
                  ? 'bg-red-600'
                  : error.severity === ErrorSeverity.HIGH
                    ? 'bg-red-500'
                    : error.severity === ErrorSeverity.MEDIUM
                      ? 'bg-orange-500'
                      : 'bg-yellow-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Something went wrong</h2>
                  <p className="text-sm opacity-90 mt-1">
                    {error.type.replace('_', ' ').toLowerCase()} •
                    {this.state.retryCount > 0 && ` ${this.state.retryCount} retry attempts`}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* User-friendly error message */}
              <div>
                <p className="text-gray-800 font-medium">{error.userMessage}</p>
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-sm text-gray-600 mt-2 font-mono bg-gray-100 p-2 rounded">
                    {error.message}
                  </p>
                )}
              </div>

              {/* Recovery actions */}
              {error.recoveryActions && error.recoveryActions.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-800 mb-2">What you can try:</h3>
                  <ul className="space-y-1">
                    {error.recoveryActions.map((action, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                {isRetryable && (
                  <button
                    onClick={this.handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </button>
                )}

                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </button>
              </div>

              {/* Help and support */}
              <div className="border-t pt-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={this.copyErrorDetails}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    Copy Details
                  </button>
                  <a
                    href="/docs/troubleshooting"
                    className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Help Center
                  </a>
                </div>

                <span className="text-xs text-gray-500">Error ID: {error.context.timestamp}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
