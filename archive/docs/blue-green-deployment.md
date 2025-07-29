# Blue-Green Deployment Guide for DinoAir

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Deployment Process](#deployment-process)
5. [Traffic Management](#traffic-management)
6. [Rollback Procedures](#rollback-procedures)
7. [Health Monitoring](#health-monitoring)
8. [Database Migration Strategies](#database-migration-strategies)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Overview

Blue-green deployment is a technique that reduces downtime and risk by running two identical production environments called Blue and Green. At any time, only one environment serves live production traffic, while the other is available for testing new deployments.

### Benefits

- **Zero-downtime deployments**: Switch traffic instantly between environments
- **Easy rollbacks**: Quick revert to previous version if issues arise
- **Safe testing**: Test new deployments in production-like environment
- **Reduced risk**: Validate deployments before exposing to users

### Architecture

```
                    ┌─────────────────┐
                    │   Users/Clients │
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │  Nginx LB       │
                    │  (Port 80)      │
                    └─────────┬───────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼───────┐              ┌────────▼──────┐
    │ Blue Environment│              │Green Environment│
    │                 │              │                │
    │ Web GUI:3001    │              │ Web GUI:3002   │
    │ ComfyUI:8189    │              │ ComfyUI:8190   │
    └─────────────────┘              └─────────────────┘
```

## Prerequisites

### System Requirements

- Docker 20.10.0 or higher
- Docker Compose 2.0.0 or higher
- Minimum 8GB RAM (16GB recommended)
- 50GB available disk space
- Linux/macOS/Windows with WSL2

### Network Requirements

- Ports 80, 3001, 3002, 8080, 8189, 8190, 9090 available
- Internet access for downloading dependencies

### Software Requirements

- bash shell
- curl (for health checks)
- git (for version control)

## Initial Setup

### 1. Navigate to Deployment Directory

```bash
cd deployment/blue-green
```

### 2. Run Initial Setup

```bash
./scripts/setup.sh
```

This script will:
- Check prerequisites
- Create Docker network
- Build required images
- Start load balancer
- Create monitoring configuration

### 3. Verify Setup

```bash
./scripts/health-check.sh all
```

Check that the load balancer is running:
```bash
curl http://localhost:8080/nginx-health
curl http://localhost:8080/lb-status
```

## Deployment Process

### Deploy to Blue Environment

```bash
./scripts/deploy.sh blue --build
```

### Test Blue Environment

Before switching traffic, test the blue environment:

```bash
# Direct access to blue environment
curl http://localhost:3001/api/health

# Check services
./scripts/health-check.sh blue

# Test functionality
open http://localhost:3001
```

### Switch Traffic to Blue

```bash
./scripts/switch-traffic.sh blue
```

### Deploy to Green Environment

While blue serves traffic, deploy new version to green:

```bash
./scripts/deploy.sh green --build
```

### Switch Traffic to Green

After testing green environment:

```bash
./scripts/switch-traffic.sh green
```

## Traffic Management

### Switching Traffic

The traffic switching process includes:

1. **Health Check**: Verify target environment is healthy
2. **Configuration Update**: Update nginx upstream configuration
3. **Graceful Switch**: nginx reloads configuration without dropping connections
4. **Verification**: Confirm traffic is flowing to new environment

### Manual Traffic Control

```bash
# Check current active environment
curl http://localhost:8080/lb-status

# Force switch without health checks (emergency only)
./scripts/switch-traffic.sh blue --force --no-health-check
```

### Gradual Traffic Migration

For high-risk deployments, you can implement gradual traffic migration by modifying the nginx configuration to split traffic:

```nginx
upstream active_backend {
    server dinoair-web-gui-blue:3000 weight=80;
    server dinoair-web-gui-green:3000 weight=20;
}
```

## Rollback Procedures

### Automatic Rollback

The system creates rollback points automatically:

```bash
# Rollback to previous environment
./scripts/rollback.sh

# Force rollback without confirmation
./scripts/rollback.sh --force
```

### Manual Rollback

```bash
# Rollback to specific environment
./scripts/rollback.sh --environment=blue
```

### Emergency Rollback

In case of critical issues:

```bash
# Immediate rollback (skips health checks)
./scripts/switch-traffic.sh blue --force --no-health-check
```

## Health Monitoring

### Health Check Endpoints

- **Load Balancer**: `http://localhost:8080/nginx-health`
- **Application Health**: `http://localhost/health`
- **Blue Environment**: `http://localhost:3001/api/health`
- **Green Environment**: `http://localhost:3002/api/health`
- **Load Balancer Status**: `http://localhost:8080/lb-status`

### Monitoring Commands

```bash
# Check all environments
./scripts/health-check.sh all

# Check specific environment
./scripts/health-check.sh blue
./scripts/health-check.sh green

# Continuous monitoring
watch -n 5 './scripts/health-check.sh all'
```

### Prometheus Monitoring

Access monitoring dashboard:
```bash
open http://localhost:9090
```

Key metrics to monitor:
- Service uptime
- Response times
- Error rates
- Resource usage
- Queue lengths

## Database Migration Strategies

### Backward-Compatible Migrations

Always ensure database changes are backward-compatible:

1. **Add new columns** (don't remove old ones initially)
2. **Create new tables** (keep old ones until fully migrated)
3. **Use feature flags** for new functionality

### Migration Process

```bash
# Deploy with migrations
./scripts/deploy.sh blue --migrate

# Example migration workflow:
# 1. Deploy code that works with both old and new schema
# 2. Run migrations to add new schema elements
# 3. Switch traffic
# 4. Deploy code that uses new schema
# 5. Remove old schema elements in next deployment
```

### Database Rollback

For database rollbacks:

1. **Automated**: Use migration tools with rollback scripts
2. **Manual**: Restore from backup taken before migration
3. **Point-in-time**: Use database point-in-time recovery

## Troubleshooting

### Common Issues

#### 1. Load Balancer Not Starting

```bash
# Check nginx configuration
docker-compose -f docker-compose.nginx.yml logs nginx-lb

# Validate configuration
docker-compose -f docker-compose.nginx.yml config
```

#### 2. Environment Not Healthy

```bash
# Check container status
docker-compose -f docker-compose.blue.yml ps

# View logs
docker-compose -f docker-compose.blue.yml logs

# Check resource usage
docker stats
```

#### 3. Traffic Not Switching

```bash
# Check load balancer status
curl http://localhost:8080/lb-status

# Manually reload nginx
docker-compose -f docker-compose.nginx.yml exec nginx-lb nginx -s reload

# Check upstream configuration
docker-compose -f docker-compose.nginx.yml exec nginx-lb cat /etc/nginx/conf.d/upstream.conf
```

#### 4. Port Conflicts

```bash
# Check port usage
netstat -tulpn | grep :80
netstat -tulpn | grep :3001

# Kill conflicting processes
sudo fuser -k 80/tcp
```

### Log Analysis

```bash
# Application logs
docker-compose -f docker-compose.blue.yml logs -f web-gui-blue

# Nginx access logs
docker-compose -f docker-compose.nginx.yml logs -f nginx-lb

# System-wide container logs
docker logs --follow dinoair-web-gui-blue
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Monitor network connections
netstat -an | grep :80
```

## Best Practices

### 1. Deployment Best Practices

- Always test in non-production environment first
- Use feature flags for gradual rollouts
- Keep deployments small and frequent
- Maintain identical environment configurations
- Use infrastructure as code

### 2. Health Check Best Practices

- Implement comprehensive health checks
- Include dependency checks (database, external APIs)
- Set appropriate timeout values
- Monitor both technical and business metrics
- Use circuit breakers for external dependencies

### 3. Database Best Practices

- Always make backward-compatible changes
- Use database migrations with rollback scripts
- Test migrations on production-sized datasets
- Backup before major changes
- Use read replicas for zero-downtime migrations

### 4. Monitoring Best Practices

- Monitor both environments continuously
- Set up alerts for critical metrics
- Track deployment success/failure rates
- Monitor business metrics (not just technical)
- Use distributed tracing for complex issues

### 5. Security Best Practices

- Keep environments identical in terms of security
- Rotate secrets regularly
- Use least privilege access
- Monitor for security vulnerabilities
- Implement proper network segmentation

### 6. Operational Best Practices

- Automate everything possible
- Document all procedures
- Practice disaster recovery scenarios
- Maintain runbooks for common issues
- Use chaos engineering to test resilience

## Environment Variables

### Blue Environment Variables

Key environment variables for blue environment (`.env.blue`):

```bash
NODE_ENV=production
IMAGE_TAG=blue-latest
API_KEY=dinoair-blue-api-key-secure-token
NEXT_PUBLIC_ENVIRONMENT=blue
```

### Green Environment Variables

Key environment variables for green environment (`.env.green`):

```bash
NODE_ENV=production
IMAGE_TAG=green-latest
API_KEY=dinoair-green-api-key-secure-token
NEXT_PUBLIC_ENVIRONMENT=green
```

## Maintenance

### Regular Maintenance Tasks

```bash
# Clean up old images
docker image prune -f

# Clean up unused volumes
docker volume prune -f

# Update base images
docker pull python:3.11-slim
docker pull node:20-alpine
docker pull nginx:alpine

# Rebuild with latest base images
./scripts/deploy.sh blue --build
```

### Backup Procedures

```bash
# Backup volumes
docker run --rm -v blue_uploads:/data -v $(pwd):/backup alpine tar czf /backup/blue_uploads_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Backup configuration
tar czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz .env.* *.yml monitoring/
```

## Emergency Procedures

### Complete System Failure

1. **Check load balancer**: `curl http://localhost:8080/nginx-health`
2. **Check both environments**: `./scripts/health-check.sh all`
3. **Restart load balancer**: `docker-compose -f docker-compose.nginx.yml restart`
4. **Restart failed environment**: `./scripts/deploy.sh blue --force`
5. **Switch to healthy environment**: `./scripts/switch-traffic.sh green --force`

### Data Corruption

1. **Stop affected environment**: `docker-compose -f docker-compose.blue.yml down`
2. **Restore from backup**: Restore volume data
3. **Restart environment**: `./scripts/deploy.sh blue`
4. **Verify data integrity**: Run data validation checks
5. **Switch traffic when ready**: `./scripts/switch-traffic.sh blue`

For additional support, refer to the main DinoAir documentation or create an issue in the repository.