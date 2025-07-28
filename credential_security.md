# DinoAir Credential Security and Secrets Management

This document outlines the comprehensive security practices for managing credentials and sensitive information in the DinoAir project.

## 🔐 Secrets Management System

DinoAir now includes a robust secrets management system that provides:

- **Unified secrets interface** for multiple backends (Environment, Vault, AWS, Azure)
- **Automatic secrets rotation detection** and warnings
- **Client/server environment variable separation** to prevent secrets exposure
- **Weak secrets detection** to identify insecure configurations
- **Security audit logging** for compliance and monitoring
- **CLI tools** for managing secrets and security validation

### Quick Start

```bash
# Initialize secrets management
npm run secrets:init

# Validate current environment security
npm run secrets:validate

# Generate secure secrets
npm run secrets:generate session
npm run secrets:generate jwt

# Perform security audit
npm run secrets:audit

# Check rotation status
npm run secrets:rotation-check
```

## Important Security Notice

**NEVER commit credentials, API keys, passwords, or other sensitive information to the repository.**

## Secrets Management Architecture

### Supported Backends

1. **Environment Variables** (Development)
   - Default backend for local development
   - Uses `.env` files with validation

2. **HashiCorp Vault** (Production)
   - Enterprise secrets management
   - Automatic rotation and audit trails

3. **AWS Secrets Manager** (Cloud)
   - Managed secrets service
   - Integration with AWS services

4. **Azure Key Vault** (Cloud)
   - Microsoft cloud secrets management
   - Enterprise-grade security

### Configuration

Set the secrets backend using the `SECRETS_BACKEND` environment variable:

```bash
# Development (default)
SECRETS_BACKEND=environment

# Production with Vault
SECRETS_BACKEND=vault

# AWS deployment
SECRETS_BACKEND=aws

# Azure deployment
SECRETS_BACKEND=azure
```

## Environment Variables Setup

### Setting Up Your Environment

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   cp web-gui-node/.env.example web-gui-node/.env
   ```

2. Fill in your actual credentials in the `.env` files
3. **Never** commit the `.env` files to version control

### Environment File Locations

- Root directory: `.env.example` - Contains alerting and monitoring configurations
- `web-gui-node/.env.example` - Contains Supabase and database configurations
- `web-gui/.env.example` - Contains Next.js application configurations

### Client/Server Environment Variable Separation

The system automatically separates client-side and server-side environment variables:

**Client-side prefixes** (exposed to browser):
- `NEXT_PUBLIC_`
- `REACT_APP_`
- `VUE_APP_`
- `PUBLIC_`

**Server-side only**: All other variables

⚠️ **Security Warning**: Never use client-side prefixes with sensitive variables like API keys or secrets!

## Security Best Practices

### 1. Credential Storage

- Store all sensitive credentials in environment variables
- Use `.env` files for local development only
- Use secure secret management services for production (e.g., AWS Secrets Manager, HashiCorp Vault)

### 2. API Keys

- Rotate API keys regularly (recommended: every 30-90 days)
- Use different keys for development, staging, and production
- Implement key scoping with minimal required permissions

### 3. Database Credentials

- Use strong, unique passwords (minimum 16 characters)
- Enable SSL/TLS for database connections
- Restrict database access by IP when possible

### 4. Git Security

- Always check `git status` before committing
- Review changes carefully to ensure no secrets are included
- Use `git-secrets` or similar tools to prevent accidental commits
- Pre-commit hooks are configured to catch secrets

### 5. Production Security

- Never use development values in production
- Enable HTTPS/TLS for all connections
- Use proper CORS configuration
- Regular security audits and penetration testing

## Automated Security Features

### 1. Secrets Scanning

- **Gitleaks**: Configured to detect various secret patterns
- **Semgrep**: Static analysis for security vulnerabilities
- **Pre-commit hooks**: Prevent commits with secrets
- **CI/CD integration**: Automatic scanning on every push

### 2. Environment Validation

The enhanced environment validator checks for:

- Missing required variables
- Weak or example secrets
- Client-side exposure of sensitive data
- Production security misconfigurations
- SSL/TLS requirements

### 3. Audit Logging

All secret access is logged for:

- Compliance requirements
- Security monitoring
- Incident investigation
- Performance optimization

## Required Environment Variables

### Core Application
- `NODE_ENV` - Application environment (development/production)
- `PORT` - Server port number
- `SESSION_SECRET` - Secret for session encryption (generate with: `npm run secrets:generate session`)

### Database
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep highly secure)

### Monitoring (Optional)
- `SENTRY_DSN` - Sentry error tracking
- `ALERT_WEBHOOK_URL` - Webhook for alerts
- Various SMTP settings for email alerts

## Generating Secure Secrets

### Using the CLI Tool

```bash
# Generate session secret (32 bytes, hex)
npm run secrets:generate session

# Generate JWT secret (64 bytes, base64)
npm run secrets:generate jwt

# Generate API key (24 bytes, hex)
npm run secrets:generate api-key

# Generate custom secret
npm run secrets:generate custom 48 base64
```

### Manual Generation

Use these commands to generate secure random strings:

```bash
# Generate a 32-character secret
openssl rand -hex 32

# Generate a base64 encoded secret
openssl rand -base64 32

# Generate a URL-safe base64 secret
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

## Security Auditing

### Automated Audits

Run comprehensive security audits:

```bash
# Full security audit with detailed report
npm run secrets:audit

# Environment validation only
npm run secrets:validate

# Check which secrets need rotation
npm run secrets:rotation-check

# Full security scan (includes Gitleaks)
npm run security:full-audit
```

### Manual Security Checklist

- [ ] All secrets use strong, random values
- [ ] No hardcoded credentials in source code
- [ ] Client/server environment separation is correct
- [ ] Production environment uses HTTPS
- [ ] Database connections use SSL
- [ ] Secrets are rotated regularly
- [ ] Audit logs are monitored
- [ ] Security scanning is enabled in CI/CD

## Incident Response

### If Credentials Are Exposed

If you accidentally commit credentials:

1. **Immediately rotate the exposed credentials**
   ```bash
   # Generate new secrets
   npm run secrets:generate session
   npm run secrets:generate jwt
   ```

2. **Remove the credentials from repository history**:
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch PATH_TO_FILE" \
   --prune-empty --tag-name-filter cat -- --all
   ```

3. **Force push the cleaned history**
4. **Notify the team about the incident**
5. **Update all environments with new credentials**
6. **Monitor for any unauthorized access**

### Emergency Contacts

- **General Security Questions**: Create a GitHub issue with `security` label
- **Vulnerability Reports**: Use GitHub Security Advisories
- **Critical Issues**: Contact repository maintainers directly

## Secrets Rotation

### Automatic Rotation (Future)

The system is designed to support automatic rotation with:

- Integration with HashiCorp Vault
- AWS Secrets Manager rotation policies
- Azure Key Vault automatic rotation
- Webhook notifications for rotation events

### Manual Rotation Process

1. Generate new secret: `npm run secrets:generate <type>`
2. Update environment configuration
3. Deploy to staging environment
4. Test all functionality
5. Deploy to production
6. Verify all services are operational
7. Document rotation in audit logs

## Compliance and Monitoring

### Audit Logs

Access audit logs through the CLI:

```bash
# View recent secret access
node scripts/secrets-cli.js audit --detailed

# Check cache statistics
node scripts/secrets-cli.js validate --report
```

### Security Metrics

Monitor these security metrics:

- Number of weak secrets detected
- Client-side secret exposures
- Failed secret retrievals
- Rotation compliance rate
- Security scan results

## Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App - Config](https://12factor.net/config)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Azure Key Vault](https://docs.microsoft.com/en-us/azure/key-vault/)

## CLI Reference

```bash
# Secrets Management Commands
npm run secrets:init                 # Initialize secrets management
npm run secrets:validate             # Validate environment security
npm run secrets:generate <type>      # Generate secure secrets
npm run secrets:audit                # Perform security audit
npm run secrets:rotation-check       # Check rotation status

# Security Scanning Commands
npm run security:scan               # Run Gitleaks scan
npm run security:full-audit         # Complete security audit

# Available secret types for generation:
# - session    (32 bytes, hex)
# - jwt        (64 bytes, base64)  
# - api-key    (24 bytes, hex)
# - custom     (custom length/encoding)
```

Remember: Security is everyone's responsibility. When in doubt, ask for help!