'use client';

import React, { useEffect, useRef } from 'react';
import { useToastStore, type Toast, ToastType } from '@/lib/stores/toast-store';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

// Toast notification component
const ToastNotification: React.FC<{ toast: Toast }> = ({ toast }) => {
  const removeToast = useToastStore((state) => state.removeToast);
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add entrance animation
    if (toastRef.current) {
      toastRef.current.style.animation = 'slideIn 0.3s ease-out';
    }
  }, []);

  const handleRemove = () => {
    if (toastRef.current) {
      toastRef.current.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        removeToast(toast.id);
      }, 300);
    } else {
      removeToast(toast.id);
    }
  };

  const getToastIcon = () => {
    switch (toast.type) {
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getToastStyles = () => {
    const baseStyles = "relative flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all duration-300";
    
    switch (toast.type) {
      case 'error':
        return `${baseStyles} bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100`;
      case 'success':
        return `${baseStyles} bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100`;
    }
  };

  const getButtonStyles = (variant?: string) => {
    const baseStyles = "px-3 py-1 text-sm font-medium rounded transition-colors";
    
    if (variant === 'destructive') {
      return `${baseStyles} bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800`;
    }
    
    if (variant === 'outline') {
      return `${baseStyles} border border-current hover:bg-black/5 dark:hover:bg-white/5`;
    }
    
    // Default variant
    switch (toast.type) {
      case 'error':
        return `${baseStyles} bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800`;
      case 'success':
        return `${baseStyles} bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800`;
    }
  };

  return (
    <div
      ref={toastRef}
      className={getToastStyles()}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex-shrink-0 mt-0.5">
        {getToastIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm leading-tight">
          {toast.title}
        </h3>
        
        {toast.message && (
          <p className="mt-1 text-sm opacity-90">
            {toast.message}
          </p>
        )}
        
        {toast.actions && toast.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {toast.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  if (!action.variant || action.variant !== 'outline') {
                    handleRemove();
                  }
                }}
                className={getButtonStyles(action.variant)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {toast.closable && (
        <button
          onClick={handleRemove}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Toast container component
export const ToastNotifications: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure container is always on top
    if (containerRef.current) {
      containerRef.current.style.zIndex = '9999';
    }
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none"
      aria-label="Notifications"
    >
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} />
        </div>
      ))}
    </div>
  );
};

// Hook for programmatic toast usage
export const useToast = () => {
  const { addToast, removeToast, clearAllToasts, showError } = useToastStore();
  
  return {
    addToast,
    removeToast,
    clearAllToasts,
    showError,
  };
};

// Export default component
export default ToastNotifications;