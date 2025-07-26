/**
 * DinoAir Monitoring Dashboard
 * 
 * Built-in monitoring dashboard for system metrics and performance
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  RefreshCw
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
      const response = await fetch(`/api/metrics/dashboard?widget=resources&timeframe=${timeframe}`);
      const data = await response.json();
      setResourceData(data);
    } catch (error) {
      console.error('Error fetching resource data:', error);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    await Promise.all([fetchSystemOverview(), fetchResourceData()]);
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [timeframe]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, timeframe]);


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'critical': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
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
          <p className="text-gray-600">
            System performance and metrics dashboard
          </p>
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
              <div className="text-2xl font-bold">{formatPercentage(systemData.resources.cpu)}</div>
              <p className="text-xs text-gray-600">Current utilization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <MemoryStick className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(systemData.resources.memory)}</div>
              <p className="text-xs text-gray-600">RAM utilization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Users className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(systemData.active_sessions)}</div>
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
                <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    {getStatusIcon(status)}
                    <span className="ml-2 font-medium capitalize">{service.replace('_', ' ')}</span>
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
              <div className="text-2xl font-bold">{formatNumber(systemData.total_requests)}</div>
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
              <div className="text-2xl font-bold">{systemData.resources.network_mbps.toFixed(1)} Mbps</div>
              <p className="text-xs text-gray-600">Current bandwidth</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500">
        Last updated: {lastUpdate.toLocaleTimeString()} | 
        Auto-refresh: {autoRefresh ? 'ON' : 'OFF'} | 
        Timeframe: {timeframe === '1' ? 'Last Hour' : timeframe === '6' ? 'Last 6 Hours' : timeframe === '24' ? 'Last 24 Hours' : 'Last 7 Days'}
      </div>
    </div>
  );
}
