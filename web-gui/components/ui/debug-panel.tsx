'use client';

import React, { useState } from 'react';
import { useDebug } from '@/contexts/debug-context';
import { X, Trash2, Download, Filter, Copy } from 'lucide-react';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const { logs, clearLogs, performanceMetrics, webSocketStatus } = useDebug();
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter logs based on type and search term
  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.type === filter;
    const matchesSearch = !searchTerm || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.data).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Calculate performance stats
  const performanceStats = Object.values(performanceMetrics)
    .filter(m => m.duration)
    .reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = { count: 0, total: 0, avg: 0, min: Infinity, max: 0 };
      }
      const stats = acc[metric.name]!;
      stats.count++;
      stats.total += metric.duration!;
      stats.avg = stats.total / stats.count;
      stats.min = Math.min(stats.min, metric.duration!);
      stats.max = Math.max(stats.max, metric.duration!);
      return acc;
    }, {} as Record<string, { count: number; total: number; avg: number; min: number; max: number }>);

  const handleExportLogs = () => {
    const dataStr = JSON.stringify({ logs: filteredLogs, performanceStats }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `debug-logs-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const copyLogToClipboard = (log: any) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
  };

  if (!isOpen) return null;

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'api': return 'text-blue-500';
      case 'websocket': return 'text-green-500';
      case 'performance': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold">Debug Panel</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">WebSocket:</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(webSocketStatus)}`} />
              <span className="text-sm font-medium">{webSocketStatus}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Logs:</span>
            <span className="text-sm font-medium">{filteredLogs.length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 p-4 border-b dark:border-gray-700">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">All Types</option>
            <option value="api">API</option>
            <option value="websocket">WebSocket</option>
            <option value="performance">Performance</option>
            <option value="error">Errors</option>
            <option value="info">Info</option>
          </select>
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
          <button
            onClick={clearLogs}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportLogs}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            title="Export logs"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Performance Stats */}
        {Object.keys(performanceStats).length > 0 && (
          <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-sm font-semibold mb-2">Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(performanceStats).map(([name, stats]) => (
                <div key={name} className="bg-white dark:bg-gray-900 p-2 rounded">
                  <div className="font-medium">{name}</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Avg: {stats.avg.toFixed(2)}ms | Min: {stats.min.toFixed(2)}ms | Max: {stats.max.toFixed(2)}ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No logs to display
            </div>
          ) : (
            filteredLogs.reverse().map((log) => (
              <div
                key={log.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm font-mono group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold ${getLogColor(log.type)}`}>
                        [{log.type.toUpperCase()}]
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">{log.message}</div>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          View Data
                        </summary>
                        <pre className="mt-2 text-xs overflow-x-auto bg-gray-100 dark:bg-gray-900 p-2 rounded">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                    {log.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-red-500 hover:text-red-700">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 text-xs overflow-x-auto bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300">
                          {log.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                  <button
                    onClick={() => copyLogToClipboard(log)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Copy log"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
