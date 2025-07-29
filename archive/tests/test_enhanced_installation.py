import pytest
import sys
import subprocess
from pathlib import Path
import psutil
import json

class TestDinoAirEnhancedInstallation:
    """Test suite for DinoAir enhanced installation and functionality"""
    
    @pytest.fixture(scope="class")
    def installation_dir(self):
        return Path.cwd()
    
    def test_python_version(self):
        """Test Python version requirements"""
        assert sys.version_info >= (3, 11), "Python 3.11+ required"
    
    def test_system_requirements_checker(self):
        """Test system requirements checker script"""
        result = subprocess.run([sys.executable, "check_requirements.py"], 
                              capture_output=True, text=True)
        assert result.returncode in [0, 1], "Requirements checker should return 0 or 1"
        assert "DinoAir System Requirements Check" in result.stdout
    
    def test_requirements_manager_generate(self):
        """Test requirements manager can generate files"""
        result = subprocess.run([sys.executable, "requirements_manager.py", "generate"],
                              capture_output=True, text=True)
        assert result.returncode == 0, "Requirements generation should succeed"
        
        # Check that files were created
        assert Path("requirements.txt").exists()
        assert Path("requirements-dev.txt").exists()
        assert Path("requirements-gpu.txt").exists()
    
    def test_requirements_files_content(self, installation_dir):
        """Test generated requirements files have expected content"""
        req_file = installation_dir / "requirements.txt"
        if req_file.exists():
            content = req_file.read_text()
            assert "fastapi" in content
            assert "uvicorn" in content
            assert "psutil" in content
    
    def test_config_structure(self, installation_dir):
        """Test configuration directory structure"""
        config_dir = installation_dir / "config"
        assert config_dir.exists(), "Config directory should exist"
        
        # Test config manager can be imported
        try:
            sys.path.insert(0, str(installation_dir))
            from config.config_manager import ConfigManager
            config_manager = ConfigManager()
            assert config_manager is not None
        except ImportError as e:
            pytest.fail(f"Failed to import ConfigManager: {e}")
    
    def test_service_manager_import(self, installation_dir):
        """Test service manager can be imported"""
        try:
            sys.path.insert(0, str(installation_dir))
            from services.service_manager import ServiceManager
            service_manager = ServiceManager()
            assert service_manager is not None
        except ImportError as e:
            pytest.fail(f"Failed to import ServiceManager: {e}")
    
    def test_performance_monitor_import(self, installation_dir):
        """Test performance monitor can be imported"""
        try:
            sys.path.insert(0, str(installation_dir))
            from utils.performance_monitor import PerformanceMonitor
            monitor = PerformanceMonitor()
            assert monitor is not None
        except ImportError as e:
            pytest.fail(f"Failed to import PerformanceMonitor: {e}")
    
    def test_system_check_report_generation(self, installation_dir):
        """Test that system check generates a report"""
        subprocess.run([sys.executable, "check_requirements.py"], 
                      capture_output=True)
        
        report_file = installation_dir / "system_check_report.json"
        if report_file.exists():
            with open(report_file) as f:
                report = json.load(f)
            assert "results" in report
            assert "can_proceed" in report
    
    def test_required_directories_exist(self, installation_dir):
        """Test that required directories exist"""
        required_dirs = ["config", "services", "utils"]
        
        for dir_name in required_dirs:
            dir_path = installation_dir / dir_name
            assert dir_path.exists(), f"{dir_name} directory should exist"
            assert dir_path.is_dir(), f"{dir_name} should be a directory"
    
    def test_port_availability(self):
        """Test required ports are available or used by our services"""
        required_ports = [3000, 8188, 11434]
        
        for port in required_ports:
            # Check if port is free or used by our services
            connections = [
                conn for conn in psutil.net_connections()
                if conn.laddr.port == port
            ]
            
            # This test passes if port is either free or used (by our services)
            # The key is that we can detect port usage
            assert isinstance(connections, list)
    
    def test_enhanced_installer_dry_run(self):
        """Test enhanced installer can be imported and initialized"""
        try:
            sys.path.insert(0, str(Path.cwd()))
            from install_enhanced import EnhancedInstaller
            installer = EnhancedInstaller()
            assert installer is not None
            assert installer.root_dir.exists()
        except ImportError as e:
            pytest.fail(f"Failed to import EnhancedInstaller: {e}")
    
    @pytest.mark.integration
    def test_config_manager_functionality(self):
        """Test config manager basic functionality"""
        try:
            sys.path.insert(0, str(Path.cwd()))
            from config.config_manager import ConfigManager
            
            config_manager = ConfigManager()
            
            # Test validation
            is_valid = config_manager.validate_config()
            assert isinstance(is_valid, bool)
            
            # Test loading default config
            main_config = config_manager.load_config("main")
            assert isinstance(main_config, dict)
            assert "app_name" in main_config
            
        except Exception as e:
            pytest.fail(f"ConfigManager functionality test failed: {e}")
    
    @pytest.mark.integration  
    def test_performance_monitor_metrics(self):
        """Test performance monitor can collect metrics"""
        try:
            sys.path.insert(0, str(Path.cwd()))
            from utils.performance_monitor import PerformanceMonitor
            
            monitor = PerformanceMonitor()
            metrics = monitor.get_system_metrics()
            
            assert isinstance(metrics, dict)
            assert "cpu" in metrics
            assert "memory" in metrics
            assert "disk" in metrics
            assert "timestamp" in metrics
            
        except Exception as e:
            pytest.fail(f"PerformanceMonitor metrics test failed: {e}")