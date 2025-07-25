"""
DinoAir Configuration Hot-Reloading Module
Provides live configuration updates without service restart
"""

import os
import time
import threading
import logging
from typing import Dict, Any, Optional, Callable, List
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime
import hashlib
import json
import yaml
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from .config_validator import ConfigValidator, DinoAirConfig
from .secrets_manager import secrets_manager

logger = logging.getLogger(__name__)

@dataclass
class ConfigChange:
    """Represents a configuration change"""
    timestamp: datetime
    file_path: str
    old_config: Dict[str, Any]
    new_config: Dict[str, Any]
    changes: Dict[str, Any]

class ConfigChangeHandler(FileSystemEventHandler):
    """File system event handler for configuration changes"""
    
    def __init__(self, hot_reloader: 'ConfigHotReloader'):
        self.hot_reloader = hot_reloader
    
    def on_modified(self, event):
        """Handle file modification events"""
        if event.is_directory:
            return
        
        file_path = Path(event.src_path)
        if file_path.suffix in ['.yaml', '.yml', '.json'] and file_path.name.startswith('config'):
            logger.info(f"Configuration file changed: {file_path}")
            self.hot_reloader._handle_file_change(str(file_path))

class ConfigHotReloader:
    """Handles hot-reloading of configuration files"""
    
    def __init__(self, 
                 config_paths: List[str],
                 reload_delay: float = 1.0,
                 validation_enabled: bool = True):
        self.config_paths = config_paths
        self.reload_delay = reload_delay
        self.validation_enabled = validation_enabled
        
        self.current_config: Optional[DinoAirConfig] = None
        self.file_checksums: Dict[str, str] = {}
        self.observers: List[Observer] = []
        self.reload_callbacks: List[Callable[[DinoAirConfig, ConfigChange], None]] = []
        self.validator = ConfigValidator() if validation_enabled else None
        
        self._lock = threading.Lock()
        self._reload_timer: Optional[threading.Timer] = None
        self._is_running = False
        
        # Initialize file checksums
        self._update_checksums()
    
    def start(self):
        """Start the hot-reloader"""
        if self._is_running:
            return
        
        logger.info("Starting configuration hot-reloader")
        self._is_running = True
        
        # Set up file watchers
        for config_path in self.config_paths:
            if os.path.exists(config_path):
                self._setup_watcher(config_path)
        
        logger.info(f"Hot-reloader monitoring {len(self.observers)} paths")
    
    def stop(self):
        """Stop the hot-reloader"""
        if not self._is_running:
            return
        
        logger.info("Stopping configuration hot-reloader")
        self._is_running = False
        
        # Stop all observers
        for observer in self.observers:
            observer.stop()
            observer.join()
        
        self.observers.clear()
        
        # Cancel pending reload
        if self._reload_timer:
            self._reload_timer.cancel()
    
    def _setup_watcher(self, config_path: str):
        """Set up file watcher for a configuration path"""
        path = Path(config_path)
        
        if path.is_file():
            watch_dir = path.parent
        else:
            watch_dir = path
        
        observer = Observer()
        observer.schedule(
            ConfigChangeHandler(self),
            str(watch_dir),
            recursive=True
        )
        observer.start()
        self.observers.append(observer)
        
        logger.debug(f"Watching directory: {watch_dir}")
    
    def _handle_file_change(self, file_path: str):
        """Handle file change event"""
        if not self._is_running:
            return
        
        with self._lock:
            # Cancel existing timer
            if self._reload_timer:
                self._reload_timer.cancel()
            
            # Set new timer to debounce rapid changes
            self._reload_timer = threading.Timer(
                self.reload_delay,
                self._reload_config
            )
            self._reload_timer.start()
    
    def _reload_config(self):
        """Reload configuration from files"""
        try:
            logger.info("Reloading configuration...")
            
            # Check if files actually changed
            if not self._files_changed():
                logger.debug("No actual file changes detected, skipping reload")
                return
            
            # Load new configuration
            new_config_data = self._load_config_data()
            
            # Resolve secrets
            new_config_data = secrets_manager.resolve_config_secrets(new_config_data)
            
            # Validate if enabled
            if self.validator:
                new_config = self.validator.validate(new_config_data)
            else:
                new_config = DinoAirConfig(**new_config_data)
            
            # Calculate changes
            old_config_data = self._config_to_dict(self.current_config) if self.current_config else {}
            changes = self._calculate_changes(old_config_data, new_config_data)
            
            if changes:
                change = ConfigChange(
                    timestamp=datetime.now(),
                    file_path=','.join(self.config_paths),
                    old_config=old_config_data,
                    new_config=new_config_data,
                    changes=changes
                )
                
                # Update current config
                old_config = self.current_config
                self.current_config = new_config
                
                # Update checksums
                self._update_checksums()
                
                # Notify callbacks
                self._notify_callbacks(new_config, change)
                
                logger.info(f"Configuration reloaded successfully. Changes: {list(changes.keys())}")
            else:
                logger.debug("No configuration changes detected")
                
        except Exception as e:
            logger.error(f"Failed to reload configuration: {e}")
    
    def _files_changed(self) -> bool:
        """Check if any configuration files have changed"""
        for config_path in self.config_paths:
            if os.path.exists(config_path):
                current_checksum = self._calculate_file_checksum(config_path)
                if current_checksum != self.file_checksums.get(config_path):
                    return True
        return False
    
    def _update_checksums(self):
        """Update file checksums"""
        for config_path in self.config_paths:
            if os.path.exists(config_path):
                self.file_checksums[config_path] = self._calculate_file_checksum(config_path)
    
    def _calculate_file_checksum(self, file_path: str) -> str:
        """Calculate file checksum"""
        hasher = hashlib.md5()
        try:
            with open(file_path, 'rb') as f:
                hasher.update(f.read())
            return hasher.hexdigest()
        except Exception:
            return ""
    
    def _load_config_data(self) -> Dict[str, Any]:
        """Load configuration data from all files"""
        config_data = {}
        
        for config_path in self.config_paths:
            if os.path.exists(config_path):
                try:
                    file_data = self._load_single_file(config_path)
                    config_data = self._deep_merge(config_data, file_data)
                except Exception as e:
                    logger.error(f"Failed to load config file {config_path}: {e}")
        
        return config_data
    
    def _load_single_file(self, file_path: str) -> Dict[str, Any]:
        """Load configuration from a single file"""
        path = Path(file_path)
        
        with open(path, 'r') as f:
            if path.suffix in ['.yaml', '.yml']:
                return yaml.safe_load(f) or {}
            elif path.suffix == '.json':
                return json.load(f)
            else:
                raise ValueError(f"Unsupported file format: {path.suffix}")
    
    def _deep_merge(self, base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge dictionaries"""
        result = base.copy()
        
        for key, value in update.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def _calculate_changes(self, old_config: Dict[str, Any], new_config: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate changes between configurations"""
        changes = {}
        
        # Check for changes and additions
        for key, new_value in new_config.items():
            old_value = old_config.get(key)
            
            if isinstance(new_value, dict) and isinstance(old_value, dict):
                nested_changes = self._calculate_changes(old_value, new_value)
                if nested_changes:
                    changes[key] = nested_changes
            elif old_value != new_value:
                changes[key] = {
                    'old': old_value,
                    'new': new_value
                }
        
        # Check for deletions
        for key in old_config:
            if key not in new_config:
                changes[key] = {
                    'old': old_config[key],
                    'new': None
                }
        
        return changes
    
    def _config_to_dict(self, config: DinoAirConfig) -> Dict[str, Any]:
        """Convert config object to dictionary"""
        if config is None:
            return {}
        
        # Convert dataclass to dict recursively
        def convert_value(value):
            if hasattr(value, '__dict__'):
                return {k: convert_value(v) for k, v in value.__dict__.items()}
            elif isinstance(value, list):
                return [convert_value(item) for item in value]
            else:
                return value
        
        return convert_value(config)
    
    def _notify_callbacks(self, new_config: DinoAirConfig, change: ConfigChange):
        """Notify all registered callbacks"""
        for callback in self.reload_callbacks:
            try:
                callback(new_config, change)
            except Exception as e:
                logger.error(f"Error in reload callback: {e}")
    
    def add_reload_callback(self, callback: Callable[[DinoAirConfig, ConfigChange], None]):
        """Add a callback to be called when configuration is reloaded"""
        self.reload_callbacks.append(callback)
    
    def remove_reload_callback(self, callback: Callable[[DinoAirConfig, ConfigChange], None]):
        """Remove a reload callback"""
        if callback in self.reload_callbacks:
            self.reload_callbacks.remove(callback)
    
    def force_reload(self):
        """Force a configuration reload"""
        logger.info("Forcing configuration reload")
        self._reload_config()
    
    def get_current_config(self) -> Optional[DinoAirConfig]:
        """Get the current configuration"""
        return self.current_config
    
    def set_current_config(self, config: DinoAirConfig):
        """Set the current configuration"""
        self.current_config = config
        self._update_checksums()

class ConfigManager:
    """Enhanced configuration manager with hot-reloading support"""
    
    def __init__(self, 
                 config_paths: List[str],
                 enable_hot_reload: bool = True,
                 reload_delay: float = 1.0):
        self.config_paths = config_paths
        self.enable_hot_reload = enable_hot_reload
        
        self.current_config: Optional[DinoAirConfig] = None
        self.hot_reloader: Optional[ConfigHotReloader] = None
        
        if enable_hot_reload:
            self.hot_reloader = ConfigHotReloader(
                config_paths=config_paths,
                reload_delay=reload_delay
            )
    
    def load_config(self) -> DinoAirConfig:
        """Load initial configuration"""
        from . import ConfigLoader  # Avoid circular import
        
        loader = ConfigLoader()
        config = loader.load(config_files=self.config_paths)
        
        self.current_config = config
        
        if self.hot_reloader:
            self.hot_reloader.set_current_config(config)
        
        return config
    
    def start_hot_reload(self):
        """Start hot-reloading"""
        if self.hot_reloader and not self.hot_reloader._is_running:
            self.hot_reloader.start()
    
    def stop_hot_reload(self):
        """Stop hot-reloading"""
        if self.hot_reloader and self.hot_reloader._is_running:
            self.hot_reloader.stop()
    
    def add_reload_callback(self, callback: Callable[[DinoAirConfig, ConfigChange], None]):
        """Add a callback for configuration changes"""
        if self.hot_reloader:
            self.hot_reloader.add_reload_callback(callback)
    
    def get_config(self) -> Optional[DinoAirConfig]:
        """Get current configuration"""
        if self.hot_reloader:
            return self.hot_reloader.get_current_config()
        return self.current_config