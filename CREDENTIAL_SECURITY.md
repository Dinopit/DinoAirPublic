# Credential Security Guidelines

This document outlines the security practices for managing credentials and sensitive information in the DinoAir project.

## Important Security Notice

**NEVER commit credentials, API keys, passwords, or other sensitive information to the repository.**

## Environment Variables

### Setting Up Your Environment

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual credentials in the `.env` file
3. **Never** commit the `.env` file to version control

### Environment File Locations

- Root directory: `.env.example` - Contains alerting and monitoring configurations
- `web-gui-node/.env.example` - Contains Supabase and database configurations
- `web-gui/.env.example` - Contains Next.js application configurations

## Security Best Practices

### 1. Credential Storage

- Store all sensitive credentials in environment variables
- Use `.env` files for local development only
- Use secure secret management services for production (e.g., AWS Secrets Manager, HashiCorp Vault)

### 2. API Keys

- Rotate API keys regularly
- Use different keys for development, staging, and production
- Implement key scoping with minimal required permissions

### 3. Database Credentials

- Use strong, unique passwords
- Enable SSL/TLS for database connections
- Restrict database access by IP when possible

### 4. Git Security

- Always check `git status` before committing
- Review changes carefully to ensure no secrets are included
- Use `git-secrets` or similar tools to prevent accidental commits

### 5. If Credentials Are Exposed

If you accidentally commit credentials:

1. **Immediately rotate the exposed credentials**
2. Remove the credentials from the repository history:
   ```bash
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch PATH_TO_FILE" \
   --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push the cleaned history
4. Notify the team about the incident

## Required Environment Variables

### Core Application
- `NODE_ENV` - Application environment (development/production)
- `PORT` - Server port number
- `SESSION_SECRET` - Secret for session encryption (generate a strong random string)

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

Use these commands to generate secure random strings:

```bash
# Generate a 32-character secret
openssl rand -hex 32

# Generate a base64 encoded secret
openssl rand -base64 32
```

## Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App - Config](https://12factor.net/config)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)

Remember: Security is everyone's responsibility. When in doubt, ask for help!