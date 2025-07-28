# Pre-commit Setup Guide 🔧

This document explains the pre-commit framework setup for the DinoAir project, which provides automated code quality checks before commits.

## 🎯 Overview

The project now uses a comprehensive pre-commit solution that combines:
- **Pre-commit framework** for standardized hooks
- **Husky** for Git hook management (already configured)
- **lint-staged** for efficient file processing
- **ESLint** and **Prettier** for code quality and formatting

## 🚀 Quick Start for Developers

### One-time Setup (Required for each developer)

1. **Install the pre-commit framework:**
   ```bash
   pip install pre-commit
   ```

2. **That's it!** The hooks are already configured and will run automatically on `git commit`.

### How It Works

When you commit code, the following happens automatically:

1. **Pre-commit framework hooks** run (if installed):
   - Remove trailing whitespace
   - Fix end-of-file issues
   - Check YAML syntax
   - Check for large files
   - Check for merge conflicts

2. **ESLint** runs on JavaScript/TypeScript files:
   - Uses your project's existing ESLint configuration
   - Automatically fixes fixable issues

3. **Prettier** runs on various file types:
   - Uses your project's existing Prettier configuration
   - Formats code consistently

4. **lint-staged** and **quality checks** run for both web-gui and web-gui-node

## 📁 Configuration Files

### `.pre-commit-config.yaml`
The main configuration file defining all hooks:
```yaml
repos:
-   repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
    -   id: trailing-whitespace
    -   id: end-of-file-fixer
    -   id: check-yaml
    -   id: check-added-large-files
    -   id: check-merge-conflict

-   repo: https://github.com/pre-commit/mirrors-eslint
    rev: v9.32.0
    hooks:
    -   id: eslint
        files: \.[jt]sx?$
        types: [file]
        args: [--fix]

-   repo: https://github.com/pre-commit/mirrors-prettier
    rev: v4.0.0-alpha.8
    hooks:
    -   id: prettier
        types_or: [javascript, jsx, ts, tsx, json, css, scss, html, yaml, markdown]
```

### `.husky/pre-commit`
Already configured to run the pre-commit framework and fallback to existing checks.

## 🛠️ Manual Commands

### Run hooks on all files (useful for initial cleanup):
```bash
python -m pre_commit run --all-files
```

### Run hooks on staged files only:
```bash
python -m pre_commit run
```

### Update hook versions:
```bash
python -m pre_commit autoupdate
```

### Test the setup:
```bash
node test-precommit-setup.js
```

## 🔧 Troubleshooting

### Pre-commit not running?
1. Ensure you've installed it: `pip install pre-commit`
2. Check if hooks are installed: The Husky integration handles this automatically

### Hooks failing?
1. Check the error messages - they usually indicate what needs to be fixed
2. Many issues are auto-fixed; just `git add` the changes and commit again
3. For persistent issues, you can temporarily skip hooks: `git commit --no-verify`

### Environment issues?
If you encounter Python environment issues with pre-commit:
1. The Husky integration will still run lint-staged and quality checks
2. Try updating pre-commit: `pip install --upgrade pre-commit`
3. Clear the cache: `python -m pre_commit clean`

## 🎨 What Gets Checked

### File Types Processed:
- **JavaScript/TypeScript**: `.js`, `.jsx`, `.ts`, `.tsx`
- **Styling**: `.css`, `.scss`
- **Markup**: `.html`, `.yaml`, `.markdown`
- **Configuration**: `.json`

### Quality Checks:
- **ESLint**: Code quality and style rules
- **Prettier**: Code formatting
- **Trailing whitespace**: Removed automatically
- **File endings**: Fixed automatically
- **Large files**: Prevented from being committed
- **Merge conflicts**: Detected and blocked

## 🚀 Benefits

1. **Consistent Code Quality**: All code follows the same standards
2. **Automatic Fixes**: Many issues are fixed automatically
3. **Early Detection**: Catch issues before they reach the repository
4. **Team Efficiency**: Reduces code review time
5. **CI/CD Ready**: Same checks can run in continuous integration

## 📚 Integration with Existing Tools

This setup integrates seamlessly with your existing tools:
- **ESLint configurations**: Uses `.eslintrc.json` files
- **Prettier configurations**: Uses `.prettierrc.json` and `.prettierrc.js` files
- **Husky**: Enhanced, not replaced
- **lint-staged**: Works alongside pre-commit framework

## 🔄 CI/CD Integration

To ensure code quality in CI/CD, add this to your pipeline:

```yaml
- name: Install and Run Pre-commit
  run: |
    pip install pre-commit
    pre-commit run --all-files
```

This guarantees that no code violating quality standards can be merged.

---

## 📞 Support

If you encounter any issues with the pre-commit setup:
1. Run the test script: `node test-precommit-setup.js`
2. Check this documentation
3. Contact the development team

**Happy coding! 🎉**