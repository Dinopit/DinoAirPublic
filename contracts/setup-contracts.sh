#!/bin/bash

# DinoAir Contract Testing Setup Script
# This script helps set up and run contract testing for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

echo "DinoAir Contract Testing Setup"
echo "==============================="
echo

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker and try again."
    exit 1
fi

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

print_success "All prerequisites are installed"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_warning "Node.js version is $NODE_VERSION. Version 18+ is recommended."
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Function to install dependencies
install_dependencies() {
    print_status "Installing frontend dependencies..."
    cd web-gui
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_status "Frontend dependencies already installed"
    fi
    
    print_status "Installing backend dependencies..."
    cd ../web-gui-node
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_status "Backend dependencies already installed"
    fi
    
    cd "$PROJECT_ROOT"
    print_success "Dependencies installed"
}

# Function to start Pact Broker
start_pact_broker() {
    print_status "Starting Pact Broker..."
    cd contracts/pact-broker
    
    if port_in_use 9292; then
        print_warning "Port 9292 is already in use. Pact Broker may already be running."
        print_status "Checking if Pact Broker is responding..."
        if curl -s http://localhost:9292 >/dev/null 2>&1; then
            print_success "Pact Broker is already running at http://localhost:9292"
        else
            print_error "Port 9292 is in use but Pact Broker is not responding"
            exit 1
        fi
    else
        docker-compose up -d
        print_status "Waiting for Pact Broker to start..."
        sleep 10
        
        # Wait for broker to be ready
        for i in {1..30}; do
            if curl -s http://localhost:9292 >/dev/null 2>&1; then
                print_success "Pact Broker is running at http://localhost:9292"
                break
            fi
            sleep 2
        done
        
        if ! curl -s http://localhost:9292 >/dev/null 2>&1; then
            print_error "Pact Broker failed to start"
            exit 1
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

# Function to run consumer tests
run_consumer_tests() {
    print_status "Running consumer contract tests..."
    cd web-gui
    npm run test:contracts:consumer
    print_success "Consumer tests completed"
    cd "$PROJECT_ROOT"
}

# Function to run provider tests
run_provider_tests() {
    print_status "Running provider contract verification..."
    cd web-gui-node
    npm run test:contracts:provider
    print_success "Provider verification completed"
    cd "$PROJECT_ROOT"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  setup     - Install dependencies and start Pact Broker"
    echo "  consumer  - Run consumer contract tests"
    echo "  provider  - Run provider contract verification" 
    echo "  full      - Run complete contract testing workflow"
    echo "  broker    - Start Pact Broker only"
    echo "  help      - Show this help message"
    echo
    echo "Examples:"
    echo "  $0 setup     # Set up everything"
    echo "  $0 full      # Run all tests"
    echo "  $0 consumer  # Run consumer tests only"
    echo
}

# Main script logic
case "${1:-setup}" in
    setup)
        install_dependencies
        start_pact_broker
        print_success "Setup complete! You can now run contract tests."
        echo "Access Pact Broker at: http://localhost:9292"
        echo "Username: pact_broker, Password: pact_broker"
        ;;
    
    consumer)
        run_consumer_tests
        ;;
    
    provider)
        run_provider_tests
        ;;
    
    full)
        run_consumer_tests
        run_provider_tests
        print_success "Full contract testing completed successfully!"
        ;;
    
    broker)
        start_pact_broker
        ;;
    
    help)
        show_help
        ;;
    
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac