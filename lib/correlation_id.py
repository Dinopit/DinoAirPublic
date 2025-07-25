"""
Correlation ID utilities for DinoAir Python services
Provides correlation ID generation, storage, and propagation
"""

import os
import time
import secrets
import threading
import re
from typing import Optional, Dict, Any
from contextvars import ContextVar

# Header name for correlation IDs (must match TypeScript version)
CORRELATION_ID_HEADER = 'x-correlation-id'

# Context variable for storing correlation ID
correlation_id_context: ContextVar[Optional[str]] = ContextVar(
    'correlation_id', 
    default=None
)

def generate_correlation_id() -> str:
    """
    Generates a new correlation ID
    Format: {timestamp}-{random-hex}
    """
    timestamp = hex(int(time.time() * 1000))[2:]  # Convert to hex
    random_part = secrets.token_hex(8)
    return f"{timestamp}-{random_part}"

def is_valid_correlation_id(correlation_id: str) -> bool:
    """
    Validates a correlation ID format
    """
    # Basic format validation: hex-hex
    pattern = r'^[a-f0-9]+-[a-f0-9]{16}$'
    return bool(re.match(pattern, correlation_id, re.IGNORECASE))

def extract_correlation_id(
    headers: Optional[Dict[str, str]] = None,
    environ: Optional[Dict[str, Any]] = None
) -> str:
    """
    Extracts correlation ID from various sources in priority order:
    1. Headers
    2. WSGI environ (for Flask/FastAPI)
    3. Generate new one
    """
    # Try headers first
    if headers:
        correlation_id = headers.get(CORRELATION_ID_HEADER)
        if correlation_id and is_valid_correlation_id(correlation_id):
            return correlation_id
    
    # Try WSGI environ (HTTP headers are prefixed with HTTP_)
    if environ:
        header_key = f"HTTP_{CORRELATION_ID_HEADER.upper().replace('-', '_')}"
        correlation_id = environ.get(header_key)
        if correlation_id and is_valid_correlation_id(correlation_id):
            return correlation_id
    
    # Generate new one
    return generate_correlation_id()

def get_current_correlation_id() -> str:
    """
    Get the current correlation ID from context or generate a new one
    """
    correlation_id = correlation_id_context.get()
    if correlation_id:
        return correlation_id
    
    # Generate new one if none in context
    new_id = generate_correlation_id()
    set_current_correlation_id(new_id)
    return new_id

def set_current_correlation_id(correlation_id: str) -> None:
    """
    Set the current correlation ID in context
    """
    correlation_id_context.set(correlation_id)

def clear_current_correlation_id() -> None:
    """
    Clear the current correlation ID from context
    """
    correlation_id_context.set(None)

class CorrelationIdContextManager:
    """
    Context manager for running code with a specific correlation ID
    """
    
    def __init__(self, correlation_id: str):
        self.correlation_id = correlation_id
        self.token = None
    
    def __enter__(self):
        self.token = correlation_id_context.set(self.correlation_id)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.token:
            correlation_id_context.reset(self.token)

def with_correlation_id(correlation_id: str):
    """
    Decorator to run a function with a specific correlation ID
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            with CorrelationIdContextManager(correlation_id):
                return func(*args, **kwargs)
        return wrapper
    return decorator

def create_correlation_headers(correlation_id: Optional[str] = None) -> Dict[str, str]:
    """
    Create headers dict with correlation ID
    """
    if correlation_id is None:
        correlation_id = get_current_correlation_id()
    
    return {CORRELATION_ID_HEADER: correlation_id}

# Flask middleware support
def flask_correlation_middleware(app):
    """
    Flask middleware to extract and set correlation ID
    """
    @app.before_request
    def before_request():
        from flask import request
        correlation_id = extract_correlation_id(dict(request.headers))
        set_current_correlation_id(correlation_id)
    
    @app.after_request
    def after_request(response):
        correlation_id = get_current_correlation_id()
        response.headers[CORRELATION_ID_HEADER] = correlation_id
        return response

# FastAPI middleware support
class FastAPICorrelationMiddleware:
    """
    FastAPI middleware to extract and set correlation ID
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Extract correlation ID from headers
            headers = dict(scope.get("headers", []))
            # Convert bytes headers to string headers
            str_headers = {
                k.decode(): v.decode() 
                for k, v in headers.items()
            }
            
            correlation_id = extract_correlation_id(str_headers)
            
            # Set in context
            with CorrelationIdContextManager(correlation_id):
                # Intercept send to add correlation ID to response headers
                async def send_with_correlation(message):
                    if message["type"] == "http.response.start":
                        headers = list(message.get("headers", []))
                        headers.append([
                            CORRELATION_ID_HEADER.encode(),
                            correlation_id.encode()
                        ])
                        message["headers"] = headers
                    await send(message)
                
                await self.app(scope, receive, send_with_correlation)
        else:
            await self.app(scope, receive, send)

# WSGI middleware support
class WSGICorrelationMiddleware:
    """
    Generic WSGI middleware to extract and set correlation ID
    """
    
    def __init__(self, app):
        self.app = app
    
    def __call__(self, environ, start_response):
        correlation_id = extract_correlation_id(environ=environ)
        
        def start_response_with_correlation(status, headers, exc_info=None):
            # Add correlation ID to response headers
            headers.append((CORRELATION_ID_HEADER, correlation_id))
            return start_response(status, headers, exc_info)
        
        with CorrelationIdContextManager(correlation_id):
            return self.app(environ, start_response_with_correlation)

if __name__ == "__main__":
    # Example usage
    
    # Generate correlation ID
    corr_id = generate_correlation_id()
    print(f"Generated correlation ID: {corr_id}")
    
    # Validate it
    print(f"Is valid: {is_valid_correlation_id(corr_id)}")
    
    # Use context manager
    with CorrelationIdContextManager(corr_id):
        print(f"Current correlation ID: {get_current_correlation_id()}")
    
    # Outside context
    print(f"Outside context: {get_current_correlation_id()}")