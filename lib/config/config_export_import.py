"""
DinoAir Configuration Export/Import Manager
Provides functionality to export, import, backup and restore configurations
"""

import os
import json
import yaml
import shutil
from typing import Any, Dict, List, Optional, Union, Set
from pathlib import Path
from datetime import datetime, timezone
from dataclasses import asdict, fields, is_dataclass
from enum import Enum
import tempfile
import hashlib

from .config_validator import (
    DinoAirConfig, ConfigValidator, ConfigLoader, ConfigError,
    ServerConfig, DatabaseConfig, SecurityConfig, ComfyUIConfig, 
    OllamaConfig, ResourceLimitsConfig, LoggingConfig, MonitoringConfig
)


class ExportFormat(Enum):
    """Supported export formats"""
    JSON = "json"
    YAML = "yaml"


class ConfigSection(Enum):
    """Configuration sections available for selective export/import"""
    ALL = "all"
    SERVER = "server"
    DATABASE = "database" 
    SECURITY = "security"
    COMFYUI = "comfyui"
    OLLAMA = "ollama"
    RESOURCES = "resources"
    LOGGING = "logging"
    MONITORING = "monitoring"


class ConfigExportError(Exception):
    """Configuration export error"""
    pass


class ConfigImportError(Exception):
    """Configuration import error"""
    pass


class ConfigBackupError(Exception):
    """Configuration backup error"""
    pass


class ConfigVersionInfo:
    """Configuration version information"""
    
    def __init__(self, version: str = "1.0.0", created_at: Optional[datetime] = None, 
                 source: str = "DinoAir", description: str = ""):
        self.version = version
        self.created_at = created_at or datetime.now(timezone.utc)
        self.source = source
        self.description = description
        self.schema_version = "1.0.0"  # Config schema version
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "created_at": self.created_at.isoformat(),
            "source": self.source,
            "description": self.description,
            "schema_version": self.schema_version
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConfigVersionInfo':
        created_at = datetime.fromisoformat(data.get("created_at", datetime.now(timezone.utc).isoformat()))
        return cls(
            version=data.get("version", "1.0.0"),
            created_at=created_at,
            source=data.get("source", "DinoAir"),
            description=data.get("description", "")
        )


class ConfigExportImportManager:
    """Manages configuration export, import, backup and restore operations"""
    
    def __init__(self, config_dir: str = "./config", backup_dir: str = "./config/backups"):
        self.config_dir = Path(config_dir)
        self.backup_dir = Path(backup_dir)
        self.validator = ConfigValidator()
        self.loader = ConfigLoader(self.validator)
        
        # Ensure directories exist
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def export_config(self, 
                     config: DinoAirConfig,
                     output_path: str,
                     format: ExportFormat = ExportFormat.YAML,
                     sections: Optional[List[ConfigSection]] = None,
                     include_metadata: bool = True,
                     as_template: bool = False) -> str:
        """
        Export configuration to file
        
        Args:
            config: Configuration to export
            output_path: Output file path
            format: Export format (JSON or YAML)
            sections: Specific sections to export (None for all)
            include_metadata: Include version and metadata
            as_template: Export as template (remove sensitive data)
            
        Returns:
            Path to exported file
        """
        try:
            # Convert config to dict
            config_dict = self._config_to_dict(config, sections)
            
            # Remove sensitive data if exporting as template
            if as_template:
                config_dict = self._sanitize_for_template(config_dict)
            
            # Add metadata if requested
            if include_metadata:
                version_info = ConfigVersionInfo(
                    version=getattr(config, 'version', '1.0.0'),
                    description=f"DinoAir configuration export ({'template' if as_template else 'full'})"
                )
                
                export_data = {
                    "_metadata": version_info.to_dict(),
                    "config": config_dict
                }
            else:
                export_data = config_dict
            
            # Write to file
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w') as f:
                if format == ExportFormat.JSON:
                    json.dump(export_data, f, indent=2, default=str)
                else:  # YAML
                    yaml.dump(export_data, f, default_flow_style=False, indent=2)
            
            return str(output_path)
            
        except Exception as e:
            raise ConfigExportError(f"Failed to export configuration: {e}")
    
    def import_config(self,
                     import_path: str,
                     target_config_path: Optional[str] = None,
                     sections: Optional[List[ConfigSection]] = None,
                     validate: bool = True,
                     backup_existing: bool = True,
                     merge_mode: bool = False) -> DinoAirConfig:
        """
        Import configuration from file
        
        Args:
            import_path: Path to configuration file to import
            target_config_path: Target config file to write to (optional)
            sections: Specific sections to import (None for all)
            validate: Validate imported configuration
            backup_existing: Create backup of existing config before import
            merge_mode: Merge with existing config instead of replacing
            
        Returns:
            Imported and validated configuration
        """
        try:
            import_path = Path(import_path)
            if not import_path.exists():
                raise ConfigImportError(f"Import file not found: {import_path}")
            
            # Load import data
            with open(import_path, 'r') as f:
                if import_path.suffix.lower() == '.json':
                    import_data = json.load(f)
                else:  # YAML
                    import_data = yaml.safe_load(f)
            
            # Extract config data and metadata
            if "_metadata" in import_data:
                metadata = ConfigVersionInfo.from_dict(import_data["_metadata"])
                config_data = import_data["config"]
            else:
                metadata = None
                config_data = import_data
            
            # Filter sections if specified
            if sections and ConfigSection.ALL not in sections:
                config_data = self._filter_sections(config_data, sections)
            
            # Handle merge mode
            if merge_mode and target_config_path:
                existing_config = self._load_existing_config(target_config_path)
                if existing_config:
                    existing_dict = self._config_to_dict(existing_config)
                    config_data = self._deep_merge(existing_dict, config_data)
            
            # Validate if requested
            if validate:
                validated_config = self.validator.validate(config_data)
            else:
                # Create config without full validation
                validated_config = self._dict_to_config(config_data)
            
            # Backup existing config if requested
            if backup_existing and target_config_path and Path(target_config_path).exists():
                self.backup_config(target_config_path)
            
            # Write to target if specified
            if target_config_path:
                self._write_config_file(validated_config, target_config_path)
            
            return validated_config
            
        except Exception as e:
            raise ConfigImportError(f"Failed to import configuration: {e}")
    
    def backup_config(self, config_path: str, backup_name: Optional[str] = None) -> str:
        """
        Create backup of configuration file
        
        Args:
            config_path: Path to config file to backup
            backup_name: Custom backup name (auto-generated if None)
            
        Returns:
            Path to backup file
        """
        try:
            config_path = Path(config_path)
            if not config_path.exists():
                raise ConfigBackupError(f"Config file not found: {config_path}")
            
            # Generate backup name
            if backup_name is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_name = f"{config_path.stem}_backup_{timestamp}{config_path.suffix}"
            
            backup_path = self.backup_dir / backup_name
            
            # Copy file
            shutil.copy2(config_path, backup_path)
            
            return str(backup_path)
            
        except Exception as e:
            raise ConfigBackupError(f"Failed to backup configuration: {e}")
    
    def restore_config(self, backup_path: str, target_path: str) -> None:
        """
        Restore configuration from backup
        
        Args:
            backup_path: Path to backup file
            target_path: Target config file path
        """
        try:
            backup_path = Path(backup_path)
            target_path = Path(target_path)
            
            if not backup_path.exists():
                raise ConfigBackupError(f"Backup file not found: {backup_path}")
            
            # Create backup of current file before restore
            if target_path.exists():
                current_backup = self.backup_config(str(target_path), 
                                                  f"{target_path.stem}_pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}{target_path.suffix}")
                print(f"Current config backed up to: {current_backup}")
            
            # Restore from backup
            shutil.copy2(backup_path, target_path)
            
        except Exception as e:
            raise ConfigBackupError(f"Failed to restore configuration: {e}")
    
    def list_backups(self) -> List[Dict[str, Any]]:
        """
        List available backup files
        
        Returns:
            List of backup file information
        """
        backups = []
        
        for backup_file in self.backup_dir.glob("*_backup_*"):
            if backup_file.is_file():
                stat = backup_file.stat()
                backups.append({
                    "name": backup_file.name,
                    "path": str(backup_file),
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime),
                    "modified": datetime.fromtimestamp(stat.st_mtime)
                })
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x["created"], reverse=True)
        
        return backups
    
    def create_template(self, 
                       config: DinoAirConfig,
                       template_path: str,
                       name: str,
                       description: str = "",
                       sections: Optional[List[ConfigSection]] = None) -> str:
        """
        Create configuration template
        
        Args:
            config: Configuration to template
            template_path: Path for template file
            name: Template name
            description: Template description
            sections: Sections to include in template
            
        Returns:
            Path to template file
        """
        try:
            # Export as template (sanitized)
            template_path = self.export_config(
                config=config,
                output_path=template_path,
                format=ExportFormat.YAML,
                sections=sections,
                include_metadata=True,
                as_template=True
            )
            
            # Add template-specific metadata
            with open(template_path, 'r') as f:
                template_data = yaml.safe_load(f)
            
            if "_metadata" in template_data:
                template_data["_metadata"]["template_name"] = name
                template_data["_metadata"]["template_description"] = description
                template_data["_metadata"]["is_template"] = True
            
            with open(template_path, 'w') as f:
                yaml.dump(template_data, f, default_flow_style=False, indent=2)
            
            return template_path
            
        except Exception as e:
            raise ConfigExportError(f"Failed to create template: {e}")
    
    def validate_config_file(self, config_path: str) -> Dict[str, Any]:
        """
        Validate configuration file and return validation results
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Validation results
        """
        try:
            config_path = Path(config_path)
            if not config_path.exists():
                return {
                    "valid": False,
                    "errors": [f"Configuration file not found: {config_path}"],
                    "warnings": []
                }
            
            # Load config data
            with open(config_path, 'r') as f:
                if config_path.suffix.lower() == '.json':
                    config_data = json.load(f)
                else:
                    config_data = yaml.safe_load(f)
            
            # Extract config if wrapped in metadata
            if "_metadata" in config_data:
                config_data = config_data["config"]
            
            # Validate
            try:
                self.validator.validate(config_data)
                return {
                    "valid": True,
                    "errors": [],
                    "warnings": self.validator.warnings
                }
            except ConfigError as e:
                return {
                    "valid": False,
                    "errors": [str(e)],
                    "warnings": self.validator.warnings
                }
                
        except Exception as e:
            return {
                "valid": False,
                "errors": [f"Failed to validate config: {e}"],
                "warnings": []
            }
    
    def get_config_diff(self, config1_path: str, config2_path: str) -> Dict[str, Any]:
        """
        Compare two configuration files and return differences
        
        Args:
            config1_path: Path to first config file
            config2_path: Path to second config file
            
        Returns:
            Dictionary containing differences
        """
        try:
            # Load both configs
            config1 = self._load_config_data(config1_path)
            config2 = self._load_config_data(config2_path)
            
            # Compare
            differences = self._compare_configs(config1, config2)
            
            return {
                "identical": len(differences) == 0,
                "differences": differences
            }
            
        except Exception as e:
            return {
                "identical": False,
                "error": f"Failed to compare configs: {e}"
            }
    
    # Private helper methods
    
    def _config_to_dict(self, config: DinoAirConfig, sections: Optional[List[ConfigSection]] = None) -> Dict[str, Any]:
        """Convert config object to dictionary"""
        config_dict = asdict(config)
        
        # Clean up the dictionary to handle dataclass artifacts
        config_dict = self._clean_config_dict(config_dict)
        
        if sections and ConfigSection.ALL not in sections:
            filtered_dict = {}
            for section in sections:
                if section == ConfigSection.SERVER and 'server' in config_dict:
                    filtered_dict['server'] = config_dict['server']
                elif section == ConfigSection.DATABASE and 'database' in config_dict:
                    filtered_dict['database'] = config_dict['database']
                elif section == ConfigSection.SECURITY and 'security' in config_dict:
                    filtered_dict['security'] = config_dict['security']
                elif section == ConfigSection.COMFYUI and 'comfyui' in config_dict:
                    filtered_dict['comfyui'] = config_dict['comfyui']
                elif section == ConfigSection.OLLAMA and 'ollama' in config_dict:
                    filtered_dict['ollama'] = config_dict['ollama']
                elif section == ConfigSection.RESOURCES and 'resources' in config_dict:
                    filtered_dict['resources'] = config_dict['resources']
                elif section == ConfigSection.LOGGING and 'logging' in config_dict:
                    filtered_dict['logging'] = config_dict['logging']
                elif section == ConfigSection.MONITORING and 'monitoring' in config_dict:
                    filtered_dict['monitoring'] = config_dict['monitoring']
            return filtered_dict
        
        return config_dict
    
    def _dict_to_config(self, config_dict: Dict[str, Any]) -> DinoAirConfig:
        """Convert dictionary to config object (basic conversion without validation)"""
        # Create config with defaults and update with provided values
        config = DinoAirConfig()
        
        for key, value in config_dict.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        return config
    
    def _sanitize_for_template(self, config_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive data for template export"""
        sensitive_fields = [
            'secret_key', 'password', 'api_key', 'token', 'private_key', 
            'ssl_key', 'jwt_secret', 'auth_token'
        ]
        
        def sanitize_recursive(data):
            if isinstance(data, dict):
                sanitized = {}
                for key, value in data.items():
                    if any(sensitive in key.lower() for sensitive in sensitive_fields):
                        # Replace with placeholder
                        sanitized[key] = "${" + key.upper() + "}"
                    else:
                        sanitized[key] = sanitize_recursive(value)
                return sanitized
            elif isinstance(data, list):
                return [sanitize_recursive(item) for item in data]
            else:
                return data
        
        return sanitize_recursive(config_dict)
    
    def _filter_sections(self, config_data: Dict[str, Any], sections: List[ConfigSection]) -> Dict[str, Any]:
        """Filter configuration data to include only specified sections"""
        filtered = {}
        
        for section in sections:
            section_name = section.value
            if section_name != 'all' and section_name in config_data:
                filtered[section_name] = config_data[section_name]
        
        return filtered
    
    def _load_existing_config(self, config_path: str) -> Optional[DinoAirConfig]:
        """Load existing configuration file"""
        try:
            return self.loader.load([config_path])
        except:
            return None
    
    def _deep_merge(self, base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge two dictionaries"""
        result = base.copy()
        
        for key, value in update.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    def _write_config_file(self, config: DinoAirConfig, file_path: str) -> None:
        """Write configuration to file"""
        config_dict = self._config_to_dict(config)
        file_path = Path(file_path)
        
        with open(file_path, 'w') as f:
            if file_path.suffix.lower() == '.json':
                json.dump(config_dict, f, indent=2, default=str)
            else:  # YAML
                yaml.dump(config_dict, f, default_flow_style=False, indent=2)
    
    def _load_config_data(self, config_path: str) -> Dict[str, Any]:
        """Load configuration data from file"""
        with open(config_path, 'r') as f:
            if Path(config_path).suffix.lower() == '.json':
                data = json.load(f)
            else:
                data = yaml.safe_load(f)
        
        # Extract config data if wrapped in metadata
        if "_metadata" in data:
            return data["config"]
        return data
    
    def _compare_configs(self, config1: Dict[str, Any], config2: Dict[str, Any], path: str = "") -> List[Dict[str, Any]]:
        """Compare two configuration dictionaries recursively"""
        differences = []
        
        # Check keys in config1
        for key in config1:
            current_path = f"{path}.{key}" if path else key
            
            if key not in config2:
                differences.append({
                    "type": "missing_in_config2",
                    "path": current_path,
                    "value": config1[key]
                })
            elif isinstance(config1[key], dict) and isinstance(config2[key], dict):
                # Recursive comparison for nested dicts
                differences.extend(self._compare_configs(config1[key], config2[key], current_path))
            elif config1[key] != config2[key]:
                differences.append({
                    "type": "different_value",
                    "path": current_path,
                    "value1": config1[key],
                    "value2": config2[key]
                })
        
        # Check keys only in config2
        for key in config2:
            if key not in config1:
                current_path = f"{path}.{key}" if path else key
                differences.append({
                    "type": "missing_in_config1",
                    "path": current_path,
                    "value": config2[key]
                })
        
        return differences
    
    def _clean_config_dict(self, config_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Clean config dictionary to remove dataclass artifacts and handle missing values"""
        def clean_value(value):
            if hasattr(value, '__class__') and 'dataclasses._MISSING_TYPE' in str(type(value)):
                # Replace _MISSING_TYPE with appropriate default
                return None
            elif isinstance(value, dict):
                return {k: clean_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [clean_value(item) for item in value if not (hasattr(item, '__class__') and 'dataclasses._MISSING_TYPE' in str(type(item)))]
            else:
                return value
        
        return clean_value(config_dict)


# Utility functions for easy access

def export_config(config: DinoAirConfig, output_path: str, **kwargs) -> str:
    """Quick export configuration to file"""
    manager = ConfigExportImportManager()
    return manager.export_config(config, output_path, **kwargs)


def import_config(import_path: str, **kwargs) -> DinoAirConfig:
    """Quick import configuration from file"""
    manager = ConfigExportImportManager()
    return manager.import_config(import_path, **kwargs)


def backup_config(config_path: str, **kwargs) -> str:
    """Quick backup configuration file"""
    manager = ConfigExportImportManager()
    return manager.backup_config(config_path, **kwargs)


def validate_config_file(config_path: str) -> Dict[str, Any]:
    """Quick validate configuration file"""
    manager = ConfigExportImportManager()
    return manager.validate_config_file(config_path)