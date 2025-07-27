/**
 * Test Script for Streaming Export Functionality
 * Tests the new streaming export service and API endpoints
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const EventSource = require('eventsource');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'test-api-key';

// Test data
const testArtifacts = [
  {
    name: 'small-component.tsx',
    type: 'typescriptreact',
    content: 'import React from "react";\n\nconst SmallComponent = () => {\n  return <div>Small</div>;\n};\n\nexport default SmallComponent;',
    tags: ['react', 'typescript', 'small']
  },
  {
    name: 'medium-script.py',
    type: 'python',
    content: `# Medium Python script\n${'print("Hello World")\n'.repeat(100)}`,
    tags: ['python', 'script']
  },
  {
    name: 'large-data.json',
    type: 'json',
    content: JSON.stringify({ data: Array(1000).fill().map((_, i) => ({ id: i, value: `item-${i}` })) }, null, 2),
    tags: ['json', 'data', 'large']
  }
];

// Generate large test content for streaming tests
const largeContent = 'console.log("Large file content");\n'.repeat(10000);
const largeArtifacts = Array(60).fill().map((_, i) => ({
  name: `large-file-${i}.js`,
  type: 'javascript',
  content: largeContent,
  tags: ['javascript', 'large', 'generated']
}));

class StreamingExportTester {
  constructor() {
    this.createdArtifacts = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Log test result
   */
  logTest(name, passed, message = '') {
    const result = { name, passed, message, timestamp: new Date().toISOString() };
    this.testResults.tests.push(result);

    if (passed) {
      this.testResults.passed++;
      console.log(`✅ ${name}: ${message}`);
    } else {
      this.testResults.failed++;
      console.log(`❌ ${name}: ${message}`);
    }
  }

  /**
   * Make API request with authentication
   */
  async apiRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();
      return { response, data };
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  /**
   * Create test artifacts
   */
  async createTestArtifacts(artifacts) {
    console.log(`\n📝 Creating ${artifacts.length} test artifacts...`);

    for (const artifact of artifacts) {
      try {
        const { response, data } = await this.apiRequest('/api/v1/artifacts', {
          method: 'POST',
          body: JSON.stringify(artifact)
        });

        if (response.ok && data.artifact) {
          this.createdArtifacts.push(data.artifact.id);
          console.log(`Created artifact: ${artifact.name} (${data.artifact.id})`);
        } else {
          console.error(`Failed to create artifact ${artifact.name}:`, data.error);
        }
      } catch (error) {
        console.error(`Error creating artifact ${artifact.name}:`, error.message);
      }
    }

    this.logTest('Create Test Artifacts', this.createdArtifacts.length > 0,
      `Created ${this.createdArtifacts.length} artifacts`);
  }

  /**
   * Test small export (backwards compatibility)
   */
  async testSmallExport() {
    console.log('\n🔄 Testing small export (backwards compatibility)...');

    try {
      const smallArtifactIds = this.createdArtifacts.slice(0, 3);

      const { response, data } = await this.apiRequest('/api/v1/artifacts/export/bulk', {
        method: 'POST',
        body: JSON.stringify({
          artifactIds: smallArtifactIds,
          includeManifest: true,
          useStreaming: false // Force synchronous export
        })
      });

      if (response.ok && response.headers.get('content-type') === 'application/zip') {
        const exportType = response.headers.get('x-export-type');
        this.logTest('Small Export Backwards Compatibility',
          exportType === 'synchronous',
          'Synchronous export works correctly');
      } else {
        this.logTest('Small Export Backwards Compatibility', false,
          `Expected ZIP file, got: ${response.headers.get('content-type')}`);
      }
    } catch (error) {
      this.logTest('Small Export Backwards Compatibility', false, error.message);
    }
  }

  /**
   * Test large export with streaming
   */
  async testLargeExport() {
    console.log('\n🚀 Testing large export with streaming...');

    try {
      const { response, data } = await this.apiRequest('/api/v1/artifacts/export/bulk', {
        method: 'POST',
        body: JSON.stringify({
          artifactIds: this.createdArtifacts,
          includeManifest: true,
          useStreaming: true // Force streaming export
        })
      });

      if (response.ok && data.streaming === true) {
        this.logTest('Large Export Streaming Initiation', true,
          `Job started: ${data.data.jobId}`);

        // Test progress tracking
        await this.testProgressTracking(data.data.jobId);
      } else {
        this.logTest('Large Export Streaming Initiation', false,
          `Expected streaming response, got: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.logTest('Large Export Streaming Initiation', false, error.message);
    }
  }

  /**
   * Test progress tracking with SSE
   */
  async testProgressTracking(jobId) {
    console.log(`\n📊 Testing progress tracking for job: ${jobId}...`);

    return new Promise(resolve => {
      const eventSource = new EventSource(`${BASE_URL}/api/v1/export-progress/stream/${jobId}`, {
        headers: { 'X-API-Key': API_KEY }
      });

      let progressReceived = false;
      let completedReceived = false;
      const timeout = setTimeout(() => {
        eventSource.close();
        this.logTest('SSE Progress Tracking', false, 'Timeout waiting for progress updates');
        resolve();
      }, 60000); // 60 second timeout

      eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'progress') {
            progressReceived = true;
            console.log(`Progress: ${data.data.progress}% (${data.data.processedItems}/${data.data.totalItems})`);
          } else if (data.type === 'completed') {
            completedReceived = true;
            console.log(`Export completed: ${data.data.downloadUrl}`);

            // Test download
            this.testDownload(jobId, data.data.downloadUrl);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = error => {
        console.error('SSE Error:', error);
        eventSource.close();
        clearTimeout(timeout);
        this.logTest('SSE Progress Tracking', false, 'SSE connection error');
        resolve();
      };

      eventSource.addEventListener('close', () => {
        eventSource.close();
        clearTimeout(timeout);

        if (completedReceived) {
          this.logTest('SSE Progress Tracking', true, 'Received progress and completion events');
        } else if (progressReceived) {
          this.logTest('SSE Progress Tracking', true, 'Received progress events');
        } else {
          this.logTest('SSE Progress Tracking', false, 'No progress events received');
        }

        resolve();
      });
    });
  }

  /**
   * Test polling fallback
   */
  async testPollingFallback(jobId) {
    console.log(`\n🔄 Testing polling fallback for job: ${jobId}...`);

    try {
      const { response, data } = await this.apiRequest(`/api/v1/export-progress/poll/${jobId}`);

      if (response.ok && data.success && data.data) {
        this.logTest('Polling Fallback', true,
          `Status: ${data.data.status}, Progress: ${data.data.progress}%`);
      } else {
        this.logTest('Polling Fallback', false,
          `Unexpected response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.logTest('Polling Fallback', false, error.message);
    }
  }

  /**
   * Test download functionality
   */
  async testDownload(jobId, downloadUrl) {
    console.log(`\n⬇️ Testing download for job: ${jobId}...`);

    try {
      const response = await fetch(`${BASE_URL}${downloadUrl}`, {
        headers: { 'X-API-Key': API_KEY }
      });

      if (response.ok && response.headers.get('content-type') === 'application/zip') {
        const contentLength = response.headers.get('content-length');
        this.logTest('Download Functionality', true,
          `Downloaded ZIP file (${contentLength} bytes)`);

        // Test range request (resumable download)
        await this.testRangeRequest(jobId);
      } else {
        this.logTest('Download Functionality', false,
          `Expected ZIP file, got: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.logTest('Download Functionality', false, error.message);
    }
  }

  /**
   * Test range requests for resumable downloads
   */
  async testRangeRequest(jobId) {
    console.log(`\n📦 Testing range requests for job: ${jobId}...`);

    try {
      const response = await fetch(`${BASE_URL}/api/v1/export-progress/download/${jobId}`, {
        headers: {
          'X-API-Key': API_KEY,
          Range: 'bytes=0-1023' // First 1KB
        }
      });

      if (response.status === 206) {
        const contentRange = response.headers.get('content-range');
        this.logTest('Range Request Support', true,
          `Partial content: ${contentRange}`);
      } else {
        this.logTest('Range Request Support', false,
          `Expected 206 status, got: ${response.status}`);
      }
    } catch (error) {
      this.logTest('Range Request Support', false, error.message);
    }
  }

  /**
   * Test API documentation accessibility
   */
  async testApiDocumentation() {
    console.log('\n📚 Testing API documentation accessibility...');

    try {
      // Test OpenAPI spec endpoint
      const { response: specResponse } = await this.apiRequest('/api/openapi');

      if (specResponse.ok) {
        this.logTest('OpenAPI Spec Accessibility', true, 'OpenAPI spec is accessible');
      } else {
        this.logTest('OpenAPI Spec Accessibility', false,
          `OpenAPI spec not accessible: ${specResponse.status}`);
      }

      // Test Swagger UI endpoint
      const docsResponse = await fetch(`${BASE_URL}/docs/v1`);

      if (docsResponse.ok) {
        this.logTest('Swagger UI Accessibility', true, 'Swagger UI is accessible');
      } else {
        this.logTest('Swagger UI Accessibility', false,
          `Swagger UI not accessible: ${docsResponse.status}`);
      }
    } catch (error) {
      this.logTest('API Documentation', false, error.message);
    }
  }

  /**
   * Clean up test artifacts
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test artifacts...');

    for (const artifactId of this.createdArtifacts) {
      try {
        await this.apiRequest(`/api/v1/artifacts/${artifactId}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error(`Error deleting artifact ${artifactId}:`, error.message);
      }
    }

    console.log(`Cleaned up ${this.createdArtifacts.length} test artifacts`);
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Streaming Export Tests...\n');

    try {
      // Create test artifacts
      await this.createTestArtifacts([...testArtifacts, ...largeArtifacts.slice(0, 10)]);

      if (this.createdArtifacts.length === 0) {
        console.error('❌ No test artifacts created. Cannot proceed with tests.');
        return;
      }

      // Run tests
      await this.testSmallExport();
      await this.testLargeExport();
      await this.testApiDocumentation();

      // Clean up
      await this.cleanup();

      // Print results
      console.log('\n📊 Test Results Summary:');
      console.log(`✅ Passed: ${this.testResults.passed}`);
      console.log(`❌ Failed: ${this.testResults.failed}`);
      console.log(`📝 Total: ${this.testResults.tests.length}`);

      if (this.testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        this.testResults.tests
          .filter(test => !test.passed)
          .forEach(test => console.log(`  - ${test.name}: ${test.message}`));
      }

      // Save detailed results
      const resultsFile = path.join(__dirname, '..', 'test-results', 'streaming-export-results.json');
      fs.mkdirSync(path.dirname(resultsFile), { recursive: true });
      fs.writeFileSync(resultsFile, JSON.stringify(this.testResults, null, 2));
      console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
    } catch (error) {
      console.error('❌ Test execution failed:', error);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new StreamingExportTester();
  tester.runAllTests().catch(console.error);
}

module.exports = StreamingExportTester;
