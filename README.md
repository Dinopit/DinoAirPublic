# DinoAir Free Tier - Self-Contained Package

Welcome to the DinoAir Free Tier! This is a complete, self-contained package that includes everything you need to run DinoAir locally with AI chat capabilities and image generation.

## What's Included

- **Web GUI**: A modern Next.js web interface for chatting with AI
- **ComfyUI**: For AI image generation with SDXL models
- **Ollama Integration**: For local AI language models
- **Artifact System**: Store and manage generated content locally

## Prerequisites

Before installation, ensure you have:

1. **Python 3.11 or higher**
2. **Node.js 18 or higher** (with npm)
3. **Ollama** installed from https://ollama.ai/
4. **Git** (for cloning ComfyUI)

## Installation

To install DinoAir Free Tier, run the installer from this directory:

```bash
python install.py
```

The installer will:
- Check all prerequisites
- Install ComfyUI and its dependencies
- Pull the required Ollama model (Qwen 7B Vision)
- Install the Web GUI dependencies
- Optionally download SDXL models (~7.3GB total)

### SDXL Model Download Options

During installation, you'll be prompted to download the SDXL models. You have three options:

1. **Automatic Download** (Recommended)
   - Downloads SDXL base model (sd_xl_base_1.0.safetensors) - ~6.94GB
   - Downloads SDXL VAE (sdxl_vae.safetensors) - ~335MB
   - Features resume capability, progress tracking, and file verification

2. **Manual Download Later**
   ```bash
   python download_models.py
   ```

3. **Skip and Add Your Own Models**
   - Place any SDXL-compatible `.safetensors` files in `ComfyUI/models/checkpoints`

## Running DinoAir

Simply run the start script:

```bash
python start.py
```

This will:
1. Start ComfyUI on http://localhost:8188
2. Start the Web GUI on http://localhost:3000
3. Ensure Ollama is running
4. Open your browser automatically

Press `Ctrl+C` to stop all services.

## Using DinoAir

### Chat Interface
- Navigate to http://localhost:3000
- The interface will redirect to the local GUI
- Start chatting with the AI assistant
- Generated content will be saved as artifacts

### Artifacts
- View and manage artifacts in the "Artifacts" tab
- Download, edit, or delete saved content
- Artifacts are stored locally in your browser

### Image Generation
- Use natural language prompts to generate images
- Images are created using the SDXL model through ComfyUI
- Results appear in the chat and are saved as artifacts

## Customization

### Personalities

Customize the AI's personality by modifying JSON files in the `personalities` directory:

- **witty**: A witty and sarcastic assistant
- **technical**: A technical and precise assistant
- **creative**: A creative and inspiring assistant
- **mentally-unstable**: An unstable and unpredictable assistant

### Swapping SDXL Models

To use different SDXL models:

1. Download a compatible `.safetensors` model
2. Place it in `ComfyUI/models/checkpoints`
3. Update the workflow files in `ComfyUI/workflows` to reference your model

## Directory Structure

```
DinoAirFreeTier/
├── web-gui/              # Complete Next.js web application
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── lib/              # Utilities and stores
│   └── public/           # Static assets
├── personalities/        # AI personality configurations
├── FreeTierPacked/       # ComfyUI workflows
├── install.py           # Installation script
├── start.py             # Launch script
├── download_models.py   # Model download utility
└── README.md            # This file
```

## Troubleshooting

### Port Conflicts
If you see "port already in use" errors:
- ComfyUI uses port 8188
- Web GUI uses port 3000
- Stop any other services using these ports

### Installation Issues
- Ensure all prerequisites are installed
- Run the installer with administrator/sudo privileges if needed
- Check the `dinoair_install_log.txt` for details

### Model Download Issues
- Ensure you have ~8GB free disk space
- Use `download_models.py` to retry downloads
- Downloads support resume, so you can restart if interrupted

## Features in Free Tier

- ✅ Local AI chat with Ollama
- ✅ SDXL image generation
- ✅ Artifact management system
- ✅ Multiple AI personalities
- ✅ Browser-based interface
- ✅ Completely offline operation

## Support

This is the free tier of DinoAir. For additional features and support, consider upgrading to the full version.

---

**Note**: This package is designed to be completely self-contained. Simply send the entire `DinoAirFreeTier` folder to share with others.