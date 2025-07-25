/**
 * Jest Setup File
 * Global test configuration and utilities
 */

// Mock console methods to avoid cluttering test output
global.mockConsole = () => {
  const originalConsole = { ...console };
  
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });
  
  afterEach(() => {
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
    console.info.mockRestore();
    console.debug.mockRestore();
  });
  
  return originalConsole;
};

// Global test utilities
global.testUtils = {
  // Create a temporary directory for testing
  createTempDir: () => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = path.join(os.tmpdir(), `dinoair-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    return tempDir;
  },
  
  // Clean up temporary directory
  cleanupTempDir: (tempDir) => {
    const fs = require('fs');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  },
  
  // Wait for a specified amount of time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create a mock logger
  createMockLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    debug: jest.fn(),
    raw: jest.fn(),
    colored: jest.fn(),
    section: jest.fn(),
    subsection: jest.fn(),
    list: jest.fn(),
    keyValue: jest.fn(),
    step: jest.fn(),
    installStep: jest.fn(),
    clear: jest.fn(),
    newLine: jest.fn(),
    enableDebug: jest.fn(),
    disableDebug: jest.fn(),
    enableSilent: jest.fn(),
    disableSilent: jest.fn(),
    child: jest.fn()
  })
};

// Set longer timeout for integration tests
jest.setTimeout(30000);