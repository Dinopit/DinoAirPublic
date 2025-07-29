/**
 * Jest Global Setup for Contract Testing
 * Sets up the test environment before running tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('Setting up contract testing environment...');
  
  try {
    // Ensure pacts directory exists
    const pactsDir = path.resolve(__dirname, '../pacts');
    if (!fs.existsSync(pactsDir)) {
      fs.mkdirSync(pactsDir, { recursive: true });
      console.log('Created pacts directory');
    }
    
    // Clean up old pact files
    if (fs.existsSync(pactsDir)) {
      const files = fs.readdirSync(pactsDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(pactsDir, file));
        }
      });
      console.log('Cleaned up old pact files');
    }
    
    // Set global environment variables for tests
    process.env.PACT_LOG_LEVEL = 'info';
    process.env.NODE_ENV = 'test';
    
    console.log('Contract testing environment setup complete');
  } catch (error) {
    console.error('Failed to setup contract testing environment:', error);
    throw error;
  }
};