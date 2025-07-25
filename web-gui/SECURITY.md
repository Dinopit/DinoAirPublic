# Container Security Best Practices for DinoAir

This document outlines security best practices for container development, deployment, and maintenance in the DinoAir project.

## 🛡️ Overview

Container security is implemented using a multi-layered approach:

1. **Base Image Security** - Scanning and securing foundation images
2. **Dependency Security** - Vulnerability scanning of application dependencies  
3. **Container Configuration** - Secure container build and runtime configuration
4. **Secret Management** - Proper handling of sensitive data
5. **Runtime Security** - Monitoring and protecting running containers

## 🔧 Security Scanning Setup

### Trivy Scanner Configuration

Our CI/CD pipeline uses Trivy for comprehensive security scanning:

- **Base Images**: Scans Node.js and Python base images for vulnerabilities
- **Dependencies**: Filesystem scanning of npm packages and Python dependencies
- **Container Images**: Full container image vulnerability assessment
- **Configuration**: Docker and Kubernetes configuration security checks
- **Secrets**: Detection of hardcoded secrets and sensitive data

### Vulnerability Thresholds

| Severity | Threshold | Action |
|----------|-----------|--------|
| CRITICAL | 0 | ❌ **Fail Build** |
| HIGH | ≤5 | ⚠️ **Warning** |  
| MEDIUM | ≤20 | ℹ️ **Information** |
| LOW | No limit | 📊 **Report Only** |

## 🐳 Docker Security Best Practices

### 1. Base Image Selection

**✅ DO:**
- Use official, minimal base images (e.g., `node:20-alpine`, `python:3.11-slim`)
- Specify exact version tags (avoid `:latest`)
- Regularly update base images
- Use multi-stage builds to reduce attack surface

**❌ DON'T:**
- Use outdated or unofficial images
- Use full OS images when minimal alternatives exist
- Use `:latest` tags in production

### 2. User Configuration

**✅ DO:**
```dockerfile
# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Switch to non-root user
USER nextjs
```

**❌ DON'T:**
- Run containers as root
- Use UID 0 or root user

### 3. File System Security

**✅ DO:**
- Use `COPY` instead of `ADD`
- Set appropriate file permissions
- Clean up package manager caches
- Use `.dockerignore` to exclude sensitive files

**❌ DON'T:**
- Copy entire directories without filtering
- Leave package caches and temporary files
- Include source code, secrets, or build artifacts unnecessarily

### 4. Network Security

**✅ DO:**
```dockerfile
# Expose only necessary ports
EXPOSE 3000

# Use HTTPS for downloads
RUN curl -fsSL https://example.com/file -o /tmp/file
```

**❌ DON'T:**
- Expose unnecessary ports
- Download over HTTP
- Use privileged networking

### 5. Health Checks

**✅ DO:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"
```

## 🔐 Secret Management

### Environment Variables

**✅ DO:**
- Use environment variables for configuration
- Validate required environment variables at startup
- Use secure secret management systems (e.g., Docker Secrets, Kubernetes Secrets)

**❌ DON'T:**
- Hardcode secrets in Dockerfiles or source code
- Commit `.env` files with real secrets
- Use default/example secrets in production

### Example Secret Detection Patterns

Our security scanner detects these patterns:
- API keys: `dinoair-[a-zA-Z0-9-]{20,50}`
- JWT secrets: `JWT_SECRET=...`
- Database URLs with credentials
- Private keys and certificates

## 🚀 Runtime Security

### Container Runtime

**✅ DO:**
- Run containers with limited privileges
- Use security contexts and capabilities appropriately
- Implement resource limits (CPU, memory)
- Enable read-only root filesystems where possible

**❌ DON'T:**
- Run with `--privileged` flag
- Grant unnecessary capabilities
- Run without resource limits

### Monitoring and Logging

**✅ DO:**
- Implement comprehensive logging
- Monitor for suspicious activities
- Set up alerts for security events
- Regularly review access logs

## 🔄 CI/CD Security Integration

### Automated Security Scanning

Our CI/CD pipeline includes:

1. **Pre-build Scanning**:
   - Base image vulnerability scanning
   - Dependency vulnerability scanning
   - Secret detection in source code

2. **Build-time Scanning**:
   - Container image vulnerability scanning
   - Configuration security checks
   - License compliance checks

3. **Post-build Actions**:
   - Security report generation
   - Vulnerability threshold enforcement
   - Automated alerts for critical issues

### Security Gates

Builds are blocked if:
- Critical vulnerabilities are found
- Secrets are detected in source code
- Security policy violations occur
- High-risk configurations are present

## 📊 Security Reporting

### Available Reports

1. **SARIF Reports**: Integrated with GitHub Security tab
2. **JSON Reports**: Detailed vulnerability information
3. **Security Dashboard**: HTML dashboard with visual summaries
4. **NPM Audit Reports**: Node.js dependency vulnerabilities

### Accessing Reports

- **GitHub Security Tab**: View SARIF-formatted results
- **Actions Artifacts**: Download detailed reports
- **Security Dashboard**: Visual summary of security status

## 🚨 Incident Response

### Critical Vulnerability Response

1. **Immediate Actions**:
   - Stop affected deployments
   - Assess vulnerability impact
   - Implement temporary mitigations

2. **Remediation**:
   - Update affected dependencies
   - Rebuild and redeploy containers
   - Verify fixes with security scans

3. **Post-Incident**:
   - Document lessons learned
   - Update security policies
   - Improve detection capabilities

### Alert Channels

- **GitHub Issues**: Automated issue creation for critical vulnerabilities
- **CI/CD Notifications**: Build failure notifications
- **Security Dashboard**: Real-time security status

## 🔧 Maintenance and Updates

### Regular Maintenance

- **Weekly**: Review security scan results
- **Monthly**: Update base images and dependencies
- **Quarterly**: Review and update security policies
- **Annually**: Comprehensive security audit

### Dependency Management

- Use `npm audit` for Node.js vulnerabilities
- Implement automated dependency updates with security testing
- Maintain an inventory of all dependencies
- Regularly review and remove unused dependencies

## 📚 Additional Resources

- [OWASP Container Security](https://owasp.org/www-project-container-security/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Trivy Documentation](https://trivy.dev/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)

## 🆘 Getting Help

For security-related questions or to report security issues:

1. **Internal Issues**: Create a GitHub issue with the `security` label
2. **Security Vulnerabilities**: Follow responsible disclosure guidelines
3. **Emergency Security Issues**: Contact the development team immediately

---

*This document is part of the DinoAir security framework and should be reviewed regularly to ensure it remains current with security best practices.*