const EventEmitter = require('events');

class CircuitState {
  static CLOSED = 'closed';
  static OPEN = 'open';
  static HALF_OPEN = 'half_open';
}

class CircuitOpenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

class CircuitBreaker extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      name: config.name,
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 3,
      timeout: config.timeout || 30000,
      resetTimeout: config.resetTimeout || 60000,
      ...config
    };

    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0
    };
  }

  async call(fn, ...args) {
    if (!this._shouldAllowRequest()) {
      this.stats.rejectedCalls++;
      throw new CircuitOpenError(`Circuit ${this.config.name} is open`);
    }

    this.stats.totalCalls++;
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        fn(...args),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${this.config.timeout}ms`)), this.config.timeout)
        )
      ]);

      this._onSuccess();
      this.stats.successfulCalls++;
      return result;
    } catch (error) {
      this._onFailure(error);
      this.stats.failedCalls++;
      throw error;
    }
  }

  _shouldAllowRequest() {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this._transitionToHalfOpen();
        return true;
      }
      return false;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      return this.halfOpenCalls < this.config.successThreshold;
    }

    return false;
  }

  _onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      this.halfOpenCalls++;

      if (this.successCount >= this.config.successThreshold) {
        this._transitionToClosed();
      }
    }
  }

  _onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN
        || this.failureCount >= this.config.failureThreshold) {
      this._transitionToOpen();
    }
  }

  _transitionToOpen() {
    if (this.state !== CircuitState.OPEN) {
      this.state = CircuitState.OPEN;
      this.successCount = 0;
      this.halfOpenCalls = 0;
      this.emit('stateChange', { from: this.state, to: CircuitState.OPEN, circuit: this.config.name });
      console.warn(`Circuit ${this.config.name} opened due to failures`);
    }
  }

  _transitionToClosed() {
    if (this.state !== CircuitState.CLOSED) {
      const oldState = this.state;
      this.state = CircuitState.CLOSED;
      this.successCount = 0;
      this.halfOpenCalls = 0;
      this.failureCount = 0;
      this.emit('stateChange', { from: oldState, to: CircuitState.CLOSED, circuit: this.config.name });
      console.info(`Circuit ${this.config.name} closed - service recovered`);
    }
  }

  _transitionToHalfOpen() {
    if (this.state === CircuitState.OPEN) {
      this.state = CircuitState.HALF_OPEN;
      this.halfOpenCalls = 0;
      this.successCount = 0;
      this.emit('stateChange', { from: CircuitState.OPEN, to: CircuitState.HALF_OPEN, circuit: this.config.name });
      console.info(`Circuit ${this.config.name} half-open - testing recovery`);
    }
  }

  getStats() {
    return {
      name: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      ...this.stats
    };
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      rejectedCalls: 0
    };
    console.info(`Circuit ${this.config.name} manually reset`);
  }
}

const ollamaBreaker = new CircuitBreaker({
  name: 'Ollama',
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,
  resetTimeout: 20000
});

const comfyuiBreaker = new CircuitBreaker({
  name: 'ComfyUI',
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 120000,
  resetTimeout: 30000
});

module.exports = { CircuitBreaker, CircuitOpenError, ollamaBreaker, comfyuiBreaker };
