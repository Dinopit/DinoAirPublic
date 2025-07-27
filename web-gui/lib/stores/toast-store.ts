import { create } from 'zustand';

import type { DinoAirError} from '../services/error-handler';
import { ErrorSeverity } from '../services/error-handler';

// Toast types
export type ToastType = 'error' | 'warning' | 'success' | 'info';

// Toast priority levels (higher number = higher priority)
export enum ToastPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

// Toast action interface
export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline';
}

// Toast interface
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string | undefined;
  priority: ToastPriority;
  duration?: number | null | undefined; // milliseconds, null for persistent
  actions?: ToastAction[] | undefined;
  closable?: boolean | undefined;
  timestamp: number;
  onClose?: (() => void) | undefined;
}

// Toast store configuration
export interface ToastStoreConfig {
  maxToasts: number;
  defaultDuration: number;
  defaultPriority: ToastPriority;
}

// Default configuration
const DEFAULT_CONFIG: ToastStoreConfig = {
  maxToasts: 5,
  defaultDuration: 5000, // 5 seconds
  defaultPriority: ToastPriority.MEDIUM
};

// Toast store state
interface ToastStoreState {
  toasts: Toast[];
  config: ToastStoreConfig;
  activeTimers: Map<string, NodeJS.Timeout>;
  
  // Actions
  addToast: (toast: Omit<Toast, 'id' | 'timestamp' | 'priority'> & { priority?: ToastPriority }) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  clearAllToasts: () => void;
  clearToastsByType: (type: ToastType) => void;
  
  // Error handling integration
  showError: (error: DinoAirError) => string;
  
  // Configuration
  updateConfig: (config: Partial<ToastStoreConfig>) => void;
}

// Create toast store
export const useToastStore = create<ToastStoreState>((set, get) => ({
  toasts: [],
  config: DEFAULT_CONFIG,
  activeTimers: new Map(),

  addToast: (toastData) => {
    const id = generateToastId();
    const timestamp = Date.now();
    
    const newToast: Toast = {
      ...toastData,
      id,
      timestamp,
      priority: toastData.priority || DEFAULT_CONFIG.defaultPriority,
      duration: toastData.duration !== undefined ? toastData.duration : DEFAULT_CONFIG.defaultDuration,
      closable: toastData.closable !== undefined ? toastData.closable : true
    };

    set((state) => {
      let updatedToasts = [...state.toasts, newToast];
      
      // Sort by priority (highest first) and then by timestamp (newest first)
      updatedToasts.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return b.timestamp - a.timestamp;
      });

      // Enforce max toast limit
      if (updatedToasts.length > state.config.maxToasts) {
        // Remove lowest priority toasts first
        const toastsToRemove = updatedToasts
          .slice(state.config.maxToasts)
          .filter(t => t.priority <= ToastPriority.MEDIUM);

        if (toastsToRemove.length > 0) {
          // Clear timers for removed toasts
          toastsToRemove.forEach(toast => {
            const timer = state.activeTimers.get(toast.id);
            if (timer) {
              clearTimeout(timer);
              state.activeTimers.delete(toast.id);
            }
          });

          // Keep only the toasts within limit
          updatedToasts = updatedToasts.slice(0, state.config.maxToasts);
        }
      }

      // Set auto-dismiss timer if duration is specified and not null
      if (newToast.duration !== null && newToast.duration !== undefined && newToast.duration > 0) {
        const timer = setTimeout(() => {
          get().removeToast(id);
        }, newToast.duration);
        
        state.activeTimers.set(id, timer);
      }

      return { toasts: updatedToasts };
    });

    return id;
  },

  removeToast: (id) => {
    set((state) => {
      // Clear timer if exists
      const timer = state.activeTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        state.activeTimers.delete(id);
      }

      // Find and execute onClose callback
      const toast = state.toasts.find(t => t.id === id);
      if (toast?.onClose) {
        toast.onClose();
      }

      return {
        toasts: state.toasts.filter(t => t.id !== id)
      };
    });
  },

  updateToast: (id, updates) => {
    set((state) => ({
      toasts: state.toasts.map(toast =>
        toast.id === id ? { ...toast, ...updates } : toast
      )
    }));
  },

  clearAllToasts: () => {
    set((state) => {
      // Clear all timers
      state.activeTimers.forEach(timer => clearTimeout(timer));
      state.activeTimers.clear();

      // Execute all onClose callbacks
      state.toasts.forEach(toast => {
        if (toast.onClose) {
          toast.onClose();
        }
      });

      return { toasts: [] };
    });
  },

  clearToastsByType: (type) => {
    set((state) => {
      const toastsToRemove = state.toasts.filter(t => t.type === type);
      
      // Clear timers for removed toasts
      toastsToRemove.forEach(toast => {
        const timer = state.activeTimers.get(toast.id);
        if (timer) {
          clearTimeout(timer);
          state.activeTimers.delete(toast.id);
        }
        
        // Execute onClose callback
        if (toast.onClose) {
          toast.onClose();
        }
      });

      return {
        toasts: state.toasts.filter(t => t.type !== type)
      };
    });
  },

  showError: (error) => {
    const priority = mapSeverityToPriority(error.severity);
    const type = getToastTypeFromError(error);
    
    const toastId = get().addToast({
      type,
      title: error.userMessage || error.message,
      message: error.recoveryActions?.join(' • '),
      priority,
      duration: priority >= ToastPriority.HIGH ? null : undefined, // Persistent for high priority
      actions: error.recoveryActions?.map(action => ({
        label: action,
        onClick: () => {
          // Default action is to dismiss the toast
          get().removeToast(toastId);
        }
      }))
    });

    return toastId;
  },

  updateConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config }
    }));
  }
}));

// Helper functions
function generateToastId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function mapSeverityToPriority(severity: ErrorSeverity): ToastPriority {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return ToastPriority.CRITICAL;
    case ErrorSeverity.HIGH:
      return ToastPriority.HIGH;
    case ErrorSeverity.MEDIUM:
      return ToastPriority.MEDIUM;
    case ErrorSeverity.LOW:
      return ToastPriority.LOW;
    default:
      return ToastPriority.MEDIUM;
  }
}

function getToastTypeFromError(error: DinoAirError): ToastType {
  switch (error.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warning';
    default:
      return 'info';
  }
}

// Convenience functions
export const toast = {
  error: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({
      type: 'error',
      title,
      message,
      priority: ToastPriority.HIGH,
      ...options
    });
  },

  warning: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({
      type: 'warning',
      title,
      message,
      priority: ToastPriority.MEDIUM,
      ...options
    });
  },

  success: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({
      type: 'success',
      title,
      message,
      priority: ToastPriority.LOW,
      ...options
    });
  },

  info: (title: string, message?: string, options?: Partial<Toast>) => {
    return useToastStore.getState().addToast({
      type: 'info',
      title,
      message,
      priority: ToastPriority.LOW,
      ...options
    });
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    const toastId = useToastStore.getState().addToast({
      type: 'info',
      title: messages.loading,
      duration: null, // Persistent while loading
      closable: false
    });

    promise
      .then((data) => {
        useToastStore.getState().updateToast(toastId, {
          type: 'success',
          title: typeof messages.success === 'function' ? messages.success(data) : messages.success,
          duration: DEFAULT_CONFIG.defaultDuration,
          closable: true
        });
      })
      .catch((error) => {
        useToastStore.getState().updateToast(toastId, {
          type: 'error',
          title: typeof messages.error === 'function' ? messages.error(error) : messages.error,
          duration: null, // Keep error toasts persistent
          closable: true
        });
      });

    return promise;
  }
};

// Export type helpers
export type ToastStoreType = typeof useToastStore;
export type ToastState = ReturnType<typeof useToastStore.getState>;
