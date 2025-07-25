# DinoAir Configuration Export/Import Documentation

This document describes the configuration export/import functionality for DinoAir, which allows users to backup, share, and restore their configuration settings.

## Overview

The configuration export/import system provides:

- **Export**: Save configurations to JSON or YAML files
- **Import**: Load configurations from files with validation
- **Backup/Restore**: Automatic backup and restore functionality
- **Templates**: Create reusable configuration templates
- **Selective Operations**: Export/import specific configuration sections
- **Validation**: Comprehensive validation with error reporting
- **Version Management**: Configuration versioning and migration support

## Quick Start

### Command Line Interface

DinoAir provides a CLI tool for configuration management:

```bash
# Export full configuration
python config_cli.py export config.yaml --output backup.yaml

# Import configuration
python config_cli.py import backup.yaml --target config.yaml

# Create backup
python config_cli.py backup config.yaml

# Validate configuration
python config_cli.py validate config.yaml
```

### Python API

```python
from lib.config import export_config, import_config, load_config

# Load and export configuration
config = load_config("config.yaml")
export_config(config, "backup.yaml")

# Import configuration
imported_config = import_config("backup.yaml")
```

## Export Functionality

### Basic Export

Export full configuration to YAML (default):

```bash
python config_cli.py export config.yaml --output exported_config.yaml
```

Export to JSON format:

```bash
python config_cli.py export config.yaml --output config.json --format json
```

### Selective Export

Export specific configuration sections:

```bash
# Export only server and security sections
python config_cli.py export config.yaml --output server_config.yaml --sections server security
```

Available sections:
- `server` - Server configuration (host, port, workers, etc.)
- `database` - Database connection settings
- `security` - Security settings (keys, authentication, etc.)
- `comfyui` - ComfyUI service configuration
- `ollama` - Ollama service configuration
- `resources` - Resource limits and quotas
- `logging` - Logging configuration
- `monitoring` - Monitoring and health check settings

### Template Export

Create configuration templates with sensitive data removed:

```bash
python config_cli.py export config.yaml --output template.yaml --template
```

Templates automatically replace sensitive fields with environment variable placeholders:
- `secret_key` → `${SECRET_KEY}`
- `password` → `${PASSWORD}`
- `api_key` → `${API_KEY}`
- etc.

### Export Options

- `--format json|yaml` - Output format (default: yaml)
- `--sections <list>` - Specific sections to export
- `--template` - Export as template (remove sensitive data)
- `--no-metadata` - Exclude version metadata from export

## Import Functionality

### Basic Import

Import configuration with automatic backup:

```bash
python config_cli.py import source_config.yaml --target config.yaml
```

### Import Options

- `--merge` - Merge with existing configuration instead of replacing
- `--sections <list>` - Import only specific sections
- `--no-backup` - Skip backup of existing configuration
- `--no-validate` - Skip validation of imported configuration

### Merge Import

Merge imported settings with existing configuration:

```bash
# Update only server settings, keep everything else
python config_cli.py import server_update.yaml --target config.yaml --merge --sections server
```

### Validation

All imports are validated by default. Invalid configurations will be rejected with detailed error messages:

```bash
python config_cli.py import invalid_config.yaml --target config.yaml
# ❌ Import failed: Configuration validation failed:
# server.port: Value 99999 is above maximum 65535
```

## Backup and Restore

### Create Backup

Create automatic backup with timestamp:

```bash
python config_cli.py backup config.yaml
# ✅ Configuration backed up successfully to: config/backups/config_backup_20250725_123000.yaml
```

Create backup with custom name:

```bash
python config_cli.py backup config.yaml --name my_custom_backup.yaml
```

### List Backups

View all available backups:

```bash
python config_cli.py list-backups
# 📦 Found 3 backup(s):
# 
# 📄 config_backup_20250725_123000.yaml
#    📁 Path: config/backups/config_backup_20250725_123000.yaml
#    📅 Created: 2025-07-25 12:30:00
#    📏 Size: 0.85 MB
```

### Restore from Backup

Restore configuration from backup:

```bash
python config_cli.py restore config/backups/config_backup_20250725_123000.yaml config.yaml
```

The current configuration is automatically backed up before restoration.

## Templates

### Create Template

Create reusable configuration template:

```bash
python config_cli.py template config.yaml --output my_template.yaml --name "Production Template" --description "Standard production configuration"
```

### Template Features

Templates include:
- Version metadata for tracking
- Sensitive data replaced with environment variable placeholders
- Descriptive information (name, description)
- Selective section inclusion

### Using Templates

Import templates like regular configurations:

```bash
# Set environment variables first
export SECRET_KEY="your-secret-key-32-chars-long"
export PASSWORD="your-database-password"

# Import template
python config_cli.py import my_template.yaml --target config.yaml
```

## Configuration Validation

### Validate Configuration

Check configuration file validity:

```bash
python config_cli.py validate config.yaml
# ✅ Configuration is valid: config.yaml
# 
# ⚠️  Warnings:
#    - logging.file_path: Directory ./logs does not exist
```

### Validation Features

- **Type Checking**: Ensures correct data types for all fields
- **Range Validation**: Checks numeric values are within valid ranges
- **Format Validation**: Validates URLs, email addresses, IP addresses
- **Required Fields**: Ensures all required configuration is present
- **Pattern Matching**: Validates strings against regex patterns

## Configuration Comparison

### Compare Configurations

Compare two configuration files:

```bash
python config_cli.py diff config1.yaml config2.yaml
# 🔍 Found 3 difference(s):
# 
# 🔄 Different value at: server.port
#    config1.yaml: 8000
#    config2.yaml: 8080
# 
# ➕ Missing in config1.yaml: security.rate_limit_requests
#    Value: 100
```

### Diff Output Types

- `different_value` - Same field with different values
- `missing_in_config1` - Field only exists in second configuration
- `missing_in_config2` - Field only exists in first configuration

## File Formats

### YAML Format (Recommended)

```yaml
_metadata:
  version: 1.0.0
  created_at: '2025-07-25T12:30:00+00:00'
  source: DinoAir
  description: DinoAir configuration export (full)
  schema_version: 1.0.0

config:
  app_name: DinoAir
  version: 1.0.0
  environment: production
  
  server:
    host: 0.0.0.0
    port: 8000
    workers: 4
    
  security:
    secret_key: your-secret-key-here
    jwt_algorithm: HS256
    
  # ... rest of configuration
```

### JSON Format

```json
{
  "_metadata": {
    "version": "1.0.0",
    "created_at": "2025-07-25T12:30:00+00:00",
    "source": "DinoAir",
    "description": "DinoAir configuration export (full)",
    "schema_version": "1.0.0"
  },
  "config": {
    "app_name": "DinoAir",
    "server": {
      "host": "0.0.0.0",
      "port": 8000
    }
  }
}
```

## Python API Reference

### ConfigExportImportManager

Main class for configuration management:

```python
from lib.config import ConfigExportImportManager, ExportFormat, ConfigSection

manager = ConfigExportImportManager(
    config_dir="./config",
    backup_dir="./config/backups"
)

# Export configuration
manager.export_config(
    config=my_config,
    output_path="export.yaml",
    format=ExportFormat.YAML,
    sections=[ConfigSection.SERVER, ConfigSection.SECURITY],
    as_template=True
)

# Import configuration
imported_config = manager.import_config(
    import_path="import.yaml",
    target_config_path="config.yaml",
    merge_mode=True,
    validate=True
)

# Backup and restore
backup_path = manager.backup_config("config.yaml")
manager.restore_config(backup_path, "config.yaml")
```

### Utility Functions

Quick access functions:

```python
from lib.config import export_config, import_config, backup_config, validate_config_file

# Quick export
export_config(config, "output.yaml", format=ExportFormat.JSON)

# Quick import
config = import_config("input.yaml", validate=True)

# Quick backup
backup_path = backup_config("config.yaml")

# Quick validation
result = validate_config_file("config.yaml")
print(f"Valid: {result['valid']}")
```

## Error Handling

### Common Errors

1. **ConfigExportError**: Export operation failed
2. **ConfigImportError**: Import operation failed
3. **ConfigBackupError**: Backup/restore operation failed
4. **ConfigError**: Configuration validation failed

### Error Examples

```python
try:
    config = import_config("invalid.yaml")
except ConfigImportError as e:
    print(f"Import failed: {e}")
    # Handle import error

try:
    export_config(config, "/readonly/path.yaml")
except ConfigExportError as e:
    print(f"Export failed: {e}")
    # Handle export error
```

## Best Practices

### 1. Regular Backups

Create regular backups before making configuration changes:

```bash
# Before editing configuration
python config_cli.py backup config.yaml

# Edit configuration
vim config.yaml

# Validate changes
python config_cli.py validate config.yaml
```

### 2. Environment-Specific Configurations

Use templates for different environments:

```bash
# Create base template
python config_cli.py template config.yaml --output base_template.yaml --name "Base Template"

# Create environment-specific configs from template
python config_cli.py import base_template.yaml --target production_config.yaml
python config_cli.py import base_template.yaml --target development_config.yaml
```

### 3. Selective Operations

Export/import only relevant sections to minimize changes:

```bash
# Update only server configuration
python config_cli.py export current_config.yaml --output server_update.yaml --sections server
# Edit server_update.yaml
python config_cli.py import server_update.yaml --target config.yaml --merge --sections server
```

### 4. Validation

Always validate configurations after import:

```bash
python config_cli.py import new_config.yaml --target config.yaml
python config_cli.py validate config.yaml
```

### 5. Version Control

Track configuration changes in version control:

```bash
# Add to .gitignore
echo "config/backups/" >> .gitignore
echo "*.secret.yaml" >> .gitignore

# Track template files
git add templates/
git commit -m "Add configuration templates"
```

## Integration Examples

### Docker Deployment

```dockerfile
# Copy configuration template
COPY config_template.yaml /app/config_template.yaml

# Import configuration with environment variables
RUN python config_cli.py import config_template.yaml --target config.yaml
```

### CI/CD Pipeline

```yaml
# GitHub Actions example
- name: Validate Configuration
  run: |
    python config_cli.py validate config.yaml
    
- name: Create Deployment Config
  run: |
    python config_cli.py import templates/production.yaml --target config.yaml
  env:
    SECRET_KEY: ${{ secrets.SECRET_KEY }}
    DATABASE_PASSWORD: ${{ secrets.DB_PASSWORD }}
```

### Configuration Management

```python
# Application startup
from lib.config import load_config, backup_config, validate_config_file

# Validate configuration on startup
result = validate_config_file("config.yaml")
if not result["valid"]:
    print("Invalid configuration:", result["errors"])
    exit(1)

# Create backup before loading
backup_config("config.yaml")

# Load configuration
config = load_config("config.yaml")
```

## Security Considerations

### 1. Sensitive Data

- Never commit configuration files with sensitive data to version control
- Use templates with environment variable placeholders for sharing
- Regularly rotate secrets and update configurations

### 2. File Permissions

```bash
# Secure configuration files
chmod 600 config.yaml
chmod 700 config/

# Secure backups
chmod 600 config/backups/*.yaml
```

### 3. Environment Variables

```bash
# Use secure environment variable management
export SECRET_KEY="$(openssl rand -base64 32)"
export DATABASE_PASSWORD="$(openssl rand -base64 24)"
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check file/directory permissions
2. **Validation Errors**: Review error messages and fix configuration
3. **Import Fails**: Ensure source file format is correct
4. **Missing Sections**: Verify section names match available options

### Debug Mode

Enable detailed error output:

```bash
# Set environment variable for debug mode
export DINOAIR_DEBUG=true

# Run commands with more verbose output
python config_cli.py validate config.yaml
```

### Log Files

Check application logs for detailed error information:

```bash
tail -f logs/dinoair.log
```

## Migration Guide

### From Previous Versions

When upgrading DinoAir versions, configuration migration may be needed:

1. **Backup Current Configuration**:
   ```bash
   python config_cli.py backup config.yaml --name "pre_upgrade_backup.yaml"
   ```

2. **Export Current Configuration**:
   ```bash
   python config_cli.py export config.yaml --output current_config.yaml
   ```

3. **Update DinoAir**

4. **Import and Validate**:
   ```bash
   python config_cli.py import current_config.yaml --target config.yaml
   python config_cli.py validate config.yaml
   ```

### Schema Changes

Configuration schema changes are handled automatically during import with appropriate warnings and migration steps.