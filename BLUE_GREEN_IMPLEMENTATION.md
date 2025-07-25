# DinoAir Blue-Green Deployment Implementation

This implementation provides a complete blue-green deployment solution for DinoAir, enabling zero-downtime deployments with automatic rollback capabilities.

## 🎯 Features Implemented

### ✅ Infrastructure & Deployment
- [x] Separate Docker Compose configurations for blue and green environments
- [x] Nginx load balancer with automatic traffic routing
- [x] Environment isolation with dedicated networks and volumes
- [x] Container health checks and readiness probes

### ✅ Automated Traffic Switching
- [x] Smart traffic routing between environments
- [x] Load balancer configuration management
- [x] Environment status tracking and validation
- [x] Graceful traffic switching without downtime

### ✅ Deployment Validation & Health Checks
- [x] Enhanced health check endpoints (`/api/health`, `/api/ready`)
- [x] Comprehensive service dependency checks
- [x] Memory usage and performance monitoring
- [x] Deployment readiness validation

### ✅ Rollback Mechanisms
- [x] Automatic rollback point creation
- [x] Quick rollback scripts with safety checks
- [x] Environment health validation before rollback
- [x] Emergency rollback procedures

### ✅ Database Migration Strategies
- [x] Backward-compatible migration framework
- [x] Migration validation and rollback procedures
- [x] Database state management between environments
- [x] Safe migration deployment patterns

### ✅ Monitoring & Alerting
- [x] Prometheus metrics collection configuration
- [x] Comprehensive alerting rules for deployment issues
- [x] Health monitoring dashboards
- [x] Environment status tracking

### ✅ Documentation & Best Practices
- [x] Complete setup and deployment guide
- [x] Troubleshooting documentation
- [x] Operational procedures and runbooks
- [x] Best practices for blue-green deployments

## 📁 Implementation Structure

```
deployment/blue-green/
├── README.md                    # Main documentation
├── nginx/                      # Load balancer configuration
│   ├── nginx.conf              # Main nginx configuration
│   ├── upstream.conf.template  # Upstream server templates
│   ├── Dockerfile              # Nginx container setup
│   └── docker-entrypoint.sh    # Configuration management
├── scripts/                    # Deployment automation
│   ├── setup.sh               # Initial infrastructure setup
│   ├── deploy.sh              # Environment deployment
│   ├── switch-traffic.sh      # Traffic switching
│   ├── rollback.sh           # Rollback procedures
│   ├── health-check.sh       # Health monitoring
│   └── cleanup.sh            # Environment cleanup
├── docker-compose.blue.yml   # Blue environment
├── docker-compose.green.yml  # Green environment
├── docker-compose.nginx.yml  # Load balancer
├── .env.blue                 # Blue environment variables
├── .env.green               # Green environment variables
└── monitoring/              # Monitoring configuration
    ├── prometheus.yml       # Metrics collection
    └── alerts.yml          # Alert rules

web-gui/app/api/
├── health/route.ts         # Enhanced health endpoint
└── ready/route.ts         # Readiness endpoint

.github/workflows/
└── blue-green-deployment.yml  # CI/CD integration

docs/
└── blue-green-deployment.md   # Comprehensive guide
```

## 🚀 Quick Start

### 1. Initial Setup
```bash
cd deployment/blue-green
./scripts/setup.sh
```

### 2. Deploy Blue Environment
```bash
./scripts/deploy.sh blue --build
```

### 3. Switch Traffic to Blue
```bash
./scripts/switch-traffic.sh blue
```

### 4. Deploy Green Environment
```bash
./scripts/deploy.sh green --build
```

### 5. Switch Traffic to Green
```bash
./scripts/switch-traffic.sh green
```

## 📊 Health Monitoring

### Health Check Endpoints
- **Main Health**: `http://localhost/health`
- **Readiness**: `http://localhost/ready`
- **Load Balancer**: `http://localhost:8080/nginx-health`
- **Load Balancer Status**: `http://localhost:8080/lb-status`
- **Blue Environment**: `http://localhost:3001/api/health`
- **Green Environment**: `http://localhost:3002/api/health`

### Monitoring Dashboard
- **Prometheus**: `http://localhost:9090`

### Status Commands
```bash
# Check all environments
./scripts/health-check.sh all

# Check specific environment
./scripts/health-check.sh blue
./scripts/health-check.sh green

# Continuous monitoring
watch -n 5 './scripts/health-check.sh all'
```

## 🔄 Deployment Workflow

### Automated Deployment
1. **Build & Test**: Code is built and tested
2. **Environment Detection**: Determine target environment
3. **Deploy**: Deploy to inactive environment
4. **Validate**: Run health checks and validation tests
5. **Switch Traffic**: Route traffic to new environment
6. **Monitor**: Watch for issues after switch
7. **Cleanup**: Prepare old environment for next deployment

### Manual Deployment
```bash
# Deploy to specific environment
./scripts/deploy.sh blue --build --migrate

# Test environment before switching
curl http://localhost:3001/api/health

# Switch traffic when ready
./scripts/switch-traffic.sh blue

# Rollback if needed
./scripts/rollback.sh
```

## 🛡️ Safety Features

### Pre-deployment Checks
- Environment health validation
- Resource availability checks
- Configuration validation
- Network connectivity tests

### Traffic Switching Safety
- Health checks before switching
- Gradual traffic migration capability
- Automatic rollback triggers
- Post-switch validation

### Rollback Protection
- Automatic rollback point creation
- Health validation before rollback
- Configuration backup and restore
- Emergency rollback procedures

## 🔧 Configuration

### Environment Variables
Key configuration options in `.env.blue` and `.env.green`:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=blue

# API Configuration
API_KEY=secure-api-key
COMFYUI_API_URL=http://dinoair-comfyui-blue:8188

# Load Balancer
ACTIVE_ENVIRONMENT=blue
```

### Custom Configuration
- Modify `nginx/nginx.conf` for custom routing rules
- Update `monitoring/prometheus.yml` for additional metrics
- Adjust `monitoring/alerts.yml` for custom alerting rules

## 📈 CI/CD Integration

The implementation includes a GitHub Actions workflow (`.github/workflows/blue-green-deployment.yml`) that:

1. **Builds and tests** the application
2. **Determines deployment strategy** (blue/green)
3. **Deploys to target environment**
4. **Validates deployment**
5. **Switches traffic** (if configured)
6. **Monitors deployment success**
7. **Triggers rollback** on failure

### Manual Deployment Trigger
```bash
# Trigger deployment via GitHub Actions
gh workflow run blue-green-deployment.yml \
  -f environment=blue \
  -f auto_switch=true
```

## 🚨 Emergency Procedures

### Complete System Recovery
```bash
# 1. Check system status
./scripts/health-check.sh all

# 2. Restart load balancer
docker-compose -f docker-compose.nginx.yml restart

# 3. Emergency traffic switch
./scripts/switch-traffic.sh blue --force --no-health-check

# 4. Full system cleanup and restart
./scripts/cleanup.sh --all
./scripts/setup.sh
```

### Data Recovery
```bash
# Backup current state
docker run --rm -v blue_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/emergency_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /data .

# Restore from backup
docker run --rm -v blue_uploads:/data -v $(pwd):/backup alpine \
  tar xzf /backup/backup_file.tar.gz -C /data
```

## 📚 Additional Resources

- **Main Documentation**: `docs/blue-green-deployment.md`
- **Setup Guide**: `deployment/blue-green/README.md`
- **Troubleshooting**: See main documentation
- **Best Practices**: Included in comprehensive guide

## 🤝 Contributing

When contributing to the blue-green deployment system:

1. Test changes in both environments
2. Update documentation for new features
3. Add appropriate health checks
4. Ensure backward compatibility
5. Test rollback procedures

## 📝 Notes

- This implementation is production-ready but should be customized for specific infrastructure
- Database migrations should follow backward-compatible patterns
- Monitor resource usage in both environments
- Keep deployment artifacts for quick rollbacks
- Regular backup procedures are essential

For detailed operational procedures, refer to `docs/blue-green-deployment.md`.