# Blue-Green Deployment for DinoAir

This directory contains the blue-green deployment configuration and scripts for DinoAir, enabling zero-downtime deployments and easy rollbacks.

## Overview

Blue-green deployment is a technique that reduces downtime and risk by running two identical production environments called Blue and Green. Only one environment serves production traffic at any time.

## Directory Structure

```
deployment/blue-green/
├── README.md                    # This file
├── nginx/                      # Nginx load balancer configuration
│   ├── nginx.conf              # Main nginx configuration
│   ├── upstream.conf           # Upstream server definitions
│   └── Dockerfile              # Nginx container setup
├── scripts/                    # Deployment automation scripts
│   ├── deploy.sh               # Main deployment script
│   ├── switch-traffic.sh       # Traffic switching script
│   ├── rollback.sh             # Rollback script
│   ├── health-check.sh         # Health check utilities
│   └── cleanup.sh              # Environment cleanup
├── docker-compose.blue.yml     # Blue environment configuration
├── docker-compose.green.yml    # Green environment configuration
├── docker-compose.nginx.yml    # Load balancer configuration
├── .env.blue                   # Blue environment variables
├── .env.green                  # Green environment variables
└── monitoring/                 # Monitoring and alerting
    ├── prometheus.yml          # Metrics collection
    └── alerts.yml              # Alert rules
```

## Quick Start

1. **Initial Setup**:
   ```bash
   cd deployment/blue-green
   ./scripts/setup.sh
   ```

2. **Deploy to Blue Environment**:
   ```bash
   ./scripts/deploy.sh blue
   ```

3. **Switch Traffic to Blue**:
   ```bash
   ./scripts/switch-traffic.sh blue
   ```

4. **Rollback if Needed**:
   ```bash
   ./scripts/rollback.sh
   ```

## Environment Status

Use the health check script to monitor environment status:
```bash
./scripts/health-check.sh
```

## Best Practices

1. Always test deployments in the inactive environment first
2. Run health checks before switching traffic
3. Keep database migrations backward-compatible
4. Monitor applications after traffic switches
5. Have rollback procedures ready

For detailed documentation, see the main documentation in the docs/ directory.