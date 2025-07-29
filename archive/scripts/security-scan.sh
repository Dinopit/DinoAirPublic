#!/bin/bash

# Docker Multi-Stage Build Security Scanner
# Scans optimized Docker images for vulnerabilities

set -e

# Configuration
IMAGES=(
    "dinoair-web-gui:latest"
    "dinoair-web-gui-node:latest" 
    "dinoair-comfyui:latest"
    "dinoair-main:latest"
)

SCANNERS=(
    "trivy"
    "docker scout"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 DinoAir Docker Security Scanner${NC}"
echo -e "${BLUE}===================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to scan with Trivy
scan_with_trivy() {
    local image=$1
    echo -e "${YELLOW}📋 Scanning $image with Trivy...${NC}"
    
    # Install trivy if not available
    if ! command_exists trivy; then
        echo -e "${YELLOW}⬇️  Installing Trivy...${NC}"
        curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.18.3
    fi
    
    # Run vulnerability scan
    trivy image --severity HIGH,CRITICAL --format table $image
    
    # Generate JSON report for CI/CD
    trivy image --severity HIGH,CRITICAL --format json --output "${image//:/}_trivy_report.json" $image
    
    echo -e "${GREEN}✅ Trivy scan completed for $image${NC}"
}

# Function to scan with Docker Scout
scan_with_docker_scout() {
    local image=$1
    echo -e "${YELLOW}📋 Scanning $image with Docker Scout...${NC}"
    
    # Check if Docker Scout is available
    if ! docker scout version >/dev/null 2>&1; then
        echo -e "${YELLOW}⬇️  Docker Scout not available, skipping...${NC}"
        return
    fi
    
    # Run Docker Scout CVE scan
    docker scout cves $image
    
    # Generate SARIF report for GitHub integration
    docker scout cves --format sarif --output "${image//:/}_scout_report.sarif" $image
    
    echo -e "${GREEN}✅ Docker Scout scan completed for $image${NC}"
}

# Function to analyze image size and layers
analyze_image_optimization() {
    local image=$1
    echo -e "${YELLOW}📊 Analyzing optimization for $image...${NC}"
    
    # Get image size and layer count
    local size=$(docker images --format "table {{.Size}}" $image | tail -n +2)
    local layers=$(docker history $image --no-trunc | wc -l)
    
    echo -e "  📏 Image size: ${BLUE}$size${NC}"
    echo -e "  📚 Layer count: ${BLUE}$layers${NC}"
    
    # Check for optimization indicators
    if docker run --rm $image sh -c "whoami | grep -v root" >/dev/null 2>&1; then
        echo -e "  👤 ${GREEN}✅ Non-root user detected${NC}"
    else
        echo -e "  👤 ${RED}❌ Running as root user${NC}"
    fi
    
    # Check for minimal base image
    if docker image inspect $image | grep -q "alpine\|distroless\|slim"; then
        echo -e "  🏔️  ${GREEN}✅ Minimal base image detected${NC}"
    else
        echo -e "  🏔️  ${YELLOW}⚠️  Consider using minimal base image${NC}"
    fi
    
    echo -e "${GREEN}✅ Optimization analysis completed for $image${NC}"
}

# Main scanning function
main() {
    echo -e "${BLUE}Starting security scans for DinoAir Docker images...${NC}\n"
    
    # Create reports directory
    mkdir -p security-reports
    cd security-reports
    
    for image in "${IMAGES[@]}"; do
        echo -e "\n${BLUE}🔍 Processing $image${NC}"
        echo -e "${BLUE}========================${NC}"
        
        # Check if image exists
        if ! docker image inspect $image >/dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Image $image not found, skipping...${NC}"
            continue
        fi
        
        # Run security scans
        scan_with_trivy $image
        scan_with_docker_scout $image
        analyze_image_optimization $image
        
        echo -e "${GREEN}✅ Completed scanning $image${NC}\n"
    done
    
    echo -e "${GREEN}🎉 All security scans completed!${NC}"
    echo -e "${BLUE}📁 Reports saved in: $(pwd)${NC}"
}

# Run with error handling
trap 'echo -e "${RED}❌ Security scan failed${NC}"' ERR

main "$@"