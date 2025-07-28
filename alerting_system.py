#!/usr/bin/env python3
"""
Alerting System for Critical Failures
Implements comprehensive alerting for DinoAir system failures and critical events.
"""

import json
import time
import smtplib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Optional import for requests
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

class AlertSeverity(Enum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertCategory(Enum):
    """Alert categories."""
    SYSTEM_FAILURE = "system_failure"
    SECURITY_BREACH = "security_breach"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    SERVICE_UNAVAILABLE = "service_unavailable"
    DATA_CORRUPTION = "data_corruption"
    AUTHENTICATION_FAILURE = "authentication_failure"
    CONFIGURATION_ERROR = "configuration_error"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    COMPLIANCE_VIOLATION = "compliance_violation"
    AUDIT_FAILURE = "audit_failure"
    ENCRYPTION_FAILURE = "encryption_failure"
    MEMORY_LEAK = "memory_leak"
    CPU_SPIKE = "cpu_spike"
    DISK_FULL = "disk_full"
    NETWORK_ANOMALY = "network_anomaly"

class AlertStatus(Enum):
    """Alert status."""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"

@dataclass
class Alert:
    """Represents an alert."""
    id: str
    title: str
    description: str
    severity: AlertSeverity
    category: AlertCategory
    source: str
    timestamp: datetime
    status: AlertStatus = AlertStatus.ACTIVE
    correlation_id: Optional[str] = None
    metadata: Dict[str, Any] = None
    resolved_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

@dataclass
class AlertRule:
    """Defines conditions for triggering alerts."""
    id: str
    name: str
    description: str
    condition: str  # Python expression
    severity: AlertSeverity
    category: AlertCategory
    enabled: bool = True
    cooldown_minutes: int = 60
    max_alerts_per_hour: int = 10
    notification_channels: List[str] = None
    
    def __post_init__(self):
        if self.notification_channels is None:
            self.notification_channels = ["email", "webhook"]

class NotificationChannel:
    """Base class for notification channels."""
    
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        self.enabled = config.get('enabled', True)
        
    def send_notification(self, alert: Alert) -> bool:
        """Send notification for an alert."""
        raise NotImplementedError

class EmailNotificationChannel(NotificationChannel):
    """Email notification channel."""
    
    def send_notification(self, alert: Alert) -> bool:
        """Send email notification."""
        try:
            smtp_server = self.config.get('smtp_server', 'localhost')
            smtp_port = self.config.get('smtp_port', 587)
            username = self.config.get('username')
            password = self.config.get('password')
            from_email = self.config.get('from_email')
            to_emails = self.config.get('to_emails', [])
            
            if not to_emails or not from_email:
                return False
                
            # Create message
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = f"[DinoAir Alert] {alert.severity.value.upper()}: {alert.title}"
            
            # Create email body
            body = self._create_email_body(alert)
            msg.attach(MIMEText(body, 'html'))
            
            # Send email
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                if username and password:
                    server.starttls()
                    server.login(username, password)
                server.send_message(msg)
                
            return True
            
        except Exception as e:
            print(f"Failed to send email notification: {e}")
            return False
            
    def _create_email_body(self, alert: Alert) -> str:
        """Create HTML email body."""
        severity_colors = {
            AlertSeverity.LOW: "#28a745",
            AlertSeverity.MEDIUM: "#ffc107", 
            AlertSeverity.HIGH: "#fd7e14",
            AlertSeverity.CRITICAL: "#dc3545"
        }
        
        color = severity_colors.get(alert.severity, "#6c757d")
        
        return f"""
        <html>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <div style="background-color: {color}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
                    <h2 style="margin: 0;">DinoAir System Alert</h2>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Severity: {alert.severity.value.upper()}</p>
                </div>
                
                <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 5px 5px;">
                    <h3 style="color: #333; margin-top: 0;">{alert.title}</h3>
                    <p style="color: #666; line-height: 1.5;">{alert.description}</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 30%;">Alert ID:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">{alert.id}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Category:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">{alert.category.value}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Source:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">{alert.source}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Timestamp:</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">{alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
                        </tr>
                        {f'<tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Correlation ID:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">{alert.correlation_id}</td></tr>' if alert.correlation_id else ''}
                    </table>
                    
                    {self._format_metadata(alert.metadata) if alert.metadata else ''}
                    
                    <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
                        <p style="margin: 0; font-size: 12px; color: #6c757d;">
                            This is an automated alert from DinoAir monitoring system. 
                            Please investigate and take appropriate action.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
    def _format_metadata(self, metadata: Dict[str, Any]) -> str:
        """Format metadata for email display."""
        if not metadata:
            return ""
            
        rows = []
        for key, value in metadata.items():
            rows.append(f"""
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">{key}:</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">{value}</td>
                </tr>
            """)
            
        return f"""
            <h4 style="color: #333; margin-top: 20px;">Additional Information:</h4>
            <table style="width: 100%; border-collapse: collapse;">
                {''.join(rows)}
            </table>
        """

class WebhookNotificationChannel(NotificationChannel):
    """Webhook notification channel."""
    
    def send_notification(self, alert: Alert) -> bool:
        """Send webhook notification."""
        try:
            if not HAS_REQUESTS:
                print("Webhook notifications require the 'requests' library")
                return False
                
            webhook_url = self.config.get('webhook_url')
            if not webhook_url:
                return False
                
            payload = {
                'alert_id': alert.id,
                'title': alert.title,
                'description': alert.description,
                'severity': alert.severity.value,
                'category': alert.category.value,
                'source': alert.source,
                'timestamp': alert.timestamp.isoformat(),
                'status': alert.status.value,
                'correlation_id': alert.correlation_id,
                'metadata': alert.metadata
            }
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'DinoAir-Alerting/1.0'
            }
            
            # Add custom headers if configured
            custom_headers = self.config.get('headers', {})
            headers.update(custom_headers)
            
            response = requests.post(
                webhook_url,
                json=payload,
                headers=headers,
                timeout=self.config.get('timeout', 30)
            )
            
            return response.status_code < 400
            
        except Exception as e:
            print(f"Failed to send webhook notification: {e}")
            return False

class SlackNotificationChannel(NotificationChannel):
    """Slack notification channel."""
    
    def send_notification(self, alert: Alert) -> bool:
        """Send Slack notification."""
        try:
            if not HAS_REQUESTS:
                print("Slack notifications require the 'requests' library")
                return False
                
            webhook_url = self.config.get('webhook_url')
            if not webhook_url:
                return False
                
            severity_colors = {
                AlertSeverity.LOW: "good",
                AlertSeverity.MEDIUM: "warning",
                AlertSeverity.HIGH: "danger",
                AlertSeverity.CRITICAL: "danger"
            }
            
            color = severity_colors.get(alert.severity, "warning")
            
            payload = {
                "text": f"DinoAir System Alert: {alert.title}",
                "attachments": [
                    {
                        "color": color,
                        "fields": [
                            {
                                "title": "Severity",
                                "value": alert.severity.value.upper(),
                                "short": True
                            },
                            {
                                "title": "Category", 
                                "value": alert.category.value,
                                "short": True
                            },
                            {
                                "title": "Source",
                                "value": alert.source,
                                "short": True
                            },
                            {
                                "title": "Alert ID",
                                "value": alert.id,
                                "short": True
                            },
                            {
                                "title": "Description",
                                "value": alert.description,
                                "short": False
                            }
                        ],
                        "ts": int(alert.timestamp.timestamp())
                    }
                ]
            }
            
            response = requests.post(webhook_url, json=payload, timeout=30)
            return response.status_code < 400
            
        except Exception as e:
            print(f"Failed to send Slack notification: {e}")
            return False

class AlertManager:
    """Main alert management system."""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = Path(config_path) if config_path else Path.home() / ".dinoair" / "alerting.json"
        self.config = self._load_config()
        self.alerts: Dict[str, Alert] = {}
        self.rules: Dict[str, AlertRule] = {}
        self.channels: Dict[str, NotificationChannel] = {}
        self.alert_history: List[Alert] = []
        self.rule_cooldowns: Dict[str, datetime] = {}
        self.rule_counters: Dict[str, List[datetime]] = {}
        
        self._setup_channels()
        self._load_rules()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load alerting configuration."""
        default_config = {
            "enabled": True,
            "max_active_alerts": 1000,
            "history_retention_days": 30,
            "notification_channels": {
                "email": {
                    "enabled": False,
                    "smtp_server": "localhost",
                    "smtp_port": 587,
                    "username": "",
                    "password": "",
                    "from_email": "alerts@dinoair.com",
                    "to_emails": []
                },
                "webhook": {
                    "enabled": False,
                    "webhook_url": "",
                    "timeout": 30,
                    "headers": {}
                },
                "slack": {
                    "enabled": False,
                    "webhook_url": ""
                }
            },
            "default_rules": [
                {
                    "id": "high_cpu_usage",
                    "name": "High CPU Usage",
                    "description": "CPU usage exceeds 90%",
                    "condition": "system_metrics.get('cpu_percent', 0) > 90",
                    "severity": "high",
                    "category": "performance_degradation",
                    "cooldown_minutes": 30
                },
                {
                    "id": "low_disk_space",
                    "name": "Low Disk Space",
                    "description": "Disk space below 10%",
                    "condition": "system_metrics.get('disk_free_percent', 100) < 10",
                    "severity": "critical",
                    "category": "resource_exhaustion",
                    "cooldown_minutes": 60
                },
                {
                    "id": "service_down",
                    "name": "Service Unavailable",
                    "description": "Critical service is not responding",
                    "condition": "not health_status.get('ollama', {}).get('healthy', True) or not health_status.get('comfyui', {}).get('healthy', True)",
                    "severity": "critical",
                    "category": "service_unavailable",
                    "cooldown_minutes": 15
                }
            ]
        }
        
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception as e:
                print(f"Warning: Could not load alerting config: {e}")
                
        return default_config
        
    def _setup_channels(self):
        """Setup notification channels."""
        channel_configs = self.config.get('notification_channels', {})
        
        for channel_name, channel_config in channel_configs.items():
            if not channel_config.get('enabled', False):
                continue
                
            if channel_name == 'email':
                self.channels[channel_name] = EmailNotificationChannel(channel_name, channel_config)
            elif channel_name == 'webhook':
                self.channels[channel_name] = WebhookNotificationChannel(channel_name, channel_config)
            elif channel_name == 'slack':
                self.channels[channel_name] = SlackNotificationChannel(channel_name, channel_config)
                
    def _load_rules(self):
        """Load alert rules."""
        default_rules = self.config.get('default_rules', [])
        
        for rule_data in default_rules:
            rule = AlertRule(
                id=rule_data['id'],
                name=rule_data['name'],
                description=rule_data['description'],
                condition=rule_data['condition'],
                severity=AlertSeverity(rule_data['severity']),
                category=AlertCategory(rule_data['category']),
                cooldown_minutes=rule_data.get('cooldown_minutes', 60),
                max_alerts_per_hour=rule_data.get('max_alerts_per_hour', 10),
                notification_channels=rule_data.get('notification_channels', ['email', 'webhook'])
            )
            self.rules[rule.id] = rule
            
    def create_alert(self, title: str, description: str, severity: AlertSeverity,
                    category: AlertCategory, source: str, correlation_id: Optional[str] = None,
                    metadata: Optional[Dict[str, Any]] = None) -> Alert:
        """Create a new alert."""
        alert_id = f"alert_{int(time.time() * 1000)}"
        
        alert = Alert(
            id=alert_id,
            title=title,
            description=description,
            severity=severity,
            category=category,
            source=source,
            timestamp=datetime.utcnow(),
            correlation_id=correlation_id,
            metadata=metadata or {}
        )
        
        self.alerts[alert_id] = alert
        self.alert_history.append(alert)
        
        # Send notifications
        self._send_notifications(alert)
        
        # Cleanup old alerts
        self._cleanup_alerts()
        
        return alert
        
    def evaluate_rules(self, context: Dict[str, Any]):
        """Evaluate alert rules against current context."""
        if not self.config.get('enabled', True):
            return
            
        current_time = datetime.utcnow()
        
        for rule in self.rules.values():
            if not rule.enabled:
                continue
                
            # Check cooldown
            if rule.id in self.rule_cooldowns:
                cooldown_end = self.rule_cooldowns[rule.id] + timedelta(minutes=rule.cooldown_minutes)
                if current_time < cooldown_end:
                    continue
                    
            # Check rate limiting
            if rule.id in self.rule_counters:
                # Remove old entries
                hour_ago = current_time - timedelta(hours=1)
                self.rule_counters[rule.id] = [
                    ts for ts in self.rule_counters[rule.id] if ts > hour_ago
                ]
                
                if len(self.rule_counters[rule.id]) >= rule.max_alerts_per_hour:
                    continue
            else:
                self.rule_counters[rule.id] = []
                
            # Evaluate condition
            try:
                if eval(rule.condition, {"__builtins__": {}}, context):
                    # Create alert
                    alert = self.create_alert(
                        title=rule.name,
                        description=rule.description,
                        severity=rule.severity,
                        category=rule.category,
                        source="alert_rule",
                        metadata={"rule_id": rule.id, "context": context}
                    )
                    
                    # Update cooldown and counter
                    self.rule_cooldowns[rule.id] = current_time
                    self.rule_counters[rule.id].append(current_time)
                    
            except Exception as e:
                print(f"Error evaluating rule {rule.id}: {e}")
                
    def _send_notifications(self, alert: Alert):
        """Send notifications for an alert."""
        # Find applicable rule
        rule = None
        if alert.metadata and 'rule_id' in alert.metadata:
            rule = self.rules.get(alert.metadata['rule_id'])
            
        # Determine channels to use
        if rule and rule.notification_channels:
            channels_to_use = rule.notification_channels
        else:
            channels_to_use = list(self.channels.keys())
            
        # Send notifications
        for channel_name in channels_to_use:
            if channel_name in self.channels:
                try:
                    success = self.channels[channel_name].send_notification(alert)
                    if not success:
                        print(f"Failed to send notification via {channel_name}")
                except Exception as e:
                    print(f"Error sending notification via {channel_name}: {e}")
                    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an alert."""
        if alert_id in self.alerts:
            alert = self.alerts[alert_id]
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.acknowledged_at = datetime.utcnow()
            alert.acknowledged_by = acknowledged_by
            return True
        return False
        
    def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an alert."""
        if alert_id in self.alerts:
            alert = self.alerts[alert_id]
            alert.status = AlertStatus.RESOLVED
            alert.resolved_at = datetime.utcnow()
            return True
        return False
        
    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts."""
        return [alert for alert in self.alerts.values() if alert.status == AlertStatus.ACTIVE]
        
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary statistics."""
        active_alerts = self.get_active_alerts()
        
        severity_counts = {}
        category_counts = {}
        
        for alert in active_alerts:
            severity_counts[alert.severity.value] = severity_counts.get(alert.severity.value, 0) + 1
            category_counts[alert.category.value] = category_counts.get(alert.category.value, 0) + 1
            
        return {
            'total_active': len(active_alerts),
            'severity_breakdown': severity_counts,
            'category_breakdown': category_counts,
            'total_historical': len(self.alert_history)
        }
        
    def _cleanup_alerts(self):
        """Cleanup old alerts and history."""
        max_active = self.config.get('max_active_alerts', 1000)
        retention_days = self.config.get('history_retention_days', 30)
        
        # Remove old resolved alerts from active list
        current_time = datetime.utcnow()
        cutoff_time = current_time - timedelta(days=1)  # Keep resolved alerts for 1 day
        
        alerts_to_remove = []
        for alert_id, alert in self.alerts.items():
            if (alert.status == AlertStatus.RESOLVED and 
                alert.resolved_at and 
                alert.resolved_at < cutoff_time):
                alerts_to_remove.append(alert_id)
                
        for alert_id in alerts_to_remove:
            del self.alerts[alert_id]
            
        # Limit active alerts
        if len(self.alerts) > max_active:
            # Remove oldest resolved alerts first
            sorted_alerts = sorted(
                self.alerts.items(),
                key=lambda x: (x[1].status != AlertStatus.RESOLVED, x[1].timestamp)
            )
            
            for alert_id, _ in sorted_alerts[max_active:]:
                del self.alerts[alert_id]
                
        # Cleanup history
        history_cutoff = current_time - timedelta(days=retention_days)
        self.alert_history = [
            alert for alert in self.alert_history 
            if alert.timestamp > history_cutoff
        ]

# Global alert manager instance
_alert_manager = None

def get_alert_manager(config_path: Optional[str] = None) -> AlertManager:
    """Get the global alert manager instance."""
    global _alert_manager
    if _alert_manager is None:
        _alert_manager = AlertManager(config_path)
    return _alert_manager

def create_alert(title: str, description: str, severity: str, category: str, 
                source: str, correlation_id: Optional[str] = None,
                metadata: Optional[Dict[str, Any]] = None) -> Alert:
    """Convenience function to create an alert."""
    manager = get_alert_manager()
    return manager.create_alert(
        title=title,
        description=description,
        severity=AlertSeverity(severity),
        category=AlertCategory(category),
        source=source,
        correlation_id=correlation_id,
        metadata=metadata
    )

# Example usage
if __name__ == "__main__":
    # Test the alerting system
    manager = get_alert_manager()
    
    # Create test alert
    alert = create_alert(
        title="Test Critical Alert",
        description="This is a test of the alerting system",
        severity="critical",
        category="system_failure",
        source="test_script",
        metadata={"test": True}
    )
    
    print(f"Created alert: {alert.id}")
    print(f"Alert summary: {manager.get_alert_summary()}")
    
    # Test rule evaluation
    test_context = {
        "system_metrics": {"cpu_percent": 95, "disk_free_percent": 5},
        "health_status": {"ollama": {"healthy": False}, "comfyui": {"healthy": True}}
    }
    
    manager.evaluate_rules(test_context)
    print(f"After rule evaluation: {manager.get_alert_summary()}")