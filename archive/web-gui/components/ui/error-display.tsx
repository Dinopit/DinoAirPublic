'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, ExternalLink, Copy, Wifi, WifiOff } from 'lucide-react';
import type { DinoAirError, ErrorType, ErrorSeverity } from '../../lib/services/error-handler';

interface ErrorDisplayProps {
  error?: DinoAirError | null;
  title?: string;
  variant?: 'inline' | 'card' | 'banner';
  showRetry?: boolean;
  showCopyDetails?: boolean;
  showHelpLink?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  title,
  variant = 'card',
  showRetry = true,
  showCopyDetails = false,
  showHelpLink = true,
  onRetry,
  onDismiss,
  className = '',
}) => {
  if (!error) return null;

  const getSeverityStyles = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          container: 'border-red-300 bg-red-50 dark:bg-red-900/20',
          header: 'text-red-800 dark:text-red-400',
          icon: 'text-red-600 dark:text-red-400',
          button: 'bg-red-600 hover:bg-red-700 text-white',
        };
      case 'HIGH':
        return {
          container: 'border-red-200 bg-red-50 dark:bg-red-900/10',
          header: 'text-red-700 dark:text-red-300',
          icon: 'text-red-500 dark:text-red-400',
          button: 'bg-red-500 hover:bg-red-600 text-white',
        };
      case 'MEDIUM':
        return {
          container: 'border-orange-200 bg-orange-50 dark:bg-orange-900/10',
          header: 'text-orange-700 dark:text-orange-300',
          icon: 'text-orange-500 dark:text-orange-400',
          button: 'bg-orange-500 hover:bg-orange-600 text-white',
        };
      case 'LOW':
        return {
          container: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10',
          header: 'text-yellow-700 dark:text-yellow-300',
          icon: 'text-yellow-500 dark:text-yellow-400',
          button: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        };
      default:
        return {
          container: 'border-gray-200 bg-gray-50 dark:bg-gray-900/10',
          header: 'text-gray-700 dark:text-gray-300',
          icon: 'text-gray-500 dark:text-gray-400',
          button: 'bg-gray-500 hover:bg-gray-600 text-white',
        };
    }
  };

  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case 'NETWORK':
        return <WifiOff className="h-5 w-5" />;
      case 'TIMEOUT':
        return <WifiOff className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const styles = getSeverityStyles(error.severity);

  const copyErrorDetails = async () => {
    const errorDetails = {
      type: error.type,
      message: error.userMessage,
      severity: error.severity,
      context: error.context,
      recoveryActions: error.recoveryActions,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      // You could trigger a toast notification here
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = JSON.stringify(errorDetails, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const renderContent = () => (
    <>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>{getErrorIcon(error.type)}</div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium ${styles.header}`}>{title || 'Error Occurred'}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{error.userMessage}</p>
          {error.type === 'NETWORK' && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <Wifi className="h-3 w-3" />
              <span>Check your internet connection</span>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>

      {/* Recovery Actions */}
      {error.recoveryActions && error.recoveryActions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            What you can try:
          </p>
          <ul className="space-y-1">
            {error.recoveryActions.slice(0, 3).map((action, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
              >
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2">
          {showRetry && error.retryable && onRetry && (
            <button
              onClick={onRetry}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${styles.button}`}
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
          {showCopyDetails && (
            <button
              onClick={copyErrorDetails}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              <Copy className="h-3 w-3" />
              Copy Details
            </button>
          )}
        </div>

        {showHelpLink && (
          <a
            href="/docs/troubleshooting"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Help
          </a>
        )}
      </div>
    </>
  );

  if (variant === 'banner') {
    return (
      <div className={`border-l-4 p-4 ${styles.container} ${className}`} role="alert">
        {renderContent()}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`p-3 ${styles.container} ${className}`} role="alert">
        {renderContent()}
      </div>
    );
  }

  // Default card variant
  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`} role="alert">
      {renderContent()}
    </div>
  );
};

// Specific error components for common scenarios
export const NetworkErrorDisplay: React.FC<
  Omit<ErrorDisplayProps, 'error'> & {
    message?: string;
    onRetry?: () => void;
  }
> = ({ message = 'Connection lost', onRetry, ...props }) => {
  const networkError = {
    type: 'NETWORK' as ErrorType,
    severity: 'HIGH' as ErrorSeverity,
    userMessage: message,
    retryable: true,
    recoveryActions: [
      'Check your internet connection',
      'Try again in a moment',
      'Disable VPN if enabled',
    ],
    context: { timestamp: Date.now() },
    message: 'Network error',
  } as DinoAirError;

  return <ErrorDisplay error={networkError} onRetry={onRetry} {...props} />;
};

export const ValidationErrorDisplay: React.FC<
  Omit<ErrorDisplayProps, 'error'> & {
    message?: string;
    fields?: string[];
  }
> = ({ message = 'Please check your input', fields, ...props }) => {
  const validationError = {
    type: 'VALIDATION' as ErrorType,
    severity: 'LOW' as ErrorSeverity,
    userMessage: message,
    retryable: false,
    recoveryActions: [
      'Check required fields',
      'Verify input format',
      ...(fields ? [`Review: ${fields.join(', ')}`] : []),
    ],
    context: { timestamp: Date.now() },
    message: 'Validation error',
  } as DinoAirError;

  return <ErrorDisplay error={validationError} showRetry={false} {...props} />;
};

export const LoadingErrorDisplay: React.FC<
  Omit<ErrorDisplayProps, 'error'> & {
    resource?: string;
    onRetry?: () => void;
  }
> = ({ resource = 'content', onRetry, ...props }) => {
  const loadingError = {
    type: 'SERVER' as ErrorType,
    severity: 'MEDIUM' as ErrorSeverity,
    userMessage: `Failed to load ${resource}`,
    retryable: true,
    recoveryActions: [
      'Try refreshing the page',
      'Check your connection',
      'Contact support if this persists',
    ],
    context: { timestamp: Date.now() },
    message: 'Loading error',
  } as DinoAirError;

  return <ErrorDisplay error={loadingError} onRetry={onRetry} {...props} />;
};
