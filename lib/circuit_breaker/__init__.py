"""
DinoAir Circuit Breaker Module
Provides circuit breaker pattern implementation for external service calls
"""

from .circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitState,
    CircuitOpenError,
    circuit_breaker,
    DinoAirCircuitBreakers
)

__all__ = [
    'CircuitBreaker',
    'CircuitBreakerConfig', 
    'CircuitState',
    'CircuitOpenError',
    'circuit_breaker',
    'DinoAirCircuitBreakers'
]

# Module version
__version__ = '1.0.0'