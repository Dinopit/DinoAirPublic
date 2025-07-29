# 🔧 DinoAir Troubleshooting Guide

> **Complete guide to diagnosing and resolving common DinoAir issues**

This comprehensive troubleshooting guide helps you diagnose and resolve the most common issues encountered while using DinoAir. Issues are organized by component for easy navigation.

## 📋 Quick Reference

### Emergency Commands
```bash
# Kill all DinoAir processes
python stop.py  # Or Ctrl+C if running in foreground

# Check what's running on DinoAir ports
netstat -ano | findstr :3000    # Windows
netstat -ano | findstr :8188    # ComfyUI
netstat -ano | findstr :11434   # Ollama

lsof -ti:3000 | xargs kill      # Linux/Mac
lsof -ti:8188 | xargs kill      # ComfyUI
lsof -ti:11434 | xargs kill     # Ollama

# Check system resources
python -c "import psutil; print(f'CPU: {psutil.cpu_percent()}%, Memory: {psutil.virtual_memory().percent}%')"
```

### Service Status Check
```bash
# Check if services are responding
curl http://localhost:3000/api/health      # Web GUI health
curl http://localhost:8188/system_stats    # ComfyUI status
curl http://localhost:11434/api/tags       # Ollama models
```

---

## 🚀 Installation & Setup Issues

### Issue: Installation Fails with Prerequisites Error

**Symptoms:**
- "Python version not supported" errors
- "Node.js not found" messages
- Installation script crashes early

**Solutions:**

1. **Check Python Version**
   ```bash
   python --version  # Should be 3.10+
   python3 --version  # On Linux/Mac
   ```
   If version is too old, install Python 3.10+ from [python.org](https://python.org/downloads/)

2. **Check Node.js Version**
   ```bash
   node --version  # Should be 18+
   npm --version
   ```
   If missing, install from [nodejs.org](https://nodejs.org/)

3. **Use Safe Installer**
   ```bash
   python install_safe.py  # Enhanced installer with better error handling
   ```

### Issue: "Permission Denied" During Installation

**Symptoms:**
- Installation fails with permission errors
- Cannot create directories or files

**Solutions:**

1. **Windows:** Run Command Prompt as Administrator
2. **Linux/Mac:** Use proper permissions
   ```bash
   # Don't use sudo with the installer - it can cause issues
   # Instead, ensure your user has write access to the installation directory
   chmod 755 /path/to/dinoair
   ```

3. **Alternative:** Install to user directory
   ```bash
   python install_safe.py --user-install
   ```

### Issue: Disk Space Insufficient

**Symptoms:**
- Installation stops with "No space left on device"
- Model downloads fail

**Requirements:**
- **Minimum:** 8GB free space
- **Recommended:** 20GB+ for multiple models

**Solutions:**
```bash
# Check available space
df -h .  # Linux/Mac
dir    # Windows (shows available space)

# Clean up space if needed
python -c "import shutil; print(f'Free space: {shutil.disk_usage(\".\")[2] / (1024**3):.1f}GB')"
```

---

## 🎨 ComfyUI Troubleshooting

### Issue: ComfyUI Won't Start

**Symptoms:**
- "Connection refused" on port 8188
- ComfyUI process exits immediately
- Browser shows "This site can't be reached"

**Diagnostic Commands:**
```bash
# Check if ComfyUI process is running
ps aux | grep ComfyUI  # Linux/Mac
tasklist | findstr ComfyUI  # Windows

# Check port status
netstat -an | grep 8188  # Linux/Mac
netstat -an | findstr 8188  # Windows

# Check ComfyUI logs
tail -f logs/comfyui.log  # If logging is enabled
```

**Solutions:**

1. **Port Conflict Resolution**
   ```bash
   # Find process using port 8188
   lsof -ti:8188  # Linux/Mac
   netstat -ano | findstr :8188  # Windows
   
   # Kill conflicting process
   kill <PID>  # Linux/Mac
   taskkill /PID <PID> /F  # Windows
   ```

2. **Manual ComfyUI Start**
   ```bash
   cd ComfyUI
   python main.py --listen 0.0.0.0 --port 8188
   ```

3. **Check System Resources**
   ```bash
   # ComfyUI needs adequate GPU memory
   nvidia-smi  # Check GPU memory if using NVIDIA
   python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
   ```

### Issue: Image Generation Fails

**Symptoms:**
- Workflow starts but never completes
- "Out of memory" errors
- Corrupt or black images generated

**Solutions:**

1. **Memory Management**
   ```bash
   # Reduce image resolution temporarily
   # Use 512x512 instead of 1024x1024 for testing
   
   # Check available GPU memory
   nvidia-smi
   ```

2. **Model Issues**
   ```bash
   # Re-download corrupted models
   python download_models.py --verify-checksums
   python download_models.py --redownload
   ```

3. **Workflow Validation**
   - Ensure workflow JSON is valid
   - Check all required nodes are available
   - Verify model paths in workflow

### Issue: ComfyUI UI Loads but Workflows Fail

**Symptoms:**
- ComfyUI interface appears normal
- Workflows queue but don't execute
- "Node not found" errors

**Solutions:**

1. **Missing Custom Nodes**
   ```bash
   cd ComfyUI/custom_nodes
   git clone <missing-node-repository>
   pip install -r requirements.txt  # In the node directory
   ```

2. **Model Path Issues**
   - Check that model files exist in `ComfyUI/models/`
   - Verify model names match exactly (case-sensitive)
   - Ensure models aren't corrupted

3. **Clear ComfyUI Cache**
   ```bash
   # Remove cached workflows
   rm -rf ComfyUI/temp/*
   rm -rf ComfyUI/output/*  # Careful: removes generated images
   ```

---

## 🤖 Ollama Troubleshooting

### Issue: Ollama Service Not Running

**Symptoms:**
- "Connection refused" on port 11434
- Chat functionality doesn't work
- API requests timeout

**Diagnostic Commands:**
```bash
# Check Ollama status
ollama list  # Should show installed models
curl http://localhost:11434/api/tags  # API check

# Check Ollama service
ps aux | grep ollama  # Linux/Mac
sc query ollama  # Windows (if installed as service)
```

**Solutions:**

1. **Start Ollama Service**
   ```bash
   # Manual start
   ollama serve  # Starts Ollama server
   
   # Background start
   nohup ollama serve > ollama.log 2>&1 &  # Linux/Mac
   ```

2. **Port Configuration**
   ```bash
   # Change Ollama port if 11434 is occupied
   export OLLAMA_HOST=0.0.0.0:11435
   ollama serve
   ```

3. **Reinstall Ollama (if corrupted)**
   ```bash
   # Download from https://ollama.ai/
   # Follow platform-specific installation instructions
   ```

### Issue: Model Download Failures

**Symptoms:**
- "Failed to download model" errors
- Downloads hang or timeout
- Partial model files

**Solutions:**

1. **Check Internet Connection**
   ```bash
   # Test connectivity to Ollama registry
   ping registry.ollama.ai
   curl -I https://registry.ollama.ai
   ```

2. **Resume Failed Downloads**
   ```bash
   # Ollama automatically resumes, but you can force restart
   ollama pull llama2  # Re-download specific model
   ollama pull --insecure llama2  # If SSL issues
   ```

3. **Manual Model Management**
   ```bash
   # Check downloaded models
   ollama list
   
   # Remove corrupted model
   ollama rm llama2
   
   # Re-download
   ollama pull llama2
   ```

4. **Disk Space Issues**
   ```bash
   # Models are large (4GB+), ensure adequate space
   df -h  # Check free space
   du -sh ~/.ollama/  # Check Ollama storage usage
   ```

### Issue: Chat Responses Are Slow or Hang

**Symptoms:**
- Long delays before responses
- Incomplete responses
- Timeout errors

**Solutions:**

1. **Check System Resources**
   ```bash
   # Ollama is CPU/RAM intensive
   top  # Monitor CPU/memory usage
   htop  # Better alternative if available
   ```

2. **Model Size Optimization**
   ```bash
   # Use smaller models for testing
   ollama pull llama2:7b     # Instead of llama2:13b
   ollama pull phi3:mini     # Very lightweight option
   ```

3. **Increase Timeout Settings**
   - Modify config.yaml to increase `ollama.api_timeout`
   - Default is 60 seconds, try 120 or 180

---

## 🌐 Web GUI Troubleshooting

### Issue: Web UI Won't Load

**Symptoms:**
- Browser shows blank page
- "This site can't be reached" error
- Page loads partially then breaks

**Diagnostic Commands:**
```bash
# Check web server status
curl http://localhost:3000/  # Should return HTML
curl http://localhost:3000/api/health  # API health check

# Check process
ps aux | grep node  # Linux/Mac
tasklist | findstr node  # Windows
```

**Solutions:**

1. **Port Conflicts**
   ```bash
   # Check what's using port 3000
   lsof -ti:3000  # Linux/Mac
   netstat -ano | findstr :3000  # Windows
   
   # Kill conflicting process
   kill <PID>  # Linux/Mac
   taskkill /PID <PID> /F  # Windows
   ```

2. **Node.js Issues**
   ```bash
   cd web-gui-node
   npm install  # Reinstall dependencies
   npm run build  # Rebuild application
   ```

3. **Browser Cache Issues**
   - Clear browser cache and cookies
   - Try incognito/private browsing mode
   - Test with different browser

### Issue: PrismJS Syntax Highlighting Errors

**Symptoms:**
- JavaScript errors in browser console
- Code blocks don't render properly
- UI elements missing or broken

**Solutions:**

1. **Clear Browser Cache**
   - Force refresh with Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Clear all browser data for localhost

2. **Reinstall Dependencies**
   ```bash
   cd web-gui-node
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

3. **Check for JavaScript Errors**
   - Open browser Developer Tools (F12)
   - Look for errors in Console tab
   - Report specific error messages for further help

### Issue: Authentication Timeouts

**Symptoms:**
- Login requests hang
- "Request timeout" after 10+ seconds
- Authentication randomly fails

**Diagnostic Commands:**
```bash
# Check auth service response
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  --max-time 10

# Monitor memory usage during auth
python -c "import psutil; print(f'Memory: {psutil.virtual_memory().percent}%')"
```

**Solutions:**

1. **Memory Pressure Relief**
   ```bash
   # Check if system is low on memory
   free -h  # Linux
   wmic OS get TotalVisibleMemorySize,FreePhysicalMemory  # Windows
   
   # Restart services to clear memory leaks
   python stop.py
   python start.py
   ```

2. **Rate Limiting Issues**
   - Wait 60 seconds before retrying authentication
   - Reduce concurrent requests
   - Check if IP is rate-limited

3. **Database Connection Issues**
   ```bash
   # Check if database files are accessible
   ls -la web-gui-node/data/  # Check database directory
   ```

### Issue: API Requests Fail with 429 (Too Many Requests)

**Symptoms:**
- "Rate limit exceeded" errors
- API requests randomly rejected
- Service becomes temporarily unavailable

**Solutions:**

1. **Check Rate Limit Status**
   ```bash
   curl http://localhost:3000/api/system/rate-limit-status
   ```

2. **Reduce Request Frequency**
   - Add delays between requests
   - Implement client-side throttling
   - Use batch requests where possible

3. **Configure Rate Limits**
   - Modify `config.yaml` rate limiting settings
   - Increase `rate_limit_requests` and `rate_limit_window`

---

## 🖥️ System Resources & Performance

### Issue: High Memory Usage

**Symptoms:**
- System becomes slow or unresponsive
- Out of memory errors
- Services crash unexpectedly

**Diagnostic Commands:**
```bash
# Check overall system memory
free -h  # Linux
wmic OS get TotalVisibleMemorySize,FreePhysicalMemory  # Windows

# Check DinoAir process memory
ps aux | grep -E "(python|node|ollama)" | awk '{print $4, $11}'  # Linux/Mac
tasklist | findstr -E "(python|node|ollama)"  # Windows

# Monitor memory usage over time
top -p $(pgrep -d',' -f dinoair)  # Linux
```

**Solutions:**

1. **Automatic Model Unloading**
   - DinoAir automatically unloads models when memory is low
   - Check logs for "Model unloaded due to memory pressure" messages

2. **Reduce Concurrent Operations**
   - Limit simultaneous image generations
   - Avoid running multiple chat sessions
   - Close unnecessary browser tabs

3. **System-Level Solutions**
   ```bash
   # Increase swap space (Linux)
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Issue: High CPU Usage

**Symptoms:**
- System fans running constantly
- Slow response times
- High system temperature

**Solutions:**

1. **Check CPU Usage Distribution**
   ```bash
   # Identify which process is using CPU
   top -o cpu  # Sort by CPU usage
   htop  # Interactive process viewer
   ```

2. **Optimize Model Selection**
   - Use smaller language models (7B instead of 13B parameters)
   - Reduce image generation resolution
   - Enable GPU acceleration if available

3. **Resource Limits**
   - Modify `config.yaml` to set `max_cpu_percent`
   - Limit concurrent workers in `server.workers`

### Issue: Disk Space Problems

**Symptoms:**
- "No space left on device" errors
- Model downloads fail
- Application crashes

**Solutions:**

1. **Check Disk Usage**
   ```bash
   # Overall disk usage
   df -h  # Linux/Mac
   dir  # Windows
   
   # DinoAir-specific usage
   du -sh /path/to/dinoair  # Linux/Mac
   ```

2. **Clean Up Space**
   ```bash
   # Remove old artifacts (if safe to do so)
   rm -rf web-gui-node/public/artifacts/old/*
   
   # Clean ComfyUI temporary files
   rm -rf ComfyUI/temp/*
   
   # Remove old model files
   ollama rm <unused-model>
   ```

3. **Move Models to External Storage**
   ```bash
   # Symlink large directories to external storage
   mv ~/.ollama /external/drive/ollama
   ln -s /external/drive/ollama ~/.ollama
   ```

---

## 🔍 Diagnostic Tools & Commands

### System Information
```bash
# Get comprehensive system info
python -c "
import platform, psutil, shutil
print(f'OS: {platform.system()} {platform.release()}')
print(f'Python: {platform.python_version()}')
print(f'CPU: {psutil.cpu_count()} cores, {psutil.cpu_percent()}% usage')
memory = psutil.virtual_memory()
print(f'Memory: {memory.percent}% used ({memory.used // 1024**3}GB/{memory.total // 1024**3}GB)')
disk = shutil.disk_usage('.')
print(f'Disk: {((disk.total - disk.free) / disk.total * 100):.1f}% used ({disk.free // 1024**3}GB free)')
"
```

### Service Status Check
```bash
# Complete service status
python -c "
import requests
import subprocess

services = [
    ('Web GUI', 'http://localhost:3000/api/health'),
    ('ComfyUI', 'http://localhost:8188/system_stats'),
    ('Ollama', 'http://localhost:11434/api/tags')
]

for name, url in services:
    try:
        response = requests.get(url, timeout=5)
        print(f'{name}: ✅ Running (HTTP {response.status_code})')
    except Exception as e:
        print(f'{name}: ❌ Not responding - {str(e)}')
"
```

### Log Analysis
```bash
# Check recent errors in logs
tail -n 50 logs/dinoair.log | grep -i error  # Linux/Mac

# Monitor logs in real-time
tail -f logs/dinoair.log  # Linux/Mac
Get-Content logs/dinoair.log -Tail 10 -Wait  # Windows PowerShell
```

### Performance Monitoring
```bash
# Real-time resource monitoring
python -c "
import psutil
import time

print('Monitoring system resources... (Ctrl+C to stop)')
try:
    while True:
        cpu = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        print(f'CPU: {cpu:5.1f}% | Memory: {memory.percent:5.1f}% | Available: {memory.available // 1024**2}MB')
        time.sleep(2)
except KeyboardInterrupt:
    print('Monitoring stopped.')
"
```

---

## ❓ Frequently Asked Questions (FAQ)

### Q: Can I run DinoAir on a low-end computer?
**A:** DinoAir requires significant resources:
- **Minimum:** 8GB RAM, 4 CPU cores, 20GB disk space
- **Recommended:** 16GB+ RAM, 8+ CPU cores, 50GB+ disk space
- GPU acceleration recommended for image generation

### Q: Why is DinoAir using so much memory?
**A:** Large language models and image generation models require substantial memory:
- Language models: 4-8GB RAM per model
- Image generation: 2-6GB VRAM/RAM
- Web services: 1-2GB RAM
- **Solution:** Use smaller models or increase system memory

### Q: Can I use DinoAir without an internet connection?
**A:** Partially - after initial setup:
- ✅ Chat with downloaded models works offline
- ✅ Image generation works offline
- ❌ Model downloads require internet
- ❌ Some updates and features need connectivity

### Q: How do I update DinoAir?
**A:** 
```bash
git pull origin main  # Get latest code
python install_safe.py --update  # Update dependencies
```

### Q: Why is image generation so slow?
**A:** Several factors affect speed:
- **CPU vs GPU:** GPU is 10-100x faster
- **Model size:** Larger models = slower generation
- **Image resolution:** Higher resolution = slower
- **System resources:** Insufficient RAM/VRAM slows everything
- **Solution:** Use GPU acceleration, smaller models, or lower resolution

### Q: Can I run multiple instances of DinoAir?
**A:** Not recommended on the same machine due to:
- Port conflicts
- Resource competition
- Model loading conflicts
- **Alternative:** Use Docker containers with different port mappings

### Q: How do I backup my DinoAir data?
**A:**
```bash
# Backup generated artifacts
cp -r web-gui-node/public/artifacts /backup/location

# Backup configuration
cp config.yaml /backup/location

# Backup models (large files)
cp -r ~/.ollama/models /backup/location
cp -r ComfyUI/models /backup/location
```

### Q: What ports does DinoAir use?
**A:** Default ports (configurable):
- **3000:** Web GUI / API
- **8188:** ComfyUI interface
- **11434:** Ollama API
- Ensure these ports are available and not blocked by firewall

### Q: How do I completely uninstall DinoAir?
**A:**
```bash
# Stop all services
python stop.py

# Remove DinoAir directory
rm -rf /path/to/dinoair  # Linux/Mac
rmdir /s dinoair  # Windows

# Remove Ollama models (optional)
rm -rf ~/.ollama  # Linux/Mac
rmdir /s %USERPROFILE%\.ollama  # Windows

# Remove Node.js dependencies (if not used elsewhere)
# This step is optional and depends on your system setup
```

---

## 🆘 Getting Additional Help

### Before Reporting Issues
1. **Check this troubleshooting guide**
2. **Search existing issues** on the GitHub repository
3. **Collect diagnostic information**:
   ```bash
   # System info
   python -c "import platform; print(platform.platform())"
   
   # DinoAir version
   git log --oneline -1
   
   # Resource usage
   python -c "import psutil; print(f'CPU: {psutil.cpu_percent()}%, Memory: {psutil.virtual_memory().percent}%')"
   ```

### Reporting Issues
When reporting problems, include:
- **Exact error messages** (copy/paste, don't screenshot text)
- **Steps to reproduce** the issue
- **System information** (OS, Python version, available resources)
- **Configuration** (anonymized config.yaml if relevant)
- **Logs** (relevant portions, not entire files)

### Community Resources
- **GitHub Issues:** Report bugs and feature requests
- **Documentation:** Check `/docs` directory for technical details
- **Configuration Examples:** See `config.example.yaml`

### Emergency Recovery
If DinoAir becomes completely unresponsive:
```bash
# Nuclear option: kill all related processes
pkill -f "python.*start.py"
pkill -f "node.*web-gui"
pkill -f ollama
pkill -f ComfyUI

# Then restart clean
python start.py
```

---

**Remember:** DinoAir is experimental software. Always backup important data and test in a safe environment first.

*This troubleshooting guide covers the most common issues. For specific problems not covered here, please check the project documentation or report an issue on GitHub.*