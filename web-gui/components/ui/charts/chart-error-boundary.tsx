'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';

interface IChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface IChartErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | undefined;
  onRetry?: (() => void) | undefined;
}

export class ChartErrorBoundary extends React.Component<
  IChartErrorBoundaryProps,
  IChartErrorBoundaryState
> {
  constructor(props: IChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): IChartErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart Error Boundary caught an error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chart Error</h3>
          <p className="text-sm text-gray-600 text-center mb-4 max-w-md">
            Unable to render chart. This might be due to invalid data or a rendering issue.
          </p>
          {this.props.onRetry && (
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                this.props.onRetry?.();
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </button>
          )}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 text-xs text-gray-500">
              <summary>Error Details (Development)</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-w-md">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export function withChartErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
  onRetry?: () => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ChartErrorBoundary onRetry={onRetry} fallback={fallback}>
        <Component {...props} />
      </ChartErrorBoundary>
    );
  };
}
