"""
DinoAir Safe Process Manager
Manages services with resource limits, monitoring, and automatic recovery
"""

import os
import sys
import subprocess
import time
import threading
import signal
import json
import psutil
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import queue


class ServiceStatus(Enum):
    """Service status enumeration"""
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    FAILED = "failed"
    RESTARTING = "restarting"


@dataclass
class ServiceConfig:
    """Configuration for a managed service"""
    name: str
    command: List[str]
    working_dir: Optional[Path] = None
    port: Optional[int] = None
    env_vars: Optional[Dict[str, str]] = None
    
    # Resource limits
    max_memory_mb: int = 2048  # 2GB default
    max_cpu_percent: int = 80  # 80% of one core
    
    # Restart policy
    restart_on_failure: bool = True
    max_restart_attempts: int = 3
    restart_delay_seconds: int = 10
    
    # Health check
    health_check_interval: int = 30  # seconds
    health_check_timeout: int = 10
    health_check_cmd: Optional[List[str]] = None
    
    # Dependencies
    depends_on: List[str] = None
    startup_delay: int = 0


class ManagedService:
    """A service managed by the process manager"""
    
    def __init__(self, config: ServiceConfig, logger: logging.Logger):
        self.config = config
        self.logger = logger
        self.process: Optional[subprocess.Popen] = None
        self.status = ServiceStatus.STOPPED
        self.restart_count = 0
        self.last_restart_time = 0
        self.start_time = 0
        self.cpu_usage_history = []
        self.memory_usage_history = []
        self._stop_event = threading.Event()
        self._monitor_thread = None
    
    def start(self) -> bool:
        """Start the service"""
        if self.status != ServiceStatus.STOPPED:
            self.logger.warning(f"{self.config.name} is already {self.status.value}")
            return False
        
        self.status = ServiceStatus.STARTING
        self.logger.info(f"Starting {self.config.name}...")
        
        try:
            # Check port availability
            if self.config.port and not self._is_port_available(self.config.port):
                self.logger.error(f"Port {self.config.port} is already in use")
                self.status = ServiceStatus.FAILED
                return False
            
            # Prepare environment
            env = os.environ.copy()
            if self.config.env_vars:
                env.update(self.config.env_vars)
            
            # Add resource limit environment variables
            if sys.platform == "win32":
                # Windows doesn't support resource limits via subprocess
                # We'll monitor and terminate if limits exceeded
                pass
            else:
                # Unix-like systems can use ulimit
                import resource
                env["DINOAIR_MEMORY_LIMIT"] = str(self.config.max_memory_mb * 1024 * 1024)
            
            # Start process
            self.process = subprocess.Popen(
                self.config.command,
                cwd=self.config.working_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,  # Line buffered
                universal_newlines=True
            )
            
            # Wait for startup
            if self.config.startup_delay:
                time.sleep(self.config.startup_delay)
            
            # Check if process is still running
            if self.process.poll() is not None:
                self.logger.error(f"{self.config.name} failed to start")
                self.status = ServiceStatus.FAILED
                return False
            
            self.status = ServiceStatus.RUNNING
            self.start_time = time.time()
            self.logger.info(f"{self.config.name} started successfully (PID: {self.process.pid})")
            
            # Start monitoring thread
            self._stop_event.clear()
            self._monitor_thread = threading.Thread(
                target=self._monitor_process,
                name=f"{self.config.name}_monitor"
            )
            self._monitor_thread.start()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start {self.config.name}: {e}")
            self.status = ServiceStatus.FAILED
            return False
    
    def stop(self, timeout: int = 30) -> bool:
        """Stop the service gracefully"""
        if self.status not in [ServiceStatus.RUNNING, ServiceStatus.STARTING]:
            self.logger.warning(f"{self.config.name} is not running")
            return True
        
        self.status = ServiceStatus.STOPPING
        self.logger.info(f"Stopping {self.config.name}...")
        
        # Stop monitoring
        self._stop_event.set()
        
        if self.process:
            try:
                # Send SIGTERM for graceful shutdown
                if sys.platform == "win32":
                    self.process.terminate()
                else:
                    self.process.send_signal(signal.SIGTERM)
                
                # Wait for process to terminate
                try:
                    self.process.wait(timeout=timeout)
                    self.logger.info(f"{self.config.name} stopped gracefully")
                except subprocess.TimeoutExpired:
                    # Force kill if not terminated
                    self.logger.warning(f"{self.config.name} did not stop gracefully, forcing...")
                    self.process.kill()
                    self.process.wait()
                
                self.process = None
                
            except Exception as e:
                self.logger.error(f"Error stopping {self.config.name}: {e}")
                return False
        
        # Wait for monitor thread
        if self._monitor_thread and self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=5)
        
        self.status = ServiceStatus.STOPPED
        return True
    
    def restart(self) -> bool:
        """Restart the service"""
        self.logger.info(f"Restarting {self.config.name}...")
        self.status = ServiceStatus.RESTARTING
        
        # Stop the service
        if not self.stop():
            return False
        
        # Wait before restarting
        time.sleep(self.config.restart_delay_seconds)
        
        # Start the service
        return self.start()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        stats = {
            "name": self.config.name,
            "status": self.status.value,
            "uptime": time.time() - self.start_time if self.start_time else 0,
            "restart_count": self.restart_count,
            "pid": self.process.pid if self.process else None,
            "port": self.config.port,
            "resource_usage": {
                "cpu_percent": self.cpu_usage_history[-1] if self.cpu_usage_history else 0,
                "memory_mb": self.memory_usage_history[-1] if self.memory_usage_history else 0,
                "max_memory_mb": self.config.max_memory_mb,
                "max_cpu_percent": self.config.max_cpu_percent
            }
        }
        return stats
    
    def _check_process_status(self):
        """Check if process is still running and handle restart if needed."""
        if self.process.poll() is not None:
            self.logger.error(f"{self.config.name} has stopped unexpectedly")
            self.status = ServiceStatus.FAILED
            
            # Handle restart
            if self.config.restart_on_failure and self.restart_count < self.config.max_restart_attempts:
                self.restart_count += 1
                self.logger.info(f"Attempting restart {self.restart_count}/{self.config.max_restart_attempts}")
                self.restart()
            return False  # Process has stopped
        return True  # Process is still running
    
    def _collect_resource_metrics(self):
        """Collect CPU and memory usage metrics for the process."""
        try:
            proc = psutil.Process(self.process.pid)
            
            # CPU usage
            cpu_percent = proc.cpu_percent(interval=1)
            self._update_metric_history(self.cpu_usage_history, cpu_percent)
            
            # Memory usage
            memory_info = proc.memory_info()
            memory_mb = memory_info.rss / (1024 * 1024)
            self._update_metric_history(self.memory_usage_history, memory_mb)
            
            return cpu_percent, memory_mb
            
        except psutil.NoSuchProcess:
            return None, None
    
    def _update_metric_history(self, history_list, new_value):
        """Update a metric history list, keeping only the last 60 samples."""
        history_list.append(new_value)
        if len(history_list) > 60:  # Keep last 60 samples
            history_list.pop(0)
    
    def _check_resource_limits(self, cpu_percent, memory_mb):
        """Check if resource usage exceeds configured limits and log warnings."""
        if memory_mb and memory_mb > self.config.max_memory_mb:
            self.logger.warning(
                f"{self.config.name} exceeds memory limit: "
                f"{memory_mb:.1f}MB > {self.config.max_memory_mb}MB"
            )
            # Could implement automatic model unloading here
            
        if cpu_percent and cpu_percent > self.config.max_cpu_percent:
            self.logger.warning(
                f"{self.config.name} exceeds CPU limit: "
                f"{cpu_percent:.1f}% > {self.config.max_cpu_percent}%"
            )
    
    def _should_perform_health_check(self):
        """Determine if a health check should be performed now."""
        return (self.config.health_check_cmd and 
                time.time() % self.config.health_check_interval < 1)

    def _monitor_process(self):
        """Monitor process health and resource usage"""
        while not self._stop_event.is_set() and self.process:
            try:
                # Check if process is still running
                if not self._check_process_status():
                    break
                
                # Monitor resource usage
                cpu_percent, memory_mb = self._collect_resource_metrics()
                
                # Check resource limits
                self._check_resource_limits(cpu_percent, memory_mb)
                
                # Perform health check if needed
                if self._should_perform_health_check():
                    self._perform_health_check()
                
                # Read stdout/stderr
                self._read_process_output()
                
            except Exception as e:
                self.logger.error(f"Monitor error for {self.config.name}: {e}")
            
            time.sleep(1)
    
    def _perform_health_check(self):
        """Perform health check on the service"""
        try:
            result = subprocess.run(
                self.config.health_check_cmd,
                capture_output=True,
                timeout=self.config.health_check_timeout
            )
            if result.returncode != 0:
                self.logger.warning(f"Health check failed for {self.config.name}")
                # Could trigger restart here
        except Exception as e:
            self.logger.error(f"Health check error for {self.config.name}: {e}")
    
    def _read_process_output(self):
        """Read and log process output"""
        if not self.process:
            return
        
        # Non-blocking read from stdout
        try:
            if self.process.stdout:
                line = self.process.stdout.readline()
                if line:
                    self.logger.info(f"[{self.config.name}] {line.strip()}")
        except:
            pass
        
        # Non-blocking read from stderr
        try:
            if self.process.stderr:
                line = self.process.stderr.readline()
                if line:
                    self.logger.warning(f"[{self.config.name}] {line.strip()}")
        except:
            pass
    
    def _is_port_available(self, port: int) -> bool:
        """Check if a port is available"""
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return True
            except:
                return False


class ProcessManager:
    """Main process manager for DinoAir services"""
    
    def __init__(self, config_file: Optional[Path] = None):
        self.services: Dict[str, ManagedService] = {}
        self.config_file = config_file
        self.logger = self._setup_logging()
        self.running = False
        self._command_queue = queue.Queue()
        
        # Set up signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging with rotation"""
        from logging.handlers import RotatingFileHandler
        
        logger = logging.getLogger("ProcessManager")
        logger.setLevel(logging.DEBUG)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        # File handler with rotation
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        file_handler = RotatingFileHandler(
            log_dir / "process_manager.log",
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(logging.DEBUG)
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
        
        return logger
    
    def load_config(self, config_file: Path):
        """Load service configuration from file"""
        try:
            with open(config_file, 'r') as f:
                config_data = json.load(f)
            
            for service_name, service_config in config_data.get("services", {}).items():
                config = ServiceConfig(
                    name=service_name,
                    command=service_config["command"],
                    working_dir=Path(service_config.get("working_dir", ".")),
                    port=service_config.get("port"),
                    env_vars=service_config.get("env_vars", {}),
                    max_memory_mb=service_config.get("max_memory_mb", 2048),
                    max_cpu_percent=service_config.get("max_cpu_percent", 80),
                    restart_on_failure=service_config.get("restart_on_failure", True),
                    max_restart_attempts=service_config.get("max_restart_attempts", 3),
                    depends_on=service_config.get("depends_on", []),
                    startup_delay=service_config.get("startup_delay", 0)
                )
                self.add_service(config)
            
        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")
    
    def add_service(self, config: ServiceConfig):
        """Add a service to manage"""
        if config.name in self.services:
            self.logger.warning(f"Service {config.name} already exists")
            return
        
        service = ManagedService(config, self.logger)
        self.services[config.name] = service
        self.logger.info(f"Added service: {config.name}")
    
    def start_service(self, name: str) -> bool:
        """Start a specific service"""
        if name not in self.services:
            self.logger.error(f"Service {name} not found")
            return False
        
        service = self.services[name]
        
        # Check dependencies
        if service.config.depends_on:
            for dep in service.config.depends_on:
                if dep in self.services and self.services[dep].status != ServiceStatus.RUNNING:
                    self.logger.info(f"Starting dependency {dep} for {name}")
                    if not self.start_service(dep):
                        return False
        
        return service.start()
    
    def stop_service(self, name: str) -> bool:
        """Stop a specific service"""
        if name not in self.services:
            self.logger.error(f"Service {name} not found")
            return False
        
        return self.services[name].stop()
    
    def restart_service(self, name: str) -> bool:
        """Restart a specific service"""
        if name not in self.services:
            self.logger.error(f"Service {name} not found")
            return False
        
        return self.services[name].restart()
    
    def _start_service_with_dependencies(self, name: str, started: set) -> bool:
        """Start a service and its dependencies recursively."""
        if name in started:
            return True
        
        service = self.services.get(name)
        if not service:
            return False
        
        # Start dependencies first
        if service.config.depends_on:
            for dep in service.config.depends_on:
                if not self._start_service_with_dependencies(dep, started):
                    return False
        
        # Start service
        if self.start_service(name):
            started.add(name)
            return True
        return False

    def start_all(self):
        """Start all services in dependency order"""
        self.logger.info("Starting all services...")
        
        # Build dependency graph and start in order
        started = set()
        
        for name in self.services:
            self._start_service_with_dependencies(name, started)
    
    def stop_all(self):
        """Stop all services in reverse dependency order"""
        self.logger.info("Stopping all services...")
        
        # Stop in reverse order
        for name in reversed(list(self.services.keys())):
            self.stop_service(name)
    
    def get_status(self) -> Dict[str, Any]:
        """Get status of all services"""
        status = {
            "timestamp": datetime.now().isoformat(),
            "services": {}
        }
        
        for name, service in self.services.items():
            status["services"][name] = service.get_stats()
        
        # System stats
        status["system"] = {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent
        }
        
        return status
    
    def _process_command_queue(self):
        """Process any pending commands from the command queue."""
        try:
            cmd = self._command_queue.get(timeout=1)
            self._handle_command(cmd)
        except queue.Empty:
            pass
    
    def _monitor_system_resources(self):
        """Monitor system-wide resource usage and log warnings."""
        memory = psutil.virtual_memory()
        if memory.percent > 90:
            self.logger.warning(f"System memory critical: {memory.percent}%")
            # Could implement automatic model unloading here
    
    def _perform_periodic_tasks(self):
        """Perform periodic maintenance tasks like saving status."""
        if int(time.time()) % 60 == 0:
            self._save_status()

    def run(self):
        """Main run loop"""
        self.running = True
        self.logger.info("Process Manager started")
        
        # Start all services
        self.start_all()
        
        # Main monitoring loop
        while self.running:
            try:
                # Check for commands
                self._process_command_queue()
                
                # Monitor system resources
                self._monitor_system_resources()
                
                # Perform periodic tasks
                self._perform_periodic_tasks()
                
            except Exception as e:
                self.logger.error(f"Main loop error: {e}")
            
            time.sleep(1)
        
        # Cleanup
        self.stop_all()
        self.logger.info("Process Manager stopped")
    
    def _handle_command(self, cmd: Dict[str, Any]):
        """Handle external commands"""
        action = cmd.get("action")
        
        if action == "start":
            self.start_service(cmd["service"])
        elif action == "stop":
            self.stop_service(cmd["service"])
        elif action == "restart":
            self.restart_service(cmd["service"])
        elif action == "status":
            return self.get_status()
    
    def _save_status(self):
        """Save current status to file"""
        try:
            status_file = Path("logs") / "process_status.json"
            with open(status_file, 'w') as f:
                json.dump(self.get_status(), f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save status: {e}")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        self.logger.info(f"Received signal {signum}, shutting down...")
        self.running = False


def create_default_config() -> Dict[str, Any]:
    """Create default service configuration"""
    return {
        "services": {
            "comfyui": {
                "command": [sys.executable, "main.py", "--port", "8188"],
                "working_dir": "ComfyUI",
                "port": 8188,
                "max_memory_mb": 4096,
                "max_cpu_percent": 90,
                "restart_on_failure": True,
                "health_check_cmd": ["curl", "-f", "http://localhost:8188/"],
                "startup_delay": 5
            },
            "ollama": {
                "command": ["ollama", "serve"],
                "port": 11434,
                "max_memory_mb": 2048,
                "restart_on_failure": True,
                "startup_delay": 3
            },
            "webgui": {
                "command": ["npm", "run", "dev"],
                "working_dir": "web-gui",
                "port": 3000,
                "max_memory_mb": 1024,
                "depends_on": ["comfyui", "ollama"],
                "restart_on_failure": True,
                "startup_delay": 5,
                "env_vars": {
                    "NODE_ENV": "production"
                }
            }
        }
    }


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="DinoAir Process Manager")
    parser.add_argument("--config", type=Path, help="Configuration file")
    parser.add_argument("--create-config", action="store_true", 
                       help="Create default configuration file")
    
    args = parser.parse_args()
    
    if args.create_config:
        config = create_default_config()
        config_file = Path("process_manager_config.json")
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        print(f"Created default configuration: {config_file}")
        return
    
    # Create process manager
    manager = ProcessManager()
    
    # Load configuration
    if args.config and args.config.exists():
        manager.load_config(args.config)
    else:
        # Use default configuration
        config = create_default_config()
        for name, service_config in config["services"].items():
            manager.add_service(ServiceConfig(
                name=name,
                **service_config
            ))
    
    # Run manager
    try:
        manager.run()
    except KeyboardInterrupt:
        print("\nShutting down...")


if __name__ == "__main__":
    main()