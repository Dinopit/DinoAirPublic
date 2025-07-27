# DinoAir 🦕✨

![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Test Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

> A powerful, self-contained AI platform combining local language models with image generation capabilities. Built with modern web technologies and enterprise-grade features.

## 🔒 STABILITY RELEASE v1.2.0 🔒

**Major stability and reliability improvements have been implemented:**

### ✅ Installation & Reliability
- **Fixed**: Node.js/npm detection issues on Windows systems
- **New**: Enhanced installer (`install_safe.py`) with prerequisite checking and automatic rollback
- **New**: System resource validation before installation

### 🛡️ Security Enhancements
- **Authentication**: All API endpoints now require authentication (JWT/API key)
- **Rate Limiting**: Configurable request throttling to prevent abuse
- **Input Validation**: Request sanitization and validation middleware
- **Process Isolation**: Each service runs with configurable resource limits
- **CSP Consolidation**: Unified Content Security Policy configuration eliminates duplicate policies and prevents conflicts between server.js and validation.js middleware

### 💪 Stability Features (v1.2.0)
- **Circuit Breaker Protection**: Comprehensive circuit breaker implementation for all external service calls (Ollama, ComfyUI)
  - Configurable failure thresholds and automatic recovery
  - Real-time statistics and monitoring at `/api/system/circuit-breakers`
  - Prevents cascading failures when services are unavailable
- **Enhanced Input Validation**: Rate limiting added to all previously unprotected API routes
  - Health endpoints (`/api/health/*`)
  - System endpoints (`/api/system/*`) 
  - User management endpoints (`/users/*`)
- **Error Recovery & Retry Logic**: Intelligent retry mechanism with exponential backoff and jitter
  - Smart error categorization (network errors, timeouts, 5xx responses)
  - Integration with circuit breaker for comprehensive fault tolerance
  - Prevents thundering herd problems
- **Centralized Error Handling**: Structured error responses and proper HTTP status codes
- **Model Download Integrity**: Enhanced download process with checksum verification and resume capability
- **Memory Management**: Automatic model unloading to prevent crashes
- **Health Monitoring**: Automatic service restart on failure with circuit breaker integration
- **Graceful Shutdown**: Proper cleanup and state preservation
- **Artifact Storage Limits**: Enforced limits of 1000 artifacts and 100MB total storage with automatic LRU cleanup to prevent memory exhaustion
- **Authentication Race Conditions**: Request-level caching and locking mechanisms prevent concurrent authentication issues

### 📊 Operations & Monitoring
- **Resource Monitoring**: Real-time tracking of CPU, memory, disk usage
- **Comprehensive Logging**: Structured logs with automatic rotation
- **Backup System**: Automated backups with compression
- **Rollback Capability**: Snapshot-based recovery for failed updates

**Recommended**: Use the new `install_safe.py` installer for the most reliable installation experience.

See [CHANGELOG.md](CHANGELOG.md) for complete details.

---

## ⚠️ IMPORTANT STABILITY WARNING ⚠️

**This is Version 1.2.0 - STABLE RELEASE**

DinoAir v1.2.0 includes major stability improvements, but users should still be aware:

- 💻 **Resource Intensive**: May consume significant CPU/GPU resources
- 💾 **Data Safety**: Always backup important data before use
- 🛡️ **Test Environment Recommended**: Consider testing in a safe environment first

**The v1.2.0 update addresses many stability issues** and is much more reliable than previous versions. We appreciate your feedback!

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Development](#-development)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)
- [License](#-license)

## ✨ Features

### Core Capabilities
- 🤖 **Local AI Chat** - Powered by Ollama with multiple language models
- 🎨 **Image Generation** - SDXL and SD 1.5 support via ComfyUI integration
- 💾 **Artifact Management** - Store, organize, and manage generated content
- 🎭 **Multiple Personalities** - Customizable AI personalities for different use cases

### Recent Enhancements (v1.2.0)
- 🔒 **Enhanced Security**
  - JWT and API key authentication for all endpoints
  - Advanced rate limiting with multiple strategies
  - Request validation and sanitization
  - Process isolation and sandboxing
- 🛡️ **Stability Improvements**
  - Memory monitoring with automatic model unloading
  - Circuit breakers for external services
  - Health checks with auto-restart
  - Error boundaries and recovery mechanisms
- 🧪 **Testing & Quality Assurance**
  - Contract testing with Pact for API compatibility
  - Consumer-driven contract tests for frontend-backend integration
  - Automated contract verification in CI/CD pipeline
  - Comprehensive API contract documentation
- 📈 **Operational Excellence**
  - Comprehensive logging with rotation
  - Resource usage monitoring
  - Automated backup system
  - Rollback capabilities
- 🐛 **Critical Bug Fixes**
  - Windows installation issues resolved
  - ComfyUI installation reliability
  - Memory leak prevention
  - Race condition fixes

### Legacy Features (v1.0)
- 🔒 **Basic Security**
  - API key authentication system
  - Rate limiting protection
  - CORS header configuration
- 🐛 **Initial Bug Fixes**
  - PrismJS import resolution
  - SD 1.5 model compatibility
  - API authentication flow
- 📈 **Performance Optimizations**
  - Response caching
  - Lazy loading components
  - Bundle size optimization
- 🧪 **Comprehensive Testing**
  - Unit tests with Jest
  - Component tests with React Testing Library
  - E2E tests with Playwright
- 📚 **API Documentation**
  - Interactive Swagger UI at `/api-docs`
  - OpenAPI 3.0 specification
- 🚀 **Production Ready**
  - Docker support
  - CI/CD pipeline
  - Environment-based configuration

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Dinopit/DinoAirPublic.git
cd DinoAirPublic

# Use the new safe installer (recommended)
python install_safe.py

# Or use the original installer
python install.py

# Start the application
python start.py

# Open your browser at http://localhost:3000
```

## 📋 Prerequisites

Ensure you have the following installed:

| Requirement | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Backend services & ComfyUI |
| Node.js | 18+ | Web GUI & build tools |
| Ollama | Latest | Local AI models |
| Git | Any | Dependency management |

**System Requirements:**

DinoAir now features automatic hardware detection and adaptive configuration! The installer will automatically detect your system capabilities and recommend the best mode for your hardware.

### Minimum Requirements (Easy Mode - CPU Only)
- **OS**: Windows 10/11, Ubuntu 20.04+, macOS 11+
- **CPU**: 4-core processor (2015 or newer)
- **RAM**: 4GB (8GB recommended)
- **Storage**: 10GB free space
- **GPU**: Not required
- **Models**: Qwen 1.5B, limited features

### Recommended Requirements (Standard Mode)
- **OS**: Windows 10/11, Ubuntu 20.04+, macOS 11+
- **CPU**: 8-core processor
- **RAM**: 16GB
- **Storage**: 30GB free space
- **GPU**: Dedicated GPU (4GB+ VRAM)
- **Models**: Qwen 7B, most features

### Optimal Requirements (Pro Mode - For Developers)
- **OS**: Windows 10/11, Ubuntu 20.04+, macOS 11+
- **CPU**: 12+ core processor
- **RAM**: 32GB+
- **Storage**: 100GB free space
- **GPU**: High-end GPU (24GB+ VRAM)
- **Models**: Qwen 14B+, all features including image generation

**Note**: The hardware detection system will automatically configure DinoAir to run optimally on your system, selecting appropriate models and features based on available resources.

📖 **For detailed requirements by hardware tier, see [SYSTEM_REQUIREMENTS.md](SYSTEM_REQUIREMENTS.md)**

## 🔧 Installation

### Automated Installation (Recommended)

```bash
# Run the enhanced installer with safety features
python install_safe.py

# Or for a check-only mode
python install_safe.py --check-only
```

The enhanced installer will:
- ✅ Validate all prerequisites with detailed checks
- ✅ Verify system resources (CPU, RAM, disk space)
- ✅ Install ComfyUI with automatic fallbacks
- ✅ Configure security settings
- ✅ Set up monitoring and logging
- ✅ Create rollback points for safety

### Electron Desktop Installer (New!)

DinoAir now includes a professional desktop installer built with Electron, providing a user-friendly installation experience across all platforms.

**Key Features:**
- 🦕 **Custom Application Icons** - Beautiful DinoAir dinosaur-themed icons for all platforms
- 🔍 **Hardware Detection** - Automatic system capability detection with Python script integration
- 📁 **Installation Path Customization** - Choose where to install DinoAir on your system
- 🔒 **Code Signing Support** - Configuration ready for trusted application distribution

**To use the desktop installer:**
1. Navigate to the `installer/` directory
2. Run `npm install` to install dependencies
3. Use `npm start` for development or `npm run dist` to build installers

For detailed instructions on building and customizing the installer, see [`installer/README.md`](installer/README.md).

### Manual Installation

```bash
# Install ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI && pip install -r requirements.txt

# Install web dependencies
cd web-gui && npm install

# Download models
python download_models.py
```

### Model Options

1. **SDXL Models** (~7.3GB)
   - Base model: `sd_xl_base_1.0.safetensors`
   - VAE: `sdxl_vae.safetensors`

2. **SD 1.5 Models** (~4GB)
   - Compatible with the fixed workflow system
   - Place in `ComfyUI/models/checkpoints`

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the `web-gui` directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
DINOAIR_API_KEY=your-secure-api-key-here
DINOAIR_SECRET_KEY=minimum-32-character-secret-key

# ComfyUI Settings
COMFYUI_URL=http://localhost:8188
COMFYUI_TIMEOUT=300000

# Ollama Settings
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2-vl:7b

# Security
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Development
NODE_ENV=production
```

### Advanced Configuration

Copy `config.example.yaml` to `config.yaml` for advanced settings:

```yaml
# See config.example.yaml for all available options
security:
  secret_key: ${DINOAIR_SECRET_KEY}
  jwt_algorithm: HS256
  jwt_expiry_hours: 24

resources:
  max_memory_mb: 8192
  max_cpu_percent: 80.0

monitoring:
  enabled: true
  health_check_interval: 30
```

### API Key Setup

Generate a secure API key:

```bash
# Generate a random API key
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Add to your environment or `.env.local` file.

## 💻 Usage

### Starting the Application

```bash
# Start all services with safety features
python start.py

# Or start individually:
# ComfyUI
cd ComfyUI && python main.py

# Web GUI (development)
cd web-gui && npm run dev

# Web GUI (production)
cd web-gui && npm run build && npm start
```

### Web Interface

Navigate to `http://localhost:3000` to access:

- **Chat Interface** - Interactive AI conversations
- **Image Generation** - Text-to-image creation
- **Artifacts** - Manage generated content
- **Settings** - Configure personalities and preferences
- **Health Dashboard** - Monitor system status (new)

### Example: Generate an Image

```javascript
// Using the API directly
const response = await fetch('/api/generate-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify({
    prompt: 'A majestic dragon in a sunset landscape',
    model: 'sdxl'
  })
});
```

## 📚 API Documentation

### Interactive Documentation

Access the Swagger UI at `http://localhost:3000/api-docs` for:
- Interactive API exploration
- Request/response examples
- Authentication testing
- Schema definitions

### Key Endpoints

| Endpoint | Method | Description |
|----------|---------|------------|
| `/api/chat` | POST | Send chat messages |
| `/api/generate-image` | POST | Generate images |
| `/api/artifacts` | GET/POST | Manage artifacts |
| `/api/v1/artifacts/stats` | GET | Storage monitoring and utilization statistics |
| `/api/health` | GET | Health check |
| `/api/health/comfyui` | GET | ComfyUI status |
| `/api/health/ollama` | GET | Ollama status |
| `/api/alerts/status` | GET | Alerting system status |
| `/api/alerts/test` | POST | Send test alert |
| `/api/alerts/config` | GET | Alerting configuration |

### Authentication

All API requests require the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/health
```

## 🧪 Testing

DinoAir includes comprehensive testing capabilities:

### Accessibility Testing
```bash
# Run accessibility tests
cd web-gui
npx playwright test e2e/accessibility*.spec.ts

# Run with specific browser
npx playwright test e2e/accessibility*.spec.ts --project=chromium
```

### Load Testing
```bash
# Quick load test
cd web-gui-node
npm run load-test:quick

# Full load test suite
npm run load-test:all

# Specific endpoint tests
npm run load-test:health
npm run load-test:chat
npm run load-test:auth
npm run load-test:system
```

### Alerting System Testing
```bash
# Test alerting configuration
curl -X POST http://localhost:3000/api/alerts/test \
  -H "Content-Type: application/json" \
  -d '{"severity": "warning", "message": "Test alert"}'

# Check alerting status
curl http://localhost:3000/api/alerts/status
```

### Unit and Integration Tests

```bash
cd web-gui
npm test                  # Unit tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report
```

### Contract Testing

DinoAir implements comprehensive contract testing to ensure API compatibility between frontend and backend:

```bash
# Quick setup (installs dependencies and starts Pact Broker)
cd contracts
./setup-contracts.sh setup

# Run consumer tests (frontend expectations)
./setup-contracts.sh consumer

# Run provider verification (backend compliance)
./setup-contracts.sh provider

# Run full contract testing workflow
./setup-contracts.sh full
```

**Contract Testing Features:**
- Consumer-driven contract tests for all API endpoints
- Automated provider verification
- Pact Broker for contract management
- CI/CD integration with automated verification
- Comprehensive documentation and examples

For detailed contract testing information, see: [`contracts/CONTRACT_TESTING_GUIDE.md`](contracts/CONTRACT_TESTING_GUIDE.md)

### Stability Testing

Test the implemented stability fixes:

```bash
# Start DinoAir locally
python start.py

# Test concurrent authentication (in separate terminal)
for i in {1..20}; do
  curl -H "X-API-Key: your-api-key" http://localhost:3000/api/health &
done
wait

# Test artifact storage limits
for i in {1..1005}; do
  curl -X POST -H "Content-Type: application/json" \
    -d '{"name":"test'$i'","type":"text","content":"test content"}' \
    http://localhost:3000/api/v1/artifacts
done

# Monitor storage statistics
curl http://localhost:3000/api/v1/artifacts/stats
```

### Test Structure

```
web-gui/
├── __tests__/           # Unit tests
├── tests/               # E2E tests
└── jest.config.js       # Jest configuration
```

### Writing Tests

```javascript
// Example component test
import { render, screen } from '@testing-library/react';
import { ChatInterface } from '@/components/ChatInterface';

test('renders chat interface', () => {
  render(<ChatInterface />);
  expect(screen.getByRole('textbox')).toBeInTheDocument();
});
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build the image
docker build -t dinoair:latest .

# Run the container
docker run -p 3000:3000 -p 8188:8188 \
  -e DINOAIR_API_KEY=your-key \
  -e DINOAIR_SECRET_KEY=your-secret \
  dinoair:latest
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd web-gui && vercel

# Set environment variables in Vercel dashboard
```

### Production Checklist

- [ ] Set secure API keys and secrets
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [x] Set up monitoring alerts
- [ ] Enable error tracking
- [ ] Configure automated backups
- [ ] Test rollback procedures
- [ ] Review security settings

## 🛠️ Development

> **📖 For comprehensive development documentation, see [DEVELOPMENT.md](DEVELOPMENT.md)**

### Quick Development Setup

```bash
# Clone and setup
git clone https://github.com/Dinopit/DinoAirPublic.git
cd DinoAirPublic

# Install dependencies
pip install -r requirements.txt
cd web-gui && npm install

# Start development
python start.py
```

### Development Resources

- **[Development Guide](DEVELOPMENT.md)** - Complete development documentation
- **[Technical Details](docs/development/)** - Implementation details and analysis
- **[Testing Guide](DEVELOPMENT.md#testing)** - Test setup and execution
- **[Contributing Guidelines](DEVELOPMENT.md#contributing)** - How to contribute

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js GUI   │────▶│   API Routes    │────▶│    ComfyUI      │
│  (React + TS)   │     │  (Auth + RL)    │     │ (Image Gen)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                          │
                               ▼                          ▼
                        ┌─────────────┐           ┌─────────────┐
                        │   Ollama    │           │  AI Models  │
                        │ (Chat LLM)  │           │ (SDXL/SD15) │
                        └─────────────┘           └─────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  Safety     │
                        │  Modules    │
                        └─────────────┘
```

### Key Components

- **Frontend**: Next.js 14 with App Router
- **State Management**: Zustand stores
- **API Layer**: Next.js API routes with middleware
- **Authentication**: JWT/API key with rate limiting
- **Image Generation**: ComfyUI with workflow system
- **Chat Backend**: Ollama integration
- **Storage**: Local file system for artifacts
- **Safety**: Process isolation, monitoring, backups

## 🤝 Contributing

> **📖 For detailed contributing guidelines, see [DEVELOPMENT.md](DEVELOPMENT.md#contributing)**

We welcome contributions! Quick steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

**What we need help with:**
- 🐛 Bug fixes and stability improvements
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🧪 Test coverage and quality assurance
- 🎨 UI/UX improvements

## 🔧 Troubleshooting

> **📖 For comprehensive troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

### Quick Fixes for Common Issues

**🚨 Emergency Commands**
```bash
# Stop all DinoAir services
python stop.py

# Kill stuck processes
lsof -ti:3000,8188,11434 | xargs kill  # Linux/Mac
netstat -ano | findstr ":3000 :8188 :11434" | findstr LISTENING  # Windows
```

**🔍 Health Check**
```bash
# Verify all services are running
curl http://localhost:3000/api/health      # Web GUI
curl http://localhost:8188/system_stats    # ComfyUI  
curl http://localhost:11434/api/tags       # Ollama
```

**⚡ Common Quick Fixes**

| Issue | Quick Solution |
|-------|---------------|
| **Port conflicts** | `python stop.py && python start.py` |
| **Web UI blank/broken** | Clear browser cache, try incognito mode |
| **Model download fails** | Check disk space (need 8GB+), `python download_models.py --resume` |
| **Authentication hangs** | Wait 60 seconds (rate limiting), restart services |
| **ComfyUI not loading** | Check port 8188 is free, verify GPU/CPU resources |
| **Ollama chat fails** | `ollama list` to verify models, `ollama serve` to restart |
| **High memory usage** | Restart services, use smaller models |

**📊 System Requirements Check**
```bash
# Verify your system meets minimum requirements
python -c "
import psutil, shutil
print(f'Memory: {psutil.virtual_memory().total // 1024**3}GB (need 8GB+)')
print(f'CPU cores: {psutil.cpu_count()} (need 4+)')  
print(f'Free disk: {shutil.disk_usage(\".\")[2] // 1024**3}GB (need 20GB+)')
"
```

### 📚 Detailed Troubleshooting Guides

For comprehensive troubleshooting by component:

- **🚀 [Installation Issues](TROUBLESHOOTING.md#-installation--setup-issues)** - Prerequisites, permissions, disk space
- **🎨 [ComfyUI Problems](TROUBLESHOOTING.md#-comfyui-troubleshooting)** - Image generation, model loading, workflows  
- **🤖 [Ollama Issues](TROUBLESHOOTING.md#-ollama-troubleshooting)** - Chat functionality, model downloads, API connectivity
- **🌐 [Web GUI Problems](TROUBLESHOOTING.md#-web-gui-troubleshooting)** - UI loading, authentication, PrismJS errors
- **🖥️ [Performance Issues](TROUBLESHOOTING.md#-system-resources--performance)** - Memory, CPU, disk optimization
- **🔍 [Diagnostic Tools](TROUBLESHOOTING.md#-diagnostic-tools--commands)** - System monitoring, log analysis
- **❓ [FAQ](FAQ.md)** - Quick answers to common questions
- **❓ [Detailed FAQ](TROUBLESHOOTING.md#-frequently-asked-questions-faq)** - Technical Q&A in troubleshooting guide

### Debug Mode

Enable debug logging:

```bash
# Set environment variable
export DEBUG=dinoair:*

# Or in .env.local
DEBUG=dinoair:*
```

### Getting Help

- 📖 Check the out the website: https://www.dinopitstudios-llc.com/
- 🐛 Report issues on [GitHub](https://github.com/yourusername/DinoAir/issues)
- 💬 Join our the discord! https://discord.gg/GVd4jSh3
- 📧 Contact support: Admin@dinopitstudios-llc.com 

## ❓ FAQ

> **📖 For complete FAQ, see [FAQ.md](FAQ.md)**

### Quick Answers

**Q: What are the minimum requirements?**  
A: 8GB RAM, 4 CPU cores, 20GB disk space, Python 3.10+, Node.js 18+

**Q: Can I run this without internet?**  
A: Yes, after initial setup. Chat and image generation work offline.

**Q: Do I need a GPU?**  
A: Not required, but highly recommended for fast image generation (10-100x speedup).

**Q: Why is it using so much memory?**  
A: Language models (4-8GB) + image models (2-4GB) + web services (1-2GB). This is normal.

**Q: Installation failed - what now?**  
A: Try `python install_safe.py`, check Python 3.10+/Node.js 18+, ensure 20GB+ disk space.

**Q: Web page is blank/broken?**  
A: Clear browser cache (Ctrl+F5), try incognito mode, check browser console for errors.

**Q: ComfyUI/Ollama won't start?**  
A: Check ports 8188/11434 aren't in use, verify system resources, restart services.

[📚 **See FAQ.md for 30+ more questions and detailed answers**](FAQ.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**DinoAir v1.2.0** - Built with ❤️ by the DinoAir Team

[Documentation](docs/) • [Development](DEVELOPMENT.md) • [Issues](https://github.com/Dinopit/DinoAirPublic/issues) • [Discord](https://discord.gg/GVd4jSh3)

</div>
