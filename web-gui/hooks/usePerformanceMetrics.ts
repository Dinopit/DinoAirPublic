import React, { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/enhanced-client';
import { requestDeduplication } from '@/lib/api/request-deduplication';

interface PerformanceMetrics {
  renderCount: number;
  apiCalls: {
    total: number;
    cached: number;
    deduplicated: number;
    failed: number;
    byEndpoint: Record<string, number>;
  };
  loadTimes: {
    initial: number;
    lastUpdate: number;
    average: number;
  };
  cacheStats: {
    hits: number;
    misses: number;
    size: number;
  };
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface UsePerformanceMetricsOptions {
  trackRenders?: boolean;
  trackApiCalls?: boolean;
  trackLoadTimes?: boolean;
  trackMemory?: boolean;
  debugMode?: boolean;
}

// Global metrics storage
const globalMetrics: PerformanceMetrics = {
  renderCount: 0,
  apiCalls: {
    total: 0,
    cached: 0,
    deduplicated: 0,
    failed: 0,
    byEndpoint: {}
  },
  loadTimes: {
    initial: 0,
    lastUpdate: 0,
    average: 0
  },
  cacheStats: {
    hits: 0,
    misses: 0,
    size: 0
  }
};

// Track component render counts by component name
const componentRenderCounts: Record<string, number> = {};

export function usePerformanceMetrics(
  componentName?: string,
  options: UsePerformanceMetricsOptions = {}
) {
  const {
    trackRenders = true,
    trackApiCalls = true,
    trackLoadTimes = true,
    trackMemory = true,
    debugMode = false
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({ ...globalMetrics });
  const renderCountRef = useRef(0);
  const loadStartTimeRef = useRef(performance.now());
  const apiInterceptorRef = useRef<any>(null);

  // Track component renders
  useEffect(() => {
    if (trackRenders && componentName) {
      renderCountRef.current++;
      componentRenderCounts[componentName] = (componentRenderCounts[componentName] || 0) + 1;
      globalMetrics.renderCount++;
      
      if (debugMode) {
        console.debug(`[Performance] ${componentName} rendered ${renderCountRef.current} times`);
      }
    }
  });

  // Track API calls
  useEffect(() => {
    if (!trackApiCalls) return;

    // Add response interceptor to track API calls
    const interceptor = (response: Response) => {
      const url = response.url;
      const endpoint = new URL(url, window.location.origin).pathname;
      
      globalMetrics.apiCalls.total++;
      globalMetrics.apiCalls.byEndpoint[endpoint] = (globalMetrics.apiCalls.byEndpoint[endpoint] || 0) + 1;
      
      // Check if response was cached
      if (response.headers.get('x-cache') === 'hit') {
        globalMetrics.apiCalls.cached++;
        globalMetrics.cacheStats.hits++;
      } else {
        globalMetrics.cacheStats.misses++;
      }
      
      // Check response status
      if (!response.ok) {
        globalMetrics.apiCalls.failed++;
      }
      
      if (debugMode) {
        console.debug(`[Performance] API call to ${endpoint}:`, {
          cached: response.headers.get('x-cache') === 'hit',
          status: response.status
        });
      }
      
      return response;
    };
    
    apiClient.addResponseInterceptor(interceptor);
    apiInterceptorRef.current = interceptor;
    
    return () => {
      if (apiInterceptorRef.current) {
        apiClient.removeResponseInterceptor(apiInterceptorRef.current);
      }
    };
  }, [trackApiCalls, debugMode]);

  // Track load times
  useEffect(() => {
    if (trackLoadTimes) {
      const loadEndTime = performance.now();
      const loadTime = loadEndTime - loadStartTimeRef.current;
      
      if (globalMetrics.loadTimes.initial === 0) {
        globalMetrics.loadTimes.initial = loadTime;
      }
      globalMetrics.loadTimes.lastUpdate = loadTime;
      
      // Calculate average load time
      const allLoadTimes = [globalMetrics.loadTimes.initial, globalMetrics.loadTimes.lastUpdate];
      globalMetrics.loadTimes.average = allLoadTimes.reduce((a, b) => a + b, 0) / allLoadTimes.length;
      
      if (debugMode && componentName) {
        console.debug(`[Performance] ${componentName} load time: ${loadTime.toFixed(2)}ms`);
      }
    }
  }, [trackLoadTimes, debugMode, componentName]);

  // Track memory usage
  useEffect(() => {
    if (!trackMemory) return;
    
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        globalMetrics.memoryUsage = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
      }
    };
    
    // Update memory usage every 5 seconds
    const interval = setInterval(updateMemoryUsage, 5000);
    updateMemoryUsage(); // Initial update
    
    return () => clearInterval(interval);
  }, [trackMemory]);

  // Update local metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      // Get deduplication stats
      const dedupStats = requestDeduplication.getStats();
      globalMetrics.apiCalls.deduplicated = dedupStats.inFlightCount;
      
      // Update cache size (approximate based on localStorage)
      try {
        const cacheData = localStorage.getItem('dinoair-cache');
        globalMetrics.cacheStats.size = cacheData ? new Blob([cacheData]).size : 0;
      } catch (e) {
        globalMetrics.cacheStats.size = 0;
      }
      
      setMetrics({ ...globalMetrics });
    };
    
    const interval = setInterval(updateMetrics, 1000);
    updateMetrics(); // Initial update
    
    return () => clearInterval(interval);
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    globalMetrics.renderCount = 0;
    globalMetrics.apiCalls = {
      total: 0,
      cached: 0,
      deduplicated: 0,
      failed: 0,
      byEndpoint: {}
    };
    globalMetrics.loadTimes = {
      initial: 0,
      lastUpdate: 0,
      average: 0
    };
    globalMetrics.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0
    };
    
    Object.keys(componentRenderCounts).forEach(key => {
      delete componentRenderCounts[key];
    });
    
    renderCountRef.current = 0;
    loadStartTimeRef.current = performance.now();
    
    setMetrics({ ...globalMetrics });
    
    if (debugMode) {
      console.debug('[Performance] Metrics reset');
    }
  }, [debugMode]);

  // Export metrics for debugging
  const exportMetrics = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      globalMetrics,
      componentRenderCounts,
      deduplicationStats: requestDeduplication.getStats(),
      circuitBreakerState: apiClient.getCircuitBreakerState()
    };
    
    if (debugMode) {
      console.log('[Performance] Exported metrics:', exportData);
    }
    
    return exportData;
  }, [debugMode]);

  // Get specific component render count
  const getComponentRenderCount = useCallback((name: string) => {
    return componentRenderCounts[name] || 0;
  }, []);

  // Get API call stats for specific endpoint
  const getEndpointStats = useCallback((endpoint: string) => {
    return {
      calls: globalMetrics.apiCalls.byEndpoint[endpoint] || 0,
      cacheHitRate: globalMetrics.cacheStats.hits > 0 
        ? (globalMetrics.cacheStats.hits / (globalMetrics.cacheStats.hits + globalMetrics.cacheStats.misses)) * 100
        : 0
    };
  }, []);

  return {
    metrics,
    resetMetrics,
    exportMetrics,
    getComponentRenderCount,
    getEndpointStats,
    // Expose raw counts for real-time updates
    renderCount: renderCountRef.current,
    componentRenderCounts: { ...componentRenderCounts }
  };
}

// Performance monitoring component wrapper
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
  options?: UsePerformanceMetricsOptions
) {
  const WrappedComponent = (props: P) => {
    usePerformanceMetrics(componentName, options);
    return <Component {...props} />;
  };
  
  WrappedComponent.displayName = `withPerformanceTracking(${componentName})`;
  return WrappedComponent;
}

// Global performance monitor for debugging
if (typeof window !== 'undefined') {
  (window as any).__DINOAIR_PERFORMANCE__ = {
    getMetrics: () => globalMetrics,
    getRenderCounts: () => componentRenderCounts,
    getDeduplicationStats: () => requestDeduplication.getStats(),
    resetMetrics: () => {
      Object.keys(globalMetrics).forEach(key => {
        if (key === 'apiCalls') {
          globalMetrics.apiCalls = {
            total: 0,
            cached: 0,
            deduplicated: 0,
            failed: 0,
            byEndpoint: {}
          };
        } else if (key === 'loadTimes') {
          globalMetrics.loadTimes = {
            initial: 0,
            lastUpdate: 0,
            average: 0
          };
        } else if (key === 'cacheStats') {
          globalMetrics.cacheStats = {
            hits: 0,
            misses: 0,
            size: 0
          };
        } else if (key === 'renderCount') {
          globalMetrics.renderCount = 0;
        }
      });
      Object.keys(componentRenderCounts).forEach(key => {
        delete componentRenderCounts[key];
      });
    }
  };
}