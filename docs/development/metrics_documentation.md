# DinoAir Metrics Collection and Dashboard Documentation

## Overview

DinoAir includes a comprehensive metrics collection and visualization system that monitors system performance, tracks user interactions, and provides insights into AI model usage. The system is designed to be lightweight, extensible, and provide actionable monitoring data.

## Features

- **System Resource Monitoring**: CPU, memory, disk, network, and GPU usage
- **Application Metrics**: API request rates, response times, error rates
- **Custom Business Logic Metrics**: Model generations, user sessions, workflows
- **Multiple Export Formats**: Prometheus, JSON, InfluxDB, CSV
- **Built-in Dashboard**: Real-time visualization of key metrics
- **Configurable Retention**: Automatic cleanup of old metrics data
- **Alert Integration**: Ready for integration with external alerting systems

## Architecture

### Core Components

1. **MetricsCollector**: Collects system and application metrics
2. **CustomMetricsRegistry**: Tracks business-specific events and metrics
3. **MetricsStorage**: Persistent storage with configurable retention
4. **MetricsExporter**: Export metrics in various formats
5. **DashboardDataProvider**: Provides data for visualization dashboards
6. **MetricsService**: Orchestrates all components and provides a unified API

### Data Flow

```
Application Events → CustomMetricsRegistry → MetricsCollector → Storage
                                                     ↓
                                            MetricsExporter → Prometheus/JSON
                                                     ↓
                                         DashboardDataProvider → Web Dashboard
```

## Quick Start

### 1. Initialize Metrics Collection

The metrics system is automatically initialized when DinoAir starts, but you can also set it up manually:

```python
from lib.metrics.metrics_service import initialize_metrics_service, start_metrics_service

# Initialize with default configuration
service = initialize_metrics_service()
start_metrics_service()
```

### 2. Access the Dashboard

Visit `http://localhost:3000/monitoring` to view the built-in monitoring dashboard.

### 3. Access Prometheus Metrics

Prometheus-compatible metrics are available at `http://localhost:3000/api/metrics`.

## Configuration

### Basic Configuration

```python
from lib.metrics.metrics_collector import MetricsConfig

config = MetricsConfig(
    collection_interval=15,     # seconds between collections
    retention_hours=24,         # hours to keep metrics
    enable_prometheus_export=True,
    enable_custom_metrics=True,
    storage_path="./metrics",
    
    # Custom metric tracking
    track_api_requests=True,
    track_user_interactions=True,
    track_model_usage=True,
    track_error_rates=True
)
```

### Storage Options

#### File Storage (Default)
```python
# Stores metrics as compressed JSON files
storage = FileMetricsStorage("./metrics", compress=True)
```

#### SQLite Storage
```python
# Better query performance for large datasets
storage = SQLiteMetricsStorage("./metrics/metrics.db")
```

## API Reference

### Recording Custom Metrics

#### API Requests
```python
from lib.metrics.metrics_service import record_api_request

record_api_request(
    service="comfyui",
    endpoint="/generate",
    response_time=1.23,
    status_code=200,
    method="POST"
)
```

#### Model Generations
```python
from lib.metrics.metrics_service import record_model_generation

record_model_generation(
    model_name="llama2-7b",
    generation_time=15.4,
    success=True,
    prompt_length=256,
    output_length=512
)
```

#### Error Events
```python
from lib.metrics.metrics_service import record_error

record_error(
    error_type="connection_timeout",
    error_message="Failed to connect to ComfyUI",
    service="comfyui",
    severity="error"
)
```

#### User Sessions
```python
from lib.metrics.metrics_service import start_user_session, end_user_session

# Start tracking a session
start_user_session("session_123", user_agent="Mozilla/5.0...")

# End session tracking
end_user_session("session_123")
```

### Querying Metrics

#### Get Latest Metrics
```python
from lib.metrics.metrics_service import get_metrics_service

service = get_metrics_service()
latest_metrics = service.metrics_collector.get_latest_metrics()
```

#### Get Historical Data
```python
from datetime import datetime, timedelta

# Get CPU metrics from last hour
start_time = datetime.now() - timedelta(hours=1)
cpu_metrics = service.storage.query_metrics(
    metric_name="dinoair_cpu_usage_percent",
    start_time=start_time
)
```

#### Get Dashboard Data
```python
# System overview
overview = service.get_dashboard_data("overview")

# Resource usage over time
resources = service.get_dashboard_data("resources", timeframe=6)

# API performance metrics
api_data = service.get_dashboard_data("api", timeframe=24)
```

## API Endpoints

### Metrics Export

#### Prometheus Format
```
GET /api/metrics
GET /api/metrics?format=prometheus
```

#### JSON Format
```
GET /api/metrics?format=json
```

### Dashboard Data

#### System Overview
```
GET /api/metrics/dashboard?widget=overview
```

#### Resource Metrics
```
GET /api/metrics/dashboard?widget=resources&timeframe=6
```

#### API Performance
```
GET /api/metrics/dashboard?widget=api&timeframe=24
```

#### Model Usage
```
GET /api/metrics/dashboard?widget=models
```

#### Error Tracking
```
GET /api/metrics/dashboard?widget=errors&timeframe=24
```

#### User Activity
```
GET /api/metrics/dashboard?widget=users&timeframe=24
```

## Dashboard Features

### System Overview
- Real-time system status and health score
- Current resource utilization (CPU, memory, disk)
- Active user sessions and total requests
- Service status indicators

### Resource Usage
- Time-series charts for CPU, memory, and disk usage
- Configurable time ranges (1h, 6h, 24h, 7d)
- Summary statistics (average, peak usage)

### API Performance
- Request rates and error rates by service
- Response time distributions and percentiles
- Service health status indicators

### Model Usage
- Generation counts and success rates by model
- Average generation times and queue sizes
- Prompt and output length statistics

### Error Tracking
- Error counts by type, service, and severity
- Recent error log with timestamps
- Error rate trends over time

### User Activity
- Active session counts and duration statistics
- User activity timeline
- Session distribution analysis

## Metrics Reference

### System Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `dinoair_cpu_usage_percent` | Gauge | CPU utilization percentage |
| `dinoair_memory_usage_percent` | Gauge | Memory utilization percentage |
| `dinoair_disk_usage_percent` | Gauge | Disk usage percentage |
| `dinoair_network_bandwidth_mbps` | Gauge | Network bandwidth usage |
| `dinoair_system_health_score` | Gauge | Overall system health (0-100) |
| `dinoair_active_services_total` | Gauge | Number of active services |

### Application Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `dinoair_custom_api_requests_total` | Counter | Total API requests by service |
| `dinoair_custom_api_errors_total` | Counter | Total API errors by service |
| `dinoair_custom_api_response_time_avg` | Gauge | Average API response time |
| `dinoair_custom_active_sessions` | Gauge | Number of active user sessions |
| `dinoair_custom_model_generations_total` | Counter | Total model generations |
| `dinoair_custom_error_rate_per_minute` | Gauge | Error rate per minute |

### Custom Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `dinoair_custom_session_durations_*` | Histogram | User session duration statistics |
| `dinoair_custom_workflow_*` | Various | Workflow execution metrics |
| `dinoair_custom_file_*` | Various | File operation metrics |

## Integration Examples

### Prometheus Integration

1. Configure Prometheus to scrape DinoAir metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'dinoair'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 30s
```

2. Set up Grafana dashboard using the exported metrics.

### Custom Alerting

```python
from lib.metrics.metrics_service import get_metrics_service

def check_high_error_rate():
    service = get_metrics_service()
    overview = service.get_dashboard_data("overview")
    
    if overview["error_rate"] > 5.0:  # More than 5 errors per minute
        send_alert("High error rate detected", overview)

def check_resource_usage():
    service = get_metrics_service()
    overview = service.get_dashboard_data("overview")
    
    if overview["resources"]["cpu"] > 90:
        send_alert("High CPU usage", overview)
```

### Custom Metrics Collection

```python
from lib.metrics.custom_metrics import CustomMetricsRegistry

# Create custom metrics for your application
metrics = CustomMetricsRegistry()

# Record custom business events
metrics.record_workflow_execution(
    workflow_name="image_generation",
    execution_time=45.2,
    success=True,
    steps_completed=5,
    total_steps=5
)

metrics.record_file_operation(
    operation="upload",
    file_size=1024000,  # 1MB
    duration=2.1,
    success=True
)
```

## Performance Considerations

### Resource Usage
- Metrics collection adds minimal overhead (~1-2% CPU)
- Memory usage scales with retention policy
- Storage grows approximately 1MB per day for typical usage

### Optimization Tips
1. Adjust collection interval based on needs (15-60 seconds)
2. Use appropriate retention policies (24-168 hours)
3. Consider SQLite storage for high-volume environments
4. Enable compression for file storage

### Scaling
- For high-volume deployments, consider external time-series databases
- Use metrics aggregation for long-term storage
- Implement metrics sampling for very high-frequency events

## Troubleshooting

### Common Issues

#### Metrics Not Appearing
1. Check if metrics service is started
2. Verify configuration settings
3. Check log files for errors

#### Dashboard Not Loading
1. Ensure web GUI is running on port 3000
2. Check browser console for JavaScript errors
3. Verify API endpoints are accessible

#### Storage Issues
1. Check disk space for file storage
2. Verify write permissions for storage directory
3. Check database file permissions for SQLite storage

### Debug Mode

Enable debug logging for detailed troubleshooting:

```python
import logging
logging.getLogger("MetricsCollector").setLevel(logging.DEBUG)
logging.getLogger("CustomMetricsRegistry").setLevel(logging.DEBUG)
```

### Health Check

Check metrics service status:

```python
from lib.metrics.metrics_service import get_metrics_service

service = get_metrics_service()
status = service.get_service_status()
print(status)
```

## Contributing

To extend the metrics system:

1. **Adding New Metrics**: Extend `CustomMetricsRegistry` with new methods
2. **New Export Formats**: Implement `MetricsExporter` interface
3. **Storage Backends**: Implement `MetricsStorage` interface
4. **Dashboard Widgets**: Add new cases to `DashboardDataProvider`

### Example: Adding Custom Metric Type

```python
def record_cache_operation(self, operation: str, hit: bool, duration: float):
    """Record cache operation metrics"""
    # Update counters
    op_key = f"cache_{operation}"
    self.counters[f"{op_key}_total"] += 1
    
    if hit:
        self.counters[f"{op_key}_hits"] += 1
    
    # Update timing
    if f"{op_key}_times" not in self.histograms:
        self.histograms[f"{op_key}_times"] = []
    self.histograms[f"{op_key}_times"].append(duration)
    
    # Calculate hit rate
    total = self.counters[f"{op_key}_total"]
    hits = self.counters.get(f"{op_key}_hits", 0)
    self.gauges[f"{op_key}_hit_rate"] = hits / total
```

## License

This metrics system is part of DinoAir and follows the same license terms.