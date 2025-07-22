# DinoAir Free Tier - Standalone Testing Guide

This guide provides comprehensive testing procedures to verify that the DinoAir Free Tier works correctly as a standalone package. Follow these steps to ensure everything is functioning properly before distribution.

## 📋 Pre-Testing Checklist

Before beginning the tests, ensure you have:

- [ ] A clean test environment (ideally a fresh virtual machine or clean system)
- [ ] At least 20GB of free disk space
- [ ] 8GB+ of RAM (16GB recommended)
- [ ] A compatible GPU with 8GB+ VRAM (for SDXL models)
- [ ] Internet connection for initial downloads
- [ ] Administrator/sudo privileges

## 🧪 Testing Procedures

### Phase 1: Pre-Installation Verification

1. **Check System Requirements**
   ```bash
   # Check Python version (should be 3.10+)
   python --version
   
   # Check available disk space
   # Windows: Check in File Explorer
   # Linux/Mac: df -h
   
   # Check GPU (NVIDIA recommended)
   # Windows: Device Manager > Display Adapters
   # Linux: nvidia-smi or lspci | grep VGA
   ```

2. **Verify Clean Environment**
   - Ensure no existing ComfyUI installation
   - Ensure no existing Ollama installation
   - Check ports 3000 and 8188 are free:
     ```bash
     # Windows
     netstat -an | findstr :3000
     netstat -an | findstr :8188
     
     # Linux/Mac
     lsof -i :3000
     lsof -i :8188
     ```

### Phase 2: Installation Testing

1. **Extract Package**
   - Extract the DinoAirFreeTier package to a test location
   - Verify all files are present:
     ```
     DinoAirFreeTier/
     ├── install.py
     ├── start.py
     ├── download_models.py
     ├── requirements.txt
     ├── README.md
     ├── CHANGELOG.md
     ├── FreeTierPacked/
     │   ├── Image_to_Image_workflow.json
     │   └── sd15-workflow.json
     ├── personalities/
     │   ├── creative.json
     │   ├── technical.json
     │   ├── witty.json
     │   └── mentally-unstable.json
     └── web-gui/
         ├── package.json
         ├── next.config.js
         └── [other web files]
     ```

2. **Run Installation**
   ```bash
   cd DinoAirFreeTier
   python install.py
   ```
   
   **Expected Behavior:**
   - ComfyUI should be cloned successfully
   - Python dependencies should install without errors
   - Models should download (this may take 30-60 minutes)
   - Web GUI dependencies should install
   - No error messages should appear

3. **Verify Installation**
   - Check ComfyUI directory exists: `../ComfyUI`
   - Check models downloaded: `../ComfyUI/models/checkpoints/`
   - Check web-gui node_modules: `web-gui/node_modules/`

### Phase 3: Service Startup Testing

1. **Initial Launch**
   ```bash
   python start.py
   ```
   
   **Expected Output:**
   ```
   ============================================================
   DinoAir Free Tier Launcher
   ============================================================
   Checking Ollama...
   Starting ComfyUI...
   ComfyUI started on http://localhost:8188
   Starting Web GUI...
   Web GUI starting on http://localhost:3000
   
   Waiting for services to initialize...
   Opening browser to http://localhost:3000
   ```

2. **Verify Services**
   - Browser should open automatically to http://localhost:3000
   - Web GUI should load without errors
   - Check ComfyUI is accessible at http://localhost:8188
   - Terminal should show all services running

### Phase 4: Functionality Testing

1. **Web GUI Testing**
   - Navigate to http://localhost:3000
   - Verify the interface loads completely
   - Check theme switcher works (light/dark mode)
   - Test navigation between sections

2. **Chat Interface Testing**
   - Click on "Local Chat" or chat section
   - Send a test message: "Hello, can you hear me?"
   - Verify Ollama responds
   - Test different personalities if available

3. **Image Generation Testing**
   - Navigate to image generation section
   - Enter a simple prompt: "A beautiful sunset over mountains"
   - Click generate
   - Verify image generation starts
   - Check progress updates
   - Verify final image displays

4. **Workflow Testing**
   - Access ComfyUI directly at http://localhost:8188
   - Load the included workflows:
     - Image_to_Image_workflow.json
     - sd15-workflow.json
   - Verify workflows load without errors

### Phase 5: Error Handling Testing

1. **Port Conflict Test**
   - Start another instance of start.py
   - Should detect services already running
   - Should not crash, but inform user

2. **Missing Ollama Test**
   - Temporarily rename ollama executable
   - Run start.py
   - Should show clear error message about installing Ollama

3. **Interrupt Test**
   - Press Ctrl+C while services are running
   - All services should shut down gracefully
   - No orphaned processes should remain

4. **Network Test**
   - Disconnect internet after installation
   - System should still work locally
   - Only model downloads should fail if attempted

### Phase 6: Cross-Platform Testing

#### Windows Specific Tests
- Run from different drives (C:, D:, etc.)
- Test with Windows Defender active
- Verify no UAC issues
- Check Windows Firewall doesn't block services

#### Linux Specific Tests
- Test on Ubuntu, Fedora, and Arch-based distros
- Verify no permission issues
- Check systemd compatibility (if applicable)

#### macOS Specific Tests
- Test on both Intel and Apple Silicon
- Verify Gatekeeper doesn't block execution
- Check for Rosetta 2 compatibility (M1/M2)

## 🐛 Common Issues and Solutions

### Issue 1: "Port already in use"
**Symptom:** Error message about port 3000 or 8188 being in use

**Solution:**
```bash
# Find and kill the process using the port
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Issue 2: "Ollama not found"
**Symptom:** Error message about Ollama not being installed

**Solution:**
1. Install Ollama from https://ollama.ai/
2. Ensure ollama is in system PATH
3. Run `ollama pull llama2` to get a model

### Issue 3: "CUDA out of memory"
**Symptom:** Error during image generation

**Solution:**
1. Close other GPU-intensive applications
2. Use SD1.5 workflow instead of SDXL
3. Reduce batch size in ComfyUI settings

### Issue 4: "npm not found"
**Symptom:** Web GUI fails to start

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Ensure npm is in system PATH
3. Run `npm install` in web-gui directory

## ✅ Testing Checklist

Complete this checklist before approving for distribution:

- [ ] Clean installation completes without errors
- [ ] All services start successfully
- [ ] Web GUI loads and is responsive
- [ ] Chat interface works with Ollama
- [ ] Image generation produces output
- [ ] Ctrl+C shuts down cleanly
- [ ] No firewall/antivirus warnings
- [ ] Works offline after installation
- [ ] Error messages are clear and helpful
- [ ] Resource usage is reasonable
- [ ] No leftover processes after shutdown

## 📊 Performance Benchmarks

Record these metrics for reference:

| Metric | Target | Actual |
|--------|--------|--------|
| Installation time | < 60 min | _____ |
| Startup time | < 30 sec | _____ |
| First image generation | < 5 min | _____ |
| RAM usage (idle) | < 4 GB | _____ |
| RAM usage (generating) | < 16 GB | _____ |

## 🔍 Final Verification

Before distribution, perform these final checks:

1. **Clean Test**: Delete everything and test from scratch
2. **Offline Test**: Ensure it works without internet (post-install)
3. **Documentation Test**: Follow README as a new user would
4. **Update Test**: Verify CHANGELOG.md is current

## 📝 Test Report Template

```
Date: ____________
Tester: __________
Platform: ________
Python Version: __
GPU: ____________

Installation: [ ] Pass [ ] Fail
Startup: [ ] Pass [ ] Fail
Web GUI: [ ] Pass [ ] Fail
Chat: [ ] Pass [ ] Fail
Image Gen: [ ] Pass [ ] Fail
Shutdown: [ ] Pass [ ] Fail

Notes:
_________________
_________________
_________________

Approved for distribution: [ ] Yes [ ] No
```

---

For any issues not covered here, refer to the main README.md or create an issue in the repository.