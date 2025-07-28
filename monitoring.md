# DinoAir Advanced Monitoring and Observability

This document describes the enhanced monitoring and observability features implemented for DinoAir.

## Features Overview

### 1. OpenTelemetry Distributed Tracing
- **File**: `monitoring/opentelemetry_tracer.py`
- **Purpose**: Provides distributed tracing across DinoAir services
- **Exporters**: Supports Jaeger and OTLP for various observability backends
- **Integration**: Automatic correlation ID propagation

### 2. Comprehensive Audit Logging
- **File**: `monitoring/audit_logger.py`
- **Purpose**: Secure audit logging for compliance and security monitoring
- **Features**: Encrypted logs, risk scoring, tamper protection
- **Events**: Authentication, authorization, data access, configuration changes

### 3. Enhanced Alerting System
- **File**: `alerting_system.py` (enhanced)
- **New Categories**: Security events, performance degradation, compliance violations
- **Integration**: Automatic alerts from audit events and resource monitoring

### 4. System Dashboards
- **Location**: `config/dashboards/`
- **Types**: System overview, security monitoring, performance monitoring
- **Format**: Grafana-compatible JSON configurations

### 5. Integrated Monitoring System
- **File**: `monitoring/enhanced_monitoring.py`
- **Purpose**: Central coordination of all monitoring components
- **Features**: Health status API, decorator-based monitoring

## Quick Start

### Basic Usage

```python
from monitoring.enhanced_monitoring import get_monitoring_system, monitor_operation
from monitoring.audit_logger import AuditEventType

# Initialize monitoring
monitoring = get_monitoring_system()

# Use decorator for automatic monitoring
@monitor_operation(
    operation_name="user_login",
    audit_event_type=AuditEventType.AUTHENTICATION
)
def authenticate_user(username, password):
    # Your authentication logic here
    return True

# Manual tracing and auditing
with monitoring.start_span("data_processing") as span:
    span.set_attribute("user_id", "12345")
    
    monitoring.audit_operation(
        event_type=AuditEventType.DATA_ACCESS,
        action="read_user_profile",
        resource="user_database",
        actor="user_12345"
    )
```

### Configuration

```python
from monitoring.enhanced_monitoring import MonitoringConfig, init_monitoring

config = MonitoringConfig(
    enable_tracing=True,
    jaeger_endpoint="http://localhost:14268/api/traces",
    enable_audit_logging=True,
    audit_log_directory="/var/log/dinoair/audit",
    enable_alerting=True
)

monitoring = init_monitoring(config)
```

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up audit log directory:
```bash
sudo mkdir -p /var/log/dinoair/audit
sudo chown dinoair:dinoair /var/log/dinoair/audit
sudo chmod 750 /var/log/dinoair/audit
```

## Dashboard Deployment

### Grafana Setup

1. Import dashboard configurations:
```bash
# System Overview Dashboard
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @config/dashboards/system-overview.json

# Security Monitoring Dashboard  
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @config/dashboards/security-monitoring.json

# Performance Monitoring Dashboard
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @config/dashboards/performance-monitoring.json
```

2. Configure Prometheus data source in Grafana pointing to your metrics endpoint.

## Environment Variables

```bash
# OpenTelemetry Configuration
export OTEL_SERVICE_NAME="dinoair"
export OTEL_EXPORTER_JAEGER_ENDPOINT="http://localhost:14268/api/traces"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"

# Audit Logging
export DINOAIR_AUDIT_LOG_DIR="/var/log/dinoair/audit"
export DINOAIR_AUDIT_ENCRYPTION_ENABLED="true"

# Alerting
export DINOAIR_ALERT_EMAIL_SMTP_SERVER="smtp.company.com"
export DINOAIR_ALERT_EMAIL_FROM="alerts@company.com"
export DINOAIR_ALERT_EMAIL_TO="ops-team@company.com"
```

## Health Check API

The monitoring system provides a health status endpoint:

```python
from monitoring.enhanced_monitoring import get_health_status

health = get_health_status()
# Returns:
# {
#   "status": "healthy|degraded|critical",
#   "timestamp": "2024-01-01T00:00:00Z",
#   "components": {
#     "tracing": true,
#     "audit_logging": true,
#     "resource_monitoring": true,
#     "alerting": true
#   },
#   "metrics": {
#     "cpu_percent": 45.2,
#     "memory_percent": 67.8,
#     "disk_percent": 23.1
#   }
# }
```

## Security Considerations

1. **Audit Logs**: Encrypted by default with AES-256
2. **Access Control**: Audit log directory requires restricted permissions
3. **Data Retention**: Configure log rotation based on compliance requirements
4. **Network Security**: Secure OpenTelemetry endpoints with TLS

## Compliance Features

- **Audit Trail**: Complete audit trail for all sensitive operations
- **Data Integrity**: Cryptographic hash verification for audit logs
- **Risk Scoring**: Automatic risk assessment for security events
- **Searchable Logs**: Full-text search capability for compliance reporting

## Troubleshooting

### Common Issues

1. **OpenTelemetry not working**: Check if dependencies are installed
2. **Audit logs not encrypted**: Verify cryptography package installation
3. **Dashboards not showing data**: Confirm Prometheus metrics endpoint
4. **Alerts not sending**: Check SMTP configuration and network connectivity

### Debug Mode

Enable debug logging:
```python
import logging
logging.getLogger('monitoring').setLevel(logging.DEBUG)
```

## Testing

Run the test suite to verify installation:
```bash
python test_monitoring_implementation.py
```

Expected output: All 5 tests should pass.

## Support

For issues or questions about the monitoring system:
1. Check the test suite for examples
2. Review the source code documentation
3. Verify configuration and environment variables
4. Test with debug logging enabled