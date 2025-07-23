"""
DinoAir Rollback Module
Provides rollback mechanisms for failed updates and changes
"""

from .rollback_manager import (
    RollbackManager,
    RollbackConfig,
    UpdateSnapshot,
    UpdateHistory,
    UpdateType,
    UpdateStatus,
    create_rollback_manager,
    track_update,
    complete_update,
    rollback_update
)

__all__ = [
    'RollbackManager',
    'RollbackConfig',
    'UpdateSnapshot',
    'UpdateHistory',
    'UpdateType',
    'UpdateStatus',
    'create_rollback_manager',
    'track_update',
    'complete_update',
    'rollback_update'
]

# Module version
__version__ = '1.0.0'