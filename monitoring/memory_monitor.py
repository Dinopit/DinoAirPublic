"""
DinoAir Memory Monitor
Monitors system memory usage and automatically unloads models when approaching limits
"""

import os
import sys
import time
import psutil
import threading
import logging
import json
import requests
from pathlib import Path
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import queue


class MemoryAlert(Enum):
    """Memory alert levels"""
    NORMAL = "normal"          # < 70% usage
    WARNING = "warning"        # 70-85% usage
    CRITICAL = "critical"      # 85-95% usage
    EMERGENCY = "emergency"    # > 95% usage


@dataclass
class MemorySnapshot:
    """Memory usage snapshot"""
    timestamp: float
    total_gb: float
    available_gb: float
    used_gb: float
    percent: float
    alert_level: MemoryAlert
    process_memory: Dict[str, float]  # Process name -> memory in MB


@dataclass
class ModelInfo:
    """Information about a loaded model"""
    name: str
    size_mb: float
    loaded_at: float
    last_used: float
    priority: int  # Lower = higher priority (keep loaded)
    service: str  # Which service owns this model


class MemoryMonitor:
    """Monitor memory usage and manage model loading/unloading"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or self._default_config()
        self.logger = self._setup_logging()
        self.running = False
        
        # Memory tracking
        self.memory_history: List[MemorySnapshot] = []
        self.loaded_models: Dict[str, ModelInfo] = {}
        self.unload_callbacks: Dict[str, Callable] = {}
        
        # Thresholds
        self.warning_threshold = self.config.get("warning_threshold", 70)
        self.critical_threshold = self.config.get("critical_threshold", 85)
        self.emergency_threshold = self.config.get("emergency_threshold", 95)
        
        # Monitoring
        self._monitor_thread = None
        self._stop_event = threading.Event()
        self._action_queue = queue.Queue()
        
        # Service URLs
        self.comfyui_url = self.config.get("comfyui_url", "http://localhost:8188")
        self.ollama_url = self.config.get("ollama_url", "http://localhost:11434")
    
    def _default_config(self) -> Dict[str, Any]:
        """Default configuration"""
        return {
            "monitor_interval": 5,  # seconds
            "history_size": 120,    # Keep 10 minutes of history at 5s intervals
            "warning_threshold": 70,
            "critical_threshold": 85,
            "emergency_threshold": 95,
            "min_free_memory_mb": 1024,  # Always keep at least 1GB free
            "unload_strategy": "lru",  # least recently used
            "auto_unload": True,
            "log_file": "logs/memory_monitor.log"
        }
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging"""
        from logging.handlers import RotatingFileHandler
        
        logger = logging.getLogger("MemoryMonitor")
        logger.setLevel(logging.DEBUG)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        # File handler
        log_file = Path(self.config.get("log_file", "logs/memory_monitor.log"))
        log_file.parent.mkdir(exist_ok=True)
        
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=3
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        return logger
    
    def start(self):
        """Start memory monitoring"""
        if self.running:
            self.logger.warning("Memory monitor is already running")
            return
        
        self.running = True
        self._stop_event.clear()
        
        self._monitor_thread = threading.Thread(
            target=self._monitor_loop,
            name="MemoryMonitor"
        )
        self._monitor_thread.start()
        
        self.logger.info("Memory monitor started")
    
    def stop(self):
        """Stop memory monitoring"""
        if not self.running:
            return
        
        self.running = False
        self._stop_event.set()
        
        if self._monitor_thread:
            self._monitor_thread.join(timeout=10)
        
        self.logger.info("Memory monitor stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.running and not self._stop_event.is_set():
            try:
                # Take memory snapshot
                snapshot = self._take_snapshot()
                self._add_to_history(snapshot)
                
                # Log current state
                self.logger.debug(
                    f"Memory: {snapshot.percent:.1f}% "
                    f"({snapshot.used_gb:.1f}/{snapshot.total_gb:.1f} GB) "
                    f"- {snapshot.alert_level.value}"
                )
                
                # Check for actions needed
                if self.config.get("auto_unload", True):
                    self._check_memory_pressure(snapshot)
                
                # Process any pending actions
                self._process_action_queue()
                
                # Sleep
                time.sleep(self.config.get("monitor_interval", 5))
                
            except Exception as e:
                self.logger.error(f"Monitor loop error: {e}")
                time.sleep(1)
    
    def _take_snapshot(self) -> MemorySnapshot:
        """Take a memory usage snapshot"""
        memory = psutil.virtual_memory()
        
        # Get process-specific memory usage
        process_memory = {}
        for proc in psutil.process_iter(['name', 'memory_info']):
            try:
                name = proc.info['name']
                memory_mb = proc.info['memory_info'].rss / (1024 * 1024)
                
                # Aggregate by process name
                if name in process_memory:
                    process_memory[name] += memory_mb
                else:
                    process_memory[name] = memory_mb
            except:
                pass
        
        # Determine alert level
        percent = memory.percent
        if percent >= self.emergency_threshold:
            alert_level = MemoryAlert.EMERGENCY
        elif percent >= self.critical_threshold:
            alert_level = MemoryAlert.CRITICAL
        elif percent >= self.warning_threshold:
            alert_level = MemoryAlert.WARNING
        else:
            alert_level = MemoryAlert.NORMAL
        
        return MemorySnapshot(
            timestamp=time.time(),
            total_gb=memory.total / (1024**3),
            available_gb=memory.available / (1024**3),
            used_gb=memory.used / (1024**3),
            percent=percent,
            alert_level=alert_level,
            process_memory=process_memory
        )
    
    def _add_to_history(self, snapshot: MemorySnapshot):
        """Add snapshot to history"""
        self.memory_history.append(snapshot)
        
        # Trim history
        max_size = self.config.get("history_size", 120)
        if len(self.memory_history) > max_size:
            self.memory_history = self.memory_history[-max_size:]
    
    def _check_memory_pressure(self, snapshot: MemorySnapshot):
        """Check if action is needed based on memory pressure"""
        if snapshot.alert_level == MemoryAlert.EMERGENCY:
            self.logger.warning("EMERGENCY: Memory usage critical!")
            self._emergency_unload()
        
        elif snapshot.alert_level == MemoryAlert.CRITICAL:
            self.logger.warning("Memory usage is critical, unloading unused models...")
            self._unload_least_used_models(target_free_gb=2.0)
        
        elif snapshot.alert_level == MemoryAlert.WARNING:
            self.logger.info("Memory usage is high, considering model unloading...")
            self._unload_least_used_models(target_free_gb=1.0)
    
    def _emergency_unload(self):
        """Emergency unload - free as much memory as possible"""
        self.logger.warning("Performing emergency memory cleanup!")
        
        # Unload all models
        for model_name in list(self.loaded_models.keys()):
            self._unload_model(model_name)
        
        # Force garbage collection
        import gc
        gc.collect()
        
        # Request services to free memory
        self._request_service_cleanup("comfyui")
        self._request_service_cleanup("ollama")
    
    def _unload_least_used_models(self, target_free_gb: float = 1.0):
        """Unload least recently used models until target free memory is reached"""
        current_free = psutil.virtual_memory().available / (1024**3)
        
        if current_free >= target_free_gb:
            return
        
        # Sort models by priority and last used time
        models = sorted(
            self.loaded_models.values(),
            key=lambda m: (m.priority, m.last_used)
        )
        
        for model in models:
            if current_free >= target_free_gb:
                break
            
            self.logger.info(f"Unloading model: {model.name} (size: {model.size_mb:.0f} MB)")
            self._unload_model(model.name)
            
            # Wait a bit for memory to be freed
            time.sleep(1)
            current_free = psutil.virtual_memory().available / (1024**3)
    
    def _unload_model(self, model_name: str):
        """Unload a specific model"""
        if model_name not in self.loaded_models:
            return
        
        model = self.loaded_models[model_name]
        
        # Call service-specific unload
        if model.service == "comfyui":
            self._unload_comfyui_model(model_name)
        elif model.service == "ollama":
            self._unload_ollama_model(model_name)
        
        # Remove from tracking
        del self.loaded_models[model_name]
        
        # Call custom callback if registered
        if model_name in self.unload_callbacks:
            try:
                self.unload_callbacks[model_name]()
            except Exception as e:
                self.logger.error(f"Unload callback error for {model_name}: {e}")
    
    def _unload_comfyui_model(self, model_name: str):
        """Unload a ComfyUI model"""
        try:
            # ComfyUI API call to unload model
            response = requests.post(
                f"{self.comfyui_url}/api/unload_model",
                json={"model_name": model_name},
                timeout=10
            )
            if response.status_code == 200:
                self.logger.info(f"Successfully unloaded ComfyUI model: {model_name}")
            else:
                self.logger.error(f"Failed to unload ComfyUI model: {response.status_code}")
        except Exception as e:
            self.logger.error(f"Error unloading ComfyUI model: {e}")
    
    def _unload_ollama_model(self, model_name: str):
        """Unload an Ollama model"""
        try:
            # Ollama doesn't have direct unload, but we can stop it
            response = requests.delete(
                f"{self.ollama_url}/api/tags/{model_name}",
                timeout=10
            )
            if response.status_code in [200, 204]:
                self.logger.info(f"Successfully unloaded Ollama model: {model_name}")
            else:
                self.logger.error(f"Failed to unload Ollama model: {response.status_code}")
        except Exception as e:
            self.logger.error(f"Error unloading Ollama model: {e}")
    
    def _request_service_cleanup(self, service: str):
        """Request a service to clean up memory"""
        try:
            if service == "comfyui":
                response = requests.post(
                    f"{self.comfyui_url}/api/free_memory",
                    json={"mode": "aggressive"},
                    timeout=10
                )
                if response.status_code == 200:
                    self.logger.info("ComfyUI memory cleanup requested")
            
            elif service == "ollama":
                # Ollama doesn't have a direct cleanup API
                # Could restart the service if needed
                pass
                
        except Exception as e:
            self.logger.error(f"Error requesting {service} cleanup: {e}")
    
    def _process_action_queue(self):
        """Process any pending actions"""
        while not self._action_queue.empty():
            try:
                action = self._action_queue.get_nowait()
                self._handle_action(action)
            except queue.Empty:
                break
            except Exception as e:
                self.logger.error(f"Error processing action: {e}")
    
    def _handle_action(self, action: Dict[str, Any]):
        """Handle an action request"""
        action_type = action.get("type")
        
        if action_type == "register_model":
            self.register_model(action["model"])
        elif action_type == "unregister_model":
            self.unregister_model(action["name"])
        elif action_type == "update_usage":
            self.update_model_usage(action["name"])
    
    def register_model(self, model: ModelInfo):
        """Register a loaded model"""
        self.loaded_models[model.name] = model
        self.logger.info(f"Registered model: {model.name} ({model.size_mb:.0f} MB)")
    
    def unregister_model(self, model_name: str):
        """Unregister a model (when unloaded externally)"""
        if model_name in self.loaded_models:
            del self.loaded_models[model_name]
            self.logger.info(f"Unregistered model: {model_name}")
    
    def update_model_usage(self, model_name: str):
        """Update last used time for a model"""
        if model_name in self.loaded_models:
            self.loaded_models[model_name].last_used = time.time()
    
    def register_unload_callback(self, model_name: str, callback: Callable):
        """Register a callback to be called when a model is unloaded"""
        self.unload_callbacks[model_name] = callback
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get current memory statistics"""
        if not self.memory_history:
            return {}
        
        latest = self.memory_history[-1]
        
        # Calculate trends
        if len(self.memory_history) >= 12:  # 1 minute of data
            minute_ago = self.memory_history[-12]
            trend = latest.percent - minute_ago.percent
        else:
            trend = 0
        
        return {
            "current": {
                "total_gb": latest.total_gb,
                "used_gb": latest.used_gb,
                "available_gb": latest.available_gb,
                "percent": latest.percent,
                "alert_level": latest.alert_level.value
            },
            "trend_per_minute": trend,
            "loaded_models": [
                {
                    "name": model.name,
                    "size_mb": model.size_mb,
                    "service": model.service,
                    "loaded_minutes": (time.time() - model.loaded_at) / 60,
                    "last_used_minutes": (time.time() - model.last_used) / 60
                }
                for model in self.loaded_models.values()
            ],
            "top_processes": sorted(
                [
                    {"name": name, "memory_mb": mem}
                    for name, mem in latest.process_memory.items()
                    if mem > 100  # Only show processes using > 100MB
                ],
                key=lambda x: x["memory_mb"],
                reverse=True
            )[:10]
        }
    
    def save_report(self, filepath: Optional[Path] = None):
        """Save memory usage report"""
        if not filepath:
            filepath = Path("logs") / f"memory_report_{int(time.time())}.json"
        
        filepath.parent.mkdir(exist_ok=True)
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "stats": self.get_memory_stats(),
            "config": self.config,
            "history": [
                {
                    "timestamp": s.timestamp,
                    "percent": s.percent,
                    "alert_level": s.alert_level.value
                }
                for s in self.memory_history[-60:]  # Last 5 minutes
            ]
        }
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2)
        
        self.logger.info(f"Memory report saved to: {filepath}")


class MemoryOptimizer:
    """Helper class for memory optimization strategies"""
    
    @staticmethod
    def calculate_model_priority(model: ModelInfo, access_pattern: List[float]) -> int:
        """Calculate model priority based on usage patterns"""
        if not access_pattern:
            return 999  # Lowest priority
        
        # Factors to consider:
        # 1. Frequency of use
        # 2. Recency of use
        # 3. Model size
        # 4. Time to reload
        
        current_time = time.time()
        
        # Calculate access frequency (accesses per hour)
        if len(access_pattern) > 1:
            time_span = access_pattern[-1] - access_pattern[0]
            frequency = len(access_pattern) / (time_span / 3600) if time_span > 0 else 0
        else:
            frequency = 1
        
        # Calculate recency score (exponential decay)
        recency = 1.0 / (1 + (current_time - model.last_used) / 3600)
        
        # Size penalty (larger models get lower priority)
        size_factor = 1.0 / (1 + model.size_mb / 1024)
        
        # Combined score (lower is better)
        score = 100 - (frequency * 40 + recency * 40 + size_factor * 20)
        
        return max(1, min(999, int(score)))
    
    @staticmethod
    def estimate_memory_for_operation(operation: str, model_type: str) -> int:
        """Estimate memory required for an operation in MB"""
        estimates = {
            "load_sdxl": 6000,      # 6GB for SDXL model
            "load_sd15": 4000,      # 4GB for SD 1.5
            "generate_image": 2000,  # 2GB temporary during generation
            "load_llm_7b": 8000,    # 8GB for 7B parameter LLM
            "inference": 500        # 500MB for inference overhead
        }
        
        key = f"{operation}_{model_type}".lower()
        return estimates.get(key, 1000)  # Default 1GB


def main():
    """Test the memory monitor"""
    monitor = MemoryMonitor()
    
    # Register some test models
    monitor.register_model(ModelInfo(
        name="sdxl_base",
        size_mb=6144,
        loaded_at=time.time(),
        last_used=time.time(),
        priority=1,
        service="comfyui"
    ))
    
    monitor.register_model(ModelInfo(
        name="qwen-7b",
        size_mb=8192,
        loaded_at=time.time() - 300,
        last_used=time.time() - 60,
        priority=2,
        service="ollama"
    ))
    
    # Start monitoring
    monitor.start()
    
    try:
        # Run for a while
        print("Memory monitor running. Press Ctrl+C to stop.")
        while True:
            time.sleep(10)
            stats = monitor.get_memory_stats()
            print(f"\nMemory: {stats['current']['percent']:.1f}% - "
                  f"{stats['current']['alert_level']}")
            print(f"Models loaded: {len(stats['loaded_models'])}")
            
    except KeyboardInterrupt:
        print("\nStopping...")
    
    finally:
        monitor.stop()
        monitor.save_report()


if __name__ == "__main__":
    main()