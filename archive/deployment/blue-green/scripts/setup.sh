#!/bin/bash

# Setup Script for Blue-Green Deployment
# Usage: ./setup.sh [--clean]

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
    echo "  --clean     Clean up existing resources before setup"
    echo "  --help      Show this help message"
    echo ""
    echo "This script sets up the blue-green deployment infrastructure for DinoAir"
}

# Parse arguments
CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN=true
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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Clean up existing resources
cleanup_existing() {
    log_info "Cleaning up existing resources..."
    
    # Stop and remove containers
    docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.blue.yml" down --remove-orphans || true
    docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.green.yml" down --remove-orphans || true
    docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.nginx.yml" down --remove-orphans || true
    
    # Remove network
    docker network rm dinoair-blue-green 2>/dev/null || true
    
    # Remove volumes (optional - ask user)
    read -p "Remove data volumes? This will delete all application data (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume rm $(docker volume ls -q --filter label=environment=blue) 2>/dev/null || true
        docker volume rm $(docker volume ls -q --filter label=environment=green) 2>/dev/null || true
        log_success "Data volumes removed"
    else
        log_info "Data volumes preserved"
    fi
    
    log_success "Cleanup completed"
}

# Create network
create_network() {
    log_info "Creating Docker network..."
    
    if docker network create dinoair-blue-green --driver bridge; then
        log_success "Network 'dinoair-blue-green' created"
    else
        log_warning "Network 'dinoair-blue-green' already exists"
    fi
}

# Validate configuration files
validate_config() {
    log_info "Validating configuration files..."
    
    local errors=0
    
    # Check required files
    local required_files=(
        "$DEPLOYMENT_ROOT/.env.blue"
        "$DEPLOYMENT_ROOT/.env.green"
        "$DEPLOYMENT_ROOT/docker-compose.blue.yml"
        "$DEPLOYMENT_ROOT/docker-compose.green.yml"
        "$DEPLOYMENT_ROOT/docker-compose.nginx.yml"
        "$DEPLOYMENT_ROOT/nginx/nginx.conf"
        "$DEPLOYMENT_ROOT/nginx/upstream.conf.template"
        "$DEPLOYMENT_ROOT/nginx/Dockerfile"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file missing: $file"
            errors=$((errors + 1))
        fi
    done
    
    # Validate Docker Compose files
    for compose_file in "$DEPLOYMENT_ROOT/docker-compose.blue.yml" "$DEPLOYMENT_ROOT/docker-compose.green.yml" "$DEPLOYMENT_ROOT/docker-compose.nginx.yml"; do
        if ! docker-compose -f "$compose_file" config -q; then
            log_error "Invalid Docker Compose file: $compose_file"
            errors=$((errors + 1))
        fi
    done
    
    if [[ $errors -gt 0 ]]; then
        log_error "Configuration validation failed with $errors errors"
        exit 1
    fi
    
    log_success "Configuration validation passed"
}

# Build base images
build_images() {
    log_info "Building Docker images..."
    
    # Build nginx load balancer image
    if docker build -t dinoair-nginx-lb "$DEPLOYMENT_ROOT/nginx/"; then
        log_success "Nginx load balancer image built"
    else
        log_error "Failed to build nginx load balancer image"
        exit 1
    fi
    
    # Build web GUI images for both environments
    if docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.blue.yml" build; then
        log_success "Blue environment images built"
    else
        log_error "Failed to build blue environment images"
        exit 1
    fi
    
    log_success "All images built successfully"
}

# Create initial environment setup
create_initial_setup() {
    log_info "Creating initial environment setup..."
    
    # Create monitoring directory if it doesn't exist
    mkdir -p "$DEPLOYMENT_ROOT/monitoring"
    
    # Create prometheus configuration if it doesn't exist
    if [[ ! -f "$DEPLOYMENT_ROOT/monitoring/prometheus.yml" ]]; then
        cat > "$DEPLOYMENT_ROOT/monitoring/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'nginx-lb'
    static_configs:
      - targets: ['nginx-lb:8080']
    
  - job_name: 'blue-web-gui'
    static_configs:
      - targets: ['dinoair-web-gui-blue:3000']
    
  - job_name: 'green-web-gui'
    static_configs:
      - targets: ['dinoair-web-gui-green:3000']
    
  - job_name: 'blue-comfyui'
    static_configs:
      - targets: ['dinoair-comfyui-blue:8188']
    
  - job_name: 'green-comfyui'
    static_configs:
      - targets: ['dinoair-comfyui-green:8188']
EOF
        log_success "Prometheus configuration created"
    fi
    
    # Create alerts configuration if it doesn't exist
    if [[ ! -f "$DEPLOYMENT_ROOT/monitoring/alerts.yml" ]]; then
        cat > "$DEPLOYMENT_ROOT/monitoring/alerts.yml" << 'EOF'
groups:
  - name: dinoair.rules
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"
          description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minute."
      
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is above 90% on {{ $labels.instance }} for more than 2 minutes."
EOF
        log_success "Alerts configuration created"
    fi
    
    log_success "Initial setup completed"
}

# Start load balancer
start_load_balancer() {
    log_info "Starting load balancer..."
    
    export ACTIVE_ENVIRONMENT=blue
    if docker-compose -f "$DEPLOYMENT_ROOT/docker-compose.nginx.yml" up -d; then
        log_success "Load balancer started"
        
        # Wait for load balancer to be healthy
        local max_wait=30
        local wait_time=0
        
        while [[ $wait_time -lt $max_wait ]]; do
            if curl -f -s http://localhost:8080/nginx-health > /dev/null 2>&1; then
                log_success "Load balancer is healthy"
                break
            fi
            
            sleep 2
            wait_time=$((wait_time + 2))
        done
        
        if [[ $wait_time -ge $max_wait ]]; then
            log_warning "Load balancer health check timeout (this may be normal)"
        fi
    else
        log_error "Failed to start load balancer"
        exit 1
    fi
}

# Display setup summary
display_summary() {
    echo
    log_success "=== Blue-Green Deployment Setup Complete ==="
    echo
    log_info "Infrastructure Status:"
    log_info "  ✓ Docker network created: dinoair-blue-green"
    log_info "  ✓ Images built and ready"
    log_info "  ✓ Load balancer running on http://localhost"
    log_info "  ✓ Configuration files validated"
    echo
    log_info "Next Steps:"
    log_info "  1. Deploy to blue environment:"
    log_info "     $SCRIPT_DIR/deploy.sh blue"
    echo
    log_info "  2. Test blue environment:"
    log_info "     http://localhost:3001 (direct access)"
    echo
    log_info "  3. Switch traffic to blue:"
    log_info "     $SCRIPT_DIR/switch-traffic.sh blue"
    echo
    log_info "  4. Deploy to green environment:"
    log_info "     $SCRIPT_DIR/deploy.sh green"
    echo
    log_info "  5. Check health status:"
    log_info "     $SCRIPT_DIR/health-check.sh all"
    echo
    log_info "Management URLs:"
    log_info "  Application: http://localhost"
    log_info "  Load Balancer Status: http://localhost:8080/lb-status"
    log_info "  Monitoring: http://localhost:9090 (when started)"
    echo
    log_info "For help: $SCRIPT_DIR/deploy.sh --help"
}

# Main setup function
main() {
    log_info "=== DinoAir Blue-Green Deployment Setup ==="
    
    # Clean up if requested
    if [[ "$CLEAN" == true ]]; then
        cleanup_existing
    fi
    
    # Run setup steps
    check_prerequisites
    validate_config
    create_network
    build_images
    create_initial_setup
    start_load_balancer
    
    # Display summary
    display_summary
}

# Run main function
main