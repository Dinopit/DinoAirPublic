'use client';

import React from 'react';
import { ChartErrorBoundary } from './chart-error-boundary';
import { AccessibleChartWrapper } from './accessible-chart-wrapper';
import type { TimeSeriesDataPoint } from '@/types/analytics';

interface IChartWrapperProps {
  children: React.ReactNode;
  data: TimeSeriesDataPoint[] | Array<{ label: string; value: number }>;
  title: string;
  description?: string;
  chartType: 'line' | 'bar' | 'pie' | 'heatmap';
  onError?: (error: Error) => void;
}

export function ChartWrapper({
  children,
  data,
  title,
  description,
  chartType,
  onError,
}: IChartWrapperProps) {
  return (
    <ChartErrorBoundary onError={onError}>
      <AccessibleChartWrapper
        data={data}
        title={title}
        description={description ?? undefined}
        chartType={chartType}
      >
        {children}
      </AccessibleChartWrapper>
    </ChartErrorBoundary>
  );
}
