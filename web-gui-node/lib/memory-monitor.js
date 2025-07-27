const { resourceManager } = require('./resource-manager');

class MemoryMonitor {
  constructor(options = {}) {
    this.interval = options.interval || 30000;
    this.threshold = options.threshold || 0.8;
    this.maxHeapSize = options.maxHeapSize || 1024 * 1024 * 1024;
    this.isMonitoring = false;
    this.monitorTimer = null;
    this.stats = {
      samples: [],
      maxSamples: 100
    };
  }

  start() {
    if (this.isMonitoring) { return; }

    this.isMonitoring = true;
    this.monitorTimer = resourceManager.registerInterval(
      setInterval(() => this.checkMemory(), this.interval)
    );

    console.log('Memory monitoring started');
  }

  stop() {
    if (!this.isMonitoring) { return; }

    this.isMonitoring = false;
    if (this.monitorTimer) {
      resourceManager.clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }

    console.log('Memory monitoring stopped');
  }

  checkMemory() {
    const memUsage = process.memoryUsage();
    const timestamp = Date.now();

    const sample = {
      timestamp,
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers
    };

    this.stats.samples.push(sample);
    if (this.stats.samples.length > this.stats.maxSamples) {
      this.stats.samples.shift();
    }

    const heapUsageRatio = memUsage.heapUsed / memUsage.heapTotal;

    if (heapUsageRatio > this.threshold) {
      console.warn(`High memory usage detected: ${(heapUsageRatio * 100).toFixed(2)}%`);
      console.warn(`Heap used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.warn(`Heap total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);

      if (global.gc && typeof global.gc === 'function') {
        console.log('Triggering garbage collection...');
        global.gc();
      }
    }

    if (memUsage.heapUsed > this.maxHeapSize) {
      console.error('Memory usage exceeded maximum threshold, initiating emergency cleanup...');
      resourceManager.cleanup().catch(console.error);
    }
  }

  getStats() {
    const recent = this.stats.samples.slice(-10);
    if (recent.length === 0) { return null; }

    const avgHeapUsed = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
    const avgHeapTotal = recent.reduce((sum, s) => sum + s.heapTotal, 0) / recent.length;

    return {
      currentUsage: recent[recent.length - 1],
      averageHeapUsed: avgHeapUsed,
      averageHeapTotal: avgHeapTotal,
      usageRatio: avgHeapUsed / avgHeapTotal,
      sampleCount: this.stats.samples.length,
      isMonitoring: this.isMonitoring
    };
  }

  reset() {
    this.stats.samples = [];
  }
}

const memoryMonitor = new MemoryMonitor();

module.exports = { MemoryMonitor, memoryMonitor };
