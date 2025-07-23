"""
DinoAir Resource Usage Monitoring and Alerting
Provides real-time monitoring of system resources with alerting capabilities
"""

import os
import psutil
import time
import json
import threading
import logging
import smtplib
import requests
from typing import Optional, List, Dict, Any, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from enum import Enum
from collections import deque
import statistics

class ResourceType(Enum):
    """Types of resources to monitor"""
    CPU = "cpu"
    MEMORY = "memory"
    DISK = "disk"
    NETWORK = "network"
    GPU = "gpu"
    PROCESS = "process"
    TEMPERATURE = "temperature"

class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class AlertChannel(Enum):
    """Alert delivery channels"""
    LOG = "log"
    EMAIL = "email"
    WEBHOOK = "webhook"
    FILE = "file"
    CONSOLE = "console"

@dataclass
class ResourceThreshold:
    """Threshold configuration for resource monitoring"""
    resource_type: ResourceType
    metric: str
    warning_threshold: float
    critical_threshold: float
    emergency_threshold: Optional[float] = None
    duration: int = 60  # seconds - how long threshold must be exceeded
    check_interval: int = 5  # seconds between checks

@dataclass
class ResourceMetric:
    """A single resource measurement"""
    resource_type: ResourceType
    metric: str
    value: float
    unit: str
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Alert:
    """Alert information"""
    id: str
    resource_type: ResourceType
    metric: str
    level: AlertLevel
    value: float
    threshold: float
    message: str
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class MonitoringConfig:
    """Configuration for resource monitoring"""
    # Monitoring settings
    enabled: bool = True
    check_interval: int = 5  # seconds
    history_size: int = 1000  # number of metrics to keep
    
    # Resource thresholds
    thresholds: List[ResourceThreshold] = field(default_factory=lambda: [
        # CPU thresholds
        ResourceThreshold(ResourceType.CPU, "usage_percent", 70.0, 85.0, 95.0),
        ResourceThreshold(ResourceType.CPU, "load_average", 2.0, 4.0, 8.0),
        
        # Memory thresholds
        ResourceThreshold(ResourceType.MEMORY, "usage_percent", 75.0, 85.0, 95.0),
        ResourceThreshold(ResourceType.MEMORY, "available_mb", 1024.0, 512.0, 256.0),
        
        # Disk thresholds
        ResourceThreshold(ResourceType.DISK, "usage_percent", 80.0, 90.0, 95.0),
        ResourceThreshold(ResourceType.DISK, "free_gb", 10.0, 5.0, 1.0),
        
        # Network thresholds (MB/s)
        ResourceThreshold(ResourceType.NETWORK, "bandwidth_mbps", 80.0, 90.0, 100.0),
        
        # Temperature thresholds (Celsius)
        ResourceThreshold(ResourceType.TEMPERATURE, "cpu_temp", 70.0, 80.0, 90.0),
    ])
    
    # Alert settings
    alert_channels: List[AlertChannel] = field(default_factory=lambda: [
        AlertChannel.LOG,
        AlertChannel.FILE
    ])
    alert_cooldown: int = 300  # seconds between same alerts
    
    # Email settings
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    alert_email: Optional[str] = None
    
    # Webhook settings
    webhook_url: Optional[str] = None
    webhook_headers: Dict[str, str] = field(default_factory=dict)
    
    # File settings
    alert_file: str = "./logs/alerts.json"
    metrics_file: str = "./logs/metrics.json"

class ResourceMonitor:
    """
    Monitors system resources and sends alerts
    """
    
    def __init__(self, config: Optional[MonitoringConfig] = None):
        self.config = config or MonitoringConfig()
        self.logger = logging.getLogger("ResourceMonitor")
        
        # Metric history
        self.metrics_history: Dict[str, deque] = {}
        self.max_history = self.config.history_size
        
        # Alert tracking
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.last_alert_time: Dict[str, datetime] = {}
        
        # Monitoring state
        self._running = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        
        # Callbacks
        self.on_alert: List[Callable[[Alert], None]] = []
        self.on_metric: List[Callable[[ResourceMetric], None]] = []
        
        # GPU availability
        self._gpu_available = self._check_gpu_availability()
    
    def _check_gpu_availability(self) -> bool:
        """Check if GPU monitoring is available"""
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            return len(gpus) > 0
        except ImportError:
            return False
    
    def start(self):
        """Start resource monitoring"""
        if self._running:
            return
        
        self._running = True
        self._monitor_thread = threading.Thread(
            target=self._monitor_loop,
            daemon=True,
            name="ResourceMonitor"
        )
        self._monitor_thread.start()
        self.logger.info("Resource monitoring started")
    
    def stop(self):
        """Stop resource monitoring"""
        self._running = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=5)
        self.logger.info("Resource monitoring stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self._running:
            try:
                # Collect metrics
                metrics = self._collect_metrics()
                
                # Store metrics
                self._store_metrics(metrics)
                
                # Check thresholds
                self._check_thresholds(metrics)
                
                # Trigger callbacks
                for metric in metrics:
                    for callback in self.on_metric:
                        try:
                            callback(metric)
                        except Exception as e:
                            self.logger.error(f"Error in metric callback: {e}")
                
                # Sleep until next check
                time.sleep(self.config.check_interval)
                
            except Exception as e:
                self.logger.error(f"Error in monitor loop: {e}")
                time.sleep(self.config.check_interval)
    
    def _collect_metrics(self) -> List[ResourceMetric]:
        """Collect all resource metrics"""
        metrics = []
        
        # CPU metrics
        metrics.extend(self._collect_cpu_metrics())
        
        # Memory metrics
        metrics.extend(self._collect_memory_metrics())
        
        # Disk metrics
        metrics.extend(self._collect_disk_metrics())
        
        # Network metrics
        metrics.extend(self._collect_network_metrics())
        
        # GPU metrics
        if self._gpu_available:
            metrics.extend(self._collect_gpu_metrics())
        
        # Temperature metrics
        metrics.extend(self._collect_temperature_metrics())
        
        # Process metrics
        metrics.extend(self._collect_process_metrics())
        
        return metrics
    
    def _collect_cpu_metrics(self) -> List[ResourceMetric]:
        """Collect CPU metrics"""
        metrics = []
        timestamp = datetime.now()
        
        # CPU usage percentage
        cpu_percent = psutil.cpu_percent(interval=1)
        metrics.append(ResourceMetric(
            resource_type=ResourceType.CPU,
            metric="usage_percent",
            value=cpu_percent,
            unit="%",
            timestamp=timestamp,
            metadata={"cores": psutil.cpu_count()}
        ))
        
        # CPU load average
        try:
            load_avg = os.getloadavg()
            metrics.append(ResourceMetric(
                resource_type=ResourceType.CPU,
                metric="load_average",
                value=load_avg[0],  # 1-minute average
                unit="",
                timestamp=timestamp,
                metadata={
                    "load_1min": load_avg[0],
                    "load_5min": load_avg[1],
                    "load_15min": load_avg[2]
                }
            ))
        except AttributeError:
            # Windows doesn't have getloadavg
            pass
        
        # Per-core usage
        per_cpu = psutil.cpu_percent(interval=0.1, percpu=True)
        for i, usage in enumerate(per_cpu):
            metrics.append(ResourceMetric(
                resource_type=ResourceType.CPU,
                metric=f"core_{i}_usage",
                value=usage,
                unit="%",
                timestamp=timestamp
            ))
        
        return metrics
    
    def _collect_memory_metrics(self) -> List[ResourceMetric]:
        """Collect memory metrics"""
        metrics = []
        timestamp = datetime.now()
        
        # Virtual memory
        vm = psutil.virtual_memory()
        
        metrics.append(ResourceMetric(
            resource_type=ResourceType.MEMORY,
            metric="usage_percent",
            value=vm.percent,
            unit="%",
            timestamp=timestamp,
            metadata={
                "total_mb": vm.total / (1024 * 1024),
                "used_mb": vm.used / (1024 * 1024),
                "available_mb": vm.available / (1024 * 1024)
            }
        ))
        
        metrics.append(ResourceMetric(
            resource_type=ResourceType.MEMORY,
            metric="available_mb",
            value=vm.available / (1024 * 1024),
            unit="MB",
            timestamp=timestamp
        ))
        
        # Swap memory
        swap = psutil.swap_memory()
        if swap.total > 0:
            metrics.append(ResourceMetric(
                resource_type=ResourceType.MEMORY,
                metric="swap_usage_percent",
                value=swap.percent,
                unit="%",
                timestamp=timestamp,
                metadata={
                    "swap_total_mb": swap.total / (1024 * 1024),
                    "swap_used_mb": swap.used / (1024 * 1024)
                }
            ))
        
        return metrics
    
    def _collect_disk_metrics(self) -> List[ResourceMetric]:
        """Collect disk metrics"""
        metrics = []
        timestamp = datetime.now()
        
        # Disk usage for all partitions
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                
                metrics.append(ResourceMetric(
                    resource_type=ResourceType.DISK,
                    metric="usage_percent",
                    value=usage.percent,
                    unit="%",
                    timestamp=timestamp,
                    metadata={
                        "mountpoint": partition.mountpoint,
                        "device": partition.device,
                        "fstype": partition.fstype,
                        "total_gb": usage.total / (1024**3),
                        "used_gb": usage.used / (1024**3),
                        "free_gb": usage.free / (1024**3)
                    }
                ))
                
                metrics.append(ResourceMetric(
                    resource_type=ResourceType.DISK,
                    metric="free_gb",
                    value=usage.free / (1024**3),
                    unit="GB",
                    timestamp=timestamp,
                    metadata={"mountpoint": partition.mountpoint}
                ))
                
            except PermissionError:
                continue
        
        # Disk I/O stats
        try:
            io_counters = psutil.disk_io_counters()
            if io_counters:
                metrics.append(ResourceMetric(
                    resource_type=ResourceType.DISK,
                    metric="read_mbps",
                    value=io_counters.read_bytes / (1024**2),
                    unit="MB/s",
                    timestamp=timestamp
                ))
                
                metrics.append(ResourceMetric(
                    resource_type=ResourceType.DISK,
                    metric="write_mbps",
                    value=io_counters.write_bytes / (1024**2),
                    unit="MB/s",
                    timestamp=timestamp
                ))
        except:
            pass
        
        return metrics
    
    def _collect_network_metrics(self) -> List[ResourceMetric]:
        """Collect network metrics"""
        metrics = []
        timestamp = datetime.now()
        
        # Network I/O stats
        try:
            net_io = psutil.net_io_counters()
            
            # Calculate bandwidth usage (this is cumulative, need to calculate rate)
            key = "network_bytes"
            if key in self.metrics_history and len(self.metrics_history[key]) > 0:
                prev_metric = self.metrics_history[key][-1]
                time_diff = (timestamp - prev_metric.timestamp).total_seconds()
                
                if time_diff > 0:
                    bytes_sent_rate = (net_io.bytes_sent - prev_metric.metadata.get('bytes_sent', 0)) / time_diff
                    bytes_recv_rate = (net_io.bytes_recv - prev_metric.metadata.get('bytes_recv', 0)) / time_diff
                    
                    # Convert to Mbps
                    send_mbps = (bytes_sent_rate * 8) / (1024**2)
                    recv_mbps = (bytes_recv_rate * 8) / (1024**2)
                    
                    metrics.append(ResourceMetric(
                        resource_type=ResourceType.NETWORK,
                        metric="send_mbps",
                        value=send_mbps,
                        unit="Mbps",
                        timestamp=timestamp
                    ))
                    
                    metrics.append(ResourceMetric(
                        resource_type=ResourceType.NETWORK,
                        metric="recv_mbps",
                        value=recv_mbps,
                        unit="Mbps",
                        timestamp=timestamp
                    ))
                    
                    metrics.append(ResourceMetric(
                        resource_type=ResourceType.NETWORK,
                        metric="bandwidth_mbps",
                        value=send_mbps + recv_mbps,
                        unit="Mbps",
                        timestamp=timestamp
                    ))
            
            # Store current values for next calculation
            metrics.append(ResourceMetric(
                resource_type=ResourceType.NETWORK,
                metric="bytes_total",
                value=net_io.bytes_sent + net_io.bytes_recv,
                unit="bytes",
                timestamp=timestamp,
                metadata={
                    "bytes_sent": net_io.bytes_sent,
                    "bytes_recv": net_io.bytes_recv,
                    "packets_sent": net_io.packets_sent,
                    "packets_recv": net_io.packets_recv
                }
            ))
            
        except Exception as e:
            self.logger.error(f"Error collecting network metrics: {e}")
        
        return metrics
    
    def _collect_gpu_metrics(self) -> List[ResourceMetric]:
        """Collect GPU metrics"""
        metrics = []
        timestamp = datetime.now()
        
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            
            for i, gpu in enumerate(gpus):
                metrics.append(ResourceMetric(
                    resource_type=ResourceType.GPU,
                    metric=f"gpu_{i}_usage",
                    value=gpu.load * 100,
                    unit="%",
                    timestamp=timestamp,
                    metadata={
                        "name": gpu.name,
                        "driver": gpu.driver,
                        "memory_total": gpu.memoryTotal,
                        "memory_used": gpu.memoryUsed,
                        "memory_free": gpu.memoryFree,
                        "temperature": gpu.temperature
                    }
                ))
                
                metrics.append(ResourceMetric(
                    resource_type=ResourceType.GPU,
                    metric=f"gpu_{i}_memory_usage",
                    value=(gpu.memoryUsed / gpu.memoryTotal) * 100 if gpu.memoryTotal > 0 else 0,
                    unit="%",
                    timestamp=timestamp
                ))
                
                metrics.append(ResourceMetric(
                    resource_type=ResourceType.GPU,
                    metric=f"gpu_{i}_temperature",
                    value=gpu.temperature,
                    unit="°C",
                    timestamp=timestamp
                ))
                
        except Exception as e:
            self.logger.debug(f"GPU metrics not available: {e}")
        
        return metrics
    
    def _collect_temperature_metrics(self) -> List[ResourceMetric]:
        """Collect temperature metrics"""
        metrics = []
        timestamp = datetime.now()
        
        try:
            temps = psutil.sensors_temperatures()
            
            for name, entries in temps.items():
                for entry in entries:
                    label = entry.label or name
                    metrics.append(ResourceMetric(
                        resource_type=ResourceType.TEMPERATURE,
                        metric=f"{name}_{label}".lower().replace(' ', '_'),
                        value=entry.current,
                        unit="°C",
                        timestamp=timestamp,
                        metadata={
                            "high": entry.high,
                            "critical": entry.critical
                        }
                    ))
                    
                    # Special handling for CPU temperature
                    if 'cpu' in name.lower() or 'core' in label.lower():
                        metrics.append(ResourceMetric(
                            resource_type=ResourceType.TEMPERATURE,
                            metric="cpu_temp",
                            value=entry.current,
                            unit="°C",
                            timestamp=timestamp
                        ))
                        
        except AttributeError:
            # Not supported on this platform
            pass
        except Exception as e:
            self.logger.debug(f"Temperature metrics not available: {e}")
        
        return metrics
    
    def _collect_process_metrics(self) -> List[ResourceMetric]:
        """Collect process-specific metrics"""
        metrics = []
        timestamp = datetime.now()
        
        try:
            current_process = psutil.Process()
            
            # DinoAir process metrics
            metrics.append(ResourceMetric(
                resource_type=ResourceType.PROCESS,
                metric="dinoair_cpu_usage",
                value=current_process.cpu_percent(),
                unit="%",
                timestamp=timestamp
            ))
            
            memory_info = current_process.memory_info()
            metrics.append(ResourceMetric(
                resource_type=ResourceType.PROCESS,
                metric="dinoair_memory_mb",
                value=memory_info.rss / (1024**2),
                unit="MB",
                timestamp=timestamp,
                metadata={
                    "vms_mb": memory_info.vms / (1024**2) if hasattr(memory_info, 'vms') else 0
                }
            ))
            
            # Count child processes
            children = current_process.children(recursive=True)
            metrics.append(ResourceMetric(
                resource_type=ResourceType.PROCESS,
                metric="child_processes",
                value=len(children),
                unit="count",
                timestamp=timestamp
            ))
            
            # Total process count
            metrics.append(ResourceMetric(
                resource_type=ResourceType.PROCESS,
                metric="total_processes",
                value=len(psutil.pids()),
                unit="count",
                timestamp=timestamp
            ))
            
        except Exception as e:
            self.logger.error(f"Error collecting process metrics: {e}")
        
        return metrics
    
    def _store_metrics(self, metrics: List[ResourceMetric]):
        """Store metrics in history"""
        with self._lock:
            for metric in metrics:
                key = f"{metric.resource_type.value}_{metric.metric}"
                
                if key not in self.metrics_history:
                    self.metrics_history[key] = deque(maxlen=self.max_history)
                
                self.metrics_history[key].append(metric)
    
    def _check_thresholds(self, metrics: List[ResourceMetric]):
        """Check metrics against thresholds"""
        for threshold in self.config.thresholds:
            # Find matching metrics
            matching_metrics = [
                m for m in metrics
                if m.resource_type == threshold.resource_type and m.metric == threshold.metric
            ]
            
            for metric in matching_metrics:
                self._check_metric_threshold(metric, threshold)
    
    def _check_metric_threshold(self, metric: ResourceMetric, threshold: ResourceThreshold):
        """Check individual metric against threshold"""
        alert_key = f"{metric.resource_type.value}_{metric.metric}"
        
        # Determine alert level
        alert_level = None
        threshold_value = None
        
        # For metrics where lower is worse (like free space)
        if metric.metric in ["available_mb", "free_gb"]:
            if threshold.emergency_threshold and metric.value <= threshold.emergency_threshold:
                alert_level = AlertLevel.EMERGENCY
                threshold_value = threshold.emergency_threshold
            elif metric.value <= threshold.critical_threshold:
                alert_level = AlertLevel.CRITICAL
                threshold_value = threshold.critical_threshold
            elif metric.value <= threshold.warning_threshold:
                alert_level = AlertLevel.WARNING
                threshold_value = threshold.warning_threshold
        else:
            # For metrics where higher is worse (like usage)
            if threshold.emergency_threshold and metric.value >= threshold.emergency_threshold:
                alert_level = AlertLevel.EMERGENCY
                threshold_value = threshold.emergency_threshold
            elif metric.value >= threshold.critical_threshold:
                alert_level = AlertLevel.CRITICAL
                threshold_value = threshold.critical_threshold
            elif metric.value >= threshold.warning_threshold:
                alert_level = AlertLevel.WARNING
                threshold_value = threshold.warning_threshold
        
        # Check if we need to create or update alert
        if alert_level:
            # Check duration requirement
            if self._check_threshold_duration(alert_key, threshold.duration):
                self._create_or_update_alert(
                    alert_key, metric, alert_level, threshold_value
                )
        else:
            # Resolve alert if exists
            self._resolve_alert(alert_key)
    
    def _check_threshold_duration(self, metric_key: str, required_duration: int) -> bool:
        """Check if threshold has been exceeded for required duration"""
        if metric_key not in self.metrics_history:
            return False
        
        history = self.metrics_history[metric_key]
        if len(history) < 2:
            return False
        
        # Check how long the threshold has been exceeded
        start_time = history[-1].timestamp - timedelta(seconds=required_duration)
        
        # Count consecutive violations
        for metric in reversed(history):
            if metric.timestamp < start_time:
                return True
        
        return False
    
    def _create_or_update_alert(self, alert_key: str, metric: ResourceMetric, 
                               level: AlertLevel, threshold: float):
        """Create or update an alert"""
        # Check cooldown
        if alert_key in self.last_alert_time:
            time_since_last = (datetime.now() - self.last_alert_time[alert_key]).total_seconds()
            if time_since_last < self.config.alert_cooldown:
                return
        
        # Create alert
        alert_id = f"{alert_key}_{int(time.time())}"
        
        alert = Alert(
            id=alert_id,
            resource_type=metric.resource_type,
            metric=metric.metric,
            level=level,
            value=metric.value,
            threshold=threshold,
            message=self._generate_alert_message(metric, level, threshold),
            timestamp=datetime.now(),
            metadata=metric.metadata
        )
        
        # Store alert
        with self._lock:
            self.active_alerts[alert_key] = alert
            self.alert_history.append(alert)
            self.last_alert_time[alert_key] = datetime.now()
        
        # Send alert
        self._send_alert(alert)
        
        # Trigger callbacks
        for callback in self.on_alert:
            try:
                callback(alert)
            except Exception as e:
                self.logger.error(f"Error in alert callback: {e}")
    
    def _resolve_alert(self, alert_key: str):
        """Resolve an active alert"""
        with self._lock:
            if alert_key in self.active_alerts:
                alert = self.active_alerts[alert_key]
                alert.resolved = True
                alert.resolved_at = datetime.now()
                
                del self.active_alerts[alert_key]
                
                # Send resolution notification
                self._send_alert_resolution(alert)
    
    def _generate_alert_message(self, metric: ResourceMetric, level: AlertLevel, 
                               threshold: float) -> str:
        """Generate alert message"""
        direction = "above" if metric.value > threshold else "below"
        
        messages = {
            AlertLevel.WARNING: f"⚠️ {metric.resource_type.value.upper()} {metric.metric} is {direction} warning threshold",
            AlertLevel.CRITICAL: f"🚨 {metric.resource_type.value.upper()} {metric.metric} is {direction} critical threshold",
            AlertLevel.EMERGENCY: f"🆘 {metric.resource_type.value.upper()} {metric.metric} is {direction} emergency threshold"
        }
        
        base_message = messages.get(level, "Resource threshold exceeded")
        
        return (
            f"{base_message}\n"
            f"Current: {metric.value:.2f}{metric.unit}\n"
            f"Threshold: {threshold:.2f}{metric.unit}"
        )
    
    def _send_alert(self, alert: Alert):
        """Send alert through configured channels"""
        for channel in self.config.alert_channels:
            try:
                if channel == AlertChannel.LOG:
                    self._send_log_alert(alert)
                elif channel == AlertChannel.EMAIL:
                    self._send_email_alert(alert)
                elif channel == AlertChannel.WEBHOOK:
                    self._send_webhook_alert(alert)
                elif channel == AlertChannel.FILE:
                    self._send_file_alert(alert)
                elif channel == AlertChannel.CONSOLE:
                    self._send_console_alert(alert)
            except Exception as e:
                self.logger.error(f"Failed to send alert via {channel.value}: {e}")
    
    def _send_log_alert(self, alert: Alert):
        """Send alert to log"""
        if alert.level == AlertLevel.EMERGENCY:
            self.logger.critical(alert.message)
        elif alert.level == AlertLevel.CRITICAL:
            self.logger.error(alert.message)
        elif alert.level == AlertLevel.WARNING:
            self.logger.warning(alert.message)
        else:
            self.logger.info(alert.message)
    
    def _send_console_alert(self, alert: Alert):
        """Send alert to console"""
        print(f"\n{'='*60}")
        print(f"ALERT: {alert.level.value.upper()}")
        print(f"Time: {alert.timestamp}")
        print(alert.message)
        print(f"{'='*60}\n")
    
    def _send_file_alert(self, alert: Alert):
        """Send alert to file"""
        alert_data = {
            "id": alert.id,
            "timestamp": alert.timestamp.isoformat(),
            "level": alert.level.value,
            "resource_type": alert.resource_type.value,
            "metric": alert.metric,
            "value": alert.value,
            "threshold": alert.threshold,
            "message": alert.message,
            "metadata": alert.metadata
        }
        
        # Append to alert file
        alert_file = Path(self.config.alert_file)
        alert_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(alert_file, 'a') as f:
            json.dump(alert_data, f)
            f.write('\n')
    
    def _send_email_alert(self, alert: Alert):
        """Send alert via email"""
        if not all([self.config.smtp_host, self.config.smtp_user, 
                   self.config.smtp_password, self.config.alert_email]):
            return
        
        # Implement email sending
        # This is a placeholder - actual implementation would use SMTP
        self.logger.info(f"Would send email alert: {alert.message}")
    
    def _send_webhook_alert(self, alert: Alert):
        """Send alert via webhook"""
        if not self.config.webhook_url:
            return
        
        payload = {
            "alert_id": alert.id,
            "timestamp": alert.timestamp.isoformat(),
            "level": alert.level.value,
            "resource": alert.resource_type.value,
            "metric": alert.metric,
            "value": alert.value,
            "threshold": alert.threshold,
            "message": alert.message
        }
        
        try:
            response = requests.post(
                self.config.webhook_url,
                json=payload,
                headers=self.config.webhook_headers,
                timeout=10
            )
            response.raise_for_status()
        except Exception as e:
            self.logger.error(f"Webhook alert failed: {e}")
    
    def _send_alert_resolution(self, alert: Alert):
        """Send alert resolution notification"""
        resolution_message = (
            f"✅ Alert resolved: {alert.resource_type.value.upper()} {alert.metric}\n"
            f"Duration: {(alert.resolved_at - alert.timestamp).total_seconds():.0f}s"
        )
        
        # Log resolution
        self.logger.info(resolution_message)
        
        # Could send through other channels as well
    
    def get_current_metrics(self) -> Dict[str, ResourceMetric]:
        """Get current (latest) metrics"""
        current = {}
        
        with self._lock:
            for key, history in self.metrics_history.items():
                if history:
                    current[key] = history[-1]
        
        return current
    
    def get_metric_history(self, resource_type: ResourceType, metric: str, 
                          duration: Optional[int] = None) -> List[ResourceMetric]:
        """Get metric history"""
        key = f"{resource_type.value}_{metric}"
        
        with self._lock:
            if key not in self.metrics_history:
                return []
            
            history = list(self.metrics_history[key])
            
            if duration:
                cutoff = datetime.now() - timedelta(seconds=duration)
                history = [m for m in history if m.timestamp >= cutoff]
            
            return history
    
    def get_metric_statistics(self, resource_type: ResourceType, metric: str,
                            duration: int = 3600) -> Dict[str, float]:
        """Get statistics for a metric over duration"""
        history = self.get_metric_history(resource_type, metric, duration)
        
        if not history:
            return {}
        
        values = [m.value for m in history]
        
        return {
            "current": values[-1],
            "min": min(values),
            "max": max(values),
            "avg": statistics.mean(values),
            "median": statistics.median(values),
            "stddev": statistics.stdev(values) if len(values) > 1 else 0
        }
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts"""
        with self._lock:
            return list(self.active_alerts.values())
    
    def get_system_report(self) -> Dict[str, Any]:
        """Get comprehensive system report"""
        current_metrics = self.get_current_metrics()
        
        # Extract key metrics
        cpu_usage = current_metrics.get("cpu_usage_percent", ResourceMetric(
            ResourceType.CPU, "usage_percent", 0, "%", datetime.now()
        )).value
        
        memory_usage = current_metrics.get("memory_usage_percent", ResourceMetric(
            ResourceType.MEMORY, "usage_percent", 0, "%", datetime.now()
        )).value
        
        disk_usage = current_metrics.get("disk_usage_percent", ResourceMetric(
            ResourceType.DISK, "usage_percent", 0, "%", datetime.now()
        )).value
        
        return {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "cpu_usage": cpu_usage,
                "memory_usage": memory_usage,
                "disk_usage": disk_usage,
                "active_alerts": len(self.active_alerts),
                "status": self._get_overall_status()
            },
            "alerts": [
                {
                    "level": alert.level.value,
                    "resource": alert.resource_type.value,
                    "metric": alert.metric,
                    "value": alert.value,
                    "threshold": alert.threshold,
                    "duration": (datetime.now() - alert.timestamp).total_seconds()
                }
                for alert in self.get_active_alerts()
            ],
            "resources": {
                "cpu": self.get_metric_statistics(ResourceType.CPU, "usage_percent", 300),
                "memory": self.get_metric_statistics(ResourceType.MEMORY, "usage_percent", 300),
                "disk": self.get_metric_statistics(ResourceType.DISK, "usage_percent", 300)
            }
        }
    
    def _get_overall_status(self) -> str:
        """Get overall system status"""
        active_alerts = self.get_active_alerts()
        
        if any(a.level == AlertLevel.EMERGENCY for a in active_alerts):
            return "EMERGENCY"
        elif any(a.level == AlertLevel.CRITICAL for a in active_alerts):
            return "CRITICAL"
        elif any(a.level == AlertLevel.WARNING for a in active_alerts):
            return "WARNING"
        else:
            return "HEALTHY"

# Helper functions
def create_resource_monitor(config: Optional[MonitoringConfig] = None) -> ResourceMonitor:
    """Create and start resource monitor"""
    monitor = ResourceMonitor(config)
    monitor.start()
    return monitor

def get_system_status() -> Dict[str, Any]:
    """Get quick system status"""
    monitor = ResourceMonitor()
    metrics = monitor._collect_metrics()
    
    cpu_metrics = [m for m in metrics if m.resource_type == ResourceType.CPU and m.metric == "usage_percent"]
    memory_metrics = [m for m in metrics if m.resource_type == ResourceType.MEMORY and m.metric == "usage_percent"]
    disk_metrics = [m for m in metrics if m.resource_type == ResourceType.DISK and m.metric == "usage_percent"]
    
    return {
        "cpu_usage": cpu_metrics[0].value if cpu_metrics else 0,
        "memory_usage": memory_metrics[0].value if memory_metrics else 0,
        "disk_usage": max(m.value for m in disk_metrics) if disk_metrics else 0,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    
    # Create custom configuration
    config = MonitoringConfig(
        check_interval=2,
        thresholds=[
            ResourceThreshold(ResourceType.CPU, "usage_percent", 50.0, 70.0, 90.0, duration=10),
            ResourceThreshold(ResourceType.MEMORY, "usage_percent", 60.0, 80.0, 95.0, duration=10),
        ],
        alert_channels=[AlertChannel.LOG, AlertChannel.CONSOLE]
    )
    
    # Create and start monitor
    monitor = ResourceMonitor(config)
    
    # Add alert callback
    def on_alert(alert: Alert):
        print(f"Alert callback: {alert.level.value} - {alert.message}")
    
    monitor.on_alert.append(on_alert)
    
    # Start monitoring
    monitor.start()
    
    print("Resource monitoring started. Press Ctrl+C to stop.")
    print("Generating some CPU load to trigger alerts...")
    
    try:
        # Generate some load
        import multiprocessing
        
        def cpu_load():
            while True:
                [i**2 for i in range(10000)]
        
        # Start a process to generate CPU load
        p = multiprocessing.Process(target=cpu_load)
        p.start()
        
        # Monitor for a while
        for i in range(30):
            time.sleep(2)
            report = monitor.get_system_report()
            print(f"\nSystem Status: {report['summary']['status']}")
            print(f"CPU: {report['summary']['cpu_usage']:.1f}%")
            print(f"Memory: {report['summary']['memory_usage']:.1f}%")
            print(f"Active Alerts: {report['summary']['active_alerts']}")
        
        # Stop load generation
        p.terminate()
        
    except KeyboardInterrupt:
        pass
    finally:
        monitor.stop()
        print("\nMonitoring stopped.")