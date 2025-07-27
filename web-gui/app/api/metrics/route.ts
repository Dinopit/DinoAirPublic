/**
 * DinoAir Metrics API Route
 * 
 * Provides Prometheus-compatible metrics endpoint for monitoring
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

// We'll create a simple proxy to the Python metrics service
// In a production setup, this could directly integrate with the metrics collector

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'prometheus';
    
    // For now, we'll return mock data until we integrate with the Python backend
    // In the full implementation, this would call the metrics collector
    
    if (format === 'prometheus') {
      const prometheusData = generateMockPrometheusMetrics();
      
      return new NextResponse(prometheusData, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    } else if (format === 'json') {
      const jsonData = generateMockJsonMetrics();
      
      return NextResponse.json(jsonData, {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use ?format=prometheus or ?format=json' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in metrics endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateMockPrometheusMetrics(): string {
  const timestamp = Date.now();
  
  return `# HELP dinoair_system_health_score Overall system health score (0-100)
# TYPE dinoair_system_health_score gauge
dinoair_system_health_score{instance="dinoair"} 95.5 ${timestamp}

# HELP dinoair_cpu_usage_percent CPU usage percentage
# TYPE dinoair_cpu_usage_percent gauge
dinoair_cpu_usage_percent{instance="dinoair",resource_type="cpu"} 25.4 ${timestamp}

# HELP dinoair_memory_usage_percent Memory usage percentage
# TYPE dinoair_memory_usage_percent gauge
dinoair_memory_usage_percent{instance="dinoair",resource_type="memory"} 68.2 ${timestamp}

# HELP dinoair_disk_usage_percent Disk usage percentage
# TYPE dinoair_disk_usage_percent gauge
dinoair_disk_usage_percent{instance="dinoair",resource_type="disk"} 45.8 ${timestamp}

# HELP dinoair_network_bandwidth_mbps Network bandwidth usage
# TYPE dinoair_network_bandwidth_mbps gauge
dinoair_network_bandwidth_mbps{instance="dinoair",resource_type="network"} 12.3 ${timestamp}

# HELP dinoair_active_services_total Number of active DinoAir services
# TYPE dinoair_active_services_total gauge
dinoair_active_services_total{instance="dinoair"} 3 ${timestamp}

# HELP dinoair_custom_api_requests_total Total number of API requests
# TYPE dinoair_custom_api_requests_total counter
dinoair_custom_api_requests_total{instance="dinoair",type="custom",service="comfyui"} 1247 ${timestamp}
dinoair_custom_api_requests_total{instance="dinoair",type="custom",service="ollama"} 856 ${timestamp}
dinoair_custom_api_requests_total{instance="dinoair",type="custom",service="web_gui"} 2103 ${timestamp}

# HELP dinoair_custom_api_errors_total Total number of API errors
# TYPE dinoair_custom_api_errors_total counter
dinoair_custom_api_errors_total{instance="dinoair",type="custom",service="comfyui"} 12 ${timestamp}
dinoair_custom_api_errors_total{instance="dinoair",type="custom",service="ollama"} 3 ${timestamp}
dinoair_custom_api_errors_total{instance="dinoair",type="custom",service="web_gui"} 8 ${timestamp}

# HELP dinoair_custom_active_sessions Number of active user sessions
# TYPE dinoair_custom_active_sessions gauge
dinoair_custom_active_sessions{instance="dinoair",type="custom"} 15 ${timestamp}

# HELP dinoair_custom_model_generations_total Total number of model generations
# TYPE dinoair_custom_model_generations_total counter
dinoair_custom_model_generations_total{instance="dinoair",type="custom"} 432 ${timestamp}

# HELP dinoair_custom_error_rate_per_minute Error rate per minute
# TYPE dinoair_custom_error_rate_per_minute gauge
dinoair_custom_error_rate_per_minute{instance="dinoair",type="custom"} 0.8 ${timestamp}
`;
}

function generateMockJsonMetrics() {
  return {
    timestamp: new Date().toISOString(),
    metrics: [
      {
        name: 'dinoair_system_health_score',
        value: 95.5,
        type: 'gauge',
        labels: { instance: 'dinoair' },
        help: 'Overall system health score (0-100)'
      },
      {
        name: 'dinoair_cpu_usage_percent',
        value: 25.4,
        type: 'gauge',
        labels: { instance: 'dinoair', resource_type: 'cpu' },
        help: 'CPU usage percentage'
      },
      {
        name: 'dinoair_memory_usage_percent',
        value: 68.2,
        type: 'gauge',
        labels: { instance: 'dinoair', resource_type: 'memory' },
        help: 'Memory usage percentage'
      },
      {
        name: 'dinoair_disk_usage_percent',
        value: 45.8,
        type: 'gauge',
        labels: { instance: 'dinoair', resource_type: 'disk' },
        help: 'Disk usage percentage'
      },
      {
        name: 'dinoair_network_bandwidth_mbps',
        value: 12.3,
        type: 'gauge',
        labels: { instance: 'dinoair', resource_type: 'network' },
        help: 'Network bandwidth usage'
      },
      {
        name: 'dinoair_active_services_total',
        value: 3,
        type: 'gauge',
        labels: { instance: 'dinoair' },
        help: 'Number of active DinoAir services'
      },
      {
        name: 'dinoair_custom_active_sessions',
        value: 15,
        type: 'gauge',
        labels: { instance: 'dinoair', type: 'custom' },
        help: 'Number of active user sessions'
      }
    ],
    count: 7
  };
}
