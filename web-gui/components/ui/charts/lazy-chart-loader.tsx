'use client';

import React, { Suspense, lazy } from 'react';

const LineChart = lazy(() => import('./line-chart').then((m) => ({ default: m.LineChart })));
const BarChart = lazy(() => import('./bar-chart').then((m) => ({ default: m.BarChart })));
const PieChart = lazy(() => import('./pie-chart').then((m) => ({ default: m.PieChart })));
const Heatmap = lazy(() => import('./heatmap').then((m) => ({ default: m.Heatmap })));

interface ILazyChartLoaderProps {
  type: 'line' | 'bar' | 'pie' | 'heatmap';
  data: any;
  [key: string]: any;
}

function ChartLoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64 w-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-2 text-sm text-gray-600">Loading chart...</span>
    </div>
  );
}

export function LazyChartLoader({ type, ...props }: ILazyChartLoaderProps) {
  const ChartComponent = {
    line: LineChart,
    bar: BarChart,
    pie: PieChart,
    heatmap: Heatmap,
  }[type];

  if (!ChartComponent) {
    return <div>Unsupported chart type: {type}</div>;
  }

  return (
    <Suspense fallback={<ChartLoadingSpinner />}>
      <ChartComponent {...props} />
    </Suspense>
  );
}
