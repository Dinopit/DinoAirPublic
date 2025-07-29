# Visual Regression Testing Guide

This document describes the visual regression testing setup for DinoAir using Playwright's built-in visual testing capabilities.

## Overview

Visual regression testing helps catch unintended UI changes by comparing screenshots of the application against baseline images. When a visual change is detected, the test will fail and provide a diff showing what changed.

## Test Structure

### Main Visual Tests (`e2e/visual-regression.spec.ts`)
- Homepage visual appearance
- DinoAir GUI main interface
- Chat interface
- Artifacts view
- Settings panel

### Responsive Visual Tests (`e2e/responsive-visual.spec.ts`)
- Desktop layouts (1920x1080, 1366x768)
- Tablet layouts (768x1024 portrait, 1024x768 landscape)
- Mobile layouts (375x667, 414x896)
- Mobile navigation menu
- Chat input responsiveness across breakpoints
- API documentation page responsiveness

## Running Visual Tests

### Local Development

```bash
# Run all visual tests
npm run test:visual

# Run visual tests with browser UI (for debugging)
npm run test:visual:ui

# Run visual tests in headed mode
npm run test:visual:headed

# Update baseline screenshots (when UI changes are intentional)
npm run test:visual:update
```

### First Time Setup

1. **Generate baseline screenshots:**
   ```bash
   npm run test:visual:update
   ```
   This creates the initial baseline screenshots that future runs will compare against.

2. **Review generated screenshots:**
   Check the `test-results/` directory to ensure the baseline screenshots look correct.

3. **Commit baseline screenshots:**
   ```bash
   git add test-results/
   git commit -m "Add baseline screenshots for visual regression testing"
   ```

## Configuration

### Playwright Configuration (`playwright.config.ts`)

Visual testing is configured with:
- **Threshold**: 0.2 (20% pixel difference tolerance)
- **Animations**: Disabled for stable screenshots
- **Mode**: CSS mode for better stability
- **Timeout**: 10 seconds for page actions

### Browser Coverage

Tests run on:
- **Desktop**: Chromium, Firefox, WebKit
- **Mobile**: Chrome Mobile, Safari Mobile  
- **Tablet**: iPad Pro simulation

## Best Practices

### Writing Visual Tests

1. **Disable animations:**
   ```typescript
   await page.addStyleTag({
     content: `
       *, *::before, *::after {
         animation-duration: 0s !important;
         transition-duration: 0s !important;
       }
     `
   });
   ```

2. **Wait for stability:**
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForTimeout(1000); // Additional wait for renders
   ```

3. **Handle dynamic content:**
   ```typescript
   // Close tutorials/modals before screenshots
   const tutorialClose = page.locator('[data-testid="tutorial-close"]');
   if (await tutorialClose.isVisible()) {
     await tutorialClose.click();
   }
   ```

4. **Use appropriate selectors:**
   ```typescript
   // Target specific components when possible
   const chatContainer = page.locator('[data-testid="chat-container"]');
   await expect(chatContainer).toHaveScreenshot('chat.png');
   ```

### Handling Test Failures

#### When Tests Fail

1. **Review the diff:**
   - Playwright generates visual diffs in `test-results/`
   - Check if changes are intentional or bugs

2. **For intentional changes:**
   ```bash
   npm run test:visual:update
   ```

3. **For bugs:**
   - Fix the underlying issue
   - Re-run tests to verify fix

#### Common Issues

- **Flaky animations**: Ensure all animations are disabled
- **Font rendering**: Tests may fail on different OS due to font rendering differences
- **Dynamic content**: Mock or stabilize dynamic timestamps, loading states
- **Timing issues**: Increase wait times for slow-loading components

## CI/CD Integration

### Automatic Testing

Visual tests run automatically on:
- **Pull Requests**: All visual tests execute
- **Main branch pushes**: Full visual regression suite
- **Develop branch pushes**: Full visual regression suite

### Artifacts

When visual tests fail in CI:
- **Test results**: Uploaded as `visual-test-results` artifact
- **Screenshots**: Uploaded as `visual-test-screenshots` artifact
- **Diffs**: Available in the Playwright HTML report

### Approval Workflow

1. **Review failed visual tests** in CI artifacts
2. **If changes are intentional:**
   - Run `npm run test:visual:update` locally
   - Commit updated screenshots
   - Push to update the PR

3. **If changes are bugs:**
   - Fix the issue
   - Re-run CI to verify

## File Structure

```
web-gui/
├── e2e/
│   ├── visual-regression.spec.ts     # Main UI component tests
│   ├── responsive-visual.spec.ts     # Responsive design tests
│   └── [other e2e tests]
├── test-results/
│   └── [visual test artifacts]       # Generated screenshots and diffs
├── playwright.config.ts              # Playwright configuration
└── package.json                      # Visual testing scripts
```

## Responsive Testing

The visual tests cover these breakpoints:

| Device Type | Viewport Sizes | Purpose |
|-------------|---------------|---------|
| Desktop | 1920x1080, 1366x768 | Standard desktop layouts |
| Tablet | 768x1024, 1024x768 | Portrait and landscape tablet |
| Mobile | 375x667, 414x896 | Small and medium mobile screens |

## Maintenance

### Regular Tasks

1. **Review screenshots monthly** to ensure they remain accurate
2. **Update baselines** when UI intentionally changes
3. **Monitor CI failures** and address flaky tests
4. **Clean up old artifacts** from test-results directory

### Adding New Visual Tests

1. Create test in appropriate spec file
2. Use consistent naming for screenshots
3. Follow existing patterns for stability
4. Test across required breakpoints
5. Update this documentation if needed

## Troubleshooting

### Local Issues

```bash
# Clear test results and regenerate
rm -rf test-results/
npm run test:visual:update

# Debug with headed browser
npm run test:visual:headed

# Interactive debugging
npm run test:visual:ui
```

### CI Issues

- Check uploaded artifacts for diffs
- Ensure local tests pass before pushing
- Verify font and rendering consistency
- Check for race conditions in dynamic content

## Integration with Development Workflow

### Before Committing UI Changes

1. Run visual tests locally: `npm run test:visual`
2. If tests fail and changes are intentional: `npm run test:visual:update`
3. Review generated screenshots for accuracy
4. Commit both code and screenshot changes

### Code Review Process

1. Reviewer checks visual test results in CI
2. If visual tests fail, reviewer examines diffs
3. Approval required for intentional visual changes
4. Automatic failure blocks merge for unintended changes

This visual regression testing setup ensures UI consistency and catches unintended visual changes early in the development process.