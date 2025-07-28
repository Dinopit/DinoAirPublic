#!/usr/bin/env python3
"""
Test script for enhanced monitoring and observability features.
"""

import os
import sys
import time
import tempfile
from pathlib import Path

# Add the project root to the path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def test_opentelemetry_tracer():
    """Test OpenTelemetry tracer functionality."""
    print("Testing OpenTelemetry tracer...")
    
    try:
        from lib.monitoring.opentelemetry_tracer import get_tracer, TraceConfig
        
        # Test with tracing disabled (no dependencies)
        config = TraceConfig(enabled=False)
        tracer = get_tracer(config)
        
        # Test span creation
        with tracer.start_span("test_operation") as span:
            span.set_attribute("test", "value")
            span.add_event("test_event")
        
        print("✅ OpenTelemetry tracer test passed")
        return True
        
    except Exception as e:
        print(f"❌ OpenTelemetry tracer test failed: {e}")
        return False


def test_audit_logger():
    """Test audit logger functionality."""
    print("Testing audit logger...")
    
    try:
        from lib.monitoring.audit_logger import AuditLogger, AuditEventType, AuditSeverity, AuditOutcome
        
        # Create temporary log directory
        with tempfile.TemporaryDirectory() as temp_dir:
            logger = AuditLogger(
                log_directory=temp_dir,
                enable_encryption=False,  # Disable encryption for test
                enable_integrity_check=False
            )
            
            # Test logging an event
            logger.log_event(
                event_type=AuditEventType.AUTHENTICATION,
                action="test_login",
                resource="test_system",
                outcome=AuditOutcome.SUCCESS,
                severity=AuditSeverity.MEDIUM,
                actor="test_user",
                details={"test": "data"}
            )
            
            # Check if log file was created
            log_file = Path(temp_dir) / "audit.log"
            if log_file.exists():
                print("✅ Audit logger test passed")
                return True
            else:
                print("❌ Audit log file not created")
                return False
                
    except Exception as e:
        print(f"❌ Audit logger test failed: {e}")
        return False


def test_enhanced_monitoring():
    """Test enhanced monitoring system integration."""
    print("Testing enhanced monitoring system...")
    
    try:
        from lib.monitoring.enhanced_monitoring import (
            EnhancedMonitoringSystem, 
            MonitoringConfig,
            monitor_operation
        )
        from lib.monitoring.audit_logger import AuditEventType
        
        # Create config with minimal dependencies
        config = MonitoringConfig(
            enable_tracing=False,  # Disable to avoid OpenTelemetry deps
            enable_resource_monitoring=False,  # Disable to avoid complex setup
            enable_audit_logging=True,
            audit_log_directory=tempfile.mkdtemp(),
            audit_encryption_enabled=False
        )
        
        # Initialize monitoring system
        monitoring = EnhancedMonitoringSystem(config)
        
        # Test health status
        health = monitoring.get_health_status()
        if "status" in health and "components" in health:
            print("✅ Enhanced monitoring health check passed")
        else:
            print("❌ Enhanced monitoring health check failed")
            return False
        
        # Test decorator
        @monitor_operation(
            operation_name="test_operation",
            audit_event_type=AuditEventType.SYSTEM_ACCESS,
            alert_on_failure=False  # Disable alerting for test
        )
        def test_function():
            return "success"
        
        result = test_function()
        if result == "success":
            print("✅ Enhanced monitoring decorator test passed")
            return True
        else:
            print("❌ Enhanced monitoring decorator test failed")
            return False
            
    except Exception as e:
        print(f"❌ Enhanced monitoring test failed: {e}")
        return False


def test_dashboard_configs():
    """Test dashboard configuration files."""
    print("Testing dashboard configurations...")
    
    try:
        import json
        
        # Test system overview dashboard
        dashboard_file = Path(__file__).parent / "config" / "dashboards" / "system-overview.json"
        if dashboard_file.exists():
            with open(dashboard_file) as f:
                dashboard = json.load(f)
            
            if "dashboard" in dashboard and "panels" in dashboard["dashboard"]:
                print("✅ System overview dashboard config is valid")
            else:
                print("❌ System overview dashboard config is invalid")
                return False
        else:
            print("❌ System overview dashboard config not found")
            return False
        
        # Test security monitoring dashboard
        security_file = Path(__file__).parent / "config" / "dashboards" / "security-monitoring.json"
        if security_file.exists():
            with open(security_file) as f:
                dashboard = json.load(f)
            
            if "dashboard" in dashboard and "panels" in dashboard["dashboard"]:
                print("✅ Security monitoring dashboard config is valid")
            else:
                print("❌ Security monitoring dashboard config is invalid")
                return False
        else:
            print("❌ Security monitoring dashboard config not found")
            return False
        
        # Test performance monitoring dashboard
        perf_file = Path(__file__).parent / "config" / "dashboards" / "performance-monitoring.json"
        if perf_file.exists():
            with open(perf_file) as f:
                dashboard = json.load(f)
            
            if "dashboard" in dashboard and "panels" in dashboard["dashboard"]:
                print("✅ Performance monitoring dashboard config is valid")
                return True
            else:
                print("❌ Performance monitoring dashboard config is invalid")
                return False
        else:
            print("❌ Performance monitoring dashboard config not found")
            return False
            
    except Exception as e:
        print(f"❌ Dashboard config test failed: {e}")
        return False


def test_alerting_enhancements():
    """Test alerting system enhancements."""
    print("Testing alerting system enhancements...")
    
    try:
        from alerting_system import AlertCategory
        
        # Test new alert categories
        new_categories = [
            AlertCategory.PRIVILEGE_ESCALATION,
            AlertCategory.SUSPICIOUS_ACTIVITY,
            AlertCategory.COMPLIANCE_VIOLATION,
            AlertCategory.AUDIT_FAILURE,
            AlertCategory.ENCRYPTION_FAILURE,
            AlertCategory.MEMORY_LEAK,
            AlertCategory.CPU_SPIKE,
            AlertCategory.DISK_FULL,
            AlertCategory.NETWORK_ANOMALY
        ]
        
        for category in new_categories:
            if hasattr(AlertCategory, category.name):
                continue
            else:
                print(f"❌ Alert category {category.name} not found")
                return False
        
        print("✅ Alerting system enhancements test passed")
        return True
        
    except Exception as e:
        print(f"❌ Alerting enhancements test failed: {e}")
        return False


def main():
    """Run all monitoring tests."""
    print("=" * 60)
    print("DinoAir Enhanced Monitoring and Observability Tests")
    print("=" * 60)
    
    tests = [
        test_opentelemetry_tracer,
        test_audit_logger,
        test_enhanced_monitoring,
        test_dashboard_configs,
        test_alerting_enhancements
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            print()  # Add spacing between tests
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            print()
    
    print("=" * 60)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All monitoring tests passed!")
        return 0
    else:
        print("⚠️  Some monitoring tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())