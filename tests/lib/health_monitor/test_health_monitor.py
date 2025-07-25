"""
Comprehensive unit tests for the health_monitor module.

This test suite covers all major functionality of the HealthMonitor class
with proper mocking of external dependencies.
"""

import pytest
import asyncio
import threading
import time
from unittest.mock import Mock, patch, MagicMock, call
from datetime import datetime, timedelta
from typing import Dict, Any

# Import the modules under test
from lib.health_monitor.health_monitor import (
    HealthMonitor,
    HealthCheckConfig,
    HealthCheckResult,
    ServiceHealth,
    ServiceStatus,
    CheckType,
    get_dinoair_health_checks
)


class TestHealthCheckConfig:
    """Test the HealthCheckConfig dataclass."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = HealthCheckConfig(
            name="test_service",
            check_type=CheckType.HTTP,
            url="http://localhost:8080/health"
        )
        
        assert config.name == "test_service"
        assert config.check_type == CheckType.HTTP
        assert config.url == "http://localhost:8080/health"
        assert config.interval == 30
        assert config.timeout == 10
        assert config.retries == 3
        assert config.failure_threshold == 3
        assert config.success_threshold == 2
        assert config.restart_enabled is True
        assert config.max_restarts == 5
        assert config.restart_window == 300

    def test_custom_config(self):
        """Test custom configuration values."""
        config = HealthCheckConfig(
            name="custom_service",
            check_type=CheckType.TCP,
            host="localhost",
            port=9000,
            interval=60,
            timeout=5,
            retries=2,
            failure_threshold=2,
            success_threshold=1,
            restart_enabled=False,
            max_restarts=3,
            restart_window=600
        )
        
        assert config.name == "custom_service"
        assert config.check_type == CheckType.TCP
        assert config.host == "localhost"
        assert config.port == 9000
        assert config.interval == 60
        assert config.timeout == 5
        assert config.retries == 2
        assert config.failure_threshold == 2
        assert config.success_threshold == 1
        assert config.restart_enabled is False
        assert config.max_restarts == 3
        assert config.restart_window == 600


class TestHealthCheckResult:
    """Test the HealthCheckResult dataclass."""
    
    def test_healthy_result(self):
        """Test healthy check result."""
        result = HealthCheckResult(
            service_name="test_service",
            status=ServiceStatus.HEALTHY,
            response_time=0.5,
            message="Service is healthy"
        )
        
        assert result.service_name == "test_service"
        assert result.status == ServiceStatus.HEALTHY
        assert result.response_time == 0.5
        assert result.message == "Service is healthy"
        assert isinstance(result.timestamp, datetime)

    def test_unhealthy_result(self):
        """Test unhealthy check result."""
        result = HealthCheckResult(
            service_name="test_service",
            status=ServiceStatus.UNHEALTHY,
            response_time=None,
            message="Connection timeout",
            error="TimeoutError: Request timed out"
        )
        
        assert result.service_name == "test_service"
        assert result.status == ServiceStatus.UNHEALTHY
        assert result.response_time is None
        assert result.message == "Connection timeout"
        assert result.error == "TimeoutError: Request timed out"


class TestServiceHealth:
    """Test the ServiceHealth dataclass."""
    
    def test_service_health_initialization(self):
        """Test ServiceHealth initialization."""
        health = ServiceHealth(service_name="test_service")
        
        assert health.service_name == "test_service"
        assert health.status == ServiceStatus.UNKNOWN
        assert health.consecutive_failures == 0
        assert health.consecutive_successes == 0
        assert health.total_checks == 0
        assert health.total_failures == 0
        assert health.restart_count == 0
        assert health.last_check is None
        assert health.last_success is None
        assert health.last_failure is None
        assert health.restart_history == []

    def test_is_restart_allowed(self):
        """Test restart allowance logic."""
        config = HealthCheckConfig(
            name="test_service",
            check_type=CheckType.HTTP,
            url="http://localhost:8080",
            max_restarts=3,
            restart_window=300
        )
        
        health = ServiceHealth(service_name="test_service")
        
        # No restarts yet - should be allowed
        assert health.is_restart_allowed(config) is True
        
        # Add restarts within window - should be blocked after max
        now = datetime.now()
        health.restart_history = [
            now - timedelta(seconds=100),
            now - timedelta(seconds=200),
            now - timedelta(seconds=250)
        ]
        health.restart_count = 3
        
        assert health.is_restart_allowed(config) is False
        
        # Add old restart outside window - should be allowed
        health.restart_history = [
            now - timedelta(seconds=400),  # Outside 300s window
            now - timedelta(seconds=100),
            now - timedelta(seconds=200)
        ]
        
        assert health.is_restart_allowed(config) is True


@pytest.fixture
def mock_process_manager():
    """Mock SafeProcessManager for testing."""
    mock_pm = Mock()
    mock_pm.start_process.return_value = True
    mock_pm.stop_process.return_value = True
    mock_pm.restart_process.return_value = True
    mock_pm.is_process_running.return_value = True
    return mock_pm


@pytest.fixture
def health_monitor(mock_process_manager):
    """Create HealthMonitor instance with mocked dependencies."""
    return HealthMonitor(process_manager=mock_process_manager)


@pytest.fixture
def sample_http_config():
    """Sample HTTP health check configuration."""
    return HealthCheckConfig(
        name="web_service",
        check_type=CheckType.HTTP,
        url="http://localhost:8080/health",
        interval=30,
        timeout=5,
        retries=2,
        failure_threshold=3,
        success_threshold=2
    )


@pytest.fixture
def sample_tcp_config():
    """Sample TCP health check configuration."""
    return HealthCheckConfig(
        name="tcp_service",
        check_type=CheckType.TCP,
        host="localhost",
        port=9000,
        interval=60,
        timeout=10
    )


@pytest.fixture
def sample_process_config():
    """Sample process health check configuration."""
    return HealthCheckConfig(
        name="process_service",
        check_type=CheckType.PROCESS,
        process_name="test_process",
        interval=45
    )


class TestHealthMonitor:
    """Test the HealthMonitor class."""
    
    def test_initialization(self, mock_process_manager):
        """Test HealthMonitor initialization."""
        monitor = HealthMonitor(process_manager=mock_process_manager)
        
        assert monitor.process_manager == mock_process_manager
        assert monitor.services == {}
        assert monitor.service_health == {}
        assert monitor.check_threads == {}
        assert monitor.running is False

    def test_initialization_without_process_manager(self):
        """Test HealthMonitor initialization without process manager."""
        monitor = HealthMonitor()
        
        assert monitor.process_manager is None
        assert monitor.services == {}
        assert monitor.service_health == {}
        assert monitor.check_threads == {}
        assert monitor.running is False

    def test_register_service(self, health_monitor, sample_http_config):
        """Test service registration."""
        health_monitor.register_service(sample_http_config)
        
        assert "web_service" in health_monitor.services
        assert health_monitor.services["web_service"] == sample_http_config
        assert "web_service" in health_monitor.service_health
        assert health_monitor.service_health["web_service"].service_name == "web_service"

    def test_register_duplicate_service(self, health_monitor, sample_http_config):
        """Test registering duplicate service overwrites."""
        health_monitor.register_service(sample_http_config)
        
        # Register again with different config
        new_config = HealthCheckConfig(
            name="web_service",
            check_type=CheckType.HTTP,
            url="http://localhost:9090/health"
        )
        health_monitor.register_service(new_config)
        
        assert health_monitor.services["web_service"].url == "http://localhost:9090/health"

    def test_start_and_stop(self, health_monitor, sample_http_config):
        """Test starting and stopping health monitoring."""
        health_monitor.register_service(sample_http_config)
        
        # Start monitoring
        health_monitor.start()
        assert health_monitor.running is True
        assert "web_service" in health_monitor.check_threads
        assert health_monitor.check_threads["web_service"].is_alive()
        
        # Stop monitoring
        health_monitor.stop()
        assert health_monitor.running is False
        
        # Wait for threads to finish
        time.sleep(0.1)
        assert not health_monitor.check_threads["web_service"].is_alive()

    @patch('requests.get')
    def test_perform_http_check_success(self, mock_get, health_monitor, sample_http_config):
        """Test successful HTTP health check."""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "healthy"}
        mock_response.elapsed.total_seconds.return_value = 0.5
        mock_get.return_value = mock_response
        
        result = health_monitor._perform_http_check("web_service", sample_http_config, time.time())
        
        assert result.status == ServiceStatus.HEALTHY
        assert result.response_time == 0.5
        assert "HTTP 200" in result.message
        mock_get.assert_called_once_with(
            sample_http_config.url,
            timeout=sample_http_config.timeout,
            headers={'User-Agent': 'DinoAir-HealthMonitor/1.0'}
        )

    @patch('requests.get')
    def test_perform_http_check_failure(self, mock_get, health_monitor, sample_http_config):
        """Test failed HTTP health check."""
        # Mock failed response
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.elapsed.total_seconds.return_value = 1.0
        mock_get.return_value = mock_response
        
        result = health_monitor._perform_http_check("web_service", sample_http_config, time.time())
        
        assert result.status == ServiceStatus.UNHEALTHY
        assert result.response_time == 1.0
        assert "HTTP 500" in result.message

    @patch('requests.get')
    def test_perform_http_check_timeout(self, mock_get, health_monitor, sample_http_config):
        """Test HTTP health check timeout."""
        # Mock timeout exception
        mock_get.side_effect = Exception("Connection timeout")
        
        result = health_monitor._perform_http_check("web_service", sample_http_config, time.time())
        
        assert result.status == ServiceStatus.UNHEALTHY
        assert result.response_time is None
        assert "Connection timeout" in result.error

    @patch('socket.socket')
    def test_perform_tcp_check_success(self, mock_socket_class, health_monitor, sample_tcp_config):
        """Test successful TCP health check."""
        # Mock successful socket connection
        mock_socket = Mock()
        mock_socket_class.return_value = mock_socket
        mock_socket.connect.return_value = None  # Successful connection
        
        result = health_monitor._perform_tcp_check("tcp_service", sample_tcp_config, time.time())
        
        assert result.status == ServiceStatus.HEALTHY
        assert "TCP connection successful" in result.message
        mock_socket.connect.assert_called_once_with(("localhost", 9000))
        mock_socket.close.assert_called_once()

    @patch('socket.socket')
    def test_perform_tcp_check_failure(self, mock_socket_class, health_monitor, sample_tcp_config):
        """Test failed TCP health check."""
        # Mock failed socket connection
        mock_socket = Mock()
        mock_socket_class.return_value = mock_socket
        mock_socket.connect.side_effect = ConnectionRefusedError("Connection refused")
        
        result = health_monitor._perform_tcp_check("tcp_service", sample_tcp_config, time.time())
        
        assert result.status == ServiceStatus.UNHEALTHY
        assert "Connection refused" in result.error

    @patch('psutil.process_iter')
    def test_perform_process_check_success(self, mock_process_iter, health_monitor, sample_process_config):
        """Test successful process health check."""
        # Mock process found
        mock_process = Mock()
        mock_process.info = {"name": "test_process", "pid": 1234}
        mock_process_iter.return_value = [mock_process]
        
        result = health_monitor._perform_process_check("process_service", sample_process_config, time.time())
        
        assert result.status == ServiceStatus.HEALTHY
        assert "Process found" in result.message
        assert "PID: 1234" in result.message

    @patch('psutil.process_iter')
    def test_perform_process_check_failure(self, mock_process_iter, health_monitor, sample_process_config):
        """Test failed process health check."""
        # Mock no process found
        mock_process_iter.return_value = []
        
        result = health_monitor._perform_process_check("process_service", sample_process_config, time.time())
        
        assert result.status == ServiceStatus.UNHEALTHY
        assert "Process not found" in result.message

    def test_update_service_health_success(self, health_monitor, sample_http_config):
        """Test updating service health with successful result."""
        health_monitor.register_service(sample_http_config)
        
        result = HealthCheckResult(
            service_name="web_service",
            status=ServiceStatus.HEALTHY,
            response_time=0.5,
            message="Service is healthy"
        )
        
        health_monitor._update_service_health("web_service", result)
        
        health = health_monitor.service_health["web_service"]
        assert health.status == ServiceStatus.HEALTHY
        assert health.consecutive_successes == 1
        assert health.consecutive_failures == 0
        assert health.total_checks == 1
        assert health.total_failures == 0
        assert health.last_success is not None

    def test_update_service_health_failure(self, health_monitor, sample_http_config):
        """Test updating service health with failed result."""
        health_monitor.register_service(sample_http_config)
        
        result = HealthCheckResult(
            service_name="web_service",
            status=ServiceStatus.UNHEALTHY,
            response_time=None,
            message="Service is unhealthy",
            error="Connection failed"
        )
        
        health_monitor._update_service_health("web_service", result)
        
        health = health_monitor.service_health["web_service"]
        assert health.status == ServiceStatus.UNHEALTHY
        assert health.consecutive_failures == 1
        assert health.consecutive_successes == 0
        assert health.total_checks == 1
        assert health.total_failures == 1
        assert health.last_failure is not None

    def test_handle_unhealthy_service_restart(self, health_monitor, sample_http_config, mock_process_manager):
        """Test handling unhealthy service with restart."""
        health_monitor.register_service(sample_http_config)
        
        # Set up service health to trigger restart
        health = health_monitor.service_health["web_service"]
        health.consecutive_failures = 3  # Meets failure threshold
        
        result = HealthCheckResult(
            service_name="web_service",
            status=ServiceStatus.UNHEALTHY,
            response_time=None,
            message="Service is unhealthy"
        )
        
        with patch.object(health_monitor, '_restart_service') as mock_restart:
            health_monitor._handle_unhealthy_service("web_service", result)
            mock_restart.assert_called_once_with("web_service")

    def test_handle_unhealthy_service_no_restart(self, health_monitor, sample_http_config):
        """Test handling unhealthy service without restart."""
        # Disable restart
        sample_http_config.restart_enabled = False
        health_monitor.register_service(sample_http_config)
        
        health = health_monitor.service_health["web_service"]
        health.consecutive_failures = 3
        
        result = HealthCheckResult(
            service_name="web_service",
            status=ServiceStatus.UNHEALTHY,
            response_time=None,
            message="Service is unhealthy"
        )
        
        with patch.object(health_monitor, '_restart_service') as mock_restart:
            health_monitor._handle_unhealthy_service("web_service", result)
            mock_restart.assert_not_called()

    def test_get_service_health(self, health_monitor, sample_http_config):
        """Test getting service health."""
        health_monitor.register_service(sample_http_config)
        
        health = health_monitor.get_service_health("web_service")
        assert health is not None
        assert health.service_name == "web_service"
        
        # Test non-existent service
        assert health_monitor.get_service_health("non_existent") is None

    def test_get_all_health(self, health_monitor, sample_http_config, sample_tcp_config):
        """Test getting all service health."""
        health_monitor.register_service(sample_http_config)
        health_monitor.register_service(sample_tcp_config)
        
        all_health = health_monitor.get_all_health()
        assert len(all_health) == 2
        assert "web_service" in all_health
        assert "tcp_service" in all_health

    def test_get_overall_status(self, health_monitor, sample_http_config, sample_tcp_config):
        """Test getting overall system status."""
        health_monitor.register_service(sample_http_config)
        health_monitor.register_service(sample_tcp_config)
        
        # All services healthy
        health_monitor.service_health["web_service"].status = ServiceStatus.HEALTHY
        health_monitor.service_health["tcp_service"].status = ServiceStatus.HEALTHY
        
        assert health_monitor.get_overall_status() == ServiceStatus.HEALTHY
        
        # One service unhealthy
        health_monitor.service_health["web_service"].status = ServiceStatus.UNHEALTHY
        
        assert health_monitor.get_overall_status() == ServiceStatus.UNHEALTHY
        
        # One service unknown
        health_monitor.service_health["tcp_service"].status = ServiceStatus.UNKNOWN
        
        assert health_monitor.get_overall_status() == ServiceStatus.UNHEALTHY

    def test_get_health_report(self, health_monitor, sample_http_config):
        """Test getting health report."""
        health_monitor.register_service(sample_http_config)
        
        # Update health with some data
        health = health_monitor.service_health["web_service"]
        health.status = ServiceStatus.HEALTHY
        health.total_checks = 10
        health.total_failures = 2
        health.last_check = datetime.now()
        
        report = health_monitor.get_health_report()
        
        assert report["overall_status"] == "HEALTHY"
        assert len(report["services"]) == 1
        assert report["services"]["web_service"]["status"] == "HEALTHY"
        assert report["services"]["web_service"]["total_checks"] == 10
        assert report["services"]["web_service"]["total_failures"] == 2
        assert report["services"]["web_service"]["success_rate"] == 80.0


class TestDinoAirHealthChecks:
    """Test the get_dinoair_health_checks function."""
    
    def test_get_dinoair_health_checks(self):
        """Test getting DinoAir health check configurations."""
        configs = get_dinoair_health_checks()
        
        assert len(configs) >= 3  # Should have at least ComfyUI, Ollama, Web GUI
        
        # Check for expected services
        service_names = [config.name for config in configs]
        assert "comfyui" in service_names
        assert "ollama" in service_names
        assert "web_gui" in service_names
        
        # Verify configuration types
        for config in configs:
            assert isinstance(config, HealthCheckConfig)
            assert config.name is not None
            assert config.check_type in [CheckType.HTTP, CheckType.TCP, CheckType.PROCESS]


@pytest.mark.integration
class TestHealthMonitorIntegration:
    """Integration tests for HealthMonitor."""
    
    def test_full_monitoring_cycle(self, health_monitor):
        """Test a complete monitoring cycle."""
        # This would be a more complex integration test
        # that tests the full workflow with real or more realistic mocks
        pass


if __name__ == "__main__":
    pytest.main([__file__])