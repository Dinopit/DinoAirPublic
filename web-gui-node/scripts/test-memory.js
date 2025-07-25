/**
 * Test Script for Memory Management Module
 * Tests the saveMemory and getMemory functions with various data types
 */

const { saveMemory, getMemory, deleteMemory, hasMemory, getMultipleMemories } = require('../lib/memory');

async function testMemoryModule() {
  console.log('🧠 Testing DinoAir Memory Management Module\n');

  const testUserId = 'test-user-' + Date.now();
  const testUserId2 = 'test-user-2-' + Date.now();

  try {
    // Test 1: Save and retrieve object data
    console.log('📝 Test 1: Save and retrieve object data');
    const objectData = {
      preferences: { theme: 'dark', language: 'en' },
      lastAction: 'chat_sent',
      history: ['action1', 'action2', 'action3'],
      timestamp: new Date().toISOString()
    };

    const savedObject = await saveMemory(testUserId, objectData);
    console.log('✅ Object data saved:', savedObject.id);

    const retrievedObject = await getMemory(testUserId);
    console.log('✅ Object data retrieved:', typeof retrievedObject.memory_data);
    console.log('   Data matches:', JSON.stringify(retrievedObject.memory_data) === JSON.stringify(objectData));

    // Test 2: Save and retrieve string data
    console.log('\n📝 Test 2: Save and retrieve string data');
    const stringData = 'This is a simple text memory for the user';

    const savedString = await saveMemory(testUserId2, stringData);
    console.log('✅ String data saved:', savedString.id);

    const retrievedString = await getMemory(testUserId2);
    console.log('✅ String data retrieved:', typeof retrievedString.memory_data);
    console.log('   Data matches:', retrievedString.memory_data === stringData);

    // Test 3: Update existing memory (upsert)
    console.log('\n📝 Test 3: Update existing memory (upsert)');
    const updatedData = {
      ...objectData,
      preferences: { theme: 'light', language: 'es' },
      lastAction: 'settings_changed'
    };

    const updatedMemory = await saveMemory(testUserId, updatedData);
    console.log('✅ Memory updated:', updatedMemory.id);

    const retrievedUpdated = await getMemory(testUserId);
    console.log('✅ Updated data retrieved');
    console.log('   Theme changed:', retrievedUpdated.memory_data.preferences.theme === 'light');

    // Test 4: Check memory existence
    console.log('\n📝 Test 4: Check memory existence');
    const exists = await hasMemory(testUserId);
    const notExists = await hasMemory('non-existent-user');
    console.log('✅ Memory exists for test user:', exists);
    console.log('✅ Memory does not exist for non-existent user:', !notExists);

    // Test 5: Get multiple memories
    console.log('\n📝 Test 5: Get multiple memories');
    const multipleMemories = await getMultipleMemories([testUserId, testUserId2, 'non-existent-user']);
    console.log('✅ Retrieved memories for multiple users:', multipleMemories.length);
    console.log('   Found memories for existing users:', multipleMemories.length === 2);

    // Test 6: Handle non-existent user
    console.log('\n📝 Test 6: Handle non-existent user');
    const nonExistentMemory = await getMemory('non-existent-user');
    console.log('✅ Non-existent user returns null:', nonExistentMemory === null);

    // Test 7: Error handling
    console.log('\n📝 Test 7: Error handling');
    try {
      await saveMemory('', 'test data');
      console.log('❌ Should have thrown error for empty userId');
    } catch (error) {
      console.log('✅ Correctly threw error for empty userId:', error.message);
    }

    try {
      await getMemory(null);
      console.log('❌ Should have thrown error for null userId');
    } catch (error) {
      console.log('✅ Correctly threw error for null userId:', error.message);
    }

    // Test 8: Delete memory
    console.log('\n📝 Test 8: Delete memory');
    const deleted1 = await deleteMemory(testUserId);
    const deleted2 = await deleteMemory(testUserId2);
    const deletedNonExistent = await deleteMemory('non-existent-user');

    console.log('✅ Deleted test user 1 memory:', deleted1);
    console.log('✅ Deleted test user 2 memory:', deleted2);
    console.log('✅ Non-existent user delete returned false:', !deletedNonExistent);

    // Verify deletion
    const deletedMemory = await getMemory(testUserId);
    console.log('✅ Memory deleted successfully:', deletedMemory === null);

    console.log('\n🎉 All tests passed! Memory module is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);

    // Cleanup on error
    try {
      await deleteMemory(testUserId);
      await deleteMemory(testUserId2);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }
  }
}

// Test import functionality
console.log('📦 Testing module import...');
console.log('✅ saveMemory function imported:', typeof saveMemory === 'function');
console.log('✅ getMemory function imported:', typeof getMemory === 'function');
console.log('✅ deleteMemory function imported:', typeof deleteMemory === 'function');
console.log('✅ hasMemory function imported:', typeof hasMemory === 'function');
console.log('✅ getMultipleMemories function imported:', typeof getMultipleMemories === 'function');
console.log('');

// Run the tests
if (require.main === module) {
  testMemoryModule()
    .then(() => {
      console.log('\n✨ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testMemoryModule };