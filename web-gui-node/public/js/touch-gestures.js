/**
 * Touch Gesture Enhancements
 * Improves mobile interaction with swipe gestures and touch feedback
 */

class TouchGestures {
  constructor() {
    this.chatMessages = null;
    this.startY = 0;
    this.startX = 0;
    this.currentY = 0;
    this.currentX = 0;
    this.isDragging = false;
    this.isScrolling = false;
    this.threshold = 50; // Minimum distance for gesture recognition
    
    this.init();
  }

  init() {
    // Only initialize on touch devices
    if (!('ontouchstart' in window)) return;
    
    this.chatMessages = document.getElementById('chat-messages');
    if (this.chatMessages) {
      this.setupChatGestures();
    }
    
    this.setupPullToRefresh();
    this.setupSwipeNavigation();
    this.enhanceTouchFeedback();
  }

  setupChatGestures() {
    let touchStarted = false;
    let lastTouchTime = 0;

    // Enhanced scroll behavior for chat
    this.chatMessages.addEventListener('touchstart', (e) => {
      touchStarted = true;
      lastTouchTime = Date.now();
      this.startY = e.touches[0].clientY;
      this.startX = e.touches[0].clientX;
      this.isDragging = false;
      this.isScrolling = false;
    }, { passive: true });

    this.chatMessages.addEventListener('touchmove', (e) => {
      if (!touchStarted) return;
      
      this.currentY = e.touches[0].clientY;
      this.currentX = e.touches[0].clientX;
      
      const deltaY = Math.abs(this.currentY - this.startY);
      const deltaX = Math.abs(this.currentX - this.startX);
      
      // Determine if user is scrolling vertically
      if (deltaY > deltaX && deltaY > 10) {
        this.isScrolling = true;
      }
      
      // Add momentum to scrolling
      if (this.isScrolling) {
        const velocity = deltaY / (Date.now() - lastTouchTime);
        if (velocity > 0.5) {
          this.chatMessages.style.scrollBehavior = 'smooth';
        }
      }
    }, { passive: true });

    this.chatMessages.addEventListener('touchend', () => {
      touchStarted = false;
      this.isDragging = false;
      this.isScrolling = false;
      
      // Reset scroll behavior
      setTimeout(() => {
        this.chatMessages.style.scrollBehavior = '';
      }, 300);
    }, { passive: true });
  }

  setupPullToRefresh() {
    // Simple pull-to-refresh for chat history
    if (!this.chatMessages) return;
    
    let startY = 0;
    let pullDistance = 0;
    const maxPullDistance = 100;
    let refreshIndicator = null;

    this.chatMessages.addEventListener('touchstart', (e) => {
      if (this.chatMessages.scrollTop === 0) {
        startY = e.touches[0].clientY;
        pullDistance = 0;
      }
    }, { passive: true });

    this.chatMessages.addEventListener('touchmove', (e) => {
      if (this.chatMessages.scrollTop === 0 && startY > 0) {
        const currentY = e.touches[0].clientY;
        pullDistance = Math.max(0, currentY - startY);
        
        if (pullDistance > 30 && !refreshIndicator) {
          this.showRefreshIndicator();
          refreshIndicator = true;
        } else if (pullDistance <= 30 && refreshIndicator) {
          this.hideRefreshIndicator();
          refreshIndicator = false;
        }
        
        // Add visual feedback
        if (pullDistance > 0) {
          const opacity = Math.min(pullDistance / maxPullDistance, 0.3);
          this.chatMessages.style.background = `linear-gradient(rgba(37, 99, 235, ${opacity}), transparent)`;
        }
      }
    }, { passive: true });

    this.chatMessages.addEventListener('touchend', () => {
      if (pullDistance > 50) {
        this.triggerRefresh();
      }
      
      // Reset visual state
      this.chatMessages.style.background = '';
      this.hideRefreshIndicator();
      refreshIndicator = false;
      startY = 0;
      pullDistance = 0;
    }, { passive: true });
  }

  setupSwipeNavigation() {
    // Swipe gestures for mobile navigation
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let deltaY = 0;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!startX || !startY) return;
      
      deltaX = e.touches[0].clientX - startX;
      deltaY = e.touches[0].clientY - startY;
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (Math.abs(deltaX) > this.threshold && Math.abs(deltaY) < this.threshold) {
        // Horizontal swipe detected
        if (deltaX > 0 && startX < 50) {
          // Swipe right from left edge - open menu
          if (window.mobileNavigation && !window.mobileNavigation.isOpen()) {
            window.mobileNavigation.toggleMenu();
          }
        } else if (deltaX < 0 && window.mobileNavigation && window.mobileNavigation.isOpen()) {
          // Swipe left - close menu
          window.mobileNavigation.close();
        }
      }
      
      // Reset values
      startX = 0;
      startY = 0;
      deltaX = 0;
      deltaY = 0;
    }, { passive: true });
  }

  enhanceTouchFeedback() {
    // Add haptic feedback where supported
    const addHapticFeedback = (element, type = 'light') => {
      element.addEventListener('touchstart', () => {
        if (navigator.vibrate) {
          // Light haptic feedback
          navigator.vibrate(type === 'light' ? 10 : 50);
        }
      }, { passive: true });
    };

    // Add haptic feedback to buttons
    const buttons = document.querySelectorAll('.btn, .nav-link, .message-bubble');
    buttons.forEach(btn => addHapticFeedback(btn));

    // Enhanced button press animation
    const enhanceButtonFeedback = (selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.addEventListener('touchstart', () => {
          element.style.transform = 'scale(0.95)';
          element.style.transition = 'transform 0.1s ease';
        }, { passive: true });

        element.addEventListener('touchend', () => {
          element.style.transform = '';
          element.style.transition = '';
        }, { passive: true });

        element.addEventListener('touchcancel', () => {
          element.style.transform = '';
          element.style.transition = '';
        }, { passive: true });
      });
    };

    enhanceButtonFeedback('.btn');
    enhanceButtonFeedback('.nav-link');
    enhanceButtonFeedback('[role="button"]');
  }

  showRefreshIndicator() {
    if (document.querySelector('.refresh-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'refresh-indicator';
    indicator.innerHTML = `
      <div class="refresh-spinner">⟳</div>
      <span>Pull to refresh</span>
    `;
    
    indicator.style.cssText = `
      position: absolute;
      top: -50px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background: var(--primary-color);
      color: white;
      border-radius: 20px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 1000;
      transition: top 0.3s ease;
    `;

    this.chatMessages.style.position = 'relative';
    this.chatMessages.appendChild(indicator);
    
    // Animate in
    requestAnimationFrame(() => {
      indicator.style.top = '10px';
    });
  }

  hideRefreshIndicator() {
    const indicator = document.querySelector('.refresh-indicator');
    if (indicator) {
      indicator.style.top = '-50px';
      setTimeout(() => {
        indicator.remove();
      }, 300);
    }
  }

  triggerRefresh() {
    // Trigger chat history refresh if available
    if (window.chatInterface && typeof window.chatInterface.loadChatHistory === 'function') {
      window.chatInterface.loadChatHistory();
    }
    
    // Show success feedback
    const indicator = document.querySelector('.refresh-indicator');
    if (indicator) {
      indicator.innerHTML = `
        <div class="refresh-spinner">✓</div>
        <span>Refreshed!</span>
      `;
      
      setTimeout(() => {
        this.hideRefreshIndicator();
      }, 1000);
    }
  }

  // Long press detection for message actions
  setupLongPress() {
    let pressTimer = null;
    
    document.addEventListener('touchstart', (e) => {
      if (e.target.closest('.message-bubble')) {
        pressTimer = setTimeout(() => {
          this.showMessageActions(e.target.closest('.message'));
        }, 500);
      }
    });

    document.addEventListener('touchend', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    document.addEventListener('touchmove', () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });
  }

  showMessageActions(messageElement) {
    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Show context menu or actions
    console.log('Long press detected on message:', messageElement);
    
    // Could implement: copy, reply, delete, etc.
    // For now, just show visual feedback
    messageElement.style.background = 'rgba(37, 99, 235, 0.1)';
    setTimeout(() => {
      messageElement.style.background = '';
    }, 200);
  }

  // Double tap to scroll to bottom
  setupDoubleTapScroll() {
    if (!this.chatMessages) return;
    
    let lastTap = 0;
    
    this.chatMessages.addEventListener('touchend', (e) => {
      const currentTime = Date.now();
      const tapLength = currentTime - lastTap;
      
      if (tapLength < 500 && tapLength > 0) {
        // Double tap detected
        this.chatMessages.scrollTo({
          top: this.chatMessages.scrollHeight,
          behavior: 'smooth'
        });
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
      
      lastTap = currentTime;
    });
  }
}

// Initialize touch gestures when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if ('ontouchstart' in window) {
    window.touchGestures = new TouchGestures();
  }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TouchGestures;
}