/**
 * DinoAir Web GUI - Streaming Module
 * Handles real-time communication and streaming functionality
 */

/**
 * Chat Streaming Manager
 * Handles streaming chat responses from the API
 */
class ChatStreamer extends window.EventEmitter {
  constructor() {
    super();
    this.isStreaming = false;
    this.currentStream = null;
    this.abortController = null;
  }

  /**
   * Get authorization header for API requests
   * @returns {string} Authorization header value
   */
  getAuthHeader() {
    // Try to get token from localStorage or sessionStorage
    const token = localStorage.getItem('auth_token') || 
                  sessionStorage.getItem('auth_token') ||
                  this.getCookie('auth_token');
    
    return token ? `Bearer ${token}` : '';
  }

  /**
   * Get cookie value by name
   * @param {string} name - Cookie name
   * @returns {string} Cookie value
   */
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  }

  /**
   * Start streaming chat response
   * @param {Object} messageData - Message data to send
   * @returns {Promise<void>}
   */
  async startStream(messageData) {
    if (this.isStreaming) {
      this.stopStream();
    }

    this.isStreaming = true;
    this.abortController = new AbortController();

    try {
      this.emit('streamStart');

      // Show loading state for the streaming operation
      if (window.loadingManager) {
        window.loadingManager.showApiLoading('chat-messages', 'Connecting to AI');
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader()
        },
        body: JSON.stringify(messageData),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
        error.status = response.status;
        error.category = errorData.category;
        throw error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (this.isStreaming) {
        const { done, value } = await reader.read();

        if (done) {
          this.emit('streamEnd');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete chunks
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            this.emit('streamChunk', line);
          }
        }
      }

      // Process any remaining buffer content
      if (buffer.trim()) {
        this.emit('streamChunk', buffer);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.emit('streamAborted');
      } else {
        // Use the new error handler for user-friendly messages
        if (window.errorHandler) {
          window.errorHandler.handleError(error, {
            retryCallback: () => this.startStream(messageData),
            container: document.getElementById('chat-messages'),
            inline: true
          });
        }
        this.emit('streamError', error);
      }
    } finally {
      this.isStreaming = false;
      this.currentStream = null;
      this.abortController = null;

      if (window.loadingManager) {
        window.loadingManager.hide('chat-messages');
      }
    }
  }

  /**
   * Stop current stream
   */
  stopStream() {
    if (this.isStreaming && this.abortController) {
      this.abortController.abort();
      this.isStreaming = false;

      if (window.loadingManager) {
        window.loadingManager.hide('chat-messages');
      }
    }
  }

  /**
   * Check if currently streaming
   * @returns {boolean}
   */
  getStreamingStatus() {
    return this.isStreaming;
  }
}

/**
 * WebSocket Manager
 * Handles WebSocket connections for real-time updates
 */
class WebSocketManager extends window.EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
  }

  /**
   * Connect to WebSocket server
   * @param {string} url - WebSocket URL
   */
  connect(url = null) {
    const wsUrl = url || `ws://${window.location.host}`;

    try {
      this.socket = window.io(wsUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      this.setupEventHandlers();
    } catch (error) {
      this.emit('connectionError', error);
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  setupEventHandlers() {
    if (!this.socket) { return; }

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
      this.startHeartbeat();
    });

    this.socket.on('disconnect', reason => {
      this.isConnected = false;
      this.emit('disconnected', reason);
      this.stopHeartbeat();

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.reconnect();
      }
    });

    this.socket.on('connect_error', error => {
      this.emit('connectionError', error);
      this.reconnect();
    });

    this.socket.on('reconnect', attemptNumber => {
      this.emit('reconnected', attemptNumber);
    });

    this.socket.on('reconnect_error', error => {
      this.emit('reconnectError', error);
    });

    this.socket.on('reconnect_failed', () => {
      this.emit('reconnectFailed');
    });

    // Custom event handlers
    this.socket.on('message', data => {
      this.emit('message', data);
    });

    this.socket.on('notification', data => {
      this.emit('notification', data);
    });

    this.socket.on('status_update', data => {
      this.emit('statusUpdate', data);
    });

    this.socket.on('pong', () => {
      this.resetHeartbeatTimeout();
    });
  }

  /**
   * Send message through WebSocket
   * @param {string} event - Event name
   * @param {any} data - Data to send
   */
  send(event, data) {
    if (this.isConnected && this.socket) {
      this.socket.emit(event, data);
    } else {
      this.emit('sendError', new Error('WebSocket not connected'));
    }
  }

  /**
   * Join a room
   * @param {string} room - Room name
   */
  joinRoom(room) {
    this.send('join-room', { room });
  }

  /**
   * Leave a room
   * @param {string} room - Room name
   */
  leaveRoom(room) {
    this.send('leave-room', { room });
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.socket.emit('ping');
        this.heartbeatTimeout = setTimeout(() => {
          // No pong received, connection might be dead
          this.socket.disconnect();
        }, 5000);
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.resetHeartbeatTimeout();
  }

  /**
   * Reset heartbeat timeout
   */
  resetHeartbeatTimeout() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    // Store timeout reference to prevent memory leak
    const reconnectTimer = setTimeout(() => {
      if (!this.isConnected) {
        this.emit('reconnectAttempt', this.reconnectAttempts);
        this.connect();
      }
    }, delay);

    // Track timer for cleanup if needed
    if (!this.reconnectTimers) {
      this.reconnectTimers = new Set();
    }
    this.reconnectTimers.add(reconnectTimer);

    // Clean up timer reference after execution
    setTimeout(() => {
      this.reconnectTimers.delete(reconnectTimer);
    }, delay + 1000);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.stopHeartbeat();

    // Clear any pending reconnect timers to prevent memory leaks
    if (this.reconnectTimers) {
      this.reconnectTimers.forEach(timer => clearTimeout(timer));
      this.reconnectTimers.clear();
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

/**
 * Server-Sent Events Manager
 * Alternative to WebSocket for server-sent events
 */
class SSEManager extends window.EventEmitter {
  constructor() {
    super();
    this.eventSource = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  /**
   * Connect to SSE endpoint
   * @param {string} url - SSE endpoint URL
   */
  connect(url) {
    try {
      this.eventSource = new EventSource(url);
      this.setupEventHandlers();
    } catch (error) {
      this.emit('connectionError', error);
    }
  }

  /**
   * Set up SSE event handlers
   */
  setupEventHandlers() {
    if (!this.eventSource) { return; }

    this.eventSource.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
      } catch (error) {
        this.emit('message', event.data);
      }
    };

    this.eventSource.onerror = error => {
      this.isConnected = false;
      this.emit('connectionError', error);

      if (this.eventSource.readyState === EventSource.CLOSED) {
        this.reconnect();
      }
    };

    // Custom event listeners
    this.eventSource.addEventListener('notification', event => {
      try {
        const data = JSON.parse(event.data);
        this.emit('notification', data);
      } catch (error) {
        this.emit('notification', event.data);
      }
    });

    this.eventSource.addEventListener('status', event => {
      try {
        const data = JSON.parse(event.data);
        this.emit('statusUpdate', data);
      } catch (error) {
        this.emit('statusUpdate', event.data);
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    // Store timeout reference to prevent memory leak
    const reconnectTimer = setTimeout(() => {
      if (!this.isConnected) {
        this.emit('reconnectAttempt', this.reconnectAttempts);
        this.connect(this.eventSource.url);
      }
    }, delay);

    // Track timer for cleanup if needed
    if (!this.reconnectTimers) {
      this.reconnectTimers = new Set();
    }
    this.reconnectTimers.add(reconnectTimer);

    // Clean up timer reference after execution
    setTimeout(() => {
      this.reconnectTimers.delete(reconnectTimer);
    }, delay + 1000);
  }

  /**
   * Disconnect SSE
   */
  disconnect() {
    // Clear any pending reconnect timers to prevent memory leaks
    if (this.reconnectTimers) {
      this.reconnectTimers.forEach(timer => clearTimeout(timer));
      this.reconnectTimers.clear();
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }

  /**
   * Get connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

/**
 * Real-time Notifications Manager
 * Handles real-time notifications and updates
 */
class NotificationManager extends window.EventEmitter {
  constructor() {
    super();
    this.notifications = [];
    this.maxNotifications = 50;
    this.defaultTimeout = 5000;
  }

  /**
   * Show notification
   * @param {Object} notification - Notification data
   */
  show(notification) {
    const notif = {
      id: window.StringUtils.generateId(),
      timestamp: new Date(),
      timeout: notification.timeout || this.defaultTimeout,
      ...notification
    };

    this.notifications.unshift(notif);

    // Limit notifications array size
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.emit('notificationAdded', notif);

    // Auto-remove notification after timeout
    if (notif.timeout > 0) {
      const timeoutId = setTimeout(() => {
        this.remove(notif.id);
      }, notif.timeout);

      // Track timeout for cleanup
      if (!this.notificationTimeouts) {
        this.notificationTimeouts = new Map();
      }
      this.notificationTimeouts.set(notif.id, timeoutId);
    }

    return notif.id;
  }

  /**
   * Remove notification
   * @param {string} id - Notification ID
   */
  remove(id) {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      const [notification] = this.notifications.splice(index, 1);
      this.emit('notificationRemoved', notification);

      // Clear associated timeout to prevent memory leak
      if (this.notificationTimeouts && this.notificationTimeouts.has(id)) {
        clearTimeout(this.notificationTimeouts.get(id));
        this.notificationTimeouts.delete(id);
      }
    }
  }

  /**
   * Clear all notifications
   */
  clear() {
    // Clear all timeouts to prevent memory leaks
    if (this.notificationTimeouts) {
      this.notificationTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      this.notificationTimeouts.clear();
    }

    this.notifications = [];
    this.emit('notificationsCleared');
  }

  /**
   * Get all notifications
   * @returns {Array}
   */
  getAll() {
    return [...this.notifications];
  }

  /**
   * Get notification by ID
   * @param {string} id - Notification ID
   * @returns {Object|null}
   */
  getById(id) {
    return this.notifications.find(n => n.id === id) || null;
  }
}

/**
 * Progress Tracker
 * Tracks and manages progress for long-running operations
 */
class ProgressTracker extends window.EventEmitter {
  constructor() {
    super();
    this.operations = new Map();
  }

  /**
   * Start tracking operation
   * @param {string} id - Operation ID
   * @param {Object} options - Progress options
   */
  start(id, options = {}) {
    const operation = {
      id,
      startTime: Date.now(),
      progress: 0,
      status: 'running',
      message: options.message || 'Starting...',
      total: options.total || 100,
      ...options
    };

    this.operations.set(id, operation);
    this.emit('progressStart', operation);
    return operation;
  }

  /**
   * Update operation progress
   * @param {string} id - Operation ID
   * @param {Object} update - Progress update
   */
  update(id, update) {
    const operation = this.operations.get(id);
    if (!operation) { return; }

    Object.assign(operation, update);
    operation.lastUpdate = Date.now();

    this.emit('progressUpdate', operation);
    return operation;
  }

  /**
   * Complete operation
   * @param {string} id - Operation ID
   * @param {Object} result - Completion result
   */
  complete(id, result = {}) {
    const operation = this.operations.get(id);
    if (!operation) { return; }

    operation.status = 'completed';
    operation.progress = operation.total;
    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;
    Object.assign(operation, result);

    this.emit('progressComplete', operation);

    // Remove completed operation after delay
    const cleanupTimeout = setTimeout(() => {
      this.operations.delete(id);
    }, 5000);

    // Track cleanup timeout for manual cleanup if needed
    if (!this.cleanupTimeouts) {
      this.cleanupTimeouts = new Map();
    }
    this.cleanupTimeouts.set(id, cleanupTimeout);

    return operation;
  }

  /**
   * Fail operation
   * @param {string} id - Operation ID
   * @param {Error|string} error - Error information
   */
  fail(id, error) {
    const operation = this.operations.get(id);
    if (!operation) { return; }

    operation.status = 'failed';
    operation.error = window.formatError(error);
    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;

    this.emit('progressFailed', operation);
    return operation;
  }

  /**
   * Get operation by ID
   * @param {string} id - Operation ID
   * @returns {Object|null}
   */
  get(id) {
    return this.operations.get(id) || null;
  }

  /**
   * Get all operations
   * @returns {Array}
   */
  getAll() {
    return Array.from(this.operations.values());
  }

  /**
   * Remove operation
   * @param {string} id - Operation ID
   */
  remove(id) {
    const operation = this.operations.get(id);
    if (operation) {
      this.operations.delete(id);
      this.emit('progressRemoved', operation);

      // Clear associated cleanup timeout to prevent memory leak
      if (this.cleanupTimeouts && this.cleanupTimeouts.has(id)) {
        clearTimeout(this.cleanupTimeouts.get(id));
        this.cleanupTimeouts.delete(id);
      }
    }
  }

  /**
   * Clear all operations
   */
  clear() {
    // Clear all cleanup timeouts to prevent memory leaks
    if (this.cleanupTimeouts) {
      this.cleanupTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      this.cleanupTimeouts.clear();
    }

    this.operations.clear();
    this.emit('progressCleared');
  }
}

// Export streaming utilities to global scope
if (typeof window !== 'undefined') {
  window.ChatStreamer = ChatStreamer;
  window.WebSocketManager = WebSocketManager;
  window.SSEManager = SSEManager;
  window.NotificationManager = NotificationManager;
  window.ProgressTracker = ProgressTracker;
}
