/**
 * DinoAir Monitoring Dashboard
 *
 * Built-in monitoring dashboard for system metrics and performance
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LazyLineChart, LazyBarChart, LazyPieChart } from '@/components/ui/charts/lazy-chart-loader';
import { AccessibleChartWrapper } from '@/components/ui/charts/accessible-chart-wrapper';
import { ChartErrorBoundary } from '@/components/ui/charts/chart-error-boundary';
import { AnalyticsData } from '@/types/analytics';
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Zap,
  BarChart3,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  Brain,
} from 'lucide-react';

interface SystemOverview {
  timestamp: string;
  status: string;
  uptime: string;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
    network_mbps: number;
  };
  services: {
    [key: string]: string;
  };
  health_score: number;
  active_sessions: number;
  total_requests: number;
  error_rate: number;
  alerts: any[];
}

interface ResourceData {
  timeframe: {
    start: string;
    end: string;
    duration_hours: number;
  };
  cpu: Array<{ timestamp: string; value: number }>;
  memory: Array<{ timestamp: string; value: number }>;
  disk: Array<{ timestamp: string; value: number }>;
  summary: {
    cpu_avg: number;
    cpu_max: number;
    memory_avg: number;
    memory_max: number;
    disk_avg: number;
    disk_max: number;
  };
}

export default function MonitoringDashboard() {
  const [systemData, setSystemData] = useState<SystemOverview | null>(null);
  const [resourceData, setResourceData] = useState<ResourceData | null>(null);
  const [timeframe, setTimeframe] = useState('6');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'insights'>('overview');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchSystemOverview = async () => {
    try {
      const response = await fetch('/api/metrics/dashboard?widget=overview');
      const data = await response.json();
      setSystemData(data);
    } catch (error) {
      console.error('Error fetching system overview:', error);
    }
  };

  const fetchResourceData = async () => {
    try {
      const response = await fetch(
        `/api/metrics/dashboard?widget=resources&timeframe=${timeframe}`
      );
      const data = await response.json();
      setResourceData(data);
    } catch (error) {
      console.error('Error fetching resource data:', error);
    }
  };

  const fetchAnalytics = async () => {
    if (activeTab !== 'analytics' && activeTab !== 'insights') return;

    setAnalyticsLoading(true);
    try {
      const apiKey = localStorage.getItem('dinoair-active-api-key') || 'dinoair_development_key';
      const response = await fetch(
        `/api/v1/analytics/dashboard?timeframe=${timeframe}h&includeInsights=true`,
        {
          headers: {
            'X-API-Key': apiKey,
          },
        }
      );

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

  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([fetchSystemOverview(), fetchResourceData()]);
    if (activeTab === 'analytics' || activeTab === 'insights') {
      await fetchAnalytics();
    }
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [activeTab, timeframe]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, timeframe]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  if (isLoading && !systemData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading monitoring data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">DinoAir Monitoring</h1>
          <p className="text-gray-600">System performance and metrics dashboard</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last Hour</SelectItem>
              <SelectItem value="6">Last 6 Hours</SelectItem>
              <SelectItem value="24">Last 24 Hours</SelectItem>
              <SelectItem value="168">Last 7 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50' : ''}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            System Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Overview Cards */}
          {systemData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Status</CardTitle>
                  {getStatusIcon(systemData.status)}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{systemData.status}</div>
                  <p className="text-xs text-gray-600">Health Score: {systemData.health_score}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  <Cpu className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercentage(systemData.resources.cpu)}
                  </div>
                  <p className="text-xs text-gray-600">Current utilization</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  <MemoryStick className="w-4 h-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatPercentage(systemData.resources.memory)}
                  </div>
                  <p className="text-xs text-gray-600">RAM utilization</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                  <Users className="w-4 h-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(systemData.active_sessions)}
                  </div>
                  <p className="text-xs text-gray-600">Connected users</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Services Status */}
          {systemData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Services Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(systemData.services).map(([service, status]) => (
                    <div
                      key={service}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center">
                        {getStatusIcon(status)}
                        <span className="ml-2 font-medium capitalize">
                          {service.replace('_', ' ')}
                        </span>
                      </div>
                      <Badge
                        variant={status === 'healthy' ? 'default' : 'destructive'}
                        className={status === 'healthy' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resource Usage Chart */}
          {resourceData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Resource Usage Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="cpu" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="cpu">CPU</TabsTrigger>
                    <TabsTrigger value="memory">Memory</TabsTrigger>
                    <TabsTrigger value="disk">Disk</TabsTrigger>
                  </TabsList>

                  <TabsContent value="cpu" className="space-y-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Average: {formatPercentage(resourceData.summary.cpu_avg)}</span>
                      <span>Peak: {formatPercentage(resourceData.summary.cpu_max)}</span>
                    </div>
                    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                        <p>CPU Usage Chart</p>
                        <p className="text-xs">Chart visualization would be implemented here</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="memory" className="space-y-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Average: {formatPercentage(resourceData.summary.memory_avg)}</span>
                      <span>Peak: {formatPercentage(resourceData.summary.memory_max)}</span>
                    </div>
                    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <MemoryStick className="w-12 h-12 mx-auto mb-2" />
                        <p>Memory Usage Chart</p>
                        <p className="text-xs">Chart visualization would be implemented here</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="disk" className="space-y-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Average: {formatPercentage(resourceData.summary.disk_avg)}</span>
                      <span>Peak: {formatPercentage(resourceData.summary.disk_max)}</span>
                    </div>
                    <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <HardDrive className="w-12 h-12 mx-auto mb-2" />
                        <p>Disk Usage Chart</p>
                        <p className="text-xs">Chart visualization would be implemented here</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          {systemData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                  <Zap className="w-4 h-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(systemData.total_requests)}
                  </div>
                  <p className="text-xs text-gray-600">API requests processed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemData.error_rate.toFixed(2)}/min</div>
                  <p className="text-xs text-gray-600">Errors per minute</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Network Usage</CardTitle>
                  <Network className="w-4 h-4 text-indigo-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {systemData.resources.network_mbps.toFixed(1)} Mbps
                  </div>
                  <p className="text-xs text-gray-600">Current bandwidth</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading analytics data...</span>
            </div>
          ) : analyticsData ? (
            <>
              {/* Analytics Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData.metrics.chat.totalMessages.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-600">Chat interactions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Users className="w-4 h-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData.metrics.user.totalUsers.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-600">Current period</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData.metrics.chat.responseTimeMetrics.avg.toFixed(0)}ms
                    </div>
                    <p className="text-xs text-gray-600">Chat performance</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analyticsData.metrics.chat.successRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-600">System reliability</p>
                  </CardContent>
                </Card>
              </div>

              {/* Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Chat Activity Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartErrorBoundary>
                      <AccessibleChartWrapper
                        data={analyticsData.metrics.chat.dailyActivity}
                        title="Messages Over Time"
                        description="Daily chat message volume showing user engagement patterns"
                        chartType="line"
                      >
                        <LazyLineChart
                          data={analyticsData.metrics.chat.dailyActivity}
                          title="Messages Over Time"
                          color="#3b82f6"
                          height={250}
                          yAxisLabel="Messages"
                          xAxisLabel="Date"
                        />
                      </AccessibleChartWrapper>
                    </ChartErrorBoundary>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartErrorBoundary>
                      <AccessibleChartWrapper
                        data={analyticsData.metrics.user.userBehavior.mostActiveHours.map((item) => ({
                          label: `${item.hour}:00`,
                          value: item.activity,
                        }))}
                        title="Activity by Hour"
                        description="Hourly user activity patterns showing peak usage times"
                        chartType="bar"
                      >
                        <LazyBarChart
                          data={analyticsData.metrics.user.userBehavior.mostActiveHours.map((item) => ({
                            label: `${item.hour}:00`,
                            value: item.activity,
                          }))}
                          title="Activity by Hour"
                          color="#10b981"
                          height={250}
                          yAxisLabel="Activity"
                          xAxisLabel="Hour"
                        />
                      </AccessibleChartWrapper>
                    </ChartErrorBoundary>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Response Time Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartErrorBoundary>
                      <AccessibleChartWrapper
                        data={[
                          { label: 'Fast (<500ms)', value: 65 },
                          { label: 'Medium (500ms-2s)', value: 25 },
                          { label: 'Slow (>2s)', value: 10 },
                        ]}
                        title="Response Time Categories"
                        description="Distribution of response times showing performance categories"
                        chartType="pie"
                      >
                        <LazyPieChart
                          data={[
                            { label: 'Fast (<500ms)', value: 65 },
                            { label: 'Medium (500ms-2s)', value: 25 },
                            { label: 'Slow (>2s)', value: 10 },
                          ]}
                          title="Response Time Categories"
                          height={250}
                          showPercentages={true}
                          colors={['#10b981', '#f59e0b', '#ef4444']}
                        />
                      </AccessibleChartWrapper>
                    </ChartErrorBoundary>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>System Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartErrorBoundary>
                      <AccessibleChartWrapper
                        data={analyticsData.metrics.system.performanceMetrics.averageResponseTime}
                        title="System Metrics Over Time"
                        description="System performance metrics showing response time trends"
                        chartType="line"
                      >
                        <LazyLineChart
                          data={analyticsData.metrics.system.performanceMetrics.averageResponseTime}
                          title="System Metrics Over Time"
                          color="#8b5cf6"
                          height={250}
                          yAxisLabel="Response Time (ms)"
                          xAxisLabel="Time"
                        />
                      </AccessibleChartWrapper>
                    </ChartErrorBoundary>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <BarChart3 className="w-12 h-12 mx-auto mb-4" />
              <p>No analytics data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin" />
              <span className="ml-2">Generating insights...</span>
            </div>
          ) : analyticsData?.insights ? (
            <>
              {/* Key Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analyticsData.insights.map((insight, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        {insight.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">{insight.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            insight.severity === 'critical'
                              ? 'destructive'
                              : insight.severity === 'warning'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {insight.severity} priority
                        </Badge>
                        <span className="text-sm text-gray-500">{insight.type}</span>
                      </div>
                      {insight.recommendation && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">{insight.recommendation}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Trends Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Trend Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="font-semibold text-green-800">User Growth</p>
                        <p className="text-sm text-green-600">+15% this period</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="font-semibold text-blue-800">Chat Volume</p>
                        <p className="text-sm text-blue-600">+8% this period</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="font-semibold text-purple-800">Performance</p>
                        <p className="text-sm text-purple-600">+12% improvement</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <Brain className="w-12 h-12 mx-auto mb-4" />
              <p>No insights available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500">
        Last updated: {lastUpdate.toLocaleTimeString()} | Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}{' '}
        | Timeframe:{' '}
        {timeframe === '1'
          ? 'Last Hour'
          : timeframe === '6'
            ? 'Last 6 Hours'
            : timeframe === '24'
              ? 'Last 24 Hours'
              : 'Last 7 Days'}
      </div>
    </div>
  );
}
