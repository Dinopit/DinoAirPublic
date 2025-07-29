/**
 * Provider Contract Verification for Artifacts API
 * Verifies that the backend meets the contract expectations
 */

const { Verifier } = require('@pact-foundation/pact');
const path = require('path');
const { PACT_CONFIG } = require('../config/setup');

describe('Artifacts API Provider Verification', () => {
  let server;

  beforeAll(async () => {
    // Start the provider server for testing
    const app = require('../../web-gui-node/server');
    server = app.listen(PACT_CONFIG.provider.port, () => {
      console.log(`Provider server running on port ${PACT_CONFIG.provider.port}`);
    });
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  it('should validate the artifacts contract', async () => {
    const opts = {
      provider: PACT_CONFIG.provider.name,
      providerBaseUrl: `http://${PACT_CONFIG.provider.host}:${PACT_CONFIG.provider.port}`,
      
      // Pact files to verify against
      pactUrls: [
        path.resolve(PACT_CONFIG.pactFilesDir, `${PACT_CONFIG.consumer.name}-${PACT_CONFIG.provider.name}.json`)
      ],
      
      // Provider state setup
      stateHandlers: {
        'artifacts exist': async () => {
          console.log('Setting up state: artifacts exist');
          // Setup test data - in a real implementation, you might seed the database
          // For this example, we'll rely on the existing sample data in the artifacts route
          return Promise.resolve();
        },
        
        'artifact with ID 1 exists': async () => {
          console.log('Setting up state: artifact with ID 1 exists');
          // Ensure artifact with ID 1 exists
          return Promise.resolve();
        },
        
        'artifact does not exist': async () => {
          console.log('Setting up state: artifact does not exist');
          // Ensure the test artifact ID doesn't exist
          return Promise.resolve();
        },
        
        'ready to create artifact': async () => {
          console.log('Setting up state: ready to create artifact');
          // Prepare system for artifact creation
          return Promise.resolve();
        },
        
        'ready to validate artifact': async () => {
          console.log('Setting up state: ready to validate artifact');
          // Prepare system for validation
          return Promise.resolve();
        },
      },
      
      // Provider version
      providerVersion: PACT_CONFIG.provider.version,
      
      // Publishing verification results
      publishVerificationResult: process.env.CI === 'true',
      providerVersionTags: ['main'],
      
      // Request filters (if needed)
      requestFilter: (req, res, next) => {
        // Add any request modifications here
        next();
      },
      
      // Custom headers
      customProviderHeaders: [
        'Content-Type: application/json'
      ],
      
      // Logging
      logLevel: PACT_CONFIG.logLevel,
      
      // Timeout
      timeout: PACT_CONFIG.test.timeout,
    };

    // Only publish if we have broker configuration
    if (PACT_CONFIG.broker.baseUrl && process.env.CI === 'true') {
      opts.pactBrokerUrl = PACT_CONFIG.broker.baseUrl;
      if (PACT_CONFIG.broker.token) {
        opts.pactBrokerToken = PACT_CONFIG.broker.token;
      } else if (PACT_CONFIG.broker.username && PACT_CONFIG.broker.password) {
        opts.pactBrokerUsername = PACT_CONFIG.broker.username;
        opts.pactBrokerPassword = PACT_CONFIG.broker.password;
      }
    }

    const verifier = new Verifier(opts);
    
    try {
      const result = await verifier.verifyProvider();
      console.log('Pact verification complete!');
      return result;
    } catch (error) {
      console.error('Pact verification failed:', error);
      throw error;
    }
  }, 60000); // 60 second timeout for verification
});