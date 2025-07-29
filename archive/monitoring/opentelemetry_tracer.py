#!/usr/bin/env python3
"""
OpenTelemetry Distributed Tracing for DinoAir
Implements distributed tracing with correlation ID integration.
"""

import os
import uuid
import threading
from typing import Dict, Any, Optional, List
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone

try:
    from opentelemetry import trace
    from opentelemetry.exporter.jaeger.thrift import JaegerExporter
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.semconv.resource import ResourceAttributes
    OPENTELEMETRY_AVAILABLE = True
except ImportError:
    OPENTELEMETRY_AVAILABLE = False
    # Define dummy classes for when OpenTelemetry is not available
    class TracerProvider: pass
    class BatchSpanProcessor: pass
    class Resource: pass
    class JaegerExporter: pass
    class OTLPSpanExporter: pass


@dataclass
class TraceConfig:
    """Configuration for distributed tracing."""
    service_name: str = "dinoair"
    service_version: str = "1.0.0"
    environment: str = "production"
    jaeger_endpoint: Optional[str] = None
    otlp_endpoint: Optional[str] = None
    sample_rate: float = 1.0
    enabled: bool = True


class NoOpTracer:
    """No-operation tracer when OpenTelemetry is not available."""
    
    def start_span(self, name: str, **kwargs):
        return NoOpSpan()
    
    def get_current_span(self):
        return NoOpSpan()


class NoOpSpan:
    """No-operation span when OpenTelemetry is not available."""
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass
    
    def set_attribute(self, key: str, value: Any):
        pass
    
    def set_status(self, status):
        pass
    
    def add_event(self, name: str, attributes: Optional[Dict[str, Any]] = None):
        pass
    
    def end(self):
        pass


class DinoAirTracer:
    """DinoAir distributed tracer with correlation ID integration."""
    
    def __init__(self, config: Optional[TraceConfig] = None):
        self.config = config or TraceConfig()
        self._tracer = None
        self._local = threading.local()
        self._setup_tracing()
    
    def _setup_tracing(self):
        """Initialize OpenTelemetry tracing if available."""
        if not OPENTELEMETRY_AVAILABLE or not self.config.enabled:
            self._tracer = NoOpTracer()
            return
        
        try:
            # Create resource with service information
            resource = Resource.create({
                ResourceAttributes.SERVICE_NAME: self.config.service_name,
                ResourceAttributes.SERVICE_VERSION: self.config.service_version,
                ResourceAttributes.DEPLOYMENT_ENVIRONMENT: self.config.environment,
            })
            
            # Create tracer provider
            provider = TracerProvider(resource=resource)
            
            # Add exporters
            self._add_exporters(provider)
            
            # Set as global tracer provider
            trace.set_tracer_provider(provider)
            
            # Get tracer instance
            self._tracer = trace.get_tracer(
                __name__,
                version=self.config.service_version
            )
            
        except Exception as e:
            print(f"Warning: Failed to initialize OpenTelemetry tracing: {e}")
            self._tracer = NoOpTracer()
    
    def _add_exporters(self, provider: TracerProvider):
        """Add configured exporters to the tracer provider."""
        processors = []
        
        # Add Jaeger exporter if configured
        if self.config.jaeger_endpoint:
            try:
                jaeger_exporter = JaegerExporter(
                    agent_host_name="localhost",
                    agent_port=14268,
                    collector_endpoint=self.config.jaeger_endpoint,
                )
                processors.append(BatchSpanProcessor(jaeger_exporter))
            except Exception as e:
                print(f"Warning: Failed to configure Jaeger exporter: {e}")
        
        # Add OTLP exporter if configured
        if self.config.otlp_endpoint:
            try:
                otlp_exporter = OTLPSpanExporter(
                    endpoint=self.config.otlp_endpoint,
                    insecure=True,
                )
                processors.append(BatchSpanProcessor(otlp_exporter))
            except Exception as e:
                print(f"Warning: Failed to configure OTLP exporter: {e}")
        
        # Add processors to provider
        for processor in processors:
            provider.add_span_processor(processor)
    
    @contextmanager
    def start_span(
        self, 
        name: str, 
        correlation_id: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None
    ):
        """Start a new span with correlation ID."""
        span = self._tracer.start_span(name)
        
        try:
            # Add correlation ID if provided
            if correlation_id:
                span.set_attribute("correlation_id", correlation_id)
            
            # Add custom attributes
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, value)
            
            # Store correlation ID in thread local
            if correlation_id:
                self._local.correlation_id = correlation_id
            
            yield span
            
        except Exception as e:
            # Record exception in span
            span.set_attribute("error", True)
            span.set_attribute("error.message", str(e))
            span.set_attribute("error.type", type(e).__name__)
            raise
        finally:
            span.end()
    
    def get_current_correlation_id(self) -> Optional[str]:
        """Get the current correlation ID from thread local storage."""
        return getattr(self._local, 'correlation_id', None)
    
    def add_event(self, event_name: str, attributes: Optional[Dict[str, Any]] = None):
        """Add an event to the current span."""
        try:
            current_span = trace.get_current_span()
            if current_span:
                current_span.add_event(event_name, attributes or {})
        except Exception:
            pass  # Ignore tracing errors
    
    def set_attribute(self, key: str, value: Any):
        """Set an attribute on the current span."""
        try:
            current_span = trace.get_current_span()
            if current_span:
                current_span.set_attribute(key, value)
        except Exception:
            pass  # Ignore tracing errors


# Global tracer instance
_tracer_instance: Optional[DinoAirTracer] = None


def get_tracer(config: Optional[TraceConfig] = None) -> DinoAirTracer:
    """Get the global tracer instance."""
    global _tracer_instance
    if _tracer_instance is None:
        _tracer_instance = DinoAirTracer(config)
    return _tracer_instance


def init_tracing(config: Optional[TraceConfig] = None) -> DinoAirTracer:
    """Initialize distributed tracing."""
    global _tracer_instance
    _tracer_instance = DinoAirTracer(config)
    return _tracer_instance


# Convenience functions
def start_span(name: str, correlation_id: Optional[str] = None, **kwargs):
    """Start a new span with the global tracer."""
    return get_tracer().start_span(name, correlation_id, **kwargs)


def add_event(event_name: str, attributes: Optional[Dict[str, Any]] = None):
    """Add an event to the current span."""
    get_tracer().add_event(event_name, attributes)


def set_attribute(key: str, value: Any):
    """Set an attribute on the current span."""
    get_tracer().set_attribute(key, value)


def get_correlation_id() -> Optional[str]:
    """Get the current correlation ID."""
    return get_tracer().get_current_correlation_id()