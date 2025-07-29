/**
 * Connection Status Monitor
 * Monitors network connectivity and provides reconnection handling
 */

class ConnectionMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.lastPingTime = Date.now();
    this.pingInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.statusIndicator = null;
    
    this.init();
  }

  init() {
    this.createStatusIndicator();
    this.setupEventListeners();
    this.startPingMonitoring();
    this.updateStatus();
  }

  setupEventListeners() {
    // Browser online/offline events
    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });

    // Visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkConnection();
      }
    });

    // Focus events
    window.addEventListener('focus', () => {
      this.checkConnection();
    });
  }

  createStatusIndicator() {
    if (document.getElementById('connection-status')) return;

    const indicator = document.createElement('div');
    indicator.id = 'connection-status';
    indicator.className = 'connection-status';
    indicator.innerHTML = `
      <div class="connection-icon">🌐</div>
      <div class="connection-text">
        <span class="connection-label">Connected</span>
        <span class="connection-details"></span>
      </div>
      <div class="connection-actions">
        <button class="btn btn-sm connection-retry hidden">Retry</button>
      </div>
    `;

    // Position it in the header or create a header if none exists
    const header = document.querySelector('header') || document.querySelector('.header');
    if (header) {
      header.appendChild(indicator);
    } else {
      // Create a simple header
      const headerEl = document.createElement('div');
      headerEl.className = 'app-header';
      headerEl.appendChild(indicator);
      document.body.insertBefore(headerEl, document.body.firstChild);
    }

    this.statusIndicator = indicator;

    // Add retry functionality
    const retryBtn = indicator.querySelector('.connection-retry');
    retryBtn.addEventListener('click', () => {
      this.attemptReconnect();
    });
  }

  startPingMonitoring() {
    // Ping server every 30 seconds when online
    this.pingInterval = setInterval(() => {
      if (this.isOnline) {
        this.pingServer();
      }
    }, 30000);

    // Initial ping
    this.pingServer();
  }

  async pingServer() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/health/ping', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.handleServerOnline();
      } else {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      this.handleServerOffline(error);
    }
  }

  handleOnline() {
    console.log('🌐 Browser detected online status');
    this.isOnline = true;
    this.reconnectAttempts = 0;
    this.checkConnection();
  }

  handleOffline() {
    console.log('🌐 Browser detected offline status');
    this.isOnline = false;
    this.updateStatus('offline', 'No internet connection');
  }

  handleServerOnline() {
    if (!this.isOnline) {
      this.isOnline = true;
      this.reconnectAttempts = 0;
      this.updateStatus('online', 'Connected to DinoAir');
      
      // Notify other components
      this.dispatchEvent('connection:restored');
    }
    this.lastPingTime = Date.now();
  }

  handleServerOffline(error) {
    if (this.isOnline) {
      this.isOnline = false;
      let message = 'Connection to DinoAir lost';
      
      if (error.name === 'AbortError') {
        message = 'Server response timeout';
      } else if (error.message.includes('Failed to fetch')) {
        message = 'Unable to reach server';
      }
      
      this.updateStatus('offline', message);
      this.attemptReconnect();
      
      // Notify other components
      this.dispatchEvent('connection:lost');
    }
  }

  async checkConnection() {
    this.updateStatus('checking', 'Checking connection...');
    await this.pingServer();
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateStatus('failed', 'Reconnection failed. Please refresh the page.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    this.updateStatus('reconnecting', `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.checkConnection();
    }, delay);
  }

  updateStatus(status = 'online', message = '') {
    if (!this.statusIndicator) return;

    const icon = this.statusIndicator.querySelector('.connection-icon');
    const label = this.statusIndicator.querySelector('.connection-label');
    const details = this.statusIndicator.querySelector('.connection-details');
    const retryBtn = this.statusIndicator.querySelector('.connection-retry');

    // Remove all status classes
    this.statusIndicator.className = 'connection-status';
    
    switch (status) {
      case 'online':
        this.statusIndicator.classList.add('online');
        icon.textContent = '🌐';
        label.textContent = 'Connected';
        details.textContent = message || '';
        retryBtn.classList.add('hidden');
        break;
        
      case 'offline':
        this.statusIndicator.classList.add('offline');
        icon.textContent = '📡';
        label.textContent = 'Offline';
        details.textContent = message || 'No connection';
        retryBtn.classList.remove('hidden');
        break;
        
      case 'checking':
        this.statusIndicator.classList.add('checking');
        icon.textContent = '🔄';
        label.textContent = 'Checking';
        details.textContent = message || 'Checking connection...';
        retryBtn.classList.add('hidden');
        break;
        
      case 'reconnecting':
        this.statusIndicator.classList.add('reconnecting');
        icon.textContent = '🔄';
        label.textContent = 'Reconnecting';
        details.textContent = message || 'Attempting to reconnect...';
        retryBtn.classList.add('hidden');
        break;
        
      case 'failed':
        this.statusIndicator.classList.add('failed');
        icon.textContent = '❌';
        label.textContent = 'Failed';
        details.textContent = message || 'Connection failed';
        retryBtn.classList.remove('hidden');
        retryBtn.textContent = 'Refresh Page';
        retryBtn.onclick = () => window.location.reload();
        break;
    }

    // Auto-hide when online after a delay
    if (status === 'online' && message) {
      setTimeout(() => {
        if (this.isOnline) {
          details.textContent = '';
        }
      }, 3000);
    }
  }

  dispatchEvent(eventName, data = {}) {
    const event = new CustomEvent(eventName, {
      detail: {
        isOnline: this.isOnline,
        reconnectAttempts: this.reconnectAttempts,
        lastPingTime: this.lastPingTime,
        ...data
      }
    });
    window.dispatchEvent(event);
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      reconnectAttempts: this.reconnectAttempts,
      lastPingTime: this.lastPingTime,
      timeSinceLastPing: Date.now() - this.lastPingTime
    };
  }

  destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    if (this.statusIndicator && this.statusIndicator.parentNode) {
      this.statusIndicator.parentNode.removeChild(this.statusIndicator);
    }
  }
}

// Create global instance
window.connectionMonitor = new ConnectionMonitor();

// Listen for connection events in other components
window.addEventListener('connection:lost', () => {
  console.log('🔴 Connection lost - components should handle gracefully');
  
  // Disable chat input if it exists
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.disabled = true;
    chatInput.placeholder = 'Connection lost - trying to reconnect...';
  }
});

window.addEventListener('connection:restored', () => {
  console.log('🟢 Connection restored - components can resume');
  
  // Re-enable chat input
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.disabled = false;
    chatInput.placeholder = 'Type your message here...';
  }
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConnectionMonitor;
}