import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Mobile Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should not have accessibility issues on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper touch target sizes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button, a, input[type="button"], input[type="submit"]');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const boundingBox = await button.boundingBox();
        if (boundingBox) {
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test('should support mobile keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mobileMenuButton = page.getByRole('button', { name: /menu/i });
    if (await mobileMenuButton.isVisible()) {
      await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
      
      await mobileMenuButton.click();
      await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true');
      
      const mobileMenu = page.getByRole('navigation');
      await expect(mobileMenu).toBeVisible();
      
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should have accessible mobile forms', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('form, input, textarea, select, button')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const id = await input.getAttribute('id');
        
        const hasLabel = ariaLabel || ariaLabelledby || (id && await page.locator(`label[for="${id}"]`).count() > 0);
        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test('should handle mobile orientation changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.setViewportSize({ width: 375, height: 667 });
    let accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForLoadState('networkidle');
    accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support mobile screen reader navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();

    if (headingCount > 0) {
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['heading-order'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('should have accessible mobile modals and dialogs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const settingsButton = page.getByRole('button', { name: /settings/i });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      
      await expect(modal).toHaveAttribute('aria-modal', 'true');
      
      const modalTitle = modal.locator('[id*="title"]');
      if (await modalTitle.count() > 0) {
        const titleId = await modalTitle.getAttribute('id');
        if (titleId) {
          await expect(modal).toHaveAttribute('aria-labelledby', titleId);
        }
      }
      
      await page.keyboard.press('Tab');
      const isWithinModal = await modal.locator(':focus').count() > 0;
      expect(isWithinModal).toBe(true);
      
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('should support mobile zoom up to 200%', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.setViewportSize({ width: 188, height: 334 }); // 375/2, 667/2
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    const mainContent = page.getByRole('main');
    await expect(mainContent).toBeVisible();
  });
});
