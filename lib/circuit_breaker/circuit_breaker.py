"""
DinoAir Circuit Breaker Implementation
Prevents cascading failures when external services are unavailable
"""

import time
import logging
import asyncio
from typing import Optional, Callable, Any, Dict, TypeVar, Generic
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque
import threading
from concurrent.futures import ThreadPoolExecutor
import functools

# Type variables
T = TypeVar('T')
CircuitFunction = TypeVar('CircuitFunction', bound=Callable[..., Any])

class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"         # Failing fast
    HALF_OPEN = "half_open"  # Testing if service recovered

@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker"""
    name: str
    failure_threshold: int = 5          # Failures before opening
    success_threshold: int = 3          # Successes in half-open before closing
    timeout: float = 30.0               # Request timeout in seconds
    reset_timeout: float = 60.0         # Time before trying half-open
    expected_exception: type = Exception  # Exception types to catch
    exclude_exceptions: tuple = ()       # Exceptions that don't trigger circuit
    
    # Sliding window configuration
    window_size: int = 60               # Window size in seconds
    window_buckets: int = 6             # Number of buckets in window
    
    # Response time tracking
    slow_call_duration: float = 5.0     # Threshold for slow calls
    slow_call_rate_threshold: float = 0.5  # Rate of slow calls to open circuit

@dataclass
class CircuitStats:
    """Statistics for circuit breaker"""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    rejected_calls: int = 0
    slow_calls: int = 0
    last_failure_time: Optional[float] = None
    last_success_time: Optional[float] = None
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    state_changes: list = field(default_factory=list)
    
    # Sliding window stats
    call_times: deque = field(default_factory=lambda: deque(maxlen=1000))
    response_times: deque = field(default_factory=lambda: deque(maxlen=1000))

class CircuitBreaker(Generic[T]):
    """
    Circuit breaker implementation for external service calls
    """
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.state = CircuitState.CLOSED
        self.stats = CircuitStats()
        self.last_state_change = time.time()
        self._lock = threading.RLock()
        self._half_open_calls = 0
        
        # Logger
        self.logger = logging.getLogger(f"CircuitBreaker.{config.name}")
        
        # Sliding window for rate calculations
        self._window_start = time.time()
        self._window_buckets = [{"calls": 0, "failures": 0, "slow": 0} 
                                for _ in range(config.window_buckets)]
        self._current_bucket_idx = 0
        
        # Start background task for window rotation
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._running = True
        self._executor.submit(self._rotate_window)
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.shutdown()
    
    def shutdown(self):
        """Shutdown circuit breaker"""
        self._running = False
        self._executor.shutdown(wait=True)
    
    def _rotate_window(self):
        """Background task to rotate sliding window buckets"""
        while self._running:
            time.sleep(self.config.window_size / self.config.window_buckets)
            with self._lock:
                self._current_bucket_idx = (self._current_bucket_idx + 1) % self.config.window_buckets
                self._window_buckets[self._current_bucket_idx] = {"calls": 0, "failures": 0, "slow": 0}
    
    def _get_window_stats(self) -> Dict[str, float]:
        """Get statistics for current window"""
        with self._lock:
            total_calls = sum(b["calls"] for b in self._window_buckets)
            total_failures = sum(b["failures"] for b in self._window_buckets)
            total_slow = sum(b["slow"] for b in self._window_buckets)
            
            failure_rate = total_failures / total_calls if total_calls > 0 else 0
            slow_rate = total_slow / total_calls if total_calls > 0 else 0
            
            return {
                "total_calls": total_calls,
                "failure_rate": failure_rate,
                "slow_rate": slow_rate
            }
    
    def _record_call(self, success: bool, duration: float):
        """Record call statistics"""
        with self._lock:
            self.stats.total_calls += 1
            self.stats.call_times.append(time.time())
            self.stats.response_times.append(duration)
            
            # Update window bucket
            bucket = self._window_buckets[self._current_bucket_idx]
            bucket["calls"] += 1
            
            if success:
                self.stats.successful_calls += 1
                self.stats.last_success_time = time.time()
                self.stats.consecutive_successes += 1
                self.stats.consecutive_failures = 0
            else:
                self.stats.failed_calls += 1
                self.stats.last_failure_time = time.time()
                self.stats.consecutive_failures += 1
                self.stats.consecutive_successes = 0
                bucket["failures"] += 1
            
            if duration > self.config.slow_call_duration:
                self.stats.slow_calls += 1
                bucket["slow"] += 1
    
    def _should_allow_request(self) -> bool:
        """Check if request should be allowed"""
        with self._lock:
            if self.state == CircuitState.CLOSED:
                return True
            
            if self.state == CircuitState.OPEN:
                # Check if we should transition to half-open
                if time.time() - self.last_state_change > self.config.reset_timeout:
                    self._transition_to_half_open()
                    return True
                return False
            
            if self.state == CircuitState.HALF_OPEN:
                # Allow limited requests in half-open state
                if self._half_open_calls < self.config.success_threshold:
                    self._half_open_calls += 1
                    return True
                return False
        
        return False
    
    def _transition_to_open(self, reason: str):
        """Transition to open state"""
        with self._lock:
            if self.state != CircuitState.OPEN:
                self.state = CircuitState.OPEN
                self.last_state_change = time.time()
                self._half_open_calls = 0
                
                self.stats.state_changes.append({
                    "from": self.state.value,
                    "to": CircuitState.OPEN.value,
                    "time": datetime.now().isoformat(),
                    "reason": reason
                })
                
                self.logger.warning(f"Circuit {self.config.name} opened: {reason}")
    
    def _transition_to_closed(self):
        """Transition to closed state"""
        with self._lock:
            if self.state != CircuitState.CLOSED:
                old_state = self.state
                self.state = CircuitState.CLOSED
                self.last_state_change = time.time()
                self._half_open_calls = 0
                self.stats.consecutive_failures = 0
                
                self.stats.state_changes.append({
                    "from": old_state.value,
                    "to": CircuitState.CLOSED.value,
                    "time": datetime.now().isoformat(),
                    "reason": "Service recovered"
                })
                
                self.logger.info(f"Circuit {self.config.name} closed: Service recovered")
    
    def _transition_to_half_open(self):
        """Transition to half-open state"""
        with self._lock:
            if self.state == CircuitState.OPEN:
                self.state = CircuitState.HALF_OPEN
                self.last_state_change = time.time()
                self._half_open_calls = 0
                
                self.stats.state_changes.append({
                    "from": CircuitState.OPEN.value,
                    "to": CircuitState.HALF_OPEN.value,
                    "time": datetime.now().isoformat(),
                    "reason": "Testing recovery"
                })
                
                self.logger.info(f"Circuit {self.config.name} half-open: Testing recovery")
    
    def _handle_success(self, duration: float):
        """Handle successful call"""
        self._record_call(True, duration)
        
        with self._lock:
            if self.state == CircuitState.HALF_OPEN:
                if self.stats.consecutive_successes >= self.config.success_threshold:
                    self._transition_to_closed()
    
    def _handle_failure(self, duration: float, error: Exception):
        """Handle failed call"""
        # Check if this exception should trigger circuit
        if isinstance(error, self.config.exclude_exceptions):
            return
        
        self._record_call(False, duration)
        
        with self._lock:
            # Check failure threshold
            if self.stats.consecutive_failures >= self.config.failure_threshold:
                self._transition_to_open(f"Failure threshold reached: {self.stats.consecutive_failures}")
                return
            
            # Check failure rate in window
            window_stats = self._get_window_stats()
            if window_stats["total_calls"] >= 10:  # Minimum calls for rate calculation
                if window_stats["failure_rate"] > 0.5:
                    self._transition_to_open(f"High failure rate: {window_stats['failure_rate']:.2%}")
                elif window_stats["slow_rate"] > self.config.slow_call_rate_threshold:
                    self._transition_to_open(f"High slow call rate: {window_stats['slow_rate']:.2%}")
            
            # If in half-open, single failure opens circuit
            if self.state == CircuitState.HALF_OPEN:
                self._transition_to_open("Failure during recovery test")
    
    def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """
        Execute function with circuit breaker protection
        """
        if not self._should_allow_request():
            self.stats.rejected_calls += 1
            raise CircuitOpenError(f"Circuit {self.config.name} is open")
        
        start_time = time.time()
        
        try:
            # Execute with timeout
            if asyncio.iscoroutinefunction(func):
                # Handle async functions
                result = asyncio.run(self._async_call_with_timeout(func, args, kwargs))
            else:
                # Handle sync functions
                result = self._sync_call_with_timeout(func, args, kwargs)
            
            duration = time.time() - start_time
            self._handle_success(duration)
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            self._handle_failure(duration, e)
            raise
    
    def _sync_call_with_timeout(self, func: Callable[..., T], args: tuple, kwargs: dict) -> T:
        """Execute synchronous function with timeout"""
        import signal
        
        def timeout_handler(signum, frame):
            raise TimeoutError(f"Call timed out after {self.config.timeout}s")
        
        # Set timeout alarm (Unix only)
        if hasattr(signal, 'SIGALRM'):
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(int(self.config.timeout))
            
            try:
                result = func(*args, **kwargs)
                signal.alarm(0)  # Cancel alarm
                return result
            except:
                signal.alarm(0)  # Cancel alarm
                raise
        else:
            # Fallback for Windows - no timeout
            return func(*args, **kwargs)
    
    async def _async_call_with_timeout(self, func: Callable[..., T], args: tuple, kwargs: dict) -> T:
        """Execute asynchronous function with timeout"""
        return await asyncio.wait_for(func(*args, **kwargs), timeout=self.config.timeout)
    
    def get_state(self) -> CircuitState:
        """Get current circuit state"""
        return self.state
    
    def get_stats(self) -> Dict[str, Any]:
        """Get circuit statistics"""
        with self._lock:
            window_stats = self._get_window_stats()
            
            return {
                "name": self.config.name,
                "state": self.state.value,
                "total_calls": self.stats.total_calls,
                "successful_calls": self.stats.successful_calls,
                "failed_calls": self.stats.failed_calls,
                "rejected_calls": self.stats.rejected_calls,
                "slow_calls": self.stats.slow_calls,
                "consecutive_failures": self.stats.consecutive_failures,
                "consecutive_successes": self.stats.consecutive_successes,
                "window_failure_rate": window_stats["failure_rate"],
                "window_slow_rate": window_stats["slow_rate"],
                "last_failure": datetime.fromtimestamp(self.stats.last_failure_time).isoformat() 
                              if self.stats.last_failure_time else None,
                "last_success": datetime.fromtimestamp(self.stats.last_success_time).isoformat()
                              if self.stats.last_success_time else None,
                "recent_state_changes": self.stats.state_changes[-5:]  # Last 5 changes
            }
    
    def reset(self):
        """Reset circuit breaker to closed state"""
        with self._lock:
            self.state = CircuitState.CLOSED
            self.stats = CircuitStats()
            self.last_state_change = time.time()
            self._half_open_calls = 0
            self.logger.info(f"Circuit {self.config.name} manually reset")

class CircuitOpenError(Exception):
    """Exception raised when circuit is open"""
    pass

def circuit_breaker(config: CircuitBreakerConfig):
    """
    Decorator for applying circuit breaker to functions
    
    Usage:
        @circuit_breaker(CircuitBreakerConfig(name="external_api"))
        def call_external_api():
            ...
    """
    def decorator(func: CircuitFunction) -> CircuitFunction:
        # Create circuit breaker instance
        cb = CircuitBreaker(config)
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return cb.call(func, *args, **kwargs)
        
        # Attach circuit breaker instance for inspection
        wrapper.circuit_breaker = cb
        
        return wrapper
    
    return decorator

# Pre-configured circuit breakers for DinoAir services
class DinoAirCircuitBreakers:
    """Pre-configured circuit breakers for DinoAir external services"""
    
    @staticmethod
    def comfyui_breaker() -> CircuitBreaker:
        """Circuit breaker for ComfyUI API calls"""
        return CircuitBreaker(CircuitBreakerConfig(
            name="ComfyUI",
            failure_threshold=3,
            success_threshold=2,
            timeout=120.0,  # 2 minutes for image generation
            reset_timeout=30.0,
            slow_call_duration=30.0,
            slow_call_rate_threshold=0.7
        ))
    
    @staticmethod
    def ollama_breaker() -> CircuitBreaker:
        """Circuit breaker for Ollama API calls"""
        return CircuitBreaker(CircuitBreakerConfig(
            name="Ollama",
            failure_threshold=5,
            success_threshold=3,
            timeout=60.0,  # 1 minute for text generation
            reset_timeout=20.0,
            slow_call_duration=10.0,
            slow_call_rate_threshold=0.5
        ))
    
    @staticmethod
    def model_download_breaker() -> CircuitBreaker:
        """Circuit breaker for model downloads"""
        return CircuitBreaker(CircuitBreakerConfig(
            name="ModelDownload",
            failure_threshold=2,
            success_threshold=1,
            timeout=600.0,  # 10 minutes for large downloads
            reset_timeout=120.0,
            slow_call_duration=60.0,
            slow_call_rate_threshold=0.8
        ))

if __name__ == "__main__":
    # Example usage
    import requests
    
    # Configure circuit breaker
    config = CircuitBreakerConfig(
        name="test_api",
        failure_threshold=3,
        timeout=5.0
    )
    
    @circuit_breaker(config)
    def call_api():
        response = requests.get("https://jsonplaceholder.typicode.com/posts/1", timeout=5)
        return response.json()
    
    # Test circuit breaker
    for i in range(10):
        try:
            result = call_api()
            print(f"Call {i+1}: Success")
        except CircuitOpenError as e:
            print(f"Call {i+1}: {e}")
        except Exception as e:
            print(f"Call {i+1}: Failed - {e}")
        
        time.sleep(1)
    
    # Check stats
    print("\nCircuit Breaker Stats:")
    print(call_api.circuit_breaker.get_stats())