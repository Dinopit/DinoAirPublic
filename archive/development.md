# DinoAir Development Documentation

This document serves as the central hub for all development-related documentation for the DinoAir project.

## 📚 Table of Contents

* [Getting Started](development.md#getting-started)
* [Development Workflow](development.md#development-workflow)
* [Technical Documentation](development.md#technical-documentation)
* [Testing](development.md#testing)
* [Deployment](development.md#deployment)
* [Contributing](development.md#contributing)

## 🚀 Getting Started

### Prerequisites

* Python 3.11+
* Node.js 18+
* Git
* PostgreSQL (for Supabase integration)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Dinopit/DinoAirPublic.git
cd DinoAirPublic

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies
cd web-gui && npm install
cd ../web-gui-node && npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development servers
python start.py
```

## 🔧 Development Workflow

### Code Quality

* Follow TypeScript/JavaScript ESLint rules
* Use Prettier for code formatting
* Write tests for new features
* Update documentation for API changes

### Git Workflow

1. Create feature branches from `main`
2. Make focused, atomic commits
3. Write clear commit messages
4. Submit pull requests for review

## 📖 Technical Documentation

### Architecture Overview

DinoAir consists of:

* **Frontend**: Next.js 14 with TypeScript and React
* **Backend**: Python with FastAPI and various service modules
* **Database**: PostgreSQL with Supabase
* **AI Services**: Ollama for chat, ComfyUI for image generation

### Detailed Technical Documentation

All detailed technical documentation has been organized in the `docs/development/` folder:

#### Implementation Details

* [**Stability Analysis**](docs/development/stability_analysis.md) - Critical stability issues and fixes
* [**Bug Fixes Summary**](docs/development/fixes_summary.md) - Overview of major bug fixes
* [**Memory Leak Fixes**](docs/development/memory_leak_fixes.md) - Memory management improvements
* [**Authentication Investigation**](docs/development/auth_rate_limiting_investigation.md) - Auth system debugging
* [**Database Integration**](docs/development/issues_5_6_7_implementation_summary.md) - Major feature implementations

#### System Improvements

* [**Blue-Green Deployment**](docs/development/blue_green_implementation.md) - Deployment strategy
* [**Streaming Export**](docs/development/streaming_export_implementation.md) - Large file handling
* [**Docker Optimization**](docs/development/docker_optimization.md) - Container improvements
* [**Logging Documentation**](docs/development/logging_documentation.md) - Logging system
* [**Metrics Documentation**](docs/development/metrics_documentation.md) - Monitoring and metrics

#### Security & Quality

* [**API Security**](docs/development/api_security_documentation.md) - Security implementation
* [**Code Quality Improvements**](docs/development/code_quality_improvements.md) - Code quality measures
* [**Security Incident Report**](docs/development/security_incident_report.md) - Security analysis

#### Development Tasks & Planning

* [**Development Tasks**](docs/development/tasks.md) - Comprehensive task list and roadmap
* [**GitHub Issues Template**](docs/development/create_github_issues.md) - Issue creation templates
* [**Bug Reports**](docs/development/bug_report.md) - Bug tracking and reports

#### Testing & Deployment

* [**Testing Documentation**](docs/development/test_standalone.md) - Test setup and execution
* [**Packaging Guide**](docs/development/packaging_distribution_guide.md) - Distribution packaging

## 🧪 Testing

### Frontend Testing

```bash
cd web-gui
npm test                 # Unit tests
npm run test:e2e        # End-to-end tests
npm run test:coverage   # Coverage report
```

### Backend Testing

```bash
pytest                  # Python tests
pytest --cov=lib       # Coverage report
```

### Integration Testing

```bash
# Test full stack
npm run test:integration
```

## 🚀 Deployment

For deployment instructions, see:

* [**Deployment Guide**](deployment_guide.md) - Comprehensive deployment instructions
* [**Distribution Guide**](distribution_guide.md) - Package distribution

## 🤝 Contributing

### Code Standards

* Follow existing code style and patterns
* Write comprehensive tests for new features
* Update documentation for API changes
* Ensure all CI checks pass

### Review Process

1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Address review feedback
6. Merge after approval

### Development Environment

* Use provided VS Code settings and extensions
* Follow the established project structure
* Use the configured linting and formatting tools

## 📝 Additional Resources

* [**FAQ**](faq.md) - Frequently asked questions
* [**Troubleshooting**](troubleshooting.md) - Common issues and solutions
* [**Security**](security.md) - Security policies and practices
* [**Telemetry**](telemetry.md) - Data collection and privacy
* [**CLI Installer Manual**](cli_installer_user_manual.md) - Installation guide

## 🆘 Getting Help

* Check the [FAQ](faq.md) and [Troubleshooting](troubleshooting.md) guides
* Review existing [GitHub Issues](https://github.com/Dinopit/DinoAirPublic/issues)
* Join our Discord: https://discord.gg/GVd4jSh3
* Contact: Admin@dinopitstudios-llc.com

***

_For the most up-to-date development information, see the files in `docs/development/`_
