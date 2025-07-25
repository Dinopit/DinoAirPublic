/**
 * Jest configuration for contract testing (provider)
 */

module.exports = {
  displayName: 'Contract Tests (Provider)',
  testMatch: ['<rootDir>/../contracts/provider/**/*.spec.js'],
  testEnvironment: 'node',
  testTimeout: 60000,
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