# DinoAir Health Check API Documentation

## Overview

DinoAir implements a comprehensive health monitoring system across all services with deep health checks, performance metrics, and configurable monitoring intervals. This system provides real-time service status, dependency monitoring, and automatic recovery capabilities.

## Architecture

The health check system consists of:

1. **Next.js Web GUI Health Endpoints** - Frontend service monitoring
2. **Node.js Express Health API** - Backend service monitoring  
3. **Python Health Monitor** - System-level monitoring with circuit breakers
4. **ComfyUI Specific Health Checks** - AI service deep monitoring
5. **Configurable Health Settings** - Environment-based configuration

## API Endpoints

### 1. Next.js Web GUI Endpoints

#### GET `/api/health`
**Enhanced main health check with deep service verification**

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "responseTime": {
    "total": "150ms",
    "breakdown": {
      "web-gui": "0ms",
      "ollama": "75ms", 
      "comfyui": "75ms"
    }
  },
  "version": "2.0.0",
  "environment": "development|production",
  "system": {
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "arch": "x64",
    "pid": 1234,
    "uptime": 86400,
    "memory": {
      "used": 128,
      "total": 256,
      "external": 32,
      "rss": 180
    },
    "cpuUsage": {
      "user": 100000,
      "system": 50000
    }
  },
  "checks": {
    "webGui": {
      "status": "healthy",
      "responseTime": 0,
      "version": "1.0.0",
      "details": {
        "framework": "Next.js",
        "deployment": "Local"
      }
    },
    "ollama": {
      "status": "healthy",
      "responseTime": 75,
      "version": "0.1.17",
      "details": {
        "models": ["llama2", "codellama"],
        "modelCount": 2,
        "endpoint": "http://localhost:11434"
      }
    },
    "comfyui": {
      "status": "healthy", 
      "responseTime": 75,
      "details": {
        "endpoint": "http://localhost:8188",
        "systemStats": {},
        "hasSystemStats": true
      }
    }
  },
  "dependencies": {
    "ollama": {
      "required": true,
      "status": "healthy",
      "criticalForOperation": true
    },
    "comfyui": {
      "required": true, 
      "status": "healthy",
      "criticalForOperation": true
    }
  },
  "performance": {
    "totalResponseTime": "150ms",
    "individualChecks": {
      "ollama": "75ms",
      "comfyui": "75ms"
    }
  }
}
```

#### GET `/api/health/aggregated`
**Comprehensive health aggregation with deep service analysis**

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "2.0.0",
  "environment": "development",
  "responseTime": {
    "total": "200ms",
    "average": "67ms",
    "breakdown": {
      "web-gui": "0ms",
      "ollama": "100ms",
      "comfyui": "100ms"
    }
  },
  "services": {
    "web-gui": {
      "name": "web-gui",
      "status": "healthy",
      "responseTime": 0,
      "version": "1.0.0",
      "uptime": 86400,
      "lastCheck": "2024-01-20T10:30:00.000Z",
      "dependencies": ["next.js", "react"],
      "metrics": {
        "cpuUsage": 0,
        "memoryUsage": 128,
        "requestCount": 1500
      },
      "endpoints": ["/api/health", "/api/health/aggregated"]
    },
    "ollama": {
      "name": "ollama", 
      "status": "healthy",
      "responseTime": 100,
      "version": "0.1.17",
      "lastCheck": "2024-01-20T10:30:00.000Z",
      "dependencies": ["go"],
      "metrics": {
        "modelCount": 2,
        "availableModels": ["llama2", "codellama"],
        "embedEndpointResponsive": true
      },
      "endpoints": [
        "http://localhost:11434/api/tags",
        "http://localhost:11434/api/version",
        "http://localhost:11434/api/embed"
      ]
    },
    "comfyui": {
      "name": "comfyui",
      "status": "healthy", 
      "responseTime": 100,
      "lastCheck": "2024-01-20T10:30:00.000Z",
      "dependencies": ["python", "torch"],
      "metrics": {
        "historyEndpointResponsive": true
      },
      "endpoints": [
        "http://localhost:8188/",
        "http://localhost:8188/system_stats",
        "http://localhost:8188/history"
      ]
    }
  },
  "summary": {
    "total": 3,
    "healthy": 3,
    "unhealthy": 0,
    "degraded": 0,
    "uptime": "86400s",
    "lastUpdate": "2024-01-20T10:30:00.000Z"
  },
  "system": {
    "cpu": {
      "usage": {"user": 100000, "system": 50000},
      "loadAverage": [0.1, 0.2, 0.3]
    },
    "memory": {
      "used": 128,
      "total": 256,
      "external": 32,
      "rss": 180,
      "percentage": 50
    },
    "platform": "linux",
    "architecture": "x64",
    "nodeVersion": "v18.17.0",
    "pid": 1234
  },
  "configuration": {
    "healthCheckTimeout": "10000ms",
    "endpoints": {
      "ollama": "http://localhost:11434",
      "comfyui": "http://localhost:8188"
    },
    "features": {
      "deepHealthChecks": true,
      "performanceMetrics": true,
      "dependencyTracking": true,
      "systemMonitoring": true
    }
  },
  "dependencies": {
    "critical": [
      {"name": "ollama", "status": "healthy", "required": true},
      {"name": "comfyui", "status": "healthy", "required": true}
    ],
    "optional": []
  }
}
```

### 2. Node.js Express Endpoints

#### GET `/api/health`
**Enhanced backend health monitoring**

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-20T10:30:00.000Z", 
  "version": "2.0.0",
  "uptime": 86400,
  "responseTime": {
    "total": "180ms",
    "breakdown": {
      "web-gui-node": "0ms",
      "ollama": "90ms",
      "comfyui": "90ms"
    }
  },
  "services": {
    "web-gui-node": {
      "name": "web-gui-node",
      "status": "healthy",
      "responseTime": 0,
      "version": "1.0.0",
      "uptime": 86400,
      "lastCheck": "2024-01-20T10:30:00.000Z",
      "endpoints": ["/api/health", "/api/health/detailed", "/api/health/ping"],
      "metrics": {
        "memoryUsage": 128,
        "cpuUsage": {"user": 100000, "system": 50000},
        "requestCount": 1500
      },
      "dependencies": ["express", "node.js"]
    },
    "ollama": {
      "name": "ollama",
      "status": "healthy",
      "responseTime": 90,
      "version": "0.1.17",
      "lastCheck": "2024-01-20T10:30:00.000Z",
      "endpoints": [
        "http://localhost:11434/api/tags",
        "http://localhost:11434/api/version"
      ],
      "metrics": {
        "modelCount": 2,
        "availableModels": ["llama2", "codellama"],
        "embedEndpointAvailable": true
      },
      "dependencies": ["go", "cpu/gpu"]
    },
    "comfyui": {
      "name": "comfyui",
      "status": "healthy",
      "responseTime": 90,
      "lastCheck": "2024-01-20T10:30:00.000Z", 
      "endpoints": [
        "http://localhost:8188/",
        "http://localhost:8188/system_stats",
        "http://localhost:8188/history",
        "http://localhost:8188/queue"
      ],
      "metrics": {
        "systemStats": {},
        "historyAvailable": true,
        "queueInfo": {}
      },
      "dependencies": ["python", "torch", "cuda"]
    }
  },
  "summary": {
    "total": 3,
    "healthy": 3,
    "unhealthy": 0,
    "criticalServicesHealthy": true
  },
  "system": {
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "arch": "x64",
    "pid": 1234,
    "memory": {
      "used": 128,
      "total": 256,
      "external": 32,
      "rss": 180
    },
    "cpu": {
      "usage": {"user": 100000, "system": 50000},
      "loadAverage": [0.1, 0.2, 0.3]
    }
  },
  "configuration": {
    "healthCheckTimeout": "10000ms",
    "healthCheckInterval": "30000ms",
    "endpoints": {
      "ollama": "http://localhost:11434",
      "comfyui": "http://localhost:8188"
    }
  }
}
```

#### GET `/api/health/detailed`
**Comprehensive health with deep diagnostics**

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "2.0.0",
  "environment": "development",
  "uptime": 86400,
  "responseTime": {
    "total": "200ms",
    "breakdown": {
      "web-gui-node": "0ms",
      "ollama": "100ms", 
      "comfyui": "100ms"
    }
  },
  "services": {
    // Same as /api/health but with more detailed metrics
  },
  "summary": {
    "total": 3,
    "healthy": 3,
    "unhealthy": 0,
    "degraded": 0,
    "criticalServicesHealthy": true,
    "lastUpdate": "2024-01-20T10:30:00.000Z"
  },
  "system": {
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "arch": "x64",
    "hostname": "dinoair-server",
    "pid": 1234,
    "ppid": 123,
    "uptime": 86400,
    "memory": {
      "used": 128,
      "total": 256,
      "external": 32,
      "rss": 180,
      "arrayBuffers": 16
    },
    "cpu": {
      "usage": {"user": 100000, "system": 50000},
      "loadAverage": [0.1, 0.2, 0.3],
      "cpuCount": 8,
      "cpuInfo": "Intel Core i7"
    },
    "disk": {
      "tmpdir": "/tmp",
      "homedir": "/home/user"
    },
    "network": {
      "hostname": "dinoair-server",
      "networkInterfaces": ["eth0", "lo"]
    }
  },
  "performance": {
    "eventLoopDelay": "Available in production",
    "activeHandles": 25,
    "activeRequests": 3,
    "memoryUsageHistory": [],
    "cpuUsageHistory": [],
    "requestCount": 1500,
    "errorCount": 2,
    "averageResponseTime": 150
  },
  "dependencies": {
    "critical": {
      "ollama": {
        "required": true,
        "status": "healthy",
        "impact": "None"
      },
      "comfyui": {
        "required": true,
        "status": "healthy", 
        "impact": "None"
      }
    },
    "optional": {
      "websocket": {
        "required": false,
        "status": "healthy",
        "impact": "Low - Real-time features may be limited"
      }
    }
  },
  "configuration": {
    "healthCheckTimeout": "10000ms",
    "healthCheckInterval": "30000ms",
    "cacheEnabled": true,
    "cacheTTL": "5000ms",
    "endpoints": {
      "ollama": "http://localhost:11434",
      "comfyui": "http://localhost:8188"
    },
    "features": {
      "deepHealthChecks": true,
      "performanceMonitoring": true,
      "dependencyTracking": true,
      "caching": true,
      "realTimeMetrics": true
    }
  },
  "diagnostics": {
    "healthCacheSize": 3,
    "lastHealthCheck": "2024-01-20T10:30:00.000Z",
    "systemResourcesOK": true,
    "criticalPathsOperational": true
  }
}
```

#### GET `/api/health/ping`
**Simple ping endpoint**

```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "message": "pong",
  "uptime": "86400s",
  "version": "2.0.0",
  "responseTime": "< 1ms",
  "server": "DinoAir Web GUI Node.js"
}
```

#### GET `/api/health/status`
**Lightweight status check**

```json
{
  "status": "healthy|degraded",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "services": {
    "ollama": "healthy",
    "comfyui": "healthy",
    "webGui": "healthy"
  },
  "summary": "All systems operational"
}
```

#### GET `/api/health/metrics`
**Performance and system metrics**

```json
{
  "timestamp": "2024-01-20T10:30:00.000Z",
  "system": {
    "uptime": 86400,
    "memory": {
      "heapUsed": 128,
      "heapTotal": 256,
      "external": 32,
      "rss": 180,
      "arrayBuffers": 16
    },
    "cpu": {
      "user": 100000,
      "system": 50000
    },
    "loadAverage": [0.1, 0.2, 0.3]
  },
  "application": {
    "version": "1.0.0",
    "nodeVersion": "v18.17.0",
    "platform": "linux",
    "requestCount": 1500,
    "errorCount": 2,
    "averageResponseTime": 150,
    "activeHandles": 25,
    "activeRequests": 3
  },
  "cache": {
    "healthCacheSize": 3,
    "cacheTTL": 5000
  }
}
```

### 3. ComfyUI Health Endpoints

#### GET `/health` (ComfyUI-specific)
**Comprehensive ComfyUI health check**

```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "version": "2.0.0",
  "service": "ComfyUI",
  "response_time_ms": 120.5,
  "summary": {
    "overall_status": "healthy",
    "system_healthy": true,
    "gpu_healthy": true,
    "comfyui_healthy": true,
    "functionality_healthy": true,
    "health_score": "4/4"
  },
  "system": {
    "timestamp": "2024-01-20T10:30:00.000Z",
    "system": {
      "cpu": {
        "usage_percent": 25.5,
        "count": 8,
        "count_logical": 16,
        "frequency": {"current": 2800, "min": 800, "max": 3600}
      },
      "memory": {
        "total": 17179869184,
        "available": 12884901888,
        "used": 4294967296,
        "percentage": 25.0,
        "free": 12884901888
      },
      "disk": {
        "total": 1000000000000,
        "used": 500000000000,
        "free": 500000000000,
        "percentage": 50.0
      },
      "platform": "linux",
      "python_version": "3.10.6"
    }
  },
  "gpu": {
    "torch_available": true,
    "cuda_available": true,
    "cuda_version": "11.8",
    "gpu_count": 1,
    "gpu_devices": [
      {
        "device_id": 0,
        "name": "NVIDIA GeForce RTX 3080",
        "total_memory": 10737418240,
        "memory_used": 2147483648,
        "memory_total": 2147483648,
        "memory_free": 8589934592,
        "compute_capability": "8.6",
        "multiprocessor_count": 68
      }
    ]
  },
  "comfyui": {
    "available": true,
    "models": {
      "checkpoints": {"count": 5, "files": ["model1.ckpt", "model2.safetensors"]},
      "loras": {"count": 10, "files": ["lora1.safetensors", "lora2.pt"]},
      "vae": {"count": 2, "files": ["vae1.pt", "vae2.safetensors"]},
      "embeddings": {"count": 15, "files": ["embed1.pt", "embed2.safetensors"]},
      "controlnet": {"count": 8, "files": ["control1.pth", "control2.safetensors"]}
    },
    "paths": {
      "checkpoints": {"path": "/models/checkpoints", "exists": true},
      "loras": {"path": "/models/loras", "exists": true},
      "vae": {"path": "/models/vae", "exists": true}
    },
    "capabilities": {
      "torch_available": true,
      "cuda_available": true,
      "folder_paths_available": true
    }
  },
  "performance": {
    "uptime_seconds": 86400,
    "uptime_formatted": "24h 0m 0s",
    "process": {
      "pid": 5678,
      "ppid": 1234,
      "status": "running",
      "create_time": 1642636800,
      "cpu_percent": 15.5,
      "memory_info": {
        "rss": 2147483648,
        "vms": 4294967296,
        "shared": 268435456,
        "text": 67108864,
        "lib": 0,
        "data": 1073741824,
        "dirty": 0
      },
      "memory_percent": 12.5,
      "num_threads": 24,
      "open_files": 156,
      "connections": 8
    },
    "timestamp": "2024-01-20T10:30:00.000Z"
  },
  "functionality_tests": {
    "overall_status": "healthy",
    "tests": {
      "torch_import": {"status": "pass", "message": "PyTorch available"},
      "comfyui_import": {"status": "pass", "message": "ComfyUI modules available"},
      "torch_operations": {"status": "pass", "message": "Basic tensor operations working"},
      "cuda_test": {"status": "pass", "message": "CUDA operations working"},
      "memory_test": {"status": "pass", "message": "Memory allocation test passed"}
    },
    "failed_tests": [],
    "test_count": 5,
    "passed_count": 5,
    "failed_count": 0
  },
  "dependencies": {
    "python": {
      "version": "3.10.6 (main, Nov 14 2022, 16:10:14) [GCC 11.3.0]",
      "executable": "/usr/bin/python3",
      "platform": "linux"
    },
    "torch": {
      "available": true,
      "version": "1.13.1+cu117",
      "cuda_version": "11.7"
    },
    "comfyui": {
      "available": true,
      "folder_paths": "available"
    }
  },
  "configuration": {
    "health_check_version": "2.0.0",
    "deep_checks_enabled": true,
    "gpu_monitoring": true,
    "functionality_testing": true
  }
}
```

## Configuration

### Environment Variables

```bash
# Global Settings
HEALTH_CHECK_INTERVAL=30              # Health check interval in seconds
HEALTH_CHECK_TIMEOUT=10               # Health check timeout in seconds
HEALTH_DEEP_CHECKS_ENABLED=true      # Enable deep functionality checks
HEALTH_FUNCTIONALITY_TESTS_ENABLED=true  # Enable functionality tests
HEALTH_AUTO_RESTART_ENABLED=true     # Enable automatic service restart

# Service URLs
OLLAMA_URL=http://localhost:11434
COMFYUI_URL=http://localhost:8188
WEB_GUI_URL=http://localhost:3000

# Service-Specific Settings
OLLAMA_HEALTH_INTERVAL=30
OLLAMA_HEALTH_TIMEOUT=10
OLLAMA_HEALTH_ENABLED=true

COMFYUI_HEALTH_INTERVAL=30
COMFYUI_HEALTH_TIMEOUT=10
COMFYUI_HEALTH_ENABLED=true

WEB_GUI_HEALTH_INTERVAL=20
WEB_GUI_HEALTH_TIMEOUT=5
WEB_GUI_HEALTH_ENABLED=true

# Performance Thresholds
HEALTH_CPU_THRESHOLD=80
HEALTH_MEMORY_THRESHOLD=85
HEALTH_DISK_THRESHOLD=90
HEALTH_RESPONSE_TIME_THRESHOLD=5000
```

### Docker Health Checks

```yaml
# docker-compose.yml
services:
  web-gui:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health/status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
  
  comfyui:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8188/system_stats"]
      interval: 30s
      timeout: 15s
      retries: 3
      start_period: 60s
  
  ollama:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

### Kubernetes Probes

```yaml
# deployment.yaml
readinessProbe:
  httpGet:
    path: /api/health/status
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 10
  failureThreshold: 3

livenessProbe:
  httpGet:
    path: /api/health/ping
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 60
  timeoutSeconds: 10
  failureThreshold: 3
```

## Status Codes

- **200**: Service is healthy
- **503**: Service is unhealthy or degraded
- **500**: Health check system error

## Response Headers

- `X-Health-Check-Version`: Version of health check system
- `X-Health-Status`: Overall health status
- `X-Response-Time`: Total response time for health check
- `X-Service-Count`: Number of services monitored
- `X-Healthy-Count`: Number of healthy services
- `Cache-Control`: Always set to no-cache for health endpoints

## Monitoring Integration

### Prometheus Metrics

The health endpoints can be scraped by Prometheus for monitoring:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'dinoair-health'
    metrics_path: '/api/health/metrics'
    static_configs:
      - targets: ['localhost:3000']
```

### Nagios/Icinga Checks

```bash
# Simple HTTP check
check_http -H localhost -p 3000 -u /api/health/status -e 200

# Advanced check with response time
check_http -H localhost -p 3000 -u /api/health -w 5 -c 10 -s "healthy"
```

### Uptime Monitoring

All health endpoints support both GET and HEAD methods for lightweight monitoring.

## Error Handling

Health endpoints gracefully handle errors and provide detailed error information:

```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "error": "Service connection failed",
  "message": "Unable to connect to Ollama service",
  "details": {
    "service": "ollama",
    "endpoint": "http://localhost:11434/api/tags",
    "timeout": "10000ms",
    "retries": 3
  }
}
```

## Security Considerations

- Health endpoints are public by default for monitoring purposes
- Sensitive system information is filtered in production environments
- Rate limiting can be applied to prevent abuse
- CORS headers are configured for cross-origin requests

## Performance Impact

- Health checks are cached to reduce overhead
- Deep checks are performed on configurable intervals
- Lightweight endpoints available for frequent monitoring
- Circuit breakers prevent cascading failures

## Changelog

### Version 2.0.0
- Added comprehensive health aggregation endpoint
- Implemented deep service functionality checks
- Added performance metrics and system monitoring
- Introduced configurable intervals and timeouts
- Enhanced dependency tracking
- Added ComfyUI-specific health monitoring
- Implemented caching for improved performance
- Added support for HEAD requests
- Enhanced error handling and diagnostics