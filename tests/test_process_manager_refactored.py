#!/usr/bin/env python3
"""
Tests for the refactored process manager functions
"""

import sys
import os
import unittest
import time
import threading
from unittest.mock import patch, Mock, MagicMock, call
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from lib.process_manager.safe_process_manager import (
    ManagedService, ProcessManager, ServiceConfig, ServiceStatus
)

class TestManagedServiceRefactored(unittest.TestCase):
    """Test suite for refactored ManagedService methods"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.config = ServiceConfig(
            name="test_service",
            command=["python", "-c", "print('test')"],
            max_memory_mb=1024,
            max_cpu_percent=50
        )
        self.logger = Mock()
        self.service = ManagedService(self.config, self.logger)
        
        # Mock process
        self.mock_process = Mock()
        self.service.process = self.mock_process
    
    def test_check_process_status_running(self):
        """Test process status check when process is running"""
        self.mock_process.poll.return_value = None  # Still running
        
        result = self.service._check_process_status()
        
        self.assertTrue(result)
        self.assertEqual(self.service.status, ServiceStatus.STOPPED)  # Status unchanged
    
    def test_check_process_status_stopped_no_restart(self):
        """Test process status check when process stopped and no restart configured"""
        self.mock_process.poll.return_value = 0  # Process has stopped
        self.service.config.restart_on_failure = False
        
        result = self.service._check_process_status()
        
        self.assertFalse(result)
        self.assertEqual(self.service.status, ServiceStatus.FAILED)
        self.logger.error.assert_called_once()
    
    @patch.object(ManagedService, 'restart')
    def test_check_process_status_stopped_with_restart(self, mock_restart):
        """Test process status check when process stopped and restart is configured"""
        self.mock_process.poll.return_value = 0  # Process has stopped
        self.service.config.restart_on_failure = True
        self.service.config.max_restart_attempts = 3
        self.service.restart_count = 1
        
        result = self.service._check_process_status()
        
        self.assertFalse(result)
        self.assertEqual(self.service.status, ServiceStatus.FAILED)
        self.assertEqual(self.service.restart_count, 2)
        mock_restart.assert_called_once()
    
    @patch('psutil.Process')
    def test_collect_resource_metrics_success(self, mock_psutil_process):
        """Test successful resource metrics collection"""
        self.mock_process.pid = 1234
        
        # Mock psutil.Process
        mock_proc = Mock()
        mock_proc.cpu_percent.return_value = 25.5
        mock_proc.memory_info.return_value = Mock(rss=512 * 1024 * 1024)  # 512MB
        mock_psutil_process.return_value = mock_proc
        
        cpu_percent, memory_mb = self.service._collect_resource_metrics()
        
        self.assertEqual(cpu_percent, 25.5)
        self.assertEqual(memory_mb, 512.0)
        mock_psutil_process.assert_called_once_with(1234)
        mock_proc.cpu_percent.assert_called_once_with(interval=1)
    
    @patch('psutil.Process')
    def test_collect_resource_metrics_no_such_process(self, mock_psutil_process):
        """Test resource metrics collection when process doesn't exist"""
        import psutil
        mock_psutil_process.side_effect = psutil.NoSuchProcess(1234)
        
        cpu_percent, memory_mb = self.service._collect_resource_metrics()
        
        self.assertIsNone(cpu_percent)
        self.assertIsNone(memory_mb)
    
    def test_update_metric_history_normal(self):
        """Test updating metric history with normal operation"""
        history = []
        
        # Add some values
        for i in range(5):
            self.service._update_metric_history(history, i)
        
        self.assertEqual(history, [0, 1, 2, 3, 4])
    
    def test_update_metric_history_limit(self):
        """Test updating metric history when limit is reached"""
        history = list(range(60))  # Fill to capacity
        
        self.service._update_metric_history(history, 100)
        
        self.assertEqual(len(history), 60)
        self.assertEqual(history[0], 1)  # First element removed
        self.assertEqual(history[-1], 100)  # New element added
    
    def test_check_resource_limits_within_limits(self):
        """Test resource limit checking when within limits"""
        self.service._check_resource_limits(30, 500)  # Within limits
        
        self.logger.warning.assert_not_called()
    
    def test_check_resource_limits_memory_exceeded(self):
        """Test resource limit checking when memory exceeded"""
        self.service._check_resource_limits(30, 2048)  # Memory exceeded
        
        self.logger.warning.assert_called_once()
        warning_call = self.logger.warning.call_args[0][0]
        self.assertIn("exceeds memory limit", warning_call)
    
    def test_check_resource_limits_cpu_exceeded(self):
        """Test resource limit checking when CPU exceeded"""
        self.service._check_resource_limits(80, 500)  # CPU exceeded
        
        self.logger.warning.assert_called_once()
        warning_call = self.logger.warning.call_args[0][0]
        self.assertIn("exceeds CPU limit", warning_call)
    
    def test_should_perform_health_check_no_command(self):
        """Test health check timing when no health check command configured"""
        self.service.config.health_check_cmd = None
        
        result = self.service._should_perform_health_check()
        
        self.assertFalse(result)
    
    @patch('time.time')
    def test_should_perform_health_check_not_time(self, mock_time):
        """Test health check timing when it's not time yet"""
        self.service.config.health_check_cmd = ["curl", "http://localhost"]
        self.service.config.health_check_interval = 30
        mock_time.return_value = 45.5  # Not a health check time
        
        result = self.service._should_perform_health_check()
        
        self.assertFalse(result)
    
    @patch('time.time')
    def test_should_perform_health_check_is_time(self, mock_time):
        """Test health check timing when it's time to check"""
        self.service.config.health_check_cmd = ["curl", "http://localhost"]
        self.service.config.health_check_interval = 30
        mock_time.return_value = 60.0  # Exactly at health check time
        
        result = self.service._should_perform_health_check()
        
        self.assertTrue(result)

class TestProcessManagerRefactored(unittest.TestCase):
    """Test suite for refactored ProcessManager methods"""
    
    def setUp(self):
        """Set up test fixtures"""
        with patch.object(ProcessManager, '_setup_logging'):
            self.manager = ProcessManager()
            self.manager.logger = Mock()  # Mock the logger
        
        # Add some test services
        config1 = ServiceConfig(name="service1", command=["echo", "test1"])
        config2 = ServiceConfig(name="service2", command=["echo", "test2"], depends_on=["service1"])
        config3 = ServiceConfig(name="service3", command=["echo", "test3"])
        
        self.manager.add_service(config1)
        self.manager.add_service(config2)
        self.manager.add_service(config3)
    
    @patch('queue.Queue.get')
    def test_process_command_queue_empty(self, mock_get):
        """Test command queue processing when empty"""
        import queue
        mock_get.side_effect = queue.Empty()
        
        # Should not raise exception
        self.manager._process_command_queue()
        
        mock_get.assert_called_once_with(timeout=1)
    
    @patch('queue.Queue.get')
    @patch.object(ProcessManager, '_handle_command')
    def test_process_command_queue_with_command(self, mock_handle_command, mock_get):
        """Test command queue processing with a command"""
        test_command = {"action": "start", "service": "test_service"}
        mock_get.return_value = test_command
        
        self.manager._process_command_queue()
        
        mock_handle_command.assert_called_once_with(test_command)
    
    @patch('psutil.virtual_memory')
    def test_monitor_system_resources_normal(self, mock_virtual_memory):
        """Test system resource monitoring under normal conditions"""
        mock_memory = Mock()
        mock_memory.percent = 50.0
        mock_virtual_memory.return_value = mock_memory
        
        self.manager._monitor_system_resources()
        
        # Should not log any warnings
        self.manager.logger.warning.assert_not_called()
    
    @patch('psutil.virtual_memory')
    def test_monitor_system_resources_critical(self, mock_virtual_memory):
        """Test system resource monitoring under critical conditions"""
        mock_memory = Mock()
        mock_memory.percent = 95.0
        mock_virtual_memory.return_value = mock_memory
        
        self.manager._monitor_system_resources()
        
        # Should log a warning
        self.manager.logger.warning.assert_called_once()
        warning_call = self.manager.logger.warning.call_args[0][0]
        self.assertIn("System memory critical", warning_call)
    
    @patch('time.time')
    @patch.object(ProcessManager, '_save_status')
    def test_perform_periodic_tasks_not_time(self, mock_save_status, mock_time):
        """Test periodic tasks when it's not time to save"""
        mock_time.return_value = 45.5  # Not a minute boundary
        
        self.manager._perform_periodic_tasks()
        
        mock_save_status.assert_not_called()
    
    @patch('time.time')
    @patch.object(ProcessManager, '_save_status')
    def test_perform_periodic_tasks_is_time(self, mock_save_status, mock_time):
        """Test periodic tasks when it's time to save"""
        mock_time.return_value = 60.0  # Exactly at minute boundary
        
        self.manager._perform_periodic_tasks()
        
        mock_save_status.assert_called_once()
    
    @patch.object(ProcessManager, 'start_service')
    def test_start_service_with_dependencies_no_deps(self, mock_start_service):
        """Test starting service with no dependencies"""
        mock_start_service.return_value = True
        started = set()
        
        result = self.manager._start_service_with_dependencies("service3", started)
        
        self.assertTrue(result)
        self.assertIn("service3", started)
        mock_start_service.assert_called_once_with("service3")
    
    @patch.object(ProcessManager, 'start_service')
    def test_start_service_with_dependencies_with_deps(self, mock_start_service):
        """Test starting service with dependencies"""
        mock_start_service.return_value = True
        started = set()
        
        result = self.manager._start_service_with_dependencies("service2", started)
        
        self.assertTrue(result)
        self.assertIn("service1", started)  # Dependency started first
        self.assertIn("service2", started)
        self.assertEqual(mock_start_service.call_count, 2)
        
        # Check call order: dependency first
        calls = mock_start_service.call_args_list
        self.assertEqual(calls[0][0][0], "service1")
        self.assertEqual(calls[1][0][0], "service2")
    
    @patch.object(ProcessManager, 'start_service')
    def test_start_service_with_dependencies_already_started(self, mock_start_service):
        """Test starting service when already started"""
        started = {"service1"}
        
        result = self.manager._start_service_with_dependencies("service1", started)
        
        self.assertTrue(result)
        mock_start_service.assert_not_called()  # Should not start again
    
    def test_start_service_with_dependencies_nonexistent(self):
        """Test starting nonexistent service"""
        started = set()
        
        result = self.manager._start_service_with_dependencies("nonexistent", started)
        
        self.assertFalse(result)
        self.assertEqual(len(started), 0)

if __name__ == '__main__':
    unittest.main()