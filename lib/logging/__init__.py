"""
DinoAir Logging Module
Provides comprehensive logging with rotation, size limits, and safety features
"""

from .safe_logger import (
    LogLevel,
    LogConfig,
    LogManager,
    DinoAirLogger,
    LogTimer,
    get_logger,
    configure_logging,
    log_function
)

__all__ = [
    'LogLevel',
    'LogConfig',
    'LogManager',
    'DinoAirLogger',
    'LogTimer',
    'get_logger',
    'configure_logging',
    'log_function'
]

# Module version
__version__ = '1.0.0'