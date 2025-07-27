# DinoAir Load Testing Infrastructure

This directory contains comprehensive load testing infrastructure for the DinoAir application using Artillery.js.

## Overview

The load testing suite covers all critical API endpoints and provides both quick verification tests and comprehensive load testing scenarios.

## Quick Start

### Prerequisites

1. Ensure DinoAir server is running:
   ```bash
   npm start
   ```

2. Verify server is accessible:
   ```bash
   curl http://localhost:3000/api/health/ping
   ```

### Running Tests

#### Quick Test (30 seconds)
```bash
npm run load-test:quick
# or
./load-tests/quick-test.sh
```

#### Full Test Suite
```bash
npm run load-test
# or
./load-tests/run-all-tests.sh
```

#### Individual Test Scenarios
```bash
# Health API tests
npm run load-test:health

# Chat API tests  
npm run load-test:chat

# Artifacts API tests
npm run load-test:artifacts
```

## Test Scenarios

### 1. Health API Tests (`health-api.yml`)
- **Duration**: 2 minutes
- **Load**: 10 requests/second
- **Endpoints Tested**:
  - `/api/health` - Main health check
  - `/api/health/detailed` - Comprehensive health information
  - `/api/health/ping` - Simple ping endpoint
  - `/api/health/status` - Lightweight status check
  - `/api/health/metrics` - Performance metrics

### 2. Chat API Tests (`chat-api.yml`)
- **Duration**: 1 minute
- **Load**: 5 requests/second
- **Scenarios**:
  - **Chat Conversation Flow (70%)**: Send messages, create sessions
  - **Chat Models Check (15%)**: Verify available models
  - **Chat Metrics Check (10%)**: Performance metrics
  - **Session Management (5%)**: CRUD operations on sessions

### 3. Artifacts API Tests (`artifacts-api.yml`)
- **Duration**: 90 seconds
- **Load**: 8 requests/second
- **Scenarios**:
  - **CRUD Operations (50%)**: Create, read, update artifacts
  - **Search and Filter (30%)**: Query artifacts by type and tags
  - **Export Operations (15%)**: Single artifact exports
  - **Version Management (5%)**: Artifact versioning

## Configuration

### Load Test Phases

Each test follows a standard load pattern:

1. **Warm up**: Low traffic to initialize connections
2. **Ramp up**: Gradually increase load
3. **Sustained load**: Peak traffic simulation
4. **Cool down**: Gradual decrease

### Environment Configuration

Tests can be configured for different environments in `config/artillery.yml`:

- **Development**: `http://localhost:3000` (2 req/s)
- **Staging**: `http://staging.dinoair.example.com` (10 req/s)
- **Production**: `http://production.dinoair.example.com` (50 req/s)

## Test Data Generation

### Processors

Custom JavaScript processors generate realistic test data:

- **`chat-processor.js`**: Random questions and system prompts
- **`artifacts-processor.js`**: Code snippets and artifact metadata
- **`test-processor.js`**: General utility functions

### Dynamic Data

Tests use dynamic data generation:
- Random UUIDs for session IDs
- Faker.js for realistic content
- Timestamp-based unique identifiers
- Randomized test scenarios

## Reports and Analysis

### Report Generation

All tests automatically generate:
- **JSON reports**: Raw performance data
- **HTML reports**: Visual dashboards
- **Summary reports**: High-level overview

### Report Location

Reports are saved to `load-tests/reports/` with timestamps:
```
load-tests/reports/
├── load_test_20240126_143022_health.json
├── load_test_20240126_143022_health.html
├── load_test_20240126_143022_chat.json
├── load_test_20240126_143022_chat.html
└── load_test_20240126_143022_summary.txt
```

### Key Metrics

Monitor these critical metrics:

- **Response Time**: P95, P99 percentiles
- **Throughput**: Requests per second
- **Error Rate**: Failed requests percentage
- **Concurrent Users**: Virtual user simulation
- **Resource Usage**: Memory and CPU during tests

## Advanced Usage

### Custom Test Scenarios

Create custom test files in `scenarios/`:

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "Custom Test"
    flow:
      - get:
          url: "/api/custom-endpoint"
          expect:
            - statusCode: 200
```

### Running Custom Tests

```bash
npx artillery run load-tests/scenarios/custom-test.yml
```

### Performance Thresholds

Set performance expectations in test files:

```yaml
config:
  ensure:
    p95: 100  # 95th percentile under 100ms
    p99: 200  # 99th percentile under 200ms
    maxErrorRate: 1  # Less than 1% errors
```

## Troubleshooting

### Common Issues

1. **Server Not Running**
   ```
   ❌ DinoAir server is not running on localhost:3000
   ```
   **Solution**: Start server with `npm start`

2. **High Error Rates**
   - Check server logs for errors
   - Verify database connectivity
   - Ensure external services (Ollama, ComfyUI) are running

3. **Slow Response Times**
   - Monitor system resources
   - Check for memory leaks
   - Verify network connectivity

### Debug Mode

Run tests with verbose output:
```bash
DEBUG=artillery:* npx artillery run load-tests/scenarios/health-api.yml
```

### Resource Monitoring

Monitor system resources during tests:
```bash
# CPU and memory usage
top

# Network connections
netstat -an | grep :3000

# Application logs
tail -f logs/app.log
```

## Integration with CI/CD

### GitHub Actions

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm start &
      - run: sleep 10  # Wait for server startup
      - run: npm run load-test:quick
```

### Performance Regression Detection

Set up automated performance regression detection:

1. Store baseline metrics
2. Compare current results with baseline
3. Alert on significant degradation
4. Generate trend reports

## Best Practices

### Test Design

1. **Realistic Load Patterns**: Mirror production traffic
2. **Gradual Ramp-up**: Avoid sudden load spikes
3. **Mixed Scenarios**: Test different user behaviors
4. **Error Handling**: Verify graceful degradation

### Monitoring

1. **System Resources**: CPU, memory, disk I/O
2. **Application Metrics**: Response times, error rates
3. **External Dependencies**: Database, APIs
4. **Network Performance**: Latency, bandwidth

### Maintenance

1. **Regular Updates**: Keep test scenarios current
2. **Baseline Refresh**: Update performance expectations
3. **Environment Parity**: Ensure test/prod similarity
4. **Documentation**: Keep procedures up-to-date

## Support

For issues or questions:
1. Check server logs in `logs/`
2. Review test reports in `load-tests/reports/`
3. Verify system requirements
4. Contact development team

---

**Note**: Load testing should be performed in controlled environments. Never run load tests against production systems without proper authorization and planning.
