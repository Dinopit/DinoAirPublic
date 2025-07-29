#!/usr/bin/env python3
"""
Enhanced Monitoring Integration for DinoAir
Integrates OpenTelemetry tracing, audit logging, alerting, and dashboards.
"""

import os
import json
import uuid
import threading
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from pathlib import Path

# Import our monitoring components
try:
    from .opentelemetry_tracer import get_tracer, TraceConfig, init_tracing
    from .audit_logger import get_audit_logger, AuditEventType, AuditSeverity, AuditOutcome, audit_log
    from .resource_monitor import ResourceMonitor, ResourceType, AlertLevel
    from ..correlation_id import set_current_correlation_id as set_correlation_id, get_current_correlation_id as get_correlation_id
except ImportError as e:
    print(f"Warning: Failed to import monitoring components: {e}")
    
    # Define dummy functions for missing imports
    def get_correlation_id():
        """No-op dummy correlation ID function."""
        return None
    
    def set_correlation_id(correlation_id):
        """No-op dummy correlation ID setter function."""
        pass
    
    # Define dummy classes
    class TraceConfig:
        """No-op dummy TraceConfig class."""
        def __init__(self, **kwargs):
            pass
    
    class AuditEventType:
        """No-op dummy AuditEventType enum-like class."""
        class _DummyEventType:
            def __init__(self, value):
                self.value = value
        
        SYSTEM_ACCESS = _DummyEventType("system_access")
        AUTHENTICATION = _DummyEventType("authentication")
        AUTHORIZATION = _DummyEventType("authorization")
        DATA_ACCESS = _DummyEventType("data_access")
    
    class AuditSeverity:
        """No-op dummy AuditSeverity enum-like class."""
        class _DummySeverity:
            def __init__(self, value):
                self.value = value
        
        LOW = _DummySeverity("low")
        MEDIUM = _DummySeverity("medium")
        HIGH = _DummySeverity("high")
        CRITICAL = _DummySeverity("critical")
    
    class AuditOutcome:
        """No-op dummy AuditOutcome enum-like class."""
        class _DummyOutcome:
            def __init__(self, value):
                self.value = value
        
        SUCCESS = _DummyOutcome("success")
        FAILURE = _DummyOutcome("failure")
    
    class ResourceMonitor:
        """No-op dummy ResourceMonitor class."""
        def __init__(self, **kwargs):
            pass
        
        def start_monitoring(self):
            """No-op start_monitoring method."""
            pass
        
        def get_current_metrics(self):
            """No-op get_current_metrics method."""
            return {}
    
    class AlertLevel:
        """No-op dummy AlertLevel enum-like class."""
        class _DummyAlertLevel:
            def __init__(self, value):
                self.value = value
        
        WARNING = _DummyAlertLevel("warning")
        CRITICAL = _DummyAlertLevel("critical")
    
    def get_tracer(*args, **kwargs):
        """No-op dummy tracer function."""
        return None
    
    def init_tracing(*args, **kwargs):
        """No-op dummy init_tracing function."""
        return None
    
    def get_audit_logger(*args, **kwargs):
        """No-op dummy audit logger function."""
        return None
    
    def audit_log(*args, **kwargs):
        """No-op dummy audit_log function."""
        pass

# Import existing systems
try:
    from ...alerting_system import AlertingSystem, Alert, AlertSeverity, AlertCategory
    from ...structured_logging import StructuredLogger, LogLevel, LogCategory
except ImportError as e:
    print(f"Warning: Failed to import existing systems: {e}")
    # Define dummy classes to avoid import errors
    class AlertSeverity:
        """No-op dummy AlertSeverity enum-like class."""
        class _DummyAlertSeverity:
            def __init__(self, value):
                self.value = value
        
        LOW = _DummyAlertSeverity("low")
        MEDIUM = _DummyAlertSeverity("medium")
        HIGH = _DummyAlertSeverity("high")
        CRITICAL = _DummyAlertSeverity("critical")
    
    class AlertCategory:
        """No-op dummy AlertCategory enum-like class."""
        class _DummyAlertCategory:
            def __init__(self, value):
                self.value = value
        
        SECURITY_BREACH = _DummyAlertCategory("security_breach")
        SYSTEM_FAILURE = _DummyAlertCategory("system_failure")
        PERFORMANCE_DEGRADATION = _DummyAlertCategory("performance_degradation")
    
    class LogLevel:
        """No-op dummy LogLevel enum-like class."""
        class _DummyLogLevel:
            def __init__(self, value):
                self.value = value
        
        INFO = _DummyLogLevel("INFO")
        ERROR = _DummyLogLevel("ERROR")
        DEBUG = _DummyLogLevel("DEBUG")
        WARN = _DummyLogLevel("WARN")
        TRACE = _DummyLogLevel("TRACE")
        FATAL = _DummyLogLevel("FATAL")
    
    class LogCategory:
        """No-op dummy LogCategory enum-like class."""
        class _DummyLogCategory:
            def __init__(self, value):
                self.value = value
        
        SYSTEM = _DummyLogCategory("system")
        SECURITY = _DummyLogCategory("security")
        PERFORMANCE = _DummyLogCategory("performance")
        BUSINESS = _DummyLogCategory("business")
        AUDIT = _DummyLogCategory("audit")
        INTEGRATION = _DummyLogCategory("integration")
        USER_ACTION = _DummyLogCategory("user_action")
    
    class Alert:
        """No-op dummy Alert class that accepts all parameters but does nothing."""
        def __init__(self, **kwargs):
            # Accept any parameters and store them as attributes
            for key, value in kwargs.items():
                setattr(self, key, value)
    
    class AlertingSystem:
        """No-op dummy AlertingSystem class with required interface."""
        def __init__(self, *args, **kwargs):
            pass
        
        def send_alert(self, alert):
            """No-op send_alert method."""
            pass
    
    class StructuredLogger:
        """No-op dummy StructuredLogger class with required interface."""
        def __init__(self, *args, **kwargs):
            pass
        
        def log(self, level, message, category=None, **kwargs):
            """No-op log method."""
            pass
        
        def info(self, message, category=None, **kwargs):
            """No-op info method."""
            pass
        
        def warn(self, message, category=None, **kwargs):
            """No-op warn method."""
            pass
        
        def error(self, message, category=None, **kwargs):
            """No-op error method."""
            pass
        
        def debug(self, message, category=None, **kwargs):
            """No-op debug method."""
            pass


@dataclass
class MonitoringConfig:
    """Configuration for the integrated monitoring system."""
    # Tracing configuration
    enable_tracing: bool = True
    jaeger_endpoint: Optional[str] = None
    otlp_endpoint: Optional[str] = None
    trace_sample_rate: float = 1.0
    
    # Audit logging configuration
    enable_audit_logging: bool = True
    audit_log_directory: str = "/var/log/dinoair/audit"
    audit_encryption_enabled: bool = True
    
    # Resource monitoring configuration
    enable_resource_monitoring: bool = True
    resource_monitor_interval: int = 30
    
    # Alerting configuration
    enable_alerting: bool = True
    alert_cooldown_minutes: int = 5
    
    # Dashboard configuration
    dashboard_config_path: str = "config/dashboards"
    
    # Integration settings
    correlation_id_header: str = "X-Correlation-ID"
    service_name: str = "dinoair"
    environment: str = "production"


class EnhancedMonitoringSystem:
    """Integrated monitoring system that coordinates all monitoring components."""
    
    def __init__(self, config: Optional[MonitoringConfig] = None):
        self.config = config or MonitoringConfig()
        self._initialized = False
        self._tracer = None
        self._audit_logger = None
        self._resource_monitor = None
        self._alerting_system = None
        self._structured_logger = None
        self._lock = threading.Lock()
        
        # Initialize components
        self._initialize()
    
    def _initialize(self):
        """Initialize all monitoring components."""
        if self._initialized:
            return
        
        with self._lock:
            if self._initialized:
                return
            
            try:
                # Initialize distributed tracing
                if self.config.enable_tracing:
                    trace_config = TraceConfig(
                        service_name=self.config.service_name,
                        environment=self.config.environment,
                        jaeger_endpoint=self.config.jaeger_endpoint,
                        otlp_endpoint=self.config.otlp_endpoint,
                        sample_rate=self.config.trace_sample_rate
                    )
                    self._tracer = init_tracing(trace_config)
                
                # Initialize audit logging
                if self.config.enable_audit_logging:
                    audit_config = {
                        'log_directory': self.config.audit_log_directory,
                        'enable_encryption': self.config.audit_encryption_enabled
                    }
                    self._audit_logger = get_audit_logger(audit_config)
                
                # Initialize resource monitoring
                if self.config.enable_resource_monitoring:
                    self._resource_monitor = ResourceMonitor(
                        monitor_interval=self.config.resource_monitor_interval,
                        alert_callback=self._handle_resource_alert
                    )
                    self._resource_monitor.start_monitoring()
                
                # Initialize alerting system
                if self.config.enable_alerting:
                    self._alerting_system = AlertingSystem()
                
                # Initialize structured logging
                try:
                    self._structured_logger = StructuredLogger()
                except Exception:
                    print("Warning: Failed to initialize structured logger")
                
                self._initialized = True
                
                # Log successful initialization
                self.audit_operation(
                    event_type=AuditEventType.SYSTEM_ACCESS,
                    action="monitoring_system_initialized",
                    resource="monitoring_system",
                    outcome=AuditOutcome.SUCCESS,
                    details={"config": self._get_safe_config()}
                )
                
            except Exception as e:
                print(f"Error initializing monitoring system: {e}")
                # Continue without full monitoring rather than failing
    
    def _get_safe_config(self) -> Dict[str, Any]:
        """Get configuration without sensitive information."""
        return {
            "enable_tracing": self.config.enable_tracing,
            "enable_audit_logging": self.config.enable_audit_logging,
            "enable_resource_monitoring": self.config.enable_resource_monitoring,
            "enable_alerting": self.config.enable_alerting,
            "service_name": self.config.service_name,
            "environment": self.config.environment
        }
    
    def _handle_resource_alert(self, alert_data: Dict[str, Any]):
        """Handle resource monitoring alerts."""
        try:
            # Create alert for the alerting system
            alert = Alert(
                id=str(uuid.uuid4()),
                title=f"Resource Alert: {alert_data.get('resource_type', 'Unknown')}",
                description=alert_data.get('message', 'Resource threshold exceeded'),
                severity=self._map_alert_level_to_severity(alert_data.get('level', AlertLevel.WARNING)),
                category=AlertCategory.PERFORMANCE_DEGRADATION,
                source="resource_monitor",
                timestamp=datetime.now(timezone.utc),
                correlation_id=get_correlation_id(),
                metadata=alert_data
            )
            
            if self._alerting_system:
                self._alerting_system.send_alert(alert)
            
            # Log audit event for resource alert
            self.audit_operation(
                event_type=AuditEventType.SYSTEM_ACCESS,
                action="resource_alert_triggered",
                resource=f"resource_{alert_data.get('resource_type', 'unknown')}",
                severity=AuditSeverity.HIGH if alert.severity in [AlertSeverity.HIGH, AlertSeverity.CRITICAL] else AuditSeverity.MEDIUM,
                details=alert_data
            )
            
        except Exception as e:
            print(f"Error handling resource alert: {e}")
    
    def _map_alert_level_to_severity(self, level: AlertLevel) -> AlertSeverity:
        """Map resource alert level to alert severity."""
        mapping = {
            AlertLevel.INFO: AlertSeverity.LOW,
            AlertLevel.WARNING: AlertSeverity.MEDIUM,
            AlertLevel.CRITICAL: AlertSeverity.HIGH,
            AlertLevel.EMERGENCY: AlertSeverity.CRITICAL
        }
        return mapping.get(level, AlertSeverity.MEDIUM)
    
    def start_span(self, name: str, correlation_id: Optional[str] = None, **kwargs):
        """Start a distributed trace span with correlation ID."""
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
            set_correlation_id(correlation_id)
        
        if self._tracer:
            return self._tracer.start_span(name, correlation_id, **kwargs)
        else:
            # Return a no-op context manager
            from contextlib import nullcontext
            return nullcontext()
    
    def audit_operation(
        self,
        event_type: AuditEventType,
        action: str,
        resource: str,
        outcome: AuditOutcome = AuditOutcome.SUCCESS,
        severity: AuditSeverity = AuditSeverity.MEDIUM,
        **kwargs
    ):
        """Log an audit event."""
        if self._audit_logger:
            self._audit_logger.log_event(
                event_type=event_type,
                action=action,
                resource=resource,
                outcome=outcome,
                severity=severity,
                **kwargs
            )
    
    def log_structured(
        self,
        level: LogLevel,
        message: str,
        category: LogCategory = LogCategory.SYSTEM,
        **kwargs
    ):
        """Log a structured message."""
        if self._structured_logger:
            self._structured_logger.log(level, message, category, **kwargs)
        else:
            print(f"{level.value}: {message}")
    
    def send_alert(
        self,
        title: str,
        description: str,
        severity: AlertSeverity = AlertSeverity.MEDIUM,
        category: AlertCategory = AlertCategory.SYSTEM_FAILURE,
        **kwargs
    ):
        """Send an alert."""
        if self._alerting_system:
            alert = Alert(
                id=str(uuid.uuid4()),
                title=title,
                description=description,
                severity=severity,
                category=category,
                source="monitoring_system",
                timestamp=datetime.now(timezone.utc),
                correlation_id=get_correlation_id(),
                **kwargs
            )
            self._alerting_system.send_alert(alert)
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall system health status."""
        health = {
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": {
                "tracing": self._tracer is not None and self.config.enable_tracing,
                "audit_logging": self._audit_logger is not None and self.config.enable_audit_logging,
                "resource_monitoring": self._resource_monitor is not None and self.config.enable_resource_monitoring,
                "alerting": self._alerting_system is not None and self.config.enable_alerting,
                "structured_logging": self._structured_logger is not None
            }
        }
        
        # Check if any critical components are down
        critical_components = ["audit_logging", "alerting"]
        if not all(health["components"][comp] for comp in critical_components):
            health["status"] = "degraded"
        
        # Add resource metrics if available
        if self._resource_monitor:
            try:
                metrics = self._resource_monitor.get_current_metrics()
                health["metrics"] = metrics
                
                # Check for critical resource usage
                cpu_usage = metrics.get("cpu_percent", 0)
                memory_usage = metrics.get("memory_percent", 0)
                
                if cpu_usage > 90 or memory_usage > 90:
                    health["status"] = "critical"
                elif cpu_usage > 70 or memory_usage > 70:
                    health["status"] = "degraded"
                    
            except Exception as e:
                health["metrics_error"] = str(e)
        
        return health
    
    def shutdown(self):
        """Shutdown monitoring system gracefully."""
        try:
            # Log shutdown event
            self.audit_operation(
                event_type=AuditEventType.SYSTEM_ACCESS,
                action="monitoring_system_shutdown",
                resource="monitoring_system",
                outcome=AuditOutcome.SUCCESS
            )
            
            # Stop resource monitoring
            if self._resource_monitor:
                self._resource_monitor.stop_monitoring()
            
            # Close tracer
            if self._tracer:
                # OpenTelemetry tracers don't need explicit shutdown
                pass
                
            self._initialized = False
            
        except Exception as e:
            print(f"Error during monitoring system shutdown: {e}")


# Global monitoring instance
_monitoring_system: Optional[EnhancedMonitoringSystem] = None


def get_monitoring_system(config: Optional[MonitoringConfig] = None) -> EnhancedMonitoringSystem:
    """Get the global monitoring system instance."""
    global _monitoring_system
    if _monitoring_system is None:
        _monitoring_system = EnhancedMonitoringSystem(config)
    return _monitoring_system


def init_monitoring(config: Optional[MonitoringConfig] = None) -> EnhancedMonitoringSystem:
    """Initialize the global monitoring system."""
    global _monitoring_system
    _monitoring_system = EnhancedMonitoringSystem(config)
    return _monitoring_system


# Convenience functions
def start_span(name: str, correlation_id: Optional[str] = None, **kwargs):
    """Start a distributed trace span."""
    return get_monitoring_system().start_span(name, correlation_id, **kwargs)


def audit_log_operation(event_type: AuditEventType, action: str, resource: str, **kwargs):
    """Log an audit event."""
    get_monitoring_system().audit_operation(event_type, action, resource, **kwargs)


def send_alert(title: str, description: str, severity: AlertSeverity = AlertSeverity.MEDIUM, **kwargs):
    """Send an alert."""
    get_monitoring_system().send_alert(title, description, severity, **kwargs)


def log_structured(level: LogLevel, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
    """Log a structured message.""" 
    get_monitoring_system().log_structured(level, message, category, **kwargs)


def get_health_status() -> Dict[str, Any]:
    """Get system health status."""
    return get_monitoring_system().get_health_status()


# Decorator for monitoring function execution
def monitor_operation(
    operation_name: Optional[str] = None,
    audit_event_type: Optional[AuditEventType] = None,
    include_args: bool = False,
    alert_on_failure: bool = True
):
    """Decorator to monitor function execution with tracing and auditing."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            func_name = operation_name or func.__name__
            correlation_id = get_correlation_id() or str(uuid.uuid4())
            
            # Start distributed trace
            with start_span(f"operation_{func_name}", correlation_id) as span:
                try:
                    # Audit operation start if specified
                    if audit_event_type:
                        details = {}
                        if include_args:
                            details['args'] = str(args)[:500]
                            details['kwargs'] = {k: str(v)[:100] for k, v in kwargs.items()}
                        
                        audit_log_operation(
                            event_type=audit_event_type,
                            action=f"start_{func_name}",
                            resource=func_name,
                            details=details
                        )
                    
                    # Execute function
                    result = func(*args, **kwargs)
                    
                    # Audit successful completion
                    if audit_event_type:
                        audit_log_operation(
                            event_type=audit_event_type,
                            action=f"complete_{func_name}",
                            resource=func_name,
                            outcome=AuditOutcome.SUCCESS
                        )
                    
                    return result
                    
                except Exception as e:
                    # Log error in span
                    if span and hasattr(span, 'set_attribute'):
                        span.set_attribute("error", True)
                        span.set_attribute("error.message", str(e))
                    
                    # Audit failure
                    if audit_event_type:
                        audit_log_operation(
                            event_type=audit_event_type,
                            action=f"fail_{func_name}",
                            resource=func_name,
                            outcome=AuditOutcome.FAILURE,
                            severity=AuditSeverity.HIGH,
                            details={"error": str(e)}
                        )
                    
                    # Send alert on failure if enabled
                    if alert_on_failure:
                        send_alert(
                            title=f"Operation Failed: {func_name}",
                            description=f"Function {func_name} failed with error: {str(e)}",
                            severity=AlertSeverity.HIGH,
                            category=AlertCategory.SYSTEM_FAILURE
                        )
                    
                    raise
        
        return wrapper
    return decorator