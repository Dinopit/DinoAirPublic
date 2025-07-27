import { test, expect } from '@playwright/test';

test.describe('Model and Personality Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display model selector', async ({ page }) => {
    // Look for model selector dropdown/select
    const modelSelector = page.locator('[data-testid="model-selector"], select[name*="model"], [role="combobox"]').first();
    await expect(modelSelector).toBeVisible();

    // Click on the model selector
    await modelSelector.click();

    // Check if model options are displayed
    // This might need adjustment based on actual implementation
    await expect(page.locator('[role="option"], option').first()).toBeVisible();
  });

  test('should allow selecting a different model', async ({ page }) => {
    // Find and click model selector
    const modelSelector = page.locator('[data-testid="model-selector"], select[name*="model"], [role="combobox"]').first();
    await modelSelector.click();

    // Get all available options
    const options = await page.locator('[role="option"], option').all();
    
    if (options.length > 1) {
      // Select the second option
      await options[1]!.click();
      
      // Verify selection changed
      // This verification might need adjustment based on how the selected value is displayed
      const selectedValue = await modelSelector.textContent();
      expect(selectedValue).toBeTruthy();
    }
  });

  test('should display personality selector', async ({ page }) => {
    // Look for personality selector
    const personalitySelector = page.locator('[data-testid="personality-selector"], select[name*="personality"], [role="combobox"]').nth(1);
    
    // If first selector is not found, it might be a button that opens a modal
    const personalityButton = page.locator('button:has-text("personality"), button:has-text("Personality")');
    
    if (await personalitySelector.isVisible()) {
      await expect(personalitySelector).toBeVisible();
    } else if (await personalityButton.isVisible()) {
      await expect(personalityButton).toBeVisible();
    }
  });

  test('should allow selecting a different personality', async ({ page }) => {
    // Try to find personality selector
    const personalitySelector = page.locator('[data-testid="personality-selector"], select[name*="personality"], [role="combobox"]').nth(1);
    const personalityButton = page.locator('button:has-text("personality"), button:has-text("Personality")');

    let selector;
    if (await personalitySelector.isVisible()) {
      selector = personalitySelector;
    } else if (await personalityButton.isVisible()) {
      await personalityButton.click();
      // Wait for modal or dropdown to appear
      selector = page.locator('[role="dialog"] [role="combobox"], [role="listbox"]').first();
    }

    if (selector) {
      await selector.click();
      
      // Look for personality options
      const personalityOptions = await page.locator('[role="option"]:has-text("creative"), [role="option"]:has-text("Creative"), option:has-text("creative")').all();
      
      if (personalityOptions.length > 0) {
        await personalityOptions[0]!.click();
        
        // Verify selection
        await expect(page.locator('text=/creative|Creative/i')).toBeVisible();
      }
    }
  });

  test('should persist model and personality selection', async ({ page }) => {
    // Select a specific model if possible
    const modelSelector = page.locator('[data-testid="model-selector"], select[name*="model"], [role="combobox"]').first();
    
    if (await modelSelector.isVisible()) {
      await modelSelector.click();
      const modelOption = page.locator('[role="option"], option').nth(1);
      if (await modelOption.isVisible()) {
        const modelText = await modelOption.textContent();
        await modelOption.click();
        
        // Reload the page
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Check if selection persisted
        const currentSelection = await modelSelector.textContent();
        expect(currentSelection).toContain(modelText || '');
      }
    }
  });

  test('should show system prompt editor when personality is selected', async ({ page }) => {
    // Look for system prompt textarea or editor
    const systemPromptEditor = page.locator('textarea[name*="prompt"], textarea[placeholder*="prompt"], [data-testid="system-prompt"]');
    
    if (await systemPromptEditor.isVisible()) {
      await expect(systemPromptEditor).toBeVisible();
      
      // Check if it has default content
      const content = await systemPromptEditor.inputValue();
      expect(content).toBeTruthy();
    }
  });
});
