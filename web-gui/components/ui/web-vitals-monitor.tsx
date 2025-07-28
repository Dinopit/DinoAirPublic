/**
 * Web Vitals Monitor
 * Tracks Core Web Vitals and performance metrics
 */

'use client';

import { useEffect, useCallback, useState } from 'react';

interface VitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface PerformanceData {
  lcp?: VitalsMetric; // Largest Contentful Paint
  fid?: VitalsMetric; // First Input Delay
  cls?: VitalsMetric; // Cumulative Layout Shift
  fcp?: VitalsMetric; // First Contentful Paint
  ttfb?: VitalsMetric; // Time to First Byte
  renderTime?: number;
  bundleSize?: number;
}

// Performance thresholds based on Core Web Vitals
const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
  ttfb: { good: 800, poor: 1800 },
};

function getRating(
  name: keyof typeof THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

export function useWebVitals() {
  const [vitals, setVitals] = useState<PerformanceData>({});

  const updateVital = useCallback((name: string, value: number) => {
    if (name in THRESHOLDS) {
      const metric: VitalsMetric = {
        name,
        value,
        rating: getRating(name as keyof typeof THRESHOLDS, value),
        timestamp: Date.now(),
      };

      setVitals((prev) => ({
        ...prev,
        [name]: metric,
      }));

      // Send to analytics if available
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', name, {
          custom_parameter_1: value,
          custom_parameter_2: metric.rating,
        });
      }
    }
  }, []);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Track render performance
    const startTime = performance.now();

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'largest-contentful-paint':
            updateVital('lcp', entry.startTime);
            break;
          case 'first-input':
            updateVital('fid', (entry as PerformanceEventTiming).processingStart - entry.startTime);
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              updateVital('cls', (entry as any).value);
            }
            break;
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              updateVital('fcp', entry.startTime);
            }
            break;
          case 'navigation':
            const navEntry = entry as PerformanceNavigationTiming;
            updateVital('ttfb', navEntry.responseStart - navEntry.requestStart);
            break;
        }
      }
    });

    // Observe all relevant metrics
    observer.observe({
      entryTypes: [
        'largest-contentful-paint',
        'first-input',
        'layout-shift',
        'paint',
        'navigation',
      ],
    });

    // Track component render time
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      setVitals((prev) => ({ ...prev, renderTime }));
    });

    return () => observer.disconnect();
  }, [updateVital]);

  return vitals;
}

interface WebVitalsDisplayProps {
  className?: string;
  compact?: boolean;
}

export function WebVitalsDisplay({ className = '', compact = false }: WebVitalsDisplayProps) {
  const vitals = useWebVitals();

  if (compact) {
    return (
      <div className={`web-vitals-compact flex items-center space-x-2 ${className}`}>
        {Object.entries(vitals).map(([key, value]) => {
          if (typeof value === 'object' && value.rating) {
            const bgColor = {
              good: 'bg-green-100 text-green-800',
              'needs-improvement': 'bg-yellow-100 text-yellow-800',
              poor: 'bg-red-100 text-red-800',
            }[value.rating];

            return (
              <span
                key={key}
                className={`px-2 py-1 text-xs rounded-full ${bgColor}`}
                title={`${key.toUpperCase()}: ${value.value.toFixed(2)}ms`}
              >
                {key.toUpperCase()}
              </span>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <div className={`web-vitals-panel bg-card border rounded-lg p-4 ${className}`}>
      <h3 className="font-semibold text-foreground mb-3">Performance Metrics</h3>
      <div className="space-y-2">
        {Object.entries(vitals).map(([key, value]) => {
          if (typeof value === 'object' && value.rating) {
            const color = {
              good: 'text-green-600',
              'needs-improvement': 'text-yellow-600',
              poor: 'text-red-600',
            }[value.rating];

            return (
              <div key={key} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{key.toUpperCase()}:</span>
                <span className={`font-mono ${color}`}>{value.value.toFixed(2)}ms</span>
              </div>
            );
          } else if (typeof value === 'number') {
            return (
              <div key={key} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{key}:</span>
                <span className="font-mono text-foreground">{value.toFixed(2)}ms</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
