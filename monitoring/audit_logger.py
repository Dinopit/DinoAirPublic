#!/usr/bin/env python3
"""
Audit Logging System for DinoAir
Implements comprehensive audit logging for sensitive operations with compliance support.
"""

import json
import uuid
import time
import os
import threading
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import logging
import logging.handlers
from cryptography.fernet import Fernet
import hashlib

# Import correlation ID support
try:
    from ..correlation_id import get_correlation_id
except ImportError:
    def get_correlation_id():
        return None


class AuditEventType(Enum):
    """Types of audit events."""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    CONFIGURATION_CHANGE = "configuration_change"
    SYSTEM_ACCESS = "system_access"
    FILE_ACCESS = "file_access"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    SECURITY_POLICY_CHANGE = "security_policy_change"
    BACKUP_RESTORE = "backup_restore"
    KEY_MANAGEMENT = "key_management"
    COMPLIANCE_VIOLATION = "compliance_violation"


class AuditSeverity(Enum):
    """Severity levels for audit events."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AuditOutcome(Enum):
    """Outcome of audited operations."""
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"
    UNKNOWN = "unknown"


@dataclass
class AuditEvent:
    """Represents an audit event."""
    event_id: str
    timestamp: str
    event_type: AuditEventType
    severity: AuditSeverity
    outcome: AuditOutcome
    actor: str  # User, process, or system component
    resource: str  # What was accessed/modified
    action: str  # What was done
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    correlation_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    compliance_tags: Optional[List[str]] = None
    risk_score: Optional[int] = None
    
    def __post_init__(self):
        if self.details is None:
            self.details = {}
        if self.compliance_tags is None:
            self.compliance_tags = []


class AuditLogger:
    """Secure audit logger with encryption and tamper protection."""
    
    def __init__(
        self,
        log_directory: str = "/var/log/dinoair/audit",
        encryption_key: Optional[bytes] = None,
        max_file_size: int = 100 * 1024 * 1024,  # 100MB
        backup_count: int = 10,
        enable_encryption: bool = True,
        enable_integrity_check: bool = True
    ):
        self.log_directory = Path(log_directory)
        self.max_file_size = max_file_size
        self.backup_count = backup_count
        self.enable_encryption = enable_encryption
        self.enable_integrity_check = enable_integrity_check
        
        # Create log directory if it doesn't exist
        self.log_directory.mkdir(parents=True, exist_ok=True)
        
        # Set up encryption
        self._setup_encryption(encryption_key)
        
        # Set up loggers
        self._setup_loggers()
        
        # Thread lock for thread safety
        self._lock = threading.Lock()
    
    def _setup_encryption(self, encryption_key: Optional[bytes]):
        """Set up encryption for audit logs."""
        if not self.enable_encryption:
            self._cipher = None
            return
        
        try:
            if encryption_key:
                self._cipher = Fernet(encryption_key)
            else:
                # Generate a key and store it securely
                key_file = self.log_directory / ".audit_key"
                if key_file.exists():
                    with open(key_file, 'rb') as f:
                        key = f.read()
                else:
                    key = Fernet.generate_key()
                    with open(key_file, 'wb') as f:
                        f.write(key)
                    # Set restrictive permissions
                    os.chmod(key_file, 0o600)
                
                self._cipher = Fernet(key)
        except Exception as e:
            print(f"Warning: Failed to set up encryption for audit logs: {e}")
            self._cipher = None
    
    def _setup_loggers(self):
        """Set up rotating file loggers for different event types."""
        self._loggers = {}
        
        # Main audit logger
        main_logger = logging.getLogger('dinoair.audit')
        main_logger.setLevel(logging.INFO)
        
        # Remove existing handlers
        for handler in main_logger.handlers[:]:
            main_logger.removeHandler(handler)
        
        # Add rotating file handler
        log_file = self.log_directory / "audit.log"
        handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=self.max_file_size,
            backupCount=self.backup_count
        )
        
        # Set custom formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%dT%H:%M:%S.%fZ'
        )
        handler.setFormatter(formatter)
        main_logger.addHandler(handler)
        
        self._loggers['main'] = main_logger
        
        # Set restrictive permissions on log files
        try:
            os.chmod(log_file, 0o640)
        except OSError:
            pass  # May fail if file doesn't exist yet
    
    def _calculate_integrity_hash(self, data: str) -> str:
        """Calculate integrity hash for tamper detection."""
        return hashlib.sha256(data.encode()).hexdigest()
    
    def _encrypt_data(self, data: str) -> str:
        """Encrypt audit data if encryption is enabled."""
        if not self._cipher:
            return data
        
        try:
            encrypted = self._cipher.encrypt(data.encode())
            return base64.b64encode(encrypted).decode('utf-8')  # Use Base64 for safe text storage
        except Exception as e:
            print(f"Warning: Failed to encrypt audit data: {e}")
            return data
    
    def log_event(
        self,
        event_type: Union[AuditEventType, str],
        action: str,
        resource: str,
        outcome: Union[AuditOutcome, str] = AuditOutcome.SUCCESS,
        severity: Union[AuditSeverity, str] = AuditSeverity.MEDIUM,
        actor: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        compliance_tags: Optional[List[str]] = None,
        source_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None
    ):
        """Log an audit event."""
        with self._lock:
            try:
                # Convert string enums if needed
                if isinstance(event_type, str):
                    event_type = AuditEventType(event_type)
                if isinstance(outcome, str):
                    outcome = AuditOutcome(outcome)
                if isinstance(severity, str):
                    severity = AuditSeverity(severity)
                
                # Get current correlation ID
                correlation_id = get_correlation_id()
                
                # Create audit event
                event = AuditEvent(
                    event_id=str(uuid.uuid4()),
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    event_type=event_type,
                    severity=severity,
                    outcome=outcome,
                    actor=actor or "system",
                    resource=resource,
                    action=action,
                    source_ip=source_ip,
                    user_agent=user_agent,
                    session_id=session_id,
                    correlation_id=correlation_id,
                    details=details or {},
                    compliance_tags=compliance_tags or []
                )
                
                # Calculate risk score
                event.risk_score = self._calculate_risk_score(event)
                
                # Serialize event
                event_data = self._serialize_event(event)
                
                # Add integrity hash if enabled
                if self.enable_integrity_check:
                    integrity_hash = self._calculate_integrity_hash(event_data)
                    event_dict = json.loads(event_data)
                    event_dict['integrity_hash'] = integrity_hash
                    event_data = json.dumps(event_dict, separators=(',', ':'))
                
                # Encrypt if enabled
                if self.enable_encryption:
                    event_data = self._encrypt_data(event_data)
                
                # Log the event
                self._loggers['main'].info(event_data)
                
                # Trigger alerts for high-risk events
                if event.risk_score and event.risk_score >= 80:
                    self._trigger_security_alert(event)
                
            except Exception as e:
                # Fallback logging - ensure audit events are never lost
                fallback_msg = f"AUDIT_ERROR: Failed to log event: {e} - Action: {action}, Resource: {resource}"
                self._loggers['main'].error(fallback_msg)
    
    def _serialize_event(self, event: AuditEvent) -> str:
        """Serialize audit event to JSON."""
        # Convert enum values to strings
        event_dict = asdict(event)
        event_dict['event_type'] = event.event_type.value
        event_dict['severity'] = event.severity.value
        event_dict['outcome'] = event.outcome.value
        
        return json.dumps(event_dict, separators=(',', ':'))
    
    def _calculate_risk_score(self, event: AuditEvent) -> int:
        """Calculate risk score for the event (0-100)."""
        score = 0
        
        # Base score by event type
        type_scores = {
            AuditEventType.AUTHENTICATION: 30,
            AuditEventType.AUTHORIZATION: 40,
            AuditEventType.PRIVILEGE_ESCALATION: 80,
            AuditEventType.SECURITY_POLICY_CHANGE: 70,
            AuditEventType.KEY_MANAGEMENT: 60,
            AuditEventType.COMPLIANCE_VIOLATION: 90,
            AuditEventType.DATA_MODIFICATION: 50,
            AuditEventType.CONFIGURATION_CHANGE: 40,
        }
        score += type_scores.get(event.event_type, 20)
        
        # Severity multiplier
        severity_multipliers = {
            AuditSeverity.LOW: 0.5,
            AuditSeverity.MEDIUM: 1.0,
            AuditSeverity.HIGH: 1.5,
            AuditSeverity.CRITICAL: 2.0,
        }
        score *= severity_multipliers.get(event.severity, 1.0)
        
        # Outcome adjustment
        if event.outcome == AuditOutcome.FAILURE:
            score *= 1.3
        elif event.outcome == AuditOutcome.PARTIAL:
            score *= 1.1
        
        return min(int(score), 100)
    
    def _trigger_security_alert(self, event: AuditEvent):
        """Trigger security alert for high-risk events."""
        try:
            # Import and use the existing alerting system
            from ...alerting_system import AlertingSystem, Alert, AlertSeverity as AlertSev, AlertCategory
            
            alerting = AlertingSystem()
            
            # Map audit severity to alert severity
            severity_map = {
                AuditSeverity.LOW: AlertSev.LOW,
                AuditSeverity.MEDIUM: AlertSev.MEDIUM,
                AuditSeverity.HIGH: AlertSev.HIGH,
                AuditSeverity.CRITICAL: AlertSev.CRITICAL,
            }
            
            alert = Alert(
                id=f"audit_{event.event_id}",
                title=f"High-Risk Audit Event: {event.action}",
                description=f"High-risk {event.event_type.value} event detected",
                severity=severity_map.get(event.severity, AlertSev.MEDIUM),
                category=AlertCategory.SECURITY_BREACH,
                source="audit_logger",
                timestamp=datetime.now(timezone.utc),
                correlation_id=event.correlation_id,
                metadata={
                    "audit_event_id": event.event_id,
                    "actor": event.actor,
                    "resource": event.resource,
                    "risk_score": event.risk_score
                }
            )
            
            alerting.send_alert(alert)
            
        except Exception as e:
            # Don't let alerting failures break audit logging
            self._loggers['main'].warning(f"Failed to trigger security alert: {e}")
    
    def search_events(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        event_type: Optional[AuditEventType] = None,
        actor: Optional[str] = None,
        resource: Optional[str] = None,
        correlation_id: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Search audit events (for compliance and investigation)."""
        # This is a basic implementation - in production, you'd want
        # to use a proper search backend like Elasticsearch
        events = []
        
        try:
            log_files = list(self.log_directory.glob("audit.log*"))
            log_files.sort(reverse=True)  # Most recent first
            
            for log_file in log_files:
                with open(log_file, 'r') as f:
                    for line in f:
                        try:
                            if self.enable_encryption and self._cipher:
                                # Decrypt line
                                line = self._cipher.decrypt(line.encode('latin-1')).decode()
                            
                            event_data = json.loads(line.strip())
                            
                            # Apply filters
                            if start_time and event_data.get('timestamp'):
                                event_time = datetime.fromisoformat(event_data['timestamp'].replace('Z', '+00:00'))
                                if event_time < start_time:
                                    continue
                            
                            if end_time and event_data.get('timestamp'):
                                event_time = datetime.fromisoformat(event_data['timestamp'].replace('Z', '+00:00'))
                                if event_time > end_time:
                                    continue
                            
                            if event_type and event_data.get('event_type') != event_type.value:
                                continue
                            
                            if actor and event_data.get('actor') != actor:
                                continue
                            
                            if resource and resource not in event_data.get('resource', ''):
                                continue
                            
                            if correlation_id and event_data.get('correlation_id') != correlation_id:
                                continue
                            
                            events.append(event_data)
                            
                            if len(events) >= limit:
                                return events
                                
                        except (json.JSONDecodeError, Exception):
                            continue  # Skip malformed entries
                            
        except Exception as e:
            print(f"Error searching audit events: {e}")
        
        return events


# Global audit logger instance
_audit_logger: Optional[AuditLogger] = None


def get_audit_logger(config: Optional[Dict[str, Any]] = None) -> AuditLogger:
    """Get the global audit logger instance."""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger(**(config or {}))
    return _audit_logger


def audit_log(
    event_type: Union[AuditEventType, str],
    action: str,
    resource: str,
    **kwargs
):
    """Convenience function to log an audit event."""
    get_audit_logger().log_event(event_type, action, resource, **kwargs)


# Decorator for auditing function calls
def audit_operation(
    event_type: Union[AuditEventType, str],
    resource: Optional[str] = None,
    include_args: bool = False,
    include_result: bool = False
):
    """Decorator to automatically audit function calls."""
    def decorator(func):
        def wrapper(*args, **kwargs):
            func_name = func.__name__
            resource_name = resource or func_name
            
            # Prepare details
            details = {}
            if include_args:
                details['args'] = str(args)
                details['kwargs'] = {k: str(v) for k, v in kwargs.items()}
            
            try:
                result = func(*args, **kwargs)
                
                if include_result:
                    details['result'] = str(result)[:500]  # Limit size
                
                audit_log(
                    event_type=event_type,
                    action=f"executed_{func_name}",
                    resource=resource_name,
                    outcome=AuditOutcome.SUCCESS,
                    details=details
                )
                
                return result
                
            except Exception as e:
                details['error'] = str(e)
                
                audit_log(
                    event_type=event_type,
                    action=f"executed_{func_name}",
                    resource=resource_name,
                    outcome=AuditOutcome.FAILURE,
                    severity=AuditSeverity.HIGH,
                    details=details
                )
                
                raise
        
        return wrapper
    return decorator