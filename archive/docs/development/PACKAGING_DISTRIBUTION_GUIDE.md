# DinoAir CLI Installer Distribution System

This document provides comprehensive documentation for the DinoAir CLI installer distribution and packaging system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Building Packages](#building-packages)
- [Distribution Channels](#distribution-channels)
- [Update Management](#update-management)
- [Telemetry & Analytics](#telemetry--analytics)
- [Enterprise Deployment](#enterprise-deployment)
- [Security & Code Signing](#security--code-signing)
- [Troubleshooting](#troubleshooting)

## Overview

The DinoAir distribution system provides:

- **Cross-platform installers** for Windows, macOS, and Linux
- **Automated CI/CD** pipeline for building and signing packages
- **Multiple distribution channels** (stable, beta, alpha)
- **Auto-update mechanisms** with rollback support
- **Privacy-aware telemetry** for installation analytics
- **Enterprise deployment** options with centralized management
- **Customizable installers** with branding and configuration options

## Architecture

```
DinoAir Distribution System
├── GitHub Actions CI/CD
│   ├── build-and-release.yml (Automated builds)
│   └── Artifact distribution to GitHub Releases
├── Installer Components
│   ├── Electron GUI Installer (Windows, macOS, Linux)
│   ├── CLI Installer (Node.js based)
│   └── Platform-specific packages (MSI, DMG, DEB, RPM, AppImage)
├── Update System
│   ├── UpdateManager (Version checking & downloads)
│   ├── GitHub Releases API integration
│   └── Rollback support
├── Telemetry System
│   ├── Privacy-aware analytics
│   ├── Installation success tracking
│   └── Hardware compatibility metrics
└── Distribution Management
    ├── Configuration system (YAML based)
    ├── Branding customization
    └── Enterprise deployment options
```

## Installation

### Prerequisites

- **Node.js 14+** for CLI installer development
- **Python 3.11+** for DinoAir core functionality
- **Git** for version control
- **Platform-specific tools**:
  - Windows: Visual Studio Build Tools, Windows SDK
  - macOS: Xcode Command Line Tools
  - Linux: Standard build tools (`build-essential`)

### Setting Up Development Environment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Dinopit/DinoAirPublic.git
   cd DinoAirPublic/installer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   pip install -r ../requirements.txt
   pip install -r ../requirements-test.txt
   ```

3. **Install development tools**:
   ```bash
   # For Electron builds
   npm install electron-builder --save-dev
   
   # For code signing (optional)
   npm install electron-builder-notarize --save-dev
   ```

## Configuration

### Distribution Configuration

The distribution system uses a YAML configuration file (`distribution.yml`) to control installer behavior:

```yaml
# DinoAir Distribution Configuration
metadata:
  name: DinoAir
  version: 1.0.0
  description: AI-powered image generation for everyone
  vendor: DinoAir Team
  website: https://dinoair.com

branding:
  appName: DinoAir
  displayName: DinoAir - AI Image Generation
  iconPath: ./assets/icon.png
  primaryColor: '#2563eb'
  theme: modern

installation:
  mode: guided  # guided, silent, custom
  defaultPaths:
    windows: '%ProgramFiles%\\DinoAir'
    macos: '/Applications/DinoAir'
    linux: '/opt/dinoair'
  
  options:
    createDesktopShortcut: true
    createStartMenuShortcut: true
    addToPath: true
    registerProtocol: true
    autoStart: false

features:
  telemetry:
    enabled: true
    endpoint: https://telemetry.dinoair.com/events
    optOut: true
    anonymizeData: true
  
  updates:
    enabled: true
    autoCheck: true
    backgroundDownload: false
    rollbackSupport: true
```

### Environment Variables for CI/CD

Configure these secrets in your GitHub repository:

```bash
# Code Signing
WINDOWS_CERTIFICATE_FILE=<base64-encoded-p12-certificate>
WINDOWS_CERTIFICATE_PASSWORD=<certificate-password>
APPLE_CERTIFICATE_P12=<base64-encoded-p12-certificate>
APPLE_CERTIFICATE_PASSWORD=<certificate-password>
APPLE_TEAM_ID=<apple-developer-team-id>
APPLE_IDENTITY=<apple-signing-identity>
APPLE_APP_SPECIFIC_PASSWORD=<app-specific-password>

# Distribution
GITHUB_TOKEN=<github-personal-access-token>
NPM_TOKEN=<npm-publish-token>
```

## Building Packages

### Local Development Builds

1. **Build for current platform**:
   ```bash
   cd installer
   npm run build
   ```

2. **Build for specific platforms**:
   ```bash
   # Windows
   npm run build:win
   
   # macOS  
   npm run build:mac
   
   # Linux
   npm run build:linux
   ```

3. **CLI package**:
   ```bash
   npm pack
   ```

### Automated CI/CD Builds

The GitHub Actions workflow automatically builds packages when:

- **Tags are pushed** (creates releases)
- **Pull requests** are opened (creates test builds)
- **Manual trigger** with version specification

#### Triggering a Release

1. **Create and push a tag**:
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

2. **Or use GitHub CLI**:
   ```bash
   gh release create v1.2.3 --title "DinoAir v1.2.3" --notes "Release notes here"
   ```

3. **Manual workflow dispatch**:
   - Go to GitHub Actions tab
   - Select "Build and Release DinoAir Installers"
   - Click "Run workflow"
   - Specify version (e.g., v1.2.3)

## Distribution Channels

### Release Channels

- **Stable**: Production releases, auto-update disabled by default
- **Beta**: Pre-release testing, faster update checks
- **Alpha**: Development builds, frequent updates

### Installation Methods

1. **GUI Installers** (Recommended for end users):
   ```bash
   # Download from GitHub Releases
   # Windows: DinoAir-Setup-v1.2.3.exe
   # macOS: DinoAir-v1.2.3.dmg
   # Linux: DinoAir-v1.2.3.AppImage, .deb, .rpm
   ```

2. **CLI Installation** (For developers/automation):
   ```bash
   # Install globally via npm
   npm install -g dinoair-installer-cli@latest
   dinoair-install
   
   # Or run directly without installation
   npx dinoair-installer-cli
   ```

3. **Package Managers**:
   ```bash
   # Linux (future)
   apt install dinoair         # Debian/Ubuntu
   yum install dinoair         # RHEL/CentOS
   pacman -S dinoair          # Arch Linux
   
   # macOS (future)
   brew install dinoair
   
   # Windows (future)
   winget install DinoAir.DinoAir
   choco install dinoair
   ```

## Update Management

### Automatic Updates

The update system checks for new versions and can automatically download and install updates:

```javascript
const UpdateManager = require('./lib/updateManager');

const updater = new UpdateManager({
  currentVersion: '1.0.0',
  updateChannel: 'stable', // stable, beta, alpha
  autoUpdate: false,
  telemetryEnabled: true
});

// Check for updates
const updateInfo = await updater.checkForUpdates();

if (updateInfo.hasUpdate) {
  console.log(`Update available: ${updateInfo.latest}`);
  
  // Download and install
  await updater.downloadAndInstall(updateInfo);
}
```

### Update Configuration

```yaml
distribution:
  channels:
    stable:
      updateUrl: https://api.github.com/repos/Dinopit/DinoAirPublic/releases
      autoUpdate: false
      checkInterval: 24h
    
    beta:
      updateUrl: https://api.github.com/repos/Dinopit/DinoAirPublic/releases
      autoUpdate: false  
      checkInterval: 12h
```

### Manual Update Commands

```bash
# Check for updates
dinoair-install --check-updates

# Update to latest version
dinoair-install --update

# Update to specific version
dinoair-install --update --version=1.2.3

# Switch update channel
dinoair-install --channel=beta
```

## Telemetry & Analytics

### Privacy-First Approach

The telemetry system is designed with privacy in mind:

- **User consent required** before any data collection
- **Anonymous data only** - no personal information
- **Opt-out anytime** via configuration
- **Transparent data collection** - users know what's collected

### Collected Data

- Installation success/failure rates
- Hardware compatibility information
- Error messages (sanitized)
- Performance metrics
- Update statistics

### Implementation

```javascript
const TelemetryManager = require('./lib/telemetryManager');

const telemetry = new TelemetryManager({
  enabled: true,
  userConsent: false, // Will prompt user
  installPath: '/path/to/installation'
});

await telemetry.initialize();

// Request user consent
const consent = await telemetry.requestUserConsent(promptFunction);

// Track events
await telemetry.trackInstallationStart({
  mode: 'guided',
  hardware: hardwareInfo
});

await telemetry.trackInstallationComplete({
  success: true,
  duration: 45000,
  modelsDownloaded: 3
});
```

### Telemetry Configuration

```yaml
features:
  telemetry:
    enabled: true
    endpoint: https://telemetry.dinoair.com/events
    optOut: true
    anonymizeData: true
    batchSize: 10
    flushInterval: 30000  # 30 seconds
```

## Enterprise Deployment

### Enterprise Configuration

Create enterprise-specific configurations:

```javascript
const DistributionManager = require('./lib/distributionManager');

const distManager = new DistributionManager();
await distManager.initialize();

// Create enterprise configuration
await distManager.createEnterpriseConfig({
  telemetry: false,           // Disable telemetry
  autoUpdate: true,           // Enable auto-updates
  createShortcuts: false,     // No desktop shortcuts
  deployment: {
    msi: {
      enabled: true,
      properties: {
        INSTALLDIR: 'C:\\Program Files\\DinoAir',
        ADDLOCAL: 'ALL'
      }
    }
  }
});
```

### Silent Installation

```bash
# Windows (MSI)
msiexec /i DinoAir-Enterprise-v1.2.3.msi /quiet INSTALLDIR="C:\DinoAir"

# Windows (NSIS)
DinoAir-Setup-v1.2.3.exe /S /D=C:\DinoAir

# macOS
sudo installer -pkg DinoAir-v1.2.3.pkg -target /

# Linux (CLI)
dinoair-install --silent --path=/opt/dinoair --no-shortcuts
```

### Group Policy Integration

For Windows enterprise environments:

1. Create ADMX templates for DinoAir settings
2. Deploy via Group Policy
3. Configure centralized update servers
4. Set installation policies

### SCCM Integration

```powershell
# SCCM Application Definition
$AppName = "DinoAir"
$Version = "1.2.3"
$InstallCommand = "msiexec /i DinoAir-v$Version.msi /quiet"
$UninstallCommand = "msiexec /x {PRODUCT-GUID} /quiet"

New-CMApplication -Name $AppName -Description "AI Image Generation Tool"
```

## Security & Code Signing

### Code Signing Setup

#### Windows Code Signing

1. **Obtain a code signing certificate** from a trusted CA
2. **Convert to PFX format** if needed
3. **Configure environment variables**:
   ```bash
   WINDOWS_CERTIFICATE_FILE=<base64-encoded-pfx>
   WINDOWS_CERTIFICATE_PASSWORD=<password>
   ```

#### macOS Code Signing and Notarization

1. **Join Apple Developer Program**
2. **Create signing certificates** in Xcode
3. **Export certificates** to P12 format
4. **Configure environment variables**:
   ```bash
   APPLE_CERTIFICATE_P12=<base64-encoded-p12>
   APPLE_CERTIFICATE_PASSWORD=<password>
   APPLE_TEAM_ID=<team-id>
   APPLE_IDENTITY=<signing-identity>
   APPLE_APP_SPECIFIC_PASSWORD=<app-password>
   ```

#### Linux Package Signing

```bash
# GPG key generation
gpg --full-generate-key

# Sign DEB packages
dpkg-sig --sign builder package.deb

# Sign RPM packages  
rpm --addsign package.rpm
```

### Verification

Users can verify package integrity:

```bash
# Windows (PowerShell)
Get-AuthenticodeSignature DinoAir-Setup.exe

# macOS
codesign -v DinoAir.app
spctl -a -v DinoAir.app

# Linux
gpg --verify package.deb.sig package.deb
```

## Troubleshooting

### Common Issues

#### Build Failures

**Issue**: Electron build fails with "Application entry file not found"
```bash
# Solution: Ensure main.js exists and package.json main field is correct
npm run build 2>&1 | grep -i error
```

**Issue**: Code signing fails
```bash
# Solution: Verify certificate configuration
echo $WINDOWS_CERTIFICATE_FILE | base64 -d > test.pfx
openssl pkcs12 -info -in test.pfx
```

#### Installation Issues

**Issue**: "Permission denied" during installation
```bash
# Solution: Run as administrator/sudo or choose user directory
dinoair-install --path=~/DinoAir
```

**Issue**: Node.js version incompatibility
```bash
# Solution: Update Node.js or use compatibility mode
nvm install 18
nvm use 18
```

#### Update Issues

**Issue**: Update check fails
```bash
# Solution: Check network connectivity and API rate limits
curl -I https://api.github.com/repos/Dinopit/DinoAirPublic/releases
```

**Issue**: Update installation fails
```bash
# Solution: Check permissions and disk space
df -h  # Check disk space
ls -la ~/.dinoair/  # Check permissions
```

### Debug Mode

Enable verbose logging:

```bash
# Environment variable
export DEBUG=dinoair:*

# Command line flag
dinoair-install --verbose

# Configuration file
echo "debug: true" >> ~/.dinoair/config.yml
```

### Log Files

Default log locations:

- **Windows**: `%APPDATA%\DinoAir\logs\installer.log`
- **macOS**: `~/Library/Logs/DinoAir/installer.log`
- **Linux**: `~/.local/share/DinoAir/logs/installer.log`

### Support Resources

- **GitHub Issues**: https://github.com/Dinopit/DinoAirPublic/issues
- **Documentation**: https://github.com/Dinopit/DinoAirPublic/wiki
- **Community Forum**: https://discord.gg/dinoair
- **Enterprise Support**: enterprise@dinoair.com

### Performance Optimization

#### Build Performance

```bash
# Use parallel builds
export ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true
npm run build -- --publish=never --parallel

# Cache dependencies
npm ci --cache ~/.npm-cache
```

#### Installation Performance

```bash
# Use local mirrors for model downloads
export DINOAIR_MODEL_MIRROR=https://local-mirror.company.com/models

# Parallel downloads
dinoair-install --parallel-downloads=4
```

### Monitoring and Metrics

#### CI/CD Monitoring

Monitor build success rates and performance:

```yaml
# GitHub Actions monitoring
on:
  workflow_run:
    workflows: ["Build and Release DinoAir Installers"]
    types: [completed]

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - name: Send metrics
        run: |
          curl -X POST https://metrics.company.com/ci-cd \
            -d "workflow=build-installer&status=${{ github.event.workflow_run.conclusion }}"
```

#### Installation Analytics

Track installation success rates:

```javascript
// In telemetryManager.js
await telemetry.trackEvent('installation_completed', {
  success: true,
  duration_ms: installationTime,
  platform: process.platform,
  version: packageVersion
});
```

This comprehensive documentation provides everything needed to understand, configure, build, and distribute DinoAir installers across all supported platforms.