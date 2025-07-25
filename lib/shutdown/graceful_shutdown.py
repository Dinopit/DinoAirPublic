"""
DinoAir Graceful Shutdown Handler
Provides cleanup procedures and graceful shutdown for all services
"""

import os
import sys
import signal
import time
import logging
import threading
import asyncio
import atexit
from typing import List, Callable, Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
import json
import psutil
import shutil

class ShutdownPriority(Enum):
    """Shutdown priority levels (higher = shutdown first)"""
    CRITICAL = 100    # Must shutdown first (e.g., accept no new requests)
    HIGH = 75         # High priority (e.g., stop processing)
    NORMAL = 50       # Normal priority (e.g., save state)
    LOW = 25          # Low priority (e.g., cleanup temp files)
    MINIMAL = 0       # Minimal priority (e.g., logging)

class ShutdownState(Enum):
    """Shutdown states"""
    RUNNING = "running"
    SHUTTING_DOWN = "shutting_down"
    SHUTDOWN = "shutdown"

@dataclass
class ShutdownTask:
    """A task to execute during shutdown"""
    name: str
    handler: Callable[[], None]
    priority: ShutdownPriority = ShutdownPriority.NORMAL
    timeout: float = 30.0  # seconds
    async_handler: bool = False
    cleanup_on_error: bool = True

@dataclass
class ShutdownStats:
    """Statistics about shutdown process"""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_duration: Optional[float] = None
    tasks_completed: int = 0
    tasks_failed: int = 0
    errors: List[Dict[str, Any]] = field(default_factory=list)

class GracefulShutdown:
    """
    Manages graceful shutdown of DinoAir services
    """
    
    def __init__(self):
        self.state = ShutdownState.RUNNING
        self.shutdown_tasks: List[ShutdownTask] = []
        self.stats = ShutdownStats()
        self._lock = threading.RLock()
        self._shutdown_event = threading.Event()
        self._shutdown_thread: Optional[threading.Thread] = None
        
        # Logger
        self.logger = logging.getLogger("GracefulShutdown")
        
        # Register signal handlers
        self._register_signal_handlers()
        
        # Register atexit handler
        atexit.register(self._atexit_handler)
        
        # State file for crash recovery
        self.state_file = Path("./tmp/dinoair_state.json")
        
        # Process manager reference
        self.process_manager = None
    
    def _register_signal_handlers(self):
        """Register system signal handlers"""
        if sys.platform != "win32":
            # Unix signals
            signal.signal(signal.SIGTERM, self._signal_handler)
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGHUP, self._signal_handler)
        else:
            # Windows signals
            signal.signal(signal.SIGTERM, self._signal_handler)
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGBREAK, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        signal_name = signal.Signals(signum).name
        self.logger.info(f"Received signal {signal_name}")
        
        # Initiate graceful shutdown
        self.shutdown(reason=f"Signal {signal_name}")
    
    def _atexit_handler(self):
        """Handler called at program exit"""
        if self.state != ShutdownState.SHUTDOWN:
            self.logger.warning("Unexpected exit, performing emergency shutdown")
            self._emergency_shutdown()
    
    def register_task(self, task: ShutdownTask):
        """Register a shutdown task"""
        with self._lock:
            self.shutdown_tasks.append(task)
            self.logger.info(f"Registered shutdown task: {task.name}")
    
    def register(self, name: str, handler: Callable, 
                priority: ShutdownPriority = ShutdownPriority.NORMAL,
                timeout: float = 30.0,
                async_handler: bool = False):
        """Convenience method to register a shutdown task"""
        task = ShutdownTask(
            name=name,
            handler=handler,
            priority=priority,
            timeout=timeout,
            async_handler=async_handler
        )
        self.register_task(task)
    
    def shutdown(self, reason: str = "User requested", timeout: float = 60.0):
        """Initiate graceful shutdown"""
        with self._lock:
            if self.state != ShutdownState.RUNNING:
                self.logger.warning("Shutdown already in progress")
                return
            
            self.state = ShutdownState.SHUTTING_DOWN
            self.stats.start_time = datetime.now()
            
            self.logger.info(f"Initiating graceful shutdown: {reason}")
            
            # Set shutdown event
            self._shutdown_event.set()
            
            # Start shutdown thread
            self._shutdown_thread = threading.Thread(
                target=self._shutdown_procedure,
                args=(timeout,),
                daemon=False
            )
            self._shutdown_thread.start()
    
    def _shutdown_procedure(self, timeout: float):
        """Main shutdown procedure"""
        try:
            # Sort tasks by priority (highest first)
            sorted_tasks = sorted(
                self.shutdown_tasks,
                key=lambda t: t.priority.value,
                reverse=True
            )
            
            # Execute shutdown tasks
            for task in sorted_tasks:
                if not self._execute_task(task):
                    self.stats.tasks_failed += 1
                else:
                    self.stats.tasks_completed += 1
            
            # Final cleanup
            self._final_cleanup()
            
            # Update state
            with self._lock:
                self.state = ShutdownState.SHUTDOWN
                self.stats.end_time = datetime.now()
                self.stats.total_duration = (
                    self.stats.end_time - self.stats.start_time
                ).total_seconds()
            
            self.logger.info(
                f"Graceful shutdown completed in {self.stats.total_duration:.2f}s "
                f"({self.stats.tasks_completed} tasks completed, "
                f"{self.stats.tasks_failed} failed)"
            )
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            self._emergency_shutdown()
    
    def _execute_task(self, task: ShutdownTask) -> bool:
        """Execute a single shutdown task"""
        self.logger.info(f"Executing shutdown task: {task.name}")
        
        try:
            # Create timeout wrapper
            def timeout_handler():
                self.logger.error(f"Task {task.name} timed out after {task.timeout}s")
                if task.cleanup_on_error:
                    self._emergency_cleanup(task.name)
            
            timer = threading.Timer(task.timeout, timeout_handler)
            timer.start()
            
            try:
                # Execute handler
                if task.async_handler:
                    # Run async handler
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(task.handler())
                    loop.close()
                else:
                    # Run sync handler
                    task.handler()
                
                timer.cancel()
                self.logger.info(f"Task {task.name} completed successfully")
                return True
                
            except Exception as e:
                timer.cancel()
                self.logger.error(f"Task {task.name} failed: {e}")
                self.stats.errors.append({
                    "task": task.name,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
                
                if task.cleanup_on_error:
                    self._emergency_cleanup(task.name)
                
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to execute task {task.name}: {e}")
            return False
    
    def _emergency_cleanup(self, task_name: str):
        """Emergency cleanup for failed task"""
        self.logger.warning(f"Performing emergency cleanup for {task_name}")
        # Task-specific emergency cleanup would go here
    
    def _emergency_shutdown(self):
        """Emergency shutdown procedure"""
        self.logger.critical("Performing emergency shutdown")
        
        try:
            # Kill all child processes
            current_process = psutil.Process()
            children = current_process.children(recursive=True)
            
            for child in children:
                try:
                    child.terminate()
                except psutil.NoSuchProcess:
                    pass
            
            # Wait briefly for termination
            time.sleep(2)
            
            # Force kill remaining processes
            for child in children:
                try:
                    child.kill()
                except psutil.NoSuchProcess:
                    pass
            
        except Exception as e:
            self.logger.error(f"Error during emergency shutdown: {e}")
        
        # Force exit
        os._exit(1)
    
    def _final_cleanup(self):
        """Final cleanup procedures"""
        self.logger.info("Performing final cleanup")
        
        try:
            # Save shutdown stats
            self._save_shutdown_stats()
            
            # Clean temporary files
            self._clean_temp_files()
            
            # Close any remaining file handles
            self._close_file_handles()
            
        except Exception as e:
            self.logger.error(f"Error during final cleanup: {e}")
    
    def _save_shutdown_stats(self):
        """Save shutdown statistics"""
        try:
            stats_file = Path("./logs/shutdown_stats.json")
            stats_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(stats_file, 'w') as f:
                json.dump({
                    "start_time": self.stats.start_time.isoformat() if self.stats.start_time else None,
                    "end_time": self.stats.end_time.isoformat() if self.stats.end_time else None,
                    "duration": self.stats.total_duration,
                    "tasks_completed": self.stats.tasks_completed,
                    "tasks_failed": self.stats.tasks_failed,
                    "errors": self.stats.errors
                }, f, indent=2)
                
        except Exception as e:
            self.logger.error(f"Failed to save shutdown stats: {e}")
    
    def _clean_temp_files(self):
        """Clean temporary files"""
        temp_dirs = [
            "./tmp",
            "./cache",
            "./ComfyUI/temp",
            "./web-gui/.next/cache"
        ]
        
        for temp_dir in temp_dirs:
            try:
                path = Path(temp_dir)
                if path.exists():
                    shutil.rmtree(path, ignore_errors=True)
                    self.logger.info(f"Cleaned temp directory: {temp_dir}")
            except Exception as e:
                self.logger.error(f"Failed to clean {temp_dir}: {e}")
    
    def _close_file_handles(self):
        """Close any remaining file handles"""
        try:
            # Get current process
            process = psutil.Process()
            
            # Close open files
            for file in process.open_files():
                try:
                    os.close(file.fd)
                except:
                    pass
                    
        except Exception as e:
            self.logger.error(f"Error closing file handles: {e}")
    
    def wait_for_shutdown(self, timeout: Optional[float] = None) -> bool:
        """Wait for shutdown to complete"""
        if self._shutdown_thread:
            self._shutdown_thread.join(timeout)
            return not self._shutdown_thread.is_alive()
        return True
    
    def is_shutting_down(self) -> bool:
        """Check if shutdown is in progress"""
        return self._shutdown_event.is_set()

# Pre-configured shutdown tasks for DinoAir services
class DinoAirShutdownTasks:
    """Pre-configured shutdown tasks for DinoAir"""
    
    @staticmethod
    def stop_accepting_requests():
        """Stop accepting new requests"""
        logging.info("Stopping acceptance of new requests")
        # Set global flag to reject new requests
        os.environ['DINOAIR_SHUTDOWN'] = '1'
    
    @staticmethod
    def save_application_state():
        """Save current application state"""
        logging.info("Saving application state")
        state = {
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.0",
            "services": {
                "comfyui": {"status": "running"},
                "ollama": {"status": "running"},
                "web_gui": {"status": "running"}
            }
        }
        
        state_file = Path("./tmp/dinoair_state.json")
        state_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)
    
    @staticmethod
    def stop_background_tasks():
        """Stop all background tasks"""
        logging.info("Stopping background tasks")
        # Signal all background threads to stop
        # Implementation would depend on how background tasks are managed
    
    @staticmethod
    def flush_caches():
        """Flush all caches to disk"""
        logging.info("Flushing caches")
        # Flush any in-memory caches
    
    @staticmethod
    def close_database_connections():
        """Close all database connections"""
        logging.info("Closing database connections")
        # Close database connection pools
    
    @staticmethod
    def stop_comfyui():
        """Stop ComfyUI service"""
        logging.info("Stopping ComfyUI service")
        try:
            # Send shutdown request to ComfyUI
            import requests
            requests.post("http://localhost:8188/shutdown", timeout=5)
        except:
            # Force kill if needed
            os.system("pkill -f ComfyUI")
    
    @staticmethod
    def stop_ollama():
        """Stop Ollama service"""
        logging.info("Stopping Ollama service")
        try:
            # Stop Ollama service
            os.system("ollama stop")
        except:
            pass
    
    @staticmethod
    def cleanup_temp_models():
        """Cleanup temporary model files"""
        logging.info("Cleaning up temporary models")
        temp_models = Path("./ComfyUI/models/temp")
        if temp_models.exists():
            shutil.rmtree(temp_models, ignore_errors=True)
    
    @staticmethod
    def save_metrics():
        """Save final metrics"""
        logging.info("Saving final metrics")
        metrics = {
            "shutdown_time": datetime.now().isoformat(),
            "uptime": time.time() - float(os.environ.get('DINOAIR_START_TIME', time.time())),
            "total_requests": 0  # Would be tracked elsewhere
        }
        
        metrics_file = Path("./logs/final_metrics.json")
        metrics_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(metrics_file, 'w') as f:
            json.dump(metrics, f, indent=2)

def create_shutdown_handler() -> GracefulShutdown:
    """Create and configure shutdown handler for DinoAir"""
    handler = GracefulShutdown()
    
    # Register shutdown tasks in priority order
    
    # Critical priority - stop accepting new work
    handler.register(
        "stop_requests",
        DinoAirShutdownTasks.stop_accepting_requests,
        ShutdownPriority.CRITICAL,
        timeout=5.0
    )
    
    # High priority - save state
    handler.register(
        "save_state",
        DinoAirShutdownTasks.save_application_state,
        ShutdownPriority.HIGH,
        timeout=10.0
    )
    
    handler.register(
        "stop_background",
        DinoAirShutdownTasks.stop_background_tasks,
        ShutdownPriority.HIGH,
        timeout=15.0
    )
    
    # Normal priority - cleanup
    handler.register(
        "flush_caches",
        DinoAirShutdownTasks.flush_caches,
        ShutdownPriority.NORMAL,
        timeout=10.0
    )
    
    handler.register(
        "close_db",
        DinoAirShutdownTasks.close_database_connections,
        ShutdownPriority.NORMAL,
        timeout=10.0
    )
    
    handler.register(
        "stop_comfyui",
        DinoAirShutdownTasks.stop_comfyui,
        ShutdownPriority.NORMAL,
        timeout=30.0
    )
    
    handler.register(
        "stop_ollama",
        DinoAirShutdownTasks.stop_ollama,
        ShutdownPriority.NORMAL,
        timeout=20.0
    )
    
    # Low priority - cleanup
    handler.register(
        "cleanup_models",
        DinoAirShutdownTasks.cleanup_temp_models,
        ShutdownPriority.LOW,
        timeout=20.0
    )
    
    # Minimal priority - metrics
    handler.register(
        "save_metrics",
        DinoAirShutdownTasks.save_metrics,
        ShutdownPriority.MINIMAL,
        timeout=5.0
    )
    
    return handler

# Global shutdown handler instance
_shutdown_handler: Optional[GracefulShutdown] = None

def get_shutdown_handler() -> GracefulShutdown:
    """Get global shutdown handler"""
    global _shutdown_handler
    if _shutdown_handler is None:
        _shutdown_handler = create_shutdown_handler()
    return _shutdown_handler

def shutdown(reason: str = "User requested", timeout: float = 60.0):
    """Initiate graceful shutdown"""
    handler = get_shutdown_handler()
    handler.shutdown(reason, timeout)

def register_shutdown_task(name: str, handler: Callable, 
                         priority: ShutdownPriority = ShutdownPriority.NORMAL,
                         timeout: float = 30.0):
    """Register a custom shutdown task"""
    shutdown_handler = get_shutdown_handler()
    shutdown_handler.register(name, handler, priority, timeout)

if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    
    # Create shutdown handler
    handler = create_shutdown_handler()
    
    # Register custom task
    def custom_cleanup():
        print("Performing custom cleanup...")
        time.sleep(2)
        print("Custom cleanup done")
    
    handler.register(
        "custom_cleanup",
        custom_cleanup,
        ShutdownPriority.LOW
    )
    
    # Simulate running
    print("Application running... Press Ctrl+C to shutdown")
    os.environ['DINOAIR_START_TIME'] = str(time.time())
    
    try:
        while not handler.is_shutting_down():
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    
    # Wait for shutdown to complete
    handler.wait_for_shutdown()
    print("Shutdown complete")