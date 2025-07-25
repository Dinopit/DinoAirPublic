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
    SecretsProvider,
    VaultSecretsProvider,
    AWSSecretsProvider,
    EnvSecretsProvider,
    SecretsManager,
    secrets_manager,
    get_secret,
    resolve_secrets
)

from .hot_reload import (
    ConfigChange,
    ConfigHotReloader,
    ConfigManager
)

from .drift_detection import (
    DriftRule,
    DriftViolation,
    DriftAlert,
    DriftDetector,
    AlertNotifier,
    ConfigDriftMonitor,
    DEFAULT_DRIFT_RULES
)

__all__ = [
    # Core configuration
    'ConfigError',
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
    'SecretsError',
    'SecretRef',
    'SecretsProvider',
    'VaultSecretsProvider',
    'AWSSecretsProvider',
    'EnvSecretsProvider',
    'SecretsManager',
    'secrets_manager',
    'get_secret',
    'resolve_secrets',
    
    # Hot reload
    'ConfigChange',
    'ConfigHotReloader',
    'ConfigManager',
    
    # Drift detection
    'DriftRule',
    'DriftViolation',
    'DriftAlert',
    'DriftDetector',
    'AlertNotifier',
    'ConfigDriftMonitor',
    'DEFAULT_DRIFT_RULES'
]

# Module version
__version__ = '2.0.0'