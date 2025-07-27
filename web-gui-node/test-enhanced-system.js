/**
 * Enhanced Code Execution System Test
 * Comprehensive tests for all features
 */

const { CodeExecutionService } = require('./lib/code-execution-service');
const { VirtualFileSystem } = require('./lib/virtual-file-system');

class EnhancedCodeExecutionTester {
  constructor() {
    this.codeService = new CodeExecutionService();
    this.vfs = new VirtualFileSystem();
  }

  async runAllTests() {
    console.log('🚀 Starting Enhanced Code Execution System Tests\n');
    
    const testSuites = [
      { name: 'Core Code Execution', fn: () => this.testCodeExecution() },
      { name: 'Multi-Language Support', fn: () => this.testMultiLanguage() },
      { name: 'Virtual File System', fn: () => this.testVirtualFileSystem() },
      { name: 'Project Management', fn: () => this.testProjectManagement() },
      { name: 'Security Features', fn: () => this.testSecurity() },
      { name: 'Performance Tests', fn: () => this.testPerformance() }
    ];
    
    let passed = 0;
    let total = testSuites.length;
    
    for (const suite of testSuites) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🧪 ${suite.name}`);
      console.log(`${'='.repeat(50)}`);
      
      try {
        const result = await suite.fn();
        if (result) {
          passed++;
          console.log(`✅ ${suite.name} PASSED\n`);
        } else {
          console.log(`❌ ${suite.name} FAILED\n`);
        }
      } catch (error) {
        console.log(`❌ ${suite.name} ERROR: ${error.message}\n`);
      }
    }
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Final Results: ${passed}/${total} test suites passed`);
    console.log(`${'='.repeat(50)}`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Enhanced Code Execution System is fully functional.');
    } else {
      console.log('⚠️  Some tests failed. Review the output above for details.');
    }
    
    return passed === total;
  }

  async testCodeExecution() {
    let testsPassed = 0;
    let totalTests = 0;

    // Test 1: Basic Python execution
    totalTests++;
    console.log('🔍 Testing basic Python execution...');
    try {
      const result = await this.codeService.executeCode({
        language: 'python',
        code: 'print("Python test")\nprint(sum([1, 2, 3, 4, 5]))'
      });
      
      if (result.status === 'completed' && result.output.includes('15')) {
        console.log('✅ Python execution successful');
        testsPassed++;
      } else {
        console.log('❌ Python execution failed');
      }
    } catch (error) {
      console.log('❌ Python execution error:', error.message);
    }

    // Test 2: Basic JavaScript execution
    totalTests++;
    console.log('🔍 Testing basic JavaScript execution...');
    try {
      const result = await this.codeService.executeCode({
        language: 'javascript',
        code: 'console.log("JavaScript test"); console.log([1,2,3,4,5].reduce((a,b) => a+b, 0));'
      });
      
      if (result.status === 'completed' && result.output.includes('15')) {
        console.log('✅ JavaScript execution successful');
        testsPassed++;
      } else {
        console.log('❌ JavaScript execution failed');
      }
    } catch (error) {
      console.log('❌ JavaScript execution error:', error.message);
    }

    // Test 3: Error handling
    totalTests++;
    console.log('🔍 Testing error handling...');
    try {
      const result = await this.codeService.executeCode({
        language: 'python',
        code: 'undefined_function()'
      });
      
      if (result.status === 'failed' && result.error.includes('NameError')) {
        console.log('✅ Error handling working correctly');
        testsPassed++;
      } else {
        console.log('❌ Error handling failed');
      }
    } catch (error) {
      console.log('❌ Error handling test error:', error.message);
    }

    console.log(`Code Execution Tests: ${testsPassed}/${totalTests} passed`);
    return testsPassed === totalTests;
  }

  async testMultiLanguage() {
    let testsPassed = 0;
    const languages = ['python', 'javascript'];
    
    const testCode = {
      python: 'print("Hello from Python")',
      javascript: 'console.log("Hello from JavaScript")'
    };

    for (const language of languages) {
      console.log(`🔍 Testing ${language}...`);
      try {
        const result = await this.codeService.executeCode({
          language,
          code: testCode[language]
        });
        
        if (result.status === 'completed' && result.output.includes('Hello from')) {
          console.log(`✅ ${language} execution successful`);
          testsPassed++;
        } else {
          console.log(`❌ ${language} execution failed`);
        }
      } catch (error) {
        console.log(`❌ ${language} execution error:`, error.message);
      }
    }

    console.log(`Multi-Language Tests: ${testsPassed}/${languages.length} passed`);
    return testsPassed === languages.length;
  }

  async testVirtualFileSystem() {
    let testsPassed = 0;
    let totalTests = 0;

    // Test 1: Create project
    totalTests++;
    console.log('🔍 Testing project creation...');
    try {
      const project = await this.vfs.createProject('test-user', 'Test Project', 'python');
      
      if (project && project.id && project.name === 'Test Project') {
        console.log('✅ Project creation successful');
        testsPassed++;
        
        // Test 2: Write file
        totalTests++;
        console.log('🔍 Testing file writing...');
        await this.vfs.writeFile(project.id, 'test.py', 'print("Hello from file")');
        console.log('✅ File writing successful');
        testsPassed++;
        
        // Test 3: Read file
        totalTests++;
        console.log('🔍 Testing file reading...');
        const content = await this.vfs.readFile(project.id, 'test.py');
        if (content.includes('Hello from file')) {
          console.log('✅ File reading successful');
          testsPassed++;
        } else {
          console.log('❌ File reading failed');
        }
        
        // Test 4: List files
        totalTests++;
        console.log('🔍 Testing file listing...');
        const files = await this.vfs.listFiles(project.id);
        if (files.length >= 1) {
          console.log('✅ File listing successful');
          testsPassed++;
        } else {
          console.log('❌ File listing failed');
        }
        
        // Cleanup
        await this.vfs.deleteProject(project.id);
      } else {
        console.log('❌ Project creation failed');
      }
    } catch (error) {
      console.log('❌ VFS test error:', error.message);
    }

    console.log(`Virtual File System Tests: ${testsPassed}/${totalTests} passed`);
    return testsPassed === totalTests;
  }

  async testProjectManagement() {
    let testsPassed = 0;
    let totalTests = 0;

    // Test 1: Create multiple projects
    totalTests++;
    console.log('🔍 Testing multiple project creation...');
    try {
      const project1 = await this.vfs.createProject('user1', 'Python Project', 'python');
      const project2 = await this.vfs.createProject('user1', 'JS Project', 'javascript');
      
      if (project1 && project2) {
        console.log('✅ Multiple project creation successful');
        testsPassed++;
        
        // Test 2: List projects
        totalTests++;
        console.log('🔍 Testing project listing...');
        const projects = this.vfs.listProjects('user1');
        if (projects.length >= 2) {
          console.log('✅ Project listing successful');
          testsPassed++;
        } else {
          console.log('❌ Project listing failed');
        }
        
        // Test 3: Add dependencies
        totalTests++;
        console.log('🔍 Testing dependency management...');
        await this.vfs.addDependency(project1.id, 'requests', '2.28.1');
        
        const updatedProject = this.vfs.getProject(project1.id);
        if (updatedProject.dependencies.length > 0) {
          console.log('✅ Dependency management successful');
          testsPassed++;
        } else {
          console.log('❌ Dependency management failed');
        }
        
        // Cleanup
        await this.vfs.deleteProject(project1.id);
        await this.vfs.deleteProject(project2.id);
      } else {
        console.log('❌ Multiple project creation failed');
      }
    } catch (error) {
      console.log('❌ Project management test error:', error.message);
    }

    console.log(`Project Management Tests: ${testsPassed}/${totalTests} passed`);
    return testsPassed === totalTests;
  }

  async testSecurity() {
    let testsPassed = 0;
    let totalTests = 0;

    // Test 1: Code size limit
    totalTests++;
    console.log('🔍 Testing code size limit...');
    try {
      const largeCode = 'print("a")\n'.repeat(50000); // Large code
      await this.codeService.executeCode({
        language: 'python',
        code: largeCode
      });
      console.log('❌ Code size limit test failed - should have rejected large code');
    } catch (error) {
      if (error.message.includes('exceeds maximum limit')) {
        console.log('✅ Code size limit working correctly');
        testsPassed++;
      } else {
        console.log('❌ Code size limit test failed with unexpected error');
      }
    }

    // Test 2: Timeout handling
    totalTests++;
    console.log('🔍 Testing timeout handling...');
    try {
      const result = await this.codeService.executeCode({
        language: 'python',
        code: 'import time\ntime.sleep(5)',
        options: { timeout: 2000 }
      });
      
      if (result.status === 'failed' && result.error.includes('timed out')) {
        console.log('✅ Timeout handling working correctly');
        testsPassed++;
      } else {
        console.log('❌ Timeout handling failed');
      }
    } catch (error) {
      console.log('❌ Timeout test error:', error.message);
    }

    // Test 3: Invalid language
    totalTests++;
    console.log('🔍 Testing invalid language handling...');
    try {
      await this.codeService.executeCode({
        language: 'invalid-language',
        code: 'some code'
      });
      console.log('❌ Invalid language test failed - should have rejected');
    } catch (error) {
      if (error.message.includes('Unsupported language')) {
        console.log('✅ Invalid language handling working correctly');
        testsPassed++;
      } else {
        console.log('❌ Invalid language test failed with unexpected error');
      }
    }

    console.log(`Security Tests: ${testsPassed}/${totalTests} passed`);
    return testsPassed === totalTests;
  }

  async testPerformance() {
    console.log('🔍 Testing execution performance...');
    
    const startTime = Date.now();
    
    // Run multiple executions concurrently
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        this.codeService.executeCode({
          language: 'python',
          code: `print("Execution ${i}")`
        })
      );
    }
    
    try {
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successCount = results.filter(r => r.status === 'completed').length;
      
      console.log(`✅ Performance test completed:`);
      console.log(`   - ${successCount}/5 executions successful`);
      console.log(`   - Total time: ${totalTime}ms`);
      console.log(`   - Average time per execution: ${Math.round(totalTime / 5)}ms`);
      
      return successCount >= 4; // Allow 1 failure
    } catch (error) {
      console.log('❌ Performance test error:', error.message);
      return false;
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new EnhancedCodeExecutionTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { EnhancedCodeExecutionTester };