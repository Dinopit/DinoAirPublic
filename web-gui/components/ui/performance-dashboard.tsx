'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Clock, Cpu, HardDrive, Activity, TrendingUp } from 'lucide-react';

interface PerformanceStats {
  timestamp: string;
  uptime: number;
  performance: {
    chat: {
      responseTimeMs: {
        avg: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
      };
      totalRequests: number;
    };
    api: {
      responseTimeMs: {
        avg: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
      };
      totalRequests: number;
    };
    tokenUsage: {
      total: number;
      byModel: Record<string, number>;
    };
  };
  resources: {
    activeConnections: number;
    memory: {
      heapUsedMB: number;
      heapTotalMB: number;
      externalMB: number;
      rssMB: number;
    };
    cpu: {
      userMs: number;
      systemMs: number;
    };
    storage: {
      used: number;
      quota: number;
      percentage: number;
    };
  };
}

export default function PerformanceDashboard() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  const fetchStats = async () => {
    try {
      const apiKey = localStorage.getItem('dinoair-active-api-key') || 'dinoair_development_key';
      const response = await fetch('/api/v1/system/stats', {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch performance stats');
      }

      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        <button onClick={fetchStats} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Performance Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm px-3 py-1 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
          <span className="text-sm text-gray-500">Auto-refresh</span>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Uptime</p>
              <p className="text-xl font-semibold">{formatUptime(stats.uptime)}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Connections</p>
              <p className="text-xl font-semibold">{stats.resources.activeConnections}</p>
            </div>
            <Activity className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tokens</p>
              <p className="text-xl font-semibold">{stats.performance.tokenUsage.total.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chat Performance */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Chat Performance
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Requests</span>
              <span className="font-medium">{stats.performance.chat.totalRequests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Avg Response Time</span>
              <span className="font-medium">{stats.performance.chat.responseTimeMs.avg.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">P95 Response Time</span>
              <span className="font-medium">{stats.performance.chat.responseTimeMs.p95.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Min/Max</span>
              <span className="font-medium">
                {stats.performance.chat.responseTimeMs.min.toFixed(0)}ms / {stats.performance.chat.responseTimeMs.max.toFixed(0)}ms
              </span>
            </div>
          </div>
        </div>

        {/* API Performance */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            API Performance
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Requests</span>
              <span className="font-medium">{stats.performance.api.totalRequests}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Avg Response Time</span>
              <span className="font-medium">{stats.performance.api.responseTimeMs.avg.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">P95 Response Time</span>
              <span className="font-medium">{stats.performance.api.responseTimeMs.p95.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Min/Max</span>
              <span className="font-medium">
                {stats.performance.api.responseTimeMs.min.toFixed(0)}ms / {stats.performance.api.responseTimeMs.max.toFixed(0)}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Memory Usage */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Memory Usage
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Heap Used</span>
              <span className="font-medium">{stats.resources.memory.heapUsedMB} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Heap Total</span>
              <span className="font-medium">{stats.resources.memory.heapTotalMB} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">RSS</span>
              <span className="font-medium">{stats.resources.memory.rssMB} MB</span>
            </div>
            <div className="mt-2">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${(stats.resources.memory.heapUsedMB / stats.resources.memory.heapTotalMB) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {((stats.resources.memory.heapUsedMB / stats.resources.memory.heapTotalMB) * 100).toFixed(1)}% used
              </p>
            </div>
          </div>
        </div>

        {/* CPU Usage */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            CPU Usage
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">User Time</span>
              <span className="font-medium">{stats.resources.cpu.userMs.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">System Time</span>
              <span className="font-medium">{stats.resources.cpu.systemMs.toFixed(0)}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Token Usage by Model */}
      {Object.keys(stats.performance.tokenUsage.byModel).length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Token Usage by Model</h3>
          <div className="space-y-2">
            {Object.entries(stats.performance.tokenUsage.byModel).map(([model, tokens]) => (
              <div key={model} className="flex justify-between">
                <span className="text-sm font-mono">{model}</span>
                <span className="font-medium">{tokens.toLocaleString()} tokens</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-sm text-gray-500 text-center">
        Last updated: {new Date(stats.timestamp).toLocaleString()}
      </div>
    </div>
  );
}