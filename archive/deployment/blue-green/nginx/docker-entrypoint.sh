#!/bin/sh

# Substitute environment variables in upstream configuration
envsubst < /etc/nginx/conf.d/upstream.conf.template > /etc/nginx/conf.d/upstream.conf

# Start nginx
exec "$@"