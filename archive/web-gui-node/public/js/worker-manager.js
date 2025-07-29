/**
 * DinoAir Worker Manager
 * Coordinates all Web Workers and provides unified interface
 */

class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.pendingTasks = new Map();
    this.taskCounter = 0;
    this.workerPool = new Map();
    this.maxWorkersPerType = 2;

    this.init();
  }

  async init() {
    console.log('[Worker Manager] Initializing...');

    // Initialize worker pools
    await this.initializeWorkerPool('artifact-processor', '/js/workers/artifact-processor.worker.js');
    await this.initializeWorkerPool('search-indexer', '/js/workers/search-indexer.worker.js');
    await this.initializeWorkerPool('syntax-highlighter', '/js/workers/syntax-highlighter.worker.js');

    console.log('[Worker Manager] Initialized successfully');
  }

  async initializeWorkerPool(type, scriptPath) {
    const pool = [];

    for (let i = 0; i < this.maxWorkersPerType; i++) {
      try {
        const worker = new Worker(scriptPath);

        worker.addEventListener('message', event => {
          this.handleWorkerMessage(type, event);
        });

        worker.addEventListener('error', error => {
          console.error(`[Worker Manager] Worker error (${type}):`, error);
        });

        pool.push({
          worker,
          busy: false,
          id: `${type}-${i}`
        });
      } catch (error) {
        console.error(`[Worker Manager] Failed to create worker (${type}):`, error);
      }
    }

    this.workerPool.set(type, pool);
    console.log(`[Worker Manager] Created ${pool.length} workers for ${type}`);
  }

  handleWorkerMessage(workerType, event) {
    const { type, id, data } = event.data;
    const task = this.pendingTasks.get(id);

    if (!task) {
      console.warn(`[Worker Manager] Received message for unknown task: ${id}`);
      return;
    }

    switch (type) {
      case 'PROGRESS':
        if (task.onProgress) {
          task.onProgress(data);
        }
        break;

      case 'SUCCESS':
        this.completeTask(id, null, data);
        break;

      case 'ERROR':
        this.completeTask(id, new Error(data.error), null);
        break;

      default:
        console.warn(`[Worker Manager] Unknown message type: ${type}`);
    }
  }

  completeTask(taskId, error, result) {
    const task = this.pendingTasks.get(taskId);
    if (!task) { return; }

    // Mark worker as available
    if (task.workerInfo) {
      task.workerInfo.busy = false;
    }

    // Remove from pending tasks
    this.pendingTasks.delete(taskId);

    // Call appropriate callback
    if (error && task.onError) {
      task.onError(error);
    } else if (result && task.onSuccess) {
      task.onSuccess(result);
    }
  }

  getAvailableWorker(type) {
    const pool = this.workerPool.get(type);
    if (!pool) { return null; }

    return pool.find(workerInfo => !workerInfo.busy);
  }

  async executeTask(workerType, taskType, data, callbacks = {}) {
    const taskId = `task-${++this.taskCounter}`;

    // Get available worker
    const workerInfo = this.getAvailableWorker(workerType);
    if (!workerInfo) {
      throw new Error(`No available workers for type: ${workerType}`);
    }

    // Mark worker as busy
    workerInfo.busy = true;

    // Store task info
    this.pendingTasks.set(taskId, {
      workerType,
      taskType,
      workerInfo,
      onProgress: callbacks.onProgress,
      onSuccess: callbacks.onSuccess,
      onError: callbacks.onError
    });

    // Send task to worker
    workerInfo.worker.postMessage({
      type: taskType,
      id: taskId,
      data
    });

    return taskId;
  }

  // Artifact Processing Methods
  async processArtifact(artifact, callbacks = {}) {
    return this.executeTask('artifact-processor', 'PROCESS_ARTIFACT', { artifact }, callbacks);
  }

  async compressFiles(files, options = {}, callbacks = {}) {
    return this.executeTask('artifact-processor', 'COMPRESS_FILES', { files, options }, callbacks);
  }

  async decompressArchive(archiveData, options = {}, callbacks = {}) {
    return this.executeTask('artifact-processor', 'DECOMPRESS_ARCHIVE', { archiveData, options }, callbacks);
  }

  async batchProcessArtifacts(artifacts, options = {}, callbacks = {}) {
    return this.executeTask('artifact-processor', 'BATCH_PROCESS', { artifacts, options }, callbacks);
  }

  // Search Indexing Methods
  async indexArtifact(artifact, callbacks = {}) {
    return this.executeTask('search-indexer', 'INDEX_ARTIFACT', { artifact }, callbacks);
  }

  async indexBatch(artifacts, callbacks = {}) {
    return this.executeTask('search-indexer', 'INDEX_BATCH', { artifacts }, callbacks);
  }

  async search(query, options = {}, callbacks = {}) {
    return this.executeTask('search-indexer', 'SEARCH', { query, options }, callbacks);
  }

  async advancedSearch(query, options = {}, callbacks = {}) {
    return this.executeTask('search-indexer', 'ADVANCED_SEARCH', { query, options }, callbacks);
  }

  async fuzzySearch(query, options = {}, callbacks = {}) {
    return this.executeTask('search-indexer', 'FUZZY_SEARCH', { query, options }, callbacks);
  }

  async getSearchSuggestions(query, limit = 10, callbacks = {}) {
    return this.executeTask('search-indexer', 'GET_SUGGESTIONS', { query, limit }, callbacks);
  }

  async getIndexStats(callbacks = {}) {
    return this.executeTask('search-indexer', 'GET_INDEX_STATS', {}, callbacks);
  }

  // Syntax Highlighting Methods
  async highlightCode(code, language, options = {}, callbacks = {}) {
    return this.executeTask('syntax-highlighter', 'HIGHLIGHT_CODE', { code, language, options }, callbacks);
  }

  async highlightBatch(items, callbacks = {}) {
    return this.executeTask('syntax-highlighter', 'HIGHLIGHT_BATCH', { items }, callbacks);
  }

  // Promise-based API
  processArtifactAsync(artifact) {
    return new Promise((resolve, reject) => {
      this.processArtifact(artifact, {
        onSuccess: resolve,
        onError: reject
      });
    });
  }

  searchAsync(query, options = {}) {
    return new Promise((resolve, reject) => {
      this.search(query, options, {
        onSuccess: resolve,
        onError: reject
      });
    });
  }

  highlightCodeAsync(code, language, options = {}) {
    return new Promise((resolve, reject) => {
      this.highlightCode(code, language, options, {
        onSuccess: resolve,
        onError: reject
      });
    });
  }

  // Utility Methods
  getWorkerStats() {
    const stats = {
      totalWorkers: 0,
      busyWorkers: 0,
      availableWorkers: 0,
      pendingTasks: this.pendingTasks.size,
      workerTypes: {}
    };

    for (const [type, pool] of this.workerPool.entries()) {
      const busy = pool.filter(w => w.busy).length;
      const available = pool.length - busy;

      stats.totalWorkers += pool.length;
      stats.busyWorkers += busy;
      stats.availableWorkers += available;

      stats.workerTypes[type] = {
        total: pool.length,
        busy,
        available
      };
    }

    return stats;
  }

  cancelTask(taskId) {
    const task = this.pendingTasks.get(taskId);
    if (task) {
      // Mark worker as available
      if (task.workerInfo) {
        task.workerInfo.busy = false;
      }

      // Remove from pending tasks
      this.pendingTasks.delete(taskId);

      console.log(`[Worker Manager] Cancelled task: ${taskId}`);
      return true;
    }

    return false;
  }

  async terminateAllWorkers() {
    console.log('[Worker Manager] Terminating all workers...');

    for (const [type, pool] of this.workerPool.entries()) {
      for (const workerInfo of pool) {
        workerInfo.worker.terminate();
      }
    }

    this.workerPool.clear();
    this.pendingTasks.clear();

    console.log('[Worker Manager] All workers terminated');
  }

  async restartWorkerPool(type) {
    console.log(`[Worker Manager] Restarting worker pool: ${type}`);

    // Terminate existing workers
    const pool = this.workerPool.get(type);
    if (pool) {
      for (const workerInfo of pool) {
        workerInfo.worker.terminate();
      }
    }

    // Reinitialize
    const scriptPaths = {
      'artifact-processor': '/js/workers/artifact-processor.worker.js',
      'search-indexer': '/js/workers/search-indexer.worker.js',
      'syntax-highlighter': '/js/workers/syntax-highlighter.worker.js'
    };

    if (scriptPaths[type]) {
      await this.initializeWorkerPool(type, scriptPaths[type]);
    }
  }

  // Health check
  async healthCheck() {
    const stats = this.getWorkerStats();
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      stats,
      issues: []
    };

    // Check for issues
    if (stats.availableWorkers === 0 && stats.pendingTasks > 0) {
      health.status = 'degraded';
      health.issues.push('No available workers but tasks are pending');
    }

    if (stats.totalWorkers === 0) {
      health.status = 'unhealthy';
      health.issues.push('No workers available');
    }

    return health;
  }
}

// Create global instance
window.workerManager = new WorkerManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkerManager;
}

console.log('[Worker Manager] Script loaded');
