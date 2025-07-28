#!/usr/bin/env node

/**
 * DinoAir Secrets Management CLI
 * 
 * Command-line tool for managing secrets and performing security operations:
 * - Environment validation
 * - Secrets generation
 * - Security audits
 * - Rotation warnings
 */

const SecretsManager = require('../lib/secrets-manager');
const EnvironmentValidator = require('../web-gui-node/lib/environment-validator');
const fs = require('fs');
const path = require('path');

class SecretsManagerCLI {
  constructor() {
    this.secretsManager = new SecretsManager();
    this.validator = new EnvironmentValidator();
  }

  /**
   * Main CLI entry point
   */
  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case 'validate':
          await this.validateCommand(args.slice(1));
          break;
        case 'generate':
          await this.generateCommand(args.slice(1));
          break;
        case 'audit':
          await this.auditCommand(args.slice(1));
          break;
        case 'rotation-check':
          await this.rotationCheckCommand(args.slice(1));
          break;
        case 'init':
          await this.initCommand(args.slice(1));
          break;
        case 'help':
        case '--help':
        case '-h':
          this.showHelp();
          break;
        default:
          console.error(`Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Validate environment security
   */
  async validateCommand(args) {
    const strict = args.includes('--strict');
    const json = args.includes('--json');
    const report = args.includes('--report');

    console.log('🔍 Validating environment security...\n');

    const results = this.validator.validate(strict);

    if (json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }

    if (report) {
      const securityReport = this.validator.generateSecurityReport();
      const reportPath = path.join(process.cwd(), 'security-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(securityReport, null, 2));
      console.log(`📄 Detailed security report saved to: ${reportPath}`);
    }

    this.validator.printResults(results);

    if (!results.isValid) {
      process.exit(1);
    }
  }

  /**
   * Generate secure secrets
   */
  async generateCommand(args) {
    const type = args[0] || 'session';
    const length = parseInt(args[1]) || 32;
    const encoding = args[2] || 'hex';

    console.log(`🔐 Generating secure ${type} secret...\n`);

    let secret;
    switch (type) {
      case 'session':
        secret = this.secretsManager.generateSecret(32, 'hex');
        console.log('SESSION_SECRET=' + secret);
        break;
      case 'jwt':
        secret = this.secretsManager.generateSecret(64, 'base64');
        console.log('JWT_SECRET=' + secret);
        break;
      case 'api-key':
        secret = this.secretsManager.generateSecret(24, 'hex');
        console.log('API_KEY=' + secret);
        break;
      case 'custom':
        secret = this.secretsManager.generateSecret(length, encoding);
        console.log(`CUSTOM_SECRET=${secret}`);
        break;
      default:
        throw new Error(`Unknown secret type: ${type}. Use: session, jwt, api-key, custom`);
    }

    console.log('\n⚠️  Important Security Notes:');
    console.log('   • Copy this secret to your .env file immediately');
    console.log('   • Never share or commit this secret to version control');
    console.log('   • Store it securely and rotate it regularly');
  }

  /**
   * Perform security audit
   */
  async auditCommand(args) {
    const detailed = args.includes('--detailed');
    const save = args.includes('--save');

    console.log('🕵️  Performing security audit...\n');

    // Environment validation
    const validation = this.validator.validate(true);
    
    // Secrets audit
    const auditLog = this.secretsManager.getAuditLog(100);
    const cacheStats = this.secretsManager.getCacheStats();
    
    // Environment separation analysis
    const { clientVars, serverVars } = this.secretsManager.separateClientServerEnv();
    const exposedSecrets = Object.keys(clientVars).filter(key => 
      this.secretsManager.isSensitiveKey(key)
    );

    const audit = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      summary: {
        totalIssues: validation.errors.length + validation.securityIssues.length,
        criticalIssues: validation.errors.length,
        securityIssues: validation.securityIssues.length,
        warnings: validation.warnings.length,
        exposedSecrets: exposedSecrets.length
      },
      validation,
      environmentAnalysis: {
        totalVars: Object.keys(process.env).length,
        clientVars: Object.keys(clientVars).length,
        serverVars: Object.keys(serverVars).length,
        exposedSecrets,
        suspiciousVars: this.findSuspiciousVariables()
      },
      secretsManager: {
        cacheStats,
        recentActivity: auditLog.slice(-10)
      }
    };

    // Print summary
    console.log('📊 Security Audit Summary:');
    console.log('==========================');
    console.log(`Environment: ${audit.environment}`);
    console.log(`Total Issues: ${audit.summary.totalIssues}`);
    console.log(`Critical Issues: ${audit.summary.criticalIssues}`);
    console.log(`Security Issues: ${audit.summary.securityIssues}`);
    console.log(`Warnings: ${audit.summary.warnings}`);
    console.log(`Exposed Secrets: ${audit.summary.exposedSecrets}`);

    if (exposedSecrets.length > 0) {
      console.log('\n🚨 Exposed Secrets to Client:');
      exposedSecrets.forEach(secret => console.log(`   • ${secret}`));
    }

    if (detailed) {
      console.log('\n📋 Detailed Results:');
      this.validator.printResults(validation);
      
      console.log('\n🔍 Suspicious Variables:');
      audit.environmentAnalysis.suspiciousVars.forEach(varInfo => {
        console.log(`   • ${varInfo.name}: ${varInfo.reason}`);
      });
    }

    if (save) {
      const auditPath = path.join(process.cwd(), `security-audit-${Date.now()}.json`);
      fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2));
      console.log(`\n💾 Audit report saved to: ${auditPath}`);
    }

    if (audit.summary.totalIssues > 0) {
      console.log('\n❌ Security audit failed - please address the issues above');
      process.exit(1);
    } else {
      console.log('\n✅ Security audit passed - no critical issues found');
    }
  }

  /**
   * Check for secrets that need rotation
   */
  async rotationCheckCommand(args) {
    const force = args.includes('--force');
    
    console.log('🔄 Checking secrets rotation status...\n');

    const sensitiveVars = Object.keys(process.env).filter(key => 
      this.secretsManager.isSensitiveKey(key)
    );

    console.log('📋 Secrets Rotation Status:');
    console.log('============================');

    let needsRotation = 0;
    for (const varName of sensitiveVars) {
      const value = process.env[varName];
      if (value) {
        // Check if secret is weak or needs rotation
        const isWeak = this.secretsManager.isWeakSecret(value);
        const status = isWeak ? '🔴 WEAK' : '🟡 CHECK';
        
        console.log(`   ${status} ${varName}`);
        
        if (isWeak) {
          needsRotation++;
          console.log(`      └─ Reason: Weak or example value detected`);
        } else {
          console.log(`      └─ Recommendation: Rotate if older than 90 days`);
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   • Total secrets checked: ${sensitiveVars.length}`);
    console.log(`   • Secrets needing immediate rotation: ${needsRotation}`);

    if (needsRotation > 0) {
      console.log('\n⚠️  Recommendations:');
      console.log('   • Generate new secrets using: npm run secrets generate');
      console.log('   • Update .env files with new values');
      console.log('   • Deploy updated configuration');
      console.log('   • Verify all services are working');
    }
  }

  /**
   * Initialize secrets management in project
   */
  async initCommand(args) {
    const force = args.includes('--force');
    
    console.log('🚀 Initializing DinoAir secrets management...\n');

    // Check if already initialized
    const secretsConfigPath = path.join(process.cwd(), '.secrets-config.json');
    if (fs.existsSync(secretsConfigPath) && !force) {
      console.log('⚠️  Secrets management already initialized. Use --force to reinitialize.');
      return;
    }

    // Create secrets configuration
    const config = {
      version: '1.0.0',
      backend: 'environment',
      rotationWarningDays: 30,
      auditLogging: true,
      created: new Date().toISOString()
    };

    fs.writeFileSync(secretsConfigPath, JSON.stringify(config, null, 2));

    // Create secrets rotation tracking file
    const rotationTrackingPath = path.join(process.cwd(), '.secrets-rotation.json');
    const rotationTracking = {
      lastCheck: new Date().toISOString(),
      rotationHistory: []
    };

    fs.writeFileSync(rotationTrackingPath, JSON.stringify(rotationTracking, null, 2));

    // Add to .gitignore if not already present
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    let gitignoreContent = '';
    
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    const secretsEntries = [
      '.env',
      '.env.local',
      '.env.production',
      '.secrets-rotation.json'
    ];

    let needsUpdate = false;
    secretsEntries.forEach(entry => {
      if (!gitignoreContent.includes(entry)) {
        gitignoreContent += `\n${entry}`;
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      fs.writeFileSync(gitignorePath, gitignoreContent);
      console.log('✅ Updated .gitignore with secrets entries');
    }

    console.log('✅ Secrets management initialized successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: npm run secrets validate');
    console.log('   2. Generate secure secrets: npm run secrets generate session');
    console.log('   3. Update your .env files with strong values');
    console.log('   4. Run: npm run secrets audit');
  }

  /**
   * Find suspicious environment variables
   */
  findSuspiciousVariables() {
    const suspicious = [];
    
    Object.entries(process.env).forEach(([key, value]) => {
      if (!value) return;
      
      // Check for hardcoded URLs with credentials
      if (value.match(/https?:\/\/[^:]+:[^@]+@/)) {
        suspicious.push({
          name: key,
          reason: 'Contains credentials in URL'
        });
      }
      
      // Check for common weak patterns
      if (value.match(/^(password|secret|key)\d*$/i)) {
        suspicious.push({
          name: key,
          reason: 'Uses common weak pattern'
        });
      }
      
      // Check for file paths that might contain secrets
      if (value.match(/\.(key|pem|p12|pfx)$/i)) {
        suspicious.push({
          name: key,
          reason: 'Points to potential private key file'
        });
      }
    });
    
    return suspicious;
  }

  /**
   * Show CLI help
   */
  showHelp() {
    console.log(`
🔐 DinoAir Secrets Management CLI

Usage: node scripts/secrets-cli.js <command> [options]

Commands:
  validate [--strict] [--json] [--report]
    Validate environment variables for security issues
    --strict: Enable strict validation mode
    --json: Output results in JSON format
    --report: Generate detailed security report

  generate <type> [length] [encoding]
    Generate secure secrets
    Types: session, jwt, api-key, custom
    Default: session secret (32 bytes, hex)

  audit [--detailed] [--save]
    Perform comprehensive security audit
    --detailed: Show detailed analysis
    --save: Save audit report to file

  rotation-check [--force]
    Check which secrets need rotation
    --force: Force check even if recently performed

  init [--force]
    Initialize secrets management in project
    --force: Reinitialize if already setup

  help
    Show this help message

Examples:
  node scripts/secrets-cli.js validate --strict
  node scripts/secrets-cli.js generate session
  node scripts/secrets-cli.js audit --detailed --save
  node scripts/secrets-cli.js rotation-check
  node scripts/secrets-cli.js init

Security Best Practices:
  • Never commit .env files to version control
  • Use strong, unique secrets for each environment
  • Rotate secrets regularly (every 30-90 days)
  • Use a dedicated secrets management service in production
  • Separate client-side and server-side environment variables
`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new SecretsManagerCLI();
  cli.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = SecretsManagerCLI;