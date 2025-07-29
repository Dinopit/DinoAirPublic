'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import MemoryMonitor from './memory-monitor';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableMemoryMonitoring?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

interface ErrorReport {
  timestamp: string;
  userAgent: string;
  url: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo: {
    componentStack: string;
  };
  memoryInfo?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  retryCount: number;
  errorId: string;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: Props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Generate comprehensive error report
    const errorReport = this.generateErrorReport(error, errorInfo);

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Enhanced Error Boundary - Error Caught');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Report:', errorReport);
      console.groupEnd();
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Store error in local storage for debugging
    this.storeErrorReport(errorReport);

    // Send error to monitoring service (if configured)
    this.reportError(errorReport);
  }

  generateErrorReport(error: Error, errorInfo: ErrorInfo): ErrorReport {
    const memoryInfo = this.getMemoryInfo();

    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      memoryInfo,
      retryCount: this.state.retryCount,
      errorId: this.state.errorId,
    };
  }

  getMemoryInfo() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return undefined;
  }

  storeErrorReport(errorReport: ErrorReport) {
    try {
      const storedErrors = localStorage.getItem('dinoair-errors') || '[]';
      const errors = JSON.parse(storedErrors);

      // Keep only last 10 errors
      const updatedErrors = [...errors, errorReport].slice(-10);

      localStorage.setItem('dinoair-errors', JSON.stringify(updatedErrors));
    } catch (e) {
      console.warn('Failed to store error report:', e);
    }
  }

  async reportError(errorReport: ErrorReport) {
    // Send error to monitoring service
    try {
      await fetch('/api/v1/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });
    } catch (e) {
      // Fail silently - error reporting shouldn't break the app further
      console.warn('Failed to report error to monitoring service:', e);
    }
  }

  handleRetry = () => {
    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
      } catch (e) {
        // Ignore GC errors
      }
    }

    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  copyErrorToClipboard = async () => {
    if (!this.state.error || !this.state.errorInfo) return;

    const errorReport = this.generateErrorReport(this.state.error, this.state.errorInfo);
    const errorText = JSON.stringify(errorReport, null, 2);

    try {
      await navigator.clipboard.writeText(errorText);
      alert('Error details copied to clipboard');
    } catch (e) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Error details copied to clipboard');
    }
  };

  downloadErrorReport = () => {
    if (!this.state.error || !this.state.errorInfo) return;

    const errorReport = this.generateErrorReport(this.state.error, this.state.errorInfo);
    const blob = new Blob([JSON.stringify(errorReport, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dinoair-error-${this.state.errorId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  componentWillUnmount() {
    // Clean up any pending timeouts
    this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
  }

  getErrorCategory(): string {
    if (!this.state.error) return 'Unknown';

    const errorMessage = this.state.error.message.toLowerCase();

    if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      return 'Memory Error';
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network Error';
    }
    if (errorMessage.includes('script') || errorMessage.includes('module')) {
      return 'Script Error';
    }
    if (errorMessage.includes('permission') || errorMessage.includes('security')) {
      return 'Security Error';
    }

    return 'Application Error';
  }

  getRecoveryTips(): string[] {
    const category = this.getErrorCategory();

    switch (category) {
      case 'Memory Error':
        return [
          'Close other browser tabs to free up memory',
          'Restart your browser',
          'Clear browser cache and cookies',
          'Try using an incognito/private window',
        ];
      case 'Network Error':
        return [
          'Check your internet connection',
          'Disable browser extensions that might block requests',
          'Try refreshing the page',
          'Contact support if the issue persists',
        ];
      case 'Script Error':
        return [
          'Clear your browser cache',
          'Disable browser extensions',
          'Try using a different browser',
          'Ensure JavaScript is enabled',
        ];
      default:
        return [
          'Try refreshing the page',
          'Clear your browser cache',
          'Contact support with the error details',
        ];
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback can be provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorCategory = this.getErrorCategory();
      const recoveryTips = this.getRecoveryTips();
      const memoryInfo = this.getMemoryInfo();

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg border border-red-200">
            {/* Header */}
            <div className="bg-red-500 text-white p-6 rounded-t-lg">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-bold">Something went wrong</h1>
                  <p className="text-red-100">
                    {errorCategory} detected - Error ID: {this.state.errorId}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Error Details */}
              <div>
                <h2 className="text-lg font-semibold mb-2 flex items-center">
                  <Bug className="h-5 w-5 mr-2" />
                  Error Details
                </h2>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="font-mono text-sm text-gray-700">{this.state.error?.message}</p>
                  {this.state.retryCount > 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      Retry attempts: {this.state.retryCount}
                    </p>
                  )}
                </div>
              </div>

              {/* Memory Information */}
              {memoryInfo && this.props.enableMemoryMonitoring && (
                <div>
                  <h3 className="font-semibold mb-2">Memory Usage</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Used:</span>
                        <span className="ml-2 font-mono">
                          {Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024))}MB
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="ml-2 font-mono">
                          {Math.round(memoryInfo.totalJSHeapSize / (1024 * 1024))}MB
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Limit:</span>
                        <span className="ml-2 font-mono">
                          {Math.round(memoryInfo.jsHeapSizeLimit / (1024 * 1024))}MB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recovery Tips */}
              <div>
                <h3 className="font-semibold mb-2">Recovery Tips</h3>
                <ul className="space-y-2">
                  {recoveryTips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span className="text-sm text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </button>

                <button
                  onClick={this.handleReload}
                  className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </button>
              </div>

              {/* Debug Actions */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2 text-sm text-gray-600">Debug Actions</h3>
                <div className="flex gap-2">
                  <button
                    onClick={this.copyErrorToClipboard}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Copy Error
                  </button>
                  <button
                    onClick={this.downloadErrorReport}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Download Report
                  </button>
                </div>
              </div>
            </div>

            {/* Memory Monitor in Development */}
            {process.env.NODE_ENV === 'development' && this.props.enableMemoryMonitoring && (
              <div className="border-t p-4">
                <MemoryMonitor showDetails={true} />
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
