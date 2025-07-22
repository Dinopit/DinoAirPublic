# DinoAir 🦕✨

![Version](https://img.shields.io/badge/version-1.0-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Test Coverage](https://img.shields.io/badge/coverage-85%25-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

> A powerful, self-contained AI platform combining local language models with image generation capabilities. Built with modern web technologies and enterprise-grade features.

**⚠️ Note: This is Version 1.0** - While feature-complete and production-ready, you may encounter occasional quirks. We appreciate your patience and feedback!

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
- [License](#-license)

## ✨ Features

### Core Capabilities
- 🤖 **Local AI Chat** - Powered by Ollama with multiple language models
- 🎨 **Image Generation** - SDXL and SD 1.5 support via ComfyUI integration
- 💾 **Artifact Management** - Store, organize, and manage generated content
- 🎭 **Multiple Personalities** - Customizable AI personalities for different use cases

### Recent Enhancements (v1.0)
- 🔒 **Enhanced Security**
  - API key authentication system
  - Rate limiting protection
  - CORS header configuration
- 🐛 **Critical Bug Fixes**
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
git clone https://github.com/yourusername/DinoAir.git
cd DinoAir

# Install and start
python install.py
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
- 16GB RAM (recommended)
- 20GB free disk space (including models)
- GPU with 6GB+ VRAM (optional, for faster image generation)

## 🔧 Installation

### Automated Installation (Recommended)

```bash
# Run the installer
python install.py
```

The installer will:
- ✅ Verify all prerequisites
- ✅ Install ComfyUI and dependencies
- ✅ Pull required Ollama models
- ✅ Set up the web interface
- ✅ Optionally download AI models

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
# Start all services
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
| `/api/health` | GET | Health check |

### Authentication

All API requests require the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/health
```

## 🧪 Testing

### Run All Tests

```bash
cd web-gui
npm test                  # Unit tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report
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

- [ ] Set secure API keys
- [ ] Enable HTTPS
- [ ] Configure rate limiting
- [ ] Set up monitoring
- [ ] Enable error tracking
- [ ] Configure backups

## 🛠️ Development

### Project Structure

```
DinoAir/
├── web-gui/                 # Next.js frontend
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities & helpers
│   └── public/             # Static assets
├── ComfyUI/                # Image generation backend
│   ├── models/             # AI models
│   └── workflows/          # Generation workflows
├── personalities/          # AI personality configs
├── docs/                   # Documentation
└── scripts/               # Utility scripts
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes and test**
   ```bash
   npm run dev
   npm test
   ```

3. **Build and verify**
   ```bash
   npm run build
   npm run start
   ```

4. **Submit a pull request**

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits

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
```

### Key Components

- **Frontend**: Next.js 14 with App Router
- **State Management**: Zustand stores
- **API Layer**: Next.js API routes with middleware
- **Authentication**: API key-based with rate limiting
- **Image Generation**: ComfyUI with workflow system
- **Chat Backend**: Ollama integration
- **Storage**: Local file system for artifacts

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### How to Contribute

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📚 Documentation
- 🧪 Tests
- 🎨 UI/UX improvements

## 🔧 Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill processes on specific ports
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

**Model Download Failures**
- Check disk space (need ~8GB free)
- Verify internet connection
- Use `download_models.py --resume` to continue

**API Authentication Errors**
- Verify API key in `.env.local`
- Check rate limit hasn't been exceeded
- Ensure CORS is properly configured

**ComfyUI Connection Issues**
- Confirm ComfyUI is running on port 8188
- Check firewall settings
- Verify workflow files are present

### Debug Mode

Enable debug logging:

```bash
# Set environment variable
export DEBUG=dinoair:*

# Or in .env.local
DEBUG=dinoair:*
```

### Getting Help

- 📖 Check the [documentation](docs/)
- 🐛 Report issues on [GitHub](https://github.com/yourusername/DinoAir/issues)
- 💬 Join our [Discord community](https://discord.gg/dinoair)
- 📧 Contact support: support@dinoair.example.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**DinoAir v1.0** - Built with ❤️ by the DinoAir Team

[Documentation](docs/) • [Issues](https://github.com/yourusername/DinoAir/issues) • [Discord](https://discord.gg/dinoair)

</div>