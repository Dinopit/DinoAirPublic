import psutil
import asyncio
import time
from typing import Dict, List
import logging
from datetime import datetime
import json

class PerformanceMonitor:
    """Monitor system performance and optimize resource usage"""
    
    def __init__(self, log_interval: int = 60):
        self.log_interval = log_interval
        self.logger = logging.getLogger(__name__)
        self.metrics_history = []
        self.alerts = []
        
    def get_system_metrics(self) -> Dict:
        """Get current system metrics"""
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "cpu": {
                "percent": psutil.cpu_percent(interval=1),
                "cores": psutil.cpu_count(),
                "frequency": psutil.cpu_freq().current if psutil.cpu_freq() else 0
            },
            "memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "percent": psutil.virtual_memory().percent,
                "used": psutil.virtual_memory().used
            },
            "disk": {
                "total": psutil.disk_usage('/').total,
                "free": psutil.disk_usage('/').free,
                "percent": psutil.disk_usage('/').percent
            },
            "network": {
                "bytes_sent": psutil.net_io_counters().bytes_sent,
                "bytes_recv": psutil.net_io_counters().bytes_recv
            }
        }
        
        # GPU metrics if available
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            if gpus:
                metrics["gpu"] = []
                for gpu in gpus:
                    metrics["gpu"].append({
                        "id": gpu.id,
                        "name": gpu.name,
                        "load": gpu.load * 100,
                        "memory_free": gpu.memoryFree,
                        "memory_used": gpu.memoryUsed,
                        "memory_total": gpu.memoryTotal,
                        "temperature": gpu.temperature
                    })
        except ImportError:
            # GPU monitoring not available
            pass
        except Exception:
            # GPU access error
            pass
        
        return metrics
    
    def check_resource_alerts(self, metrics: Dict) -> List[str]:
        """Check for resource usage alerts"""
        alerts = []
        
        # CPU alerts
        if metrics["cpu"]["percent"] > 90:
            alerts.append(f"High CPU usage: {metrics['cpu']['percent']}%")
        
        # Memory alerts
        if metrics["memory"]["percent"] > 85:
            alerts.append(f"High memory usage: {metrics['memory']['percent']}%")
        
        # Disk alerts
        if metrics["disk"]["percent"] > 90:
            alerts.append(f"Low disk space: {metrics['disk']['percent']}% used")
        
        # GPU alerts
        if "gpu" in metrics:
            for gpu in metrics["gpu"]:
                if gpu["load"] > 95:
                    alerts.append(f"High GPU {gpu['id']} usage: {gpu['load']}%")
                if gpu["temperature"] > 85:
                    alerts.append(f"High GPU {gpu['id']} temperature: {gpu['temperature']}°C")
        
        return alerts
    
    async def monitor_loop(self):
        """Main monitoring loop"""
        while True:
            try:
                metrics = self.get_system_metrics()
                self.metrics_history.append(metrics)
                
                # Keep only last hour of metrics
                if len(self.metrics_history) > 60:
                    self.metrics_history.pop(0)
                
                # Check for alerts
                alerts = self.check_resource_alerts(metrics)
                if alerts:
                    for alert in alerts:
                        self.logger.warning(alert)
                    self.alerts.extend(alerts)
                
                # Log metrics
                self.logger.info(f"System metrics: CPU={metrics['cpu']['percent']}%, "
                               f"Memory={metrics['memory']['percent']}%, "
                               f"Disk={metrics['disk']['percent']}%")
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
            
            await asyncio.sleep(self.log_interval)
    
    def get_optimization_suggestions(self) -> List[str]:
        """Get performance optimization suggestions"""
        suggestions = []
        
        if not self.metrics_history:
            return suggestions
        
        # Analyze recent metrics
        recent_metrics = self.metrics_history[-5:]
        
        # CPU optimization
        avg_cpu = sum(m["cpu"]["percent"] for m in recent_metrics) / len(recent_metrics)
        if avg_cpu > 80:
            suggestions.append("Consider reducing concurrent operations or upgrading CPU")
        
        # Memory optimization
        avg_memory = sum(m["memory"]["percent"] for m in recent_metrics) / len(recent_metrics)
        if avg_memory > 80:
            suggestions.append("Consider increasing system RAM or optimizing memory usage")
        
        # GPU optimization
        if "gpu" in recent_metrics[0]:
            for gpu_idx, gpu in enumerate(recent_metrics[0]["gpu"]):
                avg_gpu_load = sum(
                    m["gpu"][gpu_idx]["load"] 
                    for m in recent_metrics 
                    if "gpu" in m and len(m["gpu"]) > gpu_idx
                ) / len(recent_metrics)
                
                if avg_gpu_load > 90:
                    suggestions.append(f"GPU {gpu_idx} is heavily loaded. Consider batch size reduction")
        
        return suggestions
    
    def export_metrics(self, filepath: str):
        """Export metrics history to file"""
        with open(filepath, 'w') as f:
            json.dump({
                "metrics": self.metrics_history,
                "alerts": self.alerts,
                "suggestions": self.get_optimization_suggestions()
            }, f, indent=2)