"""
DinoAir Error Handler Module
Provides error boundaries and recovery mechanisms
"""

from .error_boundary import (
    ErrorBoundary,
    GlobalErrorHandler,
    ErrorSeverity,
    RecoveryStrategy,
    ErrorContext,
    RecoveryConfig,
    get_dinoair_boundaries
)

__all__ = [
    'ErrorBoundary',
    'GlobalErrorHandler',
    'ErrorSeverity',
    'RecoveryStrategy',
    'ErrorContext',
    'RecoveryConfig',
    'get_dinoair_boundaries'
]

# Module version
__version__ = '1.0.0'