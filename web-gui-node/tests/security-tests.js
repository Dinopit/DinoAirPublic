/**
 * Comprehensive Security Tests
 * Tests for CSP, file upload security, and rate limiting
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || null;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Helper function to log test results
 */
function logTest(testName, passed, message = '') {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}: ${message}`);
    testResults.failed++;
    testResults.errors.push({ test: testName, message });
  }
}

/**
 * Helper function to make authenticated requests
 */
function createAuthenticatedClient() {
  return axios.create({
    baseURL: BASE_URL,
    headers: TEST_USER_TOKEN ? {
      Authorization: `Bearer ${TEST_USER_TOKEN}`
    } : {}
  });
}

/**
 * Test CSP Headers and Nonce Generation
 */
async function testCSPHeaders() {
  console.log('\n🔒 Testing Content Security Policy...');

  try {
    const response = await axios.get(`${BASE_URL}/`);

    // Test CSP header presence
    const cspHeader = response.headers['content-security-policy'];
    logTest('CSP Header Present', Boolean(cspHeader), 'CSP header not found');

    if (cspHeader) {
      // Test nonce-based script execution
      const hasNonce = cspHeader.includes("'nonce-");
      logTest('Nonce-based Script Execution', hasNonce, 'Nonce not found in CSP');

      // Test strict directives
      const hasStrictDefault = cspHeader.includes("default-src 'self'");
      logTest('Strict Default Source', hasStrictDefault, 'Default source not restricted to self');

      // Test frame protection
      const hasFrameProtection = cspHeader.includes("frame-src 'none'") || cspHeader.includes("frame-ancestors 'none'");
      logTest('Frame Protection', hasFrameProtection, 'Frame protection not configured');

      // Test object restriction
      const hasObjectRestriction = cspHeader.includes("object-src 'none'");
      logTest('Object Source Restriction', hasObjectRestriction, 'Object sources not restricted');
    }

    // Test additional security headers
    const hasXContentTypeOptions = response.headers['x-content-type-options'] === 'nosniff';
    logTest('X-Content-Type-Options Header', hasXContentTypeOptions, 'X-Content-Type-Options not set to nosniff');

    const hasXFrameOptions = response.headers['x-frame-options'];
    logTest('X-Frame-Options Header', Boolean(hasXFrameOptions), 'X-Frame-Options header not present');

    const hasHSTS = response.headers['strict-transport-security'];
    logTest('HSTS Header', Boolean(hasHSTS), 'HSTS header not present');

    // Test Report-To header
    const hasReportTo = response.headers['report-to'];
    logTest('Report-To Header', Boolean(hasReportTo), 'Report-To header not present');
  } catch (error) {
    logTest('CSP Headers Test', false, `Request failed: ${error.message}`);
  }
}

/**
 * Test CSP Violation Reporting
 */
async function testCSPViolationReporting() {
  console.log('\n📊 Testing CSP Violation Reporting...');

  try {
    const violationReport = {
      'document-uri': 'http://localhost:3000/test',
      referrer: '',
      'violated-directive': 'script-src',
      'effective-directive': 'script-src',
      'original-policy': "default-src 'self'",
      'blocked-uri': 'eval',
      'status-code': 200
    };

    const response = await axios.post(`${BASE_URL}/api/security/csp-violation-report`, violationReport, {
      headers: { 'Content-Type': 'application/json' }
    });

    logTest('CSP Violation Reporting Endpoint', response.status === 204, `Expected 204, got ${response.status}`);
  } catch (error) {
    logTest('CSP Violation Reporting', false, `Request failed: ${error.message}`);
  }
}

/**
 * Test File Upload Security
 */
async function testFileUploadSecurity() {
  console.log('\n📁 Testing File Upload Security...');

  if (!TEST_USER_TOKEN) {
    logTest('File Upload Security Tests', false, 'TEST_USER_TOKEN required for authenticated tests');
    return;
  }

  const client = createAuthenticatedClient();

  // Test 1: Valid file upload
  try {
    const validContent = 'console.log("Hello, World!");';
    const form = new FormData();
    form.append('files', Buffer.from(validContent), {
      filename: 'test.js',
      contentType: 'text/javascript'
    });

    const response = await client.post('/api/v1/artifacts/bulk-import', form, {
      headers: form.getHeaders()
    });

    logTest('Valid File Upload', response.status === 200, `Expected 200, got ${response.status}`);

    if (response.data.storageStats) {
      logTest('Storage Stats in Response', true);
    }
  } catch (error) {
    logTest('Valid File Upload', false, `Request failed: ${error.message}`);
  }

  // Test 2: Dangerous file extension
  try {
    const maliciousContent = 'echo "malicious"';
    const form = new FormData();
    form.append('files', Buffer.from(maliciousContent), {
      filename: 'malicious.exe',
      contentType: 'application/octet-stream'
    });

    const response = await client.post('/api/v1/artifacts/bulk-import', form, {
      headers: form.getHeaders()
    });

    logTest('Dangerous File Extension Blocked', response.status === 400, 'Dangerous file extension not blocked');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Dangerous File Extension Blocked', true);
    } else {
      logTest('Dangerous File Extension Blocked', false, `Unexpected error: ${error.message}`);
    }
  }

  // Test 3: Invalid MIME type
  try {
    const content = 'test content';
    const form = new FormData();
    form.append('files', Buffer.from(content), {
      filename: 'test.txt',
      contentType: 'application/x-executable'
    });

    const response = await client.post('/api/v1/artifacts/bulk-import', form, {
      headers: form.getHeaders()
    });

    logTest('Invalid MIME Type Blocked', response.status === 400, 'Invalid MIME type not blocked');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      logTest('Invalid MIME Type Blocked', true);
    } else {
      logTest('Invalid MIME Type Blocked', false, `Unexpected error: ${error.message}`);
    }
  }

  // Test 4: File size limit
  try {
    const largeContent = 'x'.repeat(100 * 1024 * 1024 + 1); // 100MB + 1 byte
    const form = new FormData();
    form.append('files', Buffer.from(largeContent), {
      filename: 'large.txt',
      contentType: 'text/plain'
    });

    const response = await client.post('/api/v1/artifacts/bulk-import', form, {
      headers: form.getHeaders()
    });

    logTest('File Size Limit Enforced', response.status === 413 || response.status === 400, 'File size limit not enforced');
  } catch (error) {
    if (error.response && (error.response.status === 413 || error.response.status === 400)) {
      logTest('File Size Limit Enforced', true);
    } else {
      logTest('File Size Limit Enforced', false, `Unexpected error: ${error.message}`);
    }
  }
}

/**
 * Test Rate Limiting
 */
async function testRateLimiting() {
  console.log('\n⏱️ Testing Rate Limiting...');

  const client = createAuthenticatedClient();

  // Test 1: Rate limit headers
  try {
    const response = await client.get('/api/v1/artifacts');

    const hasRateLimitHeaders = response.headers['x-ratelimit-limit']
                               && response.headers['x-ratelimit-remaining'];
    logTest('Rate Limit Headers Present', hasRateLimitHeaders, 'Rate limit headers not found');

    const hasCustomHeaders = response.headers['x-ratelimit-category']
                            && response.headers['x-ratelimit-tier'];
    logTest('Custom Rate Limit Headers', hasCustomHeaders, 'Custom rate limit headers not found');
  } catch (error) {
    logTest('Rate Limit Headers', false, `Request failed: ${error.message}`);
  }

  // Test 2: Rate limiting enforcement (for upload endpoints)
  if (TEST_USER_TOKEN) {
    console.log('Testing upload rate limiting...');

    let rateLimitHit = false;
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const form = new FormData();
        form.append('files', Buffer.from('test'), {
          filename: `test${i}.txt`,
          contentType: 'text/plain'
        });

        const response = await client.post('/api/v1/artifacts/bulk-import', form, {
          headers: form.getHeaders()
        });

        if (response.status === 429) {
          rateLimitHit = true;
          break;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        if (error.response && error.response.status === 429) {
          rateLimitHit = true;
          break;
        }
      }
    }

    logTest('Upload Rate Limiting Enforced', rateLimitHit, 'Rate limiting not enforced after multiple requests');
  }

  // Test 3: Different rate limits for different endpoints
  try {
    const authResponse = await axios.post(`${BASE_URL}/api/auth/signin`, {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
  } catch (error) {
    if (error.response) {
      const authRateLimit = error.response.headers['x-ratelimit-category'];
      logTest('Auth Endpoint Rate Limit Category', authRateLimit === 'auth', 'Auth endpoint not using auth rate limit category');
    }
  }
}

/**
 * Test Secure Download Headers
 */
async function testSecureDownloadHeaders() {
  console.log('\n⬇️ Testing Secure Download Headers...');

  try {
    // This would need a valid artifact ID in a real test
    const response = await axios.get(`${BASE_URL}/api/v1/artifacts/export/single/test-id`, {
      validateStatus: () => true // Don't throw on 404
    });

    if (response.status === 404) {
      logTest('Export Endpoint Accessible', true, 'Endpoint returns 404 as expected for invalid ID');
    }

    // Check if rate limit headers are present even on 404
    const hasExportRateLimit = response.headers['x-ratelimit-category'] === 'export';
    logTest('Export Rate Limit Category', hasExportRateLimit, 'Export endpoint not using export rate limit category');
  } catch (error) {
    logTest('Secure Download Headers', false, `Request failed: ${error.message}`);
  }
}

/**
 * Run all security tests
 */
async function runAllTests() {
  console.log('🚀 Starting Security Tests...');
  console.log(`Testing against: ${BASE_URL}`);

  if (TEST_USER_TOKEN) {
    console.log('✅ Using authenticated test token');
  } else {
    console.log('⚠️ No test token provided - some tests will be skipped');
  }

  await testCSPHeaders();
  await testCSPViolationReporting();
  await testFileUploadSecurity();
  await testRateLimiting();
  await testSecureDownloadHeaders();

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.message}`);
    });
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testCSPHeaders,
  testFileUploadSecurity,
  testRateLimiting
};
