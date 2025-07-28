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

from .secrets_manager import (
    SecretsError,
    SecretRef,
    SecretsManager,
    EnvSecretsProvider
)

from .hot_reload import (
    ConfigHotReloader,
    ConfigManager
)

from .drift_detection import (
    DriftRule,
    DriftDetector,
    ConfigDriftMonitor,
    DEFAULT_DRIFT_RULES
)

from .config_export_import import (
    ConfigExportImportManager,
    ExportFormat,
    ConfigSection,
    ConfigVersionInfo,
    ConfigExportError,
    ConfigImportError,
    ConfigBackupError,
    export_config,
    import_config,
    backup_config,
    validate_config_file
)

__all__ = [
    # Core config classes
    'ConfigError',
    'SecretsError',
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
    
    # Secrets management
    'SecretRef',
    'SecretsManager',
    'EnvSecretsProvider',
    
    # Hot reload and config management
    'ConfigHotReloader',
    'ConfigManager',
    
    # Drift detection
    'DriftRule',
    'DriftDetector',
    'ConfigDriftMonitor',
    'DEFAULT_DRIFT_RULES',
    
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

