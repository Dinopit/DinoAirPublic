/**
 * Jest Global Teardown for Contract Testing
 * Cleans up the test environment after running tests
 */

module.exports = async () => {
  console.log('Tearing down contract testing environment...');
  
  try {
    // Clean up any test processes or resources
    // This could include stopping test servers, cleaning up databases, etc.
    
    console.log('Contract testing environment teardown complete');
  } catch (error) {
    console.error('Failed to teardown contract testing environment:', error);
    // Don't throw here to avoid masking test failures
  }
};