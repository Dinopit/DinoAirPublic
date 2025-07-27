'use client';

import React, { useRef, useEffect, useState } from 'react';

import type { TimeSeriesDataPoint } from '@/types/analytics';

interface IAccessibleChartWrapperProps {
  children: React.ReactNode;
  data: TimeSeriesDataPoint[] | Array<{ label: string; value: number }>;
  title: string;
  description?: string;
  chartType: 'line' | 'bar' | 'pie' | 'heatmap';
}

export function AccessibleChartWrapper({
  children,
  data,
  title,
  description,
  chartType,
}: IAccessibleChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!chartRef.current?.contains(event.target as Node)) return;

      setIsKeyboardMode(true);

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, data.length - 1));
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setFocusedIndex(data.length - 1);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          announceDataPoint(focusedIndex);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [data.length, focusedIndex]);

  const announceDataPoint = (index: number) => {
    if (index < 0 || index >= data.length) return;

    const point = data[index];
    if (!point) return;

    const value = 'value' in point ? point.value : 0;
    const label = 'label' in point ? point.label : `Point ${index + 1}`;

    const announcement = `${label}: ${value}`;

    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = announcement;

    document.body.appendChild(announcer);
    setTimeout(() => document.body.removeChild(announcer), 1000);
  };

  const generateDataTable = () => {
    return (
      <table className="sr-only">
        <caption>{title} - Data Table</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point, index) => {
            const value = 'value' in point ? point.value : 0;
            const label =
              'label' in point
                ? point.label
                : 'timestamp' in point
                  ? new Date(point.timestamp).toLocaleDateString()
                  : `Point ${index + 1}`;

            return (
              <tr key={index}>
                <td>{label}</td>
                <td>{value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div
      ref={chartRef}
      role="img"
      aria-label={`${title} ${chartType} chart`}
      aria-describedby={description ? `${title}-desc` : undefined}
      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
      onFocus={() => setIsKeyboardMode(true)}
      onBlur={() => setIsKeyboardMode(false)}
      onMouseEnter={() => setIsKeyboardMode(false)}
    >
      {description && (
        <div id={`${title}-desc`} className="sr-only">
          {description}
        </div>
      )}

      {children}

      {generateDataTable()}

      {isKeyboardMode && (
        <div className="sr-only" aria-live="polite">
          Use arrow keys to navigate data points, Enter or Space to announce current value, Home and
          End to jump to first or last point.
          {focusedIndex >= 0 &&
            ` Currently focused on point ${focusedIndex + 1} of ${data.length}.`}
        </div>
      )}
    </div>
  );
}
