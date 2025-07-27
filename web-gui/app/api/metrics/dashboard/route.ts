/**
 * DinoAir Dashboard Data API Route
 * 
 * Provides structured data for monitoring dashboards
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const widget = searchParams.get('widget') || 'overview';
    const timeframe = parseInt(searchParams.get('timeframe') || '6'); // hours
    
    let data;
    
    switch (widget) {
      case 'overview':
        data = getSystemOverview();
        break;
      case 'resources':
        data = getResourceMetrics(timeframe);
        break;
      case 'api':
        data = getApiMetrics(timeframe);
        break;
      case 'models':
        data = getModelMetrics();
        break;
      case 'errors':
        data = getErrorMetrics(timeframe);
        break;
      case 'users':
        data = getUserMetrics(timeframe);
        break;
      case 'config':
        data = getDashboardConfig();
        break;
      default:
        return NextResponse.json(
          { error: 'Unknown widget type' },
          { status: 400 }
        );
    }
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getSystemOverview() {
  return {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    uptime: '24h 35m',
    resources: {
      cpu: 25.4,
      memory: 68.2,
      disk: 45.8,
      network_mbps: 12.3
    },
    services: {
      comfyui: 'healthy',
      ollama: 'healthy',
      web_gui: 'healthy'
    },
    health_score: 95.5,
    active_sessions: 15,
    total_requests: 4206,
    error_rate: 0.8,
    alerts: []
  };
}

function getResourceMetrics(timeframeHours: number) {
  const now = new Date();
  const timePoints = 50; // Number of data points
  const intervalMs = (timeframeHours * 60 * 60 * 1000) / timePoints;
  
  const generateTimeSeries = (baseValue: number, variance: number) => {
    const data = [];
    for (let i = 0; i < timePoints; i++) {
      const timestamp = new Date(now.getTime() - (timePoints - i) * intervalMs);
      const value = baseValue + (Math.random() - 0.5) * variance;
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.max(0, Math.min(100, value))
      });
    }
    return data;
  };
  
  return {
    timeframe: {
      start: new Date(now.getTime() - timeframeHours * 60 * 60 * 1000).toISOString(),
      end: now.toISOString(),
      duration_hours: timeframeHours
    },
    cpu: generateTimeSeries(25, 20),
    memory: generateTimeSeries(68, 15),
    disk: generateTimeSeries(46, 5),
    summary: {
      cpu_avg: 25.4,
      cpu_max: 45.2,
      memory_avg: 68.2,
      memory_max: 78.9,
      disk_avg: 45.8,
      disk_max: 48.1
    }
  };
}

function getApiMetrics(timeframeHours: number) {
  return {
    timeframe: {
      duration_hours: timeframeHours,
      end_time: new Date().toISOString()
    },
    services: {
      comfyui: {
        requests: 1247,
        errors: 12,
        avg_response_time: 0.234,
        error_rate: 0.96,
        status: 'healthy'
      },
      ollama: {
        requests: 856,
        errors: 3,
        avg_response_time: 0.156,
        error_rate: 0.35,
        status: 'healthy'
      },
      web_gui: {
        requests: 2103,
        errors: 8,
        avg_response_time: 0.089,
        error_rate: 0.38,
        status: 'healthy'
      }
    },
    totals: {
      total_requests: 4206,
      total_errors: 23,
      error_rate: 0.55
    },
    response_time_distribution: {
      p50: 0.123,
      p90: 0.345,
      p95: 0.456,
      p99: 0.789
    }
  };
}

function getModelMetrics() {
  return {
    timestamp: new Date().toISOString(),
    models: {
      'llama2-7b': {
        total_generations: 156,
        successful_generations: 149,
        total_time: 2341.5,
        avg_time: 15.01,
        success_rate: 95.51,
        avg_prompt_length: 234,
        avg_output_length: 567
      },
      'stable-diffusion-v1-5': {
        total_generations: 89,
        successful_generations: 87,
        total_time: 1456.8,
        avg_time: 16.37,
        success_rate: 97.75,
        avg_prompt_length: 45,
        avg_output_length: 0
      }
    },
    totals: {
      total_generations: 245,
      successful_generations: 236,
      total_time: 3798.3,
      success_rate: 96.33,
      avg_time: 15.5,
      queue_size: 3
    }
  };
}

function getErrorMetrics(timeframeHours: number) {
  const now = new Date();
  const start = new Date(now.getTime() - timeframeHours * 60 * 60 * 1000);
  
  return {
    timeframe: {
      start: start.toISOString(),
      end: now.toISOString(),
      duration_hours: timeframeHours
    },
    summary: {
      total_errors: 23,
      error_rate_per_minute: 0.8,
      unique_error_types: 5
    },
    by_type: {
      'connection_timeout': 8,
      'validation_error': 6,
      'model_error': 4,
      'file_not_found': 3,
      'permission_denied': 2
    },
    by_service: {
      'comfyui': 12,
      'web_gui': 8,
      'ollama': 3
    },
    by_severity: {
      'error': 18,
      'warning': 4,
      'critical': 1
    },
    recent_errors: [
      {
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        type: 'connection_timeout',
        service: 'comfyui',
        severity: 'error',
        message: 'Connection to ComfyUI timed out after 30 seconds'
      },
      {
        timestamp: new Date(now.getTime() - 12 * 60 * 1000).toISOString(),
        type: 'validation_error',
        service: 'web_gui',
        severity: 'warning',
        message: 'Invalid input parameter in API request'
      }
    ]
  };
}

function getUserMetrics(timeframeHours: number) {
  const now = new Date();
  const start = new Date(now.getTime() - timeframeHours * 60 * 60 * 1000);
  
  // Generate activity timeline
  const timeline = [];
  for (let i = 0; i < timeframeHours; i++) {
    const hourTime = new Date(start.getTime() + i * 60 * 60 * 1000);
    timeline.push({
      timestamp: hourTime.toISOString().slice(0, 13) + ':00',
      sessions: Math.floor(Math.random() * 10) + 1
    });
  }
  
  return {
    timeframe: {
      start: start.toISOString(),
      end: now.toISOString(),
      duration_hours: timeframeHours
    },
    current: {
      active_sessions: 15,
      total_sessions: 342
    },
    session_metrics: {
      sessions_in_period: 28,
      avg_duration: 1247.5,
      session_durations: [1200, 800, 1500, 900, 2100, 1100, 1300, 950]
    },
    activity_timeline: timeline
  };
}

function getDashboardConfig() {
  return {
    version: '1.0.0',
    refresh_interval: 30,
    available_timeframes: [
      { label: 'Last Hour', hours: 1 },
      { label: 'Last 6 Hours', hours: 6 },
      { label: 'Last 24 Hours', hours: 24 },
      { label: 'Last 7 Days', hours: 168 }
    ],
    widgets: [
      { id: 'system_overview', title: 'System Overview', type: 'overview' },
      { id: 'resource_usage', title: 'Resource Usage', type: 'timeseries' },
      { id: 'api_metrics', title: 'API Performance', type: 'metrics' },
      { id: 'model_usage', title: 'Model Usage', type: 'metrics' },
      { id: 'error_tracking', title: 'Error Tracking', type: 'errors' },
      { id: 'user_activity', title: 'User Activity', type: 'users' }
    ],
    thresholds: {
      cpu_warning: 70,
      cpu_critical: 85,
      memory_warning: 75,
      memory_critical: 85,
      disk_warning: 80,
      disk_critical: 90,
      error_rate_warning: 5,
      error_rate_critical: 10
    }
  };
}
