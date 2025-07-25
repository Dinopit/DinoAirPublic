"""
Test suite for DinoAir configuration management system
"""

import os
import json
import yaml
import tempfile
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta

from lib.config import (
    ConfigError,
    ConfigValidator,
    ConfigLoader,
    DinoAirConfig,
    load_config,
    SecretsError,
    SecretRef,
    SecretsManager,
    EnvSecretsProvider,
    ConfigHotReloader,
    ConfigManager,
    DriftRule,
    DriftDetector,
    ConfigDriftMonitor,
    DEFAULT_DRIFT_RULES
)


class TestConfigValidator:
    """Test configuration validation"""
    
    def test_valid_config(self):
        """Test validation of valid configuration"""
        validator = ConfigValidator()
        config_data = {
            "app_name": "DinoAir",
            "environment": "test",
            "server": {
                "host": "127.0.0.1",
                "port": 8000,
                "workers": 2
            },
            "security": {
                "secret_key": "test-secret-key-minimum-32-characters"
            }
        }
        
        config = validator.validate(config_data)
        assert isinstance(config, DinoAirConfig)
        assert config.app_name == "DinoAir"
        assert config.server.host == "127.0.0.1"
        assert config.server.port == 8000
    
    def test_invalid_config_missing_required(self):
        """Test validation with missing required fields"""
        validator = ConfigValidator()
        config_data = {
            "app_name": "DinoAir",
            "security": {}  # Missing required secret_key
        }
        
        with pytest.raises(ConfigError) as exc_info:
            validator.validate(config_data)
        
        assert "secret_key" in str(exc_info.value)
    
    def test_invalid_config_wrong_types(self):
        """Test validation with wrong types"""
        validator = ConfigValidator()
        config_data = {
            "app_name": "DinoAir",
            "server": {
                "port": "invalid_port",  # Should be integer
                "workers": -1  # Should be positive
            }
        }
        
        with pytest.raises(ConfigError):
            validator.validate(config_data)
    
    def test_config_with_defaults(self):
        """Test configuration uses defaults for missing optional fields"""
        validator = ConfigValidator()
        config_data = {
            "app_name": "DinoAir",
            "security": {
                "secret_key": "test-secret-key-minimum-32-characters"
            }
        }
        
        config = validator.validate(config_data)
        assert config.server.port == 8000  # Default value
        assert config.server.workers == 4  # Default value


class TestConfigLoader:
    """Test configuration loading from files and environment"""
    
    def test_load_from_yaml_file(self):
        """Test loading configuration from YAML file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump({
                "app_name": "Test App",
                "server": {"port": 9000}
            }, f)
            temp_path = f.name
        
        try:
            loader = ConfigLoader()
            config = loader.load(config_files=[temp_path])
            assert config.app_name == "Test App"
            assert config.server.port == 9000
        finally:
            os.unlink(temp_path)
    
    def test_load_from_json_file(self):
        """Test loading configuration from JSON file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({
                "app_name": "Test JSON App",
                "server": {"port": 8080}
            }, f)
            temp_path = f.name
        
        try:
            loader = ConfigLoader()
            config = loader.load(config_files=[temp_path])
            assert config.app_name == "Test JSON App"
            assert config.server.port == 8080
        finally:
            os.unlink(temp_path)
    
    def test_load_from_environment(self):
        """Test loading configuration from environment variables"""
        with patch.dict(os.environ, {
            'DINOAIR_APP_NAME': 'Env App',
            'DINOAIR_SERVER_PORT': '7000',
            'DINOAIR_SERVER_WORKERS': '8'
        }):
            loader = ConfigLoader()
            config = loader.load()
            assert config.app_name == "Env App"
            assert config.server.port == 7000
            assert config.server.workers == 8
    
    def test_environment_overrides_file(self):
        """Test environment variables override file configuration"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump({
                "app_name": "File App",
                "server": {"port": 9000}
            }, f)
            temp_path = f.name
        
        try:
            with patch.dict(os.environ, {
                'DINOAIR_SERVER_PORT': '7000'
            }):
                loader = ConfigLoader()
                config = loader.load(config_files=[temp_path])
                assert config.app_name == "File App"  # From file
                assert config.server.port == 7000  # From environment
        finally:
            os.unlink(temp_path)


class TestSecretsManager:
    """Test secrets management functionality"""
    
    def test_env_secrets_provider(self):
        """Test environment variables secrets provider"""
        provider = EnvSecretsProvider()
        
        with patch.dict(os.environ, {'TEST_SECRET': 'secret_value'}):
            secret = provider.get_secret('TEST_SECRET')
            assert secret == 'secret_value'
        
        # Test missing secret
        with pytest.raises(SecretsError):
            provider.get_secret('MISSING_SECRET')
    
    def test_env_secrets_provider_json(self):
        """Test environment provider with JSON secret"""
        provider = EnvSecretsProvider()
        
        with patch.dict(os.environ, {'JSON_SECRET': '{"key": "value", "password": "secret"}'}):
            # Get full JSON
            secret = provider.get_secret('JSON_SECRET')
            assert secret == {"key": "value", "password": "secret"}
            
            # Get specific key
            password = provider.get_secret('JSON_SECRET', 'password')
            assert password == 'secret'
    
    def test_secrets_manager_integration(self):
        """Test secrets manager with multiple providers"""
        manager = SecretsManager()
        
        with patch.dict(os.environ, {'TEST_SECRET': 'env_value'}):
            # Test environment provider
            secret = manager.get_secret('env://TEST_SECRET')
            assert secret == 'env_value'
            
            # Test default to environment
            secret = manager.get_secret('TEST_SECRET')
            assert secret == 'env_value'
    
    def test_resolve_config_secrets(self):
        """Test resolving secrets in configuration"""
        manager = SecretsManager()
        
        with patch.dict(os.environ, {
            'DB_PASSWORD': 'secret_password',
            'API_KEY': 'secret_api_key'
        }):
            config = {
                "database": {
                    "host": "localhost",
                    "password": "env://DB_PASSWORD"
                },
                "api": {
                    "key": "env://API_KEY",
                    "timeout": 30
                }
            }
            
            resolved = manager.resolve_config_secrets(config)
            
            assert resolved["database"]["password"] == "secret_password"
            assert resolved["api"]["key"] == "secret_api_key"
            assert resolved["api"]["timeout"] == 30  # Non-secret value unchanged


class TestConfigHotReload:
    """Test configuration hot-reloading functionality"""
    
    def test_config_hot_reloader_creation(self):
        """Test creating hot reloader"""
        reloader = ConfigHotReloader(
            config_paths=['config.yaml'],
            reload_delay=0.1
        )
        assert not reloader._is_running
        assert len(reloader.reload_callbacks) == 0
    
    def test_config_change_detection(self):
        """Test configuration change detection"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump({"app_name": "Test"}, f)
            temp_path = f.name
        
        try:
            reloader = ConfigHotReloader([temp_path], reload_delay=0.1)
            
            # Initial checksum
            initial_checksum = reloader._calculate_file_checksum(temp_path)
            
            # Modify file
            with open(temp_path, 'w') as f:
                yaml.dump({"app_name": "Modified"}, f)
            
            # Check if change detected
            new_checksum = reloader._calculate_file_checksum(temp_path)
            assert initial_checksum != new_checksum
        finally:
            os.unlink(temp_path)
    
    def test_config_manager_hot_reload(self):
        """Test config manager with hot reload enabled"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump({
                "app_name": "Test App",
                "security": {"secret_key": "test-secret-key-minimum-32-characters"}
            }, f)
            temp_path = f.name
        
        try:
            manager = ConfigManager(
                config_paths=[temp_path],
                enable_hot_reload=True,
                reload_delay=0.1
            )
            
            config = manager.load_config()
            assert config.app_name == "Test App"
            
            # Test callback registration
            callback_called = False
            
            def test_callback(new_config, change):
                nonlocal callback_called
                callback_called = True
            
            manager.add_reload_callback(test_callback)
            assert len(manager.hot_reloader.reload_callbacks) == 1
        finally:
            os.unlink(temp_path)


class TestDriftDetection:
    """Test configuration drift detection"""
    
    def test_drift_rule_creation(self):
        """Test creating drift detection rule"""
        rule = DriftRule(
            name="test_rule",
            description="Test rule",
            config_path="server.port",
            expected_value=8000,
            severity="warning"
        )
        
        assert rule.name == "test_rule"
        assert rule.config_path == "server.port"
        assert rule.expected_value == 8000
        assert rule.enabled is True
    
    def test_drift_detector_no_drift(self):
        """Test drift detector with no configuration drift"""
        rules = [
            DriftRule(
                name="port_check",
                description="Check server port",
                config_path="server.port",
                expected_value=8000,
                severity="warning"
            )
        ]
        
        detector = DriftDetector(rules)
        
        # Create test config
        config = DinoAirConfig()
        config.server.port = 8000
        
        violations = detector.check_drift(config)
        assert len(violations) == 0
    
    def test_drift_detector_with_drift(self):
        """Test drift detector with configuration drift"""
        rules = [
            DriftRule(
                name="port_check",
                description="Check server port",
                config_path="server.port",
                expected_value=8000,
                severity="warning"
            )
        ]
        
        detector = DriftDetector(rules)
        
        # Create test config with different value
        config = DinoAirConfig()
        config.server.port = 9000
        
        violations = detector.check_drift(config)
        assert len(violations) == 1
        assert violations[0].rule.name == "port_check"
        assert violations[0].current_value == 9000
        assert violations[0].expected_value == 8000
    
    def test_drift_detector_with_tolerance(self):
        """Test drift detector with tolerance settings"""
        rules = [
            DriftRule(
                name="memory_check",
                description="Check memory limit",
                config_path="resources.max_memory_mb",
                expected_value=8192,
                tolerance={"percentage": 25},  # Allow 25% variance
                severity="warning"
            )
        ]
        
        detector = DriftDetector(rules)
        config = DinoAirConfig()
        
        # Within tolerance (20% difference)
        config.resources.max_memory_mb = 6554  # ~20% less
        violations = detector.check_drift(config)
        assert len(violations) == 0
        
        # Outside tolerance (30% difference)
        config.resources.max_memory_mb = 5734  # ~30% less
        violations = detector.check_drift(config)
        assert len(violations) == 1
    
    def test_drift_detector_missing_path(self):
        """Test drift detector with missing configuration path"""
        rules = [
            DriftRule(
                name="missing_check",
                description="Check missing config",
                config_path="nonexistent.path",
                expected_value="some_value",
                severity="error"
            )
        ]
        
        detector = DriftDetector(rules)
        config = DinoAirConfig()
        
        violations = detector.check_drift(config)
        assert len(violations) == 1
        assert violations[0].current_value is None
        assert "not found" in violations[0].message
    
    def test_default_drift_rules(self):
        """Test default drift rules are properly defined"""
        assert len(DEFAULT_DRIFT_RULES) > 0
        
        for rule in DEFAULT_DRIFT_RULES:
            assert isinstance(rule, DriftRule)
            assert rule.name
            assert rule.description
            assert rule.config_path
            assert rule.severity in ["warning", "error", "critical"]


class TestEnvironmentSpecificConfig:
    """Test environment-specific configuration loading"""
    
    def test_load_development_config(self):
        """Test loading development environment configuration"""
        # Test if development config exists and loads properly
        dev_config_path = "config/environments/development.yaml"
        
        if os.path.exists(dev_config_path):
            config = load_config(environment="development")
            assert config.environment == "development"
            assert config.debug is True
            assert config.server.workers == 1
    
    def test_load_production_config(self):
        """Test loading production environment configuration"""
        # Test if production config exists and loads properly
        prod_config_path = "config/environments/production.yaml"
        
        if os.path.exists(prod_config_path):
            # Mock required environment variables
            with patch.dict(os.environ, {
                'DINOAIR_SECRET_KEY': 'test-secret-key-minimum-32-characters'
            }):
                config = load_config(environment="production")
                assert config.environment == "production"
                assert config.debug is False
                assert config.server.workers >= 2
    
    def test_environment_selection(self):
        """Test environment selection via DINOAIR_ENV"""
        with patch.dict(os.environ, {'DINOAIR_ENV': 'staging'}):
            # Mock the staging config to avoid file dependency
            with patch('os.path.exists', return_value=False):
                config = load_config()
                assert config.environment == "staging"


class TestIntegration:
    """Integration tests for the complete configuration system"""
    
    def test_full_config_lifecycle(self):
        """Test complete configuration lifecycle"""
        # Create temporary config files
        base_config = {
            "app_name": "Integration Test",
            "security": {
                "secret_key": "env://TEST_SECRET_KEY"
            },
            "server": {
                "port": 8000
            }
        }
        
        env_config = {
            "environment": "test",
            "debug": True,
            "server": {
                "workers": 2
            }
        }
        
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create config files
            base_path = os.path.join(temp_dir, "config.yaml")
            env_path = os.path.join(temp_dir, "test.yaml")
            
            with open(base_path, 'w') as f:
                yaml.dump(base_config, f)
            
            with open(env_path, 'w') as f:
                yaml.dump(env_config, f)
            
            # Set up environment
            with patch.dict(os.environ, {
                'TEST_SECRET_KEY': 'integration-test-secret-key-32chars',
                'DINOAIR_LOGGING_LEVEL': 'DEBUG'
            }):
                # Load configuration
                loader = ConfigLoader()
                config = loader.load(config_files=[base_path, env_path])
                
                # Verify merged configuration
                assert config.app_name == "Integration Test"
                assert config.environment == "test"
                assert config.debug is True
                assert config.server.port == 8000
                assert config.server.workers == 2
                assert config.logging.level == "DEBUG"
    
    def test_drift_monitoring_integration(self):
        """Test drift monitoring with real configuration"""
        # Create test configuration
        config = DinoAirConfig()
        config.environment = "production"
        config.debug = False
        config.security.secret_key = "test-secret-key-minimum-32-characters"
        
        # Test with default rules
        detector = DriftDetector(DEFAULT_DRIFT_RULES[:2])  # Use first 2 rules
        violations = detector.check_drift(config, "production")
        
        # Should have no violations for properly configured production
        critical_violations = [v for v in violations if v.severity == "critical"]
        assert len(critical_violations) == 0


class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_invalid_yaml_file(self):
        """Test handling of invalid YAML file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            f.write("invalid: yaml: content: [")
            temp_path = f.name
        
        try:
            loader = ConfigLoader()
            with pytest.raises(ConfigError):
                loader.load(config_files=[temp_path])
        finally:
            os.unlink(temp_path)
    
    def test_missing_config_file(self):
        """Test handling of missing configuration file"""
        loader = ConfigLoader()
        # Should not raise error, just skip missing file
        config = loader.load(config_files=["nonexistent.yaml"])
        assert isinstance(config, DinoAirConfig)
    
    def test_secrets_resolution_failure(self):
        """Test handling of secrets resolution failure"""
        manager = SecretsManager()
        
        # Test with non-existent environment variable
        config = {
            "secret": "env://NONEXISTENT_SECRET"
        }
        
        # Should keep original value on failure
        resolved = manager.resolve_config_secrets(config)
        assert resolved["secret"] == "env://NONEXISTENT_SECRET"


@pytest.fixture
def temp_config_file():
    """Fixture providing temporary config file"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
        yaml.dump({
            "app_name": "Test App",
            "environment": "test",
            "security": {
                "secret_key": "test-secret-key-minimum-32-characters"
            }
        }, f)
        temp_path = f.name
    
    yield temp_path
    
    if os.path.exists(temp_path):
        os.unlink(temp_path)


def test_config_file_fixture(temp_config_file):
    """Test the config file fixture"""
    assert os.path.exists(temp_config_file)
    
    config = load_config(config_path=temp_config_file)
    assert config.app_name == "Test App"
    assert config.environment == "test"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])