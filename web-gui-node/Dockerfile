# Multi-stage build for DinoAir Web GUI Node.js Backend
# Stage 1: Dependencies
FROM node:20-alpine AS deps

# Install system dependencies
RUN apk add --no-cache libc6-compat curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with cache mount for faster builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --ignore-scripts

# Stage 2: Build (for any build steps if needed)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Copy source code
COPY . .

# Set build environment
ENV NODE_ENV=production

# Run any build steps (currently none needed for Node.js Express)
RUN npm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runtime

# Install only runtime system dependencies
RUN apk add --no-cache \
    curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package.json for metadata
COPY --from=builder /app/package.json ./

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application files with proper ownership
COPY --chown=nodejs:nodejs server.js ./
COPY --chown=nodejs:nodejs routes/ ./routes/
COPY --chown=nodejs:nodejs lib/ ./lib/
COPY --chown=nodejs:nodejs middleware/ ./middleware/
COPY --chown=nodejs:nodejs views/ ./views/
COPY --chown=nodejs:nodejs public/ ./public/
COPY --chown=nodejs:nodejs scripts/ ./scripts/

# Create necessary directories with proper permissions
RUN mkdir -p uploads logs && \
    chown -R nodejs:nodejs uploads logs

# Switch to non-root user for security
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Set environment variables
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]

# Stage 4: Development image (optional)
FROM runtime AS development

# Switch back to root for development dependencies
USER root

# Install development dependencies
RUN apk add --no-cache \
    git \
    vim \
    bash

# Copy development dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy all source files including dev configs
COPY --chown=nodejs:nodejs . .

# Switch back to non-root user
USER nodejs

# Development command with nodemon for hot reload
CMD ["npm", "run", "dev"]