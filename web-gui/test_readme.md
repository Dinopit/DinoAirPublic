# DinoAir Web GUI - Test Suite Documentation

This document provides comprehensive information about the test suite for the DinoAir web GUI application.

## Table of Contents

1. [Overview](test_readme.md#overview)
2. [Test Structure](test_readme.md#test-structure)
3. [Prerequisites](test_readme.md#prerequisites)
4. [Running Tests](test_readme.md#running-tests)
5. [Test Categories](test_readme.md#test-categories)
6. [Writing Tests](test_readme.md#writing-tests)
7. [Best Practices](test_readme.md#best-practices)
8. [Troubleshooting](test_readme.md#troubleshooting)

## Overview

The DinoAir web GUI uses a comprehensive testing strategy with three levels of testing:

* **Unit Tests**: Test individual components and hooks in isolation
* **Integration Tests**: Test API routes and service interactions
* **E2E Tests**: Test complete user workflows in a real browser
* **Visual Regression Tests**: Test UI appearance and prevent visual bugs

### Testing Stack

* **Jest**: Unit and integration testing framework
* **React Testing Library**: Component testing utilities
* **Playwright**: End-to-end testing framework
* **TypeScript**: Type-safe test code

## Test Structure

```
web-gui/
├── __tests__/                    # Global test files
├── components/
│   └── __tests__/               # Component unit tests
├── hooks/
│   └── __tests__/               # Hook unit tests
├── app/api/v1/
│   ├── models/__tests__/        # API route tests
│   └── personalities/__tests__/
├── e2e/                         # End-to-end tests
├── tests/utils/                 # Test utilities and helpers
├── jest.config.js               # Jest configuration
├── jest.setup.js                # Jest setup file
└── playwright.config.ts         # Playwright configuration
```

## Prerequisites

Before running tests, ensure you have:

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3.  All dependencies installed:

    ```bash
    npm install
    ```
4.  For E2E tests, Playwright browsers installed:

    ```bash
    npx playwright install
    ```

## Running Tests

### Unit and Integration Tests (Jest)

```bash
# Run all Jest tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- useChat.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should send message"
```

### End-to-End Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Run E2E tests with UI mode (interactive)
npm run test:e2e:ui

# Run specific E2E test file
npm run test:e2e -- app-load.spec.ts

# Run E2E tests in specific browser
npm run test:e2e -- --project=chromium
```

### Run All Tests

```bash
# Run unit tests followed by E2E tests
npm test && npm run test:e2e

# Run all tests including visual regression
npm test && npm run test:e2e && npm run test:visual
```

## Test Categories

### 1. Unit Tests

#### Component Tests

Located in `components/__tests__/`

* **ErrorBoundary.test.tsx**: Tests error handling and recovery
* **ChatInput.test.tsx**: Tests message input functionality
* **ChatMessages.test.tsx**: Tests message display and scrolling

#### Hook Tests

Located in `hooks/__tests__/`

* **useChat.test.ts**: Tests chat messaging logic and streaming
* **useConversations.test.ts**: Tests conversation management
* **useModels.test.ts**: Tests model selection and fetching
* **usePersonalities.test.ts**: Tests personality management
* **useArtifacts.test.ts**: Tests artifact creation and notifications

### 2. Integration Tests

#### API Route Tests

Located in `app/api/v1/*/tests/`

* **models/route.test.ts**: Tests model listing API
* **personalities/route.test.ts**: Tests personalities API

### 3. E2E Tests

Located in `e2e/`

* **app-load.spec.ts**: Tests application loading and basic UI
* **model-personality-selection.spec.ts**: Tests AI configuration
* **chat-interaction.spec.ts**: Tests chat functionality
* **visual-regression.spec.ts**: Tests UI visual appearance
* **responsive-visual.spec.ts**: Tests responsive design breakpoints

## Writing Tests

### Unit Test Example

```typescript
import { renderHook, act } from '@testing-library/react';
import { useModels } from '../useModels';

describe('useModels', () => {
  it('should fetch models on mount', async () => {
    const { result } = renderHook(() => useModels());
    
    expect(result.current.isLoadingModels).toBe(true);
    
    await waitFor(() => {
      expect(result.current.models).toHaveLength(2);
    });
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should send a chat message', async ({ page }) => {
  await page.goto('/');
  
  const chatInput = page.getByPlaceholder('Type your message...');
  await chatInput.fill('Hello!');
  await chatInput.press('Enter');
  
  await expect(page.locator('text="Hello!"')).toBeVisible();
});
```

## Best Practices

### 1. Test Organization

* Keep tests close to the code they test
* Use descriptive test names that explain the expected behavior
* Group related tests using `describe` blocks
* Follow the AAA pattern: Arrange, Act, Assert

### 2. Test Isolation

* Each test should be independent
* Clean up after tests (clear mocks, localStorage, etc.)
* Use `beforeEach` and `afterEach` for setup/teardown

### 3. Mocking

* Mock external dependencies (API calls, timers, etc.)
* Use test utilities from `tests/utils/`
* Keep mocks simple and focused

### 4. Async Testing

* Always wait for async operations to complete
* Use `waitFor` for eventual consistency
* Set appropriate timeouts for E2E tests

### 5. Accessibility

* Test keyboard navigation
* Verify ARIA attributes
* Test with screen readers when possible

## Coverage Goals

Aim for the following coverage targets:

* **Overall**: 80%+
* **Hooks**: 90%+ (critical business logic)
* **Components**: 80%+
* **API Routes**: 85%+
* **Utilities**: 90%+

View coverage report:

```bash
npm run test:coverage
# Open coverage/lcov-report/index.html in browser
```

## Troubleshooting

### Common Issues

1. **Tests timing out**
   * Increase timeout in test: `test('...', async () => {}, 30000)`
   * Check for missing `await` statements
   * Verify mock implementations
2. **Flaky E2E tests**
   * Add explicit waits: `await page.waitForLoadState('networkidle')`
   * Use more specific selectors
   * Check for race conditions
3. **Module not found errors**
   * Verify path aliases in `jest.config.js`
   * Check TypeScript configuration
   * Clear Jest cache: `npm test -- --clearCache`
4. **Playwright browser issues**
   * Reinstall browsers: `npx playwright install --force`
   * Check system requirements
   * Try different browser: `--project=firefox`

### Debug Mode

```bash
# Jest debug mode
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Playwright debug mode
PWDEBUG=1 npm run test:e2e
```

## Continuous Integration

The test suite is designed to run in CI environments:

```yaml
# Example GitHub Actions workflow
- name: Run Unit Tests
  run: npm test -- --ci --coverage

- name: Run E2E Tests
  run: npm run test:e2e -- --reporter=github
```

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure all tests pass locally
3. Add appropriate test documentation
4. Update coverage thresholds if needed

## Resources

* [Jest Documentation](https://jestjs.io/docs/getting-started)
* [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
* [Playwright Documentation](https://playwright.dev/docs/intro)
* [Visual Testing with Playwright](https://playwright.dev/docs/test-screenshots)
* [Testing Best Practices](https://testingjavascript.com/)
* [Visual Testing Guide](docs/visual_testing.md)
