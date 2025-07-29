'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home, ExternalLink, Copy, Bug } from 'lucide-react';
import { ErrorDisplay } from './error-display';
import { ConnectionStatusBadge, OfflineQueueStatus } from './offline-indicator';
import type { DinoAirError } from '../../lib/services/error-handler';

interface ErrorPageProps {
  error?: DinoAirError | Error | null;
  title?: string;
  description?: string;
  showRetry?: boolean;
  showGoHome?: boolean;
  showContactSupport?: boolean;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  error,
  title = 'Something went wrong',
  description,
  showRetry = true,
  showGoHome = true,
  showContactSupport = true,
  onRetry,
  onGoHome = () => (window.location.href = '/'),
  className = '',
}) => {
  // Convert regular Error to DinoAirError if needed
  const dinoAirError =
    error instanceof Error && !(error as any).type
      ? ({
          message: error.message,
          type: 'UNKNOWN' as const,
          severity: 'MEDIUM' as const,
          userMessage: 'An unexpected error occurred',
          recoveryActions: ['Try refreshing the page', 'Contact support if the issue persists'],
          retryable: true,
          context: { timestamp: Date.now() },
        } as DinoAirError)
      : (error as DinoAirError);

  const copyErrorDetails = async () => {
    if (!dinoAirError) return;

    const errorDetails = {
      message: dinoAirError.userMessage,
      type: dinoAirError.type,
      severity: dinoAirError.severity,
      timestamp: new Date(dinoAirError.context.timestamp).toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
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

  return (
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 ${className}`}
    >
      <div className="max-w-2xl w-full space-y-6">
        {/* Connection Status */}
        <div className="flex justify-center">
          <ConnectionStatusBadge />
        </div>

        {/* Main Error Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
                {description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Error Details */}
          <div className="p-6 space-y-6">
            {dinoAirError && (
              <ErrorDisplay
                error={dinoAirError}
                variant="inline"
                showRetry={false}
                showCopyDetails={false}
                showHelpLink={false}
                className="border-0 bg-transparent p-0"
              />
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {showRetry && dinoAirError?.retryable && onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}

              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>

              {showGoHome && (
                <button
                  onClick={onGoHome}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={copyErrorDetails}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy Error Details
              </button>

              <a
                href="/docs/troubleshooting"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Troubleshooting Guide
              </a>

              {showContactSupport && (
                <a
                  href="/support"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                >
                  <Bug className="w-4 h-4" />
                  Contact Support
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Offline Queue Status */}
        <OfflineQueueStatus />

        {/* Additional Help */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Need more help?</h3>
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p>
              • Check our{' '}
              <a href="/docs" className="underline hover:no-underline">
                documentation
              </a>{' '}
              for common solutions
            </p>
            <p>
              • Visit our{' '}
              <a href="/community" className="underline hover:no-underline">
                community forum
              </a>{' '}
              for discussions
            </p>
            <p>
              • Contact{' '}
              <a href="/support" className="underline hover:no-underline">
                technical support
              </a>{' '}
              for assistance
            </p>
          </div>
        </div>

        {/* Error ID for Support */}
        {dinoAirError && (
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Error ID: {dinoAirError.context.timestamp} • Report this ID when contacting support
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Specialized error pages for common scenarios
export const NetworkErrorPage: React.FC<Omit<ErrorPageProps, 'error'>> = (props) => {
  const networkError = {
    type: 'NETWORK' as const,
    severity: 'HIGH' as const,
    message: 'Network connection failed',
    userMessage: 'Unable to connect to the server',
    retryable: true,
    recoveryActions: [
      'Check your internet connection',
      'Try again in a moment',
      'Disable VPN if enabled',
      'Contact your network administrator',
    ],
    context: { timestamp: Date.now() },
  } as DinoAirError;

  return (
    <ErrorPage
      error={networkError}
      title="Connection Problem"
      description="We're having trouble connecting to our servers"
      {...props}
    />
  );
};

export const MaintenanceErrorPage: React.FC<Omit<ErrorPageProps, 'error'>> = (props) => {
  return (
    <ErrorPage
      title="Scheduled Maintenance"
      description="We're currently performing scheduled maintenance and will be back shortly"
      showRetry={false}
      showContactSupport={false}
      {...props}
    />
  );
};

export const NotFoundErrorPage: React.FC<Omit<ErrorPageProps, 'error'>> = (props) => {
  const notFoundError = {
    type: 'CLIENT' as const,
    severity: 'LOW' as const,
    message: 'Page not found',
    userMessage: "The page you're looking for doesn't exist",
    retryable: false,
    recoveryActions: [
      'Check the URL for typos',
      'Use the navigation menu',
      'Go back to the home page',
      'Search for what you need',
    ],
    context: { timestamp: Date.now() },
  } as DinoAirError;

  return (
    <ErrorPage
      error={notFoundError}
      title="Page Not Found"
      description="Sorry, we couldn't find the page you're looking for"
      showRetry={false}
      {...props}
    />
  );
};
