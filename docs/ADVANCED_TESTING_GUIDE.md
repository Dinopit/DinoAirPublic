# Advanced Testing and Quality Assurance Guide

This document outlines the comprehensive testing and quality assurance framework implemented for DinoAir.

## Testing Framework Overview

DinoAir implements a multi-layered testing approach that includes:

### 1. Security Testing (SAST/DAST/Dependency Scanning)

#### Static Application Security Testing (SAST)
- **Bandit**: Python security linting with enhanced rules
- **Semgrep**: Multi-language security pattern matching  
- **Safety**: Python dependency vulnerability scanning
- **Pylint**: Security-focused static analysis

#### Dynamic Application Security Testing (DAST)
- **OWASP ZAP**: Automated security scanning of running applications
- **Nuclei**: Vulnerability scanner with community templates
- **Custom rules**: Application-specific security testing rules

#### Dependency Scanning
- **Trivy**: Comprehensive vulnerability scanner
- **Grype**: Container and filesystem vulnerability detection
- **OSV Scanner**: Open Source Vulnerability scanning
- **npm audit**: JavaScript dependency security audit

#### Secret Scanning
- **TruffleHog**: Git repository secret detection
- **detect-secrets**: Baseline secret scanning
- **Gitleaks**: Git-native secret detection

### 2. Chaos Engineering

#### Service Resilience Testing
- **CPU stress testing**: Validates performance under high CPU load
- **Memory stress testing**: Tests memory pressure handling
- **Network chaos**: Simulates network delays and packet loss
- **Process chaos**: Tests recovery from process failures
- **Disk I/O stress**: Validates storage subsystem resilience

#### Recovery Testing
- **Graceful shutdown**: Tests proper service termination
- **Crash recovery**: Validates automatic restart mechanisms
- **Failover testing**: Tests service failover capabilities

### 3. Performance Regression Testing

#### CLI Performance
- **Startup time benchmarking**: Using hyperfine for precise measurements
- **Configuration loading**: Performance of config initialization
- **Memory profiling**: Memory usage analysis during operations

#### Web Application Performance  
- **Lighthouse audits**: Core web vitals and performance scoring
- **Load testing**: Artillery and K6 for realistic traffic simulation
- **Response time analysis**: Statistical analysis of endpoint performance

#### API Performance
- **Endpoint benchmarking**: Individual API endpoint performance
- **Load testing**: Locust-based API load testing
- **Regression detection**: Automatic comparison with performance baselines

### 4. Comprehensive Integration Testing

#### Service Integration
- **Service startup**: Multi-service initialization testing
- **API connectivity**: Cross-service communication validation
- **Configuration management**: End-to-end config handling
- **Health monitoring**: Service health check integration

#### Database Integration
- **Connection management**: Database connectivity testing
- **Transaction handling**: ACID compliance validation
- **Error recovery**: Database failure scenario testing

#### User Workflow Testing
- **Critical path testing**: End-to-end user journey validation
- **Error handling**: User-facing error scenario testing
- **Cross-component integration**: Full stack integration testing

### 5. Enhanced Accessibility Testing

#### WCAG Compliance
- **Level A/AA/AAA testing**: Configurable compliance level testing
- **Automated accessibility audits**: Playwright + Axe integration
- **Manual testing guidelines**: Screen reader and keyboard navigation

#### Testing Tools
- **Playwright + Axe**: Automated accessibility testing
- **Axe-CLI**: Command-line accessibility validation
- **Lighthouse**: Accessibility scoring and recommendations

## Workflow Integration

### GitHub Actions Workflows

1. **`advanced-security-testing.yml`**
   - Comprehensive security scanning
   - SAST, DAST, and dependency analysis
   - Scheduled daily runs and PR triggers

2. **`chaos-engineering.yml`**
   - Service resilience validation
   - Configurable chaos intensity levels
   - Weekly scheduled runs

3. **`performance-regression.yml`**
   - Performance baseline comparison
   - Automated regression detection
   - Nightly performance monitoring

4. **`comprehensive-integration.yml`**
   - Multi-scope integration testing
   - Service, database, and API integration
   - Configurable test coverage levels

5. **`accessibility-testing.yml`** (Enhanced)
   - Multi-tool accessibility validation
   - WCAG compliance testing
   - Automated and manual testing support

6. **`advanced-testing-orchestration.yml`**
   - Central testing coordination
   - Quality gate management
   - Comprehensive reporting

### Test Execution Matrix

| Test Type | PR | Main/Develop | Scheduled | Manual |
|-----------|----|--------------| ----------|--------|
| Unit Tests | ✅ | ✅ | ✅ | ✅ |
| Integration | ✅ | ✅ | ✅ | ✅ |
| Security | ✅ | ✅ | Daily | ✅ |
| Accessibility | ✅ | ✅ | Daily | ✅ |
| Performance | ⚠️ | ✅ | Nightly | ✅ |
| Chaos | ❌ | ⚠️ | Weekly | ✅ |

**Legend:**
- ✅ Always runs
- ⚠️ Conditional/limited scope
- ❌ Skipped for safety

## Configuration

### Test Scopes

#### Security Testing
- **Enhanced SAST**: Multi-tool static analysis
- **DAST with ZAP**: Dynamic security scanning
- **Dependency Analysis**: Multi-scanner vulnerability detection
- **Secret Scanning**: Git and filesystem secret detection

#### Chaos Engineering
- **Low**: CPU/memory stress, network delay
- **Medium**: + disk stress, process kill
- **High**: + network loss, service restart

#### Performance Testing
- **Light Load**: 5 VUs for 60s
- **Moderate Load**: 20 VUs for 120s  
- **Heavy Load**: 50 VUs for 300s

#### Integration Testing
- **Minimal**: Service startup, basic API
- **Standard**: + config management, health checks
- **Full**: + security, data flow, error handling
- **Critical Path**: Core user workflows only

#### Accessibility Testing
- **Minimal**: Homepage only
- **Standard**: Homepage, about, contact
- **Comprehensive**: All major pages and user flows

### Quality Gates

The testing framework implements quality gates to ensure code quality:

#### Pass Criteria
- All unit tests pass
- No critical security vulnerabilities
- No accessibility violations (WCAG AA)
- Performance within 10% of baseline
- All integration tests pass

#### Warning Criteria  
- Minor security issues (low/medium severity)
- Performance regression 5-10%
- Non-critical accessibility issues
- Some integration test failures

#### Fail Criteria
- Critical security vulnerabilities
- Performance regression > 10%
- Critical accessibility violations
- Core integration test failures

## Usage Guide

### Running Tests Locally

#### Security Testing
```bash
# Run enhanced security scan
npm run security:full-audit

# Run individual tools
bandit -r . -f json -o bandit-results.json
safety check --json --output safety-results.json
semgrep --config=auto --json .
```

#### Performance Testing
```bash
# CLI performance benchmarking
hyperfine --warmup 3 --runs 10 'python start.py --help'

# Web performance testing
lighthouse http://localhost:3000 --only-categories=performance
artillery run load-test-config.yml
```

#### Accessibility Testing
```bash
# Automated accessibility testing
npx playwright test tests/accessibility/
axe http://localhost:3000 --tags wcag2aa
lighthouse http://localhost:3000 --only-categories=accessibility
```

#### Integration Testing
```bash
# Run integration test suite
python -m pytest tests/ -m integration
npm test # For JavaScript components
```

### Workflow Triggers

#### Manual Workflow Dispatch
All workflows support manual triggering with configurable parameters:

```yaml
workflow_dispatch:
  inputs:
    test_scope:
      description: 'Test scope level'
      type: choice
      options: [minimal, standard, comprehensive]
    include_performance:
      description: 'Include performance tests'
      type: boolean
      default: true
```

#### Scheduled Execution
- **Daily**: Security and accessibility testing
- **Nightly**: Performance regression testing  
- **Weekly**: Chaos engineering tests

### Artifact Management

Test results are stored as GitHub Actions artifacts with:
- **30-day retention** for detailed reports
- **90-day retention** for summary reports
- **JSON/HTML formats** for automated processing
- **Markdown summaries** for human readability

## Best Practices

### Test Development
1. **Write tests before implementing features**
2. **Include security test cases for new endpoints**
3. **Add accessibility tests for UI components**
4. **Performance test critical user paths**
5. **Include chaos scenarios for new services**

### CI/CD Integration
1. **Run appropriate test scope for change size**
2. **Use quality gates to prevent regression**
3. **Monitor test execution time and optimize**
4. **Review test results in PR discussions**
5. **Update baselines when performance improves**

### Monitoring and Alerting
1. **Set up alerts for test failures**
2. **Monitor test execution trends**
3. **Track quality metrics over time**
4. **Review security scan results regularly**
5. **Update test configurations as needed**

## Troubleshooting

### Common Issues

#### Test Failures
- **Check test logs** in workflow artifacts
- **Verify service dependencies** are running
- **Check for environment-specific issues**
- **Review recent code changes** for breaking changes

#### Performance Regressions
- **Compare with baseline** performance data
- **Check for resource constraints** in test environment
- **Review recent optimizations** or changes
- **Update baselines** if improvements are intentional

#### Security Issues
- **Review security scan details** in artifacts
- **Check for false positives** in results
- **Update security rules** if needed
- **Fix critical vulnerabilities** immediately

#### Accessibility Failures
- **Review automated test results** for specific violations
- **Test manually** with screen readers
- **Check WCAG guidelines** for compliance requirements
- **Update UI components** to meet standards

## Contributing

### Adding New Tests
1. **Follow existing test patterns** and naming conventions
2. **Add appropriate test markers** for categorization
3. **Include documentation** for new test scenarios
4. **Update workflow configurations** if needed
5. **Test locally** before submitting PR

### Updating Configurations
1. **Test configuration changes** thoroughly
2. **Update documentation** for new options
3. **Consider backward compatibility** 
4. **Get review approval** for workflow changes
5. **Monitor impact** after deployment

## Resources

### Documentation
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Chaos Engineering Principles](https://principlesofchaos.org/)
- [Performance Testing Best Practices](https://docs.k6.io/misc/fine-tuning-os)

### Tools Documentation
- [Playwright Testing](https://playwright.dev/docs/test-intro)
- [Bandit Security Linting](https://bandit.readthedocs.io/)
- [OWASP ZAP](https://www.zaproxy.org/docs/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Artillery Load Testing](https://artillery.io/docs/)

---

For questions or support, please refer to the project documentation or create an issue in the repository.