#!/bin/bash

# Traffic Switching Script for Blue-Green Deployment
# Usage: ./switch-traffic.sh [blue|green] [--force] [--no-health-check]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
    echo "  --force           Skip confirmation prompts"
    echo "  --no-health-check Skip health checks before switching"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 blue                    # Switch traffic to blue environment"
    echo "  $0 green --force          # Force switch to green without confirmation"
    echo "  $0 blue --no-health-check # Switch without health check"
}

# Parse arguments
ENVIRONMENT=""
FORCE=false
SKIP_HEALTH_CHECK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        blue|green)
            ENVIRONMENT="$1"
            shift
            ;;
        --force)
            FORCE=true
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

# Get current active environment
get_active_environment() {
    local lb_status=$(curl -f -s --max-time 5 "http://localhost:8080/lb-status" 2>/dev/null || echo "{}")
    echo "$lb_status" | grep -o '"active_backend":"[^"]*"' | cut -d'"' -f4 | sed 's/_backend$//' || echo "unknown"
}

# Update nginx configuration
update_nginx_config() {
    local target_env="$1"
    
    log_info "Updating nginx configuration to route traffic to $target_env environment..."
    
    # Update the environment variable and restart nginx
    docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.nginx.yml" \
        exec -e ACTIVE_ENVIRONMENT="$target_env" nginx-lb \
        sh -c 'envsubst < /etc/nginx/conf.d/upstream.conf.template > /etc/nginx/conf.d/upstream.conf && nginx -s reload'
    
    if [[ $? -eq 0 ]]; then
        log_success "Nginx configuration updated successfully"
    else
        log_error "Failed to update nginx configuration"
        return 1
    fi
}

# Verify traffic switch
verify_traffic_switch() {
    local expected_env="$1"
    local max_attempts=10
    local attempt=0
    
    log_info "Verifying traffic switch to $expected_env environment..."
    
    while [[ $attempt -lt $max_attempts ]]; do
        local current_env=$(get_active_environment)
        
        if [[ "$current_env" == "$expected_env" ]]; then
            log_success "Traffic successfully switched to $expected_env environment"
            return 0
        fi
        
        log_info "Waiting for traffic switch to take effect... (attempt $((attempt + 1))/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Traffic switch verification failed. Current environment: $(get_active_environment), Expected: $expected_env"
    return 1
}

# Create rollback point
create_rollback_point() {
    local current_env=$(get_active_environment)
    echo "$current_env" > "$DEPLOYMENT_ROOT/.last_active_environment"
    log_info "Rollback point created (previous environment: $current_env)"
}

# Main traffic switching logic
main() {
    local current_env=$(get_active_environment)
    
    log_info "Current active environment: $current_env"
    log_info "Target environment: $ENVIRONMENT"
    
    # Check if already active
    if [[ "$current_env" == "$ENVIRONMENT" ]]; then
        log_warning "Traffic is already routed to $ENVIRONMENT environment"
        if [[ "$FORCE" != true ]]; then
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Traffic switch cancelled by user"
                exit 0
            fi
        fi
    fi
    
    # Check if load balancer is running
    if ! docker ps --filter "name=dinoair-nginx-lb" --filter "status=running" -q | grep -q .; then
        log_error "Load balancer is not running. Please start it with:"
        log_error "docker-compose -f $DEPLOYMENT_ROOT/docker-compose.nginx.yml up -d"
        exit 1
    fi
    
    # Health check target environment
    if [[ "$SKIP_HEALTH_CHECK" != true ]]; then
        log_info "Checking health of target environment before switching..."
        if ! "$SCRIPT_DIR/health-check.sh" "$ENVIRONMENT" --quiet; then
            log_error "$ENVIRONMENT environment is not healthy. Cannot switch traffic."
            log_error "Use --no-health-check to override (not recommended)"
            exit 1
        fi
        log_success "$ENVIRONMENT environment is healthy"
    fi
    
    # Confirmation prompt
    if [[ "$FORCE" != true ]]; then
        echo
        log_warning "You are about to switch traffic from $current_env to $ENVIRONMENT environment"
        log_warning "This will affect all users accessing the application"
        echo
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Traffic switch cancelled by user"
            exit 0
        fi
    fi
    
    # Create rollback point
    create_rollback_point
    
    # Perform the switch
    log_info "Switching traffic to $ENVIRONMENT environment..."
    
    if update_nginx_config "$ENVIRONMENT"; then
        # Verify the switch worked
        if verify_traffic_switch "$ENVIRONMENT"; then
            log_success "Traffic successfully switched to $ENVIRONMENT environment!"
            
            # Show status
            echo
            log_info "Current status:"
            log_info "  Active environment: $ENVIRONMENT"
            log_info "  Previous environment: $current_env"
            log_info "  Application URL: http://localhost"
            log_info "  Load balancer status: http://localhost:8080/lb-status"
            
            echo
            log_info "To rollback if needed: $SCRIPT_DIR/rollback.sh"
            
        else
            log_error "Traffic switch failed verification"
            exit 1
        fi
    else
        log_error "Failed to update nginx configuration"
        exit 1
    fi
}

# Run main function
main