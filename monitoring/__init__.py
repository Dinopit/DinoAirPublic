"""
DinoAir Monitoring Module
Provides resource usage monitoring and alerting capabilities
"""

from .resource_monitor import (
    ResourceMonitor,
    MonitoringConfig,
    ResourceThreshold,
    ResourceMetric,
    Alert,
    ResourceType,
    AlertLevel,
    AlertChannel,
    create_resource_monitor,
    get_system_status
)

__all__ = [
    'ResourceMonitor',
    'MonitoringConfig',
    'ResourceThreshold',
    'ResourceMetric',
    'Alert',
    'ResourceType',
    'AlertLevel',
    'AlertChannel',
    'create_resource_monitor',
    'get_system_status'
]

# Module version
__version__ = '1.0.0'