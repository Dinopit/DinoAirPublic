import { test, expect } from '@playwright/test';

test.describe('Responsive Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Disable animations for stable screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  // Desktop breakpoints
  test('should match desktop layout at 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dinoair-gui');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Close tutorial if present
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    await expect(page).toHaveScreenshot('desktop-1920x1080.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('should match desktop layout at 1366x768', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/dinoair-gui');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    await expect(page).toHaveScreenshot('desktop-1366x768.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  // Tablet breakpoints
  test('should match tablet layout in portrait', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dinoair-gui');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    await expect(page).toHaveScreenshot('tablet-portrait-768x1024.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('should match tablet layout in landscape', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/dinoair-gui');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    await expect(page).toHaveScreenshot('tablet-landscape-1024x768.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  // Mobile breakpoints
  test('should match mobile layout at 375x667 (iPhone SE)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dinoair-gui');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    await expect(page).toHaveScreenshot('mobile-375x667.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('should match mobile layout at 414x896 (iPhone XR)', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto('/dinoair-gui');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    await expect(page).toHaveScreenshot('mobile-414x896.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('should match mobile navigation menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dinoair-gui');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    // Try to open mobile menu
    const menuButton = page.locator('[data-testid="mobile-menu-button"], button[aria-label*="Menu"], .mobile-menu-button').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('mobile-menu-open.png', {
        fullPage: true,
        threshold: 0.2
      });
    }
  });

  // Test key UI components at different breakpoints
  test('should match chat input responsiveness', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/dinoair-gui');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
      if (await tutorialCloseButton.isVisible()) {
        await tutorialCloseButton.click();
        await page.waitForTimeout(500);
      }
      
      // Focus on chat input area if available
      const chatInput = page.locator('[data-testid="chat-input"], textarea, input[type="text"]').first();
      if (await chatInput.isVisible()) {
        await chatInput.click();
        await page.waitForTimeout(500);
        
        // Take screenshot of the focused input area
        const inputContainer = page.locator('[data-testid="chat-input-container"], .chat-input, .input-container').first();
        if (await inputContainer.isVisible()) {
          await expect(inputContainer).toHaveScreenshot(`chat-input-${viewport.name}-${viewport.width}x${viewport.height}.png`, {
            threshold: 0.2
          });
        }
      }
    }
  });

  test('should match API documentation page responsiveness', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/api-docs');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot(`api-docs-${viewport.name}-${viewport.width}x${viewport.height}.png`, {
        fullPage: true,
        threshold: 0.2
      });
    }
  });
});
