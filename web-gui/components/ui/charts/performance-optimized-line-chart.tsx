'use client';

import React, { useEffect, useMemo } from 'react';
import { LineChart } from '@/components/ui/charts/line-chart';
import { useChartPerformance } from '@/hooks/useChartPerformance';
import type { TimeSeriesDataPoint } from '@/types/analytics';

interface PerformanceOptimizedLineChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  color?: string;
  fill?: boolean;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
}

/**
 * Example component demonstrating how to integrate chart performance monitoring
 * with existing chart components. This shows the minimal changes needed to add
 * performance tracking to any chart component.
 */
export function PerformanceOptimizedLineChart({
  data,
  title,
  color = '#3b82f6',
  fill = false,
  height = 300,
  showGrid = true,
  showLegend = false,
  yAxisLabel,
  xAxisLabel,
}: PerformanceOptimizedLineChartProps) {
  const {
    metrics,
    isTracking,
    startTracking,
    stopTracking,
    recordDataProcessing,
    recordRender,
    getAverageMetrics,
  } = useChartPerformance({
    enableMemoryTracking: true,
    enableFrameRateTracking: true,
    sampleSize: 5,
    reportingInterval: 2000, // Report every 2 seconds
  });

  // Start tracking when component mounts
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, [startTracking, stopTracking]);

  // Measure data processing performance
  const processedData = useMemo(() => {
    const startTime = performance.now();
    
    // Simulate data processing work
    const result = data.map((point) => ({
      ...point,
      label: point.label ?? new Date(point.timestamp).toLocaleDateString(),
    }));
    
    if (isTracking) {
      recordDataProcessing(startTime);
    }
    
    return result;
  }, [data, recordDataProcessing, isTracking]);

  // Measure render performance
  useEffect(() => {
    if (isTracking) {
      const startTime = performance.now();
      
      // Use setTimeout to capture render completion
      const timeoutId = setTimeout(() => {
        recordRender(startTime);
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [processedData, recordRender, isTracking]);

  return (
    <div className="relative">
      <LineChart
        data={processedData}
        title={title}
        color={color}
        fill={fill}
        height={height}
        showGrid={showGrid}
        showLegend={showLegend}
        yAxisLabel={yAxisLabel}
        xAxisLabel={xAxisLabel}
      />
      
      {/* Performance metrics overlay (only in development) */}
      {process.env.NODE_ENV === 'development' && isTracking && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs">
          <div className="space-y-1">
            <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
            <div>Data: {metrics.dataProcessingTime.toFixed(2)}ms</div>
            <div>Total: {metrics.totalUpdateTime.toFixed(2)}ms</div>
            {metrics.memoryUsage > 0 && (
              <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
            )}
            {metrics.frameRate > 0 && (
              <div>FPS: {metrics.frameRate.toFixed(1)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Higher-order component version using the withChartPerformance wrapper
 */
export const LineChartWithPerformance = React.memo(LineChart);

/**
 * Example usage in analytics dashboard:
 * 
 * ```tsx
 * import { PerformanceOptimizedLineChart } from './performance-optimized-line-chart';
 * 
 * function AnalyticsDashboard() {
 *   return (
 *     <PerformanceOptimizedLineChart
 *       data={analyticsData.metrics.chat.dailyActivity}
 *       title="Chat Activity Over Time"
 *       color="#3b82f6"
 *       height={400}
 *     />
 *   );
 * }
 * ```
 * 
 * This demonstrates:
 * 1. How to add performance monitoring to existing chart components
 * 2. Measuring data processing vs render time separately
 * 3. Optional development-mode performance overlay
 * 4. Integration with the monitoring dashboard
 */