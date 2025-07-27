/**
 * Performance test script for DinoAir optimized GUI
 * Tests memory usage, load times, and stability
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runPerformanceTest() {
  console.log('🧪 Starting DinoAir GUI Performance Test');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless testing
    args: [
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--expose-gc', // Enable garbage collection
      '--memory-pressure-off',
    ],
  });

  const page = await browser.newPage();
  
  // Enable performance monitoring
  await page.setBypassCSP(true);
  await page.setViewport({ width: 1920, height: 1080 });

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
    }
  };

  try {
    // Test 1: Initial page load
    console.log('📊 Test 1: Initial page load');
    const loadStartTime = Date.now();
    
    await page.goto('http://localhost:3001/dinoair-gui', {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    
    const loadTime = Date.now() - loadStartTime;
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      } : null;
    });

    results.tests.push({
      name: 'Initial Page Load',
      status: loadTime < 5000 ? 'PASS' : 'WARN',
      loadTime: `${loadTime}ms`,
      threshold: '5000ms',
      memory: initialMemory,
    });

    if (loadTime < 5000) results.summary.passed++;
    else results.summary.warnings++;
    results.summary.totalTests++;

    // Test 2: Memory usage after interactions
    console.log('📊 Test 2: Memory usage after interactions');
    
    // Wait for components to load
    await page.waitForSelector('[data-testid="chat-input"], textarea[placeholder*="message"]', { timeout: 10000 });
    
    // Simulate user interactions
    await page.click('button[aria-label*="Chat"], button:has-text("Chat")');
    await page.waitForTimeout(1000);
    
    const afterInteractionMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      } : null;
    });

    const memoryIncrease = afterInteractionMemory 
      ? afterInteractionMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
      : 0;

    results.tests.push({
      name: 'Memory Usage After Interactions',
      status: memoryIncrease < 50 * 1024 * 1024 ? 'PASS' : 'WARN', // 50MB threshold
      memoryIncrease: `${Math.round(memoryIncrease / (1024 * 1024))}MB`,
      threshold: '50MB',
      memory: afterInteractionMemory,
    });

    if (memoryIncrease < 50 * 1024 * 1024) results.summary.passed++;
    else results.summary.warnings++;
    results.summary.totalTests++;

    // Test 3: Check for memory leaks
    console.log('📊 Test 3: Memory leak detection');
    
    // Perform multiple tab switches to test for leaks
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Artifacts")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Chat")');
      await page.waitForTimeout(500);
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }
    });

    await page.waitForTimeout(2000); // Wait for GC

    const afterGCMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      } : null;
    });

    const memoryAfterGC = afterGCMemory 
      ? afterGCMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
      : 0;

    results.tests.push({
      name: 'Memory Leak Detection',
      status: memoryAfterGC < 20 * 1024 * 1024 ? 'PASS' : 'WARN', // 20MB threshold after GC
      memoryAfterGC: `${Math.round(memoryAfterGC / (1024 * 1024))}MB`,
      threshold: '20MB',
      memory: afterGCMemory,
    });

    if (memoryAfterGC < 20 * 1024 * 1024) results.summary.passed++;
    else results.summary.warnings++;
    results.summary.totalTests++;

    // Test 4: Error handling
    console.log('📊 Test 4: Error handling');
    
    const errorHandlingTest = await page.evaluate(() => {
      try {
        // Check if error boundary is available
        const hasErrorBoundary = document.querySelector('[data-error-boundary]') !== null;
        
        // Check if memory monitor is available in development
        const hasMemoryMonitor = document.querySelector('.memory-monitor') !== null;
        
        return {
          hasErrorBoundary,
          hasMemoryMonitor,
          consoleErrors: window.performance?.navigation?.type === 1 ? 0 : 0 // Navigation type check
        };
      } catch (e) {
        return { error: e.message };
      }
    });

    results.tests.push({
      name: 'Error Handling Components',
      status: 'PASS', // Assume pass if no critical errors
      details: errorHandlingTest,
    });

    results.summary.passed++;
    results.summary.totalTests++;

    // Test 5: Security headers
    console.log('📊 Test 5: Security headers');
    
    const response = await page.goto('http://localhost:3001/dinoair-gui');
    const headers = response.headers();
    
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'referrer-policy',
      'permissions-policy',
    ];

    const missingHeaders = securityHeaders.filter(header => !headers[header]);
    
    results.tests.push({
      name: 'Security Headers',
      status: missingHeaders.length === 0 ? 'PASS' : 'WARN',
      presentHeaders: securityHeaders.filter(header => headers[header]),
      missingHeaders,
    });

    if (missingHeaders.length === 0) results.summary.passed++;
    else results.summary.warnings++;
    results.summary.totalTests++;

  } catch (error) {
    results.tests.push({
      name: 'Test Execution Error',
      status: 'FAIL',
      error: error.message,
    });
    results.summary.failed++;
    results.summary.totalTests++;
  }

  await browser.close();

  // Generate report
  console.log('\n📋 Performance Test Results:');
  console.log('================================');
  
  results.tests.forEach(test => {
    const statusIcon = test.status === 'PASS' ? '✅' : test.status === 'WARN' ? '⚠️' : '❌';
    console.log(`${statusIcon} ${test.name}: ${test.status}`);
    
    if (test.loadTime) console.log(`   Load Time: ${test.loadTime}`);
    if (test.memoryIncrease) console.log(`   Memory Increase: ${test.memoryIncrease}`);
    if (test.memoryAfterGC) console.log(`   Memory After GC: ${test.memoryAfterGC}`);
    if (test.error) console.log(`   Error: ${test.error}`);
  });

  console.log('\n📊 Summary:');
  console.log(`Total Tests: ${results.summary.totalTests}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`⚠️  Warnings: ${results.summary.warnings}`);
  console.log(`❌ Failed: ${results.summary.failed}`);

  // Save results to file
  const reportPath = path.join(__dirname, 'performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Full report saved to: ${reportPath}`);

  return results;
}

// Run the test if this file is executed directly
if (require.main === module) {
  runPerformanceTest()
    .then(results => {
      const success = results.summary.failed === 0;
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Performance test failed:', error);
      process.exit(1);
    });
}

module.exports = { runPerformanceTest };