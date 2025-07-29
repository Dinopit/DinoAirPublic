/**
 * User-Friendly Error Handler
 * Transforms technical errors into actionable user messages
 */

class ErrorHandler {
  constructor() {
    this.retryCallbacks = new Map();
    this.init();
  }

  init() {
    // Listen for global unhandled errors
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason);
    });
  }

  /**
   * Handle and display user-friendly error messages
   * @param {Error|Object} error - The error to handle
   * @param {Object} options - Display options
   */
  handleError(error, options = {}) {
    const errorInfo = this.parseError(error);
    const userMessage = this.getUserFriendlyMessage(errorInfo);
    
    this.displayError(userMessage, {
      type: errorInfo.type,
      retryable: errorInfo.retryable,
      retryCallback: options.retryCallback,
      ...options
    });

    // Log technical details for debugging
    console.error('Technical error details:', {
      originalError: error,
      parsedError: errorInfo,
      userMessage
    });
  }

  /**
   * Parse error into structured information
   */
  parseError(error) {
    const errorInfo = {
      type: 'unknown',
      code: null,
      message: 'An unexpected error occurred',
      retryable: false,
      autoRetry: false
    };

    if (!error) {
      return errorInfo;
    }

    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorInfo.type = 'network';
      errorInfo.retryable = true;
      errorInfo.autoRetry = true;
    }

    // Handle abort errors
    if (error.name === 'AbortError') {
      errorInfo.type = 'cancelled';
      errorInfo.retryable = true;
    }

    // Handle HTTP errors
    if (error.status) {
      errorInfo.code = error.status;
      switch (error.status) {
        case 401:
          errorInfo.type = 'authentication';
          errorInfo.retryable = false;
          break;
        case 403:
          errorInfo.type = 'permission';
          errorInfo.retryable = false;
          break;
        case 404:
          errorInfo.type = 'not_found';
          errorInfo.retryable = false;
          break;
        case 429:
          errorInfo.type = 'rate_limit';
          errorInfo.retryable = true;
          errorInfo.autoRetry = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorInfo.type = 'server';
          errorInfo.retryable = true;
          errorInfo.autoRetry = true;
          break;
        default:
          errorInfo.type = 'http';
          errorInfo.retryable = error.status >= 500;
      }
    }

    // Handle API-specific errors
    if (error.category) {
      switch (error.category) {
        case 'service_unavailable':
          errorInfo.type = 'service_offline';
          errorInfo.retryable = true;
          errorInfo.autoRetry = true;
          break;
        case 'chat_error':
          errorInfo.type = 'chat_service';
          errorInfo.retryable = true;
          break;
        case 'processing_error':
          errorInfo.type = 'processing';
          errorInfo.retryable = true;
          break;
      }
    }

    return errorInfo;
  }

  /**
   * Generate user-friendly error messages
   */
  getUserFriendlyMessage(errorInfo) {
    const messages = {
      network: {
        title: 'Connection Problem',
        message: 'Unable to connect to DinoAir. Please check your internet connection.',
        action: 'Try again',
        details: 'This usually happens when your internet connection is unstable or the service is temporarily unavailable.'
      },
      authentication: {
        title: 'Login Required',
        message: 'You need to log in to continue using DinoAir.',
        action: 'Log in',
        details: 'Your session may have expired. Please log in again to continue.'
      },
      permission: {
        title: 'Access Denied',
        message: 'You don\'t have permission to perform this action.',
        action: 'Contact support',
        details: 'If you believe this is an error, please contact support for assistance.'
      },
      rate_limit: {
        title: 'Too Many Requests',
        message: 'You\'re sending messages too quickly. Please wait a moment.',
        action: 'Wait and try again',
        details: 'To ensure fair usage, there\'s a limit on how many messages you can send per minute.'
      },
      service_offline: {
        title: 'AI Service Unavailable',
        message: 'The AI chat service is temporarily down. We\'re working to restore it.',
        action: 'Try again in a few minutes',
        details: 'Our AI models are currently being updated or experiencing high demand.'
      },
      chat_service: {
        title: 'Chat Error',
        message: 'There was a problem processing your message.',
        action: 'Try rephrasing your message',
        details: 'The AI service encountered an issue. Try sending a shorter or simpler message.'
      },
      processing: {
        title: 'Processing Error',
        message: 'We couldn\'t process your request right now.',
        action: 'Try again',
        details: 'This is usually temporary. Please try your request again.'
      },
      server: {
        title: 'Server Error',
        message: 'DinoAir is experiencing technical difficulties.',
        action: 'Try again in a moment',
        details: 'Our servers are having issues. We\'re working to fix this quickly.'
      },
      cancelled: {
        title: 'Request Cancelled',
        message: 'Your request was cancelled.',
        action: 'Try again',
        details: 'The request was stopped before completion.'
      },
      not_found: {
        title: 'Not Found',
        message: 'The requested resource couldn\'t be found.',
        action: 'Go back',
        details: 'The page or feature you\'re looking for might have been moved or removed.'
      },
      unknown: {
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred.',
        action: 'Try again',
        details: 'If this problem persists, please refresh the page or contact support.'
      }
    };

    return messages[errorInfo.type] || messages.unknown;
  }

  /**
   * Display error message to user
   */
  displayError(messageData, options = {}) {
    // Remove any existing error notifications
    this.clearErrors();

    const errorContainer = this.createErrorElement(messageData, options);
    
    // Add to page
    const targetContainer = options.container || document.body;
    if (options.inline) {
      targetContainer.appendChild(errorContainer);
    } else {
      this.showErrorToast(errorContainer);
    }

    // Auto-hide after delay if specified
    if (options.autoHide !== false) {
      setTimeout(() => {
        this.hideError(errorContainer);
      }, options.duration || 8000);
    }

    // Auto-retry if applicable
    if (options.retryCallback && messageData.autoRetry) {
      setTimeout(() => {
        this.autoRetry(options.retryCallback, errorContainer);
      }, 3000);
    }
  }

  /**
   * Create error UI element
   */
  createErrorElement(messageData, options) {
    const errorEl = document.createElement('div');
    errorEl.className = `error-notification ${options.type || 'error'}`;
    errorEl.setAttribute('role', 'alert');
    errorEl.setAttribute('aria-live', 'polite');

    const retryId = Math.random().toString(36).substr(2, 9);
    
    errorEl.innerHTML = `
      <div class="error-content">
        <div class="error-icon">
          ${this.getErrorIcon(options.type)}
        </div>
        <div class="error-text">
          <h4 class="error-title">${messageData.title}</h4>
          <p class="error-message">${messageData.message}</p>
          ${messageData.details ? `<details class="error-details">
            <summary>More details</summary>
            <p>${messageData.details}</p>
          </details>` : ''}
        </div>
        <div class="error-actions">
          ${options.retryCallback ? `
            <button class="btn btn-sm btn-primary" data-retry="${retryId}">
              ${messageData.action}
            </button>
          ` : ''}
          <button class="btn btn-sm btn-secondary error-dismiss">
            Dismiss
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    if (options.retryCallback) {
      this.retryCallbacks.set(retryId, options.retryCallback);
      errorEl.querySelector(`[data-retry="${retryId}"]`).addEventListener('click', () => {
        this.retry(retryId, errorEl);
      });
    }

    errorEl.querySelector('.error-dismiss').addEventListener('click', () => {
      this.hideError(errorEl);
    });

    return errorEl;
  }

  /**
   * Get appropriate icon for error type
   */
  getErrorIcon(type) {
    const icons = {
      network: '🌐',
      authentication: '🔐',
      permission: '⛔',
      rate_limit: '⏱️',
      service_offline: '🔧',
      chat_service: '💬',
      processing: '⚙️',
      server: '🖥️',
      cancelled: '❌',
      not_found: '❓',
      unknown: '⚠️'
    };
    return icons[type] || icons.unknown;
  }

  /**
   * Show error as toast notification
   */
  showErrorToast(errorEl) {
    const toastContainer = this.getOrCreateToastContainer();
    toastContainer.appendChild(errorEl);
    
    // Animate in
    requestAnimationFrame(() => {
      errorEl.classList.add('show');
    });
  }

  /**
   * Get or create toast container
   */
  getOrCreateToastContainer() {
    let container = document.getElementById('error-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'error-toast-container';
      container.className = 'error-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Hide error notification
   */
  hideError(errorEl) {
    errorEl.classList.add('hiding');
    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.parentNode.removeChild(errorEl);
      }
    }, 300);
  }

  /**
   * Retry action
   */
  retry(retryId, errorEl) {
    const callback = this.retryCallbacks.get(retryId);
    if (callback) {
      this.hideError(errorEl);
      callback();
      this.retryCallbacks.delete(retryId);
    }
  }

  /**
   * Auto-retry with countdown
   */
  autoRetry(callback, errorEl) {
    const retryBtn = errorEl.querySelector('[data-retry]');
    if (!retryBtn) return;

    let countdown = 3;
    const originalText = retryBtn.textContent;
    
    const countdownInterval = setInterval(() => {
      retryBtn.textContent = `Retrying in ${countdown}...`;
      countdown--;
      
      if (countdown < 0) {
        clearInterval(countdownInterval);
        retryBtn.textContent = 'Retrying...';
        this.hideError(errorEl);
        callback();
      }
    }, 1000);
  }

  /**
   * Clear all error notifications
   */
  clearErrors() {
    const container = document.getElementById('error-toast-container');
    if (container) {
      container.innerHTML = '';
    }
    
    // Clear inline errors
    const inlineErrors = document.querySelectorAll('.error-notification');
    inlineErrors.forEach(error => {
      if (error.parentNode) {
        error.parentNode.removeChild(error);
      }
    });
  }

  /**
   * Handle global uncaught errors
   */
  handleGlobalError(error) {
    // Only show user-friendly errors for certain types
    if (error && (error.name === 'TypeError' || error.status)) {
      this.handleError(error, { autoHide: true, duration: 5000 });
    }
  }
}

// Create global instance
window.errorHandler = new ErrorHandler();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}