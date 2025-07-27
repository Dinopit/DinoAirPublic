#!/usr/bin/env python3
"""
DinoAir Configuration Management Example
Demonstrates the enhanced configuration features
"""

import os
import sys
from pathlib import Path

# Add the lib directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "lib"))

from lib.config import (
    load_config,
    ConfigManager,
    get_secret,
    secrets_manager,
    DriftRule,
    DEFAULT_DRIFT_RULES
)

def main():
    print("DinoAir Configuration Management Demo")
    print("=" * 50)
    
    # 1. Basic configuration loading
    print("\n1. Loading Configuration")
    print("-" * 30)
    
    # Set environment
    os.environ['DINOAIR_ENV'] = 'development'
    os.environ['DINOAIR_SECRET_KEY'] = 'demo-secret-key-minimum-32-characters'
    
    try:
        config = load_config()
        print("✓ Configuration loaded successfully")
        print(f"  Environment: {config.environment}")
        print(f"  Debug mode: {config.debug}")
        print(f"  Server port: {config.server.port}")
        print(f"  Workers: {config.server.workers}")
    except Exception as e:
        print(f"✗ Error loading configuration: {e}")
        return
    
    # 2. Secrets management
    print("\n2. Secrets Management")
    print("-" * 30)
    
    # Set up test secret
    os.environ['DEMO_SECRET'] = 'this_is_a_secret_value'
    
    try:
        # Test environment variable secret
        secret = get_secret('env://DEMO_SECRET')
        print(f"✓ Secret retrieved: {secret}")
        
        # Show available providers
        providers = secrets_manager.list_available_providers()
        print(f"✓ Available providers: {list(providers.keys())}")
        
    except Exception as e:
        print(f"✗ Error with secrets: {e}")
    
    # 3. Environment-specific configuration
    print("\n3. Environment-Specific Configuration")
    print("-" * 30)
    
    environments = ['development', 'staging', 'production']
    for env in environments:
        env_config_path = f"config/environments/{env}.yaml"
        if os.path.exists(env_config_path):
            print(f"✓ {env.capitalize()} config exists: {env_config_path}")
        else:
            print(f"- {env.capitalize()} config not found: {env_config_path}")
    
    # 4. Configuration validation
    print("\n4. Configuration Validation")
    print("-" * 30)
    
    try:
        from lib.config import ConfigValidator
        validator = ConfigValidator()
        
        # Test valid config
        test_config = {
            "app_name": "Test App",
            "security": {
                "secret_key": "valid-secret-key-minimum-32-characters"
            }
        }
        
        validated = validator.validate(test_config)
        print("✓ Configuration validation passed")
        
        # Test invalid config
        invalid_config = {
            "server": {
                "port": "invalid_port"  # Should be integer
            }
        }
        
        try:
            validator.validate(invalid_config)
            print("✗ Validation should have failed")
        except Exception:
            print("✓ Invalid configuration properly rejected")
            
    except Exception as e:
        print(f"✗ Error in validation: {e}")
    
    # 5. Drift detection
    print("\n5. Configuration Drift Detection")
    print("-" * 30)
    
    try:
        from lib.config import DriftDetector
        
        # Create a simple drift rule
        test_rules = [
            DriftRule(
                name="debug_mode_check",
                description="Check debug mode setting",
                config_path="debug",
                expected_value=True,  # Expect debug=True in dev
                severity="warning"
            )
        ]
        
        detector = DriftDetector(test_rules)
        violations = detector.check_drift(config)
        
        if violations:
            print(f"✓ Drift detection working - found {len(violations)} violations")
            for violation in violations:
                print(f"  - {violation.rule.name}: {violation.message}")
        else:
            print("✓ No configuration drift detected")
            
    except Exception as e:
        print(f"✗ Error in drift detection: {e}")
    
    # 6. Hot-reload demonstration (if file exists)
    print("\n6. Hot-Reload Capability")
    print("-" * 30)
    
    try:
        config_file = "config.yaml"
        if os.path.exists(config_file):
            manager = ConfigManager(
                config_paths=[config_file],
                enable_hot_reload=True,
                reload_delay=0.5
            )
            
            print(f"✓ Hot-reload manager created for {config_file}")
            print("  Note: Hot-reload monitoring would start in production")
        else:
            print(f"- Config file {config_file} not found for hot-reload demo")
            
    except Exception as e:
        print(f"✗ Error setting up hot-reload: {e}")
    
    # 7. Default drift rules
    print("\n7. Default Drift Rules")
    print("-" * 30)
    
    print(f"✓ {len(DEFAULT_DRIFT_RULES)} default drift rules available:")
    for rule in DEFAULT_DRIFT_RULES[:3]:  # Show first 3
        print(f"  - {rule.name}: {rule.description} ({rule.severity})")
    if len(DEFAULT_DRIFT_RULES) > 3:
        print(f"  ... and {len(DEFAULT_DRIFT_RULES) - 3} more")
    
    print("\n" + "=" * 50)
    print("Demo completed successfully!")
    print("\nNext steps:")
    print("- Set up environment-specific configurations")
    print("- Configure secrets management (Vault/AWS)")
    print("- Set up drift monitoring and alerting")
    print("- Enable hot-reload for production deployments")

if __name__ == "__main__":
    main()