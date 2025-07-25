/**
 * Jest configuration for contract testing (consumer)
 */

module.exports = {
  displayName: 'Contract Tests (Consumer)',
  testMatch: ['<rootDir>/../contracts/consumer/**/*.spec.js'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/../contracts/config/jest-global-setup.js',
  globalTeardown: '<rootDir>/../contracts/config/jest-global-teardown.js',
  
  // Transform configuration for ES modules
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
};