"""
DinoAir Rollback Manager
Provides rollback mechanisms for failed updates and changes
"""

import os
import json
import shutil
import time
import hashlib
import subprocess
from typing import Optional, List, Dict, Any, Callable, Union, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from enum import Enum
import logging
import tempfile
import sys

# Add parent directory for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from lib.backup.backup_manager import BackupManager, BackupType

class UpdateType(Enum):
    """Types of updates"""
    SYSTEM = "system"          # System/core updates
    COMFYUI = "comfyui"       # ComfyUI updates
    MODELS = "models"         # Model updates
    CONFIG = "config"         # Configuration changes
    CUSTOM_NODES = "custom_nodes"  # Custom node updates
    DEPENDENCIES = "dependencies"  # Dependency updates

class UpdateStatus(Enum):
    """Update status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    VERIFIED = "verified"

@dataclass
class UpdateSnapshot:
    """Snapshot of system state before update"""
    id: str
    timestamp: datetime
    update_type: UpdateType
    description: str
    
    # Version information
    old_version: str
    new_version: str
    
    # File snapshots
    modified_files: List[str] = field(default_factory=list)
    new_files: List[str] = field(default_factory=list)
    deleted_files: List[str] = field(default_factory=list)
    
    # Backup references
    backup_id: Optional[str] = None
    
    # Checksums for verification
    checksums: Dict[str, str] = field(default_factory=dict)
    
    # Rollback data
    rollback_data: Dict[str, Any] = field(default_factory=dict)

@dataclass
class UpdateHistory:
    """History entry for an update"""
    snapshot_id: str
    status: UpdateStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    error: Optional[str] = None
    rollback_performed: bool = False
    rollback_time: Optional[datetime] = None

@dataclass
class RollbackConfig:
    """Configuration for rollback manager"""
    # Paths to monitor
    monitored_paths: List[str] = field(default_factory=lambda: [
        "./ComfyUI",
        "./web-gui",
        "./config",
        "./lib"
    ])
    
    # Snapshot settings
    snapshot_dir: str = "./rollback_snapshots"
    max_snapshots: int = 20
    auto_snapshot: bool = True
    
    # Verification settings
    verify_rollback: bool = True
    checksum_verification: bool = True
    
    # Integration settings
    use_backup_system: bool = True
    backup_before_update: bool = True
    
    # Safety settings
    dry_run_rollback: bool = False
    confirm_rollback: bool = True

class RollbackManager:
    """
    Manages rollback functionality for DinoAir updates
    """
    
    def __init__(self, config: Optional[RollbackConfig] = None):
        self.config = config or RollbackConfig()
        self.logger = logging.getLogger("RollbackManager")
        
        # Create directories
        self.snapshot_dir = Path(self.config.snapshot_dir)
        self.snapshot_dir.mkdir(parents=True, exist_ok=True)
        
        # Load history
        self.history_file = self.snapshot_dir / "update_history.json"
        self.history: Dict[str, UpdateHistory] = self._load_history()
        
        # Backup manager integration
        self.backup_manager = None
        if self.config.use_backup_system:
            try:
                from lib.backup import create_backup_manager
                self.backup_manager = create_backup_manager()
            except ImportError:
                self.logger.warning("Backup system not available")
        
        # Active update tracking
        self.active_update: Optional[UpdateSnapshot] = None
    
    def _load_history(self) -> Dict[str, UpdateHistory]:
        """Load update history"""
        if self.history_file.exists():
            try:
                with open(self.history_file, 'r') as f:
                    data = json.load(f)
                    history = {}
                    for k, v in data.items():
                        v['start_time'] = datetime.fromisoformat(v['start_time'])
                        if v.get('end_time'):
                            v['end_time'] = datetime.fromisoformat(v['end_time'])
                        if v.get('rollback_time'):
                            v['rollback_time'] = datetime.fromisoformat(v['rollback_time'])
                        v['status'] = UpdateStatus(v['status'])
                        history[k] = UpdateHistory(**v)
                    return history
            except Exception as e:
                self.logger.error(f"Failed to load history: {e}")
        return {}
    
    def _save_history(self):
        """Save update history"""
        try:
            data = {}
            for k, v in self.history.items():
                data[k] = {
                    'snapshot_id': v.snapshot_id,
                    'status': v.status.value,
                    'start_time': v.start_time.isoformat(),
                    'end_time': v.end_time.isoformat() if v.end_time else None,
                    'error': v.error,
                    'rollback_performed': v.rollback_performed,
                    'rollback_time': v.rollback_time.isoformat() if v.rollback_time else None
                }
            
            with open(self.history_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save history: {e}")
    
    def begin_update(self, 
                    update_type: UpdateType,
                    old_version: str,
                    new_version: str,
                    description: str = "") -> UpdateSnapshot:
        """Begin tracking an update"""
        # Create snapshot ID
        snapshot_id = f"{update_type.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        self.logger.info(f"Beginning update: {snapshot_id} ({old_version} -> {new_version})")
        
        # Create backup if configured
        backup_id = None
        if self.config.backup_before_update and self.backup_manager:
            self.logger.info("Creating pre-update backup...")
            backup_metadata = self.backup_manager.create_backup(
                BackupType.FULL,
                description=f"Pre-update backup for {snapshot_id}"
            )
            if backup_metadata:
                backup_id = backup_metadata.id
        
        # Create snapshot
        snapshot = UpdateSnapshot(
            id=snapshot_id,
            timestamp=datetime.now(),
            update_type=update_type,
            description=description,
            old_version=old_version,
            new_version=new_version,
            backup_id=backup_id
        )
        
        # Take file snapshots
        self._take_snapshot(snapshot)
        
        # Save snapshot
        self._save_snapshot(snapshot)
        
        # Create history entry
        self.history[snapshot_id] = UpdateHistory(
            snapshot_id=snapshot_id,
            status=UpdateStatus.IN_PROGRESS,
            start_time=datetime.now()
        )
        self._save_history()
        
        # Set as active update
        self.active_update = snapshot
        
        return snapshot
    
    def _take_snapshot(self, snapshot: UpdateSnapshot):
        """Take snapshot of current state"""
        snapshot_data_dir = self.snapshot_dir / snapshot.id
        snapshot_data_dir.mkdir(exist_ok=True)
        
        # Collect file states
        for monitored_path in self.config.monitored_paths:
            path = Path(monitored_path)
            if not path.exists():
                continue
            
            if path.is_file():
                self._snapshot_file(path, snapshot, snapshot_data_dir)
            else:
                for file_path in path.rglob("*"):
                    if file_path.is_file():
                        self._snapshot_file(file_path, snapshot, snapshot_data_dir)
    
    def _snapshot_file(self, file_path: Path, snapshot: UpdateSnapshot, snapshot_dir: Path):
        """Snapshot individual file"""
        try:
            # Calculate checksum
            checksum = self._calculate_checksum(file_path)
            rel_path = str(file_path.relative_to('.'))
            snapshot.checksums[rel_path] = checksum
            
            # Store file metadata
            metadata = {
                'path': rel_path,
                'size': file_path.stat().st_size,
                'mtime': file_path.stat().st_mtime,
                'checksum': checksum
            }
            
            metadata_file = snapshot_dir / f"{checksum}.meta"
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f)
            
            # For small files, store copy
            if file_path.stat().st_size < 1024 * 1024:  # 1MB
                copy_path = snapshot_dir / f"{checksum}.data"
                shutil.copy2(file_path, copy_path)
                
        except Exception as e:
            self.logger.error(f"Failed to snapshot {file_path}: {e}")
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate file checksum"""
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        
        return sha256_hash.hexdigest()
    
    def _save_snapshot(self, snapshot: UpdateSnapshot):
        """Save snapshot metadata"""
        snapshot_file = self.snapshot_dir / f"{snapshot.id}.json"
        
        data = {
            'id': snapshot.id,
            'timestamp': snapshot.timestamp.isoformat(),
            'update_type': snapshot.update_type.value,
            'description': snapshot.description,
            'old_version': snapshot.old_version,
            'new_version': snapshot.new_version,
            'modified_files': snapshot.modified_files,
            'new_files': snapshot.new_files,
            'deleted_files': snapshot.deleted_files,
            'backup_id': snapshot.backup_id,
            'checksums': snapshot.checksums,
            'rollback_data': snapshot.rollback_data
        }
        
        with open(snapshot_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _load_snapshot(self, snapshot_id: str) -> Optional[UpdateSnapshot]:
        """Load snapshot from disk"""
        snapshot_file = self.snapshot_dir / f"{snapshot_id}.json"
        
        if not snapshot_file.exists():
            return None
        
        try:
            with open(snapshot_file, 'r') as f:
                data = json.load(f)
            
            return UpdateSnapshot(
                id=data['id'],
                timestamp=datetime.fromisoformat(data['timestamp']),
                update_type=UpdateType(data['update_type']),
                description=data['description'],
                old_version=data['old_version'],
                new_version=data['new_version'],
                modified_files=data['modified_files'],
                new_files=data['new_files'],
                deleted_files=data['deleted_files'],
                backup_id=data['backup_id'],
                checksums=data['checksums'],
                rollback_data=data['rollback_data']
            )
        except Exception as e:
            self.logger.error(f"Failed to load snapshot {snapshot_id}: {e}")
            return None
    
    def complete_update(self, success: bool = True, error: Optional[str] = None):
        """Mark update as complete"""
        if not self.active_update:
            self.logger.warning("No active update to complete")
            return
        
        snapshot_id = self.active_update.id
        
        if snapshot_id in self.history:
            self.history[snapshot_id].status = UpdateStatus.COMPLETED if success else UpdateStatus.FAILED
            self.history[snapshot_id].end_time = datetime.now()
            if error:
                self.history[snapshot_id].error = error
            self._save_history()
        
        # Detect changes
        if success:
            self._detect_changes(self.active_update)
            self._save_snapshot(self.active_update)
        
        self.active_update = None
        
        self.logger.info(f"Update {snapshot_id} completed: {'success' if success else 'failed'}")
    
    def _detect_changes(self, snapshot: UpdateSnapshot):
        """Detect what files changed during update"""
        for monitored_path in self.config.monitored_paths:
            path = Path(monitored_path)
            if not path.exists():
                continue
            
            current_files = set()
            if path.is_file():
                current_files.add(str(path.relative_to('.')))
            else:
                for file_path in path.rglob("*"):
                    if file_path.is_file():
                        current_files.add(str(file_path.relative_to('.')))
            
            # Check for changes
            for file_path in current_files:
                path = Path(file_path)
                if path.exists():
                    current_checksum = self._calculate_checksum(path)
                    
                    if file_path in snapshot.checksums:
                        if current_checksum != snapshot.checksums[file_path]:
                            snapshot.modified_files.append(file_path)
                    else:
                        snapshot.new_files.append(file_path)
            
            # Check for deleted files
            for file_path in snapshot.checksums:
                if not Path(file_path).exists():
                    snapshot.deleted_files.append(file_path)
    
    def rollback(self, snapshot_id: str, force: bool = False) -> bool:
        """Rollback to a previous state"""
        # Load snapshot
        snapshot = self._load_snapshot(snapshot_id)
        if not snapshot:
            self.logger.error(f"Snapshot not found: {snapshot_id}")
            return False
        
        # Check if rollback is needed
        history = self.history.get(snapshot_id)
        if not history or history.status not in [UpdateStatus.FAILED, UpdateStatus.COMPLETED]:
            if not force:
                self.logger.warning(f"Update {snapshot_id} doesn't need rollback")
                return False
        
        self.logger.info(f"Starting rollback for {snapshot_id}")
        
        # Confirm if required
        if self.config.confirm_rollback and not force:
            print(f"\nRollback will restore system to state before update:")
            print(f"  Update: {snapshot.description}")
            print(f"  Version: {snapshot.new_version} -> {snapshot.old_version}")
            print(f"  Time: {snapshot.timestamp}")
            
            response = input("\nProceed with rollback? [y/N]: ")
            if response.lower() != 'y':
                self.logger.info("Rollback cancelled by user")
                return False
        
        # Perform rollback
        success = False
        
        try:
            if self.config.dry_run_rollback:
                self.logger.info("DRY RUN - Rollback would perform:")
                self._print_rollback_plan(snapshot)
                success = True
            else:
                success = self._perform_rollback(snapshot)
            
            if success:
                # Update history
                if history:
                    history.status = UpdateStatus.ROLLED_BACK
                    history.rollback_performed = True
                    history.rollback_time = datetime.now()
                    self._save_history()
                
                self.logger.info(f"Rollback completed successfully")
            else:
                self.logger.error("Rollback failed")
                
        except Exception as e:
            self.logger.error(f"Rollback error: {e}")
            success = False
        
        return success
    
    def _print_rollback_plan(self, snapshot: UpdateSnapshot):
        """Print what rollback would do"""
        print(f"\nFiles to restore ({len(snapshot.modified_files)}):")
        for file in snapshot.modified_files[:10]:
            print(f"  - {file}")
        if len(snapshot.modified_files) > 10:
            print(f"  ... and {len(snapshot.modified_files) - 10} more")
        
        print(f"\nFiles to delete ({len(snapshot.new_files)}):")
        for file in snapshot.new_files[:10]:
            print(f"  - {file}")
        if len(snapshot.new_files) > 10:
            print(f"  ... and {len(snapshot.new_files) - 10} more")
        
        print(f"\nFiles to restore from backup ({len(snapshot.deleted_files)}):")
        for file in snapshot.deleted_files[:10]:
            print(f"  - {file}")
        if len(snapshot.deleted_files) > 10:
            print(f"  ... and {len(snapshot.deleted_files) - 10} more")
    
    def _perform_rollback(self, snapshot: UpdateSnapshot) -> bool:
        """Perform actual rollback"""
        errors = []
        
        # Use backup system if available
        if snapshot.backup_id and self.backup_manager:
            self.logger.info(f"Restoring from backup {snapshot.backup_id}")
            
            # Create temporary restore directory
            with tempfile.TemporaryDirectory() as temp_dir:
                if self.backup_manager.restore_backup(snapshot.backup_id, temp_dir):
                    # Restore specific files
                    for file_path in snapshot.modified_files + snapshot.deleted_files:
                        src = Path(temp_dir) / file_path
                        dst = Path(file_path)
                        
                        if src.exists():
                            try:
                                dst.parent.mkdir(parents=True, exist_ok=True)
                                shutil.copy2(src, dst)
                                self.logger.debug(f"Restored {file_path}")
                            except Exception as e:
                                errors.append(f"Failed to restore {file_path}: {e}")
                else:
                    errors.append("Backup restore failed")
        
        else:
            # Manual rollback using snapshots
            snapshot_data_dir = self.snapshot_dir / snapshot.id
            
            # Restore modified files
            for file_path in snapshot.modified_files:
                checksum = snapshot.checksums.get(file_path)
                if checksum:
                    copy_path = snapshot_data_dir / f"{checksum}.data"
                    if copy_path.exists():
                        try:
                            dst = Path(file_path)
                            dst.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(copy_path, dst)
                            self.logger.debug(f"Restored {file_path}")
                        except Exception as e:
                            errors.append(f"Failed to restore {file_path}: {e}")
        
        # Delete new files
        for file_path in snapshot.new_files:
            try:
                Path(file_path).unlink()
                self.logger.debug(f"Deleted {file_path}")
            except Exception as e:
                errors.append(f"Failed to delete {file_path}: {e}")
        
        # Run update-specific rollback procedures
        if snapshot.update_type == UpdateType.DEPENDENCIES:
            self._rollback_dependencies(snapshot)
        elif snapshot.update_type == UpdateType.CUSTOM_NODES:
            self._rollback_custom_nodes(snapshot)
        
        # Verify rollback if configured
        if self.config.verify_rollback:
            verification_errors = self._verify_rollback(snapshot)
            errors.extend(verification_errors)
        
        if errors:
            self.logger.error(f"Rollback completed with {len(errors)} errors:")
            for error in errors[:10]:
                self.logger.error(f"  - {error}")
            return False
        
        return True
    
    def _rollback_dependencies(self, snapshot: UpdateSnapshot):
        """Rollback dependency updates"""
        self.logger.info("Rolling back dependencies...")
        
        # Restore requirements files
        req_files = ['requirements.txt', 'package.json', 'package-lock.json']
        
        for req_file in req_files:
            if req_file in snapshot.modified_files:
                self.logger.info(f"Restoring {req_file}")
        
        # Re-install dependencies
        try:
            if Path('requirements.txt').exists():
                subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], 
                             check=True, capture_output=True)
            
            if Path('package.json').exists():
                subprocess.run(['npm', 'install'], check=True, capture_output=True)
                
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to reinstall dependencies: {e}")
    
    def _rollback_custom_nodes(self, snapshot: UpdateSnapshot):
        """Rollback custom node updates"""
        self.logger.info("Rolling back custom nodes...")
        
        # Custom node specific rollback logic
        custom_nodes_dir = Path("./ComfyUI/custom_nodes")
        
        # Remove any new custom nodes
        for file_path in snapshot.new_files:
            if file_path.startswith("ComfyUI/custom_nodes/"):
                node_dir = Path(file_path).parent
                if node_dir.exists() and node_dir != custom_nodes_dir:
                    try:
                        shutil.rmtree(node_dir)
                        self.logger.info(f"Removed custom node: {node_dir.name}")
                    except Exception as e:
                        self.logger.error(f"Failed to remove {node_dir}: {e}")
    
    def _verify_rollback(self, snapshot: UpdateSnapshot) -> List[str]:
        """Verify rollback was successful"""
        errors = []
        
        if self.config.checksum_verification:
            # Verify file checksums
            for file_path, expected_checksum in snapshot.checksums.items():
                path = Path(file_path)
                
                # Skip new files (should be deleted)
                if file_path in snapshot.new_files:
                    if path.exists():
                        errors.append(f"File should be deleted: {file_path}")
                    continue
                
                # Check modified/deleted files (should be restored)
                if file_path in snapshot.modified_files or file_path in snapshot.deleted_files:
                    if not path.exists():
                        errors.append(f"File not restored: {file_path}")
                    else:
                        actual_checksum = self._calculate_checksum(path)
                        if actual_checksum != expected_checksum:
                            errors.append(f"Checksum mismatch: {file_path}")
        
        return errors
    
    def list_snapshots(self) -> List[Tuple[UpdateSnapshot, UpdateHistory]]:
        """List all available snapshots"""
        snapshots = []
        
        for snapshot_id, history in self.history.items():
            snapshot = self._load_snapshot(snapshot_id)
            if snapshot:
                snapshots.append((snapshot, history))
        
        # Sort by timestamp
        snapshots.sort(key=lambda x: x[0].timestamp, reverse=True)
        
        return snapshots
    
    def cleanup_old_snapshots(self, keep_count: Optional[int] = None):
        """Clean up old snapshots"""
        keep_count = keep_count or self.config.max_snapshots
        
        snapshots = self.list_snapshots()
        
        if len(snapshots) <= keep_count:
            return
        
        # Keep recent snapshots
        to_delete = snapshots[keep_count:]
        
        for snapshot, history in to_delete:
            # Don't delete failed updates that haven't been rolled back
            if history.status == UpdateStatus.FAILED and not history.rollback_performed:
                continue
            
            self._delete_snapshot(snapshot.id)
    
    def _delete_snapshot(self, snapshot_id: str):
        """Delete a snapshot"""
        try:
            # Delete snapshot file
            snapshot_file = self.snapshot_dir / f"{snapshot_id}.json"
            if snapshot_file.exists():
                snapshot_file.unlink()
            
            # Delete snapshot data directory
            snapshot_data_dir = self.snapshot_dir / snapshot_id
            if snapshot_data_dir.exists():
                shutil.rmtree(snapshot_data_dir)
            
            # Remove from history
            if snapshot_id in self.history:
                del self.history[snapshot_id]
                self._save_history()
            
            self.logger.info(f"Deleted snapshot: {snapshot_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to delete snapshot {snapshot_id}: {e}")

# Helper functions
def create_rollback_manager(config: Optional[RollbackConfig] = None) -> RollbackManager:
    """Create and configure rollback manager"""
    return RollbackManager(config)

def track_update(update_type: UpdateType, old_version: str, new_version: str, 
                description: str = "") -> UpdateSnapshot:
    """Start tracking an update"""
    manager = create_rollback_manager()
    return manager.begin_update(update_type, old_version, new_version, description)

def complete_update(success: bool = True, error: Optional[str] = None):
    """Complete the current update"""
    manager = create_rollback_manager()
    manager.complete_update(success, error)

def rollback_update(snapshot_id: str, force: bool = False) -> bool:
    """Rollback a specific update"""
    manager = create_rollback_manager()
    return manager.rollback(snapshot_id, force)

if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    
    # Create rollback manager
    config = RollbackConfig(
        monitored_paths=["./test_update"],
        snapshot_dir="./test_rollback",
        dry_run_rollback=False
    )
    
    manager = RollbackManager(config)
    
    # Create test directory
    test_dir = Path("./test_update")
    test_dir.mkdir(exist_ok=True)
    
    # Create initial files
    (test_dir / "config.json").write_text('{"version": "1.0.0"}')
    (test_dir / "data.txt").write_text("Original data")
    
    print("Initial state created")
    
    # Start tracking update
    print("\nStarting update tracking...")
    snapshot = manager.begin_update(
        UpdateType.CONFIG,
        old_version="1.0.0",
        new_version="1.1.0",
        description="Test configuration update"
    )
    
    # Simulate update
    print("Simulating update...")
    (test_dir / "config.json").write_text('{"version": "1.1.0", "new_feature": true}')
    (test_dir / "data.txt").write_text("Modified data")
    (test_dir / "new_file.txt").write_text("New file added")
    
    # Complete update
    manager.complete_update(success=True)
    
    print("\nUpdate completed. Current files:")
    for file in test_dir.iterdir():
        print(f"  - {file.name}: {file.read_text()[:50]}")
    
    # List snapshots
    print("\nAvailable snapshots:")
    for snapshot, history in manager.list_snapshots():
        print(f"  - {snapshot.id}: {history.status.value}")
    
    # Perform rollback
    print("\nPerforming rollback...")
    if manager.rollback(snapshot.id, force=True):
        print("Rollback successful!")
        
        print("\nFiles after rollback:")
        for file in test_dir.iterdir():
            print(f"  - {file.name}: {file.read_text()[:50]}")
    else:
        print("Rollback failed!")
    
    # Cleanup
    shutil.rmtree(test_dir, ignore_errors=True)
    shutil.rmtree("./test_rollback", ignore_errors=True)