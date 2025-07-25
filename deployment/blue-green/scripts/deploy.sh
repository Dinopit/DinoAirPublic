#!/bin/bash

# Blue-Green Deployment Script for DinoAir
# Usage: ./deploy.sh [blue|green] [--build] [--migrate] [--no-health-check]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOYMENT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print usage
usage() {
    echo "Usage: $0 [blue|green] [options]"
    echo ""
    echo "Options:"
    echo "  --build           Force rebuild of Docker images"
    echo "  --migrate         Run database migrations"
    echo "  --no-health-check Skip health checks"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 blue                    # Deploy to blue environment"
    echo "  $0 green --build          # Deploy to green with image rebuild"
    echo "  $0 blue --migrate         # Deploy with database migrations"
}

# Parse arguments
ENVIRONMENT=""
BUILD_IMAGES=false
RUN_MIGRATIONS=false
SKIP_HEALTH_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        blue|green)
            ENVIRONMENT="$1"
            shift
            ;;
        --build)
            BUILD_IMAGES=true
            shift
            ;;
        --migrate)
            RUN_MIGRATIONS=true
            shift
            ;;
        --no-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment must be specified (blue or green)"
    usage
    exit 1
fi

# Configuration for the deployment
ENV_FILE="$DEPLOYMENT_ROOT/.env.$ENVIRONMENT"
COMPOSE_FILE="$DEPLOYMENT_ROOT/docker-compose.$ENVIRONMENT.yml"

log_info "Starting deployment to $ENVIRONMENT environment..."

# Check if required files exist
if [[ ! -f "$ENV_FILE" ]]; then
    log_error "Environment file not found: $ENV_FILE"
    exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
    log_error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# Source environment variables
set -a
source "$ENV_FILE"
set +a

# Create network if it doesn't exist
log_info "Creating Docker network..."
docker network create dinoair-blue-green 2>/dev/null || true

# Pre-deployment health check of target environment
if [[ "$SKIP_HEALTH_CHECK" != true ]]; then
    log_info "Checking if $ENVIRONMENT environment is healthy before deployment..."
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up (healthy)"; then
        log_warning "$ENVIRONMENT environment is already running and healthy"
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    fi
fi

# Stop existing services in target environment
log_info "Stopping existing $ENVIRONMENT environment services..."
docker-compose -f "$COMPOSE_FILE" down --remove-orphans || true

# Build images if requested
if [[ "$BUILD_IMAGES" == true ]]; then
    log_info "Building Docker images for $ENVIRONMENT environment..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
fi

# Database migrations (placeholder for future implementation)
if [[ "$RUN_MIGRATIONS" == true ]]; then
    log_info "Running database migrations for $ENVIRONMENT environment..."
    # TODO: Implement database migration logic
    # This could involve:
    # - Running migration scripts
    # - Backing up current database state
    # - Applying schema changes
    log_warning "Database migrations not yet implemented"
fi

# Start services
log_info "Starting $ENVIRONMENT environment services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
if [[ "$SKIP_HEALTH_CHECK" != true ]]; then
    log_info "Waiting for $ENVIRONMENT environment to become healthy..."
    
    MAX_WAIT=300  # 5 minutes
    WAIT_INTERVAL=10
    ELAPSED=0
    
    while [[ $ELAPSED -lt $MAX_WAIT ]]; do
        if "$SCRIPT_DIR/health-check.sh" "$ENVIRONMENT" --quiet; then
            log_success "$ENVIRONMENT environment is healthy!"
            break
        fi
        
        log_info "Waiting for services to become healthy... ($ELAPSED/$MAX_WAIT seconds)"
        sleep $WAIT_INTERVAL
        ELAPSED=$((ELAPSED + WAIT_INTERVAL))
    done
    
    if [[ $ELAPSED -ge $MAX_WAIT ]]; then
        log_error "$ENVIRONMENT environment failed to become healthy within $MAX_WAIT seconds"
        log_error "Deployment failed. Check service logs:"
        docker-compose -f "$COMPOSE_FILE" logs --tail=50
        exit 1
    fi
fi

# Deployment summary
log_success "Deployment to $ENVIRONMENT environment completed successfully!"
log_info "Services status:"
docker-compose -f "$COMPOSE_FILE" ps

log_info ""
log_info "Next steps:"
if [[ "$ENVIRONMENT" == "blue" ]]; then
    log_info "  - Test the blue environment: http://localhost:3001"
    log_info "  - Switch traffic: ./switch-traffic.sh blue"
else
    log_info "  - Test the green environment: http://localhost:3002"
    log_info "  - Switch traffic: ./switch-traffic.sh green"
fi
log_info "  - Check health: ./health-check.sh $ENVIRONMENT"
log_info "  - View logs: docker-compose -f $COMPOSE_FILE logs -f"