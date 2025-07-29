# DinoAir CLI Installer User Manual

## Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Installation Methods](#installation-methods)
4. [Basic Usage](#basic-usage)
5. [Advanced Features](#advanced-features)
6. [Configuration](#configuration)
7. [Troubleshooting](#troubleshooting)
8. [Plugin System](#plugin-system)
9. [Scheduling and Automation](#scheduling-and-automation)
10. [Backup and Restore](#backup-and-restore)
11. [Localization](#localization)
12. [FAQ](#faq)

## Overview

The DinoAir CLI Installer is a powerful, feature-rich installation tool that provides:

- **Safe Installation**: Comprehensive prerequisite checking and automatic rollback
- **Multi-language Support**: Available in English, Spanish, French, German, and more
- **Plugin System**: Extensible architecture for custom installation steps
- **Automated Updates**: Scheduled maintenance and update capabilities
- **Backup & Restore**: Complete system state management
- **Telemetry & Analytics**: Usage insights and error reporting

## System Requirements

### Minimum Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **Python**: Version 3.8 or higher
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 10GB free disk space
- **Network**: Internet connection for downloads

### Recommended Requirements

- **Memory**: 16GB RAM for optimal performance
- **Storage**: 50GB free disk space for models and artifacts
- **CPU**: Multi-core processor (4+ cores recommended)

## Installation Methods

### Method 1: Standard Installation

```bash
# Download and run the installer
python install.py
```

### Method 2: Safe Installation (Recommended)

```bash
# Use the enhanced safe installer
python install_safe.py
```

### Method 3: Custom Installation

```bash
# Install with specific options
python install_safe.py --skip-models --custom-config config.yaml
```

## Basic Usage

### Quick Start

1. **Download DinoAir**:
   ```bash
   git clone https://github.com/your-org/dinoair.git
   cd dinoair
   ```

2. **Run the installer**:
   ```bash
   python install_safe.py
   ```

3. **Follow the prompts**:
   - The installer will check system prerequisites
   - Confirm installation when prompted
   - Wait for completion

4. **Start DinoAir**:
   ```bash
   python start.py
   ```

### Command Line Options

```bash
python install_safe.py [OPTIONS]

Options:
  --skip-models          Skip downloading AI models
  --skip-web-gui         Skip web GUI installation
  --config FILE          Use custom configuration file
  --language LANG        Set installation language (en, es, fr, de)
  --plugin-dir DIR       Custom plugin directory
  --backup-before        Create backup before installation
  --schedule-updates     Enable automatic updates
  --verbose              Enable verbose logging
  --help                 Show help message
```

## Advanced Features

### Prerequisite Checking

The installer automatically checks:

- Python version compatibility
- Node.js and npm availability
- System resources (disk space, memory)
- Network connectivity
- Required dependencies

### Automatic Rollback

If installation fails:

1. **Automatic Detection**: The installer detects failures
2. **State Restoration**: Rolls back to previous state
3. **Cleanup**: Removes partial installations
4. **Error Reporting**: Provides detailed error information

### Progress Tracking

Monitor installation progress:

- **Real-time Updates**: Live progress indicators
- **Step-by-step Status**: Detailed installation steps
- **Time Estimates**: Estimated completion times
- **Error Handling**: Clear error messages and solutions

## Configuration

### Configuration File

Create a `config.yaml` file for custom settings:

```yaml
# DinoAir Installation Configuration

# General Settings
installation:
  skip_models: false
  skip_web_gui: false
  create_backup: true
  
# Language Settings
localization:
  language: "en"  # en, es, fr, de, zh, ja, ko
  
# Plugin Settings
plugins:
  enabled: true
  directory: "./plugins"
  auto_load: true
  
# Scheduling Settings
scheduler:
  enabled: true
  update_check: "daily_at_02:00"
  full_update: "weekly_sunday_at_03:00"
  cleanup: "monthly_first_sunday_at_04:00"
  
# Telemetry Settings
telemetry:
  enabled: true
  analytics: true
  error_reporting: true
  
# Custom Models
custom_models:
  - name: "custom-llama"
    url: "https://example.com/model.bin"
    type: "ollama"
  - name: "custom-sd"
    url: "https://example.com/sd-model.safetensors"
    type: "comfyui"
```

### Environment Variables

Set environment variables for configuration:

```bash
# Language setting
export DINOAIR_LANGUAGE=es

# Plugin directory
export DINOAIR_PLUGIN_DIR=/path/to/plugins

# Skip components
export DINOAIR_SKIP_MODELS=true
export DINOAIR_SKIP_WEB_GUI=false

# Telemetry settings
export DINOAIR_TELEMETRY_ENABLED=true
```

## Troubleshooting

### Common Issues

#### 1. Python Version Error

**Problem**: "Python version 3.8+ required"

**Solution**:
```bash
# Check Python version
python --version

# Install Python 3.8+ from python.org
# Or use package manager:
# Ubuntu/Debian: sudo apt install python3.8
# macOS: brew install python@3.8
# Windows: Download from python.org
```

#### 2. Node.js Not Found

**Problem**: "Node.js not found"

**Solution**:
```bash
# Install Node.js
# Ubuntu/Debian: sudo apt install nodejs npm
# macOS: brew install node
# Windows: Download from nodejs.org

# Verify installation
node --version
npm --version
```

#### 3. Insufficient Disk Space

**Problem**: "Insufficient disk space"

**Solution**:
- Free up at least 10GB of disk space
- Use `--skip-models` to reduce space requirements
- Choose a different installation directory

#### 4. Network Connection Issues

**Problem**: Download failures or timeouts

**Solution**:
```bash
# Test network connectivity
ping google.com

# Use proxy if needed
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080

# Retry installation
python install_safe.py --verbose
```

#### 5. Permission Errors

**Problem**: "Permission denied" errors

**Solution**:
```bash
# Linux/macOS: Use sudo if needed
sudo python install_safe.py

# Windows: Run as Administrator
# Right-click Command Prompt -> "Run as administrator"

# Or change permissions
chmod +x install_safe.py
```

### Log Files

Check log files for detailed error information:

- **Installation Log**: `dinoair_install_log.txt`
- **Scheduler Log**: `~/.dinoair/scheduler.log`
- **Telemetry Log**: `~/.dinoair/telemetry.log`

### Getting Help

1. **Check Documentation**: Review this manual and FAQ
2. **Search Issues**: Check GitHub issues for similar problems
3. **Enable Verbose Mode**: Run with `--verbose` for detailed logs
4. **Report Bugs**: Create a GitHub issue with logs and system info

## Plugin System

### Overview

The plugin system allows extending the installer with custom functionality.

### Creating a Plugin

1. **Generate Template**:
   ```python
   from cli_plugin_system import get_plugin_manager
   
   manager = get_plugin_manager()
   manager.create_plugin_template("MyCustomPlugin")
   ```

2. **Edit Plugin**:
   ```python
   # plugins/mycustom_plugin.py
   from cli_plugin_system import BasePlugin, InstallationContext, PluginResult, PluginStatus
   
   class MyCustomPlugin(BasePlugin):
       def __init__(self):
           super().__init__()
           self.name = "MyCustomPlugin"
           self.description = "Custom installation step"
           self.priority = 100
           
       def can_run(self, context):
           return True  # Add your conditions
           
       def execute(self, context):
           # Your custom logic here
           return PluginResult(
               status=PluginStatus.SUCCESS,
               message="Custom step completed"
           )
   ```

### Built-in Plugins

- **SystemValidationPlugin**: Validates system requirements
- **CustomModelDownloadPlugin**: Downloads custom AI models

### Plugin Configuration

Configure plugins in `config.yaml`:

```yaml
plugins:
  enabled: true
  directory: "./plugins"
  auto_load: true
  custom_plugins:
    - name: "MyCustomPlugin"
      enabled: true
      config:
        setting1: "value1"
        setting2: "value2"
```

## Scheduling and Automation

### Overview

The scheduler enables automated maintenance tasks:

- **Update Checks**: Daily checks for new versions
- **Full Updates**: Weekly complete updates
- **Cleanup**: Monthly cleanup of temporary files
- **Backups**: Regular system backups

### Configuration

Configure scheduling in `config.yaml`:

```yaml
scheduler:
  enabled: true
  tasks:
    update_check:
      schedule: "daily_at_02:00"
      enabled: true
    full_update:
      schedule: "weekly_sunday_at_03:00"
      enabled: true
    cleanup:
      schedule: "monthly_first_sunday_at_04:00"
      enabled: true
    backup:
      schedule: "weekly_saturday_at_01:00"
      enabled: true
```

### Manual Scheduling

```bash
# Install system scheduler
python -m cli_scheduler --install

# Check task status
python -m cli_scheduler --status

# Run scheduler daemon
python -m cli_scheduler --daemon
```

### Custom Schedules

Add custom scheduled tasks:

```python
from cli_scheduler import get_scheduler, ScheduleType

scheduler = get_scheduler()
scheduler.add_task(
    task_id="custom_task",
    name="Custom Maintenance",
    task_type=ScheduleType.CLEANUP,
    schedule_expression="every_6_hours",
    command="python",
    args=["custom_maintenance.py"]
)
```

## Backup and Restore

### Automatic Backups

The installer can create backups before installation:

```bash
# Create backup before installation
python install_safe.py --backup-before
```

### Manual Backup

```python
from install_safe import SafeInstaller

installer = SafeInstaller({})
installer.create_backup("manual_backup_2024")
```

### Restore from Backup

```python
# Restore from backup
installer.restore_from_backup("manual_backup_2024")
```

### Backup Contents

Backups include:

- **Configuration Files**: All DinoAir configuration
- **Custom Models**: User-downloaded models
- **User Data**: Artifacts and user-generated content
- **Plugin Data**: Custom plugin configurations
- **System State**: Installation metadata

## Localization

### Supported Languages

- **English** (en) - Default
- **Spanish** (es) - Español
- **French** (fr) - Français
- **German** (de) - Deutsch
- **Chinese** (zh) - 中文
- **Japanese** (ja) - 日本語
- **Korean** (ko) - 한국어

### Setting Language

#### Command Line

```bash
python install_safe.py --language es
```

#### Environment Variable

```bash
export DINOAIR_LANGUAGE=fr
python install_safe.py
```

#### Configuration File

```yaml
localization:
  language: "de"
```

### Adding Custom Translations

1. **Create Translation File**:
   ```json
   // locales/custom.json
   {
     "welcome": "Custom welcome message",
     "installation_complete": "Custom completion message"
   }
   ```

2. **Use Custom Locale**:
   ```python
   from cli_localization import get_localization_manager
   
   manager = get_localization_manager()
   manager.create_locale_file("custom", translations)
   manager.set_locale("custom")
   ```

## FAQ

### General Questions

**Q: How long does installation take?**
A: Typically 15-30 minutes, depending on your internet connection and whether you download models.

**Q: Can I install without internet?**
A: Basic installation is possible offline, but model downloads require internet connectivity.

**Q: Is it safe to interrupt the installation?**
A: The safe installer includes rollback capabilities, but it's best to let it complete.

### Technical Questions

**Q: Can I install multiple versions?**
A: Yes, install in different directories or use virtual environments.

**Q: How do I update DinoAir?**
A: Use the scheduler for automatic updates or run the installer again manually.

**Q: Can I customize the installation?**
A: Yes, use configuration files, command-line options, and plugins for customization.

### Troubleshooting Questions

**Q: Installation failed, what now?**
A: Check the log files, ensure system requirements are met, and try the safe installer.

**Q: How do I report bugs?**
A: Create a GitHub issue with system information, logs, and steps to reproduce.

**Q: Can I get help with custom plugins?**
A: Yes, check the plugin documentation and community forums for assistance.

### Performance Questions

**Q: Why is installation slow?**
A: Large model downloads can be slow. Use `--skip-models` for faster installation.

**Q: How much disk space is needed?**
A: Minimum 10GB, but 50GB recommended for full installation with models.

**Q: Can I install on low-end hardware?**
A: Yes, but performance may be limited. Consider using `--skip-models` option.

## Support and Resources

### Documentation

- **Main Documentation**: [docs/](../docs/)
- **API Documentation**: Available at `/api-docs` when running
- **Health Check API**: [docs/HEALTH_CHECK_API.md](../docs/HEALTH_CHECK_API.md)

### Community

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Community support and questions
- **Wiki**: Community-maintained documentation

### Professional Support

For enterprise support and custom development:

- **Email**: support@dinoair.com
- **Website**: https://dinoair.com/support
- **Documentation**: https://docs.dinoair.com

---

*This manual is automatically updated with each release. For the latest version, visit the [GitHub repository](https://github.com/your-org/dinoair).*