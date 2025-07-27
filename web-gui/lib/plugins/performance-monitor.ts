/**
 * Plugin Performance Monitoring System
 * Tracks resource usage, execution times, and performance metrics for plugins
 */

export interface PerformanceMetrics {
  pluginId: string;

  // Execution metrics
  executionTime: {
    average: number;
    min: number;
    max: number;
    total: number;
    count: number;
  };

  // Memory metrics
  memory: {
    current: number; // Current estimated memory usage
    peak: number; // Peak memory usage
    average: number; // Average memory usage
  };

  // API call metrics
  apiCalls: {
    total: number;
    byCategory: { [category: string]: number };
    errors: number;
    averageResponseTime: number;
  };

  // Error metrics
  errors: {
    total: number;
    critical: number;
    byType: { [type: string]: number };
    lastError?: {
      message: string;
      timestamp: number;
      stack?: string;
    };
  };

  // Resource usage
  resources: {
    storageUsed: number;
    networkRequests: number;
    domModifications: number;
    eventListeners: number;
  };

  // Health score (0-100)
  healthScore: number;

  // Timestamps
  startTime: number;
  lastUpdate: number;
  uptime: number;
}

export interface PerformanceAlert {
  id: string;
  pluginId: string;
  type: 'memory' | 'execution' | 'errors' | 'resource' | 'health';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface PerformanceThresholds {
  maxExecutionTime: number; // Max execution time in ms
  maxMemoryUsage: number; // Max memory usage in bytes
  maxApiCallsPerMinute: number;
  maxErrorRate: number; // Max error rate (0-1)
  minHealthScore: number; // Min health score (0-100)
}

// Default performance thresholds
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  maxExecutionTime: 5000, // 5 seconds
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  maxApiCallsPerMinute: 100,
  maxErrorRate: 0.1, // 10% error rate
  minHealthScore: 60 // 60% health score
};

export class PluginPerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private alerts: PerformanceAlert[] = [];
  private thresholds: PerformanceThresholds;
  private activeTimers: Map<string, Map<string, number>> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  private eventTarget = new EventTarget();

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.setupGlobalMonitoring();
    this.startPeriodicCleanup();
  }

  /**
   * Initialize monitoring for a plugin
   */
  initializePlugin(pluginId: string): void {
    if (this.metrics.has(pluginId)) {
      return; // Already initialized
    }

    const initialMetrics: PerformanceMetrics = {
      pluginId,
      executionTime: {
        average: 0,
        min: Infinity,
        max: 0,
        total: 0,
        count: 0
      },
      memory: {
        current: 0,
        peak: 0,
        average: 0
      },
      apiCalls: {
        total: 0,
        byCategory: {},
        errors: 0,
        averageResponseTime: 0
      },
      errors: {
        total: 0,
        critical: 0,
        byType: {}
      },
      resources: {
        storageUsed: 0,
        networkRequests: 0,
        domModifications: 0,
        eventListeners: 0
      },
      healthScore: 100,
      startTime: Date.now(),
      lastUpdate: Date.now(),
      uptime: 0
    };

    this.metrics.set(pluginId, initialMetrics);
    this.activeTimers.set(pluginId, new Map());

    // Setup Performance Observer for this plugin
    this.setupPerformanceObserver(pluginId);
  }

  /**
   * Start timing an operation
   */
  startTiming(pluginId: string, operationId: string): void {
    const timers = this.activeTimers.get(pluginId);
    if (timers) {
      timers.set(operationId, performance.now());
    }
  }

  /**
   * End timing an operation and record metrics
   */
  endTiming(pluginId: string, operationId: string): number {
    const timers = this.activeTimers.get(pluginId);
    const metrics = this.metrics.get(pluginId);

    if (!timers || !metrics) {
      return 0;
    }

    const startTime = timers.get(operationId);
    if (startTime === undefined) {
      return 0;
    }

    const duration = performance.now() - startTime;
    timers.delete(operationId);

    // Update execution metrics
    const exec = metrics.executionTime;
    exec.total += duration;
    exec.count++;
    exec.average = exec.total / exec.count;
    exec.min = Math.min(exec.min, duration);
    exec.max = Math.max(exec.max, duration);

    this.updateMetrics(pluginId);
    this.checkThresholds(pluginId);

    return duration;
  }

  /**
   * Record API call
   */
  recordApiCall(
    pluginId: string,
    category: string,
    responseTime: number,
    success: boolean = true
  ): void {
    const metrics = this.metrics.get(pluginId);
    if (!metrics) return;

    const api = metrics.apiCalls;
    api.total++;
    api.byCategory[category] = (api.byCategory[category] || 0) + 1;

    if (!success) {
      api.errors++;
    }

    // Update average response time
    api.averageResponseTime =
      (api.averageResponseTime * (api.total - 1) + responseTime) / api.total;

    this.updateMetrics(pluginId);
    this.checkThresholds(pluginId);
  }

  /**
   * Record error
   */
  recordError(pluginId: string, error: Error, critical: boolean = false): void {
    const metrics = this.metrics.get(pluginId);
    if (!metrics) return;

    const errors = metrics.errors;
    errors.total++;

    if (critical) {
      errors.critical++;
    }

    // Categorize error
    const errorType = error.constructor.name || 'Error';
    errors.byType[errorType] = (errors.byType[errorType] || 0) + 1;

    // Store last error info
    errors.lastError = {
      message: error.message,
      timestamp: Date.now(),
      stack: error.stack
    };

    this.updateMetrics(pluginId);
    this.checkThresholds(pluginId);

    // Emit error event
    this.eventTarget.dispatchEvent(
      new CustomEvent('plugin-error', {
        detail: { pluginId, error, critical }
      })
    );
  }

  /**
   * Update resource usage
   */
  updateResourceUsage(pluginId: string, resources: Partial<PerformanceMetrics['resources']>): void {
    const metrics = this.metrics.get(pluginId);
    if (!metrics) return;

    Object.assign(metrics.resources, resources);

    this.updateMetrics(pluginId);
    this.checkThresholds(pluginId);
  }

  /**
   * Update memory usage
   */
  updateMemoryUsage(pluginId: string, currentUsage: number): void {
    const metrics = this.metrics.get(pluginId);
    if (!metrics) return;

    const memory = metrics.memory;
    memory.current = currentUsage;
    memory.peak = Math.max(memory.peak, currentUsage);

    // Update average memory usage (exponential moving average)
    memory.average = memory.average * 0.9 + currentUsage * 0.1;

    this.updateMetrics(pluginId);
    this.checkThresholds(pluginId);
  }

  /**
   * Get metrics for a plugin
   */
  getMetrics(pluginId: string): PerformanceMetrics | null {
    return this.metrics.get(pluginId) || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): { [pluginId: string]: PerformanceMetrics } {
    const result: { [pluginId: string]: PerformanceMetrics } = {};
    for (const [pluginId, metrics] of this.metrics) {
      result[pluginId] = { ...metrics };
    }
    return result;
  }

  /**
   * Get performance alerts
   */
  getAlerts(pluginId?: string): PerformanceAlert[] {
    if (pluginId) {
      return this.alerts.filter((alert) => alert.pluginId === pluginId);
    }
    return [...this.alerts];
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;

      this.eventTarget.dispatchEvent(
        new CustomEvent('alert-acknowledged', {
          detail: { alertId, alert }
        })
      );
    }
  }

  /**
   * Clear all alerts for a plugin
   */
  clearAlerts(pluginId: string): void {
    this.alerts = this.alerts.filter((alert) => alert.pluginId !== pluginId);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalPlugins: number;
    activePlugins: number;
    totalAlerts: number;
    criticalAlerts: number;
    averageHealthScore: number;
    totalMemoryUsage: number;
  } {
    const activePlugins = Array.from(this.metrics.values()).filter(
      (m) => Date.now() - m.lastUpdate < 60000 // Active in last minute
    );

    const totalMemory = activePlugins.reduce((sum, m) => sum + m.memory.current, 0);
    const avgHealth =
      activePlugins.length > 0
        ? activePlugins.reduce((sum, m) => sum + m.healthScore, 0) / activePlugins.length
        : 100;

    return {
      totalPlugins: this.metrics.size,
      activePlugins: activePlugins.length,
      totalAlerts: this.alerts.length,
      criticalAlerts: this.alerts.filter((a) => a.severity === 'critical').length,
      averageHealthScore: Math.round(avgHealth),
      totalMemoryUsage: totalMemory
    };
  }

  /**
   * Remove monitoring for a plugin
   */
  removePlugin(pluginId: string): void {
    this.metrics.delete(pluginId);
    this.activeTimers.delete(pluginId);
    this.clearAlerts(pluginId);

    // Clean up performance observer
    const observer = this.observers.get(pluginId);
    if (observer) {
      observer.disconnect();
      this.observers.delete(pluginId);
    }
  }

  /**
   * Private helper methods
   */

  private updateMetrics(pluginId: string): void {
    const metrics = this.metrics.get(pluginId);
    if (!metrics) return;

    metrics.lastUpdate = Date.now();
    metrics.uptime = metrics.lastUpdate - metrics.startTime;

    // Calculate health score
    metrics.healthScore = this.calculateHealthScore(metrics);
  }

  private calculateHealthScore(metrics: PerformanceMetrics): number {
    let score = 100;

    // Penalize high execution times
    if (metrics.executionTime.average > this.thresholds.maxExecutionTime * 0.5) {
      score -= 20;
    }
    if (metrics.executionTime.max > this.thresholds.maxExecutionTime) {
      score -= 30;
    }

    // Penalize high memory usage
    const memoryRatio = metrics.memory.current / this.thresholds.maxMemoryUsage;
    if (memoryRatio > 0.5) {
      score -= Math.min(30, memoryRatio * 30);
    }

    // Penalize errors
    const errorRate =
      metrics.apiCalls.total > 0
        ? metrics.errors.total / (metrics.apiCalls.total + metrics.errors.total)
        : 0;
    if (errorRate > this.thresholds.maxErrorRate) {
      score -= 40;
    }

    // Penalize critical errors more heavily
    if (metrics.errors.critical > 0) {
      score -= Math.min(50, metrics.errors.critical * 10);
    }

    return Math.max(0, Math.round(score));
  }

  private checkThresholds(pluginId: string): void {
    const metrics = this.metrics.get(pluginId);
    if (!metrics) return;

    // Check execution time threshold
    if (metrics.executionTime.max > this.thresholds.maxExecutionTime) {
      this.createAlert(
        pluginId,
        'execution',
        'high',
        `Execution time exceeded threshold (${metrics.executionTime.max}ms)`,
        this.thresholds.maxExecutionTime,
        metrics.executionTime.max
      );
    }

    // Check memory threshold
    if (metrics.memory.current > this.thresholds.maxMemoryUsage) {
      this.createAlert(
        pluginId,
        'memory',
        'critical',
        `Memory usage exceeded threshold (${this.formatBytes(metrics.memory.current)})`,
        this.thresholds.maxMemoryUsage,
        metrics.memory.current
      );
    }

    // Check error rate threshold
    const errorRate =
      metrics.apiCalls.total > 0
        ? metrics.errors.total / (metrics.apiCalls.total + metrics.errors.total)
        : 0;
    if (errorRate > this.thresholds.maxErrorRate) {
      this.createAlert(
        pluginId,
        'errors',
        'medium',
        `Error rate exceeded threshold (${(errorRate * 100).toFixed(1)}%)`,
        this.thresholds.maxErrorRate,
        errorRate
      );
    }

    // Check health score threshold
    if (metrics.healthScore < this.thresholds.minHealthScore) {
      this.createAlert(
        pluginId,
        'health',
        'medium',
        `Health score below threshold (${metrics.healthScore}%)`,
        this.thresholds.minHealthScore,
        metrics.healthScore
      );
    }
  }

  private createAlert(
    pluginId: string,
    type: PerformanceAlert['type'],
    severity: PerformanceAlert['severity'],
    message: string,
    threshold: number,
    currentValue: number
  ): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(
      (alert) => alert.pluginId === pluginId && alert.type === type && !alert.acknowledged
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.currentValue = currentValue;
      existingAlert.timestamp = Date.now();
      return;
    }

    const alert: PerformanceAlert = {
      id: `${pluginId}_${type}_${Date.now()}`,
      pluginId,
      type,
      severity,
      message,
      threshold,
      currentValue,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.alerts.push(alert);

    // Emit alert event
    this.eventTarget.dispatchEvent(
      new CustomEvent('performance-alert', {
        detail: alert
      })
    );
  }

  private setupPerformanceObserver(pluginId: string): void {
    if (!('PerformanceObserver' in window)) {
      return; // Performance Observer not supported
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes(pluginId)) {
            // Record performance entry
            this.recordApiCall(pluginId, 'api', entry.duration, true);
          }
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      this.observers.set(pluginId, observer);
    } catch (error) {
      console.warn('Failed to setup PerformanceObserver for plugin:', pluginId, error);
    }
  }

  private setupGlobalMonitoring(): void {
    // Monitor global memory usage
    if ('memory' in performance) {
      setInterval(() => {
        for (const [pluginId] of this.metrics) {
          // Estimate plugin memory usage (simplified)
          const estimatedUsage = Math.random() * 10 * 1024 * 1024; // Random for demo
          this.updateMemoryUsage(pluginId, estimatedUsage);
        }
      }, 5000); // Every 5 seconds
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      // Remove old acknowledged alerts
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      this.alerts = this.alerts.filter(
        (alert) => !alert.acknowledged || alert.timestamp > oneHourAgo
      );
    }, 60000); // Every minute
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Event listener methods
   */
  addEventListener(type: string, listener: EventListener): void {
    this.eventTarget.addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.eventTarget.removeEventListener(type, listener);
  }
}

// Global performance monitor instance
let globalPerformanceMonitor: PluginPerformanceMonitor | null = null;

export function getPerformanceMonitor(): PluginPerformanceMonitor {
  if (!globalPerformanceMonitor) {
    globalPerformanceMonitor = new PluginPerformanceMonitor();
  }
  return globalPerformanceMonitor;
}
