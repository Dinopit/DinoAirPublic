"""
Comprehensive integration tests for the circuit_breaker module.

This test suite covers all major functionality of the CircuitBreaker class
with proper mocking of external dependencies and state management.
"""

import unittest
import time
import threading
from unittest.mock import Mock, patch, MagicMock, call
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any
import asyncio

# Import the modules under test
from lib.circuit_breaker.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitStats,
    CircuitState,
    CircuitOpenError,
    circuit_breaker,
    DinoAirCircuitBreakers
)


class TestCircuitBreakerConfig(unittest.TestCase):
    """Test the CircuitBreakerConfig dataclass."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = CircuitBreakerConfig(name="test_breaker")
        
        self.assertEqual(config.name, "test_breaker")
        self.assertEqual(config.failure_threshold, 5)
        self.assertEqual(config.recovery_timeout, 60)
        self.assertEqual(config.expected_exception, Exception)
        self.assertEqual(config.timeout, 30)
        self.assertEqual(config.window_size, 100)
        self.assertEqual(config.half_open_max_calls, 3)

    def test_custom_config(self):
        """Test custom configuration values."""
        config = CircuitBreakerConfig(
            name="custom_breaker",
            failure_threshold=10,
            recovery_timeout=120,
            expected_exception=ValueError,
            timeout=60,
            window_size=200,
            half_open_max_calls=5
        )
        
        self.assertEqual(config.name, "custom_breaker")
        self.assertEqual(config.failure_threshold, 10)
        self.assertEqual(config.recovery_timeout, 120)
        self.assertEqual(config.expected_exception, ValueError)
        self.assertEqual(config.timeout, 60)
        self.assertEqual(config.window_size, 200)
        self.assertEqual(config.half_open_max_calls, 5)


class TestCircuitStats(unittest.TestCase):
    """Test the CircuitStats dataclass."""
    
    def test_initialization(self):
        """Test CircuitStats initialization."""
        stats = CircuitStats()
        
        self.assertEqual(stats.total_calls, 0)
        self.assertEqual(stats.failed_calls, 0)
        self.assertEqual(stats.successful_calls, 0)
        self.assertEqual(stats.timeout_calls, 0)
        self.assertEqual(stats.rejected_calls, 0)
        self.assertIsNone(stats.last_failure_time)
        self.assertIsNone(stats.last_success_time)
        self.assertEqual(len(stats.call_history), 0)

    def test_stats_update(self):
        """Test updating statistics."""
        stats = CircuitStats()
        
        # Update stats
        stats.total_calls = 10
        stats.failed_calls = 3
        stats.successful_calls = 7
        stats.last_failure_time = datetime.now()
        
        self.assertEqual(stats.total_calls, 10)
        self.assertEqual(stats.failed_calls, 3)
        self.assertEqual(stats.successful_calls, 7)
        self.assertIsNotNone(stats.last_failure_time)


class TestCircuitBreaker(unittest.TestCase):
    """Test the CircuitBreaker class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.config = CircuitBreakerConfig(
            name="test_breaker",
            failure_threshold=3,
            recovery_timeout=60,
            timeout=5
        )
        self.breaker = CircuitBreaker(self.config)

    def tearDown(self):
        """Clean up after tests."""
        try:
            self.breaker.shutdown()
        except:
            pass

    def test_initialization(self):
        """Test CircuitBreaker initialization."""
        self.assertEqual(self.breaker.config, self.config)
        self.assertEqual(self.breaker.state, CircuitState.CLOSED)
        self.assertIsNotNone(self.breaker.stats)
        self.assertEqual(self.breaker.stats.total_calls, 0)
        self.assertEqual(self.breaker.half_open_calls, 0)
        self.assertIsNone(self.breaker.last_failure_time)

    def test_context_manager(self):
        """Test CircuitBreaker as context manager."""
        with self.breaker as cb:
            self.assertEqual(cb, self.breaker)

    def test_successful_call_closed_state(self):
        """Test successful call in CLOSED state."""
        def successful_function():
            return "success"
        
        result = self.breaker.call(successful_function)
        
        self.assertEqual(result, "success")
        self.assertEqual(self.breaker.state, CircuitState.CLOSED)
        self.assertEqual(self.breaker.stats.total_calls, 1)
        self.assertEqual(self.breaker.stats.successful_calls, 1)
        self.assertEqual(self.breaker.stats.failed_calls, 0)

    def test_failed_call_closed_state(self):
        """Test failed call in CLOSED state."""
        def failing_function():
            raise ValueError("Test error")
        
        with self.assertRaises(ValueError):
            self.breaker.call(failing_function)
        
        self.assertEqual(self.breaker.state, CircuitState.CLOSED)
        self.assertEqual(self.breaker.stats.total_calls, 1)
        self.assertEqual(self.breaker.stats.successful_calls, 0)
        self.assertEqual(self.breaker.stats.failed_calls, 1)

    def test_transition_to_open_state(self):
        """Test transition from CLOSED to OPEN state."""
        def failing_function():
            raise ValueError("Test error")
        
        # Trigger failures to reach threshold
        for i in range(self.config.failure_threshold):
            with self.assertRaises(ValueError):
                self.breaker.call(failing_function)
        
        self.assertEqual(self.breaker.state, CircuitState.OPEN)
        self.assertIsNotNone(self.breaker.last_failure_time)

    def test_rejected_call_open_state(self):
        """Test rejected call in OPEN state."""
        # Force breaker to OPEN state
        self.breaker.state = CircuitState.OPEN
        self.breaker.last_failure_time = datetime.now()
        
        def any_function():
            return "should not execute"
        
        with self.assertRaises(CircuitOpenError):
            self.breaker.call(any_function)
        
        self.assertEqual(self.breaker.stats.rejected_calls, 1)

    def test_transition_to_half_open_state(self):
        """Test transition from OPEN to HALF_OPEN state."""
        # Force breaker to OPEN state with old failure time
        self.breaker.state = CircuitState.OPEN
        self.breaker.last_failure_time = datetime.now() - timedelta(seconds=self.config.recovery_timeout + 1)
        
        def successful_function():
            return "success"
        
        result = self.breaker.call(successful_function)
        
        self.assertEqual(result, "success")
        self.assertEqual(self.breaker.state, CircuitState.HALF_OPEN)

    def test_transition_from_half_open_to_closed(self):
        """Test transition from HALF_OPEN to CLOSED state."""
        # Set breaker to HALF_OPEN state
        self.breaker.state = CircuitState.HALF_OPEN
        self.breaker.half_open_calls = 0
        
        def successful_function():
            return "success"
        
        # Make successful calls to reach success threshold
        for i in range(self.config.half_open_max_calls):
            result = self.breaker.call(successful_function)
            self.assertEqual(result, "success")
        
        self.assertEqual(self.breaker.state, CircuitState.CLOSED)

    def test_transition_from_half_open_to_open(self):
        """Test transition from HALF_OPEN back to OPEN state."""
        # Set breaker to HALF_OPEN state
        self.breaker.state = CircuitState.HALF_OPEN
        self.breaker.half_open_calls = 0
        
        def failing_function():
            raise ValueError("Test error")
        
        with self.assertRaises(ValueError):
            self.breaker.call(failing_function)
        
        self.assertEqual(self.breaker.state, CircuitState.OPEN)

    def test_timeout_handling(self):
        """Test timeout handling for slow functions."""
        def slow_function():
            time.sleep(self.config.timeout + 1)
            return "should timeout"
        
        with self.assertRaises(Exception):  # Timeout should raise exception
            self.breaker.call(slow_function)
        
        self.assertEqual(self.breaker.stats.timeout_calls, 1)

    def test_get_state(self):
        """Test getting current state."""
        self.assertEqual(self.breaker.get_state(), CircuitState.CLOSED)
        
        # Change state and test
        self.breaker.state = CircuitState.OPEN
        self.assertEqual(self.breaker.get_state(), CircuitState.OPEN)

    def test_get_stats(self):
        """Test getting statistics."""
        # Make some calls to generate stats
        def successful_function():
            return "success"
        
        def failing_function():
            raise ValueError("Test error")
        
        self.breaker.call(successful_function)
        
        try:
            self.breaker.call(failing_function)
        except ValueError:
            pass
        
        stats = self.breaker.get_stats()
        
        self.assertEqual(stats["state"], "CLOSED")
        self.assertEqual(stats["total_calls"], 2)
        self.assertEqual(stats["successful_calls"], 1)
        self.assertEqual(stats["failed_calls"], 1)
        self.assertIn("failure_rate", stats)
        self.assertIn("avg_response_time", stats)

    def test_reset(self):
        """Test resetting circuit breaker."""
        # Make some calls and change state
        def failing_function():
            raise ValueError("Test error")
        
        try:
            self.breaker.call(failing_function)
        except ValueError:
            pass
        
        self.breaker.state = CircuitState.OPEN
        
        # Reset breaker
        self.breaker.reset()
        
        self.assertEqual(self.breaker.state, CircuitState.CLOSED)
        self.assertEqual(self.breaker.stats.total_calls, 0)
        self.assertEqual(self.breaker.stats.failed_calls, 0)
        self.assertEqual(self.breaker.half_open_calls, 0)

    def test_window_rotation(self):
        """Test sliding window rotation."""
        # Fill up the window
        def successful_function():
            return "success"
        
        for i in range(self.config.window_size + 10):
            self.breaker.call(successful_function)
        
        # Window should be rotated, keeping only recent calls
        self.assertEqual(len(self.breaker.stats.call_history), self.config.window_size)

    def test_concurrent_access(self):
        """Test thread safety of circuit breaker."""
        results = []
        errors = []
        
        def test_function():
            return "success"
        
        def worker():
            try:
                result = self.breaker.call(test_function)
                results.append(result)
            except Exception as e:
                errors.append(e)
        
        # Create multiple threads
        threads = []
        for i in range(10):
            thread = threading.Thread(target=worker)
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All calls should succeed
        self.assertEqual(len(results), 10)
        self.assertEqual(len(errors), 0)
        self.assertEqual(self.breaker.stats.total_calls, 10)


class TestCircuitBreakerDecorator(unittest.TestCase):
    """Test the circuit_breaker decorator."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.config = CircuitBreakerConfig(
            name="decorator_test",
            failure_threshold=2,
            recovery_timeout=60
        )

    def test_decorator_success(self):
        """Test decorator with successful function."""
        @circuit_breaker(self.config)
        def successful_function(x, y):
            return x + y
        
        result = successful_function(2, 3)
        self.assertEqual(result, 5)

    def test_decorator_failure(self):
        """Test decorator with failing function."""
        @circuit_breaker(self.config)
        def failing_function():
            raise ValueError("Test error")
        
        with self.assertRaises(ValueError):
            failing_function()

    def test_decorator_with_args_kwargs(self):
        """Test decorator preserves function arguments."""
        @circuit_breaker(self.config)
        def function_with_args(a, b, c=None, d=None):
            return {"a": a, "b": b, "c": c, "d": d}
        
        result = function_with_args(1, 2, c=3, d=4)
        expected = {"a": 1, "b": 2, "c": 3, "d": 4}
        self.assertEqual(result, expected)


class TestDinoAirCircuitBreakers(unittest.TestCase):
    """Test the DinoAirCircuitBreakers class."""
    
    def test_comfyui_breaker(self):
        """Test ComfyUI circuit breaker configuration."""
        breaker = DinoAirCircuitBreakers.comfyui_breaker()
        
        self.assertIsInstance(breaker, CircuitBreaker)
        self.assertEqual(breaker.config.name, "comfyui")
        self.assertEqual(breaker.config.failure_threshold, 5)
        self.assertEqual(breaker.config.recovery_timeout, 120)

    def test_ollama_breaker(self):
        """Test Ollama circuit breaker configuration."""
        breaker = DinoAirCircuitBreakers.ollama_breaker()
        
        self.assertIsInstance(breaker, CircuitBreaker)
        self.assertEqual(breaker.config.name, "ollama")
        self.assertEqual(breaker.config.failure_threshold, 3)
        self.assertEqual(breaker.config.recovery_timeout, 60)

    def test_model_download_breaker(self):
        """Test model download circuit breaker configuration."""
        breaker = DinoAirCircuitBreakers.model_download_breaker()
        
        self.assertIsInstance(breaker, CircuitBreaker)
        self.assertEqual(breaker.config.name, "model_download")
        self.assertEqual(breaker.config.failure_threshold, 2)
        self.assertEqual(breaker.config.recovery_timeout, 300)
        self.assertEqual(breaker.config.timeout, 600)


class TestCircuitBreakerIntegration(unittest.TestCase):
    """Integration tests for CircuitBreaker."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.config = CircuitBreakerConfig(
            name="integration_test",
            failure_threshold=3,
            recovery_timeout=1,  # Short timeout for testing
            timeout=2
        )
        self.breaker = CircuitBreaker(self.config)

    def tearDown(self):
        """Clean up after tests."""
        try:
            self.breaker.shutdown()
        except:
            pass

    def test_full_state_cycle(self):
        """Test complete state cycle: CLOSED -> OPEN -> HALF_OPEN -> CLOSED."""
        def failing_function():
            raise ValueError("Test error")
        
        def successful_function():
            return "success"
        
        # Start in CLOSED state
        self.assertEqual(self.breaker.state, CircuitState.CLOSED)
        
        # Trigger failures to move to OPEN state
        for i in range(self.config.failure_threshold):
            with self.assertRaises(ValueError):
                self.breaker.call(failing_function)
        
        self.assertEqual(self.breaker.state, CircuitState.OPEN)
        
        # Wait for recovery timeout
        time.sleep(self.config.recovery_timeout + 0.1)
        
        # Next call should move to HALF_OPEN
        result = self.breaker.call(successful_function)
        self.assertEqual(result, "success")
        self.assertEqual(self.breaker.state, CircuitState.HALF_OPEN)
        
        # Make enough successful calls to return to CLOSED
        for i in range(self.config.half_open_max_calls - 1):
            result = self.breaker.call(successful_function)
            self.assertEqual(result, "success")
        
        self.assertEqual(self.breaker.state, CircuitState.CLOSED)

    def test_failure_rate_calculation(self):
        """Test failure rate calculation."""
        def successful_function():
            return "success"
        
        def failing_function():
            raise ValueError("Test error")
        
        # Make mixed successful and failed calls
        for i in range(5):
            self.breaker.call(successful_function)
        
        for i in range(2):
            try:
                self.breaker.call(failing_function)
            except ValueError:
                pass
        
        stats = self.breaker.get_stats()
        expected_failure_rate = 2.0 / 7.0 * 100  # 2 failures out of 7 total calls
        self.assertAlmostEqual(stats["failure_rate"], expected_failure_rate, places=1)

    def test_response_time_tracking(self):
        """Test response time tracking."""
        def slow_function():
            time.sleep(0.1)
            return "slow"
        
        def fast_function():
            return "fast"
        
        # Make calls with different response times
        self.breaker.call(slow_function)
        self.breaker.call(fast_function)
        
        stats = self.breaker.get_stats()
        self.assertGreater(stats["avg_response_time"], 0)

    def test_error_handling_with_different_exceptions(self):
        """Test handling different types of exceptions."""
        # Configure breaker to only catch ValueError
        config = CircuitBreakerConfig(
            name="specific_error_test",
            failure_threshold=2,
            expected_exception=ValueError
        )
        breaker = CircuitBreaker(config)
        
        def value_error_function():
            raise ValueError("Value error")
        
        def type_error_function():
            raise TypeError("Type error")
        
        # ValueError should be caught and counted
        with self.assertRaises(ValueError):
            breaker.call(value_error_function)
        
        self.assertEqual(breaker.stats.failed_calls, 1)
        
        # TypeError should not be caught by circuit breaker
        with self.assertRaises(TypeError):
            breaker.call(type_error_function)
        
        # Failed calls should still be 1 (TypeError not counted)
        self.assertEqual(breaker.stats.failed_calls, 1)


if __name__ == "__main__":
    unittest.main()