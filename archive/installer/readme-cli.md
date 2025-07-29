# DinoAir CLI Installer

A Node.js-based command-line installer for the DinoAir Progressive Mode System, replacing the previous Electron-based GUI installer with a streamlined CLI experience.

## Overview

This CLI installer provides all the functionality of the original Electron installer but in a lightweight, terminal-based interface. It uses native Node.js modules and integrates seamlessly with the Python backend components.

## Documentation

* [**User Manual**](user-manual.md): Step-by-step installation guide for end users
* [**Video Tutorials**](video-tutorials.md): Comprehensive video tutorial series
* [**Technical Documentation**](readme-cli.md): This document - technical details and architecture

## Features

* **Interactive CLI Interface**: Uses inquirer for user-friendly prompts
* **Colored Output**: Chalk-powered colored logging and status messages
* **Progress Tracking**: Real-time progress bars and spinners
* **Hardware Detection**: Automatic system capability detection via Python scripts
* **Model Recommendations**: AI model selection based on hardware capabilities
* **Cross-Platform**: Works on Windows, macOS, and Linux
* **Python Integration**: Seamless integration with Python backend using child\_process
* **Modular Architecture**: Reusable modules for logging, file operations, and process management

## Installation

### Prerequisites

* Node.js 14.0.0 or higher
* Python 3.7+ (for hardware detection and backend integration)
* npm (comes with Node.js)

### Setup

1.  Navigate to the installer directory:

    ```bash
    cd DinoAirPublic/installer
    ```
2.  Install dependencies:

    ```bash
    npm install
    ```

## Usage

### Basic Installation

Run the installer with default settings:

```bash
node index.js
```

### Development Mode

Run with debug output:

```bash
node index.js --dev
```

### Command Line Options

* `--dev`: Enable development mode with debug logging
* `--debug`: Enable debug logging
* `--help`: Show help information (currently shows installer interface)

## Installation Process

The CLI installer follows these steps:

1. **Welcome & Consent**: User confirmation to proceed
2. **Hardware Detection**: Automatic system capability detection
3. **Installation Mode**: Choose between Easy (automatic) or Advanced (custom) mode
4. **Directory Selection**: Choose installation directory
5. **Model Recommendations**: AI model selection based on hardware
6. **Installation Summary**: Review settings before proceeding
7. **Installation Execution**:
   * Prerequisites check
   * Directory creation
   * Core file copying
   * Model downloading
   * Dependency installation
   * Configuration setup
   * Shortcut creation

## Architecture

### Core Modules

#### `index.js`

Main installer entry point containing the `DinoAirInstaller` class with:

* Installation workflow orchestration
* User interaction handling
* Progress tracking
* Error handling

#### `lib/logger.js`

Comprehensive logging module featuring:

* Multiple log levels (info, warn, error, success, debug)
* Colored output with timestamps
* Section headers and formatting utilities
* Silent and debug modes
* Child logger creation

#### `lib/fileUtils.js`

File system operations module providing:

* Directory creation and management
* File and directory copying
* File operations (read, write, append)
* Permission management
* Temporary file handling
* File searching and listing

#### `lib/spawnManager.js`

Process management module offering:

* Command execution with timeout support
* Python script execution
* Real-time output streaming
* Package installation (pip, npm)
* File downloading
* System information gathering

### Integration Points

#### Python Backend Integration

The CLI installer integrates with Python components through:

1. **Hardware Detection**: Calls `scripts/hardware_detector_wrapper.py`
2. **Dependency Installation**: Uses pip to install Python requirements
3. **Model Management**: Interfaces with Python model download scripts
4. **Configuration**: Creates JSON config files for Python backend

#### File Structure

```
installer/
├── index.js                 # Main CLI installer
├── package-cli.json         # CLI-specific dependencies
├── lib/                     # Reusable modules
│   ├── logger.js           # Logging functionality
│   ├── fileUtils.js        # File operations
│   └── spawnManager.js     # Process management
├── scripts/                # Python integration scripts
│   └── hardware_detector_wrapper.py
└── README-CLI.md           # This documentation
```

## Configuration

### Installation Modes

#### Easy Mode (Default)

* Automatic hardware detection
* Recommended model selection
* Default installation directory
* Minimal user interaction

#### Advanced Mode

* Custom model selection
* Custom installation directory
* Detailed configuration options
* Expert user control

### Hardware Detection

The installer automatically detects:

* GPU capabilities (NVIDIA, AMD, Intel)
* Available RAM
* CPU cores and architecture
* Operating system and platform

Based on detection results, it recommends appropriate AI models:

* **2GB+ RAM**: Qwen2-VL-2B (Fast, Good quality)
* **16GB+ RAM**: Qwen2-VL-7B (Medium, Better quality)
* **32GB+ RAM**: Qwen2-VL-72B (Slow, Best quality)

## Error Handling

The installer includes comprehensive error handling:

* **Prerequisites Check**: Validates Python installation and system requirements
* **Disk Space**: Verifies sufficient storage space
* **Network Issues**: Handles download failures with retries
* **Permission Errors**: Provides clear error messages and solutions
* **Process Failures**: Graceful handling of subprocess errors

## Development

### Adding New Features

1. **Installation Steps**: Add new steps to the `installationSteps` array in `index.js`
2. **Logging**: Use the logger module for consistent output formatting
3. **File Operations**: Leverage `fileUtils.js` for all file system operations
4. **Process Execution**: Use `spawnManager.js` for running external commands

### Testing

Test the installer in development mode:

```bash
node index.js --dev
```

This enables:

* Debug logging output
* Detailed error messages
* Process execution logging

### Module Usage Examples

#### Logger

```javascript
const Logger = require('./lib/logger');
const logger = new Logger({ debug: true });

logger.info('Installation starting...');
logger.success('Step completed successfully!');
logger.error('Something went wrong');
```

#### File Utils

```javascript
const FileUtils = require('./lib/fileUtils');
const fileUtils = new FileUtils({ logger });

await fileUtils.ensureDirectory('/path/to/dir');
await fileUtils.copyFile('source.txt', 'dest.txt');
```

#### Spawn Manager

```javascript
const SpawnManager = require('./lib/spawnManager');
const spawnManager = new SpawnManager({ logger });

const result = await spawnManager.runCommand('python', ['--version']);
await spawnManager.runPythonScript('script.py', ['arg1', 'arg2']);
```

## Migration from Electron

This CLI installer replaces the previous Electron-based installer with these improvements:

### Advantages

* **Smaller footprint**: No Electron runtime required
* **Faster startup**: Native Node.js execution
* **Better automation**: Scriptable CLI interface
* **Reduced complexity**: No GUI framework dependencies
* **Cross-platform consistency**: Same experience on all platforms

### Maintained Features

* Hardware detection and model recommendations
* Progress tracking and user feedback
* Python backend integration
* Configuration management
* Error handling and recovery

## Troubleshooting

### Common Issues

1. **"inquirer.prompt is not a function"**
   * Ensure inquirer version 8.x is installed
   * Run: `npm install inquirer@8.2.6`
2. **"Python is not installed or not in PATH"**
   * Install Python 3.7+ and ensure it's in PATH
   * On Windows, use `python`; on Unix systems, use `python3`
3. **Permission errors during installation**
   * Run installer with appropriate permissions
   * On Unix systems, may need `sudo` for system-wide installation
4. **Network timeouts during downloads**
   * Check internet connection
   * Installer will retry failed downloads automatically

### Debug Mode

Enable debug mode for detailed troubleshooting:

```bash
node index.js --debug
```

This provides:

* Detailed command execution logs
* File operation traces
* Network request information
* Error stack traces

## Contributing

When contributing to the CLI installer:

1. Follow the existing code style and patterns
2. Add appropriate error handling
3. Include debug logging for troubleshooting
4. Test on multiple platforms
5. Update documentation for new features

## License

This CLI installer is part of the DinoAir project and follows the same MIT license terms.
