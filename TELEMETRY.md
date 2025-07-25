# DinoAir CLI Installer Telemetry System

This document describes the telemetry and error reporting system integrated into the DinoAir CLI installer.

## Overview

The DinoAir CLI installer now includes comprehensive telemetry and error reporting capabilities to improve user experience and enable proactive issue resolution. The system is designed with privacy-first principles and includes robust user consent mechanisms.

## Features

### ✅ Installation Telemetry
- Success/failure rate tracking
- Step-by-step installation progress monitoring
- Performance metrics (installation duration, system resources)
- Component-specific success rates (ComfyUI, models, Web GUI, etc.)

### ✅ Error Reporting
- Automatic error detection and categorization
- Stack traces with anonymized file paths
- System context collection (OS, Python version, hardware)
- Crash reporting with diagnostic information

### ✅ Privacy Controls
- **User Consent Required**: Telemetry is disabled by default
- **Comprehensive Opt-out**: Multiple ways to disable telemetry
- **Data Anonymization**: All personally identifiable information is removed
- **Transparent Data Collection**: Clear explanation of what data is collected

### ✅ Usage Analytics
- Installation patterns and preferences
- Error frequency and types
- System compatibility insights
- Anonymized hardware and software configurations

## Privacy and Security

### Data Anonymization
All collected data is automatically sanitized to remove:
- File paths (replaced with `<PATH>`)
- Usernames (replaced with `<USER>`)
- URLs (replaced with `<URL>`)
- Personal system information

### What Data is Collected
- **System Information**: OS type/version, Python version, hardware specs (anonymized)
- **Installation Events**: Success/failure status, duration, selected options
- **Error Information**: Error types, messages (sanitized), stack traces (anonymized)
- **Performance Metrics**: Installation timing, resource usage

### What Data is NOT Collected
- Personal files or file contents
- Network information or IP addresses
- User credentials or sensitive environment variables
- Personal identification information
- Specific file paths or usernames

## User Consent Process

### First-time Installation
When running the installer for the first time, users are presented with:

1. **Clear explanation** of what data is collected
2. **Privacy information** about data handling
3. **Options to learn more** with detailed information
4. **Simple opt-in/opt-out choice**

### Consent Options
- **Yes**: Enable all telemetry features
- **No**: Disable all data collection
- **More Info**: View detailed privacy information

## Usage

### Running the Installer
```bash
# Normal installation (will prompt for telemetry consent)
python install.py

# Disable telemetry for this installation
python install.py --disable-telemetry

# Skip model downloads
python install.py --no-models
```

### Managing Telemetry Settings

Use the telemetry CLI tool to manage settings:

```bash
# Check current telemetry status
python telemetry_cli.py status

# Enable telemetry
python telemetry_cli.py enable

# Disable telemetry  
python telemetry_cli.py disable

# View collected data
python telemetry_cli.py show-data

# Clear all collected data
python telemetry_cli.py clear-data

# Export data to file
python telemetry_cli.py export my_data.json
```

## Configuration

### Config File Location
Telemetry settings are stored in:
- **Linux/macOS**: `~/.dinoair/telemetry_config.json`
- **Windows**: `%USERPROFILE%\.dinoair\telemetry_config.json`

### Config File Structure
```json
{
  "telemetry_enabled": true,
  "error_reporting_enabled": true,
  "usage_analytics_enabled": true,
  "user_id": "anonymous_hash",
  "install_id": "unique_install_id",
  "consent_timestamp": "2024-01-01T12:00:00Z",
  "opt_out_timestamp": null
}
```

### Manual Configuration
You can manually edit the config file to change settings:
- Set `telemetry_enabled: false` to disable all telemetry
- Set `error_reporting_enabled: false` to disable only error reporting
- Set `usage_analytics_enabled: false` to disable only usage analytics

## Data Storage

### Local Storage
Collected telemetry data is stored locally in:
- **Telemetry Events**: `~/.dinoair/telemetry/*.json`
- **Crash Reports**: `~/.dinoair/crashes/*.json`

### Data Format
Each telemetry file contains:
```json
{
  "session_id": "unique_session_id",
  "events": [
    {
      "event_type": "installation_start",
      "timestamp": "2024-01-01T12:00:00Z",
      "system_info": { "platform": "Linux", "python_version": "3.11.0" },
      "installation_args": { "no_models": false }
    }
  ],
  "metadata": {
    "created_at": "2024-01-01T12:00:00Z",
    "version": "1.0.0"
  }
}
```

## Error Categorization

The system automatically categorizes errors into types:
- **Installation Errors**: ComfyUI clone failures, dependency issues
- **Network Errors**: Model download failures, connectivity issues
- **System Errors**: Permission issues, disk space problems
- **Configuration Errors**: Invalid settings, missing dependencies
- **Unexpected Errors**: Unhandled exceptions and crashes

## Implementation Details

### Code Architecture
- **`lib/telemetry.py`**: Core telemetry system
  - `TelemetryConfig`: Configuration management
  - `TelemetryCollector`: Event collection and data sanitization
  - `CrashReporter`: Crash detection and diagnostic collection
- **`telemetry_cli.py`**: Command-line management tool
- **`install.py`**: Integration with main installer

### Integration Points
The installer integrates telemetry at key points:
1. **Installation Start**: System info and configuration
2. **Each Step**: Progress tracking and error detection
3. **Installation Complete**: Final status and summary
4. **Error Handling**: Automatic error reporting and crash detection

### Testing
Comprehensive test suite in `tests/test_telemetry.py` covers:
- Configuration management
- Data collection and sanitization
- Error reporting
- Privacy controls
- Integration scenarios

## Opt-out Methods

Users can disable telemetry in multiple ways:

### 1. During Installation
```bash
python install.py --disable-telemetry
```

### 2. Using CLI Tool
```bash
python telemetry_cli.py disable
```

### 3. Manual Configuration
Edit `~/.dinoair/telemetry_config.json` and set:
```json
{
  "telemetry_enabled": false,
  "error_reporting_enabled": false,
  "usage_analytics_enabled": false
}
```

### 4. Environment Variable
```bash
export DINOAIR_DISABLE_TELEMETRY=1
python install.py
```

## Future Enhancements

Potential future improvements include:
- **Automatic Issue Creation**: Integration with GitHub Issues API
- **Performance Benchmarking**: Hardware-specific performance metrics
- **Update Notifications**: Notify users of fixes for their specific issues
- **Community Analytics**: Aggregated (anonymous) community insights

## Support

For questions about telemetry:
1. Review this documentation
2. Check `python telemetry_cli.py status` for current settings
3. Use `python telemetry_cli.py --help` for CLI options
4. Report issues via the main DinoAir support channels

---

The telemetry system is designed to be completely optional and transparent, helping improve DinoAir while respecting user privacy.