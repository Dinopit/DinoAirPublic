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

from .database_backup import (
    DatabaseBackupManager,
    DatabaseConfig,
    create_database_backup,
    restore_database_backup,
    test_database_connection
)

from .comprehensive_backup import (
    ComprehensiveBackupManager,
    ComprehensiveBackupConfig,
    ComprehensiveBackupResult,
    ComprehensiveBackupType,
    create_full_system_backup,
    create_incremental_backup,
    verify_all_backups,
    get_backup_status
)

from .disaster_recovery import (
    DisasterRecoveryManager,
    DisasterType,
    RecoveryProcedure,
    start_disaster_recovery,
    list_recovery_procedures,
    get_recovery_status
)

from .backup_testing import (
    BackupTestingManager,
    TestType,
    TestResult,
    run_backup_tests,
    get_test_status,
    start_automated_testing
)

__all__ = [
    # Basic backup functionality
    'BackupManager',
    'BackupConfig',
    'BackupMetadata',
    'BackupStats',
    'BackupType',
    'BackupStatus',
    'create_backup_manager',
    'backup_now',
    'restore_from_backup',
    
    # Database backup functionality
    'DatabaseBackupManager',
    'DatabaseConfig',
    'create_database_backup',
    'restore_database_backup',
    'test_database_connection',
    
    # Comprehensive backup functionality
    'ComprehensiveBackupManager',
    'ComprehensiveBackupConfig',
    'ComprehensiveBackupResult',
    'ComprehensiveBackupType',
    'create_full_system_backup',
    'create_incremental_backup',
    'verify_all_backups',
    'get_backup_status',
    
    # Disaster recovery functionality
    'DisasterRecoveryManager',
    'DisasterType',
    'RecoveryProcedure',
    'start_disaster_recovery',
    'list_recovery_procedures',
    'get_recovery_status',
    
    # Testing functionality
    'BackupTestingManager',
    'TestType',
    'TestResult',
    'run_backup_tests',
    'get_test_status',
    'start_automated_testing'
]

# Module version
__version__ = '2.0.0'