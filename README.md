# README

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Dinopit/DinoAirPublic)

## DinoAir 🦕✨

![Version](https://img.shields.io/badge/version-1.5.0-blue.svg) ![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg) ![License](https://img.shields.io/badge/license-MIT-orange.svg)

**A self-contained AI platform that runs entirely on your computer.** Chat with local language models, generate images, and manage AI-created content - all without sending data to external servers.

> **🎉 DinoAir v1.5 is Now Available!** Enhanced stability, new plugin ecosystem, and enterprise features. [View Release Notes →](https://github.com/Dinopit/DinoAirPublic/releases/tag/v1.5.0)

### 🎯 What is DinoAir?

DinoAir brings the power of AI directly to your desktop with a focus on **privacy**, **performance**, and **ease of use**. Think of it as your personal AI assistant that works completely offline after initial setup.

#### 🔥 **Why Choose DinoAir?**

* **🔒 Complete Privacy** - Everything runs locally, your data never leaves your machine
* **⚡ Fast & Responsive** - Direct hardware acceleration, no internet delays
* **🎨 Versatile AI Tools** - Chat with AI, generate images, manage creative content
* **🛡️ Enterprise-Grade** - Professional stability, security, and monitoring features
* **🚀 Easy Installation** - One-click setup with automatic hardware detection

#### 📊 **Current State: v1.5.0 Stable Release**

DinoAir has evolved from an experimental project to a **production-ready platform** with enterprise-grade features:

✅ **Fully Functional** - All core features working reliably\
✅ **Professional UI** - Modern, responsive web interface\
✅ **Robust Backend** - Circuit breakers, monitoring, automatic recovery\
✅ **Secure** - JWT authentication, rate limiting, input validation\
✅ **Tested** - Comprehensive test suite with 85%+ coverage\
✅ **Documented** - Complete installation and usage guides

**Ready for daily use** by developers, content creators, and AI enthusiasts.

### 📋 Table of Contents

* [Features](./#-features)
* [Quick Start](./#-quick-start)
* [Mobile App](./#-mobile-app)
* [Prerequisites](./#-prerequisites)
* [Installation](./#-installation)
* [Configuration](./#-configuration)
* [Usage](./#-usage)
* [API Documentation](./#-api-documentation)
* [Testing](./#-testing)
* [Deployment](./#-deployment)
* [Development](./#-development)
* [Architecture](./#-architecture)
* [Contributing](./#-contributing)
* [Troubleshooting](./#-troubleshooting)
* [FAQ](./#-faq)
* [License](./#-license)

### ✨ What Can You Do With DinoAir?

#### 🤖 **AI Chat & Conversations**

* **Smart Conversations** - Chat with advanced language models (Qwen, Llama, etc.)
* **Multiple Personalities** - Switch between different AI assistants for specific tasks
* **Context Awareness** - Maintains conversation history and context
* **Offline Operation** - No internet required after initial setup

#### 🎨 **Image Generation**

* **Text-to-Image** - Generate stunning images from text descriptions
* **Multiple Models** - Support for SDXL, SD 1.5, and custom models
* **Advanced Controls** - Fine-tune generation with custom workflows
* **High Quality** - Professional-grade image output

#### 💾 **Content Management**

* **Artifact Storage** - Organize all your AI-generated content
* **Search & Export** - Find and export conversations and images
* **Version Control** - Track changes and iterations
* **Backup & Sync** - Keep your data safe with automated backups

#### 📱 **Mobile Experience**

* **Native Mobile Apps** - iOS and Android applications with offline capabilities
* **Voice Integration** - Hands-free operation with speech recognition
* **Camera Features** - Document scanning, OCR, and image analysis
* **Push Notifications** - Real-time alerts and cross-device sync
* **Gesture Controls** - Intuitive mobile navigation and shortcuts

#### 🔧 **System Features**

* **Modern Web UI** - Clean, responsive interface that works on all devices
* **Real-time Monitoring** - Track system performance and resource usage
* **Security** - Enterprise-grade authentication and rate limiting
* **Extensible** - Plugin system for custom functionality

### 🚀 Get Started in 3 Steps

#### 1️⃣ **Download & Extract**

```bash
git clone https://github.com/Dinopit/DinoAirPublic.git
cd DinoAirPublic
```

#### 2️⃣ **One-Click Install**

```bash
# Automatic installation with modern UI
python install_safe.py

# Or use the web-based installer
open installer/modern-installer.html
```

#### 3️⃣ **Launch & Use**

```bash
python start.py
# Opens automatically at http://localhost:3000
```

**That's it!** DinoAir will automatically detect your hardware and install the optimal configuration for your system.

### 📱 Mobile App

DinoAir includes a native mobile application for iOS and Android with full offline capabilities.

#### 🚀 **Mobile Features**

* **Offline Mode** - Continue conversations without internet connection
* **Voice Integration** - Speech-to-text and voice commands
* **Camera Features** - Document scanning and OCR
* **Push Notifications** - Real-time alerts and sync updates
* **Gesture Controls** - Shake to clear, swipe navigation

#### 📲 **Quick Mobile Setup**

```bash
cd mobile-app
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..
npm run ios

# For Android
npm run android
```

#### 📚 **Mobile Documentation**

* **Setup Guide**: [`mobile-app/README.md`](mobile-app.md)
* **Integration Guide**: [`MOBILE_INTEGRATION_GUIDE.md`](mobile_integration_guide.md)
* **Technical Details**: Complete React Native implementation with offline SQLite storage

### 📋 System Requirements

DinoAir **automatically detects your hardware** and installs the optimal configuration. Here's what you need:

#### 🔧 **Required Software**

* **Python 3.11+** - Download from [python.org](https://python.org)
* **Node.js 18+** - Download from [nodejs.org](https://nodejs.org)
* **Git** - Download from [git-scm.com](https://git-scm.com)

#### 💻 **Hardware Requirements**

| Mode            | CPU       | RAM   | Storage | GPU        | Best For                            |
| --------------- | --------- | ----- | ------- | ---------- | ----------------------------------- |
| **Lightweight** | 4 cores   | 8GB   | 10GB    | None       | Basic chat, simple tasks            |
| **Standard**    | 8 cores   | 16GB  | 30GB    | 4GB VRAM   | Full chat + basic image generation  |
| **Performance** | 12+ cores | 32GB+ | 100GB   | 16GB+ VRAM | Professional use, complex workflows |

**🎯 Don't worry about the details** - the installer will automatically choose the best configuration for your system and tell you what's possible.

### 🎯 Need Help?

#### 🆘 **Quick Support**

* **🚨 Emergency fixes**: See the [Quick Fixes section](./#quick-fixes-for-common-issues) below
* **📚 Complete documentation**: Click the [**DeepWiki**](https://deepwiki.com/Dinopit/DinoAirPublic) badge at the top
* **💬 Community support**: Join our [Discord](https://discord.gg/GVd4jSh3)
* **🐛 Report bugs**: Create an [issue on GitHub](https://github.com/Dinopit/DinoAirPublic/issues)

#### 📖 **Detailed Documentation**

Since you have the **DeepWiki** link at the top, you can find comprehensive documentation including:

* **Installation guides** for all platforms
* **Configuration options** and advanced settings
* **API documentation** with examples
* **Troubleshooting guides** for common issues
* **Development setup** for contributors
* **Architecture overview** and technical details

***

### 🏃‍♂️ **Quick Reference**

#### 🔄 **Common Commands**

```bash
# Start DinoAir
python start.py

# Stop all services
python stop.py

# Reinstall safely
python install_safe.py

# Check system health
curl http://localhost:3000/api/health
```

#### 🚨 **Quick Fixes for Common Issues**

| Issue                           | Quick Solution                                                          |
| ------------------------------- | ----------------------------------------------------------------------- |
| **Port conflicts**              | `python stop.py && python start.py`                                     |
| **Web UI blank/broken**         | Clear browser cache (Ctrl+F5), try incognito mode                       |
| **Model download fails**        | Check disk space (need 10GB+), restart with `python install_safe.py`    |
| **Chat/image generation fails** | `python stop.py && python start.py`                                     |
| **"Permission denied" errors**  | Run as administrator/sudo, or use `python install_safe.py --check-only` |

#### 🔍 **Health Check**

```bash
# Verify all services are running
curl http://localhost:3000/api/health      # Web GUI
curl http://localhost:8188/system_stats    # ComfyUI  
curl http://localhost:11434/api/tags       # Ollama
```

***

### 💻 **For Developers**

#### 🛠️ **API Access**

```bash
# Generate API key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Test API
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/health
```

#### 🧪 **Run Tests**

```bash
cd web-gui-node && npm run load-test:quick
cd web-gui && npm test
```

#### 🐳 **Docker Deploy**

```bash
docker build -t dinoair .
docker run -p 3000:3000 dinoair
```

***

### 🤝 **Contributing & Community**

* **💬 Chat with us**: [Discord Community](https://discord.gg/GVd4jSh3)
* **🐛 Report issues**: [GitHub Issues](https://github.com/Dinopit/DinoAirPublic/issues)
* **🔧 Contribute code**: Fork → Branch → PR (see [DEVELOPMENT.md](development.md))
* **📧 Direct support**: Admin@dinopitstudios-llc.com

***

### 📄 **License**

**DinoAir v1.5.0** - Built with ❤️ by the DinoAir Team\
Licensed under the MIT License - see [LICENSE](LICENSE/) for details

[**🌐 Website**](https://www.dinopitstudios-llc.com/) **•** [**📚 Docs**](https://deepwiki.com/Dinopit/DinoAirPublic) **•** [**💬 Discord**](https://discord.gg/GVd4jSh3) **•** [**🐛 Issues**](https://github.com/Dinopit/DinoAirPublic/issues)

_Your AI companion that respects your privacy_ 🦕✨
