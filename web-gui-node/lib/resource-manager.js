const EventEmitter = require('events');

class ResourceManager extends EventEmitter {
  constructor() {
    super();
    this.resources = new Map();
    this.timers = new Set();
    this.intervals = new Set();
    this.streams = new Set();
    this.isShuttingDown = false;
    
    this.setupGracefulShutdown();
  }
  
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      console.log(`Received ${signal}, initiating graceful shutdown...`);
      
      try {
        await this.cleanup();
        console.log('Resource cleanup completed successfully');
        process.exit(0);
      } catch (error) {
        console.error('Error during resource cleanup:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdown('unhandledRejection');
    });
  }
  
  registerTimer(timerId) {
    this.timers.add(timerId);
    return timerId;
  }
  
  registerInterval(intervalId) {
    this.intervals.add(intervalId);
    return intervalId;
  }
  
  registerStream(stream) {
    this.streams.add(stream);
    
    stream.on('close', () => {
      this.streams.delete(stream);
    });
    
    stream.on('error', (error) => {
      console.error('Stream error:', error);
      this.streams.delete(stream);
    });
    
    return stream;
  }
  
  registerResource(key, resource, cleanupFn) {
    this.resources.set(key, { resource, cleanupFn });
    return resource;
  }
  
  clearTimer(timerId) {
    clearTimeout(timerId);
    this.timers.delete(timerId);
  }
  
  clearInterval(intervalId) {
    clearInterval(intervalId);
    this.intervals.delete(intervalId);
  }
  
  closeStream(stream) {
    if (stream && typeof stream.destroy === 'function') {
      stream.destroy();
    } else if (stream && typeof stream.end === 'function') {
      stream.end();
    }
    this.streams.delete(stream);
  }
  
  async cleanup() {
    console.log('Starting resource cleanup...');
    
    this.timers.forEach(timerId => {
      clearTimeout(timerId);
    });
    this.timers.clear();
    console.log('Cleared all timers');
    
    this.intervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.intervals.clear();
    console.log('Cleared all intervals');
    
    this.streams.forEach(stream => {
      try {
        if (stream && typeof stream.destroy === 'function') {
          stream.destroy();
        } else if (stream && typeof stream.end === 'function') {
          stream.end();
        }
      } catch (error) {
        console.error('Error closing stream:', error);
      }
    });
    this.streams.clear();
    console.log('Closed all streams');
    
    for (const [key, { resource, cleanupFn }] of this.resources.entries()) {
      try {
        if (cleanupFn) {
          await cleanupFn(resource);
        }
      } catch (error) {
        console.error(`Error cleaning up resource ${key}:`, error);
      }
    }
    this.resources.clear();
    console.log('Cleaned up all registered resources');
    
    this.emit('cleanup-complete');
  }
  
  getStats() {
    return {
      timers: this.timers.size,
      intervals: this.intervals.size,
      streams: this.streams.size,
      resources: this.resources.size,
      isShuttingDown: this.isShuttingDown
    };
  }
}

const resourceManager = new ResourceManager();

module.exports = { ResourceManager, resourceManager };
