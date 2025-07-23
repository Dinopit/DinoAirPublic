# DinoAir Installer

A cross-platform Electron installer for the DinoAir Progressive Mode System.

## Features

- 🦕 Custom DinoAir branding with dinosaur-themed icons
- 🔍 Automatic hardware detection using Python scripts
- 🎯 Smart mode recommendations based on system capabilities
- 📁 Custom installation path selection
- 🔐 Code signing support for all platforms
- 🚀 One-click installation process

## Prerequisites

- Node.js 16+ and npm
- Python 3.7+ (for hardware detection)
- For building:
  - Windows: Windows 10/11
  - macOS: macOS 10.13+
  - Linux: Ubuntu 18.04+ or equivalent

## Development Setup

1. Install dependencies:
   ```bash
   cd installer
   npm install
   ```

2. Generate icons (requires sharp):
   ```bash
   npm run generate-icons
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

## Building Installers

### Generate Icons First
Before building, generate all icon formats:
```bash
npm run generate-icons
```

This creates:
- Windows: `assets/icon.ico`
- macOS: `assets/icon.icns`
- Linux: `assets/icon.png`

### Build Commands

Build for all platforms:
```bash
npm run build
```

Build for specific platform:
```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

### Code Signing

See [CODE_SIGNING.md](CODE_SIGNING.md) for detailed instructions on code signing for each platform.

Quick setup:
- **Windows**: Set `WINDOWS_CERTIFICATE_FILE` and `WINDOWS_CERTIFICATE_PASSWORD`
- **macOS**: Set `APPLE_TEAM_ID` and `APPLE_IDENTITY`

## Project Structure

```
installer/
├── assets/              # Icons and resources
├── scripts/             # Build and utility scripts
│   ├── generate-icons.js       # Icon generation script
│   └── hardware_detector_wrapper.py  # Python hardware detection wrapper
├── main.js             # Main Electron process
├── renderer.js         # Renderer process logic
├── preload.js          # Preload script for IPC
├── index.html          # Installer UI
├── styles.css          # Installer styles
├── package.json        # Project configuration
├── entitlements.mac.plist  # macOS entitlements
└── CODE_SIGNING.md     # Code signing documentation
```

## Hardware Detection

The installer uses the actual `hardware_detector.py` from the DinoAir lib directory. The detection includes:
- CPU information (cores, threads, frequency)
- RAM capacity and availability
- GPU detection with VRAM
- Automatic hardware tier determination

## Installation Flow

1. **Welcome Screen** - Introduction and feature overview
2. **Hardware Detection** - Automatic system analysis
3. **Mode Selection** - Choose between Easy, Standard, or Pro mode
4. **Installation Path** - Select custom installation directory
5. **Installation Progress** - Real-time progress with detailed logs
6. **Success/Error Screen** - Installation result with next steps

## Customization

### Icons
Edit `scripts/generate-icons.js` to modify the DinoAir dinosaur logo SVG design.

### Installation Steps
Modify the `steps` array in `main.js` to add or customize installation phases.

### UI Theme
Update `styles.css` to change colors, fonts, or layout.

## Testing

Run the test suite:
```bash
npm test
```

Test the installer without building:
```bash
npm start
```

## Troubleshooting

### Icon Generation Issues
- Ensure ImageMagick is installed for ICO generation
- On macOS, iconutil is required for ICNS generation
- Install sharp if missing: `npm install sharp`

### Hardware Detection Fails
- Verify Python is installed and in PATH
- Check that psutil is available: `pip install psutil`
- The installer will fall back to basic OS-level detection if needed

### Build Failures
- Clear the dist folder: `rm -rf dist`
- Reinstall dependencies: `npm ci`
- Check electron-builder logs for specific errors

## Distribution

Built installers are located in the `dist` folder:
- Windows: `DinoAir-Installer-Setup-*.exe`
- macOS: `DinoAir-Installer-*.dmg`
- Linux: `DinoAir-Installer-*.AppImage`, `.deb`, `.rpm`

## License

MIT License - See the main DinoAir project for details.