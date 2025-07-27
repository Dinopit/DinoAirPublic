#!/usr/bin/env python3
"""
Structured Logging System with Correlation IDs
Implements comprehensive logging with correlation tracking for DinoAir.
"""

import sys
import json
import uuid
import time
import threading
import traceback
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import logging.handlers
from contextlib import contextmanager

# Cross-platform terminal color support
from colorama import init, Fore, Style

# Initialize colorama for cross-platform support
init(autoreset=True)

class LogLevel(Enum):
    """Log levels for structured logging."""
    TRACE = "TRACE"
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    FATAL = "FATAL"

class LogCategory(Enum):
    """Categories for log classification."""
    SYSTEM = "system"
    SECURITY = "security"
    PERFORMANCE = "performance"
    BUSINESS = "business"
    AUDIT = "audit"
    INTEGRATION = "integration"
    USER_ACTION = "user_action"

@dataclass
class LogContext:
    """Context information for structured logging."""
    correlation_id: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    trace_id: Optional[str] = None
    span_id: Optional[str] = None
    component: Optional[str] = None
    operation: Optional[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

@dataclass
class StructuredLogEntry:
    """Represents a structured log entry."""
    timestamp: str
    level: LogLevel
    message: str
    category: LogCategory
    context: LogContext
    source: Dict[str, Any]
    performance: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []

class CorrelationManager:
    """Manages correlation IDs across threads and requests."""
    
    def __init__(self):
        self._local = threading.local()
        self._contexts: Dict[str, LogContext] = {}
        self._lock = threading.Lock()
        
    def generate_correlation_id(self) -> str:
        """Generate a new correlation ID."""
        return str(uuid.uuid4())
        
    def set_context(self, context: LogContext):
        """Set the current logging context."""
        self._local.context = context
        with self._lock:
            self._contexts[context.correlation_id] = context
            
    def get_context(self) -> Optional[LogContext]:
        """Get the current logging context."""
        return getattr(self._local, 'context', None)
        
    def get_context_by_id(self, correlation_id: str) -> Optional[LogContext]:
        """Get context by correlation ID."""
        with self._lock:
            return self._contexts.get(correlation_id)
            
    def clear_context(self):
        """Clear the current logging context."""
        if hasattr(self._local, 'context'):
            context = self._local.context
            with self._lock:
                self._contexts.pop(context.correlation_id, None)
            delattr(self._local, 'context')
            
    @contextmanager
    def correlation_context(self, **kwargs):
        """Context manager for correlation tracking."""
        correlation_id = kwargs.get('correlation_id', self.generate_correlation_id())
        
        context = LogContext(
            correlation_id=correlation_id,
            session_id=kwargs.get('session_id'),
            user_id=kwargs.get('user_id'),
            request_id=kwargs.get('request_id'),
            trace_id=kwargs.get('trace_id'),
            span_id=kwargs.get('span_id'),
            component=kwargs.get('component'),
            operation=kwargs.get('operation'),
            metadata=kwargs.get('metadata', {})
        )
        
        old_context = self.get_context()
        self.set_context(context)
        
        try:
            yield context
        finally:
            if old_context:
                self.set_context(old_context)
            else:
                self.clear_context()

class StructuredLogger:
    """Main structured logging class."""
    
    def __init__(self, name: str, config: Optional[Dict[str, Any]] = None):
        self.name = name
        self.config = config or {}
        self.correlation_manager = CorrelationManager()
        self._setup_logging()
        
    def _setup_logging(self):
        """Setup the underlying logging infrastructure."""
        # Create logger
        self.logger = logging.getLogger(self.name)
        self.logger.setLevel(logging.DEBUG)
        
        # Clear existing handlers
        self.logger.handlers.clear()
        
        # Console handler
        if self.config.get('console_enabled', True):
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(getattr(logging, self.config.get('console_level', 'INFO')))
            console_formatter = self._create_console_formatter()
            console_handler.setFormatter(console_formatter)
            self.logger.addHandler(console_handler)
            
        # File handler
        if self.config.get('file_enabled', True):
            log_dir = Path(self.config.get('log_dir', './logs'))
            log_dir.mkdir(exist_ok=True)
            
            log_file = log_dir / f"{self.name}.log"
            file_handler = logging.handlers.RotatingFileHandler(
                log_file,
                maxBytes=self.config.get('max_file_size', 10 * 1024 * 1024),  # 10MB
                backupCount=self.config.get('backup_count', 5)
            )
            file_handler.setLevel(getattr(logging, self.config.get('file_level', 'DEBUG')))
            file_formatter = self._create_json_formatter()
            file_handler.setFormatter(file_formatter)
            self.logger.addHandler(file_handler)
            
        # Structured log handler (JSON files)
        if self.config.get('structured_enabled', True):
            structured_dir = Path(self.config.get('structured_dir', './logs/structured'))
            structured_dir.mkdir(parents=True, exist_ok=True)
            
            structured_file = structured_dir / f"{self.name}-structured.jsonl"
            structured_handler = logging.handlers.RotatingFileHandler(
                structured_file,
                maxBytes=self.config.get('max_structured_size', 50 * 1024 * 1024),  # 50MB
                backupCount=self.config.get('structured_backup_count', 10)
            )
            structured_handler.setLevel(logging.DEBUG)
            structured_formatter = self._create_structured_formatter()
            structured_handler.setFormatter(structured_formatter)
            self.logger.addHandler(structured_handler)
            
    def _create_console_formatter(self):
        """Create formatter for console output."""
        class ColoredFormatter(logging.Formatter):
            COLORS = {
                'DEBUG': Fore.CYAN,      # Cyan
                'INFO': Fore.GREEN,      # Green
                'WARNING': Fore.YELLOW,  # Yellow
                'ERROR': Fore.RED,       # Red
                'CRITICAL': Fore.MAGENTA, # Magenta
                'RESET': Style.RESET_ALL  # Reset
            }
            
            def format(self, record):
                if hasattr(record, 'correlation_id'):
                    correlation_part = f"[{record.correlation_id[:8]}]"
                else:
                    correlation_part = "[--------]"
                    
                color = self.COLORS.get(record.levelname, '')
                reset = self.COLORS['RESET']
                
                return f"{color}{record.asctime} {correlation_part} {record.levelname:5} {record.name}: {record.getMessage()}{reset}"
                
        formatter = ColoredFormatter()
        formatter.datefmt = '%Y-%m-%d %H:%M:%S'
        return formatter
        
    def _create_json_formatter(self):
        """Create JSON formatter for file output."""
        class JSONFormatter(logging.Formatter):
            def format(self, record):
                log_entry = {
                    'timestamp': datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
                    'level': record.levelname,
                    'logger': record.name,
                    'message': record.getMessage(),
                    'module': record.module,
                    'function': record.funcName,
                    'line': record.lineno
                }
                
                # Add correlation context if available
                if hasattr(record, 'correlation_id'):
                    log_entry['correlation_id'] = record.correlation_id
                if hasattr(record, 'session_id'):
                    log_entry['session_id'] = record.session_id
                if hasattr(record, 'user_id'):
                    log_entry['user_id'] = record.user_id
                if hasattr(record, 'request_id'):
                    log_entry['request_id'] = record.request_id
                    
                # Add exception info if present
                if record.exc_info:
                    log_entry['exception'] = {
                        'type': record.exc_info[0].__name__,
                        'message': str(record.exc_info[1]),
                        'traceback': traceback.format_exception(*record.exc_info)
                    }
                    
                return json.dumps(log_entry, ensure_ascii=False)
                
        return JSONFormatter()
        
    def _create_structured_formatter(self):
        """Create structured formatter for detailed logging."""
        class StructuredFormatter(logging.Formatter):
            def format(self, record):
                # This will be handled by the structured logging methods
                return record.getMessage()
                
        return StructuredFormatter()
        
    def _enrich_record(self, record, context: Optional[LogContext] = None):
        """Enrich log record with context information."""
        if context is None:
            context = self.correlation_manager.get_context()
            
        if context:
            record.correlation_id = context.correlation_id
            record.session_id = context.session_id
            record.user_id = context.user_id
            record.request_id = context.request_id
            record.trace_id = context.trace_id
            record.span_id = context.span_id
            record.component = context.component
            record.operation = context.operation
            
    def _log_structured(self, level: LogLevel, message: str, category: LogCategory,
                       context: Optional[LogContext] = None, **kwargs):
        """Log a structured entry."""
        if context is None:
            context = self.correlation_manager.get_context()
            
        if context is None:
            # Create a temporary context
            context = LogContext(
                correlation_id=self.correlation_manager.generate_correlation_id()
            )
            
        # Create structured log entry
        entry = StructuredLogEntry(
            timestamp=datetime.now(timezone.utc).isoformat(),
            level=level,
            message=message,
            category=category,
            context=context,
            source={
                'logger': self.name,
                'module': kwargs.get('module', ''),
                'function': kwargs.get('function', ''),
                'line': kwargs.get('line', 0)
            },
            performance=kwargs.get('performance'),
            error=kwargs.get('error'),
            tags=kwargs.get('tags', [])
        )
        
        # Write to structured log
        if self.config.get('structured_enabled', True):
            structured_dir = Path(self.config.get('structured_dir', './logs/structured'))
            structured_file = structured_dir / f"{self.name}-structured.jsonl"
            
            try:
                with open(structured_file, 'a', encoding='utf-8') as f:
                    f.write(json.dumps(asdict(entry), ensure_ascii=False) + '\n')
            except Exception as e:
                # Fallback to regular logging
                self.logger.error(f"Failed to write structured log: {e}")
                
    def trace(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log trace level message."""
        record = self.logger.makeRecord(
            self.name, logging.DEBUG, '', 0, message, (), None
        )
        self._enrich_record(record, kwargs.get('context'))
        self.logger.handle(record)
        self._log_structured(LogLevel.TRACE, message, category, **kwargs)
        
    def debug(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log debug level message."""
        record = self.logger.makeRecord(
            self.name, logging.DEBUG, '', 0, message, (), None
        )
        self._enrich_record(record, kwargs.get('context'))
        self.logger.handle(record)
        self._log_structured(LogLevel.DEBUG, message, category, **kwargs)
        
    def info(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log info level message."""
        record = self.logger.makeRecord(
            self.name, logging.INFO, '', 0, message, (), None
        )
        self._enrich_record(record, kwargs.get('context'))
        self.logger.handle(record)
        self._log_structured(LogLevel.INFO, message, category, **kwargs)
        
    def warn(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log warning level message."""
        record = self.logger.makeRecord(
            self.name, logging.WARNING, '', 0, message, (), None
        )
        self._enrich_record(record, kwargs.get('context'))
        self.logger.handle(record)
        self._log_structured(LogLevel.WARN, message, category, **kwargs)
        
    def error(self, message: str, category: LogCategory = LogCategory.SYSTEM, 
              error: Optional[Exception] = None, **kwargs):
        """Log error level message."""
        exc_info = None
        error_dict = None
        
        if error:
            exc_info = (type(error), error, error.__traceback__)
            error_dict = {
                'type': type(error).__name__,
                'message': str(error),
                'traceback': traceback.format_exception(type(error), error, error.__traceback__)
            }
            
        record = self.logger.makeRecord(
            self.name, logging.ERROR, '', 0, message, (), exc_info
        )
        self._enrich_record(record, kwargs.get('context'))
        self.logger.handle(record)
        self._log_structured(LogLevel.ERROR, message, category, error=error_dict, **kwargs)
        
    def fatal(self, message: str, category: LogCategory = LogCategory.SYSTEM, 
              error: Optional[Exception] = None, **kwargs):
        """Log fatal level message."""
        exc_info = None
        error_dict = None
        
        if error:
            exc_info = (type(error), error, error.__traceback__)
            error_dict = {
                'type': type(error).__name__,
                'message': str(error),
                'traceback': traceback.format_exception(type(error), error, error.__traceback__)
            }
            
        record = self.logger.makeRecord(
            self.name, logging.CRITICAL, '', 0, message, (), exc_info
        )
        self._enrich_record(record, kwargs.get('context'))
        self.logger.handle(record)
        self._log_structured(LogLevel.FATAL, message, category, error=error_dict, **kwargs)
        
    def audit(self, message: str, user_id: Optional[str] = None, **kwargs):
        """Log audit trail message."""
        context = kwargs.get('context') or self.correlation_manager.get_context()
        if context and user_id:
            context.user_id = user_id
            
        self.info(message, LogCategory.AUDIT, context=context, **kwargs)
        
    def performance(self, operation: str, duration_ms: float, **kwargs):
        """Log performance metrics."""
        performance_data = {
            'operation': operation,
            'duration_ms': duration_ms,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        message = f"Performance: {operation} took {duration_ms:.2f}ms"
        self.info(message, LogCategory.PERFORMANCE, performance=performance_data, **kwargs)
        
    def security(self, message: str, severity: str = "medium", **kwargs):
        """Log security-related events."""
        kwargs['tags'] = kwargs.get('tags', []) + ['security', f'severity:{severity}']
        self.warn(message, LogCategory.SECURITY, **kwargs)
        
    @contextmanager
    def operation_context(self, operation: str, component: Optional[str] = None, **kwargs):
        """Context manager for operation tracking."""
        start_time = time.time()
        
        with self.correlation_manager.correlation_context(
            operation=operation,
            component=component,
            **kwargs
        ) as context:
            self.info(f"Starting operation: {operation}", LogCategory.BUSINESS, context=context)
            
            try:
                yield context
                duration_ms = (time.time() - start_time) * 1000
                self.performance(operation, duration_ms, context=context)
                self.info(f"Completed operation: {operation}", LogCategory.BUSINESS, context=context)
                
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                self.error(f"Failed operation: {operation}", LogCategory.BUSINESS, 
                          error=e, context=context)
                self.performance(f"{operation}_failed", duration_ms, context=context)
                raise

class LoggerFactory:
    """Factory for creating structured loggers."""
    
    _loggers: Dict[str, StructuredLogger] = {}
    _default_config: Dict[str, Any] = {
        'console_enabled': True,
        'console_level': 'INFO',
        'file_enabled': True,
        'file_level': 'DEBUG',
        'structured_enabled': True,
        'log_dir': './logs',
        'structured_dir': './logs/structured',
        'max_file_size': 10 * 1024 * 1024,  # 10MB
        'max_structured_size': 50 * 1024 * 1024,  # 50MB
        'backup_count': 5,
        'structured_backup_count': 10
    }
    
    @classmethod
    def get_logger(cls, name: str, config: Optional[Dict[str, Any]] = None) -> StructuredLogger:
        """Get or create a structured logger."""
        if name not in cls._loggers:
            final_config = cls._default_config.copy()
            if config:
                final_config.update(config)
            cls._loggers[name] = StructuredLogger(name, final_config)
        return cls._loggers[name]
        
    @classmethod
    def configure_default(cls, config: Dict[str, Any]):
        """Configure default settings for all loggers."""
        cls._default_config.update(config)

# Convenience functions
def get_logger(name: str, config: Optional[Dict[str, Any]] = None) -> StructuredLogger:
    """Get a structured logger instance."""
    return LoggerFactory.get_logger(name, config)

def configure_logging(config: Dict[str, Any]):
    """Configure global logging settings."""
    LoggerFactory.configure_default(config)

# Example usage and testing
if __name__ == "__main__":
    # Configure logging
    configure_logging({
        'console_level': 'DEBUG',
        'log_dir': './test_logs'
    })
    
    # Get logger
    logger = get_logger('test_logger')
    
    # Test basic logging
    logger.info("Application started")
    logger.debug("Debug information")
    logger.warn("Warning message")
    
    # Test with correlation context
    with logger.correlation_manager.correlation_context(
        user_id="user123",
        session_id="session456",
        component="test_component"
    ) as context:
        logger.info("Processing user request", context=context)
        logger.performance("user_request", 150.5, context=context)
        
        # Test operation context
        with logger.operation_context("data_processing", component="processor") as op_context:
            logger.info("Processing data", context=op_context)
            time.sleep(0.1)  # Simulate work
            
    # Test error logging
    try:
        raise ValueError("Test error")
    except Exception as e:
        logger.error("An error occurred", error=e)
        
    # Test audit logging
    logger.audit("User login", user_id="user123")
    
    # Test security logging
    logger.security("Failed login attempt", severity="high")
    
    print("Structured logging test completed. Check ./test_logs directory for output.")