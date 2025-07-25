"""
Comprehensive integration tests for the safe_process_manager module.

This test suite covers all major functionality of the ProcessManager and ManagedService classes
with proper mocking of external dependencies and process management.
"""

import unittest
import time
import threading
import subprocess
import signal
import json
from unittest.mock import Mock, patch, MagicMock, call
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

# Import the modules under test
from lib.process_manager.safe_process_manager import (
    ProcessManager,
    ManagedService,
    ServiceConfig,
    ServiceStatus,
    create_default_config
)


class TestServiceConfig(unittest.TestCase):
    """Test the ServiceConfig dataclass."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = ServiceConfig(
            name="test_service",
            command=["python", "-m", "test_module"],
            working_dir="/test/dir"
        )
        
        self.assertEqual(config.name, "test_service")
        self.assertEqual(config.command, ["python", "-m", "test_module"])
        self.assertEqual(config.working_dir, "/test/dir")
        self.assertEqual(config.port, None)
        self.assertEqual(config.health_check_url, None)
        self.assertEqual(config.health_check_interval, 30)
        self.assertEqual(config.restart_on_failure, True)
        self.assertEqual(config.max_restarts, 5)
        self.assertEqual(config.restart_delay, 5)
        self.assertEqual(config.dependencies, [])
        self.assertEqual(config.environment, {})
        self.assertEqual(config.timeout, 30)

    def test_custom_config(self):
        """Test custom configuration values."""
        config = ServiceConfig(
            name="custom_service",
            command=["node", "server.js"],
            working_dir="/custom/dir",
            port=8080,
            health_check_url="http://localhost:8080/health",
            health_check_interval=60,
            restart_on_failure=False,
            max_restarts=3,
            restart_delay=10,
            dependencies=["database", "redis"],
            environment={"NODE_ENV": "production"},
            timeout=60
        )
        
        self.assertEqual(config.name, "custom_service")
        self.assertEqual(config.command, ["node", "server.js"])
        self.assertEqual(config.working_dir, "/custom/dir")
        self.assertEqual(config.port, 8080)
        self.assertEqual(config.health_check_url, "http://localhost:8080/health")
        self.assertEqual(config.health_check_interval, 60)
        self.assertEqual(config.restart_on_failure, False)
        self.assertEqual(config.max_restarts, 3)
        self.assertEqual(config.restart_delay, 10)
        self.assertEqual(config.dependencies, ["database", "redis"])
        self.assertEqual(config.environment, {"NODE_ENV": "production"})
        self.assertEqual(config.timeout, 60)


class TestManagedService(unittest.TestCase):
    """Test the ManagedService class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_logger = Mock()
        self.config = ServiceConfig(
            name="test_service",
            command=["python", "-c", "import time; time.sleep(10)"],
            working_dir="/tmp"
        )
        self.service = ManagedService(self.config, self.mock_logger)

    def tearDown(self):
        """Clean up after tests."""
        if hasattr(self.service, 'process') and self.service.process:
            try:
                self.service.stop()
            except:
                pass

    def test_initialization(self):
        """Test ManagedService initialization."""
        self.assertEqual(self.service.config, self.config)
        self.assertEqual(self.service.logger, self.mock_logger)
        self.assertEqual(self.service.status, ServiceStatus.STOPPED)
        self.assertIsNone(self.service.process)
        self.assertEqual(self.service.restart_count, 0)
        self.assertIsNone(self.service.last_restart)
        self.assertIsNone(self.service.monitor_thread)
        self.assertFalse(self.service.monitoring)

    @patch('subprocess.Popen')
    def test_start_success(self, mock_popen):
        """Test successful service start."""
        # Mock successful process start
        mock_process = Mock()
        mock_process.pid = 1234
        mock_process.poll.return_value = None  # Process is running
        mock_popen.return_value = mock_process
        
        result = self.service.start()
        
        self.assertTrue(result)
        self.assertEqual(self.service.status, ServiceStatus.RUNNING)
        self.assertEqual(self.service.process, mock_process)
        self.assertTrue(self.service.monitoring)
        self.assertIsNotNone(self.service.monitor_thread)
        
        mock_popen.assert_called_once_with(
            self.config.command,
            cwd=self.config.working_dir,
            env=unittest.mock.ANY,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )

    @patch('subprocess.Popen')
    def test_start_failure(self, mock_popen):
        """Test failed service start."""
        # Mock failed process start
        mock_popen.side_effect = subprocess.SubprocessError("Failed to start")
        
        result = self.service.start()
        
        self.assertFalse(result)
        self.assertEqual(self.service.status, ServiceStatus.FAILED)
        self.assertIsNone(self.service.process)
        self.mock_logger.error.assert_called()

    def test_start_already_running(self):
        """Test starting service that's already running."""
        # Set service as already running
        self.service.status = ServiceStatus.RUNNING
        self.service.process = Mock()
        
        result = self.service.start()
        
        self.assertTrue(result)
        self.mock_logger.warning.assert_called()

    @patch('subprocess.Popen')
    def test_stop_success(self, mock_popen):
        """Test successful service stop."""
        # Set up running service
        mock_process = Mock()
        mock_process.pid = 1234
        mock_process.poll.return_value = None
        mock_process.terminate.return_value = None
        mock_process.wait.return_value = 0
        mock_popen.return_value = mock_process
        
        # Start the service first
        self.service.start()
        
        # Stop the service
        result = self.service.stop()
        
        self.assertTrue(result)
        self.assertEqual(self.service.status, ServiceStatus.STOPPED)
        self.assertFalse(self.service.monitoring)
        mock_process.terminate.assert_called_once()

    def test_stop_not_running(self):
        """Test stopping service that's not running."""
        result = self.service.stop()
        
        self.assertTrue(result)
        self.mock_logger.warning.assert_called()

    @patch('subprocess.Popen')
    def test_restart_success(self, mock_popen):
        """Test successful service restart."""
        # Mock process
        mock_process = Mock()
        mock_process.pid = 1234
        mock_process.poll.return_value = None
        mock_process.terminate.return_value = None
        mock_process.wait.return_value = 0
        mock_popen.return_value = mock_process
        
        # Start service first
        self.service.start()
        initial_restart_count = self.service.restart_count
        
        # Restart service
        result = self.service.restart()
        
        self.assertTrue(result)
        self.assertEqual(self.service.status, ServiceStatus.RUNNING)
        self.assertEqual(self.service.restart_count, initial_restart_count + 1)
        self.assertIsNotNone(self.service.last_restart)

    def test_get_stats(self):
        """Test getting service statistics."""
        # Set up some test data
        self.service.status = ServiceStatus.RUNNING
        self.service.restart_count = 3
        self.service.last_restart = datetime.now()
        
        stats = self.service.get_stats()
        
        self.assertEqual(stats["name"], self.config.name)
        self.assertEqual(stats["status"], "RUNNING")
        self.assertEqual(stats["restart_count"], 3)
        self.assertIsNotNone(stats["last_restart"])
        self.assertIn("uptime", stats)

    @patch('socket.socket')
    def test_is_port_available_true(self, mock_socket_class):
        """Test port availability check when port is available."""
        mock_socket = Mock()
        mock_socket_class.return_value = mock_socket
        mock_socket.bind.return_value = None
        
        result = self.service._is_port_available(8080)
        
        self.assertTrue(result)
        mock_socket.bind.assert_called_once_with(('localhost', 8080))
        mock_socket.close.assert_called_once()

    @patch('socket.socket')
    def test_is_port_available_false(self, mock_socket_class):
        """Test port availability check when port is not available."""
        mock_socket = Mock()
        mock_socket_class.return_value = mock_socket
        mock_socket.bind.side_effect = OSError("Port already in use")
        
        result = self.service._is_port_available(8080)
        
        self.assertFalse(result)
        mock_socket.close.assert_called_once()


class TestProcessManager(unittest.TestCase):
    """Test the ProcessManager class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.manager = ProcessManager()

    def tearDown(self):
        """Clean up after tests."""
        try:
            self.manager.stop_all()
        except:
            pass

    def test_initialization(self):
        """Test ProcessManager initialization."""
        self.assertEqual(self.manager.services, {})
        self.assertIsNotNone(self.manager.logger)

    def test_add_service(self):
        """Test adding a service."""
        config = ServiceConfig(
            name="test_service",
            command=["echo", "hello"],
            working_dir="/tmp"
        )
        
        self.manager.add_service(config)
        
        self.assertIn("test_service", self.manager.services)
        self.assertEqual(self.manager.services["test_service"].config, config)

    def test_add_duplicate_service(self):
        """Test adding duplicate service overwrites."""
        config1 = ServiceConfig(
            name="test_service",
            command=["echo", "hello1"],
            working_dir="/tmp"
        )
        config2 = ServiceConfig(
            name="test_service",
            command=["echo", "hello2"],
            working_dir="/tmp"
        )
        
        self.manager.add_service(config1)
        self.manager.add_service(config2)
        
        self.assertEqual(len(self.manager.services), 1)
        self.assertEqual(self.manager.services["test_service"].config.command, ["echo", "hello2"])

    @patch('subprocess.Popen')
    def test_start_service_success(self, mock_popen):
        """Test successful service start."""
        # Mock process
        mock_process = Mock()
        mock_process.pid = 1234
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process
        
        # Add service
        config = ServiceConfig(
            name="test_service",
            command=["echo", "hello"],
            working_dir="/tmp"
        )
        self.manager.add_service(config)
        
        # Start service
        result = self.manager.start_service("test_service")
        
        self.assertTrue(result)

    def test_start_nonexistent_service(self):
        """Test starting non-existent service."""
        result = self.manager.start_service("nonexistent")
        
        self.assertFalse(result)

    @patch('subprocess.Popen')
    def test_stop_service_success(self, mock_popen):
        """Test successful service stop."""
        # Mock process
        mock_process = Mock()
        mock_process.pid = 1234
        mock_process.poll.return_value = None
        mock_process.terminate.return_value = None
        mock_process.wait.return_value = 0
        mock_popen.return_value = mock_process
        
        # Add and start service
        config = ServiceConfig(
            name="test_service",
            command=["echo", "hello"],
            working_dir="/tmp"
        )
        self.manager.add_service(config)
        self.manager.start_service("test_service")
        
        # Stop service
        result = self.manager.stop_service("test_service")
        
        self.assertTrue(result)

    def test_stop_nonexistent_service(self):
        """Test stopping non-existent service."""
        result = self.manager.stop_service("nonexistent")
        
        self.assertFalse(result)

    @patch('subprocess.Popen')
    def test_restart_service_success(self, mock_popen):
        """Test successful service restart."""
        # Mock process
        mock_process = Mock()
        mock_process.pid = 1234
        mock_process.poll.return_value = None
        mock_process.terminate.return_value = None
        mock_process.wait.return_value = 0
        mock_popen.return_value = mock_process
        
        # Add and start service
        config = ServiceConfig(
            name="test_service",
            command=["echo", "hello"],
            working_dir="/tmp"
        )
        self.manager.add_service(config)
        self.manager.start_service("test_service")
        
        # Restart service
        result = self.manager.restart_service("test_service")
        
        self.assertTrue(result)

    def test_restart_nonexistent_service(self):
        """Test restarting non-existent service."""
        result = self.manager.restart_service("nonexistent")
        
        self.assertFalse(result)

    @patch('subprocess.Popen')
    def test_start_all_with_dependencies(self, mock_popen):
        """Test starting all services with dependency resolution."""
        # Mock process
        mock_process = Mock()
        mock_process.pid = 1234
        mock_process.poll.return_value = None
        mock_popen.return_value = mock_process
        
        # Add services with dependencies
        config1 = ServiceConfig(
            name="database",
            command=["echo", "db"],
            working_dir="/tmp"
        )
        config2 = ServiceConfig(
            name="api",
            command=["echo", "api"],
            working_dir="/tmp",
            dependencies=["database"]
        )
        
        self.manager.add_service(config1)
        self.manager.add_service(config2)
        
        # Start all services
        self.manager.start_all()
        
        # Both services should be running
        self.assertEqual(self.manager.services["database"].status, ServiceStatus.RUNNING)
        self.assertEqual(self.manager.services["api"].status, ServiceStatus.RUNNING)

    def test_get_status(self):
        """Test getting status of all services."""
        # Add a service
        config = ServiceConfig(
            name="test_service",
            command=["echo", "hello"],
            working_dir="/tmp"
        )
        self.manager.add_service(config)
        
        status = self.manager.get_status()
        
        self.assertIn("test_service", status)
        self.assertEqual(status["test_service"]["status"], "STOPPED")

    @patch('json.load')
    @patch('builtins.open')
    def test_load_config(self, mock_open, mock_json_load):
        """Test loading configuration from file."""
        # Mock config file content
        mock_config = {
            "services": [
                {
                    "name": "test_service",
                    "command": ["echo", "hello"],
                    "working_dir": "/tmp"
                }
            ]
        }
        mock_json_load.return_value = mock_config
        
        config_file = Path("/test/config.json")
        self.manager.load_config(config_file)
        
        self.assertIn("test_service", self.manager.services)
        mock_open.assert_called_once_with(config_file, 'r')


class TestCreateDefaultConfig(unittest.TestCase):
    """Test the create_default_config function."""
    
    def test_create_default_config(self):
        """Test creating default configuration."""
        config = create_default_config()
        
        self.assertIn("services", config)
        self.assertIsInstance(config["services"], list)
        
        # Check for expected services
        service_names = [service["name"] for service in config["services"]]
        self.assertIn("comfyui", service_names)
        self.assertIn("ollama", service_names)
        self.assertIn("web_gui", service_names)
        
        # Verify service structure
        for service in config["services"]:
            self.assertIn("name", service)
            self.assertIn("command", service)
            self.assertIn("working_dir", service)


class TestProcessManagerIntegration(unittest.TestCase):
    """Integration tests for ProcessManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.manager = ProcessManager()

    def tearDown(self):
        """Clean up after tests."""
        try:
            self.manager.stop_all()
        except:
            pass

    @patch('subprocess.Popen')
    def test_full_lifecycle(self, mock_popen):
        """Test complete service lifecycle."""
        # Mock process
        mock_process = Mock()
        mock_process.pid = 1234
        mock_process.poll.return_value = None
        mock_process.terminate.return_value = None
        mock_process.wait.return_value = 0
        mock_popen.return_value = mock_process
        
        # Add service
        config = ServiceConfig(
            name="test_service",
            command=["echo", "hello"],
            working_dir="/tmp"
        )
        self.manager.add_service(config)
        
        # Test lifecycle: start -> restart -> stop
        self.assertTrue(self.manager.start_service("test_service"))
        self.assertEqual(self.manager.services["test_service"].status, ServiceStatus.RUNNING)
        
        self.assertTrue(self.manager.restart_service("test_service"))
        self.assertEqual(self.manager.services["test_service"].status, ServiceStatus.RUNNING)
        
        self.assertTrue(self.manager.stop_service("test_service"))
        self.assertEqual(self.manager.services["test_service"].status, ServiceStatus.STOPPED)


if __name__ == "__main__":
    unittest.main()