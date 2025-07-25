# Multi-stage build for optimized production image
# Stage 1: Dependencies
FROM node:20-alpine AS deps

# Install system dependencies and security updates
RUN apk add --no-cache libc6-compat curl && \
    apk upgrade

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies with cache mount and security optimizations
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --ignore-scripts --audit fix

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Copy source code
COPY . .

# Set build environment variables
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build:production

# Stage 3: Production image
FROM node:20-alpine AS runner

# Install security updates and minimal runtime dependencies
RUN apk upgrade && apk add --no-cache curl

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Add non-root user with specific UID/GID for better security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Copy necessary files from builder with optimized layering
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy standalone build with proper ownership
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create necessary directories with proper permissions
RUN mkdir -p uploads logs && \
    chown -R nextjs:nodejs uploads logs

# Remove unnecessary packages to reduce attack surface
RUN apk del --purge

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check with improved reliability
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]