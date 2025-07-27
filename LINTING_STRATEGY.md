# Linting Strategy Guide

This document explains the refactored linting strategy for the DinoAir repository, designed to balance code quality with development flexibility.

## Overview

The linting system has been restructured to provide multiple levels of enforcement, allowing developers to commit code when needed while maintaining code quality standards.

## Commit Modes

### 1. Lenient Mode (Default)
- **What it does**: Only runs basic formatting on staged files
- **When to use**: Regular development commits
- **Command**: `git commit -m "your message"`

### 2. Strict Mode
- **What it does**: Runs full linting, formatting, and tests
- **When to use**: Before merging to main/master
- **Command**: `STRICT_MODE=1 git commit -m "your message"`

### 3. Emergency Mode
- **What it does**: Bypasses ALL checks
- **When to use**: Critical fixes, broken linting setup
- **Command**: `SKIP_HOOKS=1 git commit -m "your message"`
- **Alternative**: `node emergency-commit.js "your message"`

## Available Scripts

### Web-GUI-Node Directory

```bash
# Full linting (shows all issues)
npm run lint

# Fix all auto-fixable issues
npm run lint:fix

# Show only errors (no warnings)
npm run lint:errors

# Fix only errors
npm run lint:errors:fix

# Lint only staged files
npm run lint:staged

# Format all files
npm run format

# Check formatting
npm run format:check

# Format only staged files
npm run format:staged

# Full quality check (lint + format + tests)
npm run quality

# Fix and run quality check
npm run quality:fix

# Quick quality check (errors only + format)
npm run quality:quick

# Minimal check (format only)
npm run quality:minimal
```

### Web-GUI Directory

Similar scripts are available with TypeScript support:
- Additional `type-check` in quality scripts
- Support for `.ts` and `.tsx` files

## Gradual Fix Strategy

1. **Immediate**: Use lenient mode to continue development
2. **Before PR**: Run `npm run quality:quick` to fix critical issues
3. **Before merge**: Use `STRICT_MODE=1` to ensure all checks pass
4. **Periodic cleanup**: Run `npm run quality:fix` in both directories

## Emergency Commit Tool

The `emergency-commit.js` tool provides a guided way to bypass checks:

```bash
node emergency-commit.js "Fix critical production issue"
```

Features:
- Confirmation prompt
- Automatic [EMERGENCY] tag
- Logs emergency commits to `.emergency-commits.log`
- Provides cleanup instructions

## Best Practices

1. **Use lenient mode** for regular development to maintain velocity
2. **Run quality:quick** before pushing to catch major issues
3. **Use strict mode** for final commits before merging
4. **Emergency commits** should be rare and followed by cleanup
5. **Fix incrementally** - address errors first, then warnings

## Troubleshooting

### "Too many linting errors"
```bash
# Fix errors only first
cd web-gui-node && npm run lint:errors:fix
cd ../web-gui && npm run lint:errors:fix
```

### "Can't commit anything"
```bash
# Emergency bypass
SKIP_HOOKS=1 git commit -m "WIP: Fixing linting setup"
# OR
node emergency-commit.js "WIP: Fixing linting setup"
```

### "Want to commit partially fixed code"
```bash
# Use lenient mode (default)
git commit -m "feat: Add new feature (WIP: linting fixes needed)"
```

## Migration Path

1. Start using lenient mode immediately
2. Gradually fix errors using `lint:errors:fix`
3. Address warnings over time with `lint:fix`
4. Eventually move to strict mode as default

## Configuration Files

- **ESLint**: 
  - `web-gui-node/eslint.config.js` (Flat config)
  - `web-gui/.eslintrc.json` (Traditional config)
- **Prettier**: 
  - `web-gui-node/.prettierrc.js`
  - `web-gui/.prettierrc.json`
- **Husky**: `.husky/pre-commit`
- **lint-staged**: `.lintstagedrc.js` / `.lintstagedrc.json`

Remember: The goal is to maintain code quality while not blocking development progress.