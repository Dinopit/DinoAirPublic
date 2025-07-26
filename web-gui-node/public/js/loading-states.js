/**
 * Progressive Loading States Management
 * Provides consistent loading indicators and user feedback across the application
 */

class LoadingStateManager {
  constructor() {
    this.activeLoaders = new Map();
    this.defaultOptions = {
      showSpinner: true,
      showProgress: false,
      showMessage: true,
      disableInteraction: true,
      timeout: 30000 // 30 seconds default timeout
    };
  }

  /**
   * Show loading state for a specific element or operation
   */
  show(elementId, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    const element = typeof elementId === 'string' ? document.getElementById(elementId) : elementId;
    
    if (!element) {
      console.warn(`Loading state: Element ${elementId} not found`);
      return;
    }

    const originalState = {
      innerHTML: element.innerHTML,
      disabled: element.disabled,
      classList: [...element.classList]
    };
    
    this.activeLoaders.set(elementId, { element, originalState, config });

    this.applyLoadingState(element, config);

    if (config.timeout > 0) {
      setTimeout(() => {
        if (this.activeLoaders.has(elementId)) {
          this.hide(elementId);
          console.warn(`Loading timeout for ${elementId}`);
        }
      }, config.timeout);
    }
  }

  /**
   * Hide loading state and restore original element state
   */
  hide(elementId) {
    const loaderData = this.activeLoaders.get(elementId);
    if (!loaderData) return;

    const { element, originalState } = loaderData;
    
    element.innerHTML = originalState.innerHTML;
    element.disabled = originalState.disabled;
    element.className = originalState.classList.join(' ');

    this.activeLoaders.delete(elementId);
  }

  /**
   * Update progress for a loading operation
   */
  updateProgress(elementId, progress, message = '') {
    const loaderData = this.activeLoaders.get(elementId);
    if (!loaderData) return;

    const progressBar = loaderData.element.querySelector('.loading-progress-bar');
    const progressText = loaderData.element.querySelector('.loading-progress-text');
    
    if (progressBar) {
      progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
    
    if (progressText && message) {
      progressText.textContent = message;
    }
  }

  /**
   * Apply loading visual state to element
   */
  applyLoadingState(element, config) {
    if (config.disableInteraction) {
      element.disabled = true;
      element.classList.add('loading-disabled');
    }

    let loadingHTML = '<div class="loading-container">';
    
    if (config.showSpinner) {
      loadingHTML += `
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
        </div>
      `;
    }

    if (config.showProgress) {
      loadingHTML += `
        <div class="loading-progress">
          <div class="loading-progress-bar-container">
            <div class="loading-progress-bar" style="width: 0%"></div>
          </div>
          <div class="loading-progress-text"></div>
        </div>
      `;
    }

    if (config.showMessage && config.message) {
      loadingHTML += `<div class="loading-message">${config.message}</div>`;
    }

    loadingHTML += '</div>';

    if (element.tagName === 'BUTTON') {
      element.innerHTML = loadingHTML;
      element.classList.add('loading-button');
    } else if (element.tagName === 'FORM') {
      const overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = loadingHTML;
      element.style.position = 'relative';
      element.appendChild(overlay);
    } else {
      element.innerHTML = loadingHTML;
      element.classList.add('loading-content');
    }
  }

  /**
   * Show loading state for chat messages
   */
  showChatLoading(containerId, message = 'AI is thinking...') {
    this.show(containerId, {
      showSpinner: true,
      showMessage: true,
      message: message,
      disableInteraction: false,
      timeout: 60000 // Longer timeout for chat
    });
  }

  /**
   * Show loading state for file uploads with progress
   */
  showUploadLoading(elementId, filename = '') {
    const message = filename ? `Uploading ${filename}...` : 'Uploading file...';
    this.show(elementId, {
      showSpinner: false,
      showProgress: true,
      showMessage: true,
      message: message,
      disableInteraction: true
    });
  }

  /**
   * Show loading state for API requests
   */
  showApiLoading(elementId, operation = 'Processing') {
    this.show(elementId, {
      showSpinner: true,
      showMessage: true,
      message: `${operation}...`,
      disableInteraction: true,
      timeout: 15000
    });
  }

  /**
   * Check if any loading states are active
   */
  hasActiveLoaders() {
    return this.activeLoaders.size > 0;
  }

  /**
   * Clear all active loading states
   */
  clearAll() {
    for (const elementId of this.activeLoaders.keys()) {
      this.hide(elementId);
    }
  }
}

window.loadingManager = new LoadingStateManager();

window.showButtonLoading = (buttonId, message = 'Loading...') => {
  window.loadingManager.show(buttonId, {
    showSpinner: true,
    showMessage: true,
    message: message,
    disableInteraction: true
  });
};

window.hideButtonLoading = (buttonId) => {
  window.loadingManager.hide(buttonId);
};

window.showFormLoading = (formId, message = 'Processing...') => {
  window.loadingManager.show(formId, {
    showSpinner: true,
    showMessage: true,
    message: message,
    disableInteraction: true
  });
};

window.hideFormLoading = (formId) => {
  window.loadingManager.hide(formId);
};

window.addEventListener('beforeunload', () => {
  window.loadingManager.clearAll();
});
