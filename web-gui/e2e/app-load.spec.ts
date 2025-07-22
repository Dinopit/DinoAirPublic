import { test, expect } from '@playwright/test';

test.describe('Application Loading', () => {
  test('should load the application successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the main content to be visible
    await page.waitForLoadState('networkidle');

    // Check that the main elements are present
    await expect(page.locator('main')).toBeVisible();
    
    // Check for the presence of key UI elements
    await expect(page.getByText(/DinoAir/i)).toBeVisible();
    
    // Check that chat interface elements are present
    await expect(page.getByPlaceholder('Type your message...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  });

  test('should display error boundary on error', async ({ page }) => {
    // Navigate to a non-existent route
    await page.goto('/non-existent-route');

    // Check if 404 or appropriate error handling is shown
    // This depends on your Next.js error handling setup
    await expect(page.locator('body')).toContainText(/404|not found/i);
  });

  test('should have responsive layout', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('main')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('main')).toBeVisible();
  });

  test('should load with correct metadata', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/DinoAir/);

    // Check meta description if present
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    if (metaDescription) {
      expect(metaDescription).toContain('AI');
    }
  });
});