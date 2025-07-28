import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface ChartPerformanceMetrics {
  renderTime: number;
  dataProcessingTime: number;
  totalUpdateTime: number;
  memoryUsage: number;
  frameRate: number;
  lastRenderTimestamp: number;
}

export interface ChartPerformanceOptions {
  enableMemoryTracking?: boolean;
  enableFrameRateTracking?: boolean;
  sampleSize?: number;
  reportingInterval?: number;
}

export interface UseChartPerformanceReturn {
  metrics: ChartPerformanceMetrics;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  resetMetrics: () => void;
  recordDataProcessing: (startTime: number) => void;
  recordRender: (startTime: number) => void;
  getAverageMetrics: () => ChartPerformanceMetrics;
}

const defaultMetrics: ChartPerformanceMetrics = {
  renderTime: 0,
  dataProcessingTime: 0,
  totalUpdateTime: 0,
  memoryUsage: 0,
  frameRate: 0,
  lastRenderTimestamp: 0,
};

const defaultOptions: Required<ChartPerformanceOptions> = {
  enableMemoryTracking: true,
  enableFrameRateTracking: true,
  sampleSize: 10,
  reportingInterval: 1000,
};

export function useChartPerformance(
  options: ChartPerformanceOptions = {}
): UseChartPerformanceReturn {
  const opts = { ...defaultOptions, ...options };
  const [metrics, setMetrics] = useState<ChartPerformanceMetrics>(defaultMetrics);
  const [isTracking, setIsTracking] = useState(false);

  // Performance tracking state
  const metricsHistory = useRef<ChartPerformanceMetrics[]>([]);
  const frameTimestamps = useRef<number[]>([]);
  const animationFrameId = useRef<number | null>(null);
  const reportingIntervalId = useRef<NodeJS.Timeout | null>(null);

  // Memory tracking
  const measureMemoryUsage = useCallback((): number => {
    if (!opts.enableMemoryTracking || typeof window === 'undefined') {
      return 0;
    }

    // Use performance.measureUserAgentSpecificMemory if available and crossOriginIsolated is true (Chrome)
    if (self.crossOriginIsolated && 'measureUserAgentSpecificMemory' in performance) {
      return (performance as any).measureUserAgentSpecificMemory?.()?.bytes || 0;
    }

    // Fallback to performance.memory if available
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory?.usedJSHeapSize || 0;
    }

    return 0;
  }, [opts.enableMemoryTracking]);

  // Frame rate tracking
  const trackFrameRate = useCallback(() => {
    if (!opts.enableFrameRateTracking) return;

    const now = performance.now();
    frameTimestamps.current.push(now);

    // Keep only recent timestamps (last second)
    frameTimestamps.current = frameTimestamps.current.filter(
      timestamp => now - timestamp < 1000
    );

    if (isTracking && animationFrameId.current !== null) {
      animationFrameId.current = requestAnimationFrame(trackFrameRate);
    }
  }, [opts.enableFrameRateTracking, isTracking]);

  // Calculate current frame rate
  const getCurrentFrameRate = useCallback((): number => {
    if (!opts.enableFrameRateTracking || frameTimestamps.current.length < 2) {
      return 0;
    }

    const now = performance.now();
    const recentFrames = frameTimestamps.current.filter(
      timestamp => now - timestamp < 1000
    );

    return recentFrames.length;
  }, [opts.enableFrameRateTracking]);

  // Record data processing performance
  const recordDataProcessing = useCallback((startTime: number) => {
    if (!isTracking) return;

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    setMetrics(prev => ({
      ...prev,
      dataProcessingTime: processingTime,
      totalUpdateTime: prev.renderTime + processingTime,
      lastRenderTimestamp: endTime,
    }));
  }, [isTracking]);

  // Record render performance
  const recordRender = useCallback((startTime: number) => {
    if (!isTracking) return;

    const endTime = performance.now();
    const renderTime = endTime - startTime;
    const memoryUsage = measureMemoryUsage();
    const frameRate = getCurrentFrameRate();

    const newMetrics: ChartPerformanceMetrics = {
      renderTime,
      dataProcessingTime: metrics.dataProcessingTime,
      totalUpdateTime: metrics.dataProcessingTime + renderTime,
      memoryUsage,
      frameRate,
      lastRenderTimestamp: endTime,
    };

    setMetrics(newMetrics);

    // Add to history for averaging
    metricsHistory.current.push(newMetrics);
    if (metricsHistory.current.length > opts.sampleSize) {
      metricsHistory.current.shift();
    }
  }, [isTracking, measureMemoryUsage, getCurrentFrameRate, metrics.dataProcessingTime, opts.sampleSize]);

  // Get average metrics
  const getAverageMetrics = useCallback((): ChartPerformanceMetrics => {
    if (metricsHistory.current.length === 0) {
      return defaultMetrics;
    }

    const history = metricsHistory.current;
    const count = history.length;

    return {
      renderTime: history.reduce((sum, m) => sum + m.renderTime, 0) / count,
      dataProcessingTime: history.reduce((sum, m) => sum + m.dataProcessingTime, 0) / count,
      totalUpdateTime: history.reduce((sum, m) => sum + m.totalUpdateTime, 0) / count,
      memoryUsage: history.reduce((sum, m) => sum + m.memoryUsage, 0) / count,
      frameRate: history.reduce((sum, m) => sum + m.frameRate, 0) / count,
      lastRenderTimestamp: Math.max(...history.map(m => m.lastRenderTimestamp)),
    };
  }, []);

  // Start tracking
  const startTracking = useCallback(() => {
    setIsTracking(true);
    frameTimestamps.current = [];
    metricsHistory.current = [];

    if (opts.enableFrameRateTracking) {
      animationFrameId.current = requestAnimationFrame(trackFrameRate);
    }

    // Set up periodic reporting
    if (opts.reportingInterval > 0) {
      reportingIntervalId.current = setInterval(() => {
        const avgMetrics = getAverageMetrics();
        if (avgMetrics.renderTime > 0 && opts.debugMode) {
          console.debug('Chart Performance Metrics:', {
            ...avgMetrics,
            memoryUsage: `${(avgMetrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
            renderTime: `${avgMetrics.renderTime.toFixed(2)} ms`,
            dataProcessingTime: `${avgMetrics.dataProcessingTime.toFixed(2)} ms`,
            totalUpdateTime: `${avgMetrics.totalUpdateTime.toFixed(2)} ms`,
            frameRate: `${avgMetrics.frameRate.toFixed(1)} FPS`,
          });
        }
      }, opts.reportingInterval);
    }
  }, [opts.enableFrameRateTracking, opts.reportingInterval, trackFrameRate, getAverageMetrics]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);

    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    if (reportingIntervalId.current !== null) {
      clearInterval(reportingIntervalId.current);
      reportingIntervalId.current = null;
    }
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics(defaultMetrics);
    metricsHistory.current = [];
    frameTimestamps.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // Auto-start tracking if component mounts while supposed to be tracking
  useEffect(() => {
    if (isTracking && animationFrameId.current === null && opts.enableFrameRateTracking) {
      animationFrameId.current = requestAnimationFrame(trackFrameRate);
    }
  }, [isTracking, opts.enableFrameRateTracking, trackFrameRate]);

  return {
    metrics,
    isTracking,
    startTracking,
    stopTracking,
    resetMetrics,
    recordDataProcessing,
    recordRender,
    getAverageMetrics,
  };
}

// Higher-order component for automatic chart performance tracking
export function withChartPerformance<T extends object>(
  WrappedComponent: React.ComponentType<T & { chartPerformance?: UseChartPerformanceReturn }>,
  options?: ChartPerformanceOptions
) {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const EnhancedComponent = (props: T) => {
    const performance = useChartPerformance(options);

    useEffect(() => {
      performance.startTracking();
      return () => performance.stopTracking();
    }, [performance]);

    return React.createElement(WrappedComponent, { ...props, chartPerformance: performance });
  };

  EnhancedComponent.displayName = `withChartPerformance(${displayName})`;
  return EnhancedComponent;
}

// Helper hook for measuring specific operations
export function usePerformanceMeasure() {
  const measureOperation = useCallback(<T>(
    operationName: string,
    operation: () => T
  ): { result: T; duration: number } => {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.debug(`${operationName} took ${duration.toFixed(2)}ms`);

    return { result, duration };
  }, []);

  const measureAsyncOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> => {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.debug(`${operationName} took ${duration.toFixed(2)}ms`);

    return { result, duration };
  }, []);

  return { measureOperation, measureAsyncOperation };
}