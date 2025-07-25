"""
DinoAir Backup Manager
Provides automated backup and restore for user data and configurations
"""

import os
import json
import time
import shutil
import tarfile
import gzip
import hashlib
import threading
import schedule
from typing import Optional, List, Dict, Any, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from enum import Enum
import logging

class BackupType(Enum):
    """Types of backups"""
    FULL = "full"           # Complete backup
    INCREMENTAL = "incremental"  # Only changed files
    DIFFERENTIAL = "differential"  # Changes since last full backup

class BackupStatus(Enum):
    """Backup status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    VERIFIED = "verified"

@dataclass
class BackupConfig:
    """Backup configuration"""
    # Paths to backup
    backup_paths: List[str] = field(default_factory=lambda: [
        "./config",
        "./data",
        "./ComfyUI/models/checkpoints",
        "./ComfyUI/models/loras",
        "./ComfyUI/custom_nodes",
        "./ComfyUI/workflows",
        "./web-gui/.env.local",
        "./logs"
    ])
    
    # Exclude patterns
    exclude_patterns: List[str] = field(default_factory=lambda: [
        "*.tmp",
        "*.log",
        "__pycache__",
        ".git",
        "node_modules",
        "*.pyc",
        "temp/*"
    ])
    
    # Backup settings
    backup_dir: str = "./backups"
    max_backups: int = 10
    compression: bool = True
    encryption: bool = False
    encryption_key: Optional[str] = None
    
    # Schedule settings
    enable_scheduled: bool = True
    schedule_time: str = "03:00"  # Daily at 3 AM
    schedule_interval: str = "daily"  # daily, weekly, hourly
    
    # Retention policy
    retention_days: int = 30
    min_full_backups: int = 2
    min_incremental_backups: int = 5
    
    # Performance settings
    chunk_size: int = 1024 * 1024  # 1MB chunks
    max_file_size: int = 5 * 1024 * 1024 * 1024  # 5GB max file size
    verify_after_backup: bool = True

@dataclass
class BackupMetadata:
    """Metadata for a backup"""
    id: str
    type: BackupType
    timestamp: datetime
    size: int
    file_count: int
    duration: float
    status: BackupStatus
    checksum: str
    parent_backup: Optional[str] = None  # For incremental/differential
    error: Optional[str] = None
    verified: bool = False
    verification_time: Optional[datetime] = None

@dataclass
class BackupStats:
    """Backup statistics"""
    total_backups: int = 0
    successful_backups: int = 0
    failed_backups: int = 0
    total_size: int = 0
    last_backup_time: Optional[datetime] = None
    last_successful_backup: Optional[datetime] = None
    average_duration: float = 0.0

class BackupManager:
    """
    Manages backups for DinoAir
    """
    
    def __init__(self, config: Optional[BackupConfig] = None):
        self.config = config or BackupConfig()
        self.logger = logging.getLogger("BackupManager")
        
        # Create backup directory
        self.backup_dir = Path(self.config.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Metadata storage
        self.metadata_file = self.backup_dir / "metadata.json"
        self.metadata: Dict[str, BackupMetadata] = self._load_metadata()
        
        # Stats
        self.stats = self._calculate_stats()
        
        # Locks
        self._backup_lock = threading.Lock()
        self._scheduler_thread: Optional[threading.Thread] = None
        self._stop_scheduler = threading.Event()
        
        # Callbacks
        self.on_backup_start: List[Callable[[str], None]] = []
        self.on_backup_complete: List[Callable[[BackupMetadata], None]] = []
        self.on_backup_failed: List[Callable[[str, str], None]] = []
        
        # Start scheduler if enabled
        if self.config.enable_scheduled:
            self._start_scheduler()
    
    def _load_metadata(self) -> Dict[str, BackupMetadata]:
        """Load backup metadata from file"""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r') as f:
                    data = json.load(f)
                    return {
                        k: BackupMetadata(**v) for k, v in data.items()
                    }
            except Exception as e:
                self.logger.error(f"Failed to load metadata: {e}")
        return {}
    
    def _save_metadata(self):
        """Save backup metadata to file"""
        try:
            data = {}
            for k, v in self.metadata.items():
                data[k] = {
                    "id": v.id,
                    "type": v.type.value,
                    "timestamp": v.timestamp.isoformat(),
                    "size": v.size,
                    "file_count": v.file_count,
                    "duration": v.duration,
                    "status": v.status.value,
                    "checksum": v.checksum,
                    "parent_backup": v.parent_backup,
                    "error": v.error,
                    "verified": v.verified,
                    "verification_time": v.verification_time.isoformat() if v.verification_time else None
                }
            
            with open(self.metadata_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save metadata: {e}")
    
    def _calculate_stats(self) -> BackupStats:
        """Calculate backup statistics"""
        stats = BackupStats()
        
        if not self.metadata:
            return stats
        
        stats.total_backups = len(self.metadata)
        stats.successful_backups = sum(
            1 for m in self.metadata.values() 
            if m.status in [BackupStatus.COMPLETED, BackupStatus.VERIFIED]
        )
        stats.failed_backups = sum(
            1 for m in self.metadata.values() 
            if m.status == BackupStatus.FAILED
        )
        stats.total_size = sum(m.size for m in self.metadata.values())
        
        # Find last backup times
        sorted_backups = sorted(
            self.metadata.values(), 
            key=lambda m: m.timestamp, 
            reverse=True
        )
        
        if sorted_backups:
            stats.last_backup_time = sorted_backups[0].timestamp
            
            successful = [
                b for b in sorted_backups 
                if b.status in [BackupStatus.COMPLETED, BackupStatus.VERIFIED]
            ]
            if successful:
                stats.last_successful_backup = successful[0].timestamp
        
        # Calculate average duration
        durations = [
            m.duration for m in self.metadata.values() 
            if m.status in [BackupStatus.COMPLETED, BackupStatus.VERIFIED]
        ]
        if durations:
            stats.average_duration = sum(durations) / len(durations)
        
        return stats
    
    def create_backup(self, 
                     backup_type: BackupType = BackupType.FULL,
                     description: Optional[str] = None) -> Optional[BackupMetadata]:
        """Create a backup"""
        with self._backup_lock:
            backup_id = f"{backup_type.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            self.logger.info(f"Starting {backup_type.value} backup: {backup_id}")
            
            # Notify start
            for callback in self.on_backup_start:
                try:
                    callback(backup_id)
                except Exception as e:
                    self.logger.error(f"Error in backup start callback: {e}")
            
            start_time = time.time()
            
            # Create backup metadata
            metadata = BackupMetadata(
                id=backup_id,
                type=backup_type,
                timestamp=datetime.now(),
                size=0,
                file_count=0,
                duration=0,
                status=BackupStatus.IN_PROGRESS,
                checksum=""
            )
            
            try:
                # Find parent backup for incremental/differential
                if backup_type in [BackupType.INCREMENTAL, BackupType.DIFFERENTIAL]:
                    parent = self._find_parent_backup(backup_type)
                    if not parent:
                        self.logger.warning("No parent backup found, creating full backup instead")
                        backup_type = BackupType.FULL
                        metadata.type = BackupType.FULL
                    else:
                        metadata.parent_backup = parent.id
                
                # Create backup
                backup_path = self.backup_dir / f"{backup_id}.tar"
                if self.config.compression:
                    backup_path = backup_path.with_suffix('.tar.gz')
                
                # Collect files to backup
                files_to_backup = self._collect_files(backup_type, metadata.parent_backup)
                
                if not files_to_backup:
                    self.logger.info("No files to backup")
                    metadata.status = BackupStatus.COMPLETED
                    metadata.duration = time.time() - start_time
                    self.metadata[backup_id] = metadata
                    self._save_metadata()
                    return metadata
                
                # Create tar archive
                self._create_archive(backup_path, files_to_backup)
                
                # Get backup info
                metadata.size = backup_path.stat().st_size
                metadata.file_count = len(files_to_backup)
                metadata.checksum = self._calculate_checksum(backup_path)
                
                # Verify if enabled
                if self.config.verify_after_backup:
                    if self._verify_backup(backup_path, metadata.checksum):
                        metadata.verified = True
                        metadata.verification_time = datetime.now()
                        metadata.status = BackupStatus.VERIFIED
                    else:
                        raise Exception("Backup verification failed")
                else:
                    metadata.status = BackupStatus.COMPLETED
                
                metadata.duration = time.time() - start_time
                
                # Save metadata
                self.metadata[backup_id] = metadata
                self._save_metadata()
                
                # Update stats
                self.stats = self._calculate_stats()
                
                # Cleanup old backups
                self._cleanup_old_backups()
                
                self.logger.info(
                    f"Backup completed: {backup_id} "
                    f"({metadata.file_count} files, {metadata.size / 1024 / 1024:.2f} MB, "
                    f"{metadata.duration:.2f}s)"
                )
                
                # Notify completion
                for callback in self.on_backup_complete:
                    try:
                        callback(metadata)
                    except Exception as e:
                        self.logger.error(f"Error in backup complete callback: {e}")
                
                return metadata
                
            except Exception as e:
                self.logger.error(f"Backup failed: {e}")
                metadata.status = BackupStatus.FAILED
                metadata.error = str(e)
                metadata.duration = time.time() - start_time
                
                self.metadata[backup_id] = metadata
                self._save_metadata()
                
                # Notify failure
                for callback in self.on_backup_failed:
                    try:
                        callback(backup_id, str(e))
                    except Exception as e2:
                        self.logger.error(f"Error in backup failed callback: {e2}")
                
                return None
    
    def _find_parent_backup(self, backup_type: BackupType) -> Optional[BackupMetadata]:
        """Find parent backup for incremental/differential"""
        sorted_backups = sorted(
            [m for m in self.metadata.values() if m.status in [BackupStatus.COMPLETED, BackupStatus.VERIFIED]],
            key=lambda m: m.timestamp,
            reverse=True
        )
        
        if backup_type == BackupType.INCREMENTAL:
            # Find most recent backup of any type
            return sorted_backups[0] if sorted_backups else None
        else:  # DIFFERENTIAL
            # Find most recent full backup
            full_backups = [b for b in sorted_backups if b.type == BackupType.FULL]
            return full_backups[0] if full_backups else None
    
    def _collect_files(self, backup_type: BackupType, parent_id: Optional[str] = None) -> List[Path]:
        """Collect files to backup"""
        files = []
        parent_time = None
        
        # Get parent backup time for incremental/differential
        if parent_id and parent_id in self.metadata:
            parent_time = self.metadata[parent_id].timestamp
        
        for backup_path in self.config.backup_paths:
            path = Path(backup_path)
            if not path.exists():
                continue
            
            if path.is_file():
                # Single file
                if self._should_backup_file(path, backup_type, parent_time):
                    files.append(path)
            else:
                # Directory
                for file_path in path.rglob("*"):
                    if file_path.is_file() and self._should_backup_file(file_path, backup_type, parent_time):
                        files.append(file_path)
        
        return files
    
    def _should_backup_file(self, file_path: Path, backup_type: BackupType, parent_time: Optional[datetime]) -> bool:
        """Check if file should be backed up"""
        # Check exclude patterns
        for pattern in self.config.exclude_patterns:
            if file_path.match(pattern):
                return False
        
        # Check file size
        try:
            if file_path.stat().st_size > self.config.max_file_size:
                self.logger.warning(f"Skipping large file: {file_path}")
                return False
        except:
            return False
        
        # For full backup, include all files
        if backup_type == BackupType.FULL:
            return True
        
        # For incremental/differential, check modification time
        if parent_time:
            try:
                mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                return mtime > parent_time
            except:
                return False
        
        return True
    
    def _create_archive(self, archive_path: Path, files: List[Path]):
        """Create tar archive"""
        mode = 'w:gz' if self.config.compression else 'w'
        
        with tarfile.open(archive_path, mode) as tar:
            for file_path in files:
                try:
                    # Add file with relative path
                    arcname = str(file_path.relative_to('.'))
                    tar.add(file_path, arcname=arcname)
                except Exception as e:
                    self.logger.error(f"Failed to add {file_path}: {e}")
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate file checksum"""
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(self.config.chunk_size), b""):
                sha256_hash.update(byte_block)
        
        return sha256_hash.hexdigest()
    
    def _verify_backup(self, backup_path: Path, expected_checksum: str) -> bool:
        """Verify backup integrity"""
        try:
            actual_checksum = self._calculate_checksum(backup_path)
            return actual_checksum == expected_checksum
        except Exception as e:
            self.logger.error(f"Verification failed: {e}")
            return False
    
    def restore_backup(self, backup_id: str, restore_path: Optional[str] = None) -> bool:
        """Restore from backup"""
        if backup_id not in self.metadata:
            self.logger.error(f"Backup not found: {backup_id}")
            return False
        
        metadata = self.metadata[backup_id]
        backup_path = self.backup_dir / f"{backup_id}.tar"
        if self.config.compression:
            backup_path = backup_path.with_suffix('.tar.gz')
        
        if not backup_path.exists():
            self.logger.error(f"Backup file not found: {backup_path}")
            return False
        
        # Verify backup before restore
        if not self._verify_backup(backup_path, metadata.checksum):
            self.logger.error("Backup verification failed")
            return False
        
        self.logger.info(f"Starting restore from backup: {backup_id}")
        
        try:
            # Determine restore path
            if not restore_path:
                restore_path = "."
            
            restore_dir = Path(restore_path)
            restore_dir.mkdir(parents=True, exist_ok=True)
            
            # Extract archive
            mode = 'r:gz' if self.config.compression else 'r'
            
            with tarfile.open(backup_path, mode) as tar:
                # Security check - prevent path traversal
                for member in tar.getmembers():
                    if member.name.startswith('..') or member.name.startswith('/'):
                        self.logger.warning(f"Skipping unsafe path: {member.name}")
                        continue
                
                tar.extractall(path=restore_dir)
            
            self.logger.info(f"Restore completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Restore failed: {e}")
            return False
    
    def _cleanup_old_backups(self):
        """Clean up old backups based on retention policy"""
        cutoff_date = datetime.now() - timedelta(days=self.config.retention_days)
        
        # Group backups by type
        full_backups = []
        incremental_backups = []
        
        for metadata in self.metadata.values():
            if metadata.status in [BackupStatus.COMPLETED, BackupStatus.VERIFIED]:
                if metadata.type == BackupType.FULL:
                    full_backups.append(metadata)
                else:
                    incremental_backups.append(metadata)
        
        # Sort by timestamp
        full_backups.sort(key=lambda m: m.timestamp, reverse=True)
        incremental_backups.sort(key=lambda m: m.timestamp, reverse=True)
        
        # Keep minimum required backups
        to_keep = set()
        
        # Keep minimum full backups
        for i, backup in enumerate(full_backups):
            if i < self.config.min_full_backups:
                to_keep.add(backup.id)
        
        # Keep minimum incremental backups
        for i, backup in enumerate(incremental_backups):
            if i < self.config.min_incremental_backups:
                to_keep.add(backup.id)
        
        # Delete old backups
        for backup_id, metadata in list(self.metadata.items()):
            if backup_id not in to_keep and metadata.timestamp < cutoff_date:
                self._delete_backup(backup_id)
    
    def _delete_backup(self, backup_id: str):
        """Delete a backup"""
        if backup_id not in self.metadata:
            return
        
        metadata = self.metadata[backup_id]
        
        # Delete file
        backup_path = self.backup_dir / f"{backup_id}.tar"
        if self.config.compression:
            backup_path = backup_path.with_suffix('.tar.gz')
        
        try:
            if backup_path.exists():
                backup_path.unlink()
            
            # Remove metadata
            del self.metadata[backup_id]
            self._save_metadata()
            
            self.logger.info(f"Deleted backup: {backup_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to delete backup {backup_id}: {e}")
    
    def list_backups(self) -> List[BackupMetadata]:
        """List all backups"""
        return sorted(
            self.metadata.values(),
            key=lambda m: m.timestamp,
            reverse=True
        )
    
    def get_backup_info(self, backup_id: str) -> Optional[BackupMetadata]:
        """Get information about a specific backup"""
        return self.metadata.get(backup_id)
    
    def _start_scheduler(self):
        """Start backup scheduler"""
        def scheduler_thread():
            # Schedule based on config
            if self.config.schedule_interval == "hourly":
                schedule.every().hour.do(lambda: self.create_backup(BackupType.INCREMENTAL))
            elif self.config.schedule_interval == "daily":
                schedule.every().day.at(self.config.schedule_time).do(
                    lambda: self.create_backup(BackupType.FULL)
                )
            elif self.config.schedule_interval == "weekly":
                schedule.every().week.at(self.config.schedule_time).do(
                    lambda: self.create_backup(BackupType.FULL)
                )
            
            while not self._stop_scheduler.is_set():
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        
        self._scheduler_thread = threading.Thread(target=scheduler_thread, daemon=True)
        self._scheduler_thread.start()
        self.logger.info(f"Backup scheduler started ({self.config.schedule_interval} at {self.config.schedule_time})")
    
    def stop_scheduler(self):
        """Stop backup scheduler"""
        self._stop_scheduler.set()
        if self._scheduler_thread:
            self._scheduler_thread.join()
        self.logger.info("Backup scheduler stopped")

# Helper functions
def create_backup_manager(config: Optional[BackupConfig] = None) -> BackupManager:
    """Create and configure backup manager"""
    return BackupManager(config)

def backup_now(backup_type: BackupType = BackupType.FULL) -> bool:
    """Create a backup immediately"""
    manager = create_backup_manager()
    result = manager.create_backup(backup_type)
    return result is not None

def restore_from_backup(backup_id: str, restore_path: Optional[str] = None) -> bool:
    """Restore from a specific backup"""
    manager = create_backup_manager()
    return manager.restore_backup(backup_id, restore_path)

if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    
    # Create backup manager with custom config
    config = BackupConfig(
        backup_paths=["./test_data"],
        backup_dir="./test_backups",
        max_backups=5,
        retention_days=7,
        enable_scheduled=False  # Disable for testing
    )
    
    manager = BackupManager(config)
    
    # Create test data
    test_dir = Path("./test_data")
    test_dir.mkdir(exist_ok=True)
    (test_dir / "config.json").write_text('{"test": "data"}')
    (test_dir / "data.txt").write_text("Important data")
    
    # Create full backup
    print("Creating full backup...")
    backup1 = manager.create_backup(BackupType.FULL)
    if backup1:
        print(f"Backup created: {backup1.id}")
    
    # Modify a file
    time.sleep(1)
    (test_dir / "data.txt").write_text("Modified data")
    
    # Create incremental backup
    print("\nCreating incremental backup...")
    backup2 = manager.create_backup(BackupType.INCREMENTAL)
    if backup2:
        print(f"Backup created: {backup2.id}")
    
    # List backups
    print("\nAvailable backups:")
    for backup in manager.list_backups():
        print(f"  - {backup.id}: {backup.type.value}, {backup.size / 1024:.2f} KB")
    
    # Test restore
    print("\nTesting restore...")
    if backup1:
        restore_dir = Path("./test_restore")
        if manager.restore_backup(backup1.id, str(restore_dir)):
            print("Restore successful")
            
            # Check restored files
            restored_file = restore_dir / "test_data" / "data.txt"
            if restored_file.exists():
                print(f"Restored content: {restored_file.read_text()}")
        
        # Cleanup
        shutil.rmtree(restore_dir, ignore_errors=True)
    
    # Cleanup test data
    shutil.rmtree(test_dir, ignore_errors=True)
    shutil.rmtree("./test_backups", ignore_errors=True)