'use client';

import { useState, useEffect } from 'react';

interface PerformanceMetrics {
  pageLoadTime: number;
  renderTime: number;
  memoryUsage: number;
  apiResponseTime: number;
}

export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    apiResponseTime: 0
  });

  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      try {
        const consent = localStorage.getItem('dinoair-consent-preferences');
        if (consent) {
          const preferences = JSON.parse(consent);
          setConsentGiven(preferences.analytics || false);
        }
      } catch (error) {
        console.error('Error checking consent:', error);
      }
    };

    checkConsent();
  }, []);

  const recordMetric = (type: keyof PerformanceMetrics, value: number) => {
    if (!consentGiven) {
      return;
    }

    setMetrics(prev => ({
      ...prev,
      [type]: value
    }));

    try {
      const existingMetrics = localStorage.getItem('dinoair-performance-metrics');
      const metricsArray = existingMetrics ? JSON.parse(existingMetrics) : [];
      
      metricsArray.push({
        type,
        value,
        timestamp: new Date().toISOString()
      });

      if (metricsArray.length > 100) {
        metricsArray.splice(0, metricsArray.length - 100);
      }

      localStorage.setItem('dinoair-performance-metrics', JSON.stringify(metricsArray));
    } catch (error) {
      console.error('Error storing performance metrics:', error);
    }
  };

  const clearMetrics = () => {
    setMetrics({
      pageLoadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      apiResponseTime: 0
    });
    
    try {
      localStorage.removeItem('dinoair-performance-metrics');
    } catch (error) {
      console.error('Error clearing performance metrics:', error);
    }
  };

  return {
    metrics,
    recordMetric,
    clearMetrics,
    consentGiven
  };
};
