"""
Test memory leak fixes implementation
"""

import pytest
import time
import threading
import subprocess
from unittest.mock import Mock, patch, MagicMock
from lib.process_manager.safe_process_manager import (
    ProcessManager, 
    ManagedService, 
    ServiceConfig,
    ServiceStatus
)


class TestMemoryLeakFixes:
    """Test that memory leak fixes are working correctly"""

    def test_bounded_metric_history(self):
        """Test that metric history arrays don't grow unbounded"""
        # Mock logger to avoid logging setup
        mock_logger = Mock()
        config = ServiceConfig(name="test", command=["echo", "test"])
        service = ManagedService(config, mock_logger)
        
        # Add more than 60 samples to test bounds
        for i in range(100):
            service._update_metric_history(service.cpu_usage_history, i)
        
        # Should be limited to 60 samples max
        assert len(service.cpu_usage_history) <= 60
        assert service.cpu_usage_history[-1] == 99  # Last value preserved
        
    def test_monitor_thread_cleanup(self):
        """Test that monitor threads are properly cleaned up"""
        mock_logger = Mock()
        config = ServiceConfig(name="test", command=["echo", "test"])
        service = ManagedService(config, mock_logger)
        
        # Mock process and start service 
        with patch('subprocess.Popen') as mock_popen:
            mock_process = Mock()
            mock_process.pid = 12345
            mock_process.poll.return_value = None  # Running
            mock_process.stdout = Mock()
            mock_process.stderr = Mock()
            mock_popen.return_value = mock_process
            service.process = mock_process
            
            # Start monitoring thread
            service.status = ServiceStatus.RUNNING
            service.start_time = time.time()
            service._stop_event.clear()
            service._monitor_thread = threading.Thread(
                target=service._monitor_process,
                name=f"{service.config.name}_monitor"
            )
            service._monitor_thread.start()
            
            # Wait a moment for thread to start
            time.sleep(0.1)
            
            # Stop service
            service.stop()
            
            # Monitor thread should be stopped
            assert not service._monitor_thread.is_alive()
            
    def test_stream_cleanup_on_error(self):
        """Test that streams are cleaned up on errors"""
        mock_logger = Mock()
        config = ServiceConfig(name="test", command=["echo", "test"])
        service = ManagedService(config, mock_logger)
        
        # Mock process with streams
        mock_process = Mock()
        mock_stdout = Mock()
        mock_stderr = Mock()
        mock_stdin = Mock()
        
        mock_process.stdout = mock_stdout
        mock_process.stderr = mock_stderr  
        mock_process.stdin = mock_stdin
        mock_process.wait.return_value = 0  # Simulate successful wait
        mock_process.poll.return_value = 0  # Process has terminated
        
        service.process = mock_process
        service.status = ServiceStatus.RUNNING  # Set to running so stop() will execute
        
        # Stop service - should close all streams
        service.stop()
        
        # Verify streams were closed
        mock_stdout.close.assert_called_once()
        mock_stderr.close.assert_called_once()
        mock_stdin.close.assert_called_once()
        
    def test_process_manager_cleanup_on_exit(self):
        """Test that ProcessManager cleans up on exit"""
        with patch('atexit.register') as mock_atexit:
            manager = ProcessManager()
            
            # Should register cleanup function
            mock_atexit.assert_called_once()
            cleanup_func = mock_atexit.call_args[0][0]
            
            # Add a service
            config = ServiceConfig(name="test", command=["echo", "test"])
            manager.add_service(config)
            
            # Mock the service's stop method
            with patch.object(manager.services["test"], 'stop') as mock_stop:
                # Call cleanup function
                cleanup_func()
                
                # Should stop all services
                mock_stop.assert_called_once()
                
    def test_restart_prevents_zombie_threads(self):
        """Test that restart properly cleans up old threads"""
        mock_logger = Mock()
        config = ServiceConfig(name="test", command=["echo", "test"])
        service = ManagedService(config, mock_logger)
        
        with patch('subprocess.Popen') as mock_popen:
            mock_process = Mock()
            mock_process.pid = 12345
            mock_process.poll.return_value = None
            mock_process.wait.return_value = 0
            mock_process.stdout = Mock()
            mock_process.stderr = Mock() 
            mock_process.stdin = Mock()
            mock_popen.return_value = mock_process
            
            # Mock successful start
            with patch.object(service, '_is_port_available', return_value=True):
                # Override config restart delay to speed up test
                service.config.restart_delay_seconds = 0
                
                service.start()
                time.sleep(0.1)  # Let thread start
                
                old_thread = service._monitor_thread
                old_thread_name = old_thread.name if old_thread else None
                
                # Stop the service manually to see cleanup
                service.stop()
                time.sleep(0.1)  # Let thread stop
                
                # Verify old thread is dead
                if old_thread:
                    assert not old_thread.is_alive()
                
                # Start again - should have new thread
                service.start()
                time.sleep(0.1)  # Let new thread start
                
                new_thread = service._monitor_thread
                
                # Should have a running new thread
                if new_thread:
                    assert new_thread.is_alive()
                    # Verify it's a different thread object (different identity)
                    if old_thread:
                        assert new_thread is not old_thread, "Should be a new thread object"
                        
                service.stop()
                
    def test_read_process_output_handles_closed_streams(self):
        """Test that _read_process_output handles closed streams gracefully"""
        mock_logger = Mock()
        config = ServiceConfig(name="test", command=["echo", "test"])
        service = ManagedService(config, mock_logger)
        
        # Mock process with closed streams
        mock_process = Mock()
        mock_stdout = Mock()
        mock_stderr = Mock()
        
        # Simulate closed streams
        mock_stdout.closed = True
        mock_stderr.closed = True
        mock_stdout.readline.side_effect = ValueError("I/O operation on closed file")
        mock_stderr.readline.side_effect = ValueError("I/O operation on closed file")
        
        mock_process.stdout = mock_stdout
        mock_process.stderr = mock_stderr
        
        service.process = mock_process
        
        # Should not raise exception
        service._read_process_output()
        
        # Should not have called readline on closed streams
        assert not mock_stdout.readline.called
        assert not mock_stderr.readline.called


if __name__ == "__main__":
    pytest.main([__file__])