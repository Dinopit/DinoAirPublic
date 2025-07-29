# DinoAir Docker Multi-Stage Build Makefile
# Simplifies building, testing, and managing optimized Docker images

.PHONY: build build-dev build-prod test security-scan clean help

# Variables
DOCKER_BUILDKIT := 1
SERVICES := web-gui web-gui-node comfyui main
ENVIRONMENT := production

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

# Default target
help:
	@echo -e "$(BLUE)DinoAir Docker Multi-Stage Build Commands$(NC)"
	@echo -e "$(BLUE)=========================================$(NC)"
	@echo ""
	@echo -e "$(GREEN)Build Commands:$(NC)"
	@echo "  make build          - Build all services for production"
	@echo "  make build-dev      - Build all services for development"
	@echo "  make build-prod     - Build all services for production (alias)"
	@echo "  make build-service SERVICE=<name> - Build specific service"
	@echo ""
	@echo -e "$(GREEN)Test Commands:$(NC)"
	@echo "  make test           - Run comprehensive tests"
	@echo "  make test-build     - Test build process only"
	@echo "  make security-scan  - Run security vulnerability scans"
	@echo ""
	@echo -e "$(GREEN)Management Commands:$(NC)"
	@echo "  make clean          - Clean up Docker artifacts"
	@echo "  make size-report    - Show image size comparison"
	@echo "  make up             - Start production stack"
	@echo "  make up-dev         - Start development stack"
	@echo "  make down           - Stop all stacks"
	@echo ""
	@echo -e "$(GREEN)Available Services:$(NC) $(SERVICES)"

# Build all services for production
build: build-prod

build-prod:
	@echo -e "$(BLUE)🚀 Building all services for production...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	cd web-gui && \
	docker build --target runtime --tag dinoair-web-gui:latest . && \
	cd ../web-gui-node && \
	docker build --target runtime --tag dinoair-web-gui-node:latest . && \
	cd .. && \
	docker build --target runtime --tag dinoair-main:latest . && \
	docker build --target runtime --tag dinoair-comfyui:latest -f comfyui.Dockerfile .
	@echo -e "$(GREEN)✅ Production build completed$(NC)"

# Build all services for development
build-dev:
	@echo -e "$(BLUE)🚀 Building all services for development...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	cd web-gui && \
	docker build --target development --tag dinoair-web-gui:dev . && \
	cd ../web-gui-node && \
	docker build --target development --tag dinoair-web-gui-node:dev . && \
	cd .. && \
	docker build --target development --tag dinoair-main:dev . && \
	docker build --target development --tag dinoair-comfyui:dev -f comfyui.Dockerfile .
	@echo -e "$(GREEN)✅ Development build completed$(NC)"

# Build specific service
build-service:
	@if [ -z "$(SERVICE)" ]; then \
		echo -e "$(YELLOW)⚠️  Please specify SERVICE=<name>$(NC)"; \
		echo -e "Available services: $(SERVICES)"; \
		exit 1; \
	fi
	@echo -e "$(BLUE)🔨 Building $(SERVICE) for $(ENVIRONMENT)...$(NC)"
	@export DOCKER_BUILDKIT=$(DOCKER_BUILDKIT) && \
	case $(SERVICE) in \
		web-gui) \
			cd web-gui && \
			docker build --target runtime --tag dinoair-web-gui:$(ENVIRONMENT) . ;; \
		web-gui-node) \
			cd web-gui-node && \
			docker build --target runtime --tag dinoair-web-gui-node:$(ENVIRONMENT) . ;; \
		comfyui) \
			docker build --target runtime --tag dinoair-comfyui:$(ENVIRONMENT) -f comfyui.Dockerfile . ;; \
		main) \
			docker build --target runtime --tag dinoair-main:$(ENVIRONMENT) . ;; \
		*) \
			echo -e "$(YELLOW)⚠️  Unknown service: $(SERVICE)$(NC)"; \
			exit 1 ;; \
	esac
	@echo -e "$(GREEN)✅ $(SERVICE) build completed$(NC)"

# Run comprehensive tests
test:
	@echo -e "$(BLUE)🧪 Running comprehensive tests...$(NC)"
	@chmod +x scripts/build-and-test.sh
	@./scripts/build-and-test.sh

# Test build process only
test-build:
	@echo -e "$(BLUE)🔨 Testing build process...$(NC)"
	@make build-dev
	@make build-prod
	@echo -e "$(GREEN)✅ Build test completed$(NC)"

# Run security scans
security-scan:
	@echo -e "$(BLUE)🔍 Running security scans...$(NC)"
	@chmod +x scripts/security-scan.sh
	@./scripts/security-scan.sh

# Show image size comparison
size-report:
	@echo -e "$(BLUE)📊 Docker Image Size Report$(NC)"
	@echo -e "$(BLUE)===========================$(NC)"
	@echo ""
	@echo -e "$(GREEN)DinoAir Images:$(NC)"
	@docker images | grep dinoair | sort
	@echo ""
	@echo -e "$(GREEN)Total size:$(NC)"
	@docker images | grep dinoair | awk '{size += $$7} END {print size " (estimated)"}'

# Start production stack
up:
	@echo -e "$(BLUE)🚀 Starting production stack...$(NC)"
	@cd web-gui && docker-compose up -d
	@echo -e "$(GREEN)✅ Production stack started$(NC)"
	@echo -e "$(BLUE)Web GUI: http://localhost:3000$(NC)"
	@echo -e "$(BLUE)ComfyUI: http://localhost:8188$(NC)"

# Start development stack
up-dev:
	@echo -e "$(BLUE)🚀 Starting development stack...$(NC)"
	@cd web-gui && docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo -e "$(GREEN)✅ Development stack started$(NC)"
	@echo -e "$(BLUE)Web GUI (dev): http://localhost:3000$(NC)"
	@echo -e "$(BLUE)Web GUI Node: http://localhost:3001$(NC)"
	@echo -e "$(BLUE)ComfyUI: http://localhost:8188$(NC)"

# Stop all stacks
down:
	@echo -e "$(BLUE)🛑 Stopping all stacks...$(NC)"
	@cd web-gui && docker-compose -f docker-compose.yml -f docker-compose.dev.yml down || true
	@cd web-gui && docker-compose down || true
	@echo -e "$(GREEN)✅ All stacks stopped$(NC)"

# Clean up Docker artifacts
clean:
	@echo -e "$(BLUE)🧹 Cleaning up Docker artifacts...$(NC)"
	@docker container prune -f
	@docker image prune -f
	@docker volume prune -f
	@docker network prune -f
	@echo -e "$(GREEN)✅ Cleanup completed$(NC)"

# Clean all DinoAir images
clean-images:
	@echo -e "$(BLUE)🗑️  Removing all DinoAir images...$(NC)"
	@docker images | grep dinoair | awk '{print $$3}' | xargs -r docker rmi -f
	@echo -e "$(GREEN)✅ DinoAir images removed$(NC)"

# Show running containers
status:
	@echo -e "$(BLUE)📋 Container Status$(NC)"
	@echo -e "$(BLUE)=================$(NC)"
	@docker ps --filter "name=dinoair" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Show logs for all services
logs:
	@echo -e "$(BLUE)📜 Service Logs$(NC)"
	@echo -e "$(BLUE)===============$(NC)"
	@cd web-gui && docker-compose logs --tail=50 -f

# Show logs for specific service
logs-service:
	@if [ -z "$(SERVICE)" ]; then \
		echo -e "$(YELLOW)⚠️  Please specify SERVICE=<name>$(NC)"; \
		exit 1; \
	fi
	@cd web-gui && docker-compose logs --tail=50 -f $(SERVICE)

# Development helpers
shell:
	@if [ -z "$(SERVICE)" ]; then \
		echo -e "$(YELLOW)⚠️  Please specify SERVICE=<name>$(NC)"; \
		exit 1; \
	fi
	@docker exec -it dinoair-$(SERVICE) sh

# Show Docker system information
info:
	@echo -e "$(BLUE)🔧 Docker System Information$(NC)"
	@echo -e "$(BLUE)============================$(NC)"
	@docker system df
	@echo ""
	@docker buildx du || echo "BuildKit cache info not available"