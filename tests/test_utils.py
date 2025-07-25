"""
Shared test utilities and fixtures for DinoAir backend testing.

This module provides common fixtures, mock factories, and helper functions
that can be used across all test modules to ensure consistency and reduce
code duplication.
"""

import unittest
import time
import threading
import subprocess
import tempfile
import shutil
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
import json
import logging


class MockLogger:
    """Mock logger for testing."""
    
    def __init__(self):
        self.info_calls = []
        self.warning_calls = []
        self.error_calls = []
        self.debug_calls = []
    
    def info(self, message, *args, **kwargs):
        self.info_calls.append((message, args, kwargs))
    
    def warning(self, message, *args, **kwargs):
        self.warning_calls.append((message, args, kwargs))
    
    def error(self, message, *args, **kwargs):
        self.error_calls.append((message, args, kwargs))
    
    def debug(self, message, *args, **kwargs):
        self.debug_calls.append((message, args, kwargs))
    
    def clear(self):
        """Clear all logged calls."""
        self.info_calls.clear()
        self.warning_calls.clear()
        self.error_calls.clear()
        self.debug_calls.clear()


class MockProcess:
    """Mock subprocess.Popen for testing process management."""
    
    def __init__(self, pid=1234, returncode=None, stdout_data="", stderr_data=""):
        self.pid = pid
        self.returncode = returncode
        self.stdout_data = stdout_data
        self.stderr_data = stderr_data
        self.terminated = False
        self.killed = False
        self._stdout_lines = stdout_data.split('\n') if stdout_data else []
        self._stderr_lines = stderr_data.split('\n') if stderr_data else []
        self._stdout_index = 0
        self._stderr_index = 0
    
    def poll(self):
        """Return process return code if terminated, None if running."""
        return self.returncode
    
    def wait(self, timeout=None):
        """Wait for process to terminate."""
        if timeout:
            time.sleep(min(0.1, timeout))  # Simulate wait time
        return self.returncode or 0
    
    def terminate(self):
        """Terminate the process."""
        self.terminated = True
        self.returncode = 0
    
    def kill(self):
        """Kill the process."""
        self.killed = True
        self.returncode = -9
    
    def communicate(self, timeout=None):
        """Return stdout and stderr data."""
        return self.stdout_data, self.stderr_data
    
    def readline_stdout(self):
        """Simulate reading a line from stdout."""
        if self._stdout_index < len(self._stdout_lines):
            line = self._stdout_lines[self._stdout_index]
            self._stdout_index += 1
            return line
        return ""
    
    def readline_stderr(self):
        """Simulate reading a line from stderr."""
        if self._stderr_index < len(self._stderr_lines):
            line = self._stderr_lines[self._stderr_index]
            self._stderr_index += 1
            return line
        return ""


class MockHttpResponse:
    """Mock HTTP response for testing health checks."""
    
    def __init__(self, status_code=200, json_data=None, text="", elapsed_seconds=0.5):
        self.status_code = status_code
        self._json_data = json_data or {}
        self.text = text
        self.elapsed = Mock()
        self.elapsed.total_seconds.return_value = elapsed_seconds
    
    def json(self):
        """Return JSON data."""
        return self._json_data
    
    def raise_for_status(self):
        """Raise exception for bad status codes."""
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


class MockSocket:
    """Mock socket for testing TCP connections."""
    
    def __init__(self, connect_success=True, bind_success=True):
        self.connect_success = connect_success
        self.bind_success = bind_success
        self.connected = False
        self.bound = False
        self.closed = False
    
    def connect(self, address):
        """Mock socket connection."""
        if self.connect_success:
            self.connected = True
        else:
            raise ConnectionRefusedError("Connection refused")
    
    def bind(self, address):
        """Mock socket binding."""
        if self.bind_success:
            self.bound = True
        else:
            raise OSError("Address already in use")
    
    def close(self):
        """Mock socket close."""
        self.closed = True


class TestDataFactory:
    """Factory for creating test data objects."""
    
    @staticmethod
    def create_service_config(name="test_service", **kwargs):
        """Create a test service configuration."""
        from lib.process_manager.safe_process_manager import ServiceConfig
        
        defaults = {
            "name": name,
            "command": ["echo", "hello"],
            "working_dir": "/tmp",
            "port": None,
            "health_check_url": None,
            "health_check_interval": 30,
            "restart_on_failure": True,
            "max_restarts": 5,
            "restart_delay": 5,
            "dependencies": [],
            "environment": {},
            "timeout": 30
        }
        defaults.update(kwargs)
        return ServiceConfig(**defaults)
    
    @staticmethod
    def create_health_check_config(name="test_service", **kwargs):
        """Create a test health check configuration."""
        from lib.health_monitor.health_monitor import HealthCheckConfig, CheckType
        
        defaults = {
            "name": name,
            "check_type": CheckType.HTTP,
            "url": "http://localhost:8080/health",
            "interval": 30,
            "timeout": 10,
            "retries": 3,
            "failure_threshold": 3,
            "success_threshold": 2,
            "restart_enabled": True,
            "max_restarts": 5,
            "restart_window": 300
        }
        defaults.update(kwargs)
        return HealthCheckConfig(**defaults)
    
    @staticmethod
    def create_circuit_breaker_config(name="test_breaker", **kwargs):
        """Create a test circuit breaker configuration."""
        from lib.circuit_breaker.circuit_breaker import CircuitBreakerConfig
        
        defaults = {
            "name": name,
            "failure_threshold": 5,
            "recovery_timeout": 60,
            "expected_exception": Exception,
            "timeout": 30,
            "window_size": 100,
            "half_open_max_calls": 3
        }
        defaults.update(kwargs)
        return CircuitBreakerConfig(**defaults)


class TestFileManager:
    """Helper for managing temporary files and directories in tests."""
    
    def __init__(self):
        self.temp_dirs = []
        self.temp_files = []
    
    def create_temp_dir(self, prefix="test_"):
        """Create a temporary directory."""
        temp_dir = tempfile.mkdtemp(prefix=prefix)
        self.temp_dirs.append(temp_dir)
        return Path(temp_dir)
    
    def create_temp_file(self, content="", suffix=".txt", prefix="test_"):
        """Create a temporary file with content."""
        temp_file = tempfile.NamedTemporaryFile(
            mode='w', 
            suffix=suffix, 
            prefix=prefix, 
            delete=False
        )
        temp_file.write(content)
        temp_file.close()
        self.temp_files.append(temp_file.name)
        return Path(temp_file.name)
    
    def create_config_file(self, config_data, filename="config.json"):
        """Create a temporary configuration file."""
        temp_dir = self.create_temp_dir()
        config_file = temp_dir / filename
        with open(config_file, 'w') as f:
            json.dump(config_data, f, indent=2)
        return config_file
    
    def cleanup(self):
        """Clean up all temporary files and directories."""
        for temp_file in self.temp_files:
            try:
                Path(temp_file).unlink()
            except FileNotFoundError:
                pass
        
        for temp_dir in self.temp_dirs:
            try:
                shutil.rmtree(temp_dir)
            except FileNotFoundError:
                pass
        
        self.temp_files.clear()
        self.temp_dirs.clear()


class AsyncTestHelper:
    """Helper for testing async functionality."""
    
    @staticmethod
    def run_async_test(async_func, *args, **kwargs):
        """Run an async function in a test."""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(async_func(*args, **kwargs))
        finally:
            loop.close()


class TimingHelper:
    """Helper for testing timing-sensitive functionality."""
    
    def __init__(self):
        self.start_time = None
        self.end_time = None
    
    def start(self):
        """Start timing."""
        self.start_time = time.time()
    
    def stop(self):
        """Stop timing."""
        self.end_time = time.time()
    
    def elapsed(self):
        """Get elapsed time."""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return 0
    
    @staticmethod
    def wait_for_condition(condition_func, timeout=5.0, interval=0.1):
        """Wait for a condition to become true."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if condition_func():
                return True
            time.sleep(interval)
        return False


class MockPsutilProcess:
    """Mock psutil.Process for testing."""
    
    def __init__(self, pid=1234, name="test_process", status="running"):
        self.pid = pid
        self.info = {"pid": pid, "name": name, "status": status}
        self._name = name
        self._status = status
    
    def name(self):
        return self._name
    
    def status(self):
        return self._status
    
    def is_running(self):
        return self._status == "running"


class TestAssertions:
    """Additional assertion helpers for testing."""
    
    @staticmethod
    def assert_called_with_timeout(mock_obj, timeout=1.0):
        """Assert that a mock was called within a timeout."""
        start_time = time.time()
        while time.time() - start_time < timeout:
            if mock_obj.called:
                return True
            time.sleep(0.01)
        raise AssertionError(f"Mock was not called within {timeout} seconds")
    
    @staticmethod
    def assert_eventually_true(condition_func, timeout=5.0, message="Condition did not become true"):
        """Assert that a condition eventually becomes true."""
        if not TimingHelper.wait_for_condition(condition_func, timeout):
            raise AssertionError(f"{message} within {timeout} seconds")
    
    @staticmethod
    def assert_log_contains(mock_logger, level, message_part):
        """Assert that a mock logger contains a specific message."""
        calls = getattr(mock_logger, f"{level}_calls", [])
        for call_args in calls:
            if message_part in str(call_args[0]):
                return True
        raise AssertionError(f"Logger {level} calls do not contain '{message_part}'")


class BaseTestCase(unittest.TestCase):
    """Base test case with common setup and utilities."""
    
    def setUp(self):
        """Set up common test fixtures."""
        self.mock_logger = MockLogger()
        self.file_manager = TestFileManager()
        self.timing_helper = TimingHelper()
        self.maxDiff = None  # Show full diff for failed assertions
    
    def tearDown(self):
        """Clean up after tests."""
        self.file_manager.cleanup()
    
    def create_mock_process(self, **kwargs):
        """Create a mock process with default values."""
        return MockProcess(**kwargs)
    
    def create_mock_response(self, **kwargs):
        """Create a mock HTTP response with default values."""
        return MockHttpResponse(**kwargs)
    
    def create_mock_socket(self, **kwargs):
        """Create a mock socket with default values."""
        return MockSocket(**kwargs)
    
    def assert_eventually_true(self, condition_func, timeout=5.0, message="Condition did not become true"):
        """Assert that a condition eventually becomes true."""
        TestAssertions.assert_eventually_true(condition_func, timeout, message)
    
    def assert_log_contains(self, level, message_part):
        """Assert that the mock logger contains a specific message."""
        TestAssertions.assert_log_contains(self.mock_logger, level, message_part)


# Common test fixtures that can be imported
def get_sample_service_configs():
    """Get sample service configurations for testing."""
    return [
        TestDataFactory.create_service_config(
            name="web_service",
            command=["python", "-m", "http.server", "8080"],
            port=8080,
            health_check_url="http://localhost:8080"
        ),
        TestDataFactory.create_service_config(
            name="database",
            command=["python", "-c", "import time; time.sleep(100)"],
            dependencies=[]
        ),
        TestDataFactory.create_service_config(
            name="api_service",
            command=["python", "-m", "api"],
            dependencies=["database"],
            port=3000
        )
    ]


def get_sample_health_check_configs():
    """Get sample health check configurations for testing."""
    from lib.health_monitor.health_monitor import CheckType
    
    return [
        TestDataFactory.create_health_check_config(
            name="web_service",
            check_type=CheckType.HTTP,
            url="http://localhost:8080/health"
        ),
        TestDataFactory.create_health_check_config(
            name="tcp_service",
            check_type=CheckType.TCP,
            host="localhost",
            port=9000
        ),
        TestDataFactory.create_health_check_config(
            name="process_service",
            check_type=CheckType.PROCESS,
            process_name="test_process"
        )
    ]


def get_sample_circuit_breaker_configs():
    """Get sample circuit breaker configurations for testing."""
    return [
        TestDataFactory.create_circuit_breaker_config(
            name="fast_service",
            failure_threshold=3,
            recovery_timeout=30
        ),
        TestDataFactory.create_circuit_breaker_config(
            name="slow_service",
            failure_threshold=5,
            recovery_timeout=120,
            timeout=60
        ),
        TestDataFactory.create_circuit_breaker_config(
            name="critical_service",
            failure_threshold=2,
            recovery_timeout=300,
            expected_exception=ConnectionError
        )
    ]