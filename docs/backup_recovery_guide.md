# DinoAir Backup and Recovery Documentation

This document provides comprehensive information about DinoAir's automated backup and recovery system.

## Table of Contents

1. [Overview](#overview)
2. [Backup Components](#backup-components)
3. [Configuration](#configuration)
4. [Backup Operations](#backup-operations)
5. [Recovery Procedures](#recovery-procedures)
6. [Automated Testing](#automated-testing)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

## Overview

DinoAir's backup and recovery system provides comprehensive data protection and disaster recovery capabilities. The system is designed to:

- **Automatically backup** critical application data, configurations, and databases
- **Verify backup integrity** using checksums and automated testing
- **Provide disaster recovery procedures** for various failure scenarios
- **Enable automated testing** of backup and recovery processes
- **Monitor backup health** and alert on issues

### Key Features

- **Multi-tier Backup Strategy**: File system, database, and comprehensive backups
- **Incremental Backups**: Efficient storage through incremental backup support
- **Automated Scheduling**: Configurable backup schedules with retention policies
- **Disaster Recovery Runbooks**: Pre-defined procedures for various disaster scenarios
- **Automated Testing**: Regular validation of backup and recovery processes
- **Health Monitoring**: Real-time backup system health monitoring

## Backup Components

### 1. File System Backup Manager (`BackupManager`)

Handles backup of application files, configurations, and user data.

**Features:**
- Full, incremental, and differential backup types
- Configurable inclusion/exclusion patterns
- Compression and encryption support
- Automatic cleanup based on retention policies
- Backup verification with checksums

**Default Backup Paths:**
- `./config` - Application configuration files
- `./data` - User data and application state
- `./ComfyUI/models` - AI model files
- `./ComfyUI/custom_nodes` - Custom ComfyUI nodes
- `./ComfyUI/workflows` - User workflows
- `./personalities` - AI personality configurations
- `./web-gui/.env.local` - Web interface environment variables
- `./logs` - Application logs (recent only)

### 2. Database Backup Manager (`DatabaseBackupManager`)

Handles backup of Supabase/PostgreSQL databases.

**Features:**
- PostgreSQL dump-based backups
- Multiple backup formats (custom, plain, tar)
- Compression support
- Connection testing and validation
- Restore functionality with target database selection

**Supported Databases:**
- Supabase (PostgreSQL)
- Local PostgreSQL instances
- Remote PostgreSQL databases

### 3. Comprehensive Backup Manager (`ComprehensiveBackupManager`)

Orchestrates both file system and database backups for complete system protection.

**Features:**
- Coordinated file and database backups
- Backup verification across all components
- Status reporting and health monitoring
- Integration with disaster recovery procedures

### 4. Disaster Recovery Manager (`DisasterRecoveryManager`)

Provides automated disaster recovery procedures and runbooks.

**Supported Disaster Scenarios:**
- Complete system failure
- Database corruption
- File system corruption
- Configuration corruption
- Partial data loss
- Security breach recovery

### 5. Backup Testing Manager (`BackupTestingManager`)

Automated testing framework for backup and recovery processes.

**Test Types:**
- Backup creation tests
- Backup verification tests
- Restore functionality tests
- Disaster recovery simulation
- Performance testing
- Stress testing

## Configuration

### Environment Variables

The backup system uses the following environment variables:

```bash
# Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Alternative PostgreSQL Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password

# Backup Configuration
BACKUP_DIR=/path/to/backups
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=true
```

### Configuration Files

#### Backup Configuration (`config/backup_config.yaml`)

```yaml
file_backup:
  backup_paths:
    - "./config"
    - "./data"
    - "./ComfyUI/models"
    - "./ComfyUI/custom_nodes"
    - "./personalities"
    - "./web-gui/.env.local"
  
  exclude_patterns:
    - "*.tmp"
    - "*.log"
    - "__pycache__"
    - ".git"
    - "node_modules"
    - "*.pyc"
    - "temp/*"
  
  backup_dir: "./backups/files"
  max_backups: 10
  compression: true
  verify_after_backup: true

database_backup:
  backup_format: "custom"
  compression_level: 6
  include_data: true
  include_schema: true
  backup_dir: "./backups/database"

comprehensive_backup:
  include_database: true
  include_files: true
  enable_scheduled: true
  full_backup_schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  incremental_schedule: "0 3 * * 1-6"  # Daily except Sunday at 3 AM
  retention_full_backups: 4
  retention_incremental_backups: 14
  verify_backups: true
```

#### Disaster Recovery Configuration (`config/disaster_recovery.json`)

The system automatically creates default disaster recovery procedures. You can customize them by editing the configuration file:

```json
{
  "complete_system_failure": [
    {
      "name": "Complete System Recovery",
      "description": "Full system restoration from complete failure",
      "estimated_duration": "2-4 hours",
      "prerequisites": [
        "Access to backup storage",
        "New system or restored hardware",
        "Network connectivity",
        "Database credentials"
      ],
      "steps": [
        {
          "step": "assessment",
          "title": "Assess System State",
          "description": "Evaluate the extent of system damage",
          "commands": ["df -h", "free -m", "systemctl status"]
        }
      ]
    }
  ]
}
```

## Backup Operations

### Manual Backup Operations

#### Create Full System Backup

```python
from lib.backup import create_full_system_backup

# Create comprehensive backup
result = create_full_system_backup()

if result.success:
    print(f"Backup completed: {result.backup_id}")
    print(f"Size: {result.total_size / 1024 / 1024:.2f} MB")
    print(f"Files: {result.file_count}")
else:
    print(f"Backup failed: {result.errors}")
```

#### Create Incremental Backup

```python
from lib.backup import create_incremental_backup

# Create incremental backup
result = create_incremental_backup()
print(f"Incremental backup: {'Success' if result.success else 'Failed'}")
```

#### Create Database Backup Only

```python
from lib.backup import create_database_backup

# Create database backup
backup_path = create_database_backup()
if backup_path:
    print(f"Database backup created: {backup_path}")
```

#### Verify Backups

```python
from lib.backup import verify_all_backups

# Verify all backups
verification = verify_all_backups()
print(f"Verification status: {verification['overall_status']}")

if verification['errors']:
    print("Issues found:")
    for error in verification['errors']:
        print(f"  - {error}")
```

### Automated Backup Scheduling

The system supports automated backup scheduling using cron-like expressions:

```python
from lib.backup import ComprehensiveBackupManager, ComprehensiveBackupConfig

# Configure automated backups
config = ComprehensiveBackupConfig(
    enable_scheduled=True,
    full_backup_schedule="0 2 * * 0",      # Weekly full backup
    incremental_schedule="0 3 * * 1-6",    # Daily incremental
    database_schedule="0 1 * * *"          # Daily database backup
)

# Start backup manager with scheduling
manager = ComprehensiveBackupManager(config)
# Scheduling is automatically enabled
```

### Backup Status and Monitoring

```python
from lib.backup import get_backup_status

# Get comprehensive backup status
status = get_backup_status()

print(f"Backup Health: {status['backup_health']}")
print(f"Hours since last backup: {status['hours_since_last_backup']}")
print(f"Total backups: {status['file_backup_stats']['total_backups']}")
print(f"Success rate: {status['file_backup_stats']['successful_backups']}/{status['file_backup_stats']['total_backups']}")

# Recent backup history
for backup in status['recent_backup_history'][:5]:
    print(f"  {backup['timestamp']}: {backup['type']} - {'✓' if backup['success'] else '✗'}")
```

## Recovery Procedures

### Disaster Recovery

#### List Available Recovery Procedures

```python
from lib.backup import list_recovery_procedures, DisasterType

# List all procedures
all_procedures = list_recovery_procedures()

# List procedures for specific disaster type
db_procedures = list_recovery_procedures(DisasterType.DATABASE_CORRUPTION)
print("Database corruption recovery procedures:")
for proc in db_procedures['database_corruption']:
    print(f"  - {proc['name']}: {proc['description']}")
```

#### Execute Disaster Recovery

```python
from lib.backup import start_disaster_recovery, DisasterType

# Start database corruption recovery
success = start_disaster_recovery(
    disaster_type=DisasterType.DATABASE_CORRUPTION,
    procedure_name="Database Recovery"
)

if success:
    print("Disaster recovery completed successfully")
else:
    print("Disaster recovery failed")
```

#### Monitor Recovery Progress

```python
from lib.backup import get_recovery_status

# Check recovery status
status = get_recovery_status()

if status['status'] == 'in_progress':
    print(f"Recovery in progress: {status['procedure_name']}")
    print(f"Completed steps: {len(status['completed_steps'])}")
    print(f"Failed steps: {len(status['failed_steps'])}")
else:
    print(f"Recovery status: {status['status']}")
```

### Manual Restore Operations

#### Restore from File Backup

```python
from lib.backup import BackupManager, restore_from_backup

# List available backups
manager = BackupManager()
backups = manager.list_backups()

# Restore latest backup
if backups:
    latest_backup = backups[0]
    success = restore_from_backup(latest_backup.id, "./restore_location")
    print(f"Restore {'successful' if success else 'failed'}")
```

#### Restore Database

```python
from lib.backup import restore_database_backup
from pathlib import Path

# Restore from specific database backup
backup_file = Path("./backups/database/db_backup_20231201_020000.dump")
success = restore_database_backup(backup_file, target_database="restored_db")
print(f"Database restore {'successful' if success else 'failed'}")
```

### Recovery Verification

After any recovery operation, verify system integrity:

```python
from lib.backup import verify_all_backups

# Verify system after recovery
verification = verify_all_backups()

# Check application health
from lib.backup.disaster_recovery import DisasterRecoveryManager
dr_manager = DisasterRecoveryManager()
health_ok = dr_manager._verify_system_health()

print(f"Post-recovery verification: {'✓' if verification['overall_status'] == 'success' else '✗'}")
print(f"System health check: {'✓' if health_ok else '✗'}")
```

## Automated Testing

The backup system includes comprehensive automated testing to ensure reliability.

### Test Suites

#### Daily Tests
- File backup creation
- Database backup creation  
- Backup verification
- Quick restore test

#### Weekly Tests
- Full system backup
- Comprehensive verification
- Full restore test
- Disaster recovery simulation
- Performance testing

#### Monthly Tests
- Large dataset stress testing
- Concurrent backup testing
- Low disk space scenarios
- Corruption recovery testing

### Running Tests

#### Manual Test Execution

```python
from lib.backup import run_backup_tests

# Run daily test suite
results = run_backup_tests("daily")

print(f"Test Status: {results['status']}")
print(f"Tests Passed: {results['summary']['passed']}")
print(f"Tests Failed: {results['summary']['failed']}")
print(f"Duration: {results['duration']:.2f} seconds")

# Run specific test suite
weekly_results = run_backup_tests("weekly")
```

#### Automated Test Scheduling

```python
from lib.backup import start_automated_testing

# Start automated test scheduler
test_manager = start_automated_testing()

# Tests will run according to their schedules:
# - Daily tests: 5 AM daily
# - Weekly tests: 2 AM Sunday
# - Monthly tests: 1 AM first day of month
```

#### Test Status Monitoring

```python
from lib.backup import get_test_status

# Check current test status
status = get_test_status()

if status['status'] == 'running':
    print(f"Currently running: {status['current_execution']['suite_name']}")
else:
    last_run = status.get('last_execution')
    if last_run:
        print(f"Last test: {last_run['suite_name']} - {last_run['status']}")
```

## Monitoring and Maintenance

### Health Monitoring

The backup system provides comprehensive health monitoring:

```python
from lib.backup import get_backup_status

status = get_backup_status()

# Backup health indicators
health = status['backup_health']  # healthy, stale, critical, unknown
hours_since_backup = status['hours_since_last_backup']

# Alert conditions
if health == 'critical':
    print("CRITICAL: No successful backups found")
elif health == 'stale':
    print(f"WARNING: Last backup was {hours_since_backup:.1f} hours ago")
elif health == 'healthy':
    print("Backup system is healthy")
```

### Log Files

The backup system creates detailed logs in the following locations:

- `./logs/backup_tests/` - Test execution logs
- `./logs/disaster_recovery/` - Recovery procedure logs
- Application logs include backup operation details

### Maintenance Tasks

#### Regular Maintenance (Weekly)
- Review backup success rates
- Check available disk space
- Verify backup integrity
- Test restore procedures

#### Monthly Maintenance
- Review and update disaster recovery procedures
- Performance analysis and optimization
- Security review of backup procedures
- Capacity planning for backup storage

### Alerting Integration

To integrate with monitoring systems:

```python
from lib.backup import get_backup_status, get_test_status

def check_backup_health():
    backup_status = get_backup_status()
    test_status = get_test_status()
    
    alerts = []
    
    # Check backup health
    if backup_status['backup_health'] == 'critical':
        alerts.append("CRITICAL: Backup system failure")
    elif backup_status['backup_health'] == 'stale':
        hours = backup_status['hours_since_last_backup']
        alerts.append(f"WARNING: Last backup {hours:.1f} hours ago")
    
    # Check recent failures
    recent_backups = backup_status['recent_backup_history'][:5]
    failure_count = sum(1 for b in recent_backups if not b['success'])
    if failure_count >= 3:
        alerts.append(f"WARNING: {failure_count} recent backup failures")
    
    # Check test failures
    if test_status['status'] == 'idle':
        last_test = test_status.get('last_execution')
        if last_test and last_test['status'] == 'failed':
            alerts.append("WARNING: Last backup test failed")
    
    return alerts

# Use in monitoring system
alerts = check_backup_health()
for alert in alerts:
    print(alert)  # Send to monitoring system
```

## Troubleshooting

### Common Issues

#### Backup Creation Failures

**Symptoms:**
- Backup operations return `None` or `success=False`
- Error messages in logs

**Troubleshooting:**
1. Check available disk space
2. Verify backup directory permissions
3. Check for locked files or processes
4. Review backup configuration paths

```python
from lib.backup import get_backup_status
import shutil

# Check disk space
total, used, free = shutil.disk_usage(".")
free_gb = free / (1024**3)
print(f"Available disk space: {free_gb:.2f} GB")

# Check backup status for errors
status = get_backup_status()
recent_failures = [b for b in status['recent_backup_history'] if not b['success']]
for failure in recent_failures:
    print(f"Failed backup: {failure['backup_id']} - {failure.get('errors', [])}")
```

#### Database Backup Issues

**Symptoms:**
- Database backup returns `None`
- PostgreSQL connection errors

**Troubleshooting:**
1. Test database connectivity
2. Verify credentials and permissions
3. Check PostgreSQL client installation
4. Review firewall and network settings

```python
from lib.backup import test_database_connection

# Test database connection
if test_database_connection():
    print("Database connection successful")
else:
    print("Database connection failed")
    # Check environment variables
    import os
    print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL', 'Not set')}")
    print(f"DB_HOST: {os.getenv('DB_HOST', 'Not set')}")
```

#### Restore Failures

**Symptoms:**
- Restore operations return `False`
- Incomplete or corrupted restored files

**Troubleshooting:**
1. Verify backup file integrity
2. Check restore destination permissions
3. Ensure sufficient disk space
4. Test with known good backup

```python
from lib.backup import verify_all_backups

# Verify backup integrity
verification = verify_all_backups()
print(f"Verification status: {verification['overall_status']}")

if verification['errors']:
    print("Backup integrity issues:")
    for error in verification['errors']:
        print(f"  - {error}")
```

#### Performance Issues

**Symptoms:**
- Slow backup operations
- High CPU or disk usage during backups
- Backup timeouts

**Solutions:**
1. Adjust compression settings
2. Implement backup scheduling during off-peak hours
3. Exclude unnecessary files
4. Use incremental backups more frequently

```python
from lib.backup import BackupConfig, ComprehensiveBackupConfig

# Optimize backup configuration
config = ComprehensiveBackupConfig(
    # Schedule during off-peak hours
    full_backup_schedule="0 2 * * 0",     # 2 AM Sunday
    incremental_schedule="0 3 * * 1-6",   # 3 AM weekdays
    
    # Optimize performance
    verify_backups=False,  # Skip verification for faster backups
)

# Optimize file backup settings
file_config = BackupConfig(
    compression=True,
    chunk_size=2 * 1024 * 1024,  # 2MB chunks
    max_file_size=1 * 1024 * 1024 * 1024,  # 1GB max file size
    exclude_patterns=[
        "*.tmp", "*.log", "__pycache__", 
        "node_modules", "*.pyc", "cache/*",
        "temp/*", "*.pid", "*.lock"
    ]
)
```

### Recovery Scenarios

#### Complete System Recovery

For complete system failure:

1. **Assess the situation**
   - Document what failed and when
   - Determine if hardware replacement is needed
   - Verify backup accessibility

2. **Prepare new environment**
   ```bash
   # Install prerequisites
   sudo apt update
   sudo apt install -y python3 python3-pip nodejs npm postgresql-client
   
   # Create directory structure
   mkdir -p /opt/dinoair
   cd /opt/dinoair
   ```

3. **Restore from backups**
   ```python
   from lib.backup import start_disaster_recovery, DisasterType
   
   # Start automated recovery
   success = start_disaster_recovery(
       disaster_type=DisasterType.COMPLETE_SYSTEM_FAILURE
   )
   ```

4. **Verify restoration**
   ```python
   from lib.backup import verify_all_backups
   
   verification = verify_all_backups()
   print(f"System verification: {verification['overall_status']}")
   ```

#### Partial Data Recovery

For partial data loss or corruption:

1. **Identify affected components**
2. **Create current state backup** (if possible)
3. **Restore specific components**
4. **Verify data integrity**
5. **Resume normal operations**

## API Reference

### Core Classes

#### `BackupManager`

Main class for file system backup operations.

```python
class BackupManager:
    def __init__(self, config: Optional[BackupConfig] = None)
    def create_backup(self, backup_type: BackupType = BackupType.FULL) -> Optional[BackupMetadata]
    def restore_backup(self, backup_id: str, restore_path: Optional[str] = None) -> bool
    def list_backups(self) -> List[BackupMetadata]
    def verify_backup(self, backup_id: str) -> bool
```

#### `DatabaseBackupManager`

Database backup and restore operations.

```python
class DatabaseBackupManager:
    def __init__(self, config: Optional[DatabaseConfig] = None)
    def create_backup(self, backup_path: Optional[Path] = None, backup_name: Optional[str] = None) -> Optional[Path]
    def restore_backup(self, backup_file: Path, target_database: Optional[str] = None) -> bool
    def test_connection(self) -> bool
    def get_database_info(self) -> Optional[Dict[str, Any]]
```

#### `ComprehensiveBackupManager`

Orchestrates complete system backups.

```python
class ComprehensiveBackupManager:
    def __init__(self, config: Optional[ComprehensiveBackupConfig] = None)
    def create_full_system_backup(self) -> ComprehensiveBackupResult
    def create_incremental_backup(self) -> ComprehensiveBackupResult
    def create_database_backup(self) -> ComprehensiveBackupResult
    def verify_backups(self) -> Dict[str, Any]
    def get_backup_status(self) -> Dict[str, Any]
```

#### `DisasterRecoveryManager`

Disaster recovery procedures and execution.

```python
class DisasterRecoveryManager:
    def __init__(self, backup_config: Optional[ComprehensiveBackupConfig] = None)
    def start_recovery(self, disaster_type: DisasterType, procedure_name: Optional[str] = None) -> bool
    def list_procedures(self, disaster_type: Optional[DisasterType] = None) -> Dict[str, Any]
    def get_recovery_status(self) -> Dict[str, Any]
```

#### `BackupTestingManager`

Automated testing of backup and recovery systems.

```python
class BackupTestingManager:
    def __init__(self, backup_config: Optional[ComprehensiveBackupConfig] = None)
    def run_test_suite(self, suite_name: str) -> Dict[str, Any]
    def start_scheduler(self) -> None
    def stop_scheduler(self) -> None
    def get_test_status(self) -> Dict[str, Any]
```

### Helper Functions

```python
# Quick backup operations
def create_full_system_backup(config: Optional[ComprehensiveBackupConfig] = None) -> ComprehensiveBackupResult
def create_incremental_backup(config: Optional[ComprehensiveBackupConfig] = None) -> ComprehensiveBackupResult
def create_database_backup(config: Optional[DatabaseConfig] = None, backup_path: Optional[Path] = None) -> Optional[Path]

# Verification and status
def verify_all_backups(config: Optional[ComprehensiveBackupConfig] = None) -> Dict[str, Any]
def get_backup_status(config: Optional[ComprehensiveBackupConfig] = None) -> Dict[str, Any]

# Disaster recovery
def start_disaster_recovery(disaster_type: DisasterType, procedure_name: Optional[str] = None) -> bool
def list_recovery_procedures(disaster_type: Optional[DisasterType] = None) -> Dict[str, Any]
def get_recovery_status() -> Dict[str, Any]

# Testing
def run_backup_tests(suite_name: str = "daily") -> Dict[str, Any]
def get_test_status() -> Dict[str, Any]
def start_automated_testing() -> BackupTestingManager
```

### Configuration Classes

```python
@dataclass
class BackupConfig:
    backup_paths: List[str]
    exclude_patterns: List[str]
    backup_dir: str = "./backups"
    max_backups: int = 10
    compression: bool = True
    verify_after_backup: bool = True
    # ... other fields

@dataclass
class DatabaseConfig:
    host: str = "localhost"
    port: int = 5432
    database: str = ""
    username: str = ""
    password: str = ""
    backup_format: str = "custom"
    # ... other fields

@dataclass
class ComprehensiveBackupConfig:
    backup_dir: str = "./backups"
    include_database: bool = True
    include_files: bool = True
    enable_scheduled: bool = True
    full_backup_schedule: str = "0 2 * * 0"
    incremental_schedule: str = "0 3 * * 1-6"
    # ... other fields
```

### Enums

```python
class BackupType(Enum):
    FULL = "full"
    INCREMENTAL = "incremental"
    DIFFERENTIAL = "differential"

class BackupStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    VERIFIED = "verified"

class DisasterType(Enum):
    COMPLETE_SYSTEM_FAILURE = "complete_system_failure"
    DATABASE_CORRUPTION = "database_corruption"
    FILE_SYSTEM_CORRUPTION = "file_system_corruption"
    CONFIGURATION_CORRUPTION = "configuration_corruption"
    PARTIAL_DATA_LOSS = "partial_data_loss"
    SECURITY_BREACH = "security_breach"

class TestType(Enum):
    BACKUP_CREATION = "backup_creation"
    BACKUP_VERIFICATION = "backup_verification"
    RESTORE_FUNCTIONALITY = "restore_functionality"
    DISASTER_RECOVERY = "disaster_recovery"
    PERFORMANCE = "performance"
    STRESS_TEST = "stress_test"
```

---

For additional support or questions about the backup and recovery system, please refer to the DinoAir documentation or contact the development team.