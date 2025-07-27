/**
 * DinoAir Web GUI - Utility Functions
 * Common utility functions and helpers for the frontend
 */

// API Base URL
const API_BASE = '/api';

/**
 * API Utilities
 */
const API = {
  /**
   * Make an HTTP request
   * @param {string} url - The URL to request
   * @param {Object} options - Request options
   * @returns {Promise<Response>}
   */
  async request(url, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${API_BASE}${url}`, config);
      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },

  /**
   * GET request
   * @param {string} url - The URL to request
   * @param {Object} options - Request options
   * @returns {Promise<any>}
   */
  async get(url, options = {}) {
    const response = await this.request(url, { method: 'GET', ...options });
    return response.json();
  },

  /**
   * POST request
   * @param {string} url - The URL to request
   * @param {any} data - Data to send
   * @param {Object} options - Request options
   * @returns {Promise<any>}
   */
  async post(url, data, options = {}) {
    const response = await this.request(url, {
      method: 'POST',
      body: data,
      ...options
    });
    return response.json();
  },

  /**
   * PUT request
   * @param {string} url - The URL to request
   * @param {any} data - Data to send
   * @param {Object} options - Request options
   * @returns {Promise<any>}
   */
  async put(url, data, options = {}) {
    const response = await this.request(url, {
      method: 'PUT',
      body: data,
      ...options
    });
    return response.json();
  },

  /**
   * DELETE request
   * @param {string} url - The URL to request
   * @param {Object} options - Request options
   * @returns {Promise<any>}
   */
  async delete(url, options = {}) {
    const response = await this.request(url, { method: 'DELETE', ...options });
    return response.json();
  },

  /**
   * Stream request for real-time data
   * @param {string} url - The URL to request
   * @param {any} data - Data to send
   * @param {Function} onChunk - Callback for each chunk
   * @param {Object} options - Request options
   */
  async stream(url, data, onChunk, options = {}) {
    const response = await this.request(url, {
      method: 'POST',
      body: data,
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) { break; }

        const chunk = decoder.decode(value);
        if (chunk && onChunk) {
          onChunk(chunk);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
};

/**
 * DOM Utilities
 */
const DOM = {
  /**
   * Get element by ID
   * @param {string} id - Element ID
   * @returns {HTMLElement|null}
   */
  $(id) {
    return document.getElementById(id);
  },

  /**
   * Query selector
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element
   * @returns {HTMLElement|null}
   */
  find(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Query selector all
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element
   * @returns {NodeList}
   */
  findAll(selector, parent = document) {
    return parent.querySelectorAll(selector);
  },

  /**
   * Create element
   * @param {string} tag - Tag name
   * @param {Object} attributes - Element attributes
   * @param {string} content - Element content
   * @returns {HTMLElement}
   */
  create(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });

    if (content) {
      element.innerHTML = content;
    }

    return element;
  },

  /**
   * Add event listener
   * @param {HTMLElement|string} element - Element or selector
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   */
  on(element, event, handler, options = {}) {
    const el = typeof element === 'string' ? this.find(element) : element;
    if (el) {
      el.addEventListener(event, handler, options);
    }
  },

  /**
   * Remove event listener
   * @param {HTMLElement|string} element - Element or selector
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(element, event, handler) {
    const el = typeof element === 'string' ? this.find(element) : element;
    if (el) {
      el.removeEventListener(event, handler);
    }
  },

  /**
   * Add CSS class
   * @param {HTMLElement|string} element - Element or selector
   * @param {string} className - Class name
   */
  addClass(element, className) {
    const el = typeof element === 'string' ? this.find(element) : element;
    if (el) {
      el.classList.add(className);
    }
  },

  /**
   * Remove CSS class
   * @param {HTMLElement|string} element - Element or selector
   * @param {string} className - Class name
   */
  removeClass(element, className) {
    const el = typeof element === 'string' ? this.find(element) : element;
    if (el) {
      el.classList.remove(className);
    }
  },

  /**
   * Toggle CSS class
   * @param {HTMLElement|string} element - Element or selector
   * @param {string} className - Class name
   */
  toggleClass(element, className) {
    const el = typeof element === 'string' ? this.find(element) : element;
    if (el) {
      el.classList.toggle(className);
    }
  },

  /**
   * Check if element has class
   * @param {HTMLElement|string} element - Element or selector
   * @param {string} className - Class name
   * @returns {boolean}
   */
  hasClass(element, className) {
    const el = typeof element === 'string' ? this.find(element) : element;
    return el ? el.classList.contains(className) : false;
  },

  /**
   * Show element
   * @param {HTMLElement|string} element - Element or selector
   */
  show(element) {
    this.removeClass(element, 'hidden');
  },

  /**
   * Hide element
   * @param {HTMLElement|string} element - Element or selector
   */
  hide(element) {
    this.addClass(element, 'hidden');
  },

  /**
   * Scroll element into view
   * @param {HTMLElement|string} element - Element or selector
   * @param {Object} options - Scroll options
   */
  scrollIntoView(element, options = { behavior: 'smooth' }) {
    const el = typeof element === 'string' ? this.find(element) : element;
    if (el) {
      el.scrollIntoView(options);
    }
  }
};

/**
 * String Utilities
 */
const StringUtils = {
  /**
   * Escape HTML
   * @param {string} text - Text to escape
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Truncate text
   * @param {string} text - Text to truncate
   * @param {number} length - Maximum length
   * @param {string} suffix - Suffix to add
   * @returns {string}
   */
  truncate(text, length, suffix = '...') {
    if (text.length <= length) { return text; }
    return text.substring(0, length - suffix.length) + suffix;
  },

  /**
   * Format file size
   * @param {number} bytes - Size in bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes === 0) { return '0 Bytes'; }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  },

  /**
   * Format date
   * @param {Date|string} date - Date to format
   * @param {Object} options - Formatting options
   * @returns {string}
   */
  formatDate(date, options = {}) {
    const d = new Date(date);
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return d.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  },

  /**
   * Format relative time
   * @param {Date|string} date - Date to format
   * @returns {string}
   */
  formatRelativeTime(date) {
    const now = new Date();
    const d = new Date(date);
    const diff = now - d;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) { return 'just now'; }
    if (minutes < 60) { return `${minutes}m ago`; }
    if (hours < 24) { return `${hours}h ago`; }
    if (days < 7) { return `${days}d ago`; }

    return this.formatDate(date, { year: 'numeric', month: 'short', day: 'numeric' });
  },

  /**
   * Generate random ID
   * @param {number} length - ID length
   * @returns {string}
   */
  generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};

/**
 * Local Storage Utilities
 */
const Storage = {
  /**
   * Get item from localStorage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {any}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },

  /**
   * Set item in localStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  /**
   * Clear all localStorage
   */
  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

/**
 * Event Emitter
 */
class EventEmitter {
  constructor() {
    this.events = {};
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  off(event, callback) {
    if (!this.events[event]) { return; }

    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {...any} args - Event arguments
   */
  emit(event, ...args) {
    if (!this.events[event]) { return; }

    this.events[event].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }

  /**
   * Add one-time event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  once(event, callback) {
    const onceCallback = (...args) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately
 * @returns {Function}
 */
function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) { func(...args); }
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) { func(...args); }
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function}
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clone object
 * @param {any} obj - Object to clone
 * @returns {any}
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') { return obj; }
  if (obj instanceof Date) { return new Date(obj.getTime()); }
  if (obj instanceof Array) { return obj.map(item => deepClone(item)); }
  if (typeof obj === 'object') {
    const cloned = {};
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key]);
    });
    return cloned;
  }
}

/**
 * Wait for specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format error message
 * @param {Error|string} error - Error to format
 * @returns {string}
 */
function formatError(error) {
  if (typeof error === 'string') { return error; }
  if (error instanceof Error) { return error.message; }
  if (error && error.message) { return error.message; }
  return 'An unknown error occurred';
}

// Export utilities to global scope
if (typeof window !== 'undefined') {
  window.API = API;
  window.DOM = DOM;
  window.StringUtils = StringUtils;
  window.Storage = Storage;
  window.EventEmitter = EventEmitter;
  window.debounce = debounce;
  window.throttle = throttle;
  window.deepClone = deepClone;
  window.sleep = sleep;
  window.formatError = formatError;
}
