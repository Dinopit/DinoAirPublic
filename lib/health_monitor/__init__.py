"""
DinoAir Health Monitoring Module
Provides health checking and automatic service restart capabilities
"""

from .health_monitor import (
    HealthMonitor,
    ServiceStatus,
    CheckType,
    HealthCheckConfig,
    HealthCheckResult,
    ServiceHealth,
    get_dinoair_health_checks
)

__all__ = [
    'HealthMonitor',
    'ServiceStatus',
    'CheckType',
    'HealthCheckConfig', 
    'HealthCheckResult',
    'ServiceHealth',
    'get_dinoair_health_checks'
]

# Module version
__version__ = '1.0.0'