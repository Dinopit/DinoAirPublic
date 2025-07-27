/**
 * Simple event listener cleanup utility to prevent memory leaks
 */

class EventListenerManager {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Add an event listener with automatic tracking
   */
  addEventListener(target, event, listener, options) {
    if (!target || typeof target.addEventListener !== 'function') {
      throw new Error('Invalid event target');
    }

    target.addEventListener(event, listener, options);

    // Track the listener for cleanup
    const key = `${target.constructor.name}_${event}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    this.listeners.get(key).push({
      target,
      event,
      listener,
      options
    });
  }

  /**
   * Remove a specific event listener
   */
  removeEventListener(target, event, listener, options) {
    if (!target || typeof target.removeEventListener !== 'function') {
      return;
    }

    target.removeEventListener(event, listener, options);

    // Remove from tracking
    const key = `${target.constructor.name}_${event}`;
    if (this.listeners.has(key)) {
      const listeners = this.listeners.get(key);
      const index = listeners.findIndex(l =>
        l.target === target
        && l.event === event
        && l.listener === listener
      );
      if (index !== -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this.listeners.delete(key);
        }
      }
    }
  }

  /**
   * Remove all tracked event listeners
   */
  cleanup() {
    for (const [key, listeners] of this.listeners.entries()) {
      for (const { target, event, listener, options } of listeners) {
        try {
          if (target && typeof target.removeEventListener === 'function') {
            target.removeEventListener(event, listener, options);
          }
        } catch (error) {
          console.warn('Error removing event listener:', error);
        }
      }
    }
    this.listeners.clear();
  }

  /**
   * Get statistics about tracked listeners
   */
  getStats() {
    const stats = {};
    let totalListeners = 0;

    for (const [key, listeners] of this.listeners.entries()) {
      stats[key] = listeners.length;
      totalListeners += listeners.length;
    }

    return {
      totalListeners,
      byType: stats
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EventListenerManager };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.EventListenerManager = EventListenerManager;
}
