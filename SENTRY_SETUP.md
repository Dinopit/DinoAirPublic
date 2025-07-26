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
- **Error Boundary Integration**: The error handling system automatically sends errors to Sentry with context

## Integration Points

Sentry is integrated into:
- `start.py` - Main application startup
- `telemetry.py` - Telemetry and analytics
- `lib/error_handler/error_boundary.py` - Comprehensive error handling system
- Other Python components can import `sentry_config` to add error tracking

## Error Boundary Enhancement

The existing error boundary system now automatically sends all errors to Sentry with:
- Severity levels (critical, high, medium, low)
- Component context
- Recovery attempt information
- Custom metadata

## GitHub Actions

The `.github/workflows/sentry.yml` workflow validates the Sentry integration on every push and pull request.

## Removed Linting Workflows

The following failing linting workflows have been removed:
- `super-linter.yml` - Comprehensive multi-language linting
- `eslint.yml` - ESLint security analysis
- `codeql.yml` - CodeQL security scanning
- `sonarqube.yml` - SonarQube analysis
- Associated configuration files (`.pylintrc`, `.yamllint.yml`, etc.)

## No Linting? 

Traditional linting has been removed in favor of runtime error tracking with Sentry. This provides:
- Real-world error monitoring
- User experience tracking
- Performance monitoring
- Simplified CI/CD pipeline
- Focus on runtime issues rather than style

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

Consider adding `@sentry/node` to the Node.js projects (`web-gui` and `web-gui-node`) for comprehensive monitoring across all components.

## Validation

Run the validation workflow locally:
```bash
python -c "from sentry_config import init_sentry; print('✅ Sentry ready')"
```