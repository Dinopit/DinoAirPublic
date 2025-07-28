# DinoAir Deployment Guide 🚀

This comprehensive guide covers all aspects of deploying DinoAir in various environments, from development to production.

## Table of Contents

- [Quick Start](#quick-start)
- [System Requirements](#system-requirements)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
- [Configuration](#configuration)
- [Security Considerations](#security-considerations)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Scaling and Performance](#scaling-and-performance)

## Quick Start

For a rapid deployment, use our automated installer:

```bash
# Download and run the safe installer
curl -fsSL https://raw.githubusercontent.com/Dinopit/DinoAirPublic/main/install_safe.py | python3
```

Or clone and install manually:

```bash
git clone https://github.com/Dinopit/DinoAirPublic.git
cd DinoAirPublic
python3 install_safe.py
```

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Ubuntu 20.04+, CentOS 8+, macOS 11+, Windows 10+ |
| **CPU** | 4 cores, 2.0 GHz |
| **RAM** | 8 GB |
| **Storage** | 50 GB free space |
| **Python** | 3.8+ |
| **Node.js** | 16+ |
| **Git** | 2.20+ |

### Recommended Requirements

| Component | Requirement |
|-----------|-------------|
| **CPU** | 8+ cores, 3.0+ GHz |
| **RAM** | 16+ GB |
| **Storage** | 100+ GB SSD |
| **GPU** | NVIDIA GPU with 8+ GB VRAM (for image generation) |

### Network Requirements

- **Outbound**: HTTPS (443) for model downloads and updates
- **Inbound**: Configurable ports (default: 8000 for web, 8001 for API)
- **Bandwidth**: 100 Mbps+ recommended for model downloads

## Environment Setup

### 1. Development Environment

Perfect for local development and testing:

```bash
# Clone repository
git clone https://github.com/Dinopit/DinoAirPublic.git
cd DinoAirPublic

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Setup web GUI
cd web-gui
npm install
npm run build
cd ..

# Initialize configuration
cp config.example.yaml config.yaml
# Edit config.yaml with your settings

# Start development server
python3 start.py --dev
```

### 2. Production Environment

#### Option A: Docker Deployment (Recommended)

```bash
# Clone repository
git clone https://github.com/Dinopit/DinoAirPublic.git
cd DinoAirPublic

# Build and start services
docker-compose up -d

# Check status
docker-compose ps
```

#### Option B: Native Installation

```bash
# System dependencies (Ubuntu/Debian)
sudo apt update
sudo apt install -y python3 python3-pip nodejs npm git curl

# Clone and install
git clone https://github.com/Dinopit/DinoAirPublic.git
cd DinoAirPublic
python3 install_safe.py --production

# Configure systemd service
sudo cp deployment/dinoair.service /etc/systemd/system/
sudo systemctl enable dinoair
sudo systemctl start dinoair
```

### 3. Cloud Deployment

#### AWS EC2

```bash
# Launch EC2 instance (t3.large or larger recommended)
# Security Group: Allow ports 22, 80, 443, 8000, 8001

# Connect and install
ssh -i your-key.pem ubuntu@your-instance-ip
curl -fsSL https://raw.githubusercontent.com/Dinopit/DinoAirPublic/main/deployment/aws-install.sh | bash

# Configure load balancer (optional)
# See deployment/aws-cloudformation.yaml
```

#### Google Cloud Platform

```bash
# Create VM instance
gcloud compute instances create dinoair-instance \
  --machine-type=n1-standard-4 \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=100GB

# SSH and install
gcloud compute ssh dinoair-instance
curl -fsSL https://raw.githubusercontent.com/Dinopit/DinoAirPublic/main/deployment/gcp-install.sh | bash
```

#### Azure

```bash
# Create resource group and VM
az group create --name DinoAirRG --location eastus
az vm create \
  --resource-group DinoAirRG \
  --name DinoAirVM \
  --image UbuntuLTS \
  --size Standard_D4s_v3 \
  --admin-username azureuser \
  --generate-ssh-keys

# SSH and install
ssh azureuser@your-vm-ip
curl -fsSL https://raw.githubusercontent.com/Dinopit/DinoAirPublic/main/deployment/azure-install.sh | bash
```

## Deployment Methods

### 1. Docker Compose (Recommended)

**Pros**: Easy setup, isolated environment, consistent across platforms
**Cons**: Requires Docker knowledge

```yaml
# docker-compose.yml
version: '3.8'
services:
  dinoair:
    build: .
    ports:
      - "8000:8000"
      - "8001:8001"
    volumes:
      - ./config:/app/config
      - ./data:/app/data
      - ./models:/app/models
    environment:
      - ENVIRONMENT=production
      - LOG_LEVEL=info
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployment/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - dinoair
    restart: unless-stopped
```

### 2. Kubernetes

**Pros**: Scalable, high availability, cloud-native
**Cons**: Complex setup, requires Kubernetes knowledge

```yaml
# deployment/k8s/dinoair-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dinoair
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dinoair
  template:
    metadata:
      labels:
        app: dinoair
    spec:
      containers:
      - name: dinoair
        image: dinoair:latest
        ports:
        - containerPort: 8000
        - containerPort: 8001
        env:
        - name: ENVIRONMENT
          value: "production"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
```

### 3. Systemd Service

**Pros**: Native Linux integration, automatic startup
**Cons**: Linux only, manual dependency management

```ini
# /etc/systemd/system/dinoair.service
[Unit]
Description=DinoAir AI Platform
After=network.target

[Service]
Type=simple
User=dinoair
WorkingDirectory=/opt/dinoair
ExecStart=/opt/dinoair/venv/bin/python start.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=/opt/dinoair
Environment=ENVIRONMENT=production

[Install]
WantedBy=multi-user.target
```

## Configuration

### Production Environment Templates

DinoAir provides pre-configured environment templates for different deployment scenarios:

#### Production Environment

Copy `.env.production.example` to `.env.production` and configure:

```bash
# Copy the production template
cp .env.production.example .env.production

# Edit the configuration
nano .env.production
```

Key production settings to configure:

- **DINOAIR_SECRET_KEY**: Generate with `openssl rand -hex 32`
- **DINOAIR_DATABASE_PASSWORD**: Strong database password
- **Database connection details**: Host, port, user, database name
- **AI service endpoints**: ComfyUI and Ollama hosts/ports
- **Monitoring settings**: Alert email, webhook URLs

#### Staging Environment

For staging deployments:

```bash
# Copy the staging template
cp .env.staging.example .env.staging

# Edit the configuration
nano .env.staging
```

Staging uses different ports and more verbose logging for debugging.

#### Environment Configuration Loading

DinoAir supports multiple configuration methods (in order of precedence):

1. **Environment variables** (highest priority)
2. **Environment-specific YAML files** (`config/environments/production.yaml`)
3. **Main configuration file** (`config.yaml`)
4. **Default values** (lowest priority)

The configuration system supports:
- Variable substitution: `${VARIABLE_NAME}` or `${VARIABLE_NAME:-default_value}`
- Environment prefixes: `DINOAIR_SERVER_PORT` → `server.port`
- Nested configuration: `DINOAIR_DATABASE_HOST` → `database.host`

### Environment Variables

```bash
# Core settings
export DINOAIR_ENV=production
export DINOAIR_HOST=0.0.0.0
export DINOAIR_PORT=8000
export DINOAIR_API_PORT=8001

# Database
export DATABASE_URL=postgresql://user:pass@localhost/dinoair
export REDIS_URL=redis://localhost:6379

# Security
export SECRET_KEY=your-secret-key-here
export JWT_SECRET=your-jwt-secret-here
export API_KEY=your-api-key-here

# External services
export OLLAMA_HOST=http://localhost:11434
export COMFYUI_HOST=http://localhost:8188

# Logging
export LOG_LEVEL=info
export LOG_FILE=/var/log/dinoair/app.log

# Features
export ENABLE_TELEMETRY=true
export ENABLE_ANALYTICS=true
export ENABLE_AUTO_UPDATES=false
```

### Configuration File

```yaml
# config.yaml
server:
  host: "0.0.0.0"
  port: 8000
  api_port: 8001
  workers: 4
  
database:
  url: "postgresql://user:pass@localhost/dinoair"
  pool_size: 10
  
redis:
  url: "redis://localhost:6379"
  
security:
  secret_key: "${SECRET_KEY}"
  jwt_secret: "${JWT_SECRET}"
  api_key: "${API_KEY}"
  cors_origins:
    - "https://yourdomain.com"
    - "https://app.yourdomain.com"
  
services:
  ollama:
    host: "http://localhost:11434"
    timeout: 300
  comfyui:
    host: "http://localhost:8188"
    timeout: 600
    
logging:
  level: "info"
  file: "/var/log/dinoair/app.log"
  max_size: "100MB"
  backup_count: 5
  
features:
  telemetry: true
  analytics: true
  auto_updates: false
  collaboration: true
  
models:
  cache_dir: "/opt/dinoair/models"
  auto_download: true
  cleanup_old: true
```

## Security Considerations

### 1. Network Security

```bash
# Firewall configuration (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# For development only
sudo ufw allow 8000/tcp
sudo ufw allow 8001/tcp
```

### 2. SSL/TLS Configuration

```nginx
# nginx SSL configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Authentication & Authorization

```python
# Enhanced security configuration
SECURITY_CONFIG = {
    'password_policy': {
        'min_length': 12,
        'require_uppercase': True,
        'require_lowercase': True,
        'require_numbers': True,
        'require_symbols': True
    },
    'session': {
        'timeout': 3600,  # 1 hour
        'secure_cookies': True,
        'httponly_cookies': True
    },
    'rate_limiting': {
        'login_attempts': 5,
        'api_requests': 1000,
        'window': 3600
    }
}
```

## Monitoring and Maintenance

### 1. Health Checks

```bash
# Basic health check
curl -f http://localhost:8000/api/health || exit 1

# Detailed health check
curl -s http://localhost:8000/api/health/detailed | jq .

# Service-specific checks
curl -s http://localhost:8000/api/health/ollama
curl -s http://localhost:8000/api/health/comfyui
```

### 2. Logging

```bash
# View logs
tail -f /var/log/dinoair/app.log

# Search logs
grep "ERROR" /var/log/dinoair/app.log
grep "$(date +%Y-%m-%d)" /var/log/dinoair/app.log

# Log rotation
sudo logrotate -f /etc/logrotate.d/dinoair
```

### 3. Backup Procedures

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backup/dinoair/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup configuration
cp -r /opt/dinoair/config "$BACKUP_DIR/"

# Backup database
pg_dump dinoair > "$BACKUP_DIR/database.sql"

# Backup models (if local)
rsync -av /opt/dinoair/models "$BACKUP_DIR/"

# Backup user data
rsync -av /opt/dinoair/data "$BACKUP_DIR/"

# Create archive
tar -czf "$BACKUP_DIR.tar.gz" -C /backup/dinoair "$(basename $BACKUP_DIR)"
rm -rf "$BACKUP_DIR"

echo "Backup completed: $BACKUP_DIR.tar.gz"
```

### 4. Update Procedures

```bash
# Automated update script
#!/bin/bash
set -e

echo "Starting DinoAir update..."

# Backup current installation
./backup.sh

# Stop services
sudo systemctl stop dinoair

# Update code
git fetch --tags
git checkout $(git describe --tags --abbrev=0)

# Update dependencies
pip install -r requirements.txt
cd web-gui && npm install && npm run build && cd ..

# Run migrations
python migrate.py

# Start services
sudo systemctl start dinoair

# Verify deployment
sleep 10
curl -f http://localhost:8000/api/health || {
    echo "Health check failed, rolling back..."
    ./rollback.sh
    exit 1
}

echo "Update completed successfully!"
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check logs
sudo journalctl -u dinoair -f

# Check configuration
python -c "import yaml; yaml.safe_load(open('config.yaml'))"

# Check dependencies
pip check
npm audit

# Check ports
sudo netstat -tlnp | grep :8000
```

#### 2. High Memory Usage

```bash
# Monitor memory
htop
free -h
ps aux --sort=-%mem | head

# Check for memory leaks
python -m memory_profiler start.py

# Restart services
sudo systemctl restart dinoair
```

#### 3. Slow Performance

```bash
# Check system resources
iostat -x 1
sar -u 1 5

# Check database performance
EXPLAIN ANALYZE SELECT * FROM your_query;

# Check network latency
ping -c 5 your-api-endpoint
```

#### 4. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout

# Test SSL configuration
openssl s_client -connect yourdomain.com:443

# Renew Let's Encrypt certificate
sudo certbot renew
```

### Debug Mode

```bash
# Enable debug mode
export DINOAIR_DEBUG=true
export LOG_LEVEL=debug

# Start with verbose logging
python start.py --debug --verbose

# Enable profiling
python -m cProfile -o profile.stats start.py
```

## Scaling and Performance

### 1. Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  dinoair:
    build: .
    deploy:
      replicas: 3
    environment:
      - ENVIRONMENT=production
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deployment/nginx-lb.conf:/etc/nginx/nginx.conf
```

### 2. Load Balancing

```nginx
# nginx load balancer configuration
upstream dinoair_backend {
    least_conn;
    server dinoair_1:8000 max_fails=3 fail_timeout=30s;
    server dinoair_2:8000 max_fails=3 fail_timeout=30s;
    server dinoair_3:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    location / {
        proxy_pass http://dinoair_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Caching

```yaml
# Redis caching configuration
redis:
  url: "redis://redis-cluster:6379"
  cluster_mode: true
  cache_ttl: 3600
  max_memory: "2gb"
  eviction_policy: "allkeys-lru"
```

### 4. Database Optimization

```sql
-- PostgreSQL optimization
-- Enable connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';

-- Create indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_sessions_created ON sessions(created_at);
```

## Support and Resources

- **Documentation**: [https://docs.dinoair.com](https://docs.dinoair.com)
- **GitHub Issues**: [https://github.com/Dinopit/DinoAirPublic/issues](https://github.com/Dinopit/DinoAirPublic/issues)
- **Discord Community**: [https://discord.gg/dinoair](https://discord.gg/dinoair)
- **Email Support**: support@dinoair.com

---

**Last Updated**: 2025-01-26
**Version**: 1.2.0

For the most up-to-date deployment information, please check our [GitHub repository](https://github.com/Dinopit/DinoAirPublic).