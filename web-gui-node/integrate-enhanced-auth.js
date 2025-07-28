#!/usr/bin/env node

/**
 * Integration script for enhanced authentication system
 * Provides guided setup and validation for new security features
 */

const fs = require('fs');
const path = require('path');

console.log('🛡️  DinoAir Enhanced Authentication Integration Guide');
console.log('==================================================\n');

// Check file structure
console.log('📁 Checking file structure...');
const requiredFiles = [
  'lib/session-manager.js',
  'lib/mfa-manager.js', 
  'lib/lockout-manager.js',
  'lib/permissions-manager.js',
  'middleware/enhanced-auth-middleware.js',
  'routes/auth-enhanced.js',
  'scripts/setup-enhanced-security.js',
  'scripts/setup-enhanced-security-tables.sql',
  'tests/enhanced-auth.test.js'
];

let allFilesPresent = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesPresent = false;
  }
}

if (!allFilesPresent) {
  console.log('\n❌ Some required files are missing. Please ensure all files are properly created.');
  process.exit(1);
}

console.log('\n✅ All required files are present!\n');

// Check package.json dependencies
console.log('📦 Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    '@supabase/supabase-js',
    'speakeasy',
    'qrcode',
    'bcrypt',
    'jsonwebtoken',
    'express-session',
    'express-rate-limit'
  ];

  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep] || packageJson.devDependencies?.[dep]) {
      console.log(`✅ ${dep}`);
    } else {
      console.log(`⚠️  ${dep} - not found in package.json`);
    }
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
}

console.log('\n📋 Integration Checklist:');
console.log('=========================\n');

console.log('1. 🗄️  Database Setup:');
console.log('   Run: node scripts/setup-enhanced-security.js');
console.log('   This creates the required database tables for:');
console.log('   • Session management with activity tracking');
console.log('   • MFA secrets and backup codes');
console.log('   • Progressive account lockouts');
console.log('   • API key permissions');
console.log('   • Security event audit logs\n');

console.log('2. 🔧 Environment Configuration:');
console.log('   Add to your .env file:');
console.log('   MFA_ENCRYPTION_KEY=your-secure-key-here');
console.log('   SESSION_DEFAULT_TIMEOUT=28800000  # 8 hours');
console.log('   SESSION_SLIDING_TIMEOUT=1800000   # 30 minutes');
console.log('   SESSION_MAX_PER_USER=5\n');

console.log('3. 🔌 Server Integration:');
console.log('   Update your server.js file:');
console.log('   ```javascript');
console.log('   const authEnhanced = require("./routes/auth-enhanced");');
console.log('   const { enhancedAuth, requirePermission } = require("./middleware/enhanced-auth-middleware");');
console.log('   ');
console.log('   // Enhanced auth routes');
console.log('   app.use("/auth", authEnhanced);');
console.log('   ');
console.log('   // Enhanced auth middleware');
console.log('   app.use("/api", enhancedAuth);');
console.log('   ');
console.log('   // Permission-based endpoints');
console.log('   app.get("/api/admin", requirePermission("admin"), handler);');
console.log('   app.get("/api/chat", requirePermission("chat:read"), handler);');
console.log('   ```\n');

console.log('4. 🧪 Testing:');
console.log('   Run: npm test -- enhanced-auth.test.js');
console.log('   This validates all new authentication features\n');

console.log('5. 📚 Features Available:');
console.log('   ✅ Sliding session timeouts (auto-extend on activity)');
console.log('   ✅ Multi-factor authentication (TOTP + backup codes)');
console.log('   ✅ Progressive account lockouts (4 escalating levels)');
console.log('   ✅ Role-based API key permissions');
console.log('   ✅ Session invalidation on suspicious activity');
console.log('   ✅ Comprehensive security event logging\n');

console.log('6. 🔐 New API Endpoints:');
console.log('   Authentication:');
console.log('   • POST /auth/signin - Enhanced signin with MFA support');
console.log('   • POST /auth/signout - Enhanced signout with session cleanup');
console.log('   ');
console.log('   MFA Management:');
console.log('   • POST /auth/mfa/setup - Setup TOTP with QR code');
console.log('   • POST /auth/mfa/verify - Verify TOTP token');
console.log('   • GET /auth/mfa/status - Get MFA status');
console.log('   • POST /auth/mfa/backup-codes/regenerate - New backup codes');
console.log('   • POST /auth/mfa/disable - Disable MFA');
console.log('   ');
console.log('   Session Management:');
console.log('   • GET /auth/sessions - List active sessions');
console.log('   • DELETE /auth/sessions/:id - Invalidate session');
console.log('   • POST /auth/sessions/invalidate-others - Kill other sessions\n');

console.log('🔍 Next Steps:');
console.log('==============\n');
console.log('1. Install dependencies: npm install');
console.log('2. Setup database: node scripts/setup-enhanced-security.js');
console.log('3. Configure environment variables');
console.log('4. Update your server.js integration');
console.log('5. Test the new features');
console.log('6. Update your frontend to use new MFA flows');
console.log('7. Train users on new security features\n');

console.log('📖 Documentation:');
console.log('See ENHANCED_AUTHENTICATION.md for complete usage guide\n');

console.log('🎉 Enhanced Authentication System Ready!');
console.log('This implementation provides enterprise-grade security while maintaining usability.');

// Check for existing auth routes that might conflict
if (fs.existsSync('routes/auth.js')) {
  console.log('\n⚠️  Notice: Existing routes/auth.js found.');
  console.log('Consider updating it to use enhanced features or renaming to avoid conflicts.');
}

if (fs.existsSync('middleware/auth-middleware.js')) {
  console.log('\n⚠️  Notice: Existing middleware/auth-middleware.js found.');
  console.log('You may want to gradually migrate to enhanced-auth-middleware.js');
}