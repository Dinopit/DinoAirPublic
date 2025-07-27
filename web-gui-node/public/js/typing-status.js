/**
 * Advanced Typing Status and Message Status Manager
 * Handles real-time typing indicators and message delivery status
 */

class TypingStatusManager {
  constructor() {
    this.isUserTyping = false;
    this.typingTimeout = null;
    this.lastTypingTime = 0;
    this.typingThreshold = 1000; // 1 second of inactivity to stop typing
    this.statusUpdateQueue = [];
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
    
    this.init();
  }

  init() {
    this.setupStatusTracking();
    this.setupRetryMechanism();
    this.setupStatusTooltips();
  }

  setupStatusTracking() {
    // Track message status changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('message')) {
              this.trackMessageStatus(node);
            }
          });
        }
      });
    });

    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      observer.observe(chatMessages, { childList: true });
    }
  }

  trackMessageStatus(messageElement) {
    const messageId = messageElement.getAttribute('data-message-id');
    const isUserMessage = messageElement.classList.contains('user');
    
    if (isUserMessage && messageId) {
      // Start tracking this message
      this.statusUpdateQueue.push({
        messageId,
        element: messageElement,
        status: 'sending',
        timestamp: Date.now()
      });
      
      // Simulate status progression for demo
      this.simulateMessageStatusProgression(messageElement, messageId);
    }
  }

  simulateMessageStatusProgression(messageElement, messageId) {
    // This would be replaced with real API calls in production
    
    // Step 1: Mark as sent after a short delay
    setTimeout(() => {
      this.updateMessageStatus(messageElement, 'sent');
      this.addStatusTooltip(messageElement, 'Message sent to server');
    }, 500);

    // Step 2: Mark as delivered after processing
    setTimeout(() => {
      this.updateMessageStatus(messageElement, 'delivered');
      this.addStatusTooltip(messageElement, 'Message delivered and processed');
    }, 1500);
  }

  updateMessageStatus(messageElement, status) {
    if (!messageElement) return;
    
    const statusElement = messageElement.querySelector('.message-status');
    if (!statusElement) return;

    const statusIcon = statusElement.querySelector('.status-icon');
    if (!statusIcon) return;

    // Remove existing status classes
    statusIcon.className = 'status-icon';
    
    // Add new status class
    statusIcon.classList.add(`status-${status}`);
    statusIcon.setAttribute('data-status', status);
    
    // Update icon content
    switch (status) {
      case 'sending':
        statusIcon.innerHTML = '○';
        statusIcon.setAttribute('data-tooltip', 'Sending...');
        break;
      case 'sent':
        statusIcon.innerHTML = '✓';
        statusIcon.setAttribute('data-tooltip', 'Sent');
        break;
      case 'delivered':
        statusIcon.innerHTML = '✓✓';
        statusIcon.setAttribute('data-tooltip', 'Delivered');
        break;
      case 'read':
        statusIcon.innerHTML = '✓✓';
        statusIcon.style.color = 'var(--primary-color)';
        statusIcon.setAttribute('data-tooltip', 'Read');
        break;
      case 'failed':
        statusIcon.innerHTML = '⚠';
        statusIcon.setAttribute('data-tooltip', 'Failed to send');
        this.addRetryButton(messageElement);
        break;
    }

    // Add animation for status change
    statusIcon.style.transform = 'scale(1.3)';
    setTimeout(() => {
      statusIcon.style.transform = 'scale(1)';
    }, 200);

    // Trigger haptic feedback on mobile
    if (navigator.vibrate && status === 'delivered') {
      navigator.vibrate(10);
    }
  }

  addStatusTooltip(messageElement, message) {
    const statusElement = messageElement.querySelector('.status-icon');
    if (statusElement) {
      statusElement.setAttribute('title', message);
      statusElement.setAttribute('data-tooltip', message);
    }
  }

  addRetryButton(messageElement) {
    const existingRetry = messageElement.querySelector('.retry-button');
    if (existingRetry) return;

    const metaElement = messageElement.querySelector('.message-meta');
    if (!metaElement) return;

    const retryButton = document.createElement('button');
    retryButton.className = 'retry-button btn btn-sm';
    retryButton.innerHTML = '↻ Retry';
    retryButton.title = 'Retry sending message';
    
    retryButton.addEventListener('click', () => {
      this.retryMessage(messageElement);
    });

    metaElement.appendChild(retryButton);
  }

  retryMessage(messageElement) {
    const messageId = messageElement.getAttribute('data-message-id');
    const currentAttempts = this.retryAttempts.get(messageId) || 0;
    
    if (currentAttempts >= this.maxRetryAttempts) {
      this.showMaxRetriesReached(messageElement);
      return;
    }

    this.retryAttempts.set(messageId, currentAttempts + 1);
    
    // Remove retry button
    const retryButton = messageElement.querySelector('.retry-button');
    if (retryButton) {
      retryButton.remove();
    }

    // Reset status to sending
    this.updateMessageStatus(messageElement, 'sending');
    
    // Simulate retry attempt
    setTimeout(() => {
      // 70% chance of success on retry
      if (Math.random() > 0.3) {
        this.simulateMessageStatusProgression(messageElement, messageId);
      } else {
        this.updateMessageStatus(messageElement, 'failed');
      }
    }, 1000);
  }

  showMaxRetriesReached(messageElement) {
    const retryButton = messageElement.querySelector('.retry-button');
    if (retryButton) {
      retryButton.textContent = 'Max retries reached';
      retryButton.disabled = true;
      retryButton.style.opacity = '0.5';
    }
  }

  setupRetryMechanism() {
    // Automatic retry for failed messages after 5 seconds
    setInterval(() => {
      const failedMessages = document.querySelectorAll('.status-failed');
      failedMessages.forEach(statusIcon => {
        const messageElement = statusIcon.closest('.message');
        const messageId = messageElement?.getAttribute('data-message-id');
        
        if (messageId && !this.retryAttempts.has(messageId)) {
          // Auto-retry once
          setTimeout(() => {
            this.retryMessage(messageElement);
          }, Math.random() * 2000); // Random delay to avoid thundering herd
        }
      });
    }, 5000);
  }

  setupStatusTooltips() {
    // Add CSS for tooltips if not already present
    const style = document.createElement('style');
    style.textContent = `
      .status-icon {
        position: relative;
        cursor: help;
        transition: all 0.3s ease;
      }
      
      .status-icon:hover {
        transform: scale(1.1);
      }
      
      .status-icon::before {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg-darker);
        color: var(--text-inverse);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
        z-index: 1000;
        pointer-events: none;
        margin-bottom: 4px;
      }
      
      .status-icon:hover::before {
        opacity: 1;
        visibility: visible;
      }
      
      .retry-button {
        font-size: 10px !important;
        padding: 2px 6px !important;
        margin-left: 4px;
        border-radius: 4px;
        background: var(--error-color) !important;
        color: white !important;
        border: none !important;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .retry-button:hover {
        background: var(--error-hover, #dc2626) !important;
        transform: scale(1.05);
      }
      
      .retry-button:active {
        transform: scale(0.95);
      }
      
      @media (max-width: 768px) {
        .retry-button {
          font-size: 12px !important;
          padding: 4px 8px !important;
          min-height: 28px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Enhanced typing detection
  startTypingDetection(inputElement) {
    if (!inputElement) return;

    inputElement.addEventListener('input', () => {
      this.handleTypingActivity();
    });

    inputElement.addEventListener('keydown', (e) => {
      // More responsive typing detection
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
        this.handleTypingActivity();
      }
    });

    inputElement.addEventListener('paste', () => {
      this.handleTypingActivity();
    });
  }

  handleTypingActivity() {
    const now = Date.now();
    this.lastTypingTime = now;
    
    if (!this.isUserTyping) {
      this.isUserTyping = true;
      this.onTypingStart();
    }

    // Clear existing timeout
    clearTimeout(this.typingTimeout);
    
    // Set new timeout
    this.typingTimeout = setTimeout(() => {
      if (now - this.lastTypingTime >= this.typingThreshold) {
        this.isUserTyping = false;
        this.onTypingStop();
      }
    }, this.typingThreshold);
  }

  onTypingStart() {
    // Could emit typing start event for real-time features
    console.log('User started typing');
    
    // Visual feedback
    const sendButton = document.getElementById('send-btn');
    if (sendButton) {
      sendButton.classList.add('user-typing');
    }
  }

  onTypingStop() {
    // Could emit typing stop event for real-time features
    console.log('User stopped typing');
    
    // Remove visual feedback
    const sendButton = document.getElementById('send-btn');
    if (sendButton) {
      sendButton.classList.remove('user-typing');
    }
  }

  // Public methods for external use
  isTyping() {
    return this.isUserTyping;
  }

  forceStopTyping() {
    this.isUserTyping = false;
    this.onTypingStop();
    clearTimeout(this.typingTimeout);
  }

  markMessageAsRead(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement && !messageElement.classList.contains('user')) {
      this.updateMessageStatus(messageElement, 'read');
    }
  }

  // Bulk status updates for efficiency
  updateMultipleStatuses(updates) {
    updates.forEach(({ messageId, status }) => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        this.updateMessageStatus(messageElement, status);
      }
    });
  }

  // Network status integration
  handleNetworkChange(isOnline) {
    if (isOnline) {
      // Retry failed messages when back online
      const failedMessages = document.querySelectorAll('.status-failed');
      failedMessages.forEach(statusIcon => {
        const messageElement = statusIcon.closest('.message');
        if (messageElement) {
          setTimeout(() => {
            this.retryMessage(messageElement);
          }, Math.random() * 3000);
        }
      });
    } else {
      // Mark pending messages as failed
      const sendingMessages = document.querySelectorAll('.status-sending');
      sendingMessages.forEach(statusIcon => {
        const messageElement = statusIcon.closest('.message');
        if (messageElement) {
          this.updateMessageStatus(messageElement, 'failed');
          this.addStatusTooltip(messageElement, 'Failed - No internet connection');
        }
      });
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.typingStatusManager = new TypingStatusManager();
  
  // Integrate with chat input
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    window.typingStatusManager.startTypingDetection(chatInput);
  }
  
  // Integrate with connection monitor
  if (window.connectionMonitor) {
    window.addEventListener('connection:lost', () => {
      window.typingStatusManager.handleNetworkChange(false);
    });
    
    window.addEventListener('connection:restored', () => {
      window.typingStatusManager.handleNetworkChange(true);
    });
  }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TypingStatusManager;
}