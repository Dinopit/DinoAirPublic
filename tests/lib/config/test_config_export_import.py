"""
Tests for DinoAir Configuration Export/Import Manager
"""

import os
import json
import yaml
import tempfile
import pytest
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import patch, mock_open

from lib.config.config_export_import import (
    ConfigExportImportManager,
    ExportFormat,
    ConfigSection,
    ConfigVersionInfo,
    ConfigExportError,
    ConfigImportError,
    ConfigBackupError,
    export_config,
    import_config,
    backup_config,
    validate_config_file
)
from lib.config import DinoAirConfig, ServerConfig, SecurityConfig


class TestConfigVersionInfo:
    """Test ConfigVersionInfo class"""
    
    def test_init_with_defaults(self):
        """Test initialization with default values"""
        version_info = ConfigVersionInfo()
        
        assert version_info.version == "1.0.0"
        assert version_info.source == "DinoAir"
        assert version_info.description == ""
        assert version_info.schema_version == "1.0.0"
        assert isinstance(version_info.created_at, datetime)
    
    def test_init_with_custom_values(self):
        """Test initialization with custom values"""
        created_at = datetime.now(timezone.utc)
        version_info = ConfigVersionInfo(
            version="2.0.0",
            created_at=created_at,
            source="Custom",
            description="Test config"
        )
        
        assert version_info.version == "2.0.0"
        assert version_info.created_at == created_at
        assert version_info.source == "Custom"
        assert version_info.description == "Test config"
    
    def test_to_dict(self):
        """Test conversion to dictionary"""
        created_at = datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        version_info = ConfigVersionInfo(
            version="1.5.0",
            created_at=created_at,
            source="Test",
            description="Test version"
        )
        
        expected = {
            "version": "1.5.0",
            "created_at": "2023-01-01T12:00:00+00:00",
            "source": "Test",
            "description": "Test version",
            "schema_version": "1.0.0"
        }
        
        assert version_info.to_dict() == expected
    
    def test_from_dict(self):
        """Test creation from dictionary"""
        data = {
            "version": "1.5.0",
            "created_at": "2023-01-01T12:00:00+00:00",
            "source": "Test",
            "description": "Test version"
        }
        
        version_info = ConfigVersionInfo.from_dict(data)
        
        assert version_info.version == "1.5.0"
        assert version_info.created_at == datetime(2023, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        assert version_info.source == "Test"
        assert version_info.description == "Test version"


class TestConfigExportImportManager:
    """Test ConfigExportImportManager class"""
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for tests"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)
    
    @pytest.fixture
    def manager(self, temp_dir):
        """Create ConfigExportImportManager instance"""
        config_dir = temp_dir / "config"
        backup_dir = temp_dir / "backups"
        return ConfigExportImportManager(str(config_dir), str(backup_dir))
    
    @pytest.fixture
    def sample_config(self):
        """Create sample configuration"""
        config = DinoAirConfig()
        config.app_name = "TestApp"
        config.version = "1.0.0"
        config.server.host = "localhost"
        config.server.port = 8080
        config.security.secret_key = "test-secret-key-32-characters-long"
        return config
    
    def test_init_creates_directories(self, temp_dir):
        """Test that initialization creates necessary directories"""
        config_dir = temp_dir / "config"
        backup_dir = temp_dir / "backups"
        
        manager = ConfigExportImportManager(str(config_dir), str(backup_dir))
        
        assert config_dir.exists()
        assert backup_dir.exists()
        assert manager.config_dir == config_dir
        assert manager.backup_dir == backup_dir
    
    def test_export_config_yaml(self, manager, sample_config, temp_dir):
        """Test exporting configuration to YAML"""
        output_path = temp_dir / "test_export.yaml"
        
        result_path = manager.export_config(
            config=sample_config,
            output_path=str(output_path),
            format=ExportFormat.YAML
        )
        
        assert result_path == str(output_path)
        assert output_path.exists()
        
        # Verify content
        with open(output_path, 'r') as f:
            data = yaml.safe_load(f)
        
        assert "_metadata" in data
        assert "config" in data
        assert data["config"]["app_name"] == "TestApp"
        assert data["config"]["server"]["port"] == 8080
    
    def test_export_config_json(self, manager, sample_config, temp_dir):
        """Test exporting configuration to JSON"""
        output_path = temp_dir / "test_export.json"
        
        result_path = manager.export_config(
            config=sample_config,
            output_path=str(output_path),
            format=ExportFormat.JSON
        )
        
        assert result_path == str(output_path)
        assert output_path.exists()
        
        # Verify content
        with open(output_path, 'r') as f:
            data = json.load(f)
        
        assert "_metadata" in data
        assert "config" in data
        assert data["config"]["app_name"] == "TestApp"
    
    def test_export_specific_sections(self, manager, sample_config, temp_dir):
        """Test exporting specific configuration sections"""
        output_path = temp_dir / "test_sections.yaml"
        
        manager.export_config(
            config=sample_config,
            output_path=str(output_path),
            sections=[ConfigSection.SERVER, ConfigSection.SECURITY]
        )
        
        with open(output_path, 'r') as f:
            data = yaml.safe_load(f)
        
        config_data = data["config"]
        assert "server" in config_data
        assert "security" in config_data
        assert "database" not in config_data
        assert "logging" not in config_data
    
    def test_export_as_template(self, manager, sample_config, temp_dir):
        """Test exporting configuration as template"""
        output_path = temp_dir / "test_template.yaml"
        
        manager.export_config(
            config=sample_config,
            output_path=str(output_path),
            as_template=True
        )
        
        with open(output_path, 'r') as f:
            data = yaml.safe_load(f)
        
        # Check that sensitive data is replaced with placeholders
        security_config = data["config"]["security"]
        assert security_config["secret_key"] == "${SECRET_KEY}"
    
    def test_export_without_metadata(self, manager, sample_config, temp_dir):
        """Test exporting configuration without metadata"""
        output_path = temp_dir / "test_no_metadata.yaml"
        
        manager.export_config(
            config=sample_config,
            output_path=str(output_path),
            include_metadata=False
        )
        
        with open(output_path, 'r') as f:
            data = yaml.safe_load(f)
        
        assert "_metadata" not in data
        assert "app_name" in data  # Direct config data
    
    def test_import_config_yaml(self, manager, temp_dir):
        """Test importing configuration from YAML"""
        # Create test import file
        import_data = {
            "_metadata": {
                "version": "1.0.0",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "source": "Test"
            },
            "config": {
                "app_name": "ImportedApp",
                "server": {
                    "host": "0.0.0.0",
                    "port": 9000
                }
            }
        }
        
        import_path = temp_dir / "import_test.yaml"
        with open(import_path, 'w') as f:
            yaml.dump(import_data, f)
        
        # Import configuration
        imported_config = manager.import_config(
            import_path=str(import_path),
            validate=True
        )
        
        assert imported_config.app_name == "ImportedApp"
        assert imported_config.server.port == 9000
    
    def test_import_config_json(self, manager, temp_dir):
        """Test importing configuration from JSON"""
        import_data = {
            "config": {
                "app_name": "JSONImport",
                "server": {
                    "port": 8888
                }
            }
        }
        
        import_path = temp_dir / "import_test.json"
        with open(import_path, 'w') as f:
            json.dump(import_data, f)
        
        imported_config = manager.import_config(str(import_path))
        assert imported_config.app_name == "JSONImport"
        assert imported_config.server.port == 8888
    
    def test_import_specific_sections(self, manager, temp_dir):
        """Test importing specific configuration sections"""
        import_data = {
            "server": {"port": 7777},
            "security": {"secret_key": "imported-secret-key-32-chars-long"},
            "logging": {"level": "DEBUG"}
        }
        
        import_path = temp_dir / "sections_import.yaml"
        with open(import_path, 'w') as f:
            yaml.dump(import_data, f)
        
        imported_config = manager.import_config(
            import_path=str(import_path),
            sections=[ConfigSection.SERVER]
        )
        
        assert imported_config.server.port == 7777
        # Other sections should have defaults
        assert imported_config.logging.level == "INFO"  # Default value
    
    def test_import_merge_mode(self, manager, temp_dir):
        """Test importing with merge mode"""
        # Create existing config file
        existing_config = {
            "app_name": "ExistingApp",
            "server": {"host": "localhost", "port": 8000},
            "security": {"secret_key": "existing-secret-key-32-chars-long"}
        }
        
        target_path = temp_dir / "target_config.yaml"
        with open(target_path, 'w') as f:
            yaml.dump(existing_config, f)
        
        # Create import data with partial update
        import_data = {
            "server": {"port": 9000},  # Change port only
            "app_name": "UpdatedApp"
        }
        
        import_path = temp_dir / "merge_import.yaml"
        with open(import_path, 'w') as f:
            yaml.dump(import_data, f)
        
        # Import with merge
        imported_config = manager.import_config(
            import_path=str(import_path),
            target_config_path=str(target_path),
            merge_mode=True
        )
        
        assert imported_config.app_name == "UpdatedApp"
        assert imported_config.server.port == 9000
        assert imported_config.server.host == "localhost"  # Preserved from existing
    
    def test_import_nonexistent_file(self, manager):
        """Test importing from nonexistent file"""
        with pytest.raises(ConfigImportError) as exc_info:
            manager.import_config("nonexistent_file.yaml")
        
        assert "Import file not found" in str(exc_info.value)
    
    def test_backup_config(self, manager, temp_dir):
        """Test backing up configuration file"""
        # Create test config file
        config_path = temp_dir / "test_config.yaml"
        test_data = {"app_name": "TestApp"}
        
        with open(config_path, 'w') as f:
            yaml.dump(test_data, f)
        
        # Backup the file
        backup_path = manager.backup_config(str(config_path))
        
        assert Path(backup_path).exists()
        assert "backup" in backup_path
        
        # Verify backup content
        with open(backup_path, 'r') as f:
            backup_data = yaml.safe_load(f)
        
        assert backup_data == test_data
    
    def test_backup_custom_name(self, manager, temp_dir):
        """Test backing up with custom name"""
        config_path = temp_dir / "test_config.yaml"
        with open(config_path, 'w') as f:
            yaml.dump({"test": "data"}, f)
        
        backup_path = manager.backup_config(str(config_path), "custom_backup.yaml")
        
        assert "custom_backup.yaml" in backup_path
        assert Path(backup_path).exists()
    
    def test_backup_nonexistent_file(self, manager):
        """Test backing up nonexistent file"""
        with pytest.raises(ConfigBackupError) as exc_info:
            manager.backup_config("nonexistent.yaml")
        
        assert "Config file not found" in str(exc_info.value)
    
    def test_restore_config(self, manager, temp_dir):
        """Test restoring configuration from backup"""
        # Create original and backup files
        original_data = {"app_name": "Original"}
        backup_data = {"app_name": "Backup"}
        
        target_path = temp_dir / "target.yaml"
        backup_path = temp_dir / "backup.yaml"
        
        with open(target_path, 'w') as f:
            yaml.dump(original_data, f)
        
        with open(backup_path, 'w') as f:
            yaml.dump(backup_data, f)
        
        # Restore from backup
        manager.restore_config(str(backup_path), str(target_path))
        
        # Verify restoration
        with open(target_path, 'r') as f:
            restored_data = yaml.safe_load(f)
        
        assert restored_data == backup_data
    
    def test_list_backups(self, manager, temp_dir):
        """Test listing backup files"""
        # Create some backup files
        backup1_path = manager.backup_dir / "config_backup_20230101_120000.yaml"
        backup2_path = manager.backup_dir / "config_backup_20230102_120000.yaml"
        
        with open(backup1_path, 'w') as f:
            yaml.dump({"test": "backup1"}, f)
        
        with open(backup2_path, 'w') as f:
            yaml.dump({"test": "backup2"}, f)
        
        backups = manager.list_backups()
        
        assert len(backups) == 2
        assert any("backup_20230102" in b["name"] for b in backups)
        assert any("backup_20230101" in b["name"] for b in backups)
        
        # Check structure
        for backup in backups:
            assert "name" in backup
            assert "path" in backup
            assert "size" in backup
            assert "created" in backup
            assert "modified" in backup
    
    def test_create_template(self, manager, sample_config, temp_dir):
        """Test creating configuration template"""
        template_path = temp_dir / "test_template.yaml"
        
        result_path = manager.create_template(
            config=sample_config,
            template_path=str(template_path),
            name="Test Template",
            description="A test configuration template"
        )
        
        assert result_path == str(template_path)
        assert template_path.exists()
        
        # Verify template content
        with open(template_path, 'r') as f:
            template_data = yaml.safe_load(f)
        
        metadata = template_data["_metadata"]
        assert metadata["template_name"] == "Test Template"
        assert metadata["template_description"] == "A test configuration template"
        assert metadata["is_template"] is True
        
        # Check sensitive data is sanitized
        security_config = template_data["config"]["security"]
        assert security_config["secret_key"] == "${SECRET_KEY}"
    
    def test_validate_config_file_valid(self, manager, temp_dir):
        """Test validating a valid configuration file"""
        config_data = {
            "app_name": "ValidApp",
            "server": {"host": "localhost", "port": 8000},
            "security": {"secret_key": "valid-secret-key-32-characters-long"}
        }
        
        config_path = temp_dir / "valid_config.yaml"
        with open(config_path, 'w') as f:
            yaml.dump(config_data, f)
        
        result = manager.validate_config_file(str(config_path))
        
        assert result["valid"] is True
        assert len(result["errors"]) == 0
    
    def test_validate_config_file_invalid(self, manager, temp_dir):
        """Test validating an invalid configuration file"""
        config_data = {
            "server": {"port": "invalid_port"}  # Invalid port type
        }
        
        config_path = temp_dir / "invalid_config.yaml"
        with open(config_path, 'w') as f:
            yaml.dump(config_data, f)
        
        result = manager.validate_config_file(str(config_path))
        
        assert result["valid"] is False
        assert len(result["errors"]) > 0
    
    def test_validate_nonexistent_file(self, manager):
        """Test validating nonexistent file"""
        result = manager.validate_config_file("nonexistent.yaml")
        
        assert result["valid"] is False
        assert "not found" in result["errors"][0]
    
    def test_get_config_diff_identical(self, manager, temp_dir):
        """Test comparing identical configuration files"""
        config_data = {"app_name": "SameApp", "server": {"port": 8000}}
        
        config1_path = temp_dir / "config1.yaml"
        config2_path = temp_dir / "config2.yaml"
        
        with open(config1_path, 'w') as f:
            yaml.dump(config_data, f)
        
        with open(config2_path, 'w') as f:
            yaml.dump(config_data, f)
        
        result = manager.get_config_diff(str(config1_path), str(config2_path))
        
        assert result["identical"] is True
        assert len(result["differences"]) == 0
    
    def test_get_config_diff_different(self, manager, temp_dir):
        """Test comparing different configuration files"""
        config1_data = {
            "app_name": "App1",
            "server": {"port": 8000},
            "only_in_1": "value1"
        }
        
        config2_data = {
            "app_name": "App2",
            "server": {"port": 9000},
            "only_in_2": "value2"
        }
        
        config1_path = temp_dir / "config1.yaml"
        config2_path = temp_dir / "config2.yaml"
        
        with open(config1_path, 'w') as f:
            yaml.dump(config1_data, f)
        
        with open(config2_path, 'w') as f:
            yaml.dump(config2_data, f)
        
        result = manager.get_config_diff(str(config1_path), str(config2_path))
        
        assert result["identical"] is False
        assert len(result["differences"]) > 0
        
        # Check for expected differences
        diff_types = [d["type"] for d in result["differences"]]
        assert "different_value" in diff_types
        assert "missing_in_config1" in diff_types
        assert "missing_in_config2" in diff_types


class TestUtilityFunctions:
    """Test utility functions"""
    
    @pytest.fixture
    def sample_config(self):
        """Create sample configuration"""
        config = DinoAirConfig()
        config.app_name = "UtilityTest"
        return config
    
    @pytest.fixture
    def temp_dir(self):
        """Create temporary directory for tests"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)
    
    def test_export_config_utility(self, sample_config, temp_dir):
        """Test export_config utility function"""
        output_path = temp_dir / "utility_export.yaml"
        
        result_path = export_config(sample_config, str(output_path))
        
        assert result_path == str(output_path)
        assert output_path.exists()
    
    def test_import_config_utility(self, temp_dir):
        """Test import_config utility function"""
        # Create test import file
        import_data = {"app_name": "UtilityImport"}
        import_path = temp_dir / "utility_import.yaml"
        
        with open(import_path, 'w') as f:
            yaml.dump(import_data, f)
        
        imported_config = import_config(str(import_path))
        
        assert imported_config.app_name == "UtilityImport"
    
    def test_backup_config_utility(self, temp_dir):
        """Test backup_config utility function"""
        # Create test config file
        config_path = temp_dir / "utility_config.yaml"
        with open(config_path, 'w') as f:
            yaml.dump({"test": "data"}, f)
        
        backup_path = backup_config(str(config_path))
        
        assert Path(backup_path).exists()
        assert "backup" in backup_path
    
    def test_validate_config_file_utility(self, temp_dir):
        """Test validate_config_file utility function"""
        config_data = {"app_name": "ValidUtility"}
        config_path = temp_dir / "utility_validate.yaml"
        
        with open(config_path, 'w') as f:
            yaml.dump(config_data, f)
        
        result = validate_config_file(str(config_path))
        
        assert result["valid"] is True


class TestConfigSections:
    """Test configuration section handling"""
    
    def test_config_section_enum_values(self):
        """Test ConfigSection enum values"""
        assert ConfigSection.ALL.value == "all"
        assert ConfigSection.SERVER.value == "server"
        assert ConfigSection.DATABASE.value == "database"
        assert ConfigSection.SECURITY.value == "security"
        assert ConfigSection.COMFYUI.value == "comfyui"
        assert ConfigSection.OLLAMA.value == "ollama"
        assert ConfigSection.RESOURCES.value == "resources"
        assert ConfigSection.LOGGING.value == "logging"
        assert ConfigSection.MONITORING.value == "monitoring"


class TestErrorHandling:
    """Test error handling in export/import operations"""
    
    @pytest.fixture
    def manager(self):
        """Create manager with temp directories"""
        with tempfile.TemporaryDirectory() as temp_dir:
            config_dir = Path(temp_dir) / "config"
            backup_dir = Path(temp_dir) / "backups"
            yield ConfigExportImportManager(str(config_dir), str(backup_dir))
    
    def test_export_invalid_path(self, manager):
        """Test export with invalid output path"""
        config = DinoAirConfig()
        
        with pytest.raises(ConfigExportError):
            manager.export_config(config, "/invalid/path/config.yaml")
    
    def test_import_invalid_yaml(self, manager):
        """Test import with invalid YAML content"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write("invalid: yaml: content: [unclosed")
            invalid_path = f.name
        
        try:
            with pytest.raises(ConfigImportError):
                manager.import_config(invalid_path)
        finally:
            os.unlink(invalid_path)
    
    def test_restore_nonexistent_backup(self, manager):
        """Test restore with nonexistent backup file"""
        with pytest.raises(ConfigBackupError) as exc_info:
            manager.restore_config("nonexistent_backup.yaml", "target.yaml")
        
        assert "Backup file not found" in str(exc_info.value)