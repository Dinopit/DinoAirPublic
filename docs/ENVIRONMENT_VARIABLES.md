# DinoAir Environment Variables Documentation

This document provides comprehensive information about all environment variables used by DinoAir for configuration management.

## Table of Contents

- [Core Configuration](#core-configuration)
- [Server Configuration](#server-configuration)
- [Database Configuration](#database-configuration)
- [Security Configuration](#security-configuration)
- [Service Integration](#service-integration)
- [Resource Management](#resource-management)
- [Logging Configuration](#logging-configuration)
- [Monitoring Configuration](#monitoring-configuration)
- [Secrets Management](#secrets-management)
- [Examples](#examples)

## Core Configuration

### DINOAIR_ENV
- **Description**: Sets the deployment environment
- **Type**: String
- **Default**: `development`
- **Valid Values**: `development`, `staging`, `production`
- **Example**: `DINOAIR_ENV=production`

### DINOAIR_DEBUG
- **Description**: Enables debug mode
- **Type**: Boolean
- **Default**: `false` (in production), `true` (in development)
- **Example**: `DINOAIR_DEBUG=false`

### DINOAIR_APP_NAME
- **Description**: Application name identifier
- **Type**: String
- **Default**: `DinoAir`
- **Example**: `DINOAIR_APP_NAME="DinoAir Production"`

### DINOAIR_VERSION
- **Description**: Application version
- **Type**: String
- **Default**: `1.0.0`
- **Example**: `DINOAIR_VERSION=2.1.0`

## Server Configuration

### DINOAIR_SERVER_HOST
- **Description**: Server bind address
- **Type**: IP Address
- **Default**: `0.0.0.0`
- **Example**: `DINOAIR_SERVER_HOST=127.0.0.1`

### DINOAIR_SERVER_PORT
- **Description**: Server port number
- **Type**: Integer (1-65535)
- **Default**: `8000`
- **Example**: `DINOAIR_SERVER_PORT=8080`

### DINOAIR_SERVER_WORKERS
- **Description**: Number of worker processes
- **Type**: Integer (1-100)
- **Default**: `4`
- **Example**: `DINOAIR_SERVER_WORKERS=8`

### DINOAIR_SERVER_TIMEOUT
- **Description**: Request timeout in seconds
- **Type**: Integer
- **Default**: `300`
- **Example**: `DINOAIR_SERVER_TIMEOUT=600`

### DINOAIR_SERVER_CORS_ORIGINS
- **Description**: Allowed CORS origins (JSON array)
- **Type**: JSON Array
- **Default**: `["http://localhost:3000"]`
- **Example**: `DINOAIR_SERVER_CORS_ORIGINS='["https://app.example.com", "https://api.example.com"]'`

## Database Configuration

### DINOAIR_DB_TYPE
- **Description**: Database type
- **Type**: String
- **Default**: `sqlite`
- **Valid Values**: `sqlite`, `postgresql`, `mysql`
- **Example**: `DINOAIR_DB_TYPE=postgresql`

### DINOAIR_DB_HOST
- **Description**: Database host address
- **Type**: String
- **Default**: `localhost`
- **Example**: `DINOAIR_DB_HOST=db.example.com`

### DINOAIR_DB_PORT
- **Description**: Database port number
- **Type**: Integer
- **Default**: `5432` (PostgreSQL), `3306` (MySQL)
- **Example**: `DINOAIR_DB_PORT=5432`

### DINOAIR_DB_NAME
- **Description**: Database name
- **Type**: String
- **Default**: `dinoair`
- **Example**: `DINOAIR_DB_NAME=dinoair_production`

### DINOAIR_DB_USER
- **Description**: Database username
- **Type**: String
- **Default**: `dinoair`
- **Example**: `DINOAIR_DB_USER=app_user`

### DINOAIR_DB_PASSWORD
- **Description**: Database password
- **Type**: String (Sensitive)
- **Default**: None
- **Example**: `DINOAIR_DB_PASSWORD=secure_password_123`
- **Security Note**: Consider using secrets management instead of environment variables

### DINOAIR_DB_POOL_SIZE
- **Description**: Database connection pool size
- **Type**: Integer
- **Default**: `10`
- **Example**: `DINOAIR_DB_POOL_SIZE=20`

## Security Configuration

### DINOAIR_SECRET_KEY
- **Description**: Application secret key for encryption/signing
- **Type**: String (Sensitive, min 32 characters)
- **Default**: None (Required)
- **Example**: `DINOAIR_SECRET_KEY=your-very-secure-secret-key-at-least-32-characters-long`
- **Security Note**: Must be unique and secure in production

### DINOAIR_SECURITY_JWT_ALGORITHM
- **Description**: JWT signing algorithm
- **Type**: String
- **Default**: `HS256`
- **Valid Values**: `HS256`, `HS384`, `HS512`, `RS256`, `RS384`, `RS512`
- **Example**: `DINOAIR_SECURITY_JWT_ALGORITHM=HS512`

### DINOAIR_SECURITY_JWT_EXPIRY_HOURS
- **Description**: JWT token expiry time in hours
- **Type**: Integer
- **Default**: `24`
- **Example**: `DINOAIR_SECURITY_JWT_EXPIRY_HOURS=8`

### DINOAIR_SECURITY_ALLOWED_HOSTS
- **Description**: Allowed hosts for security (JSON array)
- **Type**: JSON Array
- **Default**: `["localhost", "127.0.0.1"]`
- **Example**: `DINOAIR_SECURITY_ALLOWED_HOSTS='["example.com", "api.example.com"]'`

### DINOAIR_SECURITY_RATE_LIMIT_REQUESTS
- **Description**: Rate limit requests per window
- **Type**: Integer
- **Default**: `100`
- **Example**: `DINOAIR_SECURITY_RATE_LIMIT_REQUESTS=200`

### DINOAIR_SECURITY_RATE_LIMIT_WINDOW
- **Description**: Rate limit window in seconds
- **Type**: Integer
- **Default**: `60`
- **Example**: `DINOAIR_SECURITY_RATE_LIMIT_WINDOW=300`

## Service Integration

### ComfyUI Configuration

#### COMFYUI_ENABLED
- **Description**: Enable ComfyUI integration
- **Type**: Boolean
- **Default**: `true`
- **Example**: `COMFYUI_ENABLED=true`

#### COMFYUI_HOST
- **Description**: ComfyUI service host
- **Type**: String
- **Default**: `localhost`
- **Example**: `COMFYUI_HOST=comfyui.internal`

#### COMFYUI_PORT
- **Description**: ComfyUI service port
- **Type**: Integer
- **Default**: `8188`
- **Example**: `COMFYUI_PORT=8188`

#### DINOAIR_COMFYUI_API_TIMEOUT
- **Description**: ComfyUI API timeout in seconds
- **Type**: Integer
- **Default**: `120`
- **Example**: `DINOAIR_COMFYUI_API_TIMEOUT=180`

#### DINOAIR_COMFYUI_MODELS_PATH
- **Description**: ComfyUI models directory path
- **Type**: String
- **Default**: `./ComfyUI/models`
- **Example**: `DINOAIR_COMFYUI_MODELS_PATH=/shared/models`

### Ollama Configuration

#### OLLAMA_ENABLED
- **Description**: Enable Ollama integration
- **Type**: Boolean
- **Default**: `true`
- **Example**: `OLLAMA_ENABLED=true`

#### OLLAMA_HOST
- **Description**: Ollama service host
- **Type**: String
- **Default**: `localhost`
- **Example**: `OLLAMA_HOST=ollama.internal`

#### OLLAMA_PORT
- **Description**: Ollama service port
- **Type**: Integer
- **Default**: `11434`
- **Example**: `OLLAMA_PORT=11434`

#### OLLAMA_MODEL
- **Description**: Default Ollama model
- **Type**: String
- **Default**: `llama2`
- **Example**: `OLLAMA_MODEL=llama3`

#### DINOAIR_OLLAMA_API_TIMEOUT
- **Description**: Ollama API timeout in seconds
- **Type**: Integer
- **Default**: `60`
- **Example**: `DINOAIR_OLLAMA_API_TIMEOUT=120`

#### DINOAIR_OLLAMA_TEMPERATURE
- **Description**: Default model temperature
- **Type**: Float (0.0-2.0)
- **Default**: `0.7`
- **Example**: `DINOAIR_OLLAMA_TEMPERATURE=0.8`

## Resource Management

### DINOAIR_RESOURCES_MAX_MEMORY_MB
- **Description**: Maximum memory usage in MB
- **Type**: Integer
- **Default**: `8192`
- **Example**: `DINOAIR_RESOURCES_MAX_MEMORY_MB=16384`

### DINOAIR_RESOURCES_MAX_CPU_PERCENT
- **Description**: Maximum CPU usage percentage
- **Type**: Float (10.0-100.0)
- **Default**: `80.0`
- **Example**: `DINOAIR_RESOURCES_MAX_CPU_PERCENT=90.0`

### DINOAIR_RESOURCES_MAX_CONCURRENT_REQUESTS
- **Description**: Maximum concurrent requests
- **Type**: Integer
- **Default**: `50`
- **Example**: `DINOAIR_RESOURCES_MAX_CONCURRENT_REQUESTS=100`

### DINOAIR_RESOURCES_MAX_DISK_USAGE_GB
- **Description**: Maximum disk usage in GB
- **Type**: Integer
- **Default**: `50`
- **Example**: `DINOAIR_RESOURCES_MAX_DISK_USAGE_GB=100`

## Logging Configuration

### DINOAIR_LOGGING_LEVEL
- **Description**: Logging level
- **Type**: String
- **Default**: `INFO`
- **Valid Values**: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- **Example**: `DINOAIR_LOGGING_LEVEL=DEBUG`

### DINOAIR_LOGGING_FORMAT
- **Description**: Log format
- **Type**: String
- **Default**: `json`
- **Valid Values**: `json`, `text`
- **Example**: `DINOAIR_LOGGING_FORMAT=text`

### DINOAIR_LOGGING_FILE_PATH
- **Description**: Log file path
- **Type**: String
- **Default**: `./logs/dinoair.log`
- **Example**: `DINOAIR_LOGGING_FILE_PATH=/var/log/dinoair/app.log`

### DINOAIR_LOGGING_MAX_FILE_SIZE_MB
- **Description**: Maximum log file size in MB
- **Type**: Integer
- **Default**: `10`
- **Example**: `DINOAIR_LOGGING_MAX_FILE_SIZE_MB=50`

### DINOAIR_LOGGING_BACKUP_COUNT
- **Description**: Number of log backup files to keep
- **Type**: Integer
- **Default**: `10`
- **Example**: `DINOAIR_LOGGING_BACKUP_COUNT=30`

### DINOAIR_LOGGING_CONSOLE_OUTPUT
- **Description**: Enable console logging
- **Type**: Boolean
- **Default**: `true`
- **Example**: `DINOAIR_LOGGING_CONSOLE_OUTPUT=false`

## Monitoring Configuration

### DINOAIR_MONITORING_ENABLED
- **Description**: Enable monitoring features
- **Type**: Boolean
- **Default**: `true`
- **Example**: `DINOAIR_MONITORING_ENABLED=true`

### DINOAIR_MONITORING_HEALTH_CHECK_INTERVAL
- **Description**: Health check interval in seconds
- **Type**: Integer
- **Default**: `30`
- **Example**: `DINOAIR_MONITORING_HEALTH_CHECK_INTERVAL=60`

### DINOAIR_MONITORING_METRICS_INTERVAL
- **Description**: Metrics collection interval in seconds
- **Type**: Integer
- **Default**: `60`
- **Example**: `DINOAIR_MONITORING_METRICS_INTERVAL=120`

### ALERT_EMAIL
- **Description**: Email address for alerts
- **Type**: Email
- **Default**: None
- **Example**: `ALERT_EMAIL=admin@example.com`

### WEBHOOK_URL
- **Description**: Webhook URL for alerts
- **Type**: URL
- **Default**: None
- **Example**: `WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`

## Secrets Management

### HashiCorp Vault

#### VAULT_ADDR
- **Description**: Vault server address
- **Type**: URL
- **Default**: None
- **Example**: `VAULT_ADDR=https://vault.example.com:8200`

#### VAULT_TOKEN
- **Description**: Vault authentication token
- **Type**: String (Sensitive)
- **Default**: None
- **Example**: `VAULT_TOKEN=hvs.CAESIF...`

#### VAULT_ROLE_ID
- **Description**: Vault AppRole role ID
- **Type**: String
- **Default**: None
- **Example**: `VAULT_ROLE_ID=12345678-1234-1234-1234-123456789012`

#### VAULT_SECRET_ID
- **Description**: Vault AppRole secret ID
- **Type**: String (Sensitive)
- **Default**: None
- **Example**: `VAULT_SECRET_ID=87654321-4321-4321-4321-210987654321`

### AWS Secrets Manager

#### AWS_DEFAULT_REGION
- **Description**: AWS region for Secrets Manager
- **Type**: String
- **Default**: `us-east-1`
- **Example**: `AWS_DEFAULT_REGION=us-west-2`

#### AWS_ACCESS_KEY_ID
- **Description**: AWS access key ID
- **Type**: String (Sensitive)
- **Default**: None
- **Example**: `AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE`

#### AWS_SECRET_ACCESS_KEY
- **Description**: AWS secret access key
- **Type**: String (Sensitive)
- **Default**: None
- **Example**: `AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

## Examples

### Development Environment

```bash
# Basic development setup
export DINOAIR_ENV=development
export DINOAIR_DEBUG=true
export DINOAIR_SECRET_KEY=dev-secret-key-minimum-32-characters-long
export DINOAIR_SERVER_HOST=127.0.0.1
export DINOAIR_SERVER_PORT=8000
export DINOAIR_LOGGING_LEVEL=DEBUG
export DINOAIR_LOGGING_FORMAT=text
```

### Production Environment

```bash
# Production setup with PostgreSQL
export DINOAIR_ENV=production
export DINOAIR_DEBUG=false
export DINOAIR_SECRET_KEY=$(cat /etc/dinoair/secret_key)
export DINOAIR_SERVER_HOST=0.0.0.0
export DINOAIR_SERVER_PORT=8000
export DINOAIR_SERVER_WORKERS=8

# Database
export DINOAIR_DB_TYPE=postgresql
export DINOAIR_DB_HOST=postgres.internal
export DINOAIR_DB_NAME=dinoair_prod
export DINOAIR_DB_USER=dinoair
export DINOAIR_DB_PASSWORD=$(vault kv get -field=password secret/dinoair/db)

# Security
export DINOAIR_SECURITY_ALLOWED_HOSTS='["example.com", "api.example.com"]'
export DINOAIR_SECURITY_JWT_EXPIRY_HOURS=8

# Monitoring
export ALERT_EMAIL=ops@example.com
export WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/XXX

# Resource limits
export DINOAIR_RESOURCES_MAX_MEMORY_MB=16384
export DINOAIR_RESOURCES_MAX_CPU_PERCENT=85.0
```

### Staging Environment

```bash
# Staging setup
export DINOAIR_ENV=staging
export DINOAIR_DEBUG=false
export DINOAIR_SECRET_KEY=staging-secret-key-minimum-32-characters-long
export DINOAIR_SERVER_WORKERS=2

# Database
export DINOAIR_DB_TYPE=postgresql
export DINOAIR_DB_HOST=staging-db.internal
export DINOAIR_DB_NAME=dinoair_staging

# External services
export COMFYUI_HOST=staging-comfyui.internal
export OLLAMA_HOST=staging-ollama.internal

# Logging
export DINOAIR_LOGGING_LEVEL=INFO
export DINOAIR_LOGGING_FORMAT=json
```

### Using Secrets Management

```bash
# Using HashiCorp Vault
export VAULT_ADDR=https://vault.example.com:8200
export VAULT_TOKEN=hvs.CAESIF...

# Then reference secrets in config:
# security:
#   secret_key: vault://secret/dinoair/app#secret_key
#   jwt_algorithm: HS256

# Using AWS Secrets Manager
export AWS_DEFAULT_REGION=us-west-2
# AWS credentials via IAM role or environment

# Then reference secrets in config:
# database:
#   password: aws://dinoair/db/credentials#password
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  dinoair:
    image: dinoair:latest
    environment:
      - DINOAIR_ENV=production
      - DINOAIR_SECRET_KEY_FILE=/run/secrets/dinoair_secret
      - DINOAIR_DB_HOST=postgres
      - DINOAIR_DB_PASSWORD_FILE=/run/secrets/db_password
      - COMFYUI_HOST=comfyui
      - OLLAMA_HOST=ollama
    secrets:
      - dinoair_secret
      - db_password
    depends_on:
      - postgres
      - comfyui
      - ollama

secrets:
  dinoair_secret:
    external: true
  db_password:
    external: true
```

### Kubernetes ConfigMap and Secret Example

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dinoair-config
data:
  DINOAIR_ENV: "production"
  DINOAIR_SERVER_HOST: "0.0.0.0"
  DINOAIR_SERVER_PORT: "8000"
  DINOAIR_DB_TYPE: "postgresql"
  DINOAIR_DB_HOST: "postgres-service"

---
apiVersion: v1
kind: Secret
metadata:
  name: dinoair-secrets
type: Opaque
data:
  DINOAIR_SECRET_KEY: <base64-encoded-secret>
  DINOAIR_DB_PASSWORD: <base64-encoded-password>
```

## Best Practices

### Security
1. **Never commit sensitive values**: Use secrets management for passwords, keys, and tokens
2. **Use strong secret keys**: Minimum 32 characters, randomly generated
3. **Rotate secrets regularly**: Implement secret rotation policies
4. **Limit access**: Use least-privilege principles for secret access

### Environment Management
1. **Use environment-specific configs**: Separate configuration per environment
2. **Validate configurations**: Always validate config before deployment
3. **Document changes**: Track configuration changes and their impact
4. **Test configurations**: Validate configs in staging before production

### Monitoring
1. **Monitor configuration drift**: Set up alerts for unexpected changes
2. **Log configuration loads**: Track when and how configs are loaded
3. **Health checks**: Monitor service health with configuration validation
4. **Alerting**: Set up appropriate alerting for configuration issues

### Performance
1. **Resource limits**: Set appropriate resource limits for your environment
2. **Connection pooling**: Configure database pools based on load
3. **Caching**: Enable configuration caching where appropriate
4. **Hot reloading**: Use hot reloading in development, carefully in production