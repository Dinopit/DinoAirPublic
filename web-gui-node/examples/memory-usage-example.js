/**
 * Memory Module Usage Example
 * Demonstrates how to import and use the memory management module
 */

const { saveMemory, getMemory } = require('../lib/memory');

async function exampleUsage() {
  try {
    const userId = 'example-user-123';

    // Example 1: Save user preferences as JSON object
    console.log('💾 Saving user preferences...');
    const userPreferences = {
      theme: 'dark',
      language: 'en',
      notifications: {
        email: true,
        push: false
      },
      lastLogin: new Date().toISOString()
    };

    await saveMemory(userId, userPreferences);
    console.log('✅ User preferences saved successfully');

    // Example 2: Retrieve and use the stored data
    console.log('\n📖 Retrieving user preferences...');
    const storedMemory = await getMemory(userId);
    
    if (storedMemory) {
      console.log('✅ Memory retrieved successfully');
      console.log('User ID:', storedMemory.user_id);
      console.log('Theme preference:', storedMemory.memory_data.theme);
      console.log('Language:', storedMemory.memory_data.language);
      console.log('Last updated:', storedMemory.updated_at);
    } else {
      console.log('❌ No memory found for user');
    }

    // Example 3: Update existing memory (upsert behavior)
    console.log('\n🔄 Updating user preferences...');
    const updatedPreferences = {
      ...userPreferences,
      theme: 'light',
      notifications: {
        email: true,
        push: true
      }
    };

    await saveMemory(userId, updatedPreferences);
    console.log('✅ User preferences updated successfully');

    // Example 4: Save simple text data
    console.log('\n📝 Saving simple text memory...');
    const textUserId = 'text-user-456';
    const simpleText = 'User completed onboarding tutorial';
    
    await saveMemory(textUserId, simpleText);
    console.log('✅ Text memory saved successfully');

    const textMemory = await getMemory(textUserId);
    console.log('Retrieved text:', textMemory.memory_data);

    // Example 5: Handle non-existent user gracefully
    console.log('\n🔍 Checking non-existent user...');
    const nonExistentMemory = await getMemory('non-existent-user');
    
    if (nonExistentMemory === null) {
      console.log('✅ Correctly handled non-existent user (returned null)');
    }

    console.log('\n🎉 All examples completed successfully!');

  } catch (error) {
    console.error('❌ Error in example usage:', error.message);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  console.log('🚀 DinoAir Memory Module Usage Examples\n');
  exampleUsage();
}

module.exports = { exampleUsage };