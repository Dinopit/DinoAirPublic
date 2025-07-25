"""
DinoAir Configuration Module
Provides configuration validation, type checking, and safe defaults
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

__all__ = [
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
    'CONFIG_TEMPLATE'
]

# Module version
__version__ = '1.0.0'