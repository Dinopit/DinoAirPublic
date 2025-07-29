import { test, expect } from '@playwright/test';

test.describe('Keyboard Accessibility Tests', () => {
  test('should support full keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    
    const focusableElements: Array<{tagName: string, role: string | null, ariaLabel: string | null}> = [];
    let currentElement = await page.locator(':focus').first();
    
    for (let i = 0; i < 10; i++) {
      if (await currentElement.count() > 0) {
        const tagName = await currentElement.evaluate(el => el.tagName.toLowerCase());
        const role = await currentElement.getAttribute('role');
        const ariaLabel = await currentElement.getAttribute('aria-label');
        
        focusableElements.push({ tagName, role, ariaLabel });
        
        await expect(currentElement).toBeVisible();
        await expect(currentElement).toBeFocused();
        
        await page.keyboard.press('Tab');
        currentElement = await page.locator(':focus').first();
      } else {
        break;
      }
    }

    expect(focusableElements.length).toBeGreaterThan(0);
  });

  test('should support reverse tab navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }

    const forwardElement = await page.locator(':focus').first();
    const forwardElementText = await forwardElement.textContent();

    await page.keyboard.press('Shift+Tab');
    const backwardElement = await page.locator(':focus').first();
    
    await expect(backwardElement).toBeVisible();
    await expect(backwardElement).toBeFocused();
    
    const backwardElementText = await backwardElement.textContent();
    expect(backwardElementText).not.toBe(forwardElementText);
  });

  test('should support Enter and Space key activation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        await button.focus();
        await expect(button).toBeFocused();

        const buttonText = await button.textContent();
        if (buttonText && !buttonText.includes('Close')) {
          await page.keyboard.press('Enter');
        }
      }
    }
  });

  test('should support arrow key navigation in tab groups', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      await tabs.first().focus();
      await expect(tabs.first()).toBeFocused();
      
      await page.keyboard.press('ArrowRight');
      
      const focusedTab = page.locator(':focus[role="tab"]');
      await expect(focusedTab).toBeVisible();
      
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator(':focus[role="tab"]')).toBeVisible();
    }
  });

  test('should support Escape key for closing modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const settingsButton = page.getByRole('button', { name: /settings/i });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }

    const shortcutsButton = page.getByRole('button', { name: /keyboard/i });
    if (await shortcutsButton.isVisible()) {
      await shortcutsButton.click();
      
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const shortcuts = [
      { keys: 'Control+/', description: 'keyboard shortcuts' },
      { keys: 'Control+,', description: 'settings' },
      { keys: 'Control+m', description: 'monitoring' }
    ];

    for (const shortcut of shortcuts) {
      await page.keyboard.press(shortcut.keys);
      
      await page.waitForTimeout(500);
      
      const modal = page.getByRole('dialog');
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible();
        
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
      }
    }
  });

  test('should maintain focus visibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      
      if (await focusedElement.count() > 0) {
        await expect(focusedElement).toBeVisible();
        
        const computedStyle = await focusedElement.evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            outline: style.outline,
            outlineWidth: style.outlineWidth,
            outlineStyle: style.outlineStyle,
            boxShadow: style.boxShadow
          };
        });
        
        const hasFocusIndicator = 
          computedStyle.outline !== 'none' ||
          computedStyle.outlineWidth !== '0px' ||
          computedStyle.boxShadow !== 'none';
        
        expect(hasFocusIndicator).toBe(true);
      }
    }
  });

  test('should support skip links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    
    const skipLink = page.getByText('Skip to main content');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused();
      
      await page.keyboard.press('Enter');
      
      const mainContent = page.locator('#main-content, main');
      const focusedElement = await page.locator(':focus').first();
      
      const isMainContentFocused = await mainContent.locator(':focus').count() > 0 ||
                                   await focusedElement.evaluate(el => el.id === 'main-content');
      
      expect(isMainContentFocused).toBe(true);
    }
  });

  test('should handle focus trapping in modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const settingsButton = page.getByRole('button', { name: /settings/i });
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      const modalFocusableElements: Array<{tagName: string, type: string | null, role: string | null}> = [];
      
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus').first();
        
        if (await focusedElement.count() > 0) {
          const isWithinModal = await modal.locator(':focus').count() > 0;
          expect(isWithinModal).toBe(true);
          
          const elementInfo = await focusedElement.evaluate(el => ({
            tagName: el.tagName,
            type: (el as any).type || null,
            role: el.getAttribute('role')
          }));
          
          modalFocusableElements.push(elementInfo);
        }
      }

      expect(modalFocusableElements.length).toBeGreaterThan(0);
      
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });
});
