# 🤔 DinoAir Frequently Asked Questions (FAQ)

> Quick answers to common DinoAir questions

## 🚀 Getting Started

### Q: What are the minimum system requirements?
**A:** 
- **RAM:** 8GB minimum (16GB+ recommended)
- **CPU:** 4+ cores (8+ recommended) 
- **Storage:** 20GB free space (50GB+ recommended)
- **OS:** Windows 10+, macOS 10.15+, or Linux
- **Python:** 3.10 or higher
- **Node.js:** 18 or higher

### Q: Can DinoAir run without internet?
**A:** Partially - after initial setup:
- ✅ Chat with downloaded models
- ✅ Image generation  
- ❌ Initial model downloads
- ❌ Software updates

### Q: Do I need a GPU?
**A:** Not required, but highly recommended:
- **CPU-only:** Works but slow (especially image generation)
- **GPU:** 10-100x faster image generation
- **Minimum GPU:** 4GB VRAM for basic image generation
- **Recommended:** 8GB+ VRAM for high-quality results

## 🔧 Installation & Setup

### Q: Installation failed - what should I do?
**A:** Try these steps in order:
1. Use `python install_safe.py` (enhanced installer)
2. Check prerequisites: Python 3.10+, Node.js 18+
3. Ensure 20GB+ free disk space
4. Run as administrator (Windows) or check permissions
5. Check antivirus isn't blocking installation

### Q: How do I update DinoAir?
**A:**
```bash
git pull origin main
python install_safe.py --update
```

### Q: Can I change the installation directory?
**A:** Yes, just clone/extract DinoAir to your preferred location. All paths are relative.

## 🎨 Image Generation (ComfyUI)

### Q: Why is image generation so slow?
**A:** Several factors affect speed:
- **No GPU:** Use GPU acceleration for 10-100x speedup
- **Large models:** Try smaller/faster models
- **High resolution:** Start with 512x512, increase gradually
- **System resources:** Close other applications

### Q: ComfyUI won't start - what's wrong?
**A:** Common causes:
- **Port 8188 in use:** Kill conflicting process or restart
- **Insufficient resources:** Need 2-4GB RAM minimum
- **Missing dependencies:** Reinstall ComfyUI dependencies
- **GPU driver issues:** Update GPU drivers

### Q: Generated images are corrupted or black
**A:** Try these solutions:
- Restart ComfyUI service
- Check GPU memory isn't exhausted
- Verify model files aren't corrupted
- Use lower resolution temporarily

## 🤖 Chat (Ollama)

### Q: Chat doesn't work - what should I check?
**A:**
1. Verify Ollama is running: `ollama list`
2. Check service: `curl http://localhost:11434/api/tags`
3. Restart if needed: `ollama serve`
4. Ensure models are downloaded

### Q: How do I add new language models?
**A:**
```bash
ollama pull llama2        # Download Llama 2
ollama pull mistral       # Download Mistral
ollama pull phi3          # Download Phi-3 (lightweight)
ollama list               # See all models
```

### Q: Chat responses are very slow
**A:**
- **Use smaller models:** Try phi3:mini instead of larger models
- **Check CPU usage:** Close other applications
- **Increase timeout:** Modify config.yaml ollama.api_timeout
- **Add more RAM:** Language models are memory-intensive

### Q: Model download failed
**A:**
- **Check internet:** Ping registry.ollama.ai
- **Check disk space:** Models are 4-7GB each
- **Resume download:** `ollama pull <model-name>` (auto-resumes)
- **Clear cache:** Remove ~/.ollama and re-download

## 🌐 Web Interface

### Q: Web page is blank or broken
**A:**
1. **Clear browser cache:** Ctrl+F5 or Cmd+Shift+R
2. **Try incognito mode:** Rules out browser cache issues
3. **Check different browser:** Chrome, Firefox, Safari
4. **Check console errors:** F12 → Console tab
5. **Restart web server:** `python stop.py && python start.py`

### Q: Login keeps hanging or timing out
**A:**
- **Memory issue:** System low on RAM, restart services
- **Rate limiting:** Wait 60 seconds before retrying
- **Database issue:** Check web-gui-node/data/ directory
- **Port conflict:** Ensure port 3000 is available

### Q: "PrismJS error" in browser console
**A:**
```bash
cd web-gui-node
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 🖥️ Performance & Resources

### Q: DinoAir is using too much memory
**A:**
- **Normal usage:** 8-16GB for full functionality
- **Model loading:** Each model uses 4-8GB
- **Reduce usage:** Use smaller models, limit concurrent operations
- **Memory leak:** Restart services periodically

### Q: Can I run DinoAir on a laptop?
**A:** Yes, but consider:
- **Battery life:** Very resource-intensive
- **Performance:** May be slower than desktop
- **Cooling:** Ensure good ventilation
- **Power:** Connect to charger for best performance

### Q: How much disk space does DinoAir need?
**A:**
- **Installation:** ~2GB
- **Language models:** 4-7GB each
- **Image models:** 2-5GB each
- **Generated content:** Grows over time
- **Total recommendation:** 50GB+ free space

## 🔒 Security & Privacy

### Q: Is my data private?
**A:** Yes - DinoAir runs entirely locally:
- ✅ No data sent to external servers
- ✅ All processing happens on your machine
- ✅ You control all data and models
- ⚠️ Initial model downloads require internet

### Q: Can I use DinoAir commercially?
**A:** Check the license terms, but generally:
- ✅ DinoAir software: MIT license (permissive)
- ⚠️ AI models: Each model has its own license
- 📖 Review specific model licenses before commercial use

### Q: How do I backup my DinoAir data?
**A:**
```bash
# Generated content
cp -r web-gui-node/public/artifacts /backup/location

# Configuration  
cp config.yaml /backup/location

# Models (large files)
cp -r ~/.ollama/models /backup/location
```

## 🆘 Troubleshooting

### Q: Nothing works - how do I reset everything?
**A:** Nuclear reset (⚠️ **loses generated content**):
```bash
# Stop everything
python stop.py

# Kill any stuck processes
pkill -f dinoair
pkill -f ollama
pkill -f ComfyUI

# Clear caches
rm -rf web-gui-node/node_modules
rm -rf ComfyUI/temp/*

# Restart fresh
python install_safe.py
python start.py
```

### Q: How do I completely uninstall DinoAir?
**A:**
```bash
# Stop services
python stop.py

# Remove DinoAir directory
rm -rf /path/to/dinoair

# Remove models (optional)
rm -rf ~/.ollama
```

### Q: Where can I get more help?
**A:**
1. **📖 Read:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed guides
2. **🔍 Search:** GitHub issues for similar problems
3. **🐛 Report:** Create new GitHub issue with:
   - System info (OS, Python version, resources)
   - Exact error messages
   - Steps to reproduce
   - Relevant logs

### Q: Error messages are confusing - what do they mean?
**A:** Common error patterns:
- **"Connection refused"** → Service not running
- **"Port already in use"** → Another process using the port  
- **"Out of memory"** → Need more RAM or smaller models
- **"Permission denied"** → Run as administrator or fix file permissions
- **"Module not found"** → Missing dependencies, run installer again

---

## 📚 More Resources

- **🔧 [Comprehensive Troubleshooting](TROUBLESHOOTING.md)** - Detailed problem-solving guides
- **📖 [Main Documentation](README.md)** - Complete setup and usage guide
- **⚙️ [Configuration Guide](docs/CONFIGURATION_MANAGEMENT.md)** - Advanced configuration options
- **🔒 [Security Guide](SECURITY.md)** - Security best practices

---

*Can't find your question? Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or create a GitHub issue!*