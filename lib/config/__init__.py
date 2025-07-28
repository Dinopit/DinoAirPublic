"""
DinoAir Configuration Module
Provides configuration validation, type checking, safe defaults, and advanced features
"""

from .config_validator import (
    ConfigError,
    ConfigValueType,
    ConfigField,
    ConfigValidator,
    ConfigLoader,
    DinoAirConfig,
    ServerConfig,
    DatabaseConfig,
    SecurityConfig,
    ComfyUIConfig,
    OllamaConfig,
    ResourceLimitsConfig,
    LoggingConfig,
    MonitoringConfig,
    load_config,
    CONFIG_TEMPLATE
)

# Add SecretsError for test compatibility
class SecretsError(Exception):
    """Exception raised for secrets-related configuration errors."""
    pass

__all__ = [
    # Core config classes
    'ConfigError',
    'SecretsError',  # Add to exports
    'ConfigValueType',
    'ConfigField',
    'ConfigValidator',
    'ConfigLoader',
    'DinoAirConfig',
    'ServerConfig',
    'DatabaseConfig',
    'SecurityConfig',
    'ComfyUIConfig',
    'OllamaConfig',
    'ResourceLimitsConfig',
    'LoggingConfig',
    'MonitoringConfig',
    'load_config',
    'CONFIG_TEMPLATE',
    
    # Export/Import functionality
    'ConfigExportImportManager',
    'ExportFormat',
    'ConfigSection',
    'ConfigVersionInfo',
    'ConfigExportError',
    'ConfigImportError',
    'ConfigBackupError',
    'export_config',
    'import_config',
    'backup_config',
    'validate_config_file'
]

# Module version
__version__ = '1.1.0'

