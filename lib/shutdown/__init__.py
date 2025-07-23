"""
DinoAir Shutdown Module
Provides graceful shutdown handlers and cleanup procedures
"""

from .graceful_shutdown import (
    GracefulShutdown,
    ShutdownPriority,
    ShutdownState,
    ShutdownTask,
    ShutdownStats,
    DinoAirShutdownTasks,
    create_shutdown_handler,
    get_shutdown_handler,
    shutdown,
    register_shutdown_task
)

__all__ = [
    'GracefulShutdown',
    'ShutdownPriority',
    'ShutdownState',
    'ShutdownTask',
    'ShutdownStats',
    'DinoAirShutdownTasks',
    'create_shutdown_handler',
    'get_shutdown_handler',
    'shutdown',
    'register_shutdown_task'
]

# Module version
__version__ = '1.0.0'