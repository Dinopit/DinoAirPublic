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

    const liveRegion = document.getElementById(`${title}-live`);
    if (liveRegion) {
      liveRegion.textContent = announcement;
    }
  };

  useEffect(() => {
    if (isKeyboardMode && focusedIndex >= 0) {
      announceDataPoint(focusedIndex);
    }
  }, [focusedIndex, isKeyboardMode]);

  return (
    <div
      ref={chartRef}
      role="img"
      aria-label={`${title} ${chartType} chart`}
      aria-describedby={description ? `${title}-desc` : undefined}
      className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
      tabIndex={0}
      onFocus={() => setIsKeyboardMode(true)}
      onBlur={() => setIsKeyboardMode(false)}
    >
      {description && (
        <div id={`${title}-desc`} className="sr-only">
          {description}
        </div>
      )}

      {/* Live region for screen reader announcements */}
      <div id={`${title}-live`} aria-live="polite" aria-atomic="true" className="sr-only" />

      {children}

      {/* Screen reader accessible data table */}
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
            const label = 'label' in point ? point.label : `Point ${index + 1}`;

            return (
              <tr key={index} className={focusedIndex === index ? 'bg-blue-100' : ''}>
                <td>{label}</td>
                <td>{value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Keyboard navigation instructions */}
      {isKeyboardMode && (
        <div className="sr-only">
          Use arrow keys to navigate data points, Home/End for first/last, Enter or Space to
          announce current value.
        </div>
      )}
    </div>
  );
}
