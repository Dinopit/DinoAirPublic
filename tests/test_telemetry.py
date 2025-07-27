"""
Test suite for DinoAir CLI installer telemetry functionality
"""

import unittest
import tempfile
import shutil
import os
import sys
from unittest.mock import patch

# Add current directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from telemetry import TelemetryConfig, TelemetryCollector, CrashReporter, create_telemetry_system


class TestTelemetryConfig(unittest.TestCase):
    """Test cases for TelemetryConfig class"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.config = TelemetryConfig(self.test_dir)
    
    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_config_initialization(self):
        """Test that config initializes with default values"""
        self.assertIsNone(self.config._config["telemetry_enabled"])
        self.assertIsNone(self.config._config["error_reporting_enabled"])
        self.assertIsNotNone(self.config._config["install_id"])
    
    def test_config_persistence(self):
        """Test that config is saved and loaded correctly"""
        # Enable telemetry
        self.config._config["telemetry_enabled"] = True
        self.config._save_config()
        
        # Create new config instance
        new_config = TelemetryConfig(self.test_dir)
        self.assertTrue(new_config._config["telemetry_enabled"])
    
    def test_disable_telemetry(self):
        """Test disabling telemetry"""
        self.config.disable_telemetry()
        self.assertFalse(self.config.is_telemetry_enabled())
        self.assertFalse(self.config.is_error_reporting_enabled())
        self.assertIsNotNone(self.config._config["opt_out_timestamp"])
    
    def test_anonymous_user_id_generation(self):
        """Test that anonymous user ID is generated consistently"""
        user_id1 = self.config._generate_anonymous_user_id()
        user_id2 = self.config._generate_anonymous_user_id()
        
        # Should be consistent
        self.assertEqual(user_id1, user_id2)
        # Should be anonymized (not contain obvious personal info)
        self.assertEqual(len(user_id1), 16)
    
    @patch('builtins.input', return_value='y')
    def test_user_consent_yes(self, mock_input):
        """Test user consent when user says yes"""
        result = self.config.get_user_consent()
        self.assertTrue(result)
        self.assertTrue(self.config.is_telemetry_enabled())
    
    @patch('builtins.input', return_value='n')
    def test_user_consent_no(self, mock_input):
        """Test user consent when user says no"""
        result = self.config.get_user_consent()
        self.assertFalse(result)
        self.assertFalse(self.config.is_telemetry_enabled())


class TestTelemetryCollector(unittest.TestCase):
    """Test cases for TelemetryCollector class"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.config = TelemetryConfig(self.test_dir)
        # Enable telemetry for testing
        self.config._config["telemetry_enabled"] = True
        self.config._config["error_reporting_enabled"] = True
        self.collector = TelemetryCollector(self.config)
    
    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_collector_initialization(self):
        """Test that collector initializes correctly"""
        self.assertIsNotNone(self.collector.session_id)
        self.assertEqual(len(self.collector.events), 0)
        self.assertIsNotNone(self.collector.system_info)
    
    def test_record_installation_start(self):
        """Test recording installation start event"""
        args = {"no_models": True, "disable_telemetry": False}
        self.collector.record_installation_start(args)
        
        self.assertEqual(len(self.collector.events), 1)
        event = self.collector.events[0]
        self.assertEqual(event["event_type"], "installation_start")
        self.assertIn("system_info", event)
        self.assertIn("installation_args", event)
    
    def test_record_installation_step(self):
        """Test recording installation step"""
        self.collector.record_installation_step("test_step", "completed", {"detail": "test"})
        
        self.assertEqual(len(self.collector.events), 1)
        event = self.collector.events[0]
        self.assertEqual(event["event_type"], "installation_step")
        self.assertEqual(event["step_name"], "test_step")
        self.assertEqual(event["status"], "completed")
    
    def test_record_error(self):
        """Test recording error events"""
        test_error = ValueError("Test error message")
        self.collector.record_error(test_error, {"context": "test"}, "test_step")
        
        self.assertEqual(len(self.collector.events), 1)
        event = self.collector.events[0]
        self.assertEqual(event["event_type"], "error")
        self.assertEqual(event["error_type"], "ValueError")
        self.assertIn("stack_trace", event)
    
    def test_data_sanitization(self):
        """Test that sensitive data is sanitized"""
        sensitive_data = {
            "file_path": "/home/user/secret/path/file.txt",
            "url": "https://example.com/secret",
            "safe_number": 42,
            "safe_bool": True
        }
        
        sanitized = self.collector._sanitize_data(sensitive_data)
        
        self.assertEqual(sanitized["file_path"], "<PATH>")
        self.assertEqual(sanitized["url"], "<URL>")
        self.assertEqual(sanitized["safe_number"], 42)
        self.assertEqual(sanitized["safe_bool"], True)
    
    def test_telemetry_disabled_no_collection(self):
        """Test that no data is collected when telemetry is disabled"""
        # Disable telemetry
        self.config._config["telemetry_enabled"] = False
        
        self.collector.record_installation_start({})
        self.collector.record_installation_step("test", "completed")
        
        # No events should be recorded
        self.assertEqual(len(self.collector.events), 0)


class TestCrashReporter(unittest.TestCase):
    """Test cases for CrashReporter class"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.config = TelemetryConfig(self.test_dir)
        self.config._config["error_reporting_enabled"] = True
        self.collector = TelemetryCollector(self.config)
        self.crash_reporter = CrashReporter(self.config, self.collector)
    
    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_crash_report(self):
        """Test crash reporting functionality"""
        test_error = RuntimeError("Test crash")
        context = {"step": "test_step", "details": "test details"}
        
        self.crash_reporter.report_crash(test_error, context)
        
        # Check that crash was recorded in collector
        error_events = [e for e in self.collector.events if e["event_type"] == "error"]
        self.assertEqual(len(error_events), 1)
        
        # Check that crash report file was created
        crash_dir = os.path.join(self.test_dir, "crashes")
        self.assertTrue(os.path.exists(crash_dir))
        crash_files = [f for f in os.listdir(crash_dir) if f.endswith('.json')]
        self.assertGreater(len(crash_files), 0)
    
    def test_diagnostic_info_collection(self):
        """Test that diagnostic information is collected"""
        diagnostic_info = self.crash_reporter._collect_diagnostic_info()
        
        self.assertIn("working_directory", diagnostic_info)
        self.assertIn("python_executable", diagnostic_info)
        self.assertIn("command_line_args", diagnostic_info)
        self.assertIn("environment_vars", diagnostic_info)


class TestTelemetryIntegration(unittest.TestCase):
    """Integration tests for the telemetry system"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
    
    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.test_dir, ignore_errors=True)
    
    def test_create_telemetry_system(self):
        """Test that telemetry system can be created successfully"""
        config, collector, crash_reporter = create_telemetry_system(self.test_dir)
        
        self.assertIsInstance(config, TelemetryConfig)
        self.assertIsInstance(collector, TelemetryCollector)
        self.assertIsInstance(crash_reporter, CrashReporter)
    
    def test_full_installation_simulation(self):
        """Test full installation simulation with telemetry"""
        config, collector, crash_reporter = create_telemetry_system(self.test_dir)
        
        # Enable telemetry
        config._config["telemetry_enabled"] = True
        config._config["error_reporting_enabled"] = True
        
        # Simulate installation flow
        collector.record_installation_start({"no_models": False})
        collector.record_installation_step("python_check", "completed")
        collector.record_installation_step("comfyui_install", "completed")
        
        # Simulate an error
        test_error = ConnectionError("Network error")
        collector.record_error(test_error, {"step": "model_download"}, "model_download")
        
        # Complete installation
        collector.record_installation_complete(False, 120.5, {"error": "network_error"})
        
        # Verify events were recorded
        self.assertGreater(len(collector.events), 0)
        
        # Verify telemetry file was created
        telemetry_dir = os.path.join(self.test_dir, "telemetry")
        if os.path.exists(telemetry_dir):
            telemetry_files = [f for f in os.listdir(telemetry_dir) if f.endswith('.json')]
            self.assertGreater(len(telemetry_files), 0)


if __name__ == '__main__':
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add test cases
    test_suite.addTest(unittest.makeSuite(TestTelemetryConfig))
    test_suite.addTest(unittest.makeSuite(TestTelemetryCollector))
    test_suite.addTest(unittest.makeSuite(TestCrashReporter))
    test_suite.addTest(unittest.makeSuite(TestTelemetryIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Exit with appropriate code
    sys.exit(0 if result.wasSuccessful() else 1)