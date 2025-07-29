/**
 * Test memory leak fixes in streaming components
 */

// Mock EventEmitter for testing
class MockEventEmitter {
  constructor() {
    this.events = new Map();
  }
  
  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(listener);
  }
  
  emit(event, ...args) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(listener => listener(...args));
    }
  }
}

// Set up global objects for testing
global.window = {
  EventEmitter: MockEventEmitter,
  location: { host: 'localhost:3000' },
  StringUtils: {
    generateId: () => Math.random().toString(36).substr(2, 9)
  },
  formatError: (error) => error.toString()
};

// Load the streaming module
require('../web-gui-node/public/js/streaming.js');

// Test timer cleanup in WebSocketManager
function testWebSocketTimerCleanup() {
  console.log('Testing WebSocket timer cleanup...');
  
  const wsManager = new global.window.WebSocketManager();
  
  // Mock socket.io
  global.window.io = () => ({
    on: () => {},
    emit: () => {},
    disconnect: () => {}
  });
  
  // Connect and start heartbeat
  wsManager.connect();
  wsManager.startHeartbeat();
  
  // Should have active interval
  console.assert(wsManager.heartbeatInterval !== null, 'Heartbeat interval should be set');
  
  // Disconnect should clean up timers
  wsManager.disconnect();
  
  // Should have cleaned up interval
  console.assert(wsManager.heartbeatInterval === null, 'Heartbeat interval should be cleared');
  
  console.log('✓ WebSocket timer cleanup test passed');
}

// Test notification timeout cleanup
function testNotificationTimeoutCleanup() {
  console.log('Testing notification timeout cleanup...');
  
  const notifManager = new global.window.NotificationManager();
  
  // Add notification with timeout
  const id = notifManager.show({
    message: 'Test notification',
    timeout: 1000
  });
  
  // Should have timeout tracked
  console.assert(notifManager.notificationTimeouts, 'Notification timeouts should be tracked');
  console.assert(notifManager.notificationTimeouts.has(id), 'Timeout should be tracked for notification');
  
  // Remove notification
  notifManager.remove(id);
  
  // Should have cleaned up timeout
  console.assert(!notifManager.notificationTimeouts.has(id), 'Timeout should be cleaned up');
  
  console.log('✓ Notification timeout cleanup test passed');
}

// Test progress tracker cleanup
function testProgressTrackerCleanup() {
  console.log('Testing progress tracker cleanup...');
  
  const progressTracker = new global.window.ProgressTracker();
  
  // Start operation
  const id = 'test-operation';
  progressTracker.start(id, { message: 'Testing...' });
  
  // Complete operation
  progressTracker.complete(id);
  
  // Should have cleanup timeout tracked
  console.assert(progressTracker.cleanupTimeouts, 'Cleanup timeouts should be tracked');
  console.assert(progressTracker.cleanupTimeouts.has(id), 'Cleanup timeout should be tracked');
  
  // Remove operation manually
  progressTracker.remove(id);
  
  // Should have cleaned up timeout
  console.assert(!progressTracker.cleanupTimeouts.has(id), 'Cleanup timeout should be cleaned up');
  
  console.log('✓ Progress tracker cleanup test passed');
}

// Test SSE manager timer cleanup
function testSSETimerCleanup() {
  console.log('Testing SSE timer cleanup...');
  
  const sseManager = new global.window.SSEManager();
  
  // Mock EventSource
  global.EventSource = function(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.close = () => {};
    this.addEventListener = () => {};
  };
  
  // Simulate reconnect which creates timers
  sseManager.reconnectAttempts = 1;
  sseManager.maxReconnectAttempts = 5;
  sseManager.isConnected = false;
  
  // This should create a timer
  sseManager.reconnect();
  
  // Should have reconnect timers
  console.assert(sseManager.reconnectTimers, 'Reconnect timers should be tracked');
  console.assert(sseManager.reconnectTimers.size > 0, 'Should have active reconnect timers');
  
  // Disconnect should clean up timers
  sseManager.disconnect();
  
  // Should have cleaned up timers
  console.assert(sseManager.reconnectTimers.size === 0, 'Reconnect timers should be cleaned up');
  
  console.log('✓ SSE timer cleanup test passed');
}

// Run all tests
function runTests() {
  console.log('Running memory leak fix tests for streaming components...\n');
  
  try {
    testWebSocketTimerCleanup();
    testNotificationTimeoutCleanup();
    testProgressTrackerCleanup();
    testSSETimerCleanup();
    
    console.log('\n✅ All streaming memory leak tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };