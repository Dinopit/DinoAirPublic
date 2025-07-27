'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Clock, Cpu, HardDrive, Activity, TrendingUp, MessageSquare, Users, AlertTriangle } from 'lucide-react';
import { LineChart } from './charts/line-chart';
import { BarChart as CustomBarChart } from './charts/bar-chart';
import { PieChart } from './charts/pie-chart';
import { AnalyticsData } from '../../types/analytics';

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
  const [activeTab, setActiveTab] = useState<'performance' | 'analytics' | 'users' | 'insights'>('performance');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('7d');

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

  const fetchAnalytics = async () => {
    if (activeTab === 'performance') return;
    
    setAnalyticsLoading(true);
    try {
      const apiKey = localStorage.getItem('dinoair-active-api-key') || 'dinoair_development_key';
      const response = await fetch(`/api/v1/analytics/dashboard?timeframe=${timeframe}&includeInsights=true`, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  useEffect(() => {
    fetchAnalytics();
  }, [activeTab, timeframe]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
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
        <div className="flex items-center gap-4">
          {activeTab !== 'performance' && (
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="text-sm px-3 py-1 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          )}
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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'performance', label: 'Performance', icon: Activity },
            { id: 'analytics', label: 'Analytics', icon: BarChart },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'insights', label: 'Insights', icon: AlertTriangle },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
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

      {/* Analytics Content */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : analyticsData ? (
            <>
              {/* Analytics Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Messages</p>
                      <p className="text-xl font-semibold">{analyticsData.metrics.chat.totalMessages.toLocaleString()}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Active Users</p>
                      <p className="text-xl font-semibold">{analyticsData.metrics.user.totalUsers.toLocaleString()}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Avg Response Time</p>
                      <p className="text-xl font-semibold">{analyticsData.metrics.chat.responseTimeMetrics.avg.toFixed(0)}ms</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Success Rate</p>
                      <p className="text-xl font-semibold">{((1 - analyticsData.metrics.chat.errorRate) * 100).toFixed(1)}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Message Volume Trend</h3>
                  <LineChart
                    data={analyticsData.metrics.chat.dailyActivity}
                    title="Messages per Day"
                    color="#3b82f6"
                    height={300}
                    yAxisLabel="Messages"
                    xAxisLabel="Date"
                  />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Response Time Distribution</h3>
                  <CustomBarChart
                    data={[
                      { label: 'P50', value: analyticsData.metrics.chat.responseTimeMetrics.p50 },
                      { label: 'P95', value: analyticsData.metrics.chat.responseTimeMetrics.p95 },
                      { label: 'P99', value: analyticsData.metrics.chat.responseTimeMetrics.p99 },
                      { label: 'Max', value: analyticsData.metrics.chat.responseTimeMetrics.max },
                    ]}
                    title="Response Time Percentiles"
                    color="#10b981"
                    height={300}
                    yAxisLabel="Time (ms)"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">No analytics data available</div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : analyticsData ? (
            <>
              {/* User Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <div>
                    <p className="text-sm text-gray-500">Average Sessions</p>
                    <p className="text-xl font-semibold">{analyticsData.metrics.user.userEngagement.averageSessionsPerUser.toFixed(1)}</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <div>
                    <p className="text-sm text-gray-500">7-Day Retention</p>
                    <p className="text-xl font-semibold">{(analyticsData.metrics.user.userEngagement.retentionRate.day7 * 100).toFixed(1)}%</p>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                  <div>
                    <p className="text-sm text-gray-500">30-Day Retention</p>
                    <p className="text-xl font-semibold">{(analyticsData.metrics.user.userEngagement.retentionRate.day30 * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* User Activity Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Peak Activity Hours</h3>
                  <CustomBarChart
                    data={analyticsData.metrics.user.userBehavior.mostActiveHours.slice(0, 12).map((hour: any) => ({
                      label: `${hour.hour}:00`,
                      value: hour.activity,
                    }))}
                    title="Activity by Hour"
                    color="#8b5cf6"
                    height={300}
                    yAxisLabel="Activity"
                  />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Feature Usage</h3>
                  <PieChart
                    data={analyticsData.metrics.user.userBehavior.featureUsage.map((feature: any) => ({
                      label: feature.feature,
                      value: feature.usage,
                      color: feature.feature === 'chat' ? '#3b82f6' : feature.feature === 'image_generation' ? '#10b981' : '#f59e0b',
                    }))}
                    title="Feature Distribution"
                    height={300}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">No user data available</div>
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : analyticsData && analyticsData.insights ? (
            <>
              {/* Insights Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyticsData.insights.map((insight: any, index: number) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-blue-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{insight.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
                        {insight.recommendation && (
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                            💡 {insight.recommendation}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        insight.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        insight.severity === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {insight.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trends Summary */}
              {analyticsData.summary && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{analyticsData.summary.totalDataPoints}</p>
                      <p className="text-sm text-gray-500">Data Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{timeframe}</p>
                      <p className="text-sm text-gray-500">Timeframe</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{analyticsData.insights.length}</p>
                      <p className="text-sm text-gray-500">Insights</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {new Date(analyticsData.generatedAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">Last Updated</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500">No insights available</div>
          )}
        </div>
      )}

      {/* Performance Tab (Original Content) */}
      {activeTab === 'performance' && (
        <>
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
        </>
      )}

      {/* Last Updated */}
      <div className="text-sm text-gray-500 text-center">
        Last updated: {new Date(stats.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
