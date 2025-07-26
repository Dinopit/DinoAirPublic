# Sentry Error Tracking Setup

DinoAir now uses Sentry for error tracking and monitoring instead of traditional linting checks.

## Quick Setup

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Sentry (Optional)**
   - Sign up at https://sentry.io/
   - Create a new project
   - Copy your DSN from the project settings
   - Set the `SENTRY_DSN` environment variable:
     ```bash
     export SENTRY_DSN="https://your-dsn@sentry.io/project-id"
     ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Add your Sentry DSN and other configuration

## How It Works

- **Automatic Error Tracking**: Errors in Python components are automatically captured and sent to Sentry
- **Manual Error Capture**: Use `capture_exception()` and `capture_message()` functions for custom tracking
- **Environment Aware**: Different environments (development, staging, production) are tracked separately

## Integration Points

Sentry is integrated into:
- `start.py` - Main application startup
- `telemetry.py` - Telemetry and analytics
- Other Python components can import `sentry_config` to add error tracking

## GitHub Actions

The `.github/workflows/sentry.yml` workflow validates the Sentry integration on every push and pull request.

## No Linting? 

Traditional linting has been removed in favor of runtime error tracking with Sentry. This provides:
- Real-world error monitoring
- User experience tracking
- Performance monitoring
- Simplified CI/CD pipeline

## Adding Sentry to New Components

```python
from sentry_config import capture_exception, capture_message

try:
    # Your code here
    pass
except Exception as e:
    capture_exception(e, {"context": "additional_info"})
```

## Node.js Components

Consider adding `@sentry/node` to the Node.js projects (`web-gui` and `web-gui-node`) for comprehensive monitoring.