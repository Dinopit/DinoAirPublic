'use client';

import React, { Component, type ReactNode } from 'react';

interface IChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

interface IChartErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: ((error: Error) => void) | undefined;
  maxRetries?: number;
}

export class ChartErrorBoundary extends Component<
  IChartErrorBoundaryProps,
  IChartErrorBoundaryState
> {
  constructor(props: IChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): IChartErrorBoundaryState {
    return { hasError: true, error, retryCount: 0 };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chart rendering error:', error, errorInfo);
    this.props.onError?.(error);
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries ?? 3;
    if (this.state.retryCount < maxRetries) {
      this.setState({
        hasError: false,
        retryCount: this.state.retryCount + 1,
      });
    }
  };

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex flex-col items-center justify-center p-6 border border-red-200 rounded-lg bg-red-50">
            <div className="text-red-600 mb-2">⚠️ Chart Error</div>
            <p className="text-red-600 mb-4 text-center">
              Chart failed to render
              {this.state.error?.message && (
                <span className="block text-sm mt-1 opacity-75">{this.state.error.message}</span>
              )}
            </p>
            {this.state.retryCount < (this.props.maxRetries ?? 3) && (
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry ({this.state.retryCount + 1}/{this.props.maxRetries ?? 3})
              </button>
            )}
            {this.state.retryCount >= (this.props.maxRetries ?? 3) && (
              <p className="text-sm text-red-500">
                Maximum retry attempts reached. Please refresh the page.
              </p>
            )}
          </div>
        )
      );
    }

    return this.props.children;
  }
}
