#!/bin/bash

# Cleanup Script for Blue-Green Deployment
# Usage: ./cleanup.sh [--all] [--volumes] [--images]

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
    echo "  --all        Clean up everything (containers, volumes, images, network)"
    echo "  --volumes    Remove data volumes (will delete all application data)"
    echo "  --images     Remove Docker images"
    echo "  --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                # Clean up containers and network only"
    echo "  $0 --all         # Complete cleanup including data"
    echo "  $0 --volumes     # Remove volumes only"
}

# Parse arguments
CLEAN_ALL=false
CLEAN_VOLUMES=false
CLEAN_IMAGES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            CLEAN_ALL=true
            CLEAN_VOLUMES=true
            CLEAN_IMAGES=true
            shift
            ;;
        --volumes)
            CLEAN_VOLUMES=true
            shift
            ;;
        --images)
            CLEAN_IMAGES=true
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

# Stop and remove containers
cleanup_containers() {
    log_info "Stopping and removing containers..."
    
    # Stop blue environment
    if docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.blue.yml" ps -q | grep -q .; then
        log_info "Stopping blue environment..."
        docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.blue.yml" down --remove-orphans
        log_success "Blue environment stopped"
    else
        log_info "Blue environment not running"
    fi
    
    # Stop green environment
    if docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.green.yml" ps -q | grep -q .; then
        log_info "Stopping green environment..."
        docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.green.yml" down --remove-orphans
        log_success "Green environment stopped"
    else
        log_info "Green environment not running"
    fi
    
    # Stop nginx load balancer
    if docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.nginx.yml" ps -q | grep -q .; then
        log_info "Stopping load balancer..."
        docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.nginx.yml" down --remove-orphans
        log_success "Load balancer stopped"
    else
        log_info "Load balancer not running"
    fi
    
    log_success "All containers stopped and removed"
}

# Remove volumes
cleanup_volumes() {
    log_info "Removing data volumes..."
    
    # Get volumes with blue/green labels
    local blue_volumes=$(docker volume ls -q --filter label=environment=blue 2>/dev/null || true)
    local green_volumes=$(docker volume ls -q --filter label=environment=green 2>/dev/null || true)
    
    if [[ -n "$blue_volumes" ]]; then
        log_info "Removing blue environment volumes..."
        echo "$blue_volumes" | xargs docker volume rm 2>/dev/null || true
        log_success "Blue volumes removed"
    else
        log_info "No blue volumes found"
    fi
    
    if [[ -n "$green_volumes" ]]; then
        log_info "Removing green environment volumes..."
        echo "$green_volumes" | xargs docker volume rm 2>/dev/null || true
        log_success "Green volumes removed"
    else
        log_info "No green volumes found"
    fi
    
    # Remove specific volumes if they exist
    local specific_volumes=(
        "dinoair-blue-green_nginx_logs"
        "dinoair-blue-green_prometheus_data"
    )
    
    for volume in "${specific_volumes[@]}"; do
        if docker volume ls -q | grep -q "^${volume}$"; then
            docker volume rm "$volume" 2>/dev/null || true
            log_info "Removed volume: $volume"
        fi
    done
    
    log_success "Data volumes cleanup completed"
}

# Remove images
cleanup_images() {
    log_info "Removing Docker images..."
    
    # Remove DinoAir specific images
    local images_to_remove=(
        "dinoair-web-gui:latest"
        "dinoair-web-gui:blue-latest"
        "dinoair-web-gui:green-latest"
        "dinoair-nginx-lb"
    )
    
    for image in "${images_to_remove[@]}"; do
        if docker images -q "$image" | grep -q .; then
            docker rmi "$image" 2>/dev/null || true
            log_info "Removed image: $image"
        fi
    done
    
    # Remove dangling images related to the project
    local dangling_images=$(docker images -f "dangling=true" -q 2>/dev/null || true)
    if [[ -n "$dangling_images" ]]; then
        echo "$dangling_images" | xargs docker rmi 2>/dev/null || true
        log_info "Removed dangling images"
    fi
    
    log_success "Images cleanup completed"
}

# Remove network
cleanup_network() {
    log_info "Removing Docker network..."
    
    if docker network ls | grep -q "dinoair-blue-green"; then
        docker network rm dinoair-blue-green 2>/dev/null || true
        log_success "Network 'dinoair-blue-green' removed"
    else
        log_info "Network 'dinoair-blue-green' not found"
    fi
}

# Clean up temporary files
cleanup_temp_files() {
    log_info "Cleaning up temporary files..."
    
    # Remove rollback files
    rm -f "$DEPLOYMENT_ROOT/.last_active_environment"
    rm -f "$DEPLOYMENT_ROOT/.rollback_backup_"*
    
    # Remove log files (optional)
    if [[ -d "$DEPLOYMENT_ROOT/logs" ]]; then
        rm -rf "$DEPLOYMENT_ROOT/logs"
        log_info "Removed log directory"
    fi
    
    log_success "Temporary files cleaned up"
}

# Display current resource usage
show_resource_usage() {
    log_info "Current Docker resource usage:"
    
    echo
    echo "Containers:"
    docker ps --filter "label=service" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers found"
    
    echo
    echo "Volumes:"
    docker volume ls --filter "label=environment" --format "table {{.Name}}\t{{.Driver}}\t{{.Labels}}" 2>/dev/null || echo "No volumes found"
    
    echo
    echo "Images:"
    docker images --filter "reference=dinoair*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" 2>/dev/null || echo "No DinoAir images found"
    
    echo
    echo "Networks:"
    docker network ls --filter "name=dinoair" --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" 2>/dev/null || echo "No DinoAir networks found"
}

# Confirmation prompt
confirm_cleanup() {
    local cleanup_type="$1"
    
    echo
    log_warning "You are about to perform $cleanup_type cleanup"
    
    if [[ "$CLEAN_VOLUMES" == true ]]; then
        log_warning "⚠️  This will DELETE ALL APPLICATION DATA in volumes"
    fi
    
    if [[ "$CLEAN_IMAGES" == true ]]; then
        log_warning "⚠️  This will REMOVE Docker images (will need to rebuild)"
    fi
    
    echo
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleanup cancelled by user"
        exit 0
    fi
}

# Main cleanup function
main() {
    log_info "=== DinoAir Blue-Green Deployment Cleanup ==="
    
    # Show current state
    show_resource_usage
    
    # Determine cleanup type
    local cleanup_type="container and network"
    if [[ "$CLEAN_ALL" == true ]]; then
        cleanup_type="complete"
    elif [[ "$CLEAN_VOLUMES" == true && "$CLEAN_IMAGES" == true ]]; then
        cleanup_type="volumes and images"
    elif [[ "$CLEAN_VOLUMES" == true ]]; then
        cleanup_type="volumes"
    elif [[ "$CLEAN_IMAGES" == true ]]; then
        cleanup_type="images"
    fi
    
    # Confirm cleanup
    confirm_cleanup "$cleanup_type"
    
    # Perform cleanup
    cleanup_containers
    cleanup_network
    cleanup_temp_files
    
    if [[ "$CLEAN_VOLUMES" == true ]]; then
        cleanup_volumes
    fi
    
    if [[ "$CLEAN_IMAGES" == true ]]; then
        cleanup_images
    fi
    
    echo
    log_success "=== Cleanup Completed ==="
    
    # Show final state
    echo
    log_info "Remaining resources:"
    show_resource_usage
    
    echo
    log_info "To set up the environment again, run:"
    log_info "  $SCRIPT_DIR/setup.sh"
}

# Run main function
main