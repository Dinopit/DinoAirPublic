# Auth Rate Limiting Investigation

## Problem Summary
Auth endpoints (`/api/auth/signin`, `/api/auth/signup`) hang during rate limiting checks, causing 10-second timeouts and poor user experience.

## Root Cause Analysis

### Issue Location
The hang occurs in `auth-middleware.js` in the `withRateLimit` function, specifically during the `rateLimit(req, res, callback)` call at line 374.

### Technical Details

1. **Express-Rate-Limit Configuration Issue**: The `createEnhancedRateLimit` function uses dynamic functions for configuration:
   ```javascript
   windowMs: req => { /* dynamic calculation */ },
   max: req => { /* dynamic calculation */ },
   keyGenerator: req => generateKey(req, category)
   ```

2. **Callback Mechanism Problem**: The express-rate-limit library may not be properly calling the callback when using dynamic configuration functions, especially when the request object doesn't have a `user` property during unauthenticated requests.

3. **Memory Store Compatibility**: The custom `MemoryStore` class may not be fully compatible with express-rate-limit v8.0.1's expected interface.

## Proposed Solution

### 1. Simplify Rate Limiter Configuration
Replace dynamic functions with static configuration and handle user-specific logic in the key generator only.

### 2. Improve Memory Store Implementation
Ensure the MemoryStore class fully implements the expected interface for express-rate-limit.

### 3. Add Circuit Breaker Pattern
Implement a circuit breaker to bypass rate limiting when it's consistently failing.

## Implementation Plan

1. **Fix Rate Limiter Configuration**: Use static configuration with user-tier detection in key generation
2. **Enhance Memory Store**: Add missing methods and improve error handling
3. **Add Fallback Mechanism**: Implement graceful degradation when rate limiting fails
4. **Test Thoroughly**: Verify auth endpoints work without hanging

## Expected Outcome
- Auth endpoints respond within 2-3 seconds instead of timing out
- Rate limiting still functions correctly for legitimate use cases
- Graceful degradation when rate limiting service has issues
