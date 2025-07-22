'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface DebugLog {
  id: string;
  timestamp: string;
  type: 'api' | 'websocket' | 'performance' | 'error' | 'info';
  message: string;
  data?: any;
  stack?: string;
}

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface DebugContextType {
  debugMode: boolean;
  toggleDebugMode: () => void;
  logs: DebugLog[];
  addLog: (log: Omit<DebugLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  performanceMetrics: Record<string, PerformanceMetric>;
  startPerformanceMetric: (name: string) => void;
  endPerformanceMetric: (name: string) => void;
  webSocketStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  setWebSocketStatus: (status: DebugContextType['webSocketStatus']) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}

interface DebugProviderProps {
  children: React.ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps) {
  const [debugMode, setDebugMode] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<Record<string, PerformanceMetric>>({});
  const [webSocketStatus, setWebSocketStatus] = useState<DebugContextType['webSocketStatus']>('disconnected');

  // Load debug mode preference from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dinoair-debug-mode');
    if (stored === 'true') {
      setDebugMode(true);
    }
  }, []);

  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => {
      const newValue = !prev;
      localStorage.setItem('dinoair-debug-mode', String(newValue));
      if (!newValue) {
        // Clear logs when disabling debug mode
        setLogs([]);
        setPerformanceMetrics({});
      }
      return newValue;
    });
  }, []);

  const addLog = useCallback((log: Omit<DebugLog, 'id' | 'timestamp'>) => {
    if (!debugMode) return;
    
    const newLog: DebugLog = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
    
    setLogs(prev => {
      const updated = [...prev, newLog];
      // Keep only last 1000 logs
      if (updated.length > 1000) {
        return updated.slice(-1000);
      }
      return updated;
    });

    // Also log to console in debug mode
    const consoleMethod = log.type === 'error' ? 'error' : 'log';
    console[consoleMethod](`[DEBUG ${log.type.toUpperCase()}]`, log.message, log.data);
  }, [debugMode]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const startPerformanceMetric = useCallback((name: string) => {
    if (!debugMode) return;
    
    setPerformanceMetrics(prev => ({
      ...prev,
      [name]: {
        name,
        startTime: performance.now(),
      },
    }));
  }, [debugMode]);

  const endPerformanceMetric = useCallback((name: string) => {
    if (!debugMode) return;
    
    setPerformanceMetrics(prev => {
      const metric = prev[name];
      if (!metric || metric.endTime) return prev;
      
      const endTime = performance.now();
      const duration = endTime - metric.startTime;
      
      addLog({
        type: 'performance',
        message: `${name} completed`,
        data: { duration: `${duration.toFixed(2)}ms` },
      });
      
      return {
        ...prev,
        [name]: {
          ...metric,
          endTime,
          duration,
        },
      };
    });
  }, [debugMode, addLog]);

  // Intercept fetch for API logging
  useEffect(() => {
    if (!debugMode) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, config] = args;
      const method = config?.method || 'GET';
      const startTime = performance.now();
      
      addLog({
        type: 'api',
        message: `${method} ${url}`,
        data: {
          headers: config?.headers,
          body: config?.body ? JSON.parse(config.body as string) : undefined,
        },
      });

      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        const clonedResponse = response.clone();
        const responseData = await clonedResponse.json().catch(() => null);
        
        addLog({
          type: 'api',
          message: `${method} ${url} - ${response.status} (${duration.toFixed(2)}ms)`,
          data: {
            status: response.status,
            statusText: response.statusText,
            response: responseData,
          },
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        addLog({
          type: 'error',
          message: `${method} ${url} - Failed (${duration.toFixed(2)}ms)`,
          data: error,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [debugMode, addLog]);

  // Intercept console errors
  useEffect(() => {
    if (!debugMode) return;

    const originalError = console.error;
    console.error = (...args) => {
      addLog({
        type: 'error',
        message: args.join(' '),
        data: args.length > 1 ? args : undefined,
        stack: new Error().stack,
      });
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, [debugMode, addLog]);

  return (
    <DebugContext.Provider
      value={{
        debugMode,
        toggleDebugMode,
        logs,
        addLog,
        clearLogs,
        performanceMetrics,
        startPerformanceMetric,
        endPerformanceMetric,
        webSocketStatus,
        setWebSocketStatus,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}