'use client';

import React, { Suspense, lazy } from 'react';

import { ChartMemoryManager } from './chart-memory-manager';

const LineChart = lazy(() =>
  import('./line-chart').then((module) => ({ default: module.LineChart }))
);
const BarChart = lazy(() => import('./bar-chart').then((module) => ({ default: module.BarChart })));
const PieChart = lazy(() => import('./pie-chart').then((module) => ({ default: module.PieChart })));
const Heatmap = lazy(() => import('./heatmap').then((module) => ({ default: module.Heatmap })));

interface IChartLoaderProps {
  type: 'line' | 'bar' | 'pie' | 'heatmap';
  data: any;
  title?: string;
  height?: number;
  [key: string]: any;
}

const ChartLoadingFallback = ({ height = 300 }: { height?: number }) => (
  <div
    className="flex items-center justify-center bg-gray-50 rounded-lg animate-pulse"
    style={{ height: `${height}px` }}
  >
    <div className="text-center text-gray-500">
      <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded animate-pulse" />
      <p className="text-sm">Loading chart...</p>
    </div>
  </div>
);

export function LazyChartLoader({ type, data, title, height = 300, ...props }: IChartLoaderProps) {
  const renderChart = () => {
    const chartTitle = title || '';

    switch (type) {
      case 'line':
        return <LineChart data={data} title={chartTitle} height={height} {...props} />;
      case 'bar':
        return <BarChart data={data} title={chartTitle} height={height} {...props} />;
      case 'pie':
        return <PieChart data={data} title={chartTitle} height={height} {...props} />;
      case 'heatmap':
        return <Heatmap data={data} title={chartTitle} height={height} {...props} />;
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <ChartMemoryManager>
      <Suspense fallback={<ChartLoadingFallback height={height} />}>{renderChart()}</Suspense>
    </ChartMemoryManager>
  );
}

export const LazyLineChart = (props: any) => (
  <ChartMemoryManager>
    <Suspense fallback={<ChartLoadingFallback height={props.height} />}>
      <LineChart {...props} />
    </Suspense>
  </ChartMemoryManager>
);

export const LazyBarChart = (props: any) => (
  <ChartMemoryManager>
    <Suspense fallback={<ChartLoadingFallback height={props.height} />}>
      <BarChart {...props} />
    </Suspense>
  </ChartMemoryManager>
);

export const LazyPieChart = (props: any) => (
  <ChartMemoryManager>
    <Suspense fallback={<ChartLoadingFallback height={props.height} />}>
      <PieChart {...props} />
    </Suspense>
  </ChartMemoryManager>
);

export const LazyHeatmap = (props: any) => (
  <ChartMemoryManager>
    <Suspense fallback={<ChartLoadingFallback height={props.height} />}>
      <Heatmap {...props} />
    </Suspense>
  </ChartMemoryManager>
);
