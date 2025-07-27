/**
 * Code Execution Service Tests
 * Basic tests for the code execution functionality
 */

const { CodeExecutionService } = require('./lib/code-execution-service');

class CodeExecutionTester {
  constructor() {
    this.service = new CodeExecutionService();
  }

  async testHealthCheck() {
    console.log('🔍 Testing health check...');
    try {
      const health = await this.service.healthCheck();
      console.log('✅ Health check result:', health);
      return health.healthy;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  }

  async testSupportedLanguages() {
    console.log('🔍 Testing supported languages...');
    try {
      const languages = this.service.getSupportedLanguages();
      console.log('✅ Supported languages:', languages.map(l => l.name).join(', '));
      return true;
    } catch (error) {
      console.error('❌ Failed to get supported languages:', error.message);
      return false;
    }
  }

  async testPythonExecution() {
    console.log('🔍 Testing Python code execution...');
    try {
      const result = await this.service.executeCode({
        language: 'python',
        code: 'print("Hello from Python!")\nprint(2 + 2)'
      });
      
      console.log('✅ Python execution result:');
      console.log('   Status:', result.status);
      console.log('   Output:', result.output);
      console.log('   Duration:', result.duration + 'ms');
      
      return result.status === 'completed' && result.output.includes('Hello from Python!');
    } catch (error) {
      console.error('❌ Python execution failed:', error.message);
      return false;
    }
  }

  async testJavaScriptExecution() {
    console.log('🔍 Testing JavaScript code execution...');
    try {
      const result = await this.service.executeCode({
        language: 'javascript',
        code: 'console.log("Hello from JavaScript!"); console.log(2 + 2);'
      });
      
      console.log('✅ JavaScript execution result:');
      console.log('   Status:', result.status);
      console.log('   Output:', result.output);
      console.log('   Duration:', result.duration + 'ms');
      
      return result.status === 'completed' && result.output.includes('Hello from JavaScript!');
    } catch (error) {
      console.error('❌ JavaScript execution failed:', error.message);
      return false;
    }
  }

  async testErrorHandling() {
    console.log('🔍 Testing error handling...');
    try {
      const result = await this.service.executeCode({
        language: 'python',
        code: 'print("Before error")\nundefined_variable\nprint("After error")'
      });
      
      console.log('✅ Error handling result:');
      console.log('   Status:', result.status);
      console.log('   Output:', result.output);
      console.log('   Error:', result.error);
      
      return result.status === 'failed' && result.error.length > 0;
    } catch (error) {
      console.error('❌ Error handling test failed:', error.message);
      return false;
    }
  }

  async testTimeout() {
    console.log('🔍 Testing timeout handling...');
    try {
      const result = await this.service.executeCode({
        language: 'python',
        code: 'import time\ntime.sleep(5)\nprint("This should not print")',
        options: { timeout: 2000 } // 2 second timeout
      });
      
      console.log('✅ Timeout handling result:');
      console.log('   Status:', result.status);
      console.log('   Error:', result.error);
      
      return result.status === 'failed' && result.error.includes('timed out');
    } catch (error) {
      console.error('❌ Timeout test failed:', error.message);
      return false;
    }
  }

  async testStats() {
    console.log('🔍 Testing statistics...');
    try {
      const stats = this.service.getStats();
      console.log('✅ Statistics:', stats);
      return typeof stats.supportedLanguages === 'number';
    } catch (error) {
      console.error('❌ Statistics test failed:', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Code Execution Service Tests\n');
    
    const tests = [
      { name: 'Health Check', fn: () => this.testHealthCheck() },
      { name: 'Supported Languages', fn: () => this.testSupportedLanguages() },
      { name: 'Statistics', fn: () => this.testStats() },
      { name: 'Python Execution', fn: () => this.testPythonExecution() },
      { name: 'JavaScript Execution', fn: () => this.testJavaScriptExecution() },
      { name: 'Error Handling', fn: () => this.testErrorHandling() },
      { name: 'Timeout Handling', fn: () => this.testTimeout() }
    ];
    
    let passed = 0;
    let total = tests.length;
    
    for (const test of tests) {
      console.log(`\n--- ${test.name} ---`);
      try {
        const result = await test.fn();
        if (result) {
          passed++;
          console.log(`✅ ${test.name} PASSED`);
        } else {
          console.log(`❌ ${test.name} FAILED`);
        }
      } catch (error) {
        console.log(`❌ ${test.name} ERROR:`, error.message);
      }
    }
    
    console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Code execution service is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check Docker installation and permissions.');
    }
    
    return passed === total;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new CodeExecutionTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { CodeExecutionTester };