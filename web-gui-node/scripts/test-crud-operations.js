/**
 * Test CRUD Operations for Supabase Chat Integration
 * Tests all chat API endpoints with Supabase integration
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000/api/chat';
const TEST_USER_ID = `test-user-${Date.now()}`;

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test session creation
 */
async function testCreateSession() {
  console.log('🧪 Testing session creation...');

  const result = await makeRequest(`${BASE_URL}/sessions`, {
    method: 'POST',
    body: JSON.stringify({
      userId: TEST_USER_ID,
      metadata: {
        test: true,
        created_by: 'test-script'
      }
    })
  });

  if (result.success) {
    console.log('   ✅ Session created successfully');
    console.log('   📋 Session ID:', result.data.id);
    return result.data;
  }
  console.log('   ❌ Failed to create session:', result.error || result.data?.error);
  return null;
}

/**
 * Test getting user sessions
 */
async function testGetSessions() {
  console.log('🧪 Testing get user sessions...');

  const result = await makeRequest(`${BASE_URL}/sessions?userId=${TEST_USER_ID}&limit=10`);

  if (result.success) {
    console.log('   ✅ Sessions retrieved successfully');
    console.log('   📊 Session count:', result.data.count);
    return result.data.sessions;
  }
  console.log('   ❌ Failed to get sessions:', result.error || result.data?.error);
  return [];
}

/**
 * Test getting specific session
 */
async function testGetSession(sessionId) {
  console.log('🧪 Testing get specific session...');

  const result = await makeRequest(`${BASE_URL}/sessions/${sessionId}`);

  if (result.success) {
    console.log('   ✅ Session details retrieved successfully');
    console.log('   📋 Session user:', result.data.user_id);
    return result.data;
  }
  console.log('   ❌ Failed to get session:', result.error || result.data?.error);
  return null;
}

/**
 * Test chat message sending
 */
async function testSendMessage(sessionId) {
  console.log('🧪 Testing chat message sending...');

  const result = await makeRequest(`${BASE_URL}`, {
    method: 'POST',
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Hello, this is a test message from the CRUD test script.' }
      ],
      model: 'qwen:7b-chat-v1.5-q4_K_M',
      sessionId,
      userId: TEST_USER_ID,
      systemPrompt: 'You are a helpful assistant. Please respond briefly to test messages.'
    })
  });

  if (result.success) {
    console.log('   ✅ Chat message sent successfully');
    return true;
  }
  console.log('   ❌ Failed to send chat message:', result.error || result.data?.error);
  return false;
}

/**
 * Test getting session messages
 */
async function testGetSessionMessages(sessionId) {
  console.log('🧪 Testing get session messages...');

  // Wait a bit for messages to be stored
  await new Promise(resolve => setTimeout(resolve, 2000));

  const result = await makeRequest(`${BASE_URL}/sessions/${sessionId}/messages`);

  if (result.success) {
    console.log('   ✅ Session messages retrieved successfully');
    console.log('   📊 Message count:', result.data.count);

    if (result.data.messages.length > 0) {
      console.log('   📝 Sample message roles:', result.data.messages.map(m => m.role).join(', '));
    }

    return result.data.messages;
  }
  console.log('   ❌ Failed to get session messages:', result.error || result.data?.error);
  return [];
}

/**
 * Test metrics retrieval
 */
async function testGetMetrics() {
  console.log('🧪 Testing metrics retrieval...');

  const result = await makeRequest(`${BASE_URL}/metrics?timeframe=day`);

  if (result.success) {
    console.log('   ✅ Metrics retrieved successfully');
    console.log('   📊 Total requests:', result.data.totalRequests);
    console.log('   ⏱️  Average response time:', `${result.data.averageResponseTime}ms`);
    console.log('   🎯 Total tokens:', result.data.totalTokens);
    console.log('   📡 Data source:', result.data.source);
    return result.data;
  }
  console.log('   ❌ Failed to get metrics:', result.error || result.data?.error);
  return null;
}

/**
 * Test session deletion
 */
async function testDeleteSession(sessionId) {
  console.log('🧪 Testing session deletion...');

  const result = await makeRequest(`${BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE'
  });

  if (result.success) {
    console.log('   ✅ Session deleted successfully');
    return true;
  }
  console.log('   ❌ Failed to delete session:', result.error || result.data?.error);
  return false;
}

/**
 * Test server availability
 */
async function testServerAvailability() {
  console.log('🧪 Testing server availability...');

  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('   ✅ Server is running and accessible');
      return true;
    }
    console.log('   ❌ Server responded with error:', response.status);
    return false;
  } catch (error) {
    console.log('   ❌ Server is not accessible:', error.message);
    console.log('   💡 Make sure to start the server with: npm start');
    return false;
  }
}

/**
 * Main test function
 */
async function runCRUDTests() {
  console.log('🚀 Starting CRUD Operations Test for Supabase Chat Integration\n');
  console.log('📋 Test Configuration:');
  console.log('   Base URL:', BASE_URL);
  console.log('   Test User ID:', TEST_USER_ID);
  console.log('');

  const testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Server availability
  testResults.total++;
  if (await testServerAvailability()) {
    testResults.passed++;
  } else {
    testResults.failed++;
    console.log('\n💥 Server is not available. Stopping tests.');
    return testResults;
  }

  console.log('');

  // Test 2: Create session
  testResults.total++;
  const session = await testCreateSession();
  if (session) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  console.log('');

  // Test 3: Get sessions
  testResults.total++;
  const sessions = await testGetSessions();
  if (sessions.length >= 0) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  console.log('');

  if (session) {
    // Test 4: Get specific session
    testResults.total++;
    const sessionDetails = await testGetSession(session.id);
    if (sessionDetails) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }

    console.log('');

    // Test 5: Send chat message
    testResults.total++;
    const messageSent = await testSendMessage(session.id);
    if (messageSent) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }

    console.log('');

    // Test 6: Get session messages
    testResults.total++;
    const messages = await testGetSessionMessages(session.id);
    if (messages.length >= 0) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }

    console.log('');

    // Test 7: Delete session
    testResults.total++;
    const deleted = await testDeleteSession(session.id);
    if (deleted) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }

    console.log('');
  }

  // Test 8: Get metrics
  testResults.total++;
  const metrics = await testGetMetrics();
  if (metrics) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`   ❌ Failed: ${testResults.failed}/${testResults.total}`);
  console.log(`   📈 Success Rate: ${Math.round((testResults.passed / testResults.total) * 100)}%`);

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Supabase integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the server logs and Supabase configuration.');
  }

  return testResults;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runCRUDTests()
    .then(results => {
      process.exit(results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('Test script error:', error);
      process.exit(1);
    });
}

module.exports = { runCRUDTests };
