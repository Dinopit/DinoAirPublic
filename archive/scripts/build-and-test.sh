#!/bin/bash

# DinoAir Multi-Stage Docker Build and Test Script
# Builds and tests optimized Docker images across different environments

set -e

# Configuration
ENVIRONMENTS=("development" "production")
SERVICES=(
    "web-gui"
    "web-gui-node" 
    "comfyui"
    "main"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 DinoAir Docker Multi-Stage Build & Test${NC}"
echo -e "${BLUE}===========================================${NC}"

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to build service with specific target
build_service() {
    local service=$1
    local target=$2
    local tag_suffix=$3
    
    log "${YELLOW}🔨 Building $service with target $target...${NC}"
    
    case $service in
        "web-gui")
            docker build \
                --target $target \
                --tag dinoair-web-gui:$tag_suffix \
                --cache-from dinoair-web-gui:latest \
                --build-arg BUILDKIT_INLINE_CACHE=1 \
                ./web-gui/
            ;;
        "web-gui-node")
            docker build \
                --target $target \
                --tag dinoair-web-gui-node:$tag_suffix \
                --cache-from dinoair-web-gui-node:latest \
                --build-arg BUILDKIT_INLINE_CACHE=1 \
                ./web-gui-node/
            ;;
        "comfyui")
            docker build \
                --target $target \
                --tag dinoair-comfyui:$tag_suffix \
                --cache-from dinoair-comfyui:latest \
                --build-arg BUILDKIT_INLINE_CACHE=1 \
                -f comfyui.Dockerfile \
                .
            ;;
        "main")
            docker build \
                --target $target \
                --tag dinoair-main:$tag_suffix \
                --cache-from dinoair-main:latest \
                --build-arg BUILDKIT_INLINE_CACHE=1 \
                .
            ;;
    esac
    
    log "${GREEN}✅ Built $service:$tag_suffix${NC}"
}

# Function to test image
test_image() {
    local image=$1
    log "${YELLOW}🧪 Testing $image...${NC}"
    
    # Basic functionality test
    if docker run --rm --name test-${image//[^a-zA-Z0-9]/-} $image echo "Container startup test" >/dev/null 2>&1; then
        log "${GREEN}✅ Container startup test passed for $image${NC}"
    else
        log "${RED}❌ Container startup test failed for $image${NC}"
        return 1
    fi
    
    # Security test - check if running as non-root
    local user=$(docker run --rm $image whoami 2>/dev/null || echo "unknown")
    if [[ "$user" != "root" ]]; then
        log "${GREEN}✅ Security test passed - running as non-root user ($user) for $image${NC}"
    else
        log "${YELLOW}⚠️  Security warning - running as root user for $image${NC}"
    fi
    
    # Size optimization test
    local size_mb=$(docker images --format "table {{.Size}}" $image | tail -n +2 | sed 's/MB//' | sed 's/GB/*1000/' | bc 2>/dev/null || echo "unknown")
    log "${BLUE}📏 Image size: $size_mb for $image${NC}"
    
    log "${GREEN}✅ Testing completed for $image${NC}"
}

# Function to build all services for an environment
build_environment() {
    local env=$1
    log "${BLUE}🏗️  Building for $env environment...${NC}"
    
    for service in "${SERVICES[@]}"; do
        if [[ "$env" == "development" ]]; then
            build_service $service "development" "$env"
        else
            build_service $service "runtime" "$env"
        fi
        
        test_image "dinoair-$service:$env"
    done
    
    log "${GREEN}✅ Completed building $env environment${NC}"
}

# Function to compare image sizes
compare_sizes() {
    log "${BLUE}📊 Image Size Comparison${NC}"
    echo -e "${BLUE}========================${NC}"
    
    for service in "${SERVICES[@]}"; do
        echo -e "\n${YELLOW}Service: $service${NC}"
        
        if docker image inspect dinoair-$service:development >/dev/null 2>&1 && docker image inspect dinoair-$service:production >/dev/null 2>&1; then
            local dev_size=$(docker images --format "{{.Size}}" dinoair-$service:development)
            local prod_size=$(docker images --format "{{.Size}}" dinoair-$service:production)
            
            echo -e "  Development: ${BLUE}$dev_size${NC}"
            echo -e "  Production:  ${GREEN}$prod_size${NC}"
        else
            echo -e "  ${YELLOW}⚠️  Some images not available for comparison${NC}"
        fi
    done
}

# Function to run integration tests
run_integration_tests() {
    log "${BLUE}🔗 Running Integration Tests${NC}"
    
    # Test web-gui + comfyui integration
    log "${YELLOW}Testing web-gui + comfyui integration...${NC}"
    
    # Start minimal stack for testing
    cd web-gui
    
    # Create temporary docker-compose for testing
    cat > docker-compose.test.yml << EOF
version: '3.8'
services:
  web-gui-test:
    image: dinoair-web-gui:production
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=production
      - API_BASE_URL=http://comfyui-test:8188
    depends_on:
      - comfyui-test
    networks:
      - test-network
      
  comfyui-test:
    image: dinoair-comfyui:production
    ports:
      - "8189:8188"
    networks:
      - test-network

networks:
  test-network:
    driver: bridge
EOF
    
    # Start test stack
    docker-compose -f docker-compose.test.yml up -d
    
    # Wait for services to be ready
    sleep 30
    
    # Test connectivity
    if curl -f http://localhost:3002 >/dev/null 2>&1; then
        log "${GREEN}✅ Web GUI integration test passed${NC}"
    else
        log "${RED}❌ Web GUI integration test failed${NC}"
    fi
    
    if curl -f http://localhost:8189 >/dev/null 2>&1; then
        log "${GREEN}✅ ComfyUI integration test passed${NC}"
    else
        log "${RED}❌ ComfyUI integration test failed${NC}"
    fi
    
    # Cleanup
    docker-compose -f docker-compose.test.yml down
    rm docker-compose.test.yml
    
    cd ..
}

# Function to cleanup test artifacts
cleanup() {
    log "${YELLOW}🧹 Cleaning up test artifacts...${NC}"
    
    # Remove test containers
    docker ps -a --filter "name=test-" --format "{{.Names}}" | xargs -r docker rm -f
    
    # Remove dangling images
    docker image prune -f
    
    log "${GREEN}✅ Cleanup completed${NC}"
}

# Main function
main() {
    log "${BLUE}Starting DinoAir Docker build and test process...${NC}\n"
    
    # Enable Docker BuildKit for better caching
    export DOCKER_BUILDKIT=1
    
    # Build for each environment
    for env in "${ENVIRONMENTS[@]}"; do
        build_environment $env
    done
    
    # Compare sizes
    compare_sizes
    
    # Run integration tests
    run_integration_tests
    
    # Generate build report
    echo -e "\n${BLUE}📋 Build Summary${NC}"
    echo -e "${BLUE}================${NC}"
    docker images | grep dinoair | head -20
    
    log "${GREEN}🎉 Build and test process completed successfully!${NC}"
}

# Error handling
trap cleanup ERR
trap cleanup EXIT

main "$@"