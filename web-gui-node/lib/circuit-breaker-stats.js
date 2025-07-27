const { ollamaBreaker, comfyuiBreaker } = require('./circuit-breaker');

class CircuitBreakerStats {
  static getAllStats() {
    return {
      ollama: ollamaBreaker.getStats(),
      comfyui: comfyuiBreaker.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  static resetAll() {
    ollamaBreaker.reset();
    comfyuiBreaker.reset();
    return {
      message: 'All circuit breakers reset',
      timestamp: new Date().toISOString()
    };
  }

  static getHealthStatus() {
    const stats = this.getAllStats();
    const isHealthy = stats.ollama.state === 'closed' && stats.comfyui.state === 'closed';

    return {
      healthy: isHealthy,
      status: isHealthy ? 'All services operational' : 'Some services degraded',
      circuits: {
        ollama: {
          state: stats.ollama.state,
          healthy: stats.ollama.state === 'closed'
        },
        comfyui: {
          state: stats.comfyui.state,
          healthy: stats.comfyui.state === 'closed'
        }
      }
    };
  }
}

module.exports = { CircuitBreakerStats };
