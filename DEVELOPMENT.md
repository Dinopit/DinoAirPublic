# DinoAir Development Documentation

This document serves as the central hub for all development-related documentation for the DinoAir project.

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Technical Documentation](#technical-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- PostgreSQL (for Supabase integration)

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
- Follow TypeScript/JavaScript ESLint rules
- Use Prettier for code formatting
- Write tests for new features
- Update documentation for API changes

### Git Workflow
1. Create feature branches from `main`
2. Make focused, atomic commits
3. Write clear commit messages
4. Submit pull requests for review

## 📖 Technical Documentation

### Architecture Overview
DinoAir consists of:
- **Frontend**: Next.js 14 with TypeScript and React
- **Backend**: Python with FastAPI and various service modules
- **Database**: PostgreSQL with Supabase
- **AI Services**: Ollama for chat, ComfyUI for image generation

### Detailed Technical Documentation

All detailed technical documentation has been organized in the `docs/development/` folder:

#### Implementation Details
- [**Stability Analysis**](docs/development/STABILITY_ANALYSIS.md) - Critical stability issues and fixes
- [**Bug Fixes Summary**](docs/development/FIXES_SUMMARY.md) - Overview of major bug fixes
- [**Memory Leak Fixes**](docs/development/MEMORY_LEAK_FIXES.md) - Memory management improvements
- [**Authentication Investigation**](docs/development/AUTH_RATE_LIMITING_INVESTIGATION.md) - Auth system debugging
- [**Database Integration**](docs/development/ISSUES_5_6_7_IMPLEMENTATION_SUMMARY.md) - Major feature implementations

#### System Improvements
- [**Blue-Green Deployment**](docs/development/BLUE_GREEN_IMPLEMENTATION.md) - Deployment strategy
- [**Streaming Export**](docs/development/STREAMING_EXPORT_IMPLEMENTATION.md) - Large file handling
- [**Docker Optimization**](docs/development/DOCKER_OPTIMIZATION.md) - Container improvements
- [**Logging Documentation**](docs/development/LOGGING_DOCUMENTATION.md) - Logging system
- [**Metrics Documentation**](docs/development/METRICS_DOCUMENTATION.md) - Monitoring and metrics

#### Security & Quality
- [**API Security**](docs/development/API_SECURITY_DOCUMENTATION.md) - Security implementation
- [**Code Quality Improvements**](docs/development/CODE_QUALITY_IMPROVEMENTS.md) - Code quality measures
- [**Security Incident Report**](docs/development/SECURITY_INCIDENT_REPORT.md) - Security analysis

#### Development Tasks & Planning
- [**Development Tasks**](docs/development/tasks.md) - Comprehensive task list and roadmap
- [**GitHub Issues Template**](docs/development/create_github_issues.md) - Issue creation templates
- [**Bug Reports**](docs/development/BUG_REPORT.md) - Bug tracking and reports

#### Testing & Deployment
- [**Testing Documentation**](docs/development/TEST_STANDALONE.md) - Test setup and execution
- [**Packaging Guide**](docs/development/PACKAGING_DISTRIBUTION_GUIDE.md) - Distribution packaging

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
- [**Deployment Guide**](DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [**Distribution Guide**](DISTRIBUTION_GUIDE.md) - Package distribution

## 🤝 Contributing

### Code Standards
- Follow existing code style and patterns
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure all CI checks pass

### Review Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Address review feedback
6. Merge after approval

### Development Environment
- Use provided VS Code settings and extensions
- Follow the established project structure
- Use the configured linting and formatting tools

## 📝 Additional Resources

- [**FAQ**](FAQ.md) - Frequently asked questions
- [**Troubleshooting**](TROUBLESHOOTING.md) - Common issues and solutions
- [**Security**](SECURITY.md) - Security policies and practices
- [**Telemetry**](TELEMETRY.md) - Data collection and privacy
- [**CLI Installer Manual**](CLI_INSTALLER_USER_MANUAL.md) - Installation guide

## 🆘 Getting Help

- Check the [FAQ](FAQ.md) and [Troubleshooting](TROUBLESHOOTING.md) guides
- Review existing [GitHub Issues](https://github.com/Dinopit/DinoAirPublic/issues)
- Join our Discord: https://discord.gg/GVd4jSh3
- Contact: Admin@dinopitstudios-llc.com

---

*For the most up-to-date development information, see the files in `docs/development/`*