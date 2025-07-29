# DinoAir Configuration Management Best Practices

This document outlines best practices for managing configuration in DinoAir across different environments and deployment scenarios.

## Table of Contents

- [Overview](#overview)
- [Configuration Architecture](#configuration-architecture)
- [Environment Management](#environment-management)
- [Secrets Management](#secrets-management)
- [Configuration Hot-Reloading](#configuration-hot-reloading)
- [Drift Detection and Monitoring](#drift-detection-and-monitoring)
- [Deployment Strategies](#deployment-strategies)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

DinoAir implements a comprehensive configuration management system that provides:

- **Environment-specific configurations**: Different settings per environment
- **Secrets management**: Secure handling of sensitive data
- **Hot-reloading**: Live configuration updates without restarts
- **Drift detection**: Monitoring for configuration changes
- **Validation**: Type checking and schema enforcement
- **Multiple sources**: Files, environment variables, and secret stores

## Configuration Architecture

### Configuration Sources (Priority Order)

1. **Environment Variables** (Highest priority)
2. **Environment-specific files** (e.g., `config/environments/production.yaml`)
3. **Base configuration files** (e.g., `config.yaml`)
4. **Default values** (Lowest priority)

### File Structure

```
config/
├── environments/
│   ├── development.yaml
│   ├── staging.yaml
│   └── production.yaml
├── config.yaml              # Base configuration
└── config.example.yaml      # Example/template
```

### Configuration Loading Process

```python
from lib.config import load_config, ConfigManager

# Load configuration for current environment
config = load_config(environment="production")

# Or use ConfigManager for advanced features
manager = ConfigManager(
    config_paths=["config.yaml", "config/environments/production.yaml"],
    enable_hot_reload=True
)
config = manager.load_config()
manager.start_hot_reload()
```

## Environment Management

### Environment-Specific Configuration

Create separate configuration files for each environment:

#### Development (`config/environments/development.yaml`)
```yaml
app_name: DinoAir
environment: development
debug: true

server:
  host: 127.0.0.1
  port: 8000
  workers: 1

logging:
  level: DEBUG
  format: text
  console_output: true

resources:
  max_memory_mb: 4096
  max_cpu_percent: 70.0
```

#### Staging (`config/environments/staging.yaml`)
```yaml
app_name: DinoAir
environment: staging
debug: false

server:
  host: 0.0.0.0
  port: 8000
  workers: 2

security:
  secret_key: ${DINOAIR_SECRET_KEY}
  rate_limit_requests: 200

logging:
  level: INFO
  format: json
  console_output: false

monitoring:
  enabled: true
  alert_email: ${ALERT_EMAIL}
```

#### Production (`config/environments/production.yaml`)
```yaml
app_name: DinoAir
environment: production
debug: false

server:
  host: 0.0.0.0
  port: 8000
  workers: 4

security:
  secret_key: ${DINOAIR_SECRET_KEY}
  jwt_expiry_hours: 8
  allowed_hosts:
    - dinoair.app
    - api.dinoair.app

database:
  type: postgresql
  host: ${DINOAIR_DB_HOST}
  password: ${DINOAIR_DB_PASSWORD}

logging:
  level: INFO
  format: json
  syslog_enabled: true

monitoring:
  enabled: true
  prometheus_enabled: true
  alert_email: ${ALERT_EMAIL}
  webhook_url: ${WEBHOOK_URL}
```

### Environment Selection

Set the environment using the `DINOAIR_ENV` environment variable:

```bash
# Development
export DINOAIR_ENV=development

# Staging
export DINOAIR_ENV=staging

# Production
export DINOAIR_ENV=production
```

## Secrets Management

DinoAir supports multiple secrets management backends:

### HashiCorp Vault

#### Setup
```bash
# Configure Vault connection
export VAULT_ADDR=https://vault.example.com:8200
export VAULT_TOKEN=hvs.CAESIF...

# Or use AppRole authentication
export VAULT_ROLE_ID=12345678-1234-1234-1234-123456789012
export VAULT_SECRET_ID=87654321-4321-4321-4321-210987654321
```

#### Configuration Usage
```yaml
security:
  secret_key: vault://secret/dinoair/app#secret_key
  
database:
  password: vault://secret/dinoair/db#password
```

#### Vault Secret Structure
```bash
# Store secrets in Vault
vault kv put secret/dinoair/app \
  secret_key="your-very-secure-secret-key" \
  jwt_secret="another-secure-key"

vault kv put secret/dinoair/db \
  password="secure-database-password" \
  username="dinoair_user"
```

### AWS Secrets Manager

#### Setup
```bash
# Configure AWS credentials
export AWS_DEFAULT_REGION=us-west-2
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Or use IAM roles in AWS environments
```

#### Configuration Usage
```yaml
security:
  secret_key: aws://dinoair/app/secrets#secret_key

database:
  password: aws://dinoair/db/credentials#password
```

#### AWS Secrets Manager Setup
```bash
# Create secrets in AWS
aws secretsmanager create-secret \
  --name "dinoair/app/secrets" \
  --description "DinoAir application secrets" \
  --secret-string '{"secret_key":"your-secure-key","jwt_secret":"jwt-key"}'

aws secretsmanager create-secret \
  --name "dinoair/db/credentials" \
  --description "DinoAir database credentials" \
  --secret-string '{"username":"dinoair","password":"secure-password"}'
```

### Environment Variables (Fallback)

For simpler deployments or when external secret stores aren't available:

```yaml
security:
  secret_key: ${DINOAIR_SECRET_KEY}
  
database:
  password: ${DINOAIR_DB_PASSWORD}
```

### Programmatic Secrets Access

```python
from lib.config import get_secret, resolve_secrets

# Get individual secrets
secret_key = get_secret("vault://secret/dinoair/app#secret_key")
db_password = get_secret("aws://dinoair/db/credentials#password")

# Resolve secrets in configuration
config_dict = {
    "security": {
        "secret_key": "vault://secret/dinoair/app#secret_key"
    }
}
resolved_config = resolve_secrets(config_dict)
```

## Configuration Hot-Reloading

Hot-reloading allows configuration changes without service restarts.

### Enable Hot-Reloading

```python
from lib.config import ConfigManager

manager = ConfigManager(
    config_paths=["config.yaml", "config/environments/production.yaml"],
    enable_hot_reload=True,
    reload_delay=1.0  # Wait 1 second before reloading
)

# Load initial configuration
config = manager.load_config()

# Start hot-reloading
manager.start_hot_reload()

# Add callback for configuration changes
def on_config_change(new_config, change):
    print(f"Configuration changed: {list(change.changes.keys())}")
    # Apply new configuration to your application

manager.add_reload_callback(on_config_change)
```

### Hot-Reload Callbacks

```python
def handle_server_config_change(new_config, change):
    """Handle server configuration changes"""
    if 'server' in change.changes:
        server_changes = change.changes['server']
        
        if 'workers' in server_changes:
            # Restart with new worker count
            restart_workers(new_config.server.workers)
        
        if 'timeout' in server_changes:
            # Update request timeout
            update_timeout(new_config.server.timeout)

def handle_logging_config_change(new_config, change):
    """Handle logging configuration changes"""
    if 'logging' in change.changes:
        # Reconfigure logger
        setup_logging(new_config.logging)

# Register callbacks
manager.add_reload_callback(handle_server_config_change)
manager.add_reload_callback(handle_logging_config_change)
```

### Production Considerations

- **Test changes**: Validate configuration changes in staging first
- **Gradual rollout**: Apply changes to a subset of instances initially
- **Monitoring**: Monitor service health after configuration changes
- **Rollback plan**: Have a plan to quickly revert problematic changes

## Drift Detection and Monitoring

Configuration drift detection helps ensure your services maintain expected configurations.

### Setup Drift Detection

```python
from lib.config import ConfigDriftMonitor, DriftRule, DEFAULT_DRIFT_RULES

# Define custom drift rules
custom_rules = [
    DriftRule(
        name="production_ssl_enabled",
        description="Ensure SSL is enabled in production",
        config_path="server.ssl_cert",
        expected_value=None,  # Should not be None
        severity="critical"
    ),
    DriftRule(
        name="database_pool_size",
        description="Ensure adequate database pool size",
        config_path="database.connection_pool_size",
        expected_value=15,
        tolerance={"absolute": 5},
        severity="warning"
    )
]

# Configure alerting
alert_config = {
    'enabled': True,
    'email': {
        'enabled': True,
        'smtp_server': 'smtp.example.com',
        'smtp_port': 587,
        'username': 'alerts@example.com',
        'password': os.getenv('SMTP_PASSWORD'),
        'recipients': ['ops@example.com']
    },
    'webhook': {
        'enabled': True,
        'url': 'https://hooks.slack.com/services/T00/B00/XXX'
    },
    'cooldown_minutes': 30
}

# Start drift monitoring
drift_monitor = ConfigDriftMonitor(
    rules=DEFAULT_DRIFT_RULES + custom_rules,
    alert_config=alert_config,
    check_interval=300  # Check every 5 minutes
)

drift_monitor.start_monitoring(config_manager)
```

### Default Drift Rules

DinoAir includes several default drift detection rules:

- **production_debug_disabled**: Ensures debug mode is off in production
- **production_log_level**: Ensures appropriate log level in production
- **security_secret_key_set**: Ensures secret key is configured
- **server_workers_count**: Validates worker process count
- **resource_memory_limit**: Checks memory limit configuration

### Custom Drift Rules

```python
from lib.config import DriftRule

# Rule for SSL configuration
ssl_rule = DriftRule(
    name="ssl_certificate_configured",
    description="SSL certificate must be configured in production",
    config_path="server.ssl_cert",
    expected_value="",  # Should not be empty
    severity="critical",
    enabled=True
)

# Rule with tolerance for numeric values
memory_rule = DriftRule(
    name="memory_within_limits",
    description="Memory usage should be within expected range",
    config_path="resources.max_memory_mb",
    expected_value=8192,
    tolerance={"percentage": 25},  # Allow 25% variance
    severity="warning"
)

# Add rules to monitor
drift_monitor.add_rule(ssl_rule)
drift_monitor.add_rule(memory_rule)
```

### Alerting Channels

Configure multiple alerting channels:

```yaml
# In your alert configuration
email:
  enabled: true
  smtp_server: smtp.example.com
  smtp_port: 587
  use_tls: true
  username: alerts@example.com
  password: ${SMTP_PASSWORD}
  recipients:
    - ops@example.com
    - oncall@example.com

webhook:
  enabled: true
  url: https://hooks.slack.com/services/T00/B00/XXX
  auth_header: "Bearer ${WEBHOOK_TOKEN}"

slack:
  enabled: true
  webhook_url: https://hooks.slack.com/services/T00/B00/XXX
```

## Deployment Strategies

### Blue-Green Deployment

1. **Deploy to green environment** with new configuration
2. **Validate configuration** using drift detection
3. **Switch traffic** to green environment
4. **Monitor** for configuration drift and application health

```bash
# Deploy to green environment
export DINOAIR_ENV=production-green
export DINOAIR_DB_HOST=green-db.internal

# Validate configuration
python -c "
from lib.config import load_config, ConfigDriftMonitor
config = load_config()
monitor = ConfigDriftMonitor(rules=[], alert_config={})
violations = monitor.detector.check_drift(config)
if violations:
    exit(1)
print('Configuration validation passed')
"

# Switch traffic (external load balancer configuration)
# ...
```

### Canary Deployment

1. **Deploy to subset** of instances
2. **Monitor drift** and application metrics
3. **Gradually increase** traffic to new configuration
4. **Rollback** if issues detected

```python
# Canary deployment with configuration monitoring
def deploy_canary(new_config_path, canary_percentage=10):
    # Load and validate new configuration
    new_config = load_config(new_config_path)
    
    # Deploy to canary instances
    deploy_to_instances(
        instances=get_canary_instances(canary_percentage),
        config=new_config
    )
    
    # Monitor for drift and errors
    monitor_deployment(
        duration=timedelta(minutes=30),
        error_threshold=0.01,
        drift_threshold=0
    )
```

### Rolling Deployment

1. **Update configuration** file in version control
2. **Deploy incrementally** to instances
3. **Monitor each batch** for issues
4. **Continue or rollback** based on health checks

## Security Best Practices

### Secret Management

1. **Never commit secrets**: Use `.gitignore` for sensitive files
2. **Rotate secrets regularly**: Implement automated rotation
3. **Principle of least privilege**: Limit secret access
4. **Audit secret access**: Log and monitor secret usage

```bash
# Example .gitignore entries
config/secrets/
*.key
*.pem
.env
config.local.*
```

### Environment Variables

1. **Use for non-sensitive config**: Public configuration values only
2. **Validate input**: Always validate environment variable values
3. **Document variables**: Maintain comprehensive documentation
4. **Set defaults safely**: Safe defaults for development

### Access Control

1. **RBAC for configuration**: Role-based access to config files
2. **Audit changes**: Track all configuration modifications
3. **Review process**: Peer review for production changes
4. **Emergency access**: Break-glass procedures for critical issues

### Network Security

1. **Encrypt in transit**: Use TLS for all configuration transfers
2. **VPN/private networks**: Restrict access to internal networks
3. **Firewall rules**: Control access to configuration services
4. **Certificate management**: Proper certificate lifecycle management

## Troubleshooting

### Common Issues

#### Configuration Not Loading

```python
# Debug configuration loading
import logging
logging.basicConfig(level=logging.DEBUG)

from lib.config import load_config
config = load_config(environment="production")
```

Check:
- File permissions
- Environment variable values
- File syntax (YAML/JSON)
- Secret store connectivity

#### Secrets Resolution Failing

```python
# Test secrets connectivity
from lib.config import secrets_manager

providers = secrets_manager.list_available_providers()
print(f"Available providers: {providers}")

# Test specific secret
try:
    secret = secrets_manager.get_secret("vault://secret/test")
    print("Vault connectivity: OK")
except Exception as e:
    print(f"Vault error: {e}")
```

#### Hot-Reload Not Working

Check:
- File system permissions
- File watcher limits (`fs.inotify.max_user_watches`)
- Network file systems (may not support inotify)
- File modification detection

```bash
# Increase inotify limits
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Drift Detection False Positives

1. **Review drift rules**: Ensure rules match expected configuration
2. **Check tolerance settings**: Adjust for acceptable variance
3. **Validate rule logic**: Test rules against known good config
4. **Monitor timing**: Consider configuration load timing

### Diagnostic Commands

```python
# Configuration validation
from lib.config import ConfigValidator
validator = ConfigValidator()
try:
    config = validator.validate(config_dict)
    print("Configuration is valid")
except Exception as e:
    print(f"Validation error: {e}")

# Drift detection test
from lib.config import DriftDetector, DEFAULT_DRIFT_RULES
detector = DriftDetector(DEFAULT_DRIFT_RULES)
violations = detector.check_drift(config)
for v in violations:
    print(f"Drift: {v.rule.name} - {v.message}")

# Secrets connectivity test
from lib.config import get_secret
try:
    secret = get_secret("vault://secret/test")
    print("Secrets working")
except Exception as e:
    print(f"Secrets error: {e}")
```

### Monitoring and Logging

Enable comprehensive logging for troubleshooting:

```yaml
logging:
  level: DEBUG
  format: json
  console_output: true
  
  # Add configuration-specific loggers
  loggers:
    'lib.config': DEBUG
    'lib.config.secrets_manager': DEBUG
    'lib.config.hot_reload': DEBUG
    'lib.config.drift_detection': DEBUG
```

### Performance Optimization

1. **Cache configuration**: Avoid repeated file reads
2. **Batch secret requests**: Minimize secret store API calls
3. **Optimize file watching**: Limit watched directories
4. **Tune reload delays**: Balance responsiveness vs. stability

```python
# Optimized configuration loading
class OptimizedConfigManager:
    def __init__(self):
        self._config_cache = {}
        self._cache_ttl = 300  # 5 minutes
    
    def get_config(self, cache_key="default"):
        now = time.time()
        cached = self._config_cache.get(cache_key)
        
        if cached and (now - cached['timestamp']) < self._cache_ttl:
            return cached['config']
        
        # Load fresh configuration
        config = load_config()
        self._config_cache[cache_key] = {
            'config': config,
            'timestamp': now
        }
        
        return config
```

This comprehensive configuration management system provides DinoAir with enterprise-grade configuration capabilities while maintaining simplicity for development and deployment workflows.