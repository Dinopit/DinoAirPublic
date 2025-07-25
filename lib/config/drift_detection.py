"""
DinoAir Configuration Drift Detection Module
Monitors configuration changes and detects drift from expected states
"""

import os
import json
import time
import logging
import hashlib
import threading
from typing import Dict, Any, List, Optional, Callable, Set
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests

from .config_validator import DinoAirConfig
from .hot_reload import ConfigChange

logger = logging.getLogger(__name__)

@dataclass
class DriftRule:
    """Configuration drift detection rule"""
    name: str
    description: str
    config_path: str  # Dot notation path (e.g., "server.port")
    expected_value: Any
    tolerance: Optional[Dict[str, Any]] = None  # For numeric values
    severity: str = "warning"  # warning, error, critical
    enabled: bool = True

@dataclass
class DriftViolation:
    """Configuration drift violation"""
    rule: DriftRule
    timestamp: datetime
    current_value: Any
    expected_value: Any
    severity: str
    message: str

@dataclass
class DriftAlert:
    """Drift detection alert"""
    violations: List[DriftViolation]
    timestamp: datetime
    environment: str
    total_violations: int
    critical_count: int
    error_count: int
    warning_count: int

class DriftDetector:
    """Detects configuration drift based on rules"""
    
    def __init__(self, rules: List[DriftRule]):
        self.rules = {rule.name: rule for rule in rules if rule.enabled}
        self.violation_history: List[DriftViolation] = []
        self.last_check: Optional[datetime] = None
    
    def check_drift(self, config: DinoAirConfig, environment: str = "unknown") -> List[DriftViolation]:
        """Check for configuration drift"""
        violations = []
        config_dict = self._config_to_dict(config)
        
        for rule_name, rule in self.rules.items():
            try:
                violation = self._check_rule(rule, config_dict)
                if violation:
                    violations.append(violation)
                    self.violation_history.append(violation)
            except Exception as e:
                logger.error(f"Error checking drift rule {rule_name}: {e}")
        
        self.last_check = datetime.now()
        
        # Clean old violations (keep last 1000)
        if len(self.violation_history) > 1000:
            self.violation_history = self.violation_history[-1000:]
        
        return violations
    
    def _check_rule(self, rule: DriftRule, config_dict: Dict[str, Any]) -> Optional[DriftViolation]:
        """Check a single drift rule"""
        current_value = self._get_nested_value(config_dict, rule.config_path)
        
        if current_value is None:
            return DriftViolation(
                rule=rule,
                timestamp=datetime.now(),
                current_value=None,
                expected_value=rule.expected_value,
                severity=rule.severity,
                message=f"Configuration path '{rule.config_path}' not found"
            )
        
        # Check for drift
        if self._values_differ(current_value, rule.expected_value, rule.tolerance):
            return DriftViolation(
                rule=rule,
                timestamp=datetime.now(),
                current_value=current_value,
                expected_value=rule.expected_value,
                severity=rule.severity,
                message=f"Configuration drift detected: {rule.config_path} = {current_value}, expected {rule.expected_value}"
            )
        
        return None
    
    def _values_differ(self, current: Any, expected: Any, tolerance: Optional[Dict[str, Any]]) -> bool:
        """Check if values differ considering tolerance"""
        if tolerance is None:
            return current != expected
        
        # Handle numeric tolerance
        if isinstance(current, (int, float)) and isinstance(expected, (int, float)):
            if 'percentage' in tolerance:
                threshold = abs(expected * tolerance['percentage'] / 100)
                return abs(current - expected) > threshold
            elif 'absolute' in tolerance:
                return abs(current - expected) > tolerance['absolute']
        
        # Handle string tolerance (case sensitivity)
        if isinstance(current, str) and isinstance(expected, str):
            if tolerance.get('case_insensitive', False):
                return current.lower() != expected.lower()
        
        return current != expected
    
    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """Get nested value using dot notation"""
        keys = path.split('.')
        current = data
        
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        
        return current
    
    def _config_to_dict(self, config: DinoAirConfig) -> Dict[str, Any]:
        """Convert config object to dictionary"""
        def convert_value(value):
            if hasattr(value, '__dict__'):
                return {k: convert_value(v) for k, v in value.__dict__.items()}
            elif isinstance(value, list):
                return [convert_value(item) for item in value]
            else:
                return value
        
        return convert_value(config)
    
    def get_violation_summary(self, hours: int = 24) -> Dict[str, int]:
        """Get violation summary for the last N hours"""
        cutoff = datetime.now() - timedelta(hours=hours)
        recent_violations = [v for v in self.violation_history if v.timestamp >= cutoff]
        
        summary = {"critical": 0, "error": 0, "warning": 0, "total": len(recent_violations)}
        
        for violation in recent_violations:
            summary[violation.severity] += 1
        
        return summary

class AlertNotifier:
    """Sends alerts for configuration drift"""
    
    def __init__(self, config: Dict[str, Any]):
        self.email_config = config.get('email', {})
        self.webhook_config = config.get('webhook', {})
        self.slack_config = config.get('slack', {})
        self.enabled = config.get('enabled', True)
        
    def send_alert(self, alert: DriftAlert):
        """Send drift alert via configured channels"""
        if not self.enabled:
            return
        
        try:
            if self.email_config.get('enabled', False):
                self._send_email_alert(alert)
            
            if self.webhook_config.get('enabled', False):
                self._send_webhook_alert(alert)
            
            if self.slack_config.get('enabled', False):
                self._send_slack_alert(alert)
                
        except Exception as e:
            logger.error(f"Failed to send drift alert: {e}")
    
    def _send_email_alert(self, alert: DriftAlert):
        """Send email alert"""
        if not self.email_config.get('smtp_server') or not self.email_config.get('recipients'):
            logger.warning("Email configuration incomplete, skipping email alert")
            return
        
        subject = f"DinoAir Configuration Drift Alert - {alert.environment}"
        body = self._format_email_body(alert)
        
        msg = MIMEMultipart()
        msg['From'] = self.email_config.get('from_address', 'noreply@dinoair.app')
        msg['To'] = ', '.join(self.email_config['recipients'])
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        try:
            server = smtplib.SMTP(
                self.email_config['smtp_server'],
                self.email_config.get('smtp_port', 587)
            )
            
            if self.email_config.get('use_tls', True):
                server.starttls()
            
            if self.email_config.get('username') and self.email_config.get('password'):
                server.login(self.email_config['username'], self.email_config['password'])
            
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Drift alert email sent to {len(self.email_config['recipients'])} recipients")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
    
    def _send_webhook_alert(self, alert: DriftAlert):
        """Send webhook alert"""
        webhook_url = self.webhook_config.get('url')
        if not webhook_url:
            logger.warning("Webhook URL not configured, skipping webhook alert")
            return
        
        payload = {
            'timestamp': alert.timestamp.isoformat(),
            'environment': alert.environment,
            'total_violations': alert.total_violations,
            'critical_count': alert.critical_count,
            'error_count': alert.error_count,
            'warning_count': alert.warning_count,
            'violations': [
                {
                    'rule_name': v.rule.name,
                    'severity': v.severity,
                    'message': v.message,
                    'config_path': v.rule.config_path,
                    'current_value': v.current_value,
                    'expected_value': v.expected_value
                }
                for v in alert.violations
            ]
        }
        
        headers = {'Content-Type': 'application/json'}
        if self.webhook_config.get('auth_header'):
            headers['Authorization'] = self.webhook_config['auth_header']
        
        try:
            response = requests.post(
                webhook_url,
                json=payload,
                headers=headers,
                timeout=self.webhook_config.get('timeout', 30)
            )
            response.raise_for_status()
            
            logger.info(f"Drift alert webhook sent successfully (status: {response.status_code})")
            
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")
    
    def _send_slack_alert(self, alert: DriftAlert):
        """Send Slack alert"""
        webhook_url = self.slack_config.get('webhook_url')
        if not webhook_url:
            logger.warning("Slack webhook URL not configured, skipping Slack alert")
            return
        
        color = "danger" if alert.critical_count > 0 else "warning" if alert.error_count > 0 else "good"
        
        payload = {
            "username": "DinoAir Config Monitor",
            "icon_emoji": ":warning:",
            "attachments": [
                {
                    "color": color,
                    "title": f"Configuration Drift Alert - {alert.environment}",
                    "fields": [
                        {
                            "title": "Total Violations",
                            "value": str(alert.total_violations),
                            "short": True
                        },
                        {
                            "title": "Critical",
                            "value": str(alert.critical_count),
                            "short": True
                        },
                        {
                            "title": "Errors",
                            "value": str(alert.error_count),
                            "short": True
                        },
                        {
                            "title": "Warnings",
                            "value": str(alert.warning_count),
                            "short": True
                        }
                    ],
                    "text": self._format_slack_violations(alert.violations[:5]),  # Limit to 5 violations
                    "footer": "DinoAir Configuration Monitor",
                    "ts": int(alert.timestamp.timestamp())
                }
            ]
        }
        
        try:
            response = requests.post(webhook_url, json=payload, timeout=30)
            response.raise_for_status()
            
            logger.info("Drift alert sent to Slack successfully")
            
        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
    
    def _format_email_body(self, alert: DriftAlert) -> str:
        """Format email body for drift alert"""
        html = f"""
        <html>
        <body>
            <h2>DinoAir Configuration Drift Alert</h2>
            <p><strong>Environment:</strong> {alert.environment}</p>
            <p><strong>Timestamp:</strong> {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
            
            <h3>Summary</h3>
            <ul>
                <li>Total Violations: {alert.total_violations}</li>
                <li>Critical: {alert.critical_count}</li>
                <li>Errors: {alert.error_count}</li>
                <li>Warnings: {alert.warning_count}</li>
            </ul>
            
            <h3>Violations</h3>
            <table border="1" style="border-collapse: collapse; width: 100%;">
                <tr>
                    <th>Rule</th>
                    <th>Severity</th>
                    <th>Config Path</th>
                    <th>Current Value</th>
                    <th>Expected Value</th>
                </tr>
        """
        
        for violation in alert.violations:
            html += f"""
                <tr>
                    <td>{violation.rule.name}</td>
                    <td style="color: {'red' if violation.severity == 'critical' else 'orange' if violation.severity == 'error' else 'blue'}">{violation.severity.upper()}</td>
                    <td>{violation.rule.config_path}</td>
                    <td>{violation.current_value}</td>
                    <td>{violation.expected_value}</td>
                </tr>
            """
        
        html += """
            </table>
        </body>
        </html>
        """
        
        return html
    
    def _format_slack_violations(self, violations: List[DriftViolation]) -> str:
        """Format violations for Slack message"""
        if not violations:
            return "No violations to display"
        
        text = "Configuration drift violations:\n"
        for violation in violations:
            emoji = "🔴" if violation.severity == "critical" else "🟠" if violation.severity == "error" else "🟡"
            text += f"{emoji} *{violation.rule.name}*: {violation.rule.config_path} = `{violation.current_value}` (expected `{violation.expected_value}`)\n"
        
        return text

class ConfigDriftMonitor:
    """Main configuration drift monitoring service"""
    
    def __init__(self, 
                 rules: List[DriftRule],
                 alert_config: Dict[str, Any],
                 check_interval: int = 300):  # 5 minutes default
        self.detector = DriftDetector(rules)
        self.notifier = AlertNotifier(alert_config)
        self.check_interval = check_interval
        
        self._monitoring_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._is_running = False
        
        self.last_alert_time: Optional[datetime] = None
        self.alert_cooldown = timedelta(minutes=alert_config.get('cooldown_minutes', 30))
    
    def start_monitoring(self, config_manager):
        """Start drift monitoring"""
        if self._is_running:
            return
        
        logger.info("Starting configuration drift monitoring")
        self._is_running = True
        self._stop_event.clear()
        
        self._monitoring_thread = threading.Thread(
            target=self._monitoring_loop,
            args=(config_manager,),
            daemon=True
        )
        self._monitoring_thread.start()
    
    def stop_monitoring(self):
        """Stop drift monitoring"""
        if not self._is_running:
            return
        
        logger.info("Stopping configuration drift monitoring")
        self._is_running = False
        self._stop_event.set()
        
        if self._monitoring_thread:
            self._monitoring_thread.join()
    
    def _monitoring_loop(self, config_manager):
        """Main monitoring loop"""
        while not self._stop_event.wait(self.check_interval):
            try:
                config = config_manager.get_config()
                if config:
                    violations = self.detector.check_drift(config, config.environment)
                    
                    if violations:
                        self._handle_violations(violations, config.environment)
                        
            except Exception as e:
                logger.error(f"Error in drift monitoring loop: {e}")
    
    def _handle_violations(self, violations: List[DriftViolation], environment: str):
        """Handle detected violations"""
        # Count violations by severity
        critical_count = sum(1 for v in violations if v.severity == "critical")
        error_count = sum(1 for v in violations if v.severity == "error")
        warning_count = sum(1 for v in violations if v.severity == "warning")
        
        logger.warning(f"Configuration drift detected: {len(violations)} violations "
                      f"(Critical: {critical_count}, Error: {error_count}, Warning: {warning_count})")
        
        # Check if we should send an alert (respecting cooldown)
        now = datetime.now()
        if (self.last_alert_time is None or 
            now - self.last_alert_time >= self.alert_cooldown or
            critical_count > 0):  # Always alert on critical violations
            
            alert = DriftAlert(
                violations=violations,
                timestamp=now,
                environment=environment,
                total_violations=len(violations),
                critical_count=critical_count,
                error_count=error_count,
                warning_count=warning_count
            )
            
            self.notifier.send_alert(alert)
            self.last_alert_time = now
    
    def add_rule(self, rule: DriftRule):
        """Add a new drift detection rule"""
        self.detector.rules[rule.name] = rule
    
    def remove_rule(self, rule_name: str):
        """Remove a drift detection rule"""
        self.detector.rules.pop(rule_name, None)
    
    def get_violation_summary(self, hours: int = 24) -> Dict[str, int]:
        """Get violation summary"""
        return self.detector.get_violation_summary(hours)

# Default drift rules for DinoAir
DEFAULT_DRIFT_RULES = [
    DriftRule(
        name="production_debug_disabled",
        description="Ensure debug mode is disabled in production",
        config_path="debug",
        expected_value=False,
        severity="critical"
    ),
    DriftRule(
        name="production_log_level",
        description="Ensure appropriate log level in production",
        config_path="logging.level",
        expected_value="INFO",
        severity="error"
    ),
    DriftRule(
        name="security_secret_key_set",
        description="Ensure security secret key is configured",
        config_path="security.secret_key",
        expected_value="",  # We just check it's not empty
        severity="critical"
    ),
    DriftRule(
        name="server_workers_count",
        description="Ensure adequate worker processes",
        config_path="server.workers",
        expected_value=4,
        tolerance={"absolute": 2},
        severity="warning"
    ),
    DriftRule(
        name="resource_memory_limit",
        description="Ensure memory limits are set appropriately",
        config_path="resources.max_memory_mb",
        expected_value=8192,
        tolerance={"percentage": 25},
        severity="warning"
    )
]