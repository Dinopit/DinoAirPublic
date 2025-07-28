/**
 * Enhanced Environment Validator with Security Features
 * Validates environment variables and detects security issues
 */

const SecretsManager = require('../../lib/secrets-manager');

class EnvironmentValidator {
  constructor() {
    this.requiredVars = ['NODE_ENV'];
    this.optionalVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'JWT_SECRET',
      'API_KEY'
    ];
    this.secretsManager = new SecretsManager();
  }

  validate(strict = false) {
    const results = {
      isValid: true,
      errors: [],
      warnings: [],
      securityIssues: []
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

    // Perform comprehensive security validation
    const securityValidation = this.secretsManager.validateEnvironment();
    
    // Add security issues to results
    results.securityIssues = securityValidation.issues;
    results.warnings.push(...securityValidation.warnings);
    
    if (securityValidation.issues.length > 0) {
      results.isValid = false;
    }

    // Additional security checks
    this.performSecurityChecks(results);

    return results;
  }

  /**
   * Perform additional security checks
   * @param {Object} results - Validation results object to modify
   */
  performSecurityChecks(results) {
    // Check for development-only settings in production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.CORS_ORIGIN === 'http://localhost:3000') {
        results.securityIssues.push('CORS_ORIGIN is set to localhost in production');
      }
      
      if (process.env.PUBLIC_URL === 'http://localhost:3000') {
        results.securityIssues.push('PUBLIC_URL is set to localhost in production');
      }
      
      if (!process.env.HTTPS && !process.env.SSL_CERT) {
        results.warnings.push('HTTPS not configured for production environment');
      }
    }

    // Check for insecure database connections
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
      if (!process.env.DATABASE_URL.includes('sslmode=require') && process.env.NODE_ENV === 'production') {
        results.warnings.push('Database connection should use SSL in production');
      }
    }

    // Check for weak session secrets
    if (process.env.SESSION_SECRET) {
      if (process.env.SESSION_SECRET.length < 32) {
        results.securityIssues.push('SESSION_SECRET should be at least 32 characters long');
      }
      
      if (this.secretsManager.isWeakSecret(process.env.SESSION_SECRET)) {
        results.securityIssues.push('SESSION_SECRET appears to be a weak or example value');
      }
    }

    // Check for exposed Supabase service role key
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { clientVars } = this.secretsManager.separateClientServerEnv();
      const exposedServiceKey = Object.keys(clientVars).find(key => 
        key.includes('SERVICE_ROLE') || key.includes('ADMIN')
      );
      
      if (exposedServiceKey) {
        results.securityIssues.push(`Service role key may be exposed to client: ${exposedServiceKey}`);
      }
    }
  }

  /**
   * Print detailed validation results
   * @param {Object} results - Validation results
   */
  printResults(results) {
    console.log('\n🔍 Environment Security Validation Report');
    console.log('==========================================');

    if (results.errors.length > 0) {
      console.error('\n❌ Critical Errors:');
      results.errors.forEach(error => console.error(`   • ${error}`));
    }

    if (results.securityIssues.length > 0) {
      console.error('\n🔐 Security Issues:');
      results.securityIssues.forEach(issue => console.error(`   • ${issue}`));
    }

    if (results.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:');
      results.warnings.forEach(warning => console.warn(`   • ${warning}`));
    }

    if (results.isValid && results.errors.length === 0 && results.securityIssues.length === 0) {
      console.log('\n✅ Environment validation passed - No security issues detected');
    } else {
      console.log('\n❌ Environment validation failed - Please address the issues above');
    }

    // Show environment separation stats
    const { clientVars, serverVars } = this.secretsManager.separateClientServerEnv();
    console.log(`\n📊 Environment Variables Summary:`);
    console.log(`   • Client-side variables: ${Object.keys(clientVars).length}`);
    console.log(`   • Server-side variables: ${Object.keys(serverVars).length}`);
    console.log(`   • Total variables: ${Object.keys(process.env).length}`);
  }

  /**
   * Generate a security report
   * @returns {Object} Detailed security report
   */
  generateSecurityReport() {
    const validation = this.validate(true);
    const { clientVars, serverVars } = this.secretsManager.separateClientServerEnv();
    
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      validation,
      environmentSeparation: {
        clientVarCount: Object.keys(clientVars).length,
        serverVarCount: Object.keys(serverVars).length,
        clientVars: Object.keys(clientVars),
        exposedSecrets: Object.keys(clientVars).filter(key => 
          this.secretsManager.isSensitiveKey(key)
        )
      },
      recommendations: this.getSecurityRecommendations(validation)
    };
  }

  /**
   * Get security recommendations based on validation results
   * @param {Object} validation - Validation results
   * @returns {Array} Security recommendations
   */
  getSecurityRecommendations(validation) {
    const recommendations = [];
    
    if (validation.securityIssues.some(issue => issue.includes('weak'))) {
      recommendations.push('Generate strong secrets using: openssl rand -hex 32');
    }
    
    if (validation.securityIssues.some(issue => issue.includes('CLIENT'))) {
      recommendations.push('Move sensitive variables to server-side only configuration');
    }
    
    if (process.env.NODE_ENV === 'production' && validation.warnings.length > 0) {
      recommendations.push('Review and fix all warnings for production security');
    }
    
    recommendations.push('Implement automated secrets rotation');
    recommendations.push('Consider using a dedicated secrets management service');
    
    return recommendations;
  }
}

module.exports = EnvironmentValidator;