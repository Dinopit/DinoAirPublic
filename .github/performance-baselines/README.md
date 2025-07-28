# Performance Baselines

This directory contains performance baseline files for regression testing.

## Files:
- `cli-baseline.json` - CLI performance benchmarks
- `web-baseline.json` - Web application performance benchmarks  
- `api-baseline.json` - API endpoint performance benchmarks

## Usage:
Performance tests compare current results against these baselines to detect regressions.
Baselines are automatically updated when performance improves or when running on main branch.

## Thresholds:
- Performance regression > 10% triggers a warning
- Performance improvement > 5% updates the baseline
- Performance within ±5% is considered acceptable