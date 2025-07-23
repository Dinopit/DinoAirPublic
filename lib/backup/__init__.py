"""
DinoAir Backup Module
Provides automated backup and restore for user data and configurations
"""

from .backup_manager import (
    BackupManager,
    BackupConfig,
    BackupMetadata,
    BackupStats,
    BackupType,
    BackupStatus,
    create_backup_manager,
    backup_now,
    restore_from_backup
)

__all__ = [
    'BackupManager',
    'BackupConfig',
    'BackupMetadata',
    'BackupStats',
    'BackupType',
    'BackupStatus',
    'create_backup_manager',
    'backup_now',
    'restore_from_backup'
]

# Module version
__version__ = '1.0.0'