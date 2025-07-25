#!/bin/bash

# Rollback Script for Blue-Green Deployment
# Usage: ./rollback.sh [--force] [--environment=blue|green]

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
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --force              Skip confirmation prompts"
    echo "  --environment=ENV    Rollback to specific environment (blue|green)"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Rollback to previous environment"
    echo "  $0 --force                   # Force rollback without confirmation"
    echo "  $0 --environment=blue        # Rollback to blue environment"
}

# Parse arguments
FORCE=false
SPECIFIED_ENVIRONMENT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --environment=*)
            SPECIFIED_ENVIRONMENT="${1#*=}"
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

# Get current active environment
get_active_environment() {
    local lb_status=$(curl -f -s --max-time 5 "http://localhost:8080/lb-status" 2>/dev/null || echo "{}")
    echo "$lb_status" | grep -o '"active_backend":"[^"]*"' | cut -d'"' -f4 | sed 's/_backend$//' || echo "unknown"
}

# Get previous environment from rollback point
get_previous_environment() {
    local rollback_file="$DEPLOYMENT_ROOT/.last_active_environment"
    if [[ -f "$rollback_file" ]]; then
        cat "$rollback_file"
    else
        echo ""
    fi
}

# Determine the other environment
get_other_environment() {
    local current="$1"
    if [[ "$current" == "blue" ]]; then
        echo "green"
    elif [[ "$current" == "green" ]]; then
        echo "blue"
    else
        echo ""
    fi
}

# Check if environment is healthy
check_environment_health() {
    local env="$1"
    "$SCRIPT_DIR/health-check.sh" "$env" --quiet
}

# Backup current state
backup_current_state() {
    local current_env=$(get_active_environment)
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$DEPLOYMENT_ROOT/.rollback_backup_${timestamp}"
    
    echo "current_environment=$current_env" > "$backup_file"
    echo "timestamp=$timestamp" >> "$backup_file"
    
    log_info "Current state backed up to: $backup_file"
}

# Main rollback logic
main() {
    local current_env=$(get_active_environment)
    local previous_env=$(get_previous_environment)
    local target_env=""
    
    log_info "=== DinoAir Blue-Green Deployment Rollback ==="
    log_info "Current active environment: $current_env"
    
    # Determine target environment
    if [[ -n "$SPECIFIED_ENVIRONMENT" ]]; then
        target_env="$SPECIFIED_ENVIRONMENT"
        log_info "Target environment (specified): $target_env"
    elif [[ -n "$previous_env" ]]; then
        target_env="$previous_env"
        log_info "Target environment (from rollback point): $target_env"
    else
        target_env=$(get_other_environment "$current_env")
        log_warning "No rollback point found. Will switch to other environment: $target_env"
    fi
    
    # Validate target environment
    if [[ -z "$target_env" || ( "$target_env" != "blue" && "$target_env" != "green" ) ]]; then
        log_error "Cannot determine valid target environment for rollback"
        exit 1
    fi
    
    # Check if rollback is needed
    if [[ "$current_env" == "$target_env" ]]; then
        log_warning "Already on target environment ($target_env). No rollback needed."
        if [[ "$FORCE" != true ]]; then
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Rollback cancelled by user"
                exit 0
            fi
        fi
    fi
    
    # Check if load balancer is running
    if ! docker ps --filter "name=dinoair-nginx-lb" --filter "status=running" -q | grep -q .; then
        log_error "Load balancer is not running. Cannot perform rollback."
        log_error "Please start it with: docker-compose -f $DEPLOYMENT_ROOT/docker-compose.nginx.yml up -d"
        exit 1
    fi
    
    # Health check target environment
    log_info "Checking health of target environment ($target_env)..."
    if ! check_environment_health "$target_env"; then
        log_error "$target_env environment is not healthy"
        log_error "Rollback may not be safe. Check the environment status:"
        log_error "  docker-compose -f $DEPLOYMENT_ROOT/docker-compose.$target_env.yml ps"
        log_error "  docker-compose -f $DEPLOYMENT_ROOT/docker-compose.$target_env.yml logs"
        
        if [[ "$FORCE" != true ]]; then
            read -p "Force rollback to unhealthy environment? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Rollback cancelled by user"
                exit 1
            fi
            log_warning "Forcing rollback to potentially unhealthy environment"
        fi
    else
        log_success "$target_env environment is healthy"
    fi
    
    # Confirmation prompt
    if [[ "$FORCE" != true ]]; then
        echo
        log_warning "You are about to rollback from $current_env to $target_env environment"
        log_warning "This will affect all users accessing the application"
        echo
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Backup current state before rollback
    backup_current_state
    
    # Perform the rollback using traffic switch script
    log_info "Performing rollback to $target_env environment..."
    
    if "$SCRIPT_DIR/switch-traffic.sh" "$target_env" --force; then
        log_success "Rollback completed successfully!"
        
        # Remove the rollback point since we've rolled back
        rm -f "$DEPLOYMENT_ROOT/.last_active_environment"
        
        echo
        log_info "Rollback summary:"
        log_info "  Previous environment: $current_env"
        log_info "  Current environment: $target_env"
        log_info "  Application URL: http://localhost"
        log_info "  Status check: $SCRIPT_DIR/health-check.sh all"
        
        echo
        log_warning "Post-rollback actions:"
        log_warning "  1. Verify application functionality"
        log_warning "  2. Check logs for any issues"
        log_warning "  3. Monitor application performance"
        log_warning "  4. Investigate the original issue in $current_env environment"
        
    else
        log_error "Rollback failed!"
        log_error "The system may be in an inconsistent state."
        log_error "Manual intervention may be required."
        exit 1
    fi
}

# Run main function
main