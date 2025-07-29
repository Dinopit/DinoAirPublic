import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
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

  test('should match homepage visual appearance', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any remaining renders
    await page.waitForTimeout(1000);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-full.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('should match DinoAir GUI main interface', async ({ page }) => {
    await page.goto('/dinoair-gui');
    
    // Wait for the GUI to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait for dynamic components to load
    await page.waitForTimeout(2000);
    
    // Dismiss any onboarding tutorial if present
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    // Take full page screenshot of the main GUI
    await expect(page).toHaveScreenshot('dinoair-gui-main.png', {
      fullPage: true,
      threshold: 0.2
    });
  });

  test('should match chat interface visual appearance', async ({ page }) => {
    await page.goto('/dinoair-gui');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Close any tutorial or modal
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    // Make sure we're on the chat tab
    const chatTab = page.locator('[data-testid="chat-tab"], button:has-text("Chat"), [aria-label*="Chat"]').first();
    if (await chatTab.isVisible()) {
      await chatTab.click();
      await page.waitForTimeout(500);
    }
    
    // Take screenshot of the chat interface area
    const chatContainer = page.locator('[data-testid="chat-container"], .chat-container, main').first();
    if (await chatContainer.isVisible()) {
      await expect(chatContainer).toHaveScreenshot('chat-interface.png', {
        threshold: 0.2
      });
    } else {
      // Fallback to full page if specific container not found
      await expect(page).toHaveScreenshot('chat-interface-fallback.png', {
        fullPage: true,
        threshold: 0.2
      });
    }
  });

  test('should match artifacts view visual appearance', async ({ page }) => {
    await page.goto('/dinoair-gui');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Close any tutorial
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    // Switch to artifacts tab
    const artifactsTab = page.locator('[data-testid="artifacts-tab"], button:has-text("Artifacts"), [aria-label*="Artifacts"]').first();
    if (await artifactsTab.isVisible()) {
      await artifactsTab.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of artifacts view
      const artifactsContainer = page.locator('[data-testid="artifacts-container"], .artifacts-container, main').first();
      if (await artifactsContainer.isVisible()) {
        await expect(artifactsContainer).toHaveScreenshot('artifacts-view.png', {
          threshold: 0.2
        });
      } else {
        await expect(page).toHaveScreenshot('artifacts-view-fallback.png', {
          fullPage: true,
          threshold: 0.2
        });
      }
    }
  });

  test('should match settings panel visual appearance', async ({ page }) => {
    await page.goto('/dinoair-gui');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Close tutorial if present
    const tutorialCloseButton = page.locator('[data-testid="tutorial-close"], .tutorial-close, [aria-label="Close tutorial"]');
    if (await tutorialCloseButton.isVisible()) {
      await tutorialCloseButton.click();
      await page.waitForTimeout(500);
    }
    
    // Open settings panel
    const settingsButton = page.locator('[data-testid="settings-button"], button[aria-label*="Settings"], .settings-button').first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of settings panel
      const settingsPanel = page.locator('[data-testid="settings-panel"], .settings-panel, [role="dialog"]').first();
      if (await settingsPanel.isVisible()) {
        await expect(settingsPanel).toHaveScreenshot('settings-panel.png', {
          threshold: 0.2
        });
      }
      
      // Close settings
      const closeButton = page.locator('[data-testid="settings-close"], [aria-label="Close"], button:has-text("×")').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });
});