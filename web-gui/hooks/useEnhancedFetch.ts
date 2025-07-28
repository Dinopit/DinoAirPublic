import { useCallback, useState } from 'react';
import { useOfflineStatus } from './useOfflineStatus';
import { ErrorHandlerService, DinoAirError } from '../lib/services/error-handler';

interface ToastType {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

// Import the actual toast hook from the toast component
import { useToast } from '../components/ToastProvider';

interface RequestOptions extends RequestInit {
  skipQueue?: boolean;
  retryOnReconnect?: boolean;
  showErrorToast?: boolean;
  errorMessage?: string;
}

interface RequestState {
  loading: boolean;
  error: DinoAirError | null;
  data: any;
}

export const useEnhancedFetch = () => {
  const [state, setState] = useState<RequestState>({
    loading: false,
    error: null,
    data: null,
  });

  const { isOnline, queueRequest } = useOfflineStatus();
  const { addToast } = useToast();
  const errorHandler = ErrorHandlerService.getInstance();

  const enhancedFetch = useCallback(
    async (url: string, options: RequestOptions = {}): Promise<any> => {
      const {
        skipQueue = false,
        retryOnReconnect = true,
        showErrorToast = true,
        errorMessage,
        ...fetchOptions
      } = options;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // If offline and not skipping queue, queue the request
        if (!isOnline && !skipQueue && retryOnReconnect) {
          await queueRequest(url, fetchOptions);

          if (showErrorToast) {
            addToast({
              type: 'info',
              title: 'Request queued',
              message: "Your request has been queued for when you're back online",
            });
          }

          setState((prev) => ({ ...prev, loading: false }));
          return null;
        }

        // If offline and skipping queue, throw network error
        if (!isOnline && skipQueue) {
          const networkError = await errorHandler.handleError(new Error('No internet connection'), {
            endpoint: url,
            method: fetchOptions.method || 'GET',
            additionalData: { offline: true },
          });

          setState((prev) => ({ ...prev, loading: false, error: networkError }));

          if (showErrorToast) {
            addToast({
              type: 'error',
              title: 'Connection Error',
              message: errorMessage || networkError.userMessage,
            });
          }

          throw networkError;
        }

        // Make the actual request
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          const dinoAirError = await errorHandler.handleError(error, {
            endpoint: url,
            method: fetchOptions.method || 'GET',
            additionalData: {
              status: response.status,
              statusText: response.statusText,
            },
          });

          setState((prev) => ({ ...prev, loading: false, error: dinoAirError }));

          if (showErrorToast) {
            addToast({
              type: 'error',
              title: 'Request Failed',
              message: errorMessage || dinoAirError.userMessage,
            });
          }

          throw dinoAirError;
        }

        const data = await response.json();
        setState((prev) => ({ ...prev, loading: false, data }));

        return data;
      } catch (error) {
        // Handle unexpected errors
        if (!(error instanceof DinoAirError)) {
          const dinoAirError = await errorHandler.handleError(error as Error, {
            endpoint: url,
            method: fetchOptions.method || 'GET',
            additionalData: {
              unexpected: true,
              originalError: error,
            },
          });

          setState((prev) => ({ ...prev, loading: false, error: dinoAirError }));

          if (showErrorToast) {
            addToast({
              type: 'error',
              title: 'Unexpected Error',
              message: errorMessage || dinoAirError.userMessage,
            });
          }

          throw dinoAirError;
        }

        throw error;
      }
    },
    [isOnline, queueRequest, addToast, errorHandler]
  );

  const retry = useCallback(() => {
    if (state.error && state.error.retryable) {
      // Clear error and retry the last request
      setState((prev) => ({ ...prev, error: null }));
      // The actual retry logic would depend on storing the last request details
    }
  }, [state.error]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    fetch: enhancedFetch,
    retry,
    clearError,
    isOnline,
  };
};

// Specialized hooks for common API patterns
export const useApiCall = (endpoint: string, options: RequestOptions = {}) => {
  const enhancedFetch = useEnhancedFetch();

  const execute = useCallback(
    (params?: Record<string, any>) => {
      const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
      return enhancedFetch.fetch(url, options);
    },
    [endpoint, options, enhancedFetch]
  );

  return {
    ...enhancedFetch,
    execute,
  };
};

export const useApiMutation = (
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
) => {
  const enhancedFetch = useEnhancedFetch();

  const mutate = useCallback(
    (data?: any, customOptions: RequestOptions = {}) => {
      return enhancedFetch.fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...customOptions.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
        ...customOptions,
      });
    },
    [endpoint, method, enhancedFetch]
  );

  return {
    ...enhancedFetch,
    mutate,
  };
};

// Hook for handling form submissions with enhanced error handling
export const useFormSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<DinoAirError | null>(null);
  const enhancedFetch = useEnhancedFetch();

  const submitForm = useCallback(
    async (url: string, formData: FormData | Record<string, any>, options: RequestOptions = {}) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const body = formData instanceof FormData ? formData : JSON.stringify(formData);

        const headers = formData instanceof FormData ? {} : { 'Content-Type': 'application/json' };

        const result = await enhancedFetch.fetch(url, {
          method: 'POST',
          body,
          headers,
          ...options,
        });

        return result;
      } catch (error) {
        setSubmitError(error as DinoAirError);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [enhancedFetch]
  );

  return {
    submitForm,
    isSubmitting,
    submitError,
    clearSubmitError: () => setSubmitError(null),
  };
};
