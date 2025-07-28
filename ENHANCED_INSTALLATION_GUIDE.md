# DinoAir Enhanced Installation and Operations Guide

This guide covers the enhanced DinoAir installation system with improved reliability, monitoring, and deployment capabilities.

## 🚀 Quick Start

### 1. System Requirements Check
```bash
python check_requirements.py
```

### 2. Enhanced Installation 
```bash
python install_enhanced.py
```

### 3. Start DinoAir
```bash
python start_enhanced.py
```

## 📋 Available Scripts

### System Management
- `check_requirements.py` - Validate system requirements before installation
- `install_enhanced.py` - Enhanced installer with backup and validation
- `start_enhanced.py` - Enhanced startup with service orchestration
- `troubleshoot.py` - Automated troubleshooting and diagnostics

### Development Tools
- `requirements_manager.py generate` - Generate enhanced requirements files
- `requirements_manager.py check` - Check installed dependencies
- `requirements_manager.py update` - Update all dependencies

### Testing
- `python -m pytest tests/test_enhanced_installation.py` - Run unit tests
- `python tests/integration_test.py` - Run integration tests

## 🏗️ Architecture Overview

### Core Components

#### Configuration Management (`config/`)
- **ConfigManager**: Centralized configuration with environment variable support
- **config.yaml**: Main application configuration
- **services.json**: Service-specific settings
- **security.json**: Security and authentication settings

#### Service Management (`services/`)
- **ServiceManager**: Orchestrates ComfyUI, Ollama, and Web GUI services
- Health checking and automatic restart capabilities
- Service dependency management

#### Performance Monitoring (`utils/`)
- **PerformanceMonitor**: Real-time system metrics collection
- Resource usage alerts and optimization suggestions
- Metrics export and historical tracking

#### Security Framework (`security/`)
- **SecurityManager**: API key generation, password validation
- Input sanitization and file upload validation
- JWT token handling (simplified implementation)

## 📦 Installation Options

### Option 1: Enhanced Installation (Recommended)
```bash
# Check system first
python check_requirements.py

# Run enhanced installer
python install_enhanced.py

# Start with enhanced features
python start_enhanced.py
```

### Option 2: Docker Deployment
```bash
# Build and start with enhanced Docker setup
docker-compose -f docker-compose.enhanced.yml up --build

# Or use the enhanced Dockerfile
docker build -f Dockerfile.enhanced -t dinoair-enhanced .
docker run -p 3000:3000 -p 8188:8188 -p 11434:11434 dinoair-enhanced
```

### Option 3: Development Setup
```bash
# Generate development requirements
python requirements_manager.py generate

# Install development dependencies
pip install -r requirements-dev.txt

# Run tests
python -m pytest tests/
```

## 🔧 Configuration

### Environment Variables
The enhanced system supports these environment variables:

```bash
# Service Ports
WEB_GUI_PORT=3000
COMFYUI_PORT=8188
OLLAMA_PORT=11434

# API Configuration
API_KEY=your-api-key
JWT_SECRET=your-jwt-secret

# Model Paths
OLLAMA_MODELS=/path/to/ollama/models
COMFYUI_MODELS=/path/to/comfyui/models

# Performance
MAX_WORKERS=4
REQUEST_TIMEOUT=300
RATE_LIMIT_PER_MINUTE=60

# Development
DEBUG=false
LOG_LEVEL=INFO
```

### Configuration Files

#### config/services.json
```json
{
  "comfyui": {
    "enabled": true,
    "host": "localhost",
    "port": 8188,
    "healthcheck_interval": 30
  },
  "ollama": {
    "enabled": true,
    "host": "localhost", 
    "port": 11434,
    "models": ["qwen", "llama"],
    "default_model": "qwen"
  },
  "web_gui": {
    "enabled": true,
    "host": "localhost",
    "port": 3000
  }
}
```

## 🔍 Monitoring and Troubleshooting

### System Health Check
```bash
# Quick system validation
python check_requirements.py

# Comprehensive troubleshooting
python troubleshoot.py

# Service status check
python -c "from services.service_manager import ServiceManager; print(ServiceManager().get_service_status())"
```

### Performance Monitoring
```bash
# Start with monitoring
python start_enhanced.py  # Includes performance monitoring

# Export metrics
python -c "from utils.performance_monitor import PerformanceMonitor; PerformanceMonitor().export_metrics('metrics.json')"
```

### Common Issues

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :3000
lsof -i :8188
lsof -i :11434

# Or use troubleshooter
python troubleshoot.py
```

#### Missing Dependencies
```bash
# Check and install missing packages
python requirements_manager.py check
pip install -r requirements.txt
```

#### Configuration Issues
```bash
# Validate configuration
python -c "from config.config_manager import ConfigManager; print(ConfigManager().validate_config())"
```

## 🧪 Testing

### Unit Tests
```bash
# Run all enhanced installation tests
python -m pytest tests/test_enhanced_installation.py -v

# Run specific test
python -m pytest tests/test_enhanced_installation.py::TestDinoAirEnhancedInstallation::test_system_requirements_checker -v
```

### Integration Tests
```bash
# Run integration tests
python tests/integration_test.py

# Check integration test report
cat integration_test_report.json
```

### Test Coverage
The test suite covers:
- ✅ System requirements validation
- ✅ Configuration management
- ✅ Service management imports
- ✅ Performance monitoring
- ✅ Directory structure
- ✅ Requirements files generation
- ✅ Module functionality

## 🐳 Docker Deployment

### Enhanced Docker Setup
```bash
# Build enhanced image
docker build -f Dockerfile.enhanced -t dinoair-enhanced .

# Run with docker-compose (includes monitoring)
docker-compose -f docker-compose.enhanced.yml up -d

# Check service health
docker-compose -f docker-compose.enhanced.yml ps
```

### Docker Features
- Multi-stage build for optimized image size
- Non-root user for security
- Health checks for all services
- Volume mounts for data persistence
- Integrated monitoring with Prometheus/Grafana

## 📊 Monitoring Stack

When using Docker deployment, you get:
- **Prometheus** (port 9090): Metrics collection
- **Grafana** (port 3001): Dashboards and visualization
- **Nginx** (port 80/443): Reverse proxy and load balancing

## 🔒 Security Features

- API key generation and validation
- Password strength requirements
- Input sanitization
- File upload validation
- Rate limiting support
- CORS configuration

## 🆕 What's New

### Enhanced Features
1. **System Validation**: Pre-installation checks prevent common issues
2. **Service Orchestration**: Automated service management with health checks
3. **Performance Monitoring**: Real-time metrics and optimization suggestions
4. **Security Framework**: API keys, password validation, input sanitization
5. **Configuration Management**: Centralized config with environment variable support
6. **Troubleshooting Tools**: Automated diagnostics and fixes
7. **Docker Support**: Production-ready containerization
8. **Testing Framework**: Comprehensive test coverage

### Backward Compatibility
- All existing installation methods continue to work
- Enhanced scripts work alongside original scripts
- No breaking changes to existing configurations

## 📞 Support

If you encounter issues:

1. **Run the troubleshooter**: `python troubleshoot.py`
2. **Check the logs**: `tail -f logs/install_*.log`
3. **Validate system**: `python check_requirements.py`
4. **Run tests**: `python -m pytest tests/`

## 🎯 Next Steps

After installation:
1. Review the `.env` file and adjust settings
2. Configure your models in `config/models.yaml`
3. Set up monitoring dashboards if using Docker
4. Run integration tests to verify everything works
5. Access the web interface at http://localhost:3000

The enhanced DinoAir installation provides a robust, monitored, and maintainable deployment suitable for both development and production use.