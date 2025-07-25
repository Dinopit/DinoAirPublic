FROM nginx:alpine

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Copy nginx configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY upstream.conf.template /etc/nginx/conf.d/upstream.conf.template

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create directory for PID file
RUN mkdir -p /var/run/nginx

# Expose ports
EXPOSE 80 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/nginx-health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]