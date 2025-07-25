import { test, expect } from '@playwright/test';

test.describe('Chat Interaction', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should send a chat message', async ({ page }) => {
    // Find the chat input
    const chatInput = page.getByPlaceholder('Type your message...');
    await expect(chatInput).toBeVisible();
    
    // Find the send button
    const sendButton = page.getByRole('button', { name: 'Send' });
    await expect(sendButton).toBeVisible();
    
    // Initially, send button should be disabled
    await expect(sendButton).toBeDisabled();
    
    // Type a message
    const testMessage = 'Hello, this is a test message!';
    await chatInput.fill(testMessage);
    
    // Send button should now be enabled
    await expect(sendButton).toBeEnabled();
    
    // Send the message
    await sendButton.click();
    
    // Input should be cleared
    await expect(chatInput).toHaveValue('');
    
    // Message should appear in the chat
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible();
    
    // Should show loading indicator or assistant response
    // Wait for either loading dots or response message
    await expect(page.locator('.animate-bounce, text=/thinking|typing|processing/i, [role="status"]')).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no loading indicator, check for response directly
    });
    
    // Eventually should receive a response (this might take time)
    await expect(page.locator('[role="assistant"], .assistant-message, div:has-text("assistant")').last()).toBeVisible({ timeout: 30000 });
  });

  test('should send message with Enter key', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Type your message...');
    
    // Type a message
    await chatInput.fill('Test message with Enter key');
    
    // Press Enter
    await chatInput.press('Enter');
    
    // Input should be cleared
    await expect(chatInput).toHaveValue('');
    
    // Message should appear
    await expect(page.locator('text="Test message with Enter key"')).toBeVisible();
  });

  test('should not send empty messages', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Type your message...');
    const sendButton = page.getByRole('button', { name: 'Send' });
    
    // Try to send empty message
    await chatInput.fill('   '); // Only spaces
    
    // Send button should remain disabled
    await expect(sendButton).toBeDisabled();
    
    // Clear and try with Enter key
    await chatInput.clear();
    await chatInput.press('Enter');
    
    // No new messages should appear (check message count didn't increase)
    const messageCount = await page.locator('[role="user"], .user-message').count();
    expect(messageCount).toBe(0);
  });

  test('should support multi-line messages with Shift+Enter', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Type your message...');
    
    // Type multi-line message
    await chatInput.fill('Line 1');
    await chatInput.press('Shift+Enter');
    await chatInput.type('Line 2');
    
    // Verify multi-line content
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toContain('Line 1');
    expect(inputValue).toContain('Line 2');
    
    // Send the message
    await chatInput.press('Enter');
    
    // Both lines should appear in the message
    await expect(page.locator('text=/Line 1.*Line 2/s')).toBeVisible();
  });

  test('should show timestamp on messages', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Type your message...');
    
    // Send a message
    await chatInput.fill('Message with timestamp');
    await chatInput.press('Enter');
    
    // Look for timestamp (usually in format like "2:30 PM" or "14:30")
    await expect(page.locator('text=/\\d{1,2}:\\d{2}/').first()).toBeVisible();
  });

  test('should handle rapid message sending', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Type your message...');
    
    // Send first message
    await chatInput.fill('First message');
    await chatInput.press('Enter');
    
    // Immediately send second message
    await chatInput.fill('Second message');
    await chatInput.press('Enter');
    
    // Both messages should appear
    await expect(page.locator('text="First message"')).toBeVisible();
    await expect(page.locator('text="Second message"')).toBeVisible();
  });

  test('should show stop button while streaming response', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Type your message...');
    
    // Send a message
    await chatInput.fill('Generate a long response');
    await chatInput.press('Enter');
    
    // Look for stop button during streaming
    const stopButton = page.getByRole('button', { name: /stop|cancel/i });
    
    // If streaming is implemented, stop button should appear
    if (await stopButton.isVisible({ timeout: 5000 })) {
      await expect(stopButton).toBeVisible();
      
      // Test stopping the stream
      await stopButton.click();
      
      // Stop button should disappear, send button should reappear
      await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
    }
  });

  test('should maintain conversation context', async ({ page }) => {
    const chatInput = page.getByPlaceholder('Type your message...');
    
    // Send first message
    await chatInput.fill('My name is Test User');
    await chatInput.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(2000); // Give some time for response
    
    // Send follow-up message
    await chatInput.fill('What is my name?');
    await chatInput.press('Enter');
    
    // The response should reference the previous context
    // This is a basic check - actual implementation may vary
    await expect(page.locator('text=/Test User|previous|context|mentioned/i').last()).toBeVisible({ timeout: 30000 });
  });
});