"""
DinoAir Error Boundary and Recovery System
Provides comprehensive error handling and recovery mechanisms
"""

import sys
import logging
import traceback
import functools
import asyncio
import time
from typing import Optional, Callable, Any, Dict, List, Type, Union
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
import json
import threading
from pathlib import Path

class ErrorSeverity(Enum):
    """Error severity levels"""
    LOW = "low"          # Can be ignored
    MEDIUM = "medium"    # Should be logged
    HIGH = "high"        # Requires intervention
    CRITICAL = "critical" # System failure

class RecoveryStrategy(Enum):
    """Recovery strategies for errors"""
    IGNORE = "ignore"
    RETRY = "retry"
    RESTART = "restart"
    FALLBACK = "fallback"
    SHUTDOWN = "shutdown"

@dataclass
class ErrorContext:
    """Context information for an error"""
    error_type: str
    message: str
    severity: ErrorSeverity
    timestamp: datetime = field(default_factory=datetime.now)
    stack_trace: str = ""
    component: str = ""
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    recovery_attempts: int = 0

@dataclass
class RecoveryConfig:
    """Configuration for error recovery"""
    strategy: RecoveryStrategy = RecoveryStrategy.RETRY
    max_retries: int = 3
    retry_delay: float = 1.0  # seconds
    exponential_backoff: bool = True
    fallback_handler: Optional[Callable] = None
    on_recovery_failure: Optional[Callable] = None

class ErrorBoundary:
    """
    Error boundary implementation for catching and handling errors
    """
    
    def __init__(self, component_name: str):
        self.component_name = component_name
        self.logger = logging.getLogger(f"ErrorBoundary.{component_name}")
        self.error_history: List[ErrorContext] = []
        self.max_history_size = 100
        self._lock = threading.RLock()
        
        # Error handlers by type
        self.error_handlers: Dict[Type[Exception], RecoveryConfig] = {}
        
        # Global error handler
        self.default_handler = RecoveryConfig(
            strategy=RecoveryStrategy.RETRY,
            max_retries=3
        )
        
        # Callbacks
        self.on_error: List[Callable[[ErrorContext], None]] = []
        self.on_recovery: List[Callable[[ErrorContext], None]] = []
        self.on_recovery_failure: List[Callable[[ErrorContext], None]] = []
    
    def register_handler(self, error_type: Type[Exception], config: RecoveryConfig):
        """Register a handler for specific error type"""
        self.error_handlers[error_type] = config
        self.logger.info(f"Registered handler for {error_type.__name__}")
    
    def catch(self, func: Callable = None, *, 
              severity: ErrorSeverity = ErrorSeverity.MEDIUM,
              recovery: Optional[RecoveryConfig] = None):
        """
        Decorator to catch and handle errors
        
        Usage:
            @error_boundary.catch(severity=ErrorSeverity.HIGH)
            def risky_operation():
                ...
        """
        def decorator(f: Callable) -> Callable:
            @functools.wraps(f)
            def sync_wrapper(*args, **kwargs):
                return self._execute_with_boundary(
                    f, args, kwargs, severity, recovery
                )
            
            @functools.wraps(f)
            async def async_wrapper(*args, **kwargs):
                return await self._execute_with_boundary_async(
                    f, args, kwargs, severity, recovery
                )
            
            if asyncio.iscoroutinefunction(f):
                return async_wrapper
            else:
                return sync_wrapper
        
        if func is None:
            return decorator
        else:
            return decorator(func)
    
    def _execute_with_boundary(self, func: Callable, args: tuple, kwargs: dict,
                              severity: ErrorSeverity, recovery: Optional[RecoveryConfig]):
        """Execute function with error boundary (sync)"""
        attempt = 0
        last_error = None
        
        config = recovery or self._get_recovery_config(None)
        
        while attempt <= config.max_retries:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_error = e
                context = self._create_error_context(e, severity, attempt)
                self._handle_error(context, config)
                
                if config.strategy == RecoveryStrategy.IGNORE:
                    return None
                elif config.strategy == RecoveryStrategy.FALLBACK and config.fallback_handler:
                    return config.fallback_handler(*args, **kwargs)
                elif config.strategy == RecoveryStrategy.SHUTDOWN:
                    self._shutdown_component()
                    raise
                elif config.strategy == RecoveryStrategy.RETRY:
                    attempt += 1
                    if attempt > config.max_retries:
                        break
                    
                    # Calculate delay
                    delay = config.retry_delay
                    if config.exponential_backoff:
                        delay *= (2 ** (attempt - 1))
                    
                    self.logger.warning(
                        f"Retrying {func.__name__} after {delay}s (attempt {attempt}/{config.max_retries})"
                    )
                    time.sleep(delay)
                else:
                    break
        
        # Recovery failed
        if last_error:
            self._handle_recovery_failure(context, config)
            raise last_error
    
    async def _execute_with_boundary_async(self, func: Callable, args: tuple, kwargs: dict,
                                         severity: ErrorSeverity, recovery: Optional[RecoveryConfig]):
        """Execute function with error boundary (async)"""
        attempt = 0
        last_error = None
        
        config = recovery or self._get_recovery_config(None)
        
        while attempt <= config.max_retries:
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_error = e
                context = self._create_error_context(e, severity, attempt)
                self._handle_error(context, config)
                
                if config.strategy == RecoveryStrategy.IGNORE:
                    return None
                elif config.strategy == RecoveryStrategy.FALLBACK and config.fallback_handler:
                    if asyncio.iscoroutinefunction(config.fallback_handler):
                        return await config.fallback_handler(*args, **kwargs)
                    else:
                        return config.fallback_handler(*args, **kwargs)
                elif config.strategy == RecoveryStrategy.SHUTDOWN:
                    self._shutdown_component()
                    raise
                elif config.strategy == RecoveryStrategy.RETRY:
                    attempt += 1
                    if attempt > config.max_retries:
                        break
                    
                    # Calculate delay
                    delay = config.retry_delay
                    if config.exponential_backoff:
                        delay *= (2 ** (attempt - 1))
                    
                    self.logger.warning(
                        f"Retrying {func.__name__} after {delay}s (attempt {attempt}/{config.max_retries})"
                    )
                    await asyncio.sleep(delay)
                else:
                    break
        
        # Recovery failed
        if last_error:
            self._handle_recovery_failure(context, config)
            raise last_error
    
    def _create_error_context(self, error: Exception, severity: ErrorSeverity, 
                            attempt: int) -> ErrorContext:
        """Create error context from exception"""
        return ErrorContext(
            error_type=type(error).__name__,
            message=str(error),
            severity=severity,
            stack_trace=traceback.format_exc(),
            component=self.component_name,
            recovery_attempts=attempt,
            metadata={
                "python_version": sys.version,
                "thread_id": threading.current_thread().ident
            }
        )
    
    def _get_recovery_config(self, error: Optional[Exception]) -> RecoveryConfig:
        """Get recovery configuration for error type"""
        if error:
            # Check registered handlers
            for error_type, config in self.error_handlers.items():
                if isinstance(error, error_type):
                    return config
        
        return self.default_handler
    
    def _handle_error(self, context: ErrorContext, config: RecoveryConfig):
        """Handle an error"""
        with self._lock:
            # Add to history
            self.error_history.append(context)
            if len(self.error_history) > self.max_history_size:
                self.error_history.pop(0)
            
            # Log error
            self._log_error(context)
            
            # Trigger callbacks
            for callback in self.on_error:
                try:
                    callback(context)
                except Exception as e:
                    self.logger.error(f"Error in error callback: {e}")
    
    def _handle_recovery_failure(self, context: ErrorContext, config: RecoveryConfig):
        """Handle recovery failure"""
        self.logger.error(
            f"Recovery failed for {context.error_type} in {self.component_name} "
            f"after {context.recovery_attempts} attempts"
        )
        
        # Trigger callbacks
        for callback in self.on_recovery_failure:
            try:
                callback(context)
            except Exception as e:
                self.logger.error(f"Error in recovery failure callback: {e}")
        
        if config.on_recovery_failure:
            try:
                config.on_recovery_failure(context)
            except Exception as e:
                self.logger.error(f"Error in custom recovery failure handler: {e}")
    
    def _log_error(self, context: ErrorContext):
        """Log error based on severity"""
        message = (
            f"Error in {context.component}: {context.error_type} - {context.message}\n"
            f"Severity: {context.severity.value}\n"
            f"Stack trace:\n{context.stack_trace}"
        )
        
        if context.severity == ErrorSeverity.CRITICAL:
            self.logger.critical(message)
        elif context.severity == ErrorSeverity.HIGH:
            self.logger.error(message)
        elif context.severity == ErrorSeverity.MEDIUM:
            self.logger.warning(message)
        else:
            self.logger.info(message)
    
    def _shutdown_component(self):
        """Shutdown component on critical error"""
        self.logger.critical(f"Shutting down {self.component_name} due to critical error")
        # Component-specific shutdown logic would go here
    
    def get_error_stats(self) -> Dict[str, Any]:
        """Get error statistics"""
        with self._lock:
            if not self.error_history:
                return {
                    "total_errors": 0,
                    "errors_by_type": {},
                    "errors_by_severity": {},
                    "recent_errors": []
                }
            
            errors_by_type = {}
            errors_by_severity = {s.value: 0 for s in ErrorSeverity}
            
            for error in self.error_history:
                # Count by type
                if error.error_type not in errors_by_type:
                    errors_by_type[error.error_type] = 0
                errors_by_type[error.error_type] += 1
                
                # Count by severity
                errors_by_severity[error.severity.value] += 1
            
            return {
                "total_errors": len(self.error_history),
                "errors_by_type": errors_by_type,
                "errors_by_severity": errors_by_severity,
                "recent_errors": [
                    {
                        "type": e.error_type,
                        "message": e.message,
                        "severity": e.severity.value,
                        "timestamp": e.timestamp.isoformat(),
                        "component": e.component
                    }
                    for e in self.error_history[-10:]  # Last 10 errors
                ]
            }

class GlobalErrorHandler:
    """
    Global error handler for the entire DinoAir system
    """
    
    def __init__(self):
        self.boundaries: Dict[str, ErrorBoundary] = {}
        self.logger = logging.getLogger("GlobalErrorHandler")
        self._setup_global_handlers()
    
    def _setup_global_handlers(self):
        """Setup global exception handlers"""
        # Handle uncaught exceptions
        sys.excepthook = self._handle_uncaught_exception
        
        # Handle unhandled promise rejections in async code
        def handle_async_exception(loop, context):
            exception = context.get('exception')
            if exception:
                self._handle_uncaught_exception(
                    type(exception),
                    exception,
                    exception.__traceback__
                )
        
        # Set up async exception handler
        try:
            loop = asyncio.get_event_loop()
            loop.set_exception_handler(handle_async_exception)
        except RuntimeError:
            # No event loop yet
            pass
    
    def _handle_uncaught_exception(self, exc_type, exc_value, exc_traceback):
        """Handle uncaught exceptions"""
        if issubclass(exc_type, KeyboardInterrupt):
            # Allow keyboard interrupt to work normally
            sys.__excepthook__(exc_type, exc_value, exc_traceback)
            return
        
        self.logger.critical(
            "Uncaught exception",
            exc_info=(exc_type, exc_value, exc_traceback)
        )
        
        # Create error context
        context = ErrorContext(
            error_type=exc_type.__name__,
            message=str(exc_value),
            severity=ErrorSeverity.CRITICAL,
            stack_trace=traceback.format_exception(exc_type, exc_value, exc_traceback),
            component="global"
        )
        
        # Save crash report
        self._save_crash_report(context)
    
    def _save_crash_report(self, context: ErrorContext):
        """Save crash report to file"""
        crash_dir = Path("logs/crashes")
        crash_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"crash_{context.timestamp.strftime('%Y%m%d_%H%M%S')}.json"
        filepath = crash_dir / filename
        
        report = {
            "error_type": context.error_type,
            "message": context.message,
            "timestamp": context.timestamp.isoformat(),
            "component": context.component,
            "stack_trace": context.stack_trace,
            "metadata": context.metadata
        }
        
        try:
            with open(filepath, 'w') as f:
                json.dump(report, f, indent=2)
            self.logger.info(f"Crash report saved to {filepath}")
        except Exception as e:
            self.logger.error(f"Failed to save crash report: {e}")
    
    def register_boundary(self, boundary: ErrorBoundary):
        """Register an error boundary"""
        self.boundaries[boundary.component_name] = boundary
        
        # Set up cross-boundary error propagation
        boundary.on_error.append(self._on_component_error)
        boundary.on_recovery_failure.append(self._on_recovery_failure)
    
    def _on_component_error(self, context: ErrorContext):
        """Handle error from a component"""
        if context.severity == ErrorSeverity.CRITICAL:
            self.logger.error(f"Critical error in {context.component}: {context.message}")
            # Could trigger system-wide recovery here
    
    def _on_recovery_failure(self, context: ErrorContext):
        """Handle recovery failure from a component"""
        self.logger.error(f"Recovery failed in {context.component} for {context.error_type}")
        # Could trigger component restart or system degradation
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health based on errors"""
        all_stats = {}
        total_errors = 0
        critical_components = []
        
        for name, boundary in self.boundaries.items():
            stats = boundary.get_error_stats()
            all_stats[name] = stats
            total_errors += stats["total_errors"]
            
            # Check for critical errors
            if stats["errors_by_severity"].get("critical", 0) > 0:
                critical_components.append(name)
        
        health_status = "healthy"
        if critical_components:
            health_status = "critical"
        elif total_errors > 50:
            health_status = "degraded"
        elif total_errors > 10:
            health_status = "warning"
        
        return {
            "status": health_status,
            "total_errors": total_errors,
            "critical_components": critical_components,
            "component_stats": all_stats
        }

# Pre-configured error boundaries for DinoAir components
def get_dinoair_boundaries() -> Dict[str, ErrorBoundary]:
    """Get pre-configured error boundaries for DinoAir components"""
    boundaries = {}
    
    # ComfyUI boundary
    comfyui_boundary = ErrorBoundary("comfyui")
    comfyui_boundary.register_handler(
        ConnectionError,
        RecoveryConfig(
            strategy=RecoveryStrategy.RETRY,
            max_retries=5,
            retry_delay=2.0,
            exponential_backoff=True
        )
    )
    comfyui_boundary.register_handler(
        TimeoutError,
        RecoveryConfig(
            strategy=RecoveryStrategy.RETRY,
            max_retries=3,
            retry_delay=5.0
        )
    )
    boundaries["comfyui"] = comfyui_boundary
    
    # Ollama boundary
    ollama_boundary = ErrorBoundary("ollama")
    ollama_boundary.register_handler(
        ConnectionError,
        RecoveryConfig(
            strategy=RecoveryStrategy.RETRY,
            max_retries=5,
            retry_delay=1.0,
            exponential_backoff=True
        )
    )
    boundaries["ollama"] = ollama_boundary
    
    # Web GUI boundary
    web_boundary = ErrorBoundary("web_gui")
    web_boundary.register_handler(
        ValueError,
        RecoveryConfig(
            strategy=RecoveryStrategy.IGNORE  # Log but continue
        )
    )
    boundaries["web_gui"] = web_boundary
    
    # Installation boundary
    install_boundary = ErrorBoundary("installation")
    install_boundary.register_handler(
        PermissionError,
        RecoveryConfig(
            strategy=RecoveryStrategy.SHUTDOWN,  # Can't recover from permission errors
            on_recovery_failure=lambda ctx: print(
                f"\n❌ Installation failed due to permission error. "
                f"Please run with appropriate permissions.\n"
            )
        )
    )
    boundaries["installation"] = install_boundary
    
    return boundaries

# Example usage with decorator
if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    
    # Create global handler
    global_handler = GlobalErrorHandler()
    
    # Create and register boundaries
    boundaries = get_dinoair_boundaries()
    for boundary in boundaries.values():
        global_handler.register_boundary(boundary)
    
    # Example usage
    web_boundary = boundaries["web_gui"]
    
    @web_boundary.catch(severity=ErrorSeverity.HIGH)
    def risky_operation(x: int):
        if x < 0:
            raise ValueError("Negative value not allowed")
        return x * 2
    
    # Test the boundary
    try:
        print(risky_operation(5))  # Works
        print(risky_operation(-1))  # Caught and handled
    except Exception as e:
        print(f"Error escaped boundary: {e}")
    
    # Check system health
    print("\nSystem Health:")
    print(json.dumps(global_handler.get_system_health(), indent=2))