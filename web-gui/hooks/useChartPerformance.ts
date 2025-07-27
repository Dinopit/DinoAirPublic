import { useRef, useState } from 'react';

declare const process: any;

interface ChartPerformanceMetrics {
  renderTime: number;
  dataLoadTime: number;
  totalTime: number;
  dataPoints: number;
  chartType: string;
}

export function useChartPerformance(chartType: string, dataLength: number) {
  const [metrics, setMetrics] = useState<ChartPerformanceMetrics | null>(null);
  const startTimeRef = useRef<number>(0);
  const dataLoadStartRef = useRef<number>(0);

  const startDataLoad = () => {
    dataLoadStartRef.current = performance.now();
  };

  const endDataLoad = () => {
    const dataLoadTime = performance.now() - dataLoadStartRef.current;
    return dataLoadTime;
  };

  const startRender = () => {
    startTimeRef.current = performance.now();
  };

  const endRender = (dataLoadTime: number = 0) => {
    const totalTime = performance.now() - startTimeRef.current;
    const renderTime = totalTime - dataLoadTime;

    const newMetrics: ChartPerformanceMetrics = {
      renderTime,
      dataLoadTime,
      totalTime,
      dataPoints: dataLength,
      chartType,
    };

    setMetrics(newMetrics);

    if (process?.env?.NODE_ENV === 'development') {
      console.log(`Chart Performance [${chartType}]:`, {
        ...newMetrics,
        renderTimePerPoint: renderTime / dataLength,
      });
    }

    if (totalTime > 1000) {
      console.warn(
        `Slow chart render detected: ${totalTime}ms for ${chartType} with ${dataLength} points`
      );
    }
  };

  return {
    metrics,
    startDataLoad,
    endDataLoad,
    startRender,
    endRender,
  };
}
