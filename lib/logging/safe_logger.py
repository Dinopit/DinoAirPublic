"""
DinoAir Safe Logging System
Provides comprehensive logging with rotation, size limits, and safety features
"""

import os
import sys
import json
import time
import logging
import threading
import queue
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
import gzip
import shutil
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
import traceback

class LogLevel(Enum):
    """Log levels with numeric values"""
    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    CRITICAL = 50

@dataclass
class LogConfig:
    """Configuration for logging"""
    # File settings
    log_dir: str = "logs"
    app_name: str = "dinoair"
    
    # Rotation settings
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 10  # Keep 10 backup files
    rotation_interval: str = "midnight"  # daily rotation
    
    # Performance settings
    use_async: bool = True  # Async logging for performance
    queue_size: int = 10000  # Max queued log entries
    
    # Format settings
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    date_format: str = "%Y-%m-%d %H:%M:%S"
    use_json: bool = True  # JSON structured logging
    
    # Safety settings
    compress_old_logs: bool = True
    max_total_size: int = 100 * 1024 * 1024  # 100MB total
    auto_cleanup_days: int = 30  # Delete logs older than 30 days
    
    # Console output
    console_output: bool = True
    console_level: LogLevel = LogLevel.INFO

class SafeRotatingFileHandler(RotatingFileHandler):
    """Thread-safe rotating file handler with additional safety features"""
    
    def __init__(self, *args, **kwargs):
        self.lock = threading.Lock()
        super().__init__(*args, **kwargs)
    
    def emit(self, record):
        """Thread-safe emit"""
        with self.lock:
            try:
                super().emit(record)
            except Exception as e:
                self.handleError(record)
    
    def doRollover(self):
        """Enhanced rollover with compression"""
        with self.lock:
            super().doRollover()
            
            # Compress old log file if configured
            if hasattr(self, 'compress') and self.compress:
                old_log = f"{self.baseFilename}.1"
                if os.path.exists(old_log):
                    self._compress_file(old_log)
    
    def _compress_file(self, filepath: str):
        """Compress a log file"""
        try:
            with open(filepath, 'rb') as f_in:
                with gzip.open(f"{filepath}.gz", 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            os.remove(filepath)
        except Exception as e:
            print(f"Failed to compress {filepath}: {e}")

class JsonFormatter(logging.Formatter):
    """JSON log formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process_id": os.getpid(),
            "thread_id": threading.current_thread().ident,
            "thread_name": threading.current_thread().name
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'created', 'filename',
                          'funcName', 'levelname', 'levelno', 'lineno',
                          'module', 'msecs', 'message', 'pathname', 'process',
                          'processName', 'relativeCreated', 'thread',
                          'threadName', 'exc_info', 'exc_text', 'stack_info']:
                log_data[key] = value
        
        return json.dumps(log_data)

class AsyncLogHandler(logging.Handler):
    """Asynchronous log handler for high-performance logging"""
    
    def __init__(self, handler: logging.Handler, queue_size: int = 10000):
        super().__init__()
        self.handler = handler
        self.queue = queue.Queue(maxsize=queue_size)
        self.thread = threading.Thread(target=self._worker, daemon=True)
        self.thread.start()
        self._shutdown = False
    
    def _worker(self):
        """Worker thread to process log queue"""
        while not self._shutdown:
            try:
                record = self.queue.get(timeout=1)
                if record is None:  # Shutdown signal
                    break
                self.handler.emit(record)
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Error in async log worker: {e}")
    
    def emit(self, record):
        """Add record to queue"""
        try:
            self.queue.put_nowait(record)
        except queue.Full:
            # Queue is full, drop the message
            print(f"Log queue full, dropping message: {record.getMessage()}")
    
    def close(self):
        """Shutdown async handler"""
        self._shutdown = True
        self.queue.put(None)  # Signal shutdown
        self.thread.join(timeout=5)
        self.handler.close()
        super().close()

class LogManager:
    """Central log management system for DinoAir"""
    
    def __init__(self, config: Optional[LogConfig] = None):
        self.config = config or LogConfig()
        self._loggers: Dict[str, logging.Logger] = {}
        self._handlers: List[logging.Handler] = []
        self._lock = threading.Lock()
        
        # Create log directory
        self.log_dir = Path(self.config.log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Set up root logger
        self._setup_root_logger()
        
        # Start cleanup thread
        self._start_cleanup_thread()
    
    def _setup_root_logger(self):
        """Configure root logger"""
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.DEBUG)
        
        # Remove existing handlers
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Add file handler
        file_handler = self._create_file_handler()
        if self.config.use_async:
            file_handler = AsyncLogHandler(file_handler, self.config.queue_size)
        
        root_logger.addHandler(file_handler)
        self._handlers.append(file_handler)
        
        # Add console handler
        if self.config.console_output:
            console_handler = self._create_console_handler()
            root_logger.addHandler(console_handler)
            self._handlers.append(console_handler)
    
    def _create_file_handler(self) -> logging.Handler:
        """Create file handler with rotation"""
        log_file = self.log_dir / f"{self.config.app_name}.log"
        
        handler = SafeRotatingFileHandler(
            filename=str(log_file),
            maxBytes=self.config.max_file_size,
            backupCount=self.config.backup_count,
            encoding='utf-8'
        )
        handler.compress = self.config.compress_old_logs
        
        # Set formatter
        if self.config.use_json:
            handler.setFormatter(JsonFormatter())
        else:
            handler.setFormatter(logging.Formatter(
                self.config.log_format,
                datefmt=self.config.date_format
            ))
        
        handler.setLevel(logging.DEBUG)
        return handler
    
    def _create_console_handler(self) -> logging.Handler:
        """Create console handler"""
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(self.config.console_level.value)
        
        # Use simple format for console
        handler.setFormatter(logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%H:%M:%S"
        ))
        
        return handler
    
    def get_logger(self, name: str) -> logging.Logger:
        """Get or create a logger"""
        with self._lock:
            if name not in self._loggers:
                logger = logging.getLogger(name)
                self._loggers[name] = logger
            return self._loggers[name]
    
    def _start_cleanup_thread(self):
        """Start background thread for log cleanup"""
        def cleanup_worker():
            while True:
                try:
                    self._cleanup_old_logs()
                    self._check_total_size()
                    time.sleep(3600)  # Check hourly
                except Exception as e:
                    print(f"Error in log cleanup: {e}")
        
        thread = threading.Thread(target=cleanup_worker, daemon=True)
        thread.start()
    
    def _cleanup_old_logs(self):
        """Delete logs older than configured days"""
        if self.config.auto_cleanup_days <= 0:
            return
        
        cutoff_date = datetime.now() - timedelta(days=self.config.auto_cleanup_days)
        
        for log_file in self.log_dir.glob("*.log*"):
            try:
                if datetime.fromtimestamp(log_file.stat().st_mtime) < cutoff_date:
                    log_file.unlink()
                    print(f"Deleted old log file: {log_file}")
            except Exception as e:
                print(f"Error deleting {log_file}: {e}")
    
    def _check_total_size(self):
        """Check and limit total log directory size"""
        total_size = sum(f.stat().st_size for f in self.log_dir.glob("*") if f.is_file())
        
        if total_size > self.config.max_total_size:
            # Delete oldest files until under limit
            files = sorted(self.log_dir.glob("*"), key=lambda f: f.stat().st_mtime)
            
            for file in files:
                if total_size <= self.config.max_total_size:
                    break
                
                try:
                    file_size = file.stat().st_size
                    file.unlink()
                    total_size -= file_size
                    print(f"Deleted {file} to maintain size limit")
                except Exception as e:
                    print(f"Error deleting {file}: {e}")
    
    def shutdown(self):
        """Shutdown logging system gracefully"""
        for handler in self._handlers:
            handler.close()
        
        logging.shutdown()

class DinoAirLogger:
    """Convenient logger wrapper with additional features"""
    
    def __init__(self, name: str, manager: Optional[LogManager] = None):
        self.manager = manager or _default_manager
        self.logger = self.manager.get_logger(name)
        self.name = name
    
    def _log_with_context(self, level: int, message: str, **kwargs):
        """Log with additional context"""
        extra = {
            "component": self.name,
            "timestamp_precise": time.time(),
            **kwargs
        }
        self.logger.log(level, message, extra=extra)
    
    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self._log_with_context(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message"""
        self._log_with_context(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self._log_with_context(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, exception: Optional[Exception] = None, **kwargs):
        """Log error message"""
        if exception:
            kwargs["exception_type"] = type(exception).__name__
            kwargs["exception_message"] = str(exception)
            self.logger.error(message, exc_info=exception, extra=kwargs)
        else:
            self._log_with_context(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message"""
        self._log_with_context(logging.CRITICAL, message, **kwargs)
    
    def performance(self, operation: str, duration: float, **kwargs):
        """Log performance metrics"""
        self.info(
            f"Performance metric: {operation}",
            operation=operation,
            duration_ms=duration * 1000,
            performance_metric=True,
            **kwargs
        )
    
    def audit(self, action: str, user: Optional[str] = None, **kwargs):
        """Log audit trail"""
        self.info(
            f"Audit: {action}",
            audit_action=action,
            user=user,
            audit_log=True,
            **kwargs
        )

# Global log manager instance
_default_manager = LogManager()

def get_logger(name: str) -> DinoAirLogger:
    """Get a logger instance"""
    return DinoAirLogger(name)

def configure_logging(config: LogConfig):
    """Configure global logging"""
    global _default_manager
    _default_manager.shutdown()
    _default_manager = LogManager(config)

# Context manager for timed operations
class LogTimer:
    """Context manager for logging operation duration"""
    
    def __init__(self, logger: DinoAirLogger, operation: str):
        self.logger = logger
        self.operation = operation
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        self.logger.debug(f"Starting {self.operation}")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        
        if exc_type:
            self.logger.error(
                f"{self.operation} failed after {duration:.3f}s",
                exception=exc_val,
                duration=duration
            )
        else:
            self.logger.performance(self.operation, duration)

# Decorator for automatic function logging
def log_function(logger: Optional[DinoAirLogger] = None, 
                 log_args: bool = True,
                 log_result: bool = False):
    """Decorator to automatically log function calls"""
    def decorator(func):
        nonlocal logger
        if logger is None:
            logger = get_logger(func.__module__)
        
        def wrapper(*args, **kwargs):
            func_name = func.__name__
            
            # Log function call
            log_data = {"function": func_name}
            if log_args:
                log_data["args"] = str(args)[:200]  # Truncate long args
                log_data["kwargs"] = str(kwargs)[:200]
            
            logger.debug(f"Calling {func_name}", **log_data)
            
            try:
                with LogTimer(logger, func_name):
                    result = func(*args, **kwargs)
                
                if log_result:
                    logger.debug(
                        f"{func_name} completed",
                        result=str(result)[:200]
                    )
                
                return result
                
            except Exception as e:
                logger.error(f"{func_name} failed", exception=e)
                raise
        
        return wrapper
    return decorator

if __name__ == "__main__":
    # Example usage
    
    # Configure logging
    config = LogConfig(
        log_dir="test_logs",
        max_file_size=1024 * 1024,  # 1MB for testing
        use_json=True,
        console_output=True
    )
    configure_logging(config)
    
    # Get logger
    logger = get_logger("test_component")
    
    # Log messages
    logger.info("Application started", version="1.0.0")
    logger.debug("Debug information", data={"key": "value"})
    
    # Log with timer
    with LogTimer(logger, "database_query"):
        time.sleep(0.1)  # Simulate work
    
    # Log error
    try:
        raise ValueError("Test error")
    except Exception as e:
        logger.error("Operation failed", exception=e)
    
    # Audit log
    logger.audit("user_login", user="john_doe", ip_address="192.168.1.1")
    
    # Test decorated function
    @log_function(logger)
    def test_function(x, y):
        return x + y
    
    result = test_function(5, 3)
    print(f"Result: {result}")
    
    # Shutdown
    _default_manager.shutdown()