'use client';

import React, { useEffect, useRef } from 'react';

declare const Chart: any;

interface ChartMemoryManagerProps {
  children: React.ReactNode;
  maxCharts?: number;
}

export function ChartMemoryManager({ children, maxCharts = 5 }: ChartMemoryManagerProps) {
  const chartInstancesRef = useRef<any[]>([]);

  useEffect(() => {
    const cleanupOldCharts = () => {
      if (chartInstancesRef.current.length > maxCharts) {
        const chartsToDestroy = chartInstancesRef.current.splice(0, chartInstancesRef.current.length - maxCharts);
        chartsToDestroy.forEach(chart => {
          try {
            chart.destroy();
          } catch (error) {
            console.warn('Error destroying chart:', error);
          }
        });
      }
    };

    const interval = setInterval(cleanupOldCharts, 30000);

    return () => {
      clearInterval(interval);
      chartInstancesRef.current.forEach(chart => {
        try {
          chart.destroy();
        } catch (error) {
          console.warn('Error destroying chart on cleanup:', error);
        }
      });
      chartInstancesRef.current = [];
    };
  }, [maxCharts]);

  const registerChart = (chart: Chart) => {
    chartInstancesRef.current.push(chart);
  };

  return (
    <div data-chart-manager="true">
      {children}
    </div>
  );
}

export function useChartMemoryManager() {
  const chartInstancesRef = useRef<any[]>([]);

  const registerChart = (chart: any) => {
    chartInstancesRef.current.push(chart);
  };

  const cleanup = () => {
    chartInstancesRef.current.forEach(chart => {
      try {
        chart.destroy();
      } catch (error) {
        console.warn('Error destroying chart:', error);
      }
    });
    chartInstancesRef.current = [];
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return { registerChart, cleanup };
}
