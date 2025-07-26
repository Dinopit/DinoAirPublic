"""
Sentry Configuration for DinoAir
Simple error tracking and monitoring setup
"""

import os
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration


def init_sentry():
    """Initialize Sentry error tracking"""
    # Get Sentry DSN from environment variable
    dsn = os.getenv('SENTRY_DSN')
    
    if not dsn:
        print("INFO: Sentry DSN not configured, error tracking disabled")
        return
    
    # Configure Sentry with basic settings
    sentry_sdk.init(
        dsn=dsn,
        # Set a sample rate for performance monitoring (optional)
        traces_sample_rate=0.1,
        # Set release version if available
        release=os.getenv('DINOAIR_VERSION', 'unknown'),
        # Set environment
        environment=os.getenv('DINOAIR_ENVIRONMENT', 'development'),
        # Add logging integration
        integrations=[
            LoggingIntegration(
                level=None,        # Capture records from all loggers
                event_level=None   # Send error logs as events
            ),
        ],
        # Additional options
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send personally identifiable information
    )
    
    print("INFO: Sentry error tracking initialized")


def capture_exception(error, extra_data=None):
    """Capture an exception with optional extra data"""
    with sentry_sdk.push_scope() as scope:
        if extra_data:
            for key, value in extra_data.items():
                scope.set_extra(key, value)
        sentry_sdk.capture_exception(error)


def capture_message(message, level='info', extra_data=None):
    """Capture a message with optional extra data"""
    with sentry_sdk.push_scope() as scope:
        if extra_data:
            for key, value in extra_data.items():
                scope.set_extra(key, value)
        sentry_sdk.capture_message(message, level)