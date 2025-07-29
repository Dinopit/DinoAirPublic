# Security Policy

## Supported Versions

We actively support the following versions of DinoAir with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Container Security

DinoAir implements comprehensive container security scanning and monitoring:

### Automated Security Scanning

- **Base Images**: Regular scanning of Node.js and Python base images
- **Dependencies**: Continuous monitoring of npm and pip packages
- **Container Images**: Full vulnerability assessment of built containers
- **Configuration**: Security policy validation for Docker and Kubernetes configs
- **Secrets**: Detection and prevention of hardcoded secrets

### Security Thresholds

Our automated security pipeline enforces the following thresholds:

- **CRITICAL**: 0 vulnerabilities allowed (builds fail)
- **HIGH**: Maximum 5 vulnerabilities (warnings generated)
- **MEDIUM**: Maximum 20 vulnerabilities (informational)
- **LOW**: Unlimited (tracked for trends)

## Reporting a Vulnerability

We take security vulnerabilities seriously and appreciate responsible disclosure.

### How to Report

**For non-critical vulnerabilities:**
1. Create a [GitHub Security Advisory](https://github.com/Dinopit/DinoAirPublic/security/advisories)
2. Use the "Report a vulnerability" button in the Security tab
3. Provide detailed information about the vulnerability

**For critical vulnerabilities:**
1. **DO NOT** create a public issue
2. Email the security team (if available) or use GitHub's private reporting
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested remediation (if any)

### What to Include

Please include the following information:
- **Vulnerability Type**: What kind of security issue is it?
- **Location**: Where in the codebase is the vulnerability?
- **Impact**: What could an attacker achieve?
- **Reproduction**: Step-by-step instructions to reproduce
- **Mitigation**: Any suggested fixes or workarounds

### Response Timeline

- **Initial Response**: Within 48 hours
- **Vulnerability Assessment**: Within 1 week
- **Fix Development**: Depends on severity and complexity
- **Security Release**: As soon as fix is tested and validated

### Severity Classification

| Severity | Response Time | Description |
|----------|---------------|-------------|
| **Critical** | 24 hours | Remote code execution, privilege escalation |
| **High** | 1 week | Authentication bypass, sensitive data exposure |
| **Medium** | 2 weeks | Limited privilege escalation, DoS |
| **Low** | 1 month | Information disclosure, minor issues |

## Security Measures

### Container Security
- Multi-stage Docker builds with minimal attack surface
- Non-root user execution
- Regular base image updates
- Vulnerability scanning with Trivy
- Secret detection and prevention
- Security policy enforcement

### Application Security
- Input validation and sanitization
- Authentication and authorization controls
- Rate limiting and request throttling
- Secure session management
- Content Security Policy (CSP)
- API security best practices

### Infrastructure Security
- Encrypted communication (HTTPS/TLS)
- Secure environment variable handling
- Regular security updates
- Access logging and monitoring
- Backup and recovery procedures

## Security Contacts

- **General Security Questions**: Create a GitHub issue with `security` label
- **Vulnerability Reports**: Use GitHub Security Advisories
- **Critical Issues**: Contact repository maintainers directly

## Security Resources

- [Container Security Best Practices](./SECURITY.md)
- [OWASP Container Security Guide](https://owasp.org/www-project-container-security/)
- [Docker Security Documentation](https://docs.docker.com/develop/security-best-practices/)

## Acknowledgments

We appreciate the security researchers and community members who help improve DinoAir's security through responsible disclosure.

---

*This security policy is subject to change. Please check back regularly for updates.*