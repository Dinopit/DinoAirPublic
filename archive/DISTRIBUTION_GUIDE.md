# DinoAir Free Tier - Distribution Guide

This guide explains how to package and distribute the DinoAir Free Tier as a standalone package for end users.

## 📦 Package Structure

The complete DinoAir Free Tier package must include the following directory structure:

```
DinoAirFreeTier/
├── install.py                    # Main installation script
├── start.py                      # Service launcher
├── download_models.py            # Model downloader utility
├── requirements.txt              # Python dependencies
├── README.md                     # User documentation
├── CHANGELOG.md                  # Version history
├── TEST_STANDALONE.md           # Testing procedures
├── DISTRIBUTION_GUIDE.md        # This file
├── FreeTierPacked/              # Workflow configurations
│   ├── Image_to_Image_workflow.json
│   └── sd15-workflow.json
├── personalities/               # AI personality configurations
│   ├── creative.json
│   ├── technical.json
│   ├── witty.json
│   └── mentally-unstable.json
└── web-gui/                     # Next.js web interface
    ├── package.json
    ├── package-lock.json
    ├── next.config.js
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .eslintrc.json
    ├── app/                     # Next.js app directory
    ├── components/              # React components
    ├── lib/                     # Utility libraries
    └── public/                  # Static assets
```

## 🔧 Pre-Distribution Checklist

Before creating a distribution package:

1. **Clean the package**
   ```bash
   # Remove any test outputs
   rm -rf ../ComfyUI/output/*
   rm -rf ../ComfyUI/temp/*
   
   # Remove development files
   rm -rf web-gui/node_modules
   rm -rf web-gui/.next
   rm -rf __pycache__
   rm -rf *.pyc
   ```

2. **Verify core files**
   - [ ] All Python scripts are present and tested
   - [ ] Web GUI source files are complete
   - [ ] Workflows are valid JSON
   - [ ] Documentation is up to date
   - [ ] No sensitive information in configs

3. **Update version information**
   - Update version in README.md
   - Update CHANGELOG.md with release date
   - Tag the repository if using version control

## 📋 Creating Distribution Archives

### Option 1: ZIP Archive (Recommended)

**Windows (PowerShell):**
```powershell
# Navigate to parent directory
cd ..

# Create ZIP archive
Compress-Archive -Path "DinoAirFreeTier" -DestinationPath "DinoAirFreeTier_v1.0.0.zip" -CompressionLevel Optimal

# Verify size (should be < 50MB without models)
Get-Item "DinoAirFreeTier_v1.0.0.zip" | Select-Object Name, Length
```

**Linux/macOS:**
```bash
# Navigate to parent directory
cd ..

# Create ZIP archive
zip -r DinoAirFreeTier_v1.0.0.zip DinoAirFreeTier/ \
  -x "*.pyc" \
  -x "*__pycache__*" \
  -x "*node_modules*" \
  -x "*.next*"

# Verify archive
unzip -l DinoAirFreeTier_v1.0.0.zip | head -20
```

### Option 2: TAR.GZ Archive (Linux/macOS)

```bash
# Create compressed tarball
tar -czf DinoAirFreeTier_v1.0.0.tar.gz \
  --exclude='*.pyc' \
  --exclude='__pycache__' \
  --exclude='node_modules' \
  --exclude='.next' \
  DinoAirFreeTier/

# Verify archive
tar -tzf DinoAirFreeTier_v1.0.0.tar.gz | head -20
```

### Option 3: Self-Extracting Archive (Windows)

Using 7-Zip:
1. Install 7-Zip from https://www.7-zip.org/
2. Right-click on DinoAirFreeTier folder
3. Select 7-Zip → Add to archive
4. Set:
   - Archive format: 7z
   - Compression level: Maximum
   - Create SFX archive: ✓
5. Click OK

## 📝 End User Installation Instructions

Include these instructions with the distribution:

```markdown
# DinoAir Free Tier - Installation Instructions

## System Requirements

### Minimum Requirements
- Operating System: Windows 10/11, Ubuntu 20.04+, macOS 11+
- CPU: 4-core processor (Intel i5/AMD Ryzen 5 or better)
- RAM: 16GB
- GPU: NVIDIA GPU with 8GB VRAM (GTX 1070 or better)
- Storage: 20GB free space
- Python: 3.10 or newer
- Internet: Required for initial setup only

### Recommended Requirements
- RAM: 32GB
- GPU: NVIDIA RTX 3060 or better with 12GB+ VRAM
- Storage: 50GB free space (for additional models)

## Installation Steps

### Step 1: Install Prerequisites

#### Ollama (Required)
1. Visit https://ollama.ai/
2. Download and install Ollama for your OS
3. Open terminal and run: `ollama pull llama2`

#### Python (Required)
1. Visit https://www.python.org/downloads/
2. Download Python 3.10 or newer
3. During installation, check "Add Python to PATH"

#### Node.js (Required)
1. Visit https://nodejs.org/
2. Download LTS version
3. Install with default settings

#### NVIDIA Drivers (For GPU Support)
1. Visit https://www.nvidia.com/drivers
2. Download latest drivers for your GPU
3. Install and restart if prompted

### Step 2: Extract Package

1. Extract the downloaded archive to your desired location
   - Windows: Right-click → Extract All
   - macOS: Double-click the archive
   - Linux: `tar -xzf DinoAirFreeTier_v1.0.0.tar.gz`

2. Open a terminal/command prompt
3. Navigate to the extracted folder:
   ```
   cd path/to/DinoAirFreeTier
   ```

### Step 3: Run Installation

1. Run the installation script:
   ```
   python install.py
   ```

2. The installer will:
   - Set up ComfyUI
   - Install Python dependencies
   - Download AI models (15GB, may take 30-60 minutes)
   - Set up the web interface

3. Wait for "Installation complete!" message

### Step 4: Start DinoAir

1. Run the start script:
   ```
   python start.py
   ```

2. Your browser will open automatically
3. If not, navigate to: http://localhost:3000

## Quick Start Guide

1. **Chat with AI**: Click "Local Chat" to start conversing
2. **Generate Images**: Enter a description and click "Generate"
3. **Change Settings**: Use the gear icon for preferences
4. **Stop Services**: Press Ctrl+C in the terminal

## Troubleshooting

### "Python not found"
- Ensure Python is installed and added to PATH
- Try `python3` instead of `python`

### "Port already in use"
- Another instance may be running
- Close all terminals and try again

### "CUDA out of memory"
- Close other GPU applications
- Use SD1.5 workflow instead of SDXL

### "Ollama not responding"
- Ensure Ollama is installed and running
- Run `ollama serve` in a separate terminal

## Support

- Documentation: See README.md in the package
- Issues: [Your support channel/email]
- Community: [Your community forum/Discord]
```

## 🚀 Distribution Channels

### GitHub Releases
1. Create a new release on GitHub
2. Upload the archive as a release asset
3. Include installation instructions in release notes
4. Use semantic versioning (e.g., v1.0.0)

### Direct Download
1. Host on reliable file sharing service
2. Provide checksums for verification:
   ```bash
   # Generate checksums
   sha256sum DinoAirFreeTier_v1.0.0.zip > checksums.txt
   md5sum DinoAirFreeTier_v1.0.0.zip >> checksums.txt
   ```

### Package Managers (Future)
Consider creating packages for:
- pip (Python Package Index)
- Homebrew (macOS)
- Chocolatey (Windows)
- Snap/Flatpak (Linux)

## 🔒 Security Considerations

1. **Code Signing** (Optional but recommended)
   - Windows: Use Authenticode signing
   - macOS: Use Developer ID signing
   - Linux: Use GPG signing

2. **Checksums**
   Always provide SHA256 checksums:
   ```bash
   sha256sum DinoAirFreeTier_v1.0.0.* > SHA256SUMS.txt
   ```

3. **Virus Scanning**
   - Scan archive before distribution
   - Some users may see false positives from Python executables

## 📊 Distribution Metrics

Track these metrics for improvement:
- Download count
- Installation success rate
- Common support issues
- User feedback
- Platform distribution

## 🎯 Marketing Materials

Include with distribution:
1. **Screenshots**
   - Web GUI interface
   - Image generation examples
   - Chat interface

2. **Quick Demo Video**
   - 2-3 minute overview
   - Installation process
   - Basic usage

3. **Feature List**
   - Offline capability
   - Free and open source
   - Multiple AI models
   - Web-based interface

## 📝 Legal Considerations

1. **License**
   - Include appropriate license file
   - Clarify model licenses (SDXL, etc.)
   - Specify open source components

2. **Disclaimers**
   - AI-generated content disclaimer
   - System requirements disclaimer
   - No warranty statement

3. **Privacy**
   - Clarify data stays local
   - No telemetry or tracking
   - User data ownership

## 🔄 Update Strategy

For future updates:
1. Provide update script
2. Maintain backward compatibility
3. Document migration steps
4. Preserve user data/settings

## 📁 Sample Distribution Script

```bash
#!/bin/bash
# build_distribution.sh

VERSION="1.0.0"
PACKAGE_NAME="DinoAirFreeTier_v${VERSION}"

echo "Building DinoAir Free Tier distribution v${VERSION}..."

# Clean previous builds
rm -rf dist/
mkdir -p dist/

# Copy files
cp -r DinoAirFreeTier dist/

# Clean development files
cd dist/DinoAirFreeTier
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} +
rm -rf web-gui/node_modules
rm -rf web-gui/.next

# Create archives
cd ..
zip -r "${PACKAGE_NAME}.zip" DinoAirFreeTier/
tar -czf "${PACKAGE_NAME}.tar.gz" DinoAirFreeTier/

# Generate checksums
sha256sum "${PACKAGE_NAME}".* > SHA256SUMS.txt

# Display results
echo "Distribution packages created:"
ls -lh "${PACKAGE_NAME}".*
echo "Checksums:"
cat SHA256SUMS.txt

echo "Distribution build complete!"
```

---

For questions about distribution, contact the development team or refer to the main project documentation.