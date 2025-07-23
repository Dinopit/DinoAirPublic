"""
DinoAir Health Monitoring System
Monitors service health and automatically restarts failed services
"""

import time
import logging
import asyncio
import threading
import json
import psutil
import requests
from typing import Dict, List, Optional, Callable, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
import sys
import os

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from lib.process_manager.safe_process_manager import SafeProcessManager, ProcessConfig
from lib.circuit_breaker.circuit_breaker import CircuitBreaker, CircuitBreakerConfig

class ServiceStatus(Enum):
    """Service health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    STARTING = "starting"
    STOPPING = "stopping"
    STOPPED = "stopped"

class CheckType(Enum):
    """Types of health checks"""
    HTTP = "http"
    TCP = "tcp"
    PROCESS = "process"
    CUSTOM = "custom"

@dataclass
class HealthCheckConfig:
    """Configuration for a health check"""
    name: str
    check_type: CheckType
    interval: int = 30  # seconds
    timeout: int = 10   # seconds
    retries: int = 3
    
    # Check-specific configs
    url: Optional[str] = None  # For HTTP checks
    host: Optional[str] = None  # For TCP checks
    port: Optional[int] = None  # For TCP checks
    process_name: Optional[str] = None  # For process checks
    custom_check: Optional[Callable[[], Tuple[bool, str]]] = None  # For custom checks
    
    # Restart configuration
    restart_on_failure: bool = True
    restart_delay: int = 5  # seconds
    max_restart_attempts: int = 3
    restart_window: int = 300  # seconds (5 minutes)

@dataclass
class HealthCheckResult:
    """Result of a health check"""
    service_name: str
    status: ServiceStatus
    message: str
    timestamp: datetime = field(default_factory=datetime.now)
    response_time: Optional[float] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ServiceHealth:
    """Health information for a service"""
    name: str
    status: ServiceStatus = ServiceStatus.STOPPED
    last_check_result: Optional[HealthCheckResult] = None
    consecutive_failures: int = 0
    restart_attempts: List[datetime] = field(default_factory=list)
    uptime: Optional[timedelta] = None
    start_time: Optional[datetime] = None
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    
    def is_restart_allowed(self, config: HealthCheckConfig) -> bool:
        """Check if restart is allowed based on rate limiting"""
        now = datetime.now()
        window_start = now - timedelta(seconds=config.restart_window)
        recent_restarts = [t for t in self.restart_attempts if t > window_start]
        return len(recent_restarts) < config.max_restart_attempts

class HealthMonitor:
    """
    Central health monitoring system for DinoAir
    """
    
    def __init__(self, process_manager: Optional[SafeProcessManager] = None):
        self.process_manager = process_manager or SafeProcessManager()
        self.services: Dict[str, ServiceHealth] = {}
        self.check_configs: Dict[str, HealthCheckConfig] = {}
        self.check_threads: Dict[str, threading.Thread] = {}
        self._running = False
        self._lock = threading.RLock()
        
        # Logger
        self.logger = logging.getLogger("HealthMonitor")
        
        # Circuit breakers for external checks
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        
        # Health history
        self.health_history: List[HealthCheckResult] = []
        self.max_history_size = 1000
        
        # Callbacks
        self.on_service_unhealthy: List[Callable[[str, HealthCheckResult], None]] = []
        self.on_service_recovered: List[Callable[[str, HealthCheckResult], None]] = []
        self.on_service_restarted: List[Callable[[str], None]] = []
    
    def register_service(self, config: HealthCheckConfig):
        """Register a service for health monitoring"""
        with self._lock:
            self.check_configs[config.name] = config
            self.services[config.name] = ServiceHealth(name=config.name)
            
            # Create circuit breaker for external checks
            if config.check_type in [CheckType.HTTP, CheckType.TCP]:
                self.circuit_breakers[config.name] = CircuitBreaker(
                    CircuitBreakerConfig(
                        name=f"health_check_{config.name}",
                        failure_threshold=config.retries,
                        timeout=float(config.timeout),
                        reset_timeout=float(config.interval * 2)
                    )
                )
            
            self.logger.info(f"Registered health check for service: {config.name}")
    
    def start(self):
        """Start health monitoring"""
        with self._lock:
            if self._running:
                return
            
            self._running = True
            
            # Start check threads for each service
            for service_name, config in self.check_configs.items():
                thread = threading.Thread(
                    target=self._health_check_loop,
                    args=(service_name,),
                    daemon=True,
                    name=f"HealthCheck-{service_name}"
                )
                self.check_threads[service_name] = thread
                thread.start()
            
            self.logger.info("Health monitoring started")
    
    def stop(self):
        """Stop health monitoring"""
        with self._lock:
            self._running = False
            
            # Wait for threads to finish
            for thread in self.check_threads.values():
                thread.join(timeout=5)
            
            self.check_threads.clear()
            self.logger.info("Health monitoring stopped")
    
    def _health_check_loop(self, service_name: str):
        """Main health check loop for a service"""
        config = self.check_configs[service_name]
        
        while self._running:
            try:
                # Perform health check
                result = self._perform_health_check(service_name, config)
                
                # Update service health
                self._update_service_health(service_name, result)
                
                # Handle unhealthy services
                if result.status == ServiceStatus.UNHEALTHY:
                    self._handle_unhealthy_service(service_name, result)
                
                # Sleep until next check
                time.sleep(config.interval)
                
            except Exception as e:
                self.logger.error(f"Error in health check loop for {service_name}: {e}")
                time.sleep(config.interval)
    
    def _perform_health_check(self, service_name: str, config: HealthCheckConfig) -> HealthCheckResult:
        """Perform a single health check"""
        start_time = time.time()
        
        try:
            if config.check_type == CheckType.HTTP:
                return self._perform_http_check(service_name, config, start_time)
            elif config.check_type == CheckType.TCP:
                return self._perform_tcp_check(service_name, config, start_time)
            elif config.check_type == CheckType.PROCESS:
                return self._perform_process_check(service_name, config, start_time)
            elif config.check_type == CheckType.CUSTOM:
                return self._perform_custom_check(service_name, config, start_time)
            else:
                return HealthCheckResult(
                    service_name=service_name,
                    status=ServiceStatus.UNHEALTHY,
                    message=f"Unknown check type: {config.check_type}",
                    error="Invalid configuration"
                )
        except Exception as e:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="Health check failed",
                error=str(e),
                response_time=time.time() - start_time
            )
    
    def _perform_http_check(self, service_name: str, config: HealthCheckConfig, start_time: float) -> HealthCheckResult:
        """Perform HTTP health check"""
        if not config.url:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="No URL configured for HTTP check",
                error="Invalid configuration"
            )
        
        try:
            # Use circuit breaker if available
            breaker = self.circuit_breakers.get(service_name)
            
            def make_request():
                response = requests.get(
                    config.url,
                    timeout=config.timeout,
                    allow_redirects=False
                )
                return response
            
            if breaker:
                response = breaker.call(make_request)
            else:
                response = make_request()
            
            response_time = time.time() - start_time
            
            if response.status_code < 400:
                # Try to parse JSON response for additional info
                metadata = {}
                try:
                    if response.headers.get('content-type', '').startswith('application/json'):
                        metadata = response.json()
                except:
                    pass
                
                return HealthCheckResult(
                    service_name=service_name,
                    status=ServiceStatus.HEALTHY,
                    message=f"HTTP {response.status_code}",
                    response_time=response_time,
                    metadata=metadata
                )
            else:
                return HealthCheckResult(
                    service_name=service_name,
                    status=ServiceStatus.UNHEALTHY,
                    message=f"HTTP {response.status_code}",
                    error=f"Unexpected status code: {response.status_code}",
                    response_time=response_time
                )
                
        except requests.exceptions.Timeout:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="Request timeout",
                error=f"Timeout after {config.timeout}s",
                response_time=time.time() - start_time
            )
        except requests.exceptions.ConnectionError:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="Connection failed",
                error="Service unreachable",
                response_time=time.time() - start_time
            )
        except Exception as e:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="Health check failed",
                error=str(e),
                response_time=time.time() - start_time
            )
    
    def _perform_tcp_check(self, service_name: str, config: HealthCheckConfig, start_time: float) -> HealthCheckResult:
        """Perform TCP port check"""
        import socket
        
        if not config.host or not config.port:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="No host/port configured for TCP check",
                error="Invalid configuration"
            )
        
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(config.timeout)
            result = sock.connect_ex((config.host, config.port))
            sock.close()
            
            response_time = time.time() - start_time
            
            if result == 0:
                return HealthCheckResult(
                    service_name=service_name,
                    status=ServiceStatus.HEALTHY,
                    message=f"Port {config.port} is open",
                    response_time=response_time
                )
            else:
                return HealthCheckResult(
                    service_name=service_name,
                    status=ServiceStatus.UNHEALTHY,
                    message=f"Port {config.port} is closed",
                    error=f"Connection failed with code {result}",
                    response_time=response_time
                )
                
        except socket.timeout:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="Connection timeout",
                error=f"Timeout after {config.timeout}s",
                response_time=time.time() - start_time
            )
        except Exception as e:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="TCP check failed",
                error=str(e),
                response_time=time.time() - start_time
            )
    
    def _perform_process_check(self, service_name: str, config: HealthCheckConfig, start_time: float) -> HealthCheckResult:
        """Perform process existence check"""
        if not config.process_name:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="No process name configured",
                error="Invalid configuration"
            )
        
        try:
            # Check if process exists
            process_found = False
            cpu_usage = 0.0
            memory_usage = 0.0
            
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
                try:
                    if config.process_name.lower() in proc.info['name'].lower():
                        process_found = True
                        cpu_usage = proc.cpu_percent()
                        memory_usage = proc.memory_info().rss / (1024 * 1024)  # MB
                        break
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            response_time = time.time() - start_time
            
            if process_found:
                return HealthCheckResult(
                    service_name=service_name,
                    status=ServiceStatus.HEALTHY,
                    message=f"Process '{config.process_name}' is running",
                    response_time=response_time,
                    metadata={
                        "cpu_usage": cpu_usage,
                        "memory_usage_mb": memory_usage
                    }
                )
            else:
                return HealthCheckResult(
                    service_name=service_name,
                    status=ServiceStatus.UNHEALTHY,
                    message=f"Process '{config.process_name}' not found",
                    error="Process not running",
                    response_time=response_time
                )
                
        except Exception as e:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="Process check failed",
                error=str(e),
                response_time=time.time() - start_time
            )
    
    def _perform_custom_check(self, service_name: str, config: HealthCheckConfig, start_time: float) -> HealthCheckResult:
        """Perform custom health check"""
        if not config.custom_check:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="No custom check function configured",
                error="Invalid configuration"
            )
        
        try:
            # Execute custom check function
            is_healthy, message = config.custom_check()
            response_time = time.time() - start_time
            
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.HEALTHY if is_healthy else ServiceStatus.UNHEALTHY,
                message=message,
                response_time=response_time
            )
            
        except Exception as e:
            return HealthCheckResult(
                service_name=service_name,
                status=ServiceStatus.UNHEALTHY,
                message="Custom check failed",
                error=str(e),
                response_time=time.time() - start_time
            )
    
    def _update_service_health(self, service_name: str, result: HealthCheckResult):
        """Update service health information"""
        with self._lock:
            service = self.services[service_name]
            previous_status = service.status
            
            # Update health info
            service.last_check_result = result
            service.status = result.status
            
            # Update consecutive failures
            if result.status == ServiceStatus.UNHEALTHY:
                service.consecutive_failures += 1
            else:
                service.consecutive_failures = 0
            
            # Update resource usage if available
            if result.metadata:
                service.cpu_usage = result.metadata.get('cpu_usage', 0.0)
                service.memory_usage = result.metadata.get('memory_usage_mb', 0.0)
            
            # Update uptime
            if service.start_time:
                service.uptime = datetime.now() - service.start_time
            
            # Add to history
            self.health_history.append(result)
            if len(self.health_history) > self.max_history_size:
                self.health_history.pop(0)
            
            # Trigger callbacks
            if previous_status != ServiceStatus.UNHEALTHY and result.status == ServiceStatus.UNHEALTHY:
                for callback in self.on_service_unhealthy:
                    try:
                        callback(service_name, result)
                    except Exception as e:
                        self.logger.error(f"Error in unhealthy callback: {e}")
            
            elif previous_status == ServiceStatus.UNHEALTHY and result.status == ServiceStatus.HEALTHY:
                for callback in self.on_service_recovered:
                    try:
                        callback(service_name, result)
                    except Exception as e:
                        self.logger.error(f"Error in recovery callback: {e}")
    
    def _handle_unhealthy_service(self, service_name: str, result: HealthCheckResult):
        """Handle an unhealthy service"""
        config = self.check_configs[service_name]
        service = self.services[service_name]
        
        # Check if restart is enabled and allowed
        if not config.restart_on_failure:
            self.logger.warning(f"Service {service_name} is unhealthy but restart is disabled")
            return
        
        if not service.is_restart_allowed(config):
            self.logger.error(f"Service {service_name} has exceeded restart limit")
            return
        
        # Wait for consecutive failures before restart
        if service.consecutive_failures < config.retries:
            self.logger.warning(
                f"Service {service_name} failed {service.consecutive_failures}/{config.retries} times"
            )
            return
        
        # Restart service
        self.logger.warning(f"Attempting to restart service {service_name}")
        time.sleep(config.restart_delay)
        
        try:
            self._restart_service(service_name)
            
            # Record restart attempt
            service.restart_attempts.append(datetime.now())
            
            # Trigger callback
            for callback in self.on_service_restarted:
                try:
                    callback(service_name)
                except Exception as e:
                    self.logger.error(f"Error in restart callback: {e}")
                    
        except Exception as e:
            self.logger.error(f"Failed to restart service {service_name}: {e}")
    
    def _restart_service(self, service_name: str):
        """Restart a service"""
        # If we have a process manager, use it
        if self.process_manager and service_name in self.process_manager.processes:
            self.process_manager.restart_process(service_name)
        else:
            # Otherwise, implement service-specific restart logic
            if service_name == "comfyui":
                self._restart_comfyui()
            elif service_name == "ollama":
                self._restart_ollama()
            elif service_name == "web-gui":
                self._restart_web_gui()
            else:
                raise ValueError(f"Unknown service: {service_name}")
    
    def _restart_comfyui(self):
        """Restart ComfyUI service"""
        # This would be implemented based on how ComfyUI is started
        self.logger.info("Restarting ComfyUI...")
        # Placeholder - actual implementation would depend on DinoAir's architecture
    
    def _restart_ollama(self):
        """Restart Ollama service"""
        # This would be implemented based on how Ollama is started
        self.logger.info("Restarting Ollama...")
        # Placeholder - actual implementation would depend on DinoAir's architecture
    
    def _restart_web_gui(self):
        """Restart Web GUI service"""
        # This would be implemented based on how the web GUI is started
        self.logger.info("Restarting Web GUI...")
        # Placeholder - actual implementation would depend on DinoAir's architecture
    
    def get_service_health(self, service_name: str) -> Optional[ServiceHealth]:
        """Get health information for a specific service"""
        with self._lock:
            return self.services.get(service_name)
    
    def get_all_health(self) -> Dict[str, ServiceHealth]:
        """Get health information for all services"""
        with self._lock:
            return self.services.copy()
    
    def get_overall_status(self) -> ServiceStatus:
        """Get overall system health status"""
        with self._lock:
            statuses = [s.status for s in self.services.values()]
            
            if not statuses:
                return ServiceStatus.STOPPED
            
            if all(s == ServiceStatus.HEALTHY for s in statuses):
                return ServiceStatus.HEALTHY
            elif any(s == ServiceStatus.UNHEALTHY for s in statuses):
                return ServiceStatus.UNHEALTHY
            elif any(s == ServiceStatus.DEGRADED for s in statuses):
                return ServiceStatus.DEGRADED
            else:
                return ServiceStatus.STARTING
    
    def get_health_report(self) -> Dict[str, Any]:
        """Generate comprehensive health report"""
        with self._lock:
            overall_status = self.get_overall_status()
            services_health = {}
            
            for name, health in self.services.items():
                services_health[name] = {
                    "status": health.status.value,
                    "uptime": str(health.uptime) if health.uptime else None,
                    "consecutive_failures": health.consecutive_failures,
                    "restart_attempts": len(health.restart_attempts),
                    "cpu_usage": health.cpu_usage,
                    "memory_usage_mb": health.memory_usage,
                    "last_check": health.last_check_result.timestamp.isoformat() 
                                 if health.last_check_result else None,
                    "last_message": health.last_check_result.message 
                                   if health.last_check_result else None
                }
            
            return {
                "overall_status": overall_status.value,
                "timestamp": datetime.now().isoformat(),
                "services": services_health,
                "recent_events": [
                    {
                        "service": r.service_name,
                        "status": r.status.value,
                        "message": r.message,
                        "timestamp": r.timestamp.isoformat()
                    }
                    for r in self.health_history[-10:]  # Last 10 events
                ]
            }

# Pre-configured health checks for DinoAir services
def get_dinoair_health_checks() -> List[HealthCheckConfig]:
    """Get default health check configurations for DinoAir services"""
    return [
        # ComfyUI health check
        HealthCheckConfig(
            name="comfyui",
            check_type=CheckType.HTTP,
            url="http://localhost:8188/system_stats",
            interval=30,
            timeout=10,
            retries=3,
            restart_on_failure=True,
            max_restart_attempts=3
        ),
        
        # Ollama health check
        HealthCheckConfig(
            name="ollama",
            check_type=CheckType.HTTP,
            url="http://localhost:11434/api/tags",
            interval=30,
            timeout=10,
            retries=3,
            restart_on_failure=True,
            max_restart_attempts=3
        ),
        
        # Web GUI health check
        HealthCheckConfig(
            name="web-gui",
            check_type=CheckType.HTTP,
            url="http://localhost:3000/api/health",
            interval=20,
            timeout=5,
            retries=2,
            restart_on_failure=True,
            max_restart_attempts=5
        ),
        
        # Process checks as backup
        HealthCheckConfig(
            name="comfyui-process",
            check_type=CheckType.PROCESS,
            process_name="python",
            interval=60,
            restart_on_failure=False  # Handled by main check
        ),
        
        HealthCheckConfig(
            name="ollama-process",
            check_type=CheckType.PROCESS,
            process_name="ollama",
            interval=60,
            restart_on_failure=False  # Handled by main check
        )
    ]

if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    
    # Create health monitor
    monitor = HealthMonitor()
    
    # Register services
    for config in get_dinoair_health_checks():
        monitor.register_service(config)
    
    # Add callbacks
    def on_unhealthy(service: str, result: HealthCheckResult):
        print(f"🚨 Service {service} is unhealthy: {result.message}")
    
    def on_recovered(service: str, result: HealthCheckResult):
        print(f"✅ Service {service} recovered: {result.message}")
    
    monitor.on_service_unhealthy.append(on_unhealthy)
    monitor.on_service_recovered.append(on_recovered)
    
    # Start monitoring
    monitor.start()
    
    try:
        # Run for demo
        while True:
            time.sleep(10)
            report = monitor.get_health_report()
            print(f"\n📊 Health Report: {json.dumps(report, indent=2)}")
    except KeyboardInterrupt:
        monitor.stop()