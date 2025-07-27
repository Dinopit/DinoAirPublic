# 📁 DinoAir Directory Structure & File Guide

> Understanding DinoAir's file organization for troubleshooting and maintenance

## 🗂️ Main Directory Structure

```
DinoAir/
├── 📄 README.md                    # Main documentation
├── 📄 TROUBLESHOOTING.md           # Comprehensive troubleshooting guide  
├── 📄 FAQ.md                       # Quick Q&A reference
├── 📄 start.py                     # Main startup script
├── 📄 stop.py                      # Shutdown script (if exists)
├── 📄 install.py                   # Standard installer
├── 📄 install_safe.py              # Enhanced installer with safety checks
├── 📄 config.yaml                  # Main configuration (copy from config.example.yaml)
├── 📄 config.example.yaml          # Configuration template
│
├── 📁 web-gui/                     # Next.js web interface
│   ├── 📁 app/                     # React application pages
│   ├── 📁 components/              # Reusable UI components  
│   ├── 📁 public/                  # Static files & generated artifacts
│   │   └── 📁 artifacts/           # 🎨 Generated images stored here
│   ├── 📄 package.json             # Node.js dependencies
│   └── 📄 next.config.js           # Next.js configuration
│
├── 📁 web-gui-node/                # Node.js backend server
│   ├── 📁 routes/                  # API endpoint definitions
│   │   └── 📁 api/                 # REST API routes
│   ├── 📁 data/                    # 💾 Local database files
│   ├── 📁 middleware/              # Auth, rate limiting, validation
│   ├── 📄 server.js                # Main server file
│   └── 📄 package.json             # Node.js dependencies
│
├── 📁 ComfyUI/                     # Image generation backend
│   ├── 📁 models/                  # 🧠 AI models for image generation
│   │   ├── 📁 checkpoints/         # SDXL/SD15 model files (.safetensors)
│   │   ├── 📁 controlnet/          # ControlNet models
│   │   ├── 📁 loras/               # LoRA adaptation models
│   │   └── 📁 vae/                 # VAE models for image encoding
│   ├── 📁 workflows/               # 🎨 Image generation workflows (.json)
│   ├── 📁 output/                  # Generated images before web processing
│   ├── 📁 temp/                    # Temporary processing files
│   ├── 📁 custom_nodes/            # Community-developed ComfyUI extensions
│   └── 📄 main.py                  # ComfyUI startup script
│
├── 📁 lib/                         # Python safety & utility modules
│   ├── 📁 backup/                  # Automated backup system
│   ├── 📁 circuit_breaker/         # Fault tolerance mechanisms
│   ├── 📁 config/                  # Configuration validation
│   ├── 📁 health_monitor/          # Service health checking
│   ├── 📁 logging/                 # Structured logging system
│   ├── 📁 monitoring/              # Resource monitoring
│   ├── 📁 process_manager/         # Process isolation & management
│   ├── 📁 rollback/                # Rollback system for failed updates
│   └── 📁 shutdown/                # Graceful shutdown handling
│
├── 📁 logs/                        # 📝 Log files (created at runtime)
│   ├── 📄 dinoair.log              # Main application logs
│   ├── 📄 comfyui.log              # ComfyUI specific logs
│   ├── 📄 ollama.log               # Ollama service logs
│   └── 📄 web-gui.log              # Web interface logs
│
├── 📁 docs/                        # 📚 Additional documentation
│   ├── 📄 CONFIGURATION_MANAGEMENT.md
│   ├── 📄 HEALTH_CHECK_API.md
│   ├── 📄 BACKUP_RECOVERY_GUIDE.md
│   └── 📄 ENVIRONMENT_VARIABLES.md
│
├── 📁 personalities/               # 🎭 AI personality configurations
│   └── *.json                     # Personality definition files
│
├── 📁 scripts/                     # 🔧 Utility scripts
│   ├── 📄 backup.py                # Backup automation
│   └── 📄 cleanup.py               # System cleanup utilities
│
├── 📁 tests/                       # 🧪 Test files
│   ├── 📄 test_install.py          # Installation tests
│   ├── 📄 test_start.py            # Startup tests  
│   └── 📁 web-gui-node/            # Web server tests
│
└── 📁 __pycache__/                 # Python compiled bytecode (auto-generated)
```

## 🏠 External Dependencies

**Ollama Models Location:**
```bash
# Linux/Mac
~/.ollama/models/           # Downloaded language models (4-7GB each)

# Windows  
%USERPROFILE%\.ollama\models\
```

**Common Cache Directories:**
```bash
# Node.js cache
~/.npm/                     # npm package cache
web-gui-node/node_modules/  # Local dependencies

# Python cache
__pycache__/                # Compiled Python files
~/.cache/pip/               # pip package cache
```

## 📊 File Sizes & Disk Usage

| Component | Typical Size | Notes |
|-----------|-------------|-------|
| **DinoAir Core** | ~500MB | Application code & dependencies |
| **Language Models** | 4-7GB each | Ollama models (llama2, mistral, etc.) |
| **Image Models** | 2-5GB each | SDXL, SD1.5 in ComfyUI/models/ |
| **Generated Content** | Grows over time | Images in web-gui/public/artifacts/ |
| **Logs** | 10-100MB | Rotated automatically |
| **Node Modules** | 200-500MB | JavaScript dependencies |

**💡 Space-saving tips:**
- Remove unused language models: `ollama rm <model-name>`
- Clean old artifacts: Check `web-gui/public/artifacts/`
- Clear ComfyUI temp: `rm -rf ComfyUI/temp/*`

## 🔍 Key Files for Troubleshooting

### Configuration Files
```bash
config.yaml                 # Main configuration (create from example)
.env.example                # Environment variables template
web-gui-node/.env           # Web server environment variables
```

### Log Files (Check these first!)
```bash
logs/dinoair.log            # Main application events
logs/web-gui.log            # Web interface errors  
logs/comfyui.log            # Image generation issues
logs/ollama.log             # Language model problems
```

### Service Entry Points
```bash
start.py                    # Main startup - check here for startup issues
web-gui-node/server.js      # Web server - check for API/auth issues
ComfyUI/main.py             # Image generation - check for GPU/model issues
```

### Data Storage
```bash
web-gui-node/data/          # User accounts, settings, local database
web-gui/public/artifacts/   # Generated images and content
ComfyUI/output/             # Raw ComfyUI generation output
```

## 🚨 Problem Diagnosis by Directory

### 🚀 Installation Issues
**Check:** `install.py`, `install_safe.py`, `requirements.txt`
```bash
# Common issues
pip install -r requirements.txt  # Python dependencies
cd web-gui-node && npm install   # Node.js dependencies
```

### 🌐 Web Interface Problems  
**Check:** `web-gui-node/server.js`, `web-gui-node/logs/`
```bash
# Debug web server
cd web-gui-node
npm run dev                       # Development mode with detailed logs
```

### 🎨 Image Generation Issues
**Check:** `ComfyUI/main.py`, `ComfyUI/models/`, `ComfyUI/temp/`
```bash  
# Debug ComfyUI
cd ComfyUI
python main.py --listen 0.0.0.0 --port 8188 --verbose
```

### 🤖 Chat/Language Model Issues
**Check:** `~/.ollama/`, Ollama service status
```bash
# Debug Ollama
ollama list                       # Show downloaded models
ollama serve                      # Manual start with logs
```

### ⚙️ Configuration Problems
**Check:** `config.yaml`, environment variables
```bash
# Validate configuration
python -c "import yaml; yaml.safe_load(open('config.yaml'))"
```

### 📝 Log Analysis
**Check:** `logs/` directory for all service logs
```bash
# Monitor all logs simultaneously  
tail -f logs/*.log

# Search for errors
grep -i error logs/dinoair.log
grep -i "failed\|error\|exception" logs/*.log
```

## 🧹 Cleanup Commands

### Safe Cleanup (Preserves data)
```bash
# Clear temporary files
rm -rf ComfyUI/temp/*
rm -rf web-gui-node/node_modules/.cache/
rm -rf __pycache__/

# Clear old logs (optional)
rm logs/*.log.old
```

### Reset Cleanup (⚠️ Loses generated content)
```bash
# Remove all generated content
rm -rf web-gui/public/artifacts/*
rm -rf ComfyUI/output/*

# Reset databases (loses user accounts)
rm -rf web-gui-node/data/database.*
```

### Nuclear Cleanup (⚠️ Complete reinstall needed)
```bash
# Remove everything except source code
rm -rf node_modules logs __pycache__ ComfyUI/temp ComfyUI/output
rm -rf web-gui-node/data web-gui/public/artifacts
rm config.yaml
```

---

## 💡 Quick Tips

1. **Always backup** `config.yaml` and `web-gui/public/artifacts/` before major changes
2. **Check logs first** - most issues are clearly logged
3. **Disk space** - ensure 20GB+ free for smooth operation
4. **Port conflicts** - DinoAir uses ports 3000, 8188, 11434
5. **Permissions** - avoid using sudo/administrator unless absolutely necessary

For detailed troubleshooting steps, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)