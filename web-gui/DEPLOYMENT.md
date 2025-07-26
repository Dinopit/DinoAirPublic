# DinoAir Web GUI - Deployment Documentation

## Table of Contents
- [Overview](#overview)
- [Environment Variables](#environment-variables)
- [Build Process](#build-process)
- [Deployment Options](#deployment-options)
  - [Vercel Deployment](#vercel-deployment)
  - [Docker Deployment](#docker-deployment)
  - [Traditional Node.js Deployment](#traditional-nodejs-deployment)
  - [Cloud Platform Deployments](#cloud-platform-deployments)
- [Performance Optimization](#performance-optimization)
- [Monitoring and Debugging](#monitoring-and-debugging)
- [Security Checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)

## Overview

DinoAir Web GUI is a Next.js application optimized for production deployment with built-in security features, performance optimizations, and flexible deployment options.

### Key Features
- 🚀 Optimized production builds with SWC minification
- 🔒 Security headers and CSP configuration
- 📦 Docker support with multi-stage builds
- 🌐 Environment-based configuration
- 📊 Bundle analysis and optimization
- 🔄 CI/CD ready with GitHub Actions

## Environment Variables

### Required Variables

All environment variables are validated using Zod schema (see `lib/env.ts`). Copy `.env.example` to `.env.local` for local development.

#### Server-side Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `API_BASE_URL` | Backend API URL | `http://localhost:8080` | Yes |
| `API_KEY` | API authentication key | - | Yes |
| `API_SECRET` | API secret (min 32 chars) | - | Yes |
| `SESSION_SECRET` | Session encryption secret | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `COMFYUI_API_URL` | ComfyUI backend URL | `http://localhost:8188` | Yes |

#### Client-side Variables (NEXT_PUBLIC_*)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_APP_NAME` | Application name | `DinoAir Free Tier` | Yes |
| `NEXT_PUBLIC_VERSION` | App version | `1.0.0` | Yes |
| `NEXT_PUBLIC_API_URL` | Public API endpoint | `http://localhost:3000/api` | Yes |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:8080` | Yes |

### Environment Files

- `.env.development` - Development environment
- `.env.production` - Production environment (uses env vars)
- `.env.test` - Test environment
- `.env.local` - Local overrides (not committed)

## Build Process

### Development Build
```bash
npm install
npm run dev
```

### Production Build
```bash
npm install
npm run build:production
```

### Analyze Bundle Size
```bash
npm run build:analyze
# Open ./analyze.html in browser
```

### Type Checking
```bash
npm run type-check
```

## Deployment Options

### Vercel Deployment

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Deploy**
```bash
vercel --prod
```

3. **Environment Variables**
Set environment variables in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add all required variables from `.env.example`

4. **Custom Domain**
Configure in Vercel dashboard under Domains section.

### Docker Deployment

1. **Build Image**
```bash
docker build -t dinoair-web-gui:latest .
```

2. **Run with Docker Compose**
```bash
# Copy and configure environment variables
cp .env.example .env
# Edit .env with your values

# Start services
docker-compose up -d
```

3. **Run Standalone**
```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name dinoair-web \
  dinoair-web-gui:latest
```

### Traditional Node.js Deployment

1. **Build Application**
```bash
npm install --production
npm run build:production
```

2. **Start Server**
```bash
NODE_ENV=production npm start
```

3. **Using PM2**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "dinoair-web" -- start

# Save PM2 config
pm2 save
pm2 startup
```

### Cloud Platform Deployments

#### AWS Elastic Beanstalk
1. Install EB CLI
2. Initialize: `eb init -p node.js-20 dinoair-web`
3. Create environment: `eb create production`
4. Deploy: `eb deploy`

#### Google Cloud Run
```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT-ID/dinoair-web

# Deploy
gcloud run deploy dinoair-web \
  --image gcr.io/PROJECT-ID/dinoair-web \
  --platform managed \
  --allow-unauthenticated
```

#### Azure App Service
```bash
# Create app service
az webapp create --resource-group myResourceGroup \
  --plan myAppServicePlan --name dinoair-web \
  --runtime "NODE:20-lts"

# Deploy
az webapp deployment source config-zip \
  --resource-group myResourceGroup \
  --name dinoair-web --src app.zip
```

## Performance Optimization

### 1. Build Optimizations
- ✅ SWC minification enabled
- ✅ Tree shaking configured
- ✅ Code splitting by route
- ✅ Dynamic imports for heavy components
- ✅ Image optimization with Next.js Image

### 2. Caching Strategy
```nginx
# Nginx example
location /_next/static/ {
    expires 365d;
    add_header Cache-Control "public, immutable";
}

location /_next/image/ {
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
}
```

### 3. CDN Configuration
- Use Cloudflare, Fastly, or AWS CloudFront
- Configure cache headers properly
- Enable Brotli/Gzip compression

### 4. Database Connection Pooling
If using database in future:
```javascript
// Example with PostgreSQL
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 5. Memory Optimization
```javascript
// In next.config.js
experimental: {
  optimizePackageImports: ['heavy-library'],
  serverComponentsExternalPackages: ['large-package'],
}
```

## Monitoring and Debugging

### 1. Health Check Endpoint
Create `/app/api/health/route.ts`:
```typescript
export async function GET() {
  // Check dependencies
  const checks = {
    api: await checkAPI(),
    comfyui: await checkComfyUI(),
  };
  
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks,
  });
}
```

### 2. Logging
Configure structured logging:
```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### 3. APM Integration
- **Sentry**: Error tracking and performance monitoring
- **New Relic**: Full-stack observability
- **DataDog**: Infrastructure and APM

Example Sentry setup:
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### 4. Metrics Collection
```typescript
// Example with Prometheus
import { register, Counter, Histogram } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
});
```

## Security Checklist

- [x] Environment variables properly configured
- [x] Security headers implemented (CSP, HSTS, etc.)
- [x] API authentication enabled
- [x] Rate limiting configured
- [x] CORS properly configured
- [x] Dependencies regularly updated (Dependabot)
- [x] Docker image uses non-root user
- [x] Secrets not committed to repository
- [x] SSL/TLS certificate configured
- [ ] WAF rules configured (if using CDN)
- [ ] Regular security audits scheduled

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### 2. Memory Issues
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

#### 3. Port Already in Use
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>
```

#### 4. Environment Variable Issues
- Check `.env` file formatting
- Ensure no spaces around `=`
- Verify all required variables are set
- Check variable naming (NEXT_PUBLIC_* for client)

#### 5. Docker Issues
```bash
# Clean Docker cache
docker system prune -a
docker-compose down -v
docker-compose up --build
```

### Debug Mode
Enable debug logging:
```bash
DEBUG=* npm run dev
NEXT_PUBLIC_DEBUG_MODE=true npm run build
```

### Performance Profiling
1. Use Chrome DevTools Performance tab
2. Enable React DevTools Profiler
3. Use Lighthouse for audits
4. Monitor Core Web Vitals

## Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Web Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)
- [Performance Best Practices](https://web.dev/fast/)

## Support

For deployment issues:
1. Check logs in your deployment platform
2. Verify all environment variables
3. Test locally with production build
4. Review error tracking dashboard
5. Contact support with detailed error information
