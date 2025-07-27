'use client';

import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

interface PerformanceInfo {
  fps: number;
  memoryUsage: number;
  memoryLimit: number;
  isHealthy: boolean;
  warnings: string[];
}

const MemoryMonitor: React.FC<{
  showDetails?: boolean;
  onMemoryWarning?: (warning: string) => void;
  warningThreshold?: number;
  criticalThreshold?: number;
}> = ({
  showDetails = false,
  onMemoryWarning,
  warningThreshold = 0.8, // 80% of memory limit
  criticalThreshold = 0.9 // 90% of memory limit
}) => {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [performanceInfo, setPerformanceInfo] = useState<PerformanceInfo | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [lastTime, setLastTime] = useState(performance.now());

  // Check if Performance API is available
  const isPerformanceAvailable = useMemo(() => {
    return (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in (window.performance as any)
    );
  }, []);

  // Format bytes to human readable format
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Calculate FPS
  const calculateFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTime;

    if (delta >= 1000) {
      // Update every second
      const fps = Math.round((frameCount * 1000) / delta);
      setLastTime(now);
      setFrameCount(0);
      return fps;
    }

    setFrameCount((prev) => prev + 1);
    return null;
  }, [frameCount, lastTime]);

  // Collect memory and performance data
  const collectData = useCallback(() => {
    if (!isPerformanceAvailable) return;

    try {
      const memory = (window.performance as any).memory;
      const memoryData: MemoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };

      setMemoryInfo(memoryData);

      const fps = calculateFPS();
      if (fps !== null) {
        const memoryUsageRatio = memoryData.usedJSHeapSize / memoryData.jsHeapSizeLimit;
        const warnings: string[] = [];

        // Check for memory warnings
        if (memoryUsageRatio > criticalThreshold) {
          warnings.push('Critical memory usage detected');
          onMemoryWarning?.('Critical memory usage: ' + Math.round(memoryUsageRatio * 100) + '%');
        } else if (memoryUsageRatio > warningThreshold) {
          warnings.push('High memory usage detected');
          onMemoryWarning?.('High memory usage: ' + Math.round(memoryUsageRatio * 100) + '%');
        }

        // Check for low FPS
        if (fps < 30) {
          warnings.push('Low frame rate detected');
        }

        const perfInfo: PerformanceInfo = {
          fps,
          memoryUsage: memoryUsageRatio,
          memoryLimit: memoryData.jsHeapSizeLimit,
          isHealthy: warnings.length === 0,
          warnings
        };

        setPerformanceInfo(perfInfo);
      }
    } catch (error) {
      console.warn('Memory monitoring failed:', error);
    }
  }, [isPerformanceAvailable, calculateFPS, onMemoryWarning, warningThreshold, criticalThreshold]);

  // Start/stop monitoring
  useEffect(() => {
    if (!isMonitoring || !isPerformanceAvailable) return;

    const interval = setInterval(collectData, 1000); // Collect data every second
    const animationFrame = () => {
      if (isMonitoring) {
        calculateFPS();
        requestAnimationFrame(animationFrame);
      }
    };

    requestAnimationFrame(animationFrame);

    return () => {
      clearInterval(interval);
    };
  }, [isMonitoring, isPerformanceAvailable, collectData, calculateFPS]);

  // Auto-start monitoring in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setIsMonitoring(true);
    }
  }, []);

  // Force garbage collection (if available)
  const forceGC = useCallback(() => {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      setTimeout(collectData, 100); // Collect data after GC
    } else {
      console.warn('Garbage collection not available. Add --expose-gc flag to Chrome.');
    }
  }, [collectData]);

  // Get status color based on memory usage
  const getStatusColor = useMemo(() => {
    if (!performanceInfo) return 'text-gray-500';

    if (!performanceInfo.isHealthy) {
      return performanceInfo.memoryUsage > criticalThreshold ? 'text-red-500' : 'text-yellow-500';
    }

    return 'text-green-500';
  }, [performanceInfo, criticalThreshold]);

  // Get status icon
  const getStatusIcon = useMemo(() => {
    if (!performanceInfo) return <Activity className="h-4 w-4" />;

    if (!performanceInfo.isHealthy) {
      return performanceInfo.memoryUsage > criticalThreshold ? (
        <XCircle className="h-4 w-4" />
      ) : (
        <AlertTriangle className="h-4 w-4" />
      );
    }

    return <CheckCircle className="h-4 w-4" />;
  }, [performanceInfo, criticalThreshold]);

  if (!isPerformanceAvailable) {
    return <div className="text-xs text-gray-500 p-2">Memory monitoring not available</div>;
  }

  return (
    <div className="memory-monitor p-2 text-xs border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={getStatusColor}>{getStatusIcon}</div>
          <span className="font-medium">Memory Monitor</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-2 py-1 rounded text-xs ${
              isMonitoring
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isMonitoring ? 'Stop' : 'Start'}
          </button>

          <button
            onClick={forceGC}
            className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
            title="Force garbage collection (requires --expose-gc flag)"
          >
            GC
          </button>
        </div>
      </div>

      {memoryInfo && performanceInfo && showDetails && (
        <div className="space-y-2">
          {/* Memory Usage */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span>Memory Usage:</span>
              <span className={getStatusColor}>
                {Math.round(performanceInfo.memoryUsage * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  performanceInfo.memoryUsage > criticalThreshold
                    ? 'bg-red-500'
                    : performanceInfo.memoryUsage > warningThreshold
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${performanceInfo.memoryUsage * 100}%` }}
              />
            </div>
          </div>

          {/* Memory Details */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Used:</span>
              <span className="ml-1">{formatBytes(memoryInfo.usedJSHeapSize)}</span>
            </div>
            <div>
              <span className="text-gray-500">Total:</span>
              <span className="ml-1">{formatBytes(memoryInfo.totalJSHeapSize)}</span>
            </div>
            <div>
              <span className="text-gray-500">Limit:</span>
              <span className="ml-1">{formatBytes(memoryInfo.jsHeapSizeLimit)}</span>
            </div>
            <div>
              <span className="text-gray-500">FPS:</span>
              <span
                className={`ml-1 ${performanceInfo.fps < 30 ? 'text-red-500' : 'text-green-500'}`}
              >
                {performanceInfo.fps}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {performanceInfo.warnings.length > 0 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <div className="text-yellow-800 font-medium mb-1">Warnings:</div>
              {performanceInfo.warnings.map((warning, index) => (
                <div key={index} className="text-yellow-700 text-xs">
                  • {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compact view */}
      {memoryInfo && performanceInfo && !showDetails && (
        <div className="flex items-center justify-between text-xs">
          <span>
            {formatBytes(memoryInfo.usedJSHeapSize)} / {formatBytes(memoryInfo.jsHeapSizeLimit)}
          </span>
          <span className={getStatusColor}>
            {Math.round(performanceInfo.memoryUsage * 100)}% | {performanceInfo.fps} FPS
          </span>
        </div>
      )}
    </div>
  );
};

export default MemoryMonitor;
