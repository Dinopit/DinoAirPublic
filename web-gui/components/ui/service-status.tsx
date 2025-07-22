'use client';

import React, { useState, useEffect } from 'react';
import { Server, CheckCircle, XCircle, AlertCircle, RefreshCw, Terminal, FileText, X } from 'lucide-react';

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: string;
  responseTime?: number;
  error?: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    ollama: ServiceHealth;
    comfyui: ServiceHealth;
    webGui: ServiceHealth;
  };
  uptime: number;
}

interface ServiceInfo {
  name: string;
  description: string;
  port: number;
  icon: React.ReactNode;
  logs?: string[];
  restartCommand?: string;
}

const serviceInfo: Record<string, ServiceInfo> = {
  ollama: {
    name: 'Ollama',
    description: 'AI Model Server',
    port: 11434,
    icon: <Server className="w-5 h-5" />,
    restartCommand: 'ollama serve',
  },
  comfyui: {
    name: 'ComfyUI',
    description: 'Image Generation Server',
    port: 8188,
    icon: <Server className="w-5 h-5" />,
    restartCommand: 'python main.py --port 8188',
  },
  webGui: {
    name: 'Web GUI',
    description: 'DinoAir Interface',
    port: 3000,
    icon: <Server className="w-5 h-5" />,
  },
};

export default function ServiceStatus() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = async () => {
    try {
      setRefreshing(true);
      const apiKey = localStorage.getItem('dinoair-active-api-key') || 'dinoair_development_key';
      const response = await fetch('/api/v1/system/health', {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }

      const data = await response.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: ServiceHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'unhealthy':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    }
  };

  const getOverallStatusColor = (status: SystemHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'degraded':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-red-600 dark:text-red-400';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleRestart = async (service: string) => {
    const command = serviceInfo[service]?.restartCommand;
    if (!command) return;

    if (confirm(`Are you sure you want to restart ${serviceInfo[service].name}?`)) {
      // In a real implementation, this would call an API endpoint to restart the service
      alert(`Restart command: ${command}\n\nNote: Service restart is not implemented in the free tier. Please restart manually.`);
    }
  };

  const mockServiceLogs = (service: string) => {
    // Mock logs for demonstration
    const now = new Date();
    return [
      `[${now.toISOString()}] Service ${service} started`,
      `[${now.toISOString()}] Listening on port ${serviceInfo[service].port}`,
      `[${now.toISOString()}] Health check endpoint available`,
      `[${now.toISOString()}] Ready to accept connections`,
    ];
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
        <button onClick={fetchHealth} className="mt-2 text-sm underline">
          Retry
        </button>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Service Status</h2>
          <p className={`text-lg ${getOverallStatusColor(health.status)}`}>
            System: {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm">Auto-refresh</span>
          </label>
          <button
            onClick={fetchHealth}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Uptime</p>
            <p className="font-semibold">{formatUptime(health.uptime)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Last Check</p>
            <p className="font-semibold">{new Date(health.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(health.services).map(([key, service]) => {
          const info = serviceInfo[key];
          if (!info) return null;

          return (
            <div
              key={key}
              className={`border rounded-lg p-4 transition-all ${getStatusColor(service.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {info.icon}
                  <div>
                    <h3 className="font-semibold">{info.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{info.description}</p>
                  </div>
                </div>
                {getStatusIcon(service.status)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Port</span>
                  <span className="font-mono">{info.port}</span>
                </div>
                {service.responseTime !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Response</span>
                    <span>{service.responseTime}ms</span>
                  </div>
                )}
                {service.error && (
                  <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-red-700 dark:text-red-300 text-xs">
                    {service.error}
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setShowLogs(showLogs === key ? null : key)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="View logs"
                >
                  <FileText className="w-3 h-3" />
                  Logs
                </button>
                {info.restartCommand && (
                  <button
                    onClick={() => handleRestart(key)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    title="Restart service"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Restart
                  </button>
                )}
              </div>

              {/* Service Logs */}
              {showLogs === key && (
                <div className="mt-3 p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Last 100 lines</span>
                    <button
                      onClick={() => setShowLogs(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {mockServiceLogs(key).map((log, i) => (
                    <div key={i} className="whitespace-pre">{log}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          Quick Commands
        </h3>
        <div className="space-y-1 text-sm font-mono">
          <p>Start Ollama: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">ollama serve</code></p>
          <p>Start ComfyUI: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">cd ComfyUI && python main.py</code></p>
          <p>Start Web GUI: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">npm run dev</code></p>
        </div>
      </div>
    </div>
  );
}