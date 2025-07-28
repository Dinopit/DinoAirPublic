#!/usr/bin/env python3
"""
Test script to validate dummy classes work properly and prevent AttributeError.
This test specifically validates the fix for missing methods in dummy classes.
"""

import sys
import tempfile
from pathlib import Path

def test_dummy_classes_interface():
    """Test that dummy classes provide the expected interface when real classes fail to import."""
    
    # Test by importing the monitoring system which will use dummy classes
    # since the relative imports will fail in this test context
    from monitoring.enhanced_monitoring import (
        EnhancedMonitoringSystem, 
        MonitoringConfig,
        AlertSeverity, 
        AlertCategory,
        LogLevel,
        LogCategory,
        Alert,
        AlertingSystem,
        StructuredLogger
    )
    
    print("✓ Successfully imported all classes including dummy classes")
    
    # Test Alert dummy class
    try:
        alert = Alert(
            id="test-123",
            title="Test Alert",
            description="Test description",
            severity=AlertSeverity.LOW,
            category=AlertCategory.SYSTEM_FAILURE,
            source="test",
            correlation_id="test-correlation-123"
        )
        print("✓ Alert dummy class instantiation works")
        
        # Verify the attributes were set
        assert alert.id == "test-123"
        assert alert.title == "Test Alert" 
        print("✓ Alert dummy class stores attributes correctly")
        
    except Exception as e:
        print(f"✗ Alert dummy class failed: {e}")
        return False
    
    # Test AlertingSystem dummy class
    try:
        alerting_system = AlertingSystem()
        alerting_system.send_alert(alert)
        print("✓ AlertingSystem dummy class works with send_alert method")
        
    except Exception as e:
        print(f"✗ AlertingSystem dummy class failed: {e}")
        return False
    
    # Test StructuredLogger dummy class
    try:
        logger = StructuredLogger("test-logger")
        logger.log(LogLevel.INFO, "Test message", LogCategory.SYSTEM)
        logger.info("Test info message")
        logger.warn("Test warning message")
        logger.error("Test error message")
        logger.debug("Test debug message")
        print("✓ StructuredLogger dummy class works with all log methods")
        
    except Exception as e:
        print(f"✗ StructuredLogger dummy class failed: {e}")
        return False
    
    # Test LogLevel enum-like behavior
    try:
        info_level = LogLevel.INFO
        assert hasattr(info_level, 'value')
        assert info_level.value == "INFO"
        print(f"✓ LogLevel.INFO.value = '{info_level.value}'")
        
        # Test other log levels
        for level_name in ['ERROR', 'DEBUG', 'WARN', 'TRACE', 'FATAL']:
            level = getattr(LogLevel, level_name)
            assert hasattr(level, 'value')
            assert level.value == level_name
            print(f"✓ LogLevel.{level_name}.value = '{level.value}'")
            
    except Exception as e:
        print(f"✗ LogLevel enum-like behavior failed: {e}")
        return False
    
    # Test LogCategory enum-like behavior
    try:
        system_category = LogCategory.SYSTEM
        assert hasattr(system_category, 'value')
        assert system_category.value == "system"
        print(f"✓ LogCategory.SYSTEM.value = '{system_category.value}'")
        
    except Exception as e:
        print(f"✗ LogCategory enum-like behavior failed: {e}")
        return False
    
    return True

def test_enhanced_monitoring_system_integration():
    """Test that EnhancedMonitoringSystem works with dummy classes."""
    
    from monitoring.enhanced_monitoring import (
        EnhancedMonitoringSystem, 
        MonitoringConfig,
        AlertSeverity, 
        AlertCategory,
        LogLevel,
        LogCategory
    )
    
    try:
        # Create config with writable directory
        config = MonitoringConfig()
        config.audit_log_directory = str(Path(tempfile.gettempdir()) / "test_audit")
        config.enable_resource_monitoring = False  # Disable to avoid ResourceMonitor issues
        
        # Create monitoring system
        system = EnhancedMonitoringSystem(config)
        print("✓ EnhancedMonitoringSystem created successfully with dummy classes")
        
        # Test send_alert method
        system.send_alert(
            title="Test Alert",
            description="Test alert description", 
            severity=AlertSeverity.MEDIUM,
            category=AlertCategory.PERFORMANCE_DEGRADATION
        )
        print("✓ send_alert method works with dummy classes")
        
        # Test log_structured method
        system.log_structured(
            level=LogLevel.INFO,
            message="Test structured log message",
            category=LogCategory.SYSTEM
        )
        print("✓ log_structured method works with dummy classes")
        
        return True
        
    except Exception as e:
        print(f"✗ EnhancedMonitoringSystem integration test failed: {e}")
        return False

def main():
    """Run all tests to validate dummy classes fix."""
    print("Testing dummy classes to prevent AttributeError...")
    print("=" * 60)
    
    success = True
    
    print("\n1. Testing dummy classes interface...")
    if not test_dummy_classes_interface():
        success = False
    
    print("\n2. Testing EnhancedMonitoringSystem integration...")
    if not test_enhanced_monitoring_system_integration():
        success = False
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 All tests passed! Dummy classes work correctly.")
        print("✓ No AttributeError will occur when real classes fail to import")
        print("✓ Dummy classes provide proper no-op interface") 
        return 0
    else:
        print("❌ Some tests failed! Dummy classes need fixes.")
        return 1

if __name__ == "__main__":
    sys.exit(main())