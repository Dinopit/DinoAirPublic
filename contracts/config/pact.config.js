/**
 * Pact Configuration
 * Shared configuration for consumer and provider contract tests
 */

const path = require('path');

const PACT_CONFIG = {
  // Pact files directory
  pactFilesDir: path.resolve(__dirname, '../pacts'),
  
  // Log level for Pact operations
  logLevel: process.env.PACT_LOG_LEVEL || 'info',
  
  // Consumer configuration
  consumer: {
    name: 'DinoAir-Frontend',
    version: process.env.GIT_COMMIT || '1.0.0',
  },
  
  // Provider configuration
  provider: {
    name: 'DinoAir-Backend',
    version: process.env.GIT_COMMIT || '1.0.0',
    host: process.env.PROVIDER_HOST || 'localhost',
    port: process.env.PROVIDER_PORT || 3000,
  },
  
  // Pact Broker configuration
  broker: {
    baseUrl: process.env.PACT_BROKER_BASE_URL || 'http://localhost:9292',
    username: process.env.PACT_BROKER_USERNAME,
    password: process.env.PACT_BROKER_PASSWORD,
    token: process.env.PACT_BROKER_TOKEN,
  },
  
  // Test configuration
  test: {
    timeout: 30000,
    retries: 2,
  },
  
  // Mock server configuration
  mockServer: {
    host: 'localhost',
    port: 1234,
  },
};

module.exports = PACT_CONFIG;