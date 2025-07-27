# DinoAir CLI Installer - User Manual

## Quick Start Guide

### For First-Time Users

1. **Download DinoAir**
   ```bash
   git clone https://github.com/Dinopit/DinoAirPublic.git
   cd DinoAirPublic/installer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Installer**
   ```bash
   node index.js
   ```

### Installation Modes

#### Easy Mode (Recommended for Beginners)
- Automatic hardware detection
- Recommended AI model selection
- Default installation directory
- Minimal user interaction required

#### Advanced Mode (For Experienced Users)
- Custom AI model selection
- Custom installation directory
- Detailed configuration options
- Full control over installation process

### System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 14.0.0 or higher
- **Python**: Version 3.7 or higher
- **RAM**: Minimum 4GB (8GB+ recommended for better AI models)
- **Storage**: 10GB+ free space (varies by AI model selection)

### Hardware Recommendations

| RAM Available | Recommended Model | Performance | Quality |
|---------------|-------------------|-------------|---------|
| 2-8GB         | Qwen2-VL-2B      | Fast        | Good    |
| 8-16GB        | Qwen2-VL-7B      | Medium      | Better  |
| 16GB+         | Qwen2-VL-72B     | Slow        | Best    |

### Common Installation Scenarios

#### Scenario 1: Home User Setup
- Choose Easy Mode
- Accept default installation directory
- Select recommended AI model based on your RAM
- Allow automatic dependency installation

#### Scenario 2: Developer Setup
- Choose Advanced Mode
- Select custom installation directory (e.g., `/opt/dinoair`)
- Choose specific AI model for your use case
- Review all configuration options before proceeding

#### Scenario 3: Server/Headless Installation
- Use command line flags for automation
- Pre-configure installation directory
- Ensure Python and Node.js are in PATH
- Consider using smaller AI models for server environments

### Step-by-Step Installation Process

#### Phase 1: Welcome and Consent
1. The installer will display a welcome message
2. Review the installation overview
3. Confirm you want to proceed with installation

#### Phase 2: Hardware Detection
1. The installer automatically detects your system capabilities
2. Review detected hardware specifications
3. Note recommended AI models for your system

#### Phase 3: Installation Mode Selection
1. Choose between Easy Mode or Advanced Mode
2. Easy Mode: Proceed with recommended settings
3. Advanced Mode: Customize installation options

#### Phase 4: Directory Selection
1. Easy Mode: Uses default directory (`~/DinoAir`)
2. Advanced Mode: Choose custom installation directory
3. Ensure sufficient disk space is available

#### Phase 5: Model Selection
1. Easy Mode: Automatically selects recommended model
2. Advanced Mode: Choose from available AI models
3. Consider your hardware capabilities and use case

#### Phase 6: Installation Summary
1. Review all selected options
2. Confirm installation directory and model choice
3. Proceed with installation or go back to modify settings

#### Phase 7: Installation Execution
1. **Prerequisites Check**: Validates system requirements
2. **Directory Creation**: Creates installation directories
3. **Core File Copying**: Copies DinoAir application files
4. **Model Downloading**: Downloads selected AI models
5. **Dependency Installation**: Installs Python and Node.js dependencies
6. **Configuration Setup**: Creates configuration files
7. **Shortcut Creation**: Creates desktop/menu shortcuts

### Post-Installation

#### First Launch
1. Navigate to your installation directory
2. Run the DinoAir application
3. Complete initial setup wizard
4. Test basic functionality

#### Verification Steps
1. Check that all services start correctly
2. Verify AI model is loaded properly
3. Test image generation functionality
4. Confirm web interface is accessible

### Troubleshooting Common Issues

#### Installation Fails with Permission Errors
**Problem**: Installer cannot write to selected directory
**Solution**: 
- Run installer with administrator/sudo privileges
- Choose a directory where you have write permissions
- On Windows: Right-click Command Prompt → "Run as administrator"
- On macOS/Linux: Use `sudo node index.js`

#### "Python is not installed or not in PATH"
**Problem**: Python not found during installation
**Solution**:
- Install Python 3.7+ from python.org
- Ensure Python is added to system PATH
- On Windows: Check "Add Python to PATH" during installation
- Verify with: `python --version` or `python3 --version`

#### "Node.js version too old"
**Problem**: Installed Node.js version is below 14.0.0
**Solution**:
- Update Node.js from nodejs.org
- Use Node Version Manager (nvm) for multiple versions
- Verify with: `node --version`

#### Network Timeouts During Model Download
**Problem**: AI model download fails or times out
**Solution**:
- Check internet connection stability
- Try installation during off-peak hours
- Use smaller AI model if bandwidth is limited
- Installer will automatically retry failed downloads

#### Insufficient Disk Space
**Problem**: Not enough space for installation
**Solution**:
- Free up disk space (minimum 10GB recommended)
- Choose smaller AI model
- Select different installation directory with more space
- Clean temporary files and downloads

#### Installation Hangs or Freezes
**Problem**: Installer stops responding
**Solution**:
- Wait for current operation to complete (downloads can take time)
- Check system resources (CPU, memory usage)
- Restart installer if completely frozen
- Use debug mode: `node index.js --debug`

### Advanced Configuration

#### Environment Variables
Set these before running the installer for custom behavior:

```bash
# Custom Python executable
export PYTHON_PATH="/usr/bin/python3.9"

# Custom installation directory
export DINOAIR_INSTALL_DIR="/opt/dinoair"

# Skip hardware detection
export SKIP_HARDWARE_DETECTION=true

# Use specific AI model
export FORCE_MODEL="Qwen2-VL-2B"
```

#### Command Line Options
```bash
# Development mode with debug output
node index.js --dev

# Debug mode only
node index.js --debug

# Show help information
node index.js --help
```

#### Configuration Files
After installation, you can modify these files:

- `config/settings.json`: Main application settings
- `config/models.json`: AI model configuration
- `config/hardware.json`: Hardware detection overrides

### Getting Help

#### Documentation Resources
- **Technical Documentation**: `README-CLI.md`
- **Video Tutorials**: `VIDEO-TUTORIALS.md`
- **GitHub Issues**: Report bugs and request features

#### Community Support
- GitHub Discussions for questions and tips
- Discord community for real-time help
- Stack Overflow with `dinoair` tag

#### Professional Support
- Enterprise support available for commercial users
- Custom installation services for large deployments
- Training and consultation services

### Frequently Asked Questions

#### Q: Can I install multiple AI models?
A: Yes, you can run the installer multiple times to add additional models, or manually download models after installation.

#### Q: How do I update DinoAir?
A: Download the latest version and run the installer again. It will detect existing installation and offer to update.

#### Q: Can I move the installation to a different directory?
A: It's recommended to reinstall rather than move files. The installer creates system-specific configurations.

#### Q: What happens if installation is interrupted?
A: The installer can resume from where it left off. Run it again and it will detect partial installation.

#### Q: How do I uninstall DinoAir?
A: Delete the installation directory and remove any created shortcuts. A dedicated uninstaller is planned for future versions.

#### Q: Can I run DinoAir on a server without a GUI?
A: Yes, DinoAir supports headless operation. Use the web interface to access functionality remotely.

### Performance Optimization

#### For Better Performance
- Use SSD storage for installation directory
- Ensure adequate RAM for selected AI model
- Close unnecessary applications during use
- Consider GPU acceleration if available

#### For Lower Resource Usage
- Choose smaller AI models (Qwen2-VL-2B)
- Limit concurrent operations
- Use headless mode on servers
- Adjust quality settings in configuration

### Security Considerations

#### Network Security
- DinoAir runs locally by default
- Web interface accessible only from localhost
- No data sent to external servers without consent

#### File Permissions
- Installation directory should have appropriate permissions
- Avoid running as root/administrator unless necessary
- Regular security updates recommended

### Backup and Recovery

#### What to Backup
- Configuration files in `config/` directory
- Generated images and projects
- Custom AI models (if added)
- User preferences and settings

#### Recovery Process
- Reinstall DinoAir using the same version
- Restore configuration files
- Verify all models are properly loaded
- Test functionality before resuming work

This user manual provides comprehensive guidance for installing and using the DinoAir CLI Installer. For technical details and development information, refer to the technical documentation in `README-CLI.md`.
