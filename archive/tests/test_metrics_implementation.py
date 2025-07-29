#!/usr/bin/env python3
"""
Test script to validate DinoAir metrics collection and dashboard implementation
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

def test_metrics_imports():
    """Test that all metrics modules can be imported"""
    print("🧪 Testing metrics module imports...")
    
    try:
        print("✅ MetricsCollector imported successfully")
    except Exception as e:
        print(f"❌ Failed to import MetricsCollector: {e}")
        return False
    
    try:
        print("✅ CustomMetricsRegistry imported successfully")
    except Exception as e:
        print(f"❌ Failed to import CustomMetricsRegistry: {e}")
        return False
    
    try:
        print("✅ Metrics exporters imported successfully")
    except Exception as e:
        print(f"❌ Failed to import metrics exporters: {e}")
        return False
    
    try:
        print("✅ Metrics storage imported successfully")
    except Exception as e:
        print(f"❌ Failed to import metrics storage: {e}")
        return False
    
    try:
        print("✅ Dashboard data provider imported successfully")
    except Exception as e:
        print(f"❌ Failed to import dashboard data provider: {e}")
        return False
    
    try:
        print("✅ Metrics service imported successfully")
    except Exception as e:
        print(f"❌ Failed to import metrics service: {e}")
        return False
    
    return True

def test_metrics_basic_functionality():
    """Test basic metrics functionality"""
    print("\n🧪 Testing basic metrics functionality...")
    
    try:
        from lib.metrics.custom_metrics import CustomMetricsRegistry
        
        # Create custom metrics registry
        registry = CustomMetricsRegistry()
        
        # Test recording different types of metrics
        registry.record_api_request("test_service", "/test", 0.5, 200, "GET")
        registry.record_model_generation("test_model", 10.0, True, 100, 200)
        registry.record_error("test_error", "Test error message", "test_service")
        
        # Test getting custom metrics
        metrics = registry.get_custom_metrics()
        print(f"✅ Generated {len(metrics)} custom metrics")
        
        # Test summary
        summary = registry.get_summary()
        print(f"✅ Metrics summary: {summary}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed basic functionality test: {e}")
        return False

def test_prometheus_export():
    """Test Prometheus metrics export"""
    print("\n🧪 Testing Prometheus export...")
    
    try:
        from lib.metrics.metrics_collector import Metric, MetricType
        from lib.metrics.metrics_exporter import PrometheusExporter
        from datetime import datetime
        
        # Create test metrics
        test_metrics = [
            Metric(
                name="test_counter",
                value=42,
                metric_type=MetricType.COUNTER,
                labels={"service": "test"},
                timestamp=datetime.now(),
                help_text="Test counter metric"
            ),
            Metric(
                name="test_gauge", 
                value=75.5,
                metric_type=MetricType.GAUGE,
                labels={"instance": "test"},
                timestamp=datetime.now(),
                help_text="Test gauge metric"
            )
        ]
        
        # Export to Prometheus format
        exporter = PrometheusExporter()
        prometheus_output = exporter.export(test_metrics)
        
        print("✅ Prometheus export successful")
        print("📊 Sample Prometheus output:")
        print(prometheus_output[:300] + "..." if len(prometheus_output) > 300 else prometheus_output)
        
        return True
        
    except Exception as e:
        print(f"❌ Failed Prometheus export test: {e}")
        return False

def test_dashboard_data():
    """Test dashboard data generation"""
    print("\n🧪 Testing dashboard data generation...")
    
    try:
        from lib.metrics.metrics_collector import MetricsCollector, MetricsConfig
        from lib.metrics.custom_metrics import CustomMetricsRegistry
        from lib.metrics.dashboard_data import DashboardDataProvider
        
        # Create components
        config = MetricsConfig(collection_interval=60)  # Longer interval for testing
        collector = MetricsCollector(config)
        custom_metrics = CustomMetricsRegistry()
        dashboard = DashboardDataProvider(collector, custom_metrics)
        
        # Test different dashboard data
        overview = dashboard.get_system_overview()
        print(f"✅ System overview generated: {len(overview)} fields")
        
        api_metrics = dashboard.get_api_metrics()
        print(f"✅ API metrics generated: {len(api_metrics)} fields")
        
        config_data = dashboard.get_dashboard_config()
        print(f"✅ Dashboard config generated: {len(config_data['widgets'])} widgets")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed dashboard data test: {e}")
        return False

def test_file_structure():
    """Test that all necessary files exist"""
    print("\n🧪 Testing file structure...")
    
    required_files = [
        "lib/metrics/__init__.py",
        "lib/metrics/metrics_collector.py",
        "lib/metrics/custom_metrics.py", 
        "lib/metrics/metrics_exporter.py",
        "lib/metrics/metrics_storage.py",
        "lib/metrics/dashboard_data.py",
        "lib/metrics/metrics_service.py",
        "web-gui/app/api/metrics/route.ts",
        "web-gui/app/api/metrics/dashboard/route.ts",
        "web-gui/app/monitoring/page.tsx",
        "METRICS_DOCUMENTATION.md"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
        else:
            print(f"✅ {file_path}")
    
    if missing_files:
        print(f"❌ Missing files: {missing_files}")
        return False
    
    print("✅ All required files present")
    return True

def main():
    """Run all tests"""
    print("🦕 DinoAir Metrics Implementation Test Suite")
    print("=" * 50)
    
    tests = [
        ("File Structure", test_file_structure),
        ("Module Imports", test_metrics_imports),
        ("Basic Functionality", test_metrics_basic_functionality),
        ("Prometheus Export", test_prometheus_export),
        ("Dashboard Data", test_dashboard_data),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Metrics implementation is ready.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())