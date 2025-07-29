#!/bin/bash

# DinoAir Container Security Scanner
# This script provides local security scanning capabilities for developers

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/security-reports"
DOCKERFILE_PATH="$PROJECT_ROOT/Dockerfile"
IMAGE_NAME="dinoair-web-gui:security-scan"

# Create reports directory
mkdir -p "$REPORTS_DIR"

echo -e "${BLUE}🛡️  DinoAir Container Security Scanner${NC}"
echo "================================================"

# Function to check if Trivy is installed
check_trivy() {
    if ! command -v trivy &> /dev/null; then
        echo -e "${YELLOW}⚠️  Trivy not found. Installing...${NC}"
        
        # Install Trivy based on OS
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            sudo apt-get update && sudo apt-get install -y wget apt-transport-https gnupg lsb-release
            wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
            echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
            sudo apt-get update && sudo apt-get install -y trivy
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install trivy
            else
                echo -e "${RED}❌ Please install Homebrew or download Trivy manually${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Unsupported OS. Please install Trivy manually: https://trivy.dev/installation/${NC}"
            exit 1
        fi
    fi
}

# Function to scan base images
scan_base_images() {
    echo -e "${BLUE}🔍 Scanning base images...${NC}"
    
    # Scan Node.js base image
    echo -e "${YELLOW}Scanning node:20-alpine...${NC}"
    trivy image --severity CRITICAL,HIGH,MEDIUM \
        --format json \
        --output "$REPORTS_DIR/base-node-scan.json" \
        node:20-alpine
    
    # Scan Python base image
    echo -e "${YELLOW}Scanning python:3.11-slim...${NC}"
    trivy image --severity CRITICAL,HIGH,MEDIUM \
        --format json \
        --output "$REPORTS_DIR/base-python-scan.json" \
        python:3.11-slim
    
    echo -e "${GREEN}✅ Base image scans completed${NC}"
}

# Function to scan filesystem dependencies
scan_dependencies() {
    echo -e "${BLUE}🔍 Scanning dependencies...${NC}"
    
    # Scan filesystem for vulnerabilities
    trivy fs --severity CRITICAL,HIGH,MEDIUM \
        --format json \
        --output "$REPORTS_DIR/dependencies-scan.json" \
        "$PROJECT_ROOT"
    
    # NPM audit if package.json exists
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        echo -e "${YELLOW}Running npm audit...${NC}"
        cd "$PROJECT_ROOT"
        npm audit --json > "$REPORTS_DIR/npm-audit.json" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Dependency scans completed${NC}"
}

# Function to scan secrets
scan_secrets() {
    echo -e "${BLUE}🔍 Scanning for secrets...${NC}"
    
    trivy fs --scanners secret \
        --format json \
        --output "$REPORTS_DIR/secrets-scan.json" \
        "$PROJECT_ROOT"
    
    echo -e "${GREEN}✅ Secret scan completed${NC}"
}

# Function to scan configuration
scan_config() {
    echo -e "${BLUE}🔍 Scanning configuration...${NC}"
    
    if [[ -f "$DOCKERFILE_PATH" ]]; then
        trivy config --severity CRITICAL,HIGH,MEDIUM \
            --format json \
            --output "$REPORTS_DIR/config-scan.json" \
            "$DOCKERFILE_PATH"
    fi
    
    # Scan Docker Compose if it exists
    if [[ -f "$PROJECT_ROOT/docker-compose.yml" ]]; then
        trivy config --severity CRITICAL,HIGH,MEDIUM \
            --format json \
            --output "$REPORTS_DIR/docker-compose-scan.json" \
            "$PROJECT_ROOT/docker-compose.yml"
    fi
    
    echo -e "${GREEN}✅ Configuration scan completed${NC}"
}

# Function to build and scan container image
scan_container() {
    echo -e "${BLUE}🔍 Building and scanning container image...${NC}"
    
    if [[ -f "$DOCKERFILE_PATH" ]]; then
        # Build the image
        echo -e "${YELLOW}Building container image...${NC}"
        docker build -t "$IMAGE_NAME" -f "$DOCKERFILE_PATH" "$PROJECT_ROOT"
        
        # Scan the built image
        echo -e "${YELLOW}Scanning container image...${NC}"
        trivy image --severity CRITICAL,HIGH,MEDIUM \
            --format json \
            --output "$REPORTS_DIR/container-scan.json" \
            "$IMAGE_NAME"
        
        # Clean up the image
        docker rmi "$IMAGE_NAME" >/dev/null 2>&1 || true
        
        echo -e "${GREEN}✅ Container scan completed${NC}"
    else
        echo -e "${YELLOW}⚠️  No Dockerfile found, skipping container scan${NC}"
    fi
}

# Function to generate security report
generate_report() {
    echo -e "${BLUE}📊 Generating security report...${NC}"
    
    REPORT_FILE="$REPORTS_DIR/security-summary.html"
    
    cat > "$REPORT_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>DinoAir Security Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .critical { color: #dc3545; font-weight: bold; }
        .high { color: #fd7e14; font-weight: bold; }
        .medium { color: #ffc107; }
        .low { color: #28a745; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .scan-section { margin: 20px 0; border: 1px solid #ddd; padding: 15px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>🛡️ DinoAir Security Scan Report</h1>
    <div class="summary">
        <h2>Scan Summary</h2>
        <p><strong>Scan Date:</strong> $(date)</p>
        <p><strong>Project:</strong> DinoAir Web GUI</p>
        <p><strong>Scanned Components:</strong> Base Images, Dependencies, Secrets, Configuration, Container Image</p>
    </div>
EOF

    # Process scan results and add to report
    for scan_file in "$REPORTS_DIR"/*.json; do
        if [[ -f "$scan_file" ]]; then
            scan_name=$(basename "$scan_file" .json)
            echo "    <div class=\"scan-section\">" >> "$REPORT_FILE"
            echo "        <h3>$(echo $scan_name | tr '-' ' ' | sed 's/\b\w/\U&/g') Results</h3>" >> "$REPORT_FILE"
            
            # Count vulnerabilities by severity (this is a simplified version)
            if command -v jq &> /dev/null; then
                critical=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length' "$scan_file" 2>/dev/null || echo "0")
                high=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length' "$scan_file" 2>/dev/null || echo "0")
                medium=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "MEDIUM")] | length' "$scan_file" 2>/dev/null || echo "0")
                low=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "LOW")] | length' "$scan_file" 2>/dev/null || echo "0")
                
                echo "        <p><span class=\"critical\">Critical: $critical</span> | " >> "$REPORT_FILE"
                echo "        <span class=\"high\">High: $high</span> | " >> "$REPORT_FILE"
                echo "        <span class=\"medium\">Medium: $medium</span> | " >> "$REPORT_FILE"
                echo "        <span class=\"low\">Low: $low</span></p>" >> "$REPORT_FILE"
            else
                echo "        <p>Detailed results available in: $scan_file</p>" >> "$REPORT_FILE"
            fi
            
            echo "    </div>" >> "$REPORT_FILE"
        fi
    done
    
    cat >> "$REPORT_FILE" << 'EOF'
    <div class="summary">
        <h2>Next Steps</h2>
        <ul>
            <li>Review critical and high severity vulnerabilities first</li>
            <li>Update dependencies with known vulnerabilities</li>
            <li>Address any detected secrets or misconfigurations</li>
            <li>Consider updating base images if vulnerabilities are found</li>
        </ul>
    </div>
</body>
</html>
EOF

    echo -e "${GREEN}✅ Security report generated: $REPORT_FILE${NC}"
}

# Function to display summary
display_summary() {
    echo -e "${BLUE}📋 Security Scan Summary${NC}"
    echo "=================================="
    
    # Count total vulnerabilities if jq is available
    if command -v jq &> /dev/null; then
        total_critical=0
        total_high=0
        total_medium=0
        total_low=0
        
        for scan_file in "$REPORTS_DIR"/*.json; do
            if [[ -f "$scan_file" ]]; then
                critical=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length' "$scan_file" 2>/dev/null || echo "0")
                high=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length' "$scan_file" 2>/dev/null || echo "0")
                medium=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "MEDIUM")] | length' "$scan_file" 2>/dev/null || echo "0")
                low=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "LOW")] | length' "$scan_file" 2>/dev/null || echo "0")
                
                total_critical=$((total_critical + critical))
                total_high=$((total_high + high))
                total_medium=$((total_medium + medium))
                total_low=$((total_low + low))
            fi
        done
        
        echo -e "Critical: ${RED}$total_critical${NC}"
        echo -e "High: ${YELLOW}$total_high${NC}"
        echo -e "Medium: ${YELLOW}$total_medium${NC}"
        echo -e "Low: ${GREEN}$total_low${NC}"
        
        # Security status
        if [ "$total_critical" -gt 0 ]; then
            echo -e "\n${RED}❌ FAILED: Critical vulnerabilities found${NC}"
            exit 1
        elif [ "$total_high" -gt 5 ]; then
            echo -e "\n${YELLOW}⚠️  WARNING: High number of high-severity vulnerabilities${NC}"
        else
            echo -e "\n${GREEN}✅ PASSED: Security scan completed successfully${NC}"
        fi
    fi
    
    echo -e "\nReports saved in: $REPORTS_DIR"
}

# Main execution
main() {
    # Parse command line arguments
    SCAN_ALL=true
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --base-images)
                SCAN_ALL=false
                scan_base_images
                shift
                ;;
            --dependencies)
                SCAN_ALL=false
                scan_dependencies
                shift
                ;;
            --secrets)
                SCAN_ALL=false
                scan_secrets
                shift
                ;;
            --config)
                SCAN_ALL=false
                scan_config
                shift
                ;;
            --container)
                SCAN_ALL=false
                scan_container
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --base-images    Scan base images only"
                echo "  --dependencies   Scan dependencies only"
                echo "  --secrets        Scan for secrets only"
                echo "  --config         Scan configuration only"
                echo "  --container      Build and scan container only"
                echo "  --help          Show this help message"
                echo ""
                echo "If no options are provided, all scans will be performed."
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Run all scans if no specific scan was requested
    if [ "$SCAN_ALL" = true ]; then
        check_trivy
        scan_base_images
        scan_dependencies
        scan_secrets
        scan_config
        scan_container
        generate_report
    fi
    
    display_summary
}

# Run main function with all arguments
main "$@"