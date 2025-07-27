#!/bin/bash

# Health Check Script for Blue-Green Deployment
# Usage: ./health-check.sh [blue|green|all] [--quiet] [--timeout=30]

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

# Default configuration
TIMEOUT=30
QUIET=false
ENVIRONMENT=""

# Logging functions
log_info() {
    if [[ "$QUIET" != true ]]; then
        echo -e "${BLUE}[INFO]${NC} $1"
    fi
}

log_success() {
    if [[ "$QUIET" != true ]]; then
        echo -e "${GREEN}[SUCCESS]${NC} $1"
    fi
}

log_warning() {
    if [[ "$QUIET" != true ]]; then
        echo -e "${YELLOW}[WARNING]${NC} $1"
    fi
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Print usage
usage() {
    echo "Usage: $0 [blue|green|all] [options]"
    echo ""
    echo "Options:"
    echo "  --quiet         Suppress output (only exit codes)"
    echo "  --timeout=N     Timeout in seconds (default: 30)"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 blue                 # Check blue environment health"
    echo "  $0 all --quiet         # Check all environments quietly"
    echo "  $0 green --timeout=60  # Check green with 60s timeout"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        blue|green|all)
            ENVIRONMENT="$1"
            shift
            ;;
        --quiet)
            QUIET=true
            shift
            ;;
        --timeout=*)
            TIMEOUT="${1#*=}"
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

# Default to checking all environments
if [[ -z "$ENVIRONMENT" ]]; then
    ENVIRONMENT="all"
fi

# Health check function for a single service
check_service_health() {
    local service_url="$1"
    local service_name="$2"
    local max_attempts=$((TIMEOUT / 2))
    local attempt=0
    
    log_info "Checking $service_name health at $service_url..."
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s --max-time 5 "$service_url" > /dev/null 2>&1; then
            log_success "$service_name is healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        if [[ $attempt -lt $max_attempts ]]; then
            sleep 2
        fi
    done
    
    log_error "$service_name is unhealthy after $TIMEOUT seconds"
    return 1
}

# Check environment health
check_environment_health() {
    local env="$1"
    local env_upper=$(echo "$env" | tr '[:lower:]' '[:upper:]')
    local web_gui_port
    local comfyui_port
    local all_healthy=true
    
    # Determine ports based on environment
    if [[ "$env" == "blue" ]]; then
        web_gui_port=3001
        comfyui_port=8189
    else
        web_gui_port=3002
        comfyui_port=8190
    fi
    
    log_info "Checking $env_upper environment health..."
    
    # Check if containers are running
    local compose_file="$DEPLOYMENT_ROOT/docker-compose.$env.yml"
    if [[ ! -f "$compose_file" ]]; then
        log_error "Compose file not found: $compose_file"
        return 1
    fi
    
    local running_containers=$(docker-compose -f "$compose_file" ps -q)
    if [[ -z "$running_containers" ]]; then
        log_error "$env_upper environment containers are not running"
        return 1
    fi
    
    # Check web GUI health
    if ! check_service_health "http://localhost:$web_gui_port/api/health" "$env_upper Web GUI"; then
        all_healthy=false
    fi
    
    # Check ComfyUI health
    if ! check_service_health "http://localhost:$comfyui_port/" "$env_upper ComfyUI"; then
        all_healthy=false
    fi
    
    # Check Docker container health status
    local unhealthy_containers=$(docker-compose -f "$compose_file" ps --filter "health=unhealthy" -q)
    if [[ -n "$unhealthy_containers" ]]; then
        log_error "$env_upper environment has unhealthy containers"
        all_healthy=false
    fi
    
    if [[ "$all_healthy" == true ]]; then
        log_success "$env_upper environment is fully healthy"
        return 0
    else
        log_error "$env_upper environment has health issues"
        return 1
    fi
}

# Check load balancer health
check_load_balancer_health() {
    log_info "Checking load balancer health..."
    
    # Check if nginx container is running
    if ! docker ps --filter "name=dinoair-nginx-lb" --filter "status=running" -q | grep -q .; then
        log_error "Load balancer container is not running"
        return 1
    fi
    
    # Check nginx health endpoint
    if ! check_service_health "http://localhost:8080/nginx-health" "Load Balancer"; then
        return 1
    fi
    
    # Check main application endpoint through load balancer
    if ! check_service_health "http://localhost:80/health" "Application (via Load Balancer)"; then
        return 1
    fi
    
    # Check load balancer status endpoint
    local lb_status=$(curl -f -s --max-time 5 "http://localhost:8080/lb-status" 2>/dev/null || echo "{}")
    local active_backend=$(echo "$lb_status" | grep -o '"active_backend":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    
    log_success "Load balancer is healthy (active backend: $active_backend)"
    return 0
}

# Get current active environment
get_active_environment() {
    local lb_status=$(curl -f -s --max-time 5 "http://localhost:8080/lb-status" 2>/dev/null || echo "{}")
    echo "$lb_status" | grep -o '"active_backend":"[^"]*"' | cut -d'"' -f4 | sed 's/_backend$//' || echo "unknown"
}

# Main health check logic
main() {
    local overall_health=true
    
    if [[ "$ENVIRONMENT" == "all" ]]; then
        log_info "Performing comprehensive health check..."
        
        # Check load balancer
        if ! check_load_balancer_health; then
            overall_health=false
        fi
        
        # Check both environments
        for env in blue green; do
            if ! check_environment_health "$env"; then
                overall_health=false
            fi
        done
        
        # Show current traffic routing
        local active_env=$(get_active_environment)
        log_info "Current active environment: $active_env"
        
    else
        # Check specific environment
        if ! check_environment_health "$ENVIRONMENT"; then
            overall_health=false
        fi
    fi
    
    if [[ "$overall_health" == true ]]; then
        log_success "All health checks passed!"
        exit 0
    else
        log_error "Some health checks failed!"
        exit 1
    fi
}

# Run main function
main