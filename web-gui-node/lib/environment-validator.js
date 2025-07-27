/**
 * Simple Environment Validator
 * Basic validation for development environment
 */

class EnvironmentValidator {
  constructor() {
    this.requiredVars = ['NODE_ENV'];
    this.optionalVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'JWT_SECRET',
      'API_KEY'
    ];
  }

  validate(strict = false) {
    const results = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    
    if (majorVersion < 18) {
      results.errors.push(`Node.js version ${nodeVersion} is not supported. Minimum version: 18.0.0`);
      results.isValid = false;
    }

    // Check required environment variables in strict mode
    if (strict) {
      this.requiredVars.forEach(varName => {
        if (!process.env[varName]) {
          results.errors.push(`Missing required environment variable: ${varName}`);
          results.isValid = false;
        }
      });
    }

    // Check optional variables
    this.optionalVars.forEach(varName => {
      if (!process.env[varName]) {
        results.warnings.push(`Optional environment variable not set: ${varName}`);
      }
    });

    return results;
  }

  printResults(results) {
    if (results.errors.length > 0) {
      console.error('❌ Environment validation errors:');
      results.errors.forEach(error => console.error(`   - ${error}`));
    }

    if (results.warnings.length > 0) {
      console.warn('⚠️  Environment validation warnings:');
      results.warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

    if (results.isValid && results.errors.length === 0) {
      console.log('✅ Environment validation passed');
    }
  }
}

module.exports = EnvironmentValidator;