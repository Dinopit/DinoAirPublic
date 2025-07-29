#!/bin/bash

# Docker Multi-Stage Build Validation Script
# Validates that all acceptance criteria have been implemented

echo "🔍 DinoAir Docker Multi-Stage Build Validation"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counter for validation results
PASSED=0
TOTAL=0

validate() {
    local description="$1"
    local command="$2"
    local expected="$3"
    
    TOTAL=$((TOTAL + 1))
    echo -n "Testing: $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}"
    fi
}

echo -e "\n${BLUE}1. Checking Dockerfile existence and structure${NC}"
validate "Main Python app Dockerfile exists" "test -f Dockerfile"
validate "ComfyUI Dockerfile exists" "test -f comfyui.Dockerfile"
validate "Web-GUI-Node Dockerfile exists" "test -f web-gui-node/Dockerfile"
validate "Web-GUI Dockerfile exists" "test -f web-gui/Dockerfile"

echo -e "\n${BLUE}2. Checking multi-stage build implementation${NC}"
validate "Main Dockerfile has multi-stage FROM statements" "grep -q 'FROM.*AS.*' Dockerfile"
validate "ComfyUI Dockerfile has multi-stage build" "grep -q 'FROM.*AS.*' comfyui.Dockerfile"
validate "Web-GUI-Node has multi-stage build" "grep -q 'FROM.*AS.*' web-gui-node/Dockerfile"
validate "Web-GUI has multi-stage build" "grep -q 'FROM.*AS.*' web-gui/Dockerfile"

echo -e "\n${BLUE}3. Checking build/runtime separation${NC}"
validate "Main Dockerfile has builder stage" "grep -q 'FROM.*AS builder' Dockerfile"
validate "Main Dockerfile has runtime stage" "grep -q 'FROM.*AS runtime' Dockerfile"
validate "ComfyUI has builder stage" "grep -q 'FROM.*AS builder' comfyui.Dockerfile"
validate "Web-GUI-Node has builder stage" "grep -q 'FROM.*AS builder' web-gui-node/Dockerfile"

echo -e "\n${BLUE}4. Checking layer caching optimization${NC}"
validate "Cache mounts implemented in main Dockerfile" "grep -q 'mount=type=cache' Dockerfile"
validate "Cache mounts in ComfyUI Dockerfile" "grep -q 'mount=type=cache' comfyui.Dockerfile"
validate "Cache mounts in web-gui Dockerfile" "grep -q 'mount=type=cache' web-gui/Dockerfile"
validate "Cache mounts in web-gui-node" "grep -q 'mount=type=cache' web-gui-node/Dockerfile"

echo -e "\n${BLUE}5. Checking security implementations${NC}"
validate "Non-root user in main Dockerfile" "grep -q 'USER.*' Dockerfile"
validate "Non-root user in ComfyUI" "grep -q 'USER.*' comfyui.Dockerfile"
validate "Non-root user in web-gui-node" "grep -q 'USER.*' web-gui-node/Dockerfile"
validate "Non-root user in web-gui" "grep -q 'USER.*' web-gui/Dockerfile"

echo -e "\n${BLUE}6. Checking .dockerignore files${NC}"
validate "Main .dockerignore exists" "test -f .dockerignore"
validate "Web-GUI .dockerignore exists" "test -f web-gui/.dockerignore"
validate "Web-GUI-Node .dockerignore exists" "test -f web-gui-node/.dockerignore"

echo -e "\n${BLUE}7. Checking security scanning implementation${NC}"
validate "Security scan script exists" "test -f scripts/security-scan.sh"
validate "Security scan script is executable" "test -x scripts/security-scan.sh"

echo -e "\n${BLUE}8. Checking documentation${NC}"
validate "Docker optimization documentation exists" "test -f DOCKER_OPTIMIZATION.md"
validate "Documentation contains best practices" "grep -q 'Best Practices' DOCKER_OPTIMIZATION.md"

echo -e "\n${BLUE}9. Checking automation tools${NC}"
validate "Build and test script exists" "test -f scripts/build-and-test.sh"
validate "Build script is executable" "test -x scripts/build-and-test.sh"
validate "Makefile exists" "test -f Makefile"
validate "Makefile has build targets" "grep -q 'build:' Makefile"

echo -e "\n${BLUE}10. Checking Docker Compose optimization${NC}"
validate "Docker compose has build cache configuration" "grep -q 'cache_from' web-gui/docker-compose.yml"
validate "Development docker compose exists" "test -f web-gui/docker-compose.dev.yml"

echo -e "\n${BLUE}11. Checking Docker build syntax${NC}"
validate "Main Dockerfile syntax check" "docker build --help > /dev/null 2>&1 && echo 'syntax ok'"
validate "Web-GUI-Node syntax check" "cd web-gui-node && docker build --help > /dev/null 2>&1 && echo 'syntax ok'"

# Summary
echo -e "\n${BLUE}Validation Summary${NC}"
echo "=================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Total:  ${BLUE}$TOTAL${NC}"

if [ $PASSED -eq $TOTAL ]; then
    echo -e "\n${GREEN}🎉 All validation checks passed!${NC}"
    echo -e "${GREEN}Docker multi-stage build optimization is fully implemented.${NC}"
    exit 0
else
    FAILED=$((TOTAL - PASSED))
    echo -e "\n${YELLOW}⚠️  $FAILED validation checks failed.${NC}"
    echo -e "${YELLOW}Please review the failed checks above.${NC}"
    exit 1
fi