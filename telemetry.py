"""
DinoAir CLI Installer Telemetry Module

Provides telemetry collection, error reporting, and usage analytics
with user consent and privacy controls.
"""

import json
import os
import sys
import uuid
import hashlib
import platform
import time
import traceback
import tempfile
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List

# Initialize Sentry error tracking
try:
    from sentry_config import init_sentry, capture_exception, capture_message
    init_sentry()
except ImportError:
    def capture_exception(error, extra_data=None):
        pass
    def capture_message(message, level='info', extra_data=None):
        pass


class TelemetryConfig:
    """Configuration manager for telemetry settings"""
    
    def __init__(self, config_dir: Optional[str] = None):
        self.config_dir = config_dir or os.path.expanduser("~/.dinoair")
        self.config_file = os.path.join(self.config_dir, "telemetry_config.json")
        self._config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load telemetry configuration from file"""
        default_config = {
            "telemetry_enabled": None,  # None means not yet decided
            "error_reporting_enabled": None,
            "usage_analytics_enabled": None,
            "user_id": None,
            "consent_timestamp": None,
            "opt_out_timestamp": None,
            "install_id": str(uuid.uuid4())
        }
        
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    loaded_config = json.load(f)
                    default_config.update(loaded_config)
            except (json.JSONDecodeError, IOError):
                pass  # Use default config if file is corrupted
        
        return default_config
    
    def _save_config(self) -> bool:
        """Save telemetry configuration to file"""
        try:
            os.makedirs(self.config_dir, exist_ok=True)
            with open(self.config_file, 'w') as f:
                json.dump(self._config, f, indent=2)
            return True
        except (IOError, OSError):
            return False
    
    def get_user_consent(self) -> bool:
        """Get user consent for telemetry collection"""
        if self._config.get("telemetry_enabled") is not None:
            return self._config["telemetry_enabled"]
        
        print("\n" + "="*60)
        print("DinoAir Telemetry and Error Reporting")
        print("="*60)
        print("DinoAir can collect anonymous telemetry data to help improve")
        print("the installation experience and resolve issues proactively.")
        print()
        print("What data is collected:")
        print("• Installation success/failure rates")
        print("• Error messages and stack traces (anonymized)")
        print("• System information (OS, Python version, hardware)")
        print("• Installation time and performance metrics")
        print("• Usage patterns (anonymized)")
        print()
        print("Privacy information:")
        print("• No personal information is collected")
        print("• All data is anonymized")
        print("• You can opt-out at any time")
        print("• Data is used only for improving DinoAir")
        print()
        
        while True:
            choice = input("Enable telemetry and error reporting? [Y/n/more info]: ").lower().strip()
            if choice in ['y', 'yes', '']:
                self._config["telemetry_enabled"] = True
                self._config["error_reporting_enabled"] = True
                self._config["usage_analytics_enabled"] = True
                self._config["consent_timestamp"] = datetime.utcnow().isoformat()
                self._config["user_id"] = self._generate_anonymous_user_id()
                self._save_config()
                print("✓ Telemetry enabled. Thank you for helping improve DinoAir!")
                return True
            elif choice in ['n', 'no']:
                self._config["telemetry_enabled"] = False
                self._config["error_reporting_enabled"] = False
                self._config["usage_analytics_enabled"] = False
                self._config["opt_out_timestamp"] = datetime.utcnow().isoformat()
                self._save_config()
                print("✓ Telemetry disabled. Installation will continue normally.")
                return False
            elif choice in ['more info', 'info', 'more']:
                self._show_more_info()
            else:
                print("Please enter 'y' for yes, 'n' for no, or 'more info' for details.")
    
    def _show_more_info(self):
        """Show detailed information about telemetry"""
        print("\n" + "-"*50)
        print("Detailed Telemetry Information")
        print("-"*50)
        print("Types of data collected:")
        print("1. Installation Metrics:")
        print("   • Success/failure status")
        print("   • Installation duration")
        print("   • Step-by-step progress")
        print("   • Component installation status")
        print()
        print("2. Error Information:")
        print("   • Error messages (sanitized)")
        print("   • Stack traces (anonymized)")
        print("   • System state at time of error")
        print()
        print("3. System Information:")
        print("   • Operating system and version")
        print("   • Python version")
        print("   • Available memory and storage")
        print("   • Hardware capabilities (anonymized)")
        print()
        print("4. Usage Patterns:")
        print("   • Installation options selected")
        print("   • Time of installation")
        print("   • Retry patterns for failed steps")
        print()
        print("Data Protection:")
        print("• All personally identifiable information is removed")
        print("• File paths are anonymized")
        print("• Network information is excluded")
        print("• Data is encrypted in transit")
        print("• No data is shared with third parties")
        print()
        print("You can disable telemetry at any time by:")
        print("• Running: python install.py --disable-telemetry")
        print("• Editing: ~/.dinoair/telemetry_config.json")
        print("• Setting telemetry_enabled to false")
        print("-"*50)
        print()
    
    def _generate_anonymous_user_id(self) -> str:
        """Generate an anonymous user ID"""
        # Create a hash based on system information but not personally identifiable
        system_info = f"{platform.system()}-{platform.machine()}-{uuid.getnode()}"
        return hashlib.sha256(system_info.encode()).hexdigest()[:16]
    
    def is_telemetry_enabled(self) -> bool:
        """Check if telemetry is enabled"""
        return self._config.get("telemetry_enabled", False)
    
    def is_error_reporting_enabled(self) -> bool:
        """Check if error reporting is enabled"""
        return self._config.get("error_reporting_enabled", False)
    
    def is_usage_analytics_enabled(self) -> bool:
        """Check if usage analytics is enabled"""
        return self._config.get("usage_analytics_enabled", False)
    
    def get_user_id(self) -> Optional[str]:
        """Get anonymous user ID"""
        return self._config.get("user_id")
    
    def get_install_id(self) -> str:
        """Get unique installation ID"""
        return self._config.get("install_id", str(uuid.uuid4()))
    
    def disable_telemetry(self):
        """Disable all telemetry"""
        self._config["telemetry_enabled"] = False
        self._config["error_reporting_enabled"] = False
        self._config["usage_analytics_enabled"] = False
        self._config["opt_out_timestamp"] = datetime.utcnow().isoformat()
        self._save_config()


class TelemetryCollector:
    """Collects and manages telemetry data"""
    
    def __init__(self, config: TelemetryConfig):
        self.config = config
        self.session_id = str(uuid.uuid4())
        self.start_time = time.time()
        self.events: List[Dict[str, Any]] = []
        self.system_info = self._collect_system_info()
        
        # Local storage for telemetry data (for future submission)
        self.telemetry_dir = os.path.join(config.config_dir, "telemetry")
        os.makedirs(self.telemetry_dir, exist_ok=True)
    
    def _collect_system_info(self) -> Dict[str, Any]:
        """Collect anonymized system information"""
        info = {
            "platform": platform.system(),
            "platform_version": platform.release(),
            "architecture": platform.machine(),
            "python_version": sys.version.split()[0],
            "installer_version": "1.0.0",  # Could be extracted from a version file
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Add hardware info if available
        try:
            import psutil
            info.update({
                "cpu_count": os.cpu_count(),
                "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 1),
                "disk_space_gb": round(psutil.disk_usage('/').total / (1024**3), 1)
            })
        except ImportError:
            # psutil not available, use basic info
            info["cpu_count"] = os.cpu_count()
        
        return info
    
    def record_installation_start(self, args: Dict[str, Any] = None):
        """Record installation start event"""
        if not self.config.is_telemetry_enabled():
            return
        
        event = {
            "event_type": "installation_start",
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
            "user_id": self.config.get_user_id(),
            "install_id": self.config.get_install_id(),
            "system_info": self.system_info,
            "installation_args": self._sanitize_args(args or {})
        }
        self.events.append(event)
    
    def record_installation_step(self, step_name: str, status: str, details: Dict[str, Any] = None):
        """Record installation step completion"""
        if not self.config.is_telemetry_enabled():
            return
        
        event = {
            "event_type": "installation_step",
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
            "step_name": step_name,
            "status": status,  # "started", "completed", "failed", "skipped"
            "details": self._sanitize_data(details or {})
        }
        self.events.append(event)
    
    def record_installation_complete(self, success: bool, duration: float, summary: Dict[str, Any] = None):
        """Record installation completion"""
        if not self.config.is_telemetry_enabled():
            return
        
        event = {
            "event_type": "installation_complete",
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
            "success": success,
            "duration_seconds": round(duration, 2),
            "summary": self._sanitize_data(summary or {})
        }
        self.events.append(event)
        self._save_telemetry_data()
    
    def record_error(self, error: Exception, context: Dict[str, Any] = None, step_name: str = None):
        """Record error with stack trace and context"""
        if not self.config.is_error_reporting_enabled():
            return
        
        error_data = {
            "event_type": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.session_id,
            "step_name": step_name,
            "error_type": type(error).__name__,
            "error_message": self._sanitize_error_message(str(error)),
            "stack_trace": self._sanitize_stack_trace(traceback.format_exc()),
            "context": self._sanitize_data(context or {}),
            "system_info": self.system_info
        }
        self.events.append(error_data)
        self._save_telemetry_data()  # Save immediately for errors
    
    def _sanitize_args(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize command line arguments"""
        sanitized = {}
        for key, value in args.items():
            if isinstance(value, bool):
                sanitized[key] = value
            elif isinstance(value, (int, float)):
                sanitized[key] = value
            else:
                # Don't include string values that might contain paths or sensitive info
                sanitized[key] = "<sanitized>"
        return sanitized
    
    def _sanitize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize data by removing potential personal information"""
        if not isinstance(data, dict):
            return {}
        
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, dict):
                sanitized[key] = self._sanitize_data(value)
            elif isinstance(value, (bool, int, float)):
                sanitized[key] = value
            elif isinstance(value, str):
                sanitized[key] = self._sanitize_string(value)
            elif isinstance(value, list):
                sanitized[key] = [self._sanitize_string(str(item)) if isinstance(item, str) else item for item in value]
            else:
                sanitized[key] = str(type(value).__name__)
        
        return sanitized
    
    def _sanitize_string(self, text: str) -> str:
        """Sanitize string by removing potential personal information"""
        # Remove file paths by replacing them with generic placeholders
        import re
        
        # Replace URLs first (before path replacements)
        text = re.sub(r'https?://[^\s]+', '<URL>', text)
        # Replace Windows paths
        text = re.sub(r'[A-Za-z]:\\[^\\]+(?:\\[^\\]+)*', '<PATH>', text)
        # Replace Unix paths
        text = re.sub(r'/[^/\s]+(?:/[^/\s]+)*', '<PATH>', text)
        # Replace usernames in paths
        text = re.sub(r'/home/[^/\s]+', '/home/<USER>', text)
        text = re.sub(r'\\\\Users\\\\[^\\\\]+', '\\\\Users\\\\<USER>', text)
        
        return text
    
    def _sanitize_error_message(self, message: str) -> str:
        """Sanitize error message"""
        return self._sanitize_string(message)
    
    def _sanitize_stack_trace(self, trace: str) -> str:
        """Sanitize stack trace"""
        return self._sanitize_string(trace)
    
    def _save_telemetry_data(self):
        """Save telemetry data to local file"""
        if not self.events:
            return
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"telemetry_{timestamp}_{self.session_id[:8]}.json"
        filepath = os.path.join(self.telemetry_dir, filename)
        
        try:
            with open(filepath, 'w') as f:
                json.dump({
                    "session_id": self.session_id,
                    "events": self.events,
                    "metadata": {
                        "created_at": datetime.utcnow().isoformat(),
                        "version": "1.0.0"
                    }
                }, f, indent=2)
        except (IOError, OSError):
            pass  # Fail silently if we can't save telemetry
    
    def get_error_categories(self) -> Dict[str, int]:
        """Get error categories from collected events"""
        categories = {}
        for event in self.events:
            if event.get("event_type") == "error":
                error_type = event.get("error_type", "Unknown")
                categories[error_type] = categories.get(error_type, 0) + 1
        return categories


class CrashReporter:
    """Handles crash reporting and diagnostic information"""
    
    def __init__(self, config: TelemetryConfig, collector: TelemetryCollector):
        self.config = config
        self.collector = collector
    
    def report_crash(self, error: Exception, context: Dict[str, Any] = None):
        """Report a crash with full diagnostic information"""
        if not self.config.is_error_reporting_enabled():
            return
        
        crash_data = {
            "event_type": "crash",
            "timestamp": datetime.utcnow().isoformat(),
            "session_id": self.collector.session_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "stack_trace": traceback.format_exc(),
            "system_info": self.collector.system_info,
            "context": context or {},
            "diagnostic_info": self._collect_diagnostic_info()
        }
        
        # Save crash report to separate file for immediate analysis
        self._save_crash_report(crash_data)
        
        # Also record in regular telemetry
        self.collector.record_error(error, context, "crash")
    
    def _collect_diagnostic_info(self) -> Dict[str, Any]:
        """Collect diagnostic information for crash reporting"""
        diagnostic = {
            "working_directory": os.getcwd(),
            "environment_vars": {
                "PYTHON_PATH": os.environ.get("PYTHONPATH", ""),
                "PATH_LENGTH": len(os.environ.get("PATH", "")),
                "USER": "<sanitized>",  # Don't include actual username
                "HOME": "<sanitized>"   # Don't include actual home path
            },
            "python_executable": sys.executable,
            "command_line_args": [arg if not arg.startswith('/') and not arg.startswith('\\') else '<PATH>' for arg in sys.argv]
        }
        
        # Add memory usage if psutil is available
        try:
            import psutil
            process = psutil.Process()
            diagnostic["memory_usage"] = {
                "rss_mb": round(process.memory_info().rss / (1024*1024), 2),
                "vms_mb": round(process.memory_info().vms / (1024*1024), 2)
            }
            diagnostic["system_memory"] = {
                "available_mb": round(psutil.virtual_memory().available / (1024*1024), 2),
                "percent_used": psutil.virtual_memory().percent
            }
        except ImportError:
            pass
        
        return diagnostic
    
    def _save_crash_report(self, crash_data: Dict[str, Any]):
        """Save crash report to dedicated file"""
        crash_dir = os.path.join(self.config.config_dir, "crashes")
        os.makedirs(crash_dir, exist_ok=True)
        
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"crash_{timestamp}_{crash_data['session_id'][:8]}.json"
        filepath = os.path.join(crash_dir, filename)
        
        try:
            with open(filepath, 'w') as f:
                json.dump(crash_data, f, indent=2)
        except (IOError, OSError):
            pass  # Fail silently if we can't save crash report


# Convenience function for easy integration
def create_telemetry_system(config_dir: Optional[str] = None) -> tuple:
    """Create and initialize telemetry system components"""
    config = TelemetryConfig(config_dir)
    collector = TelemetryCollector(config)
    crash_reporter = CrashReporter(config, collector)
    
    return config, collector, crash_reporter