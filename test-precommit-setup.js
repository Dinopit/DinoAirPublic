#!/usr/bin/env node

/**
 * Test script to verify pre-commit setup is working correctly
 * This script simulates what happens during a git commit
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Pre-commit Setup');
console.log('============================\n');

// Check if .pre-commit-config.yaml exists
console.log('1. Checking .pre-commit-config.yaml...');
if (fs.existsSync('.pre-commit-config.yaml')) {
    console.log('   ✅ .pre-commit-config.yaml found');
} else {
    console.log('   ❌ .pre-commit-config.yaml not found');
    process.exit(1);
}

// Check if Husky is configured
console.log('\n2. Checking Husky configuration...');
if (fs.existsSync('.husky/pre-commit')) {
    console.log('   ✅ .husky/pre-commit found');
    const huskyContent = fs.readFileSync('.husky/pre-commit', 'utf8');
    if (huskyContent.includes('pre-commit run')) {
        console.log('   ✅ Husky configured to run pre-commit framework');
    } else {
        console.log('   ⚠️  Husky exists but may not be configured for pre-commit framework');
    }
} else {
    console.log('   ❌ .husky/pre-commit not found');
}

// Check if pre-commit is available
console.log('\n3. Checking pre-commit availability...');
try {
    execSync('python -m pre_commit --version', { stdio: 'pipe' });
    console.log('   ✅ pre-commit framework is available');
} catch (error) {
    console.log('   ❌ pre-commit framework not available');
    console.log('   💡 Install with: pip install pre-commit');
}

// Check package.json configurations
console.log('\n4. Checking package.json configurations...');
const webGuiPackage = path.join('web-gui', 'package.json');
const webGuiNodePackage = path.join('web-gui-node', 'package.json');

if (fs.existsSync(webGuiPackage)) {
    const pkg = JSON.parse(fs.readFileSync(webGuiPackage, 'utf8'));
    if (pkg.devDependencies && pkg.devDependencies.husky) {
        console.log('   ✅ web-gui has Husky configured');
    }
    if (pkg.devDependencies && pkg.devDependencies['lint-staged']) {
        console.log('   ✅ web-gui has lint-staged configured');
    }
}

if (fs.existsSync(webGuiNodePackage)) {
    const pkg = JSON.parse(fs.readFileSync(webGuiNodePackage, 'utf8'));
    if (pkg.devDependencies && pkg.devDependencies.husky) {
        console.log('   ✅ web-gui-node has Husky configured');
    }
    if (pkg.devDependencies && pkg.devDependencies['lint-staged']) {
        console.log('   ✅ web-gui-node has lint-staged configured');
    }
}

console.log('\n🎉 Pre-commit setup verification complete!');
console.log('\n📝 Next steps for developers:');
console.log('   1. Install pre-commit: pip install pre-commit');
console.log('   2. The hooks will run automatically on git commit');
console.log('   3. If pre-commit is not installed, Husky will still run lint-staged and quality checks');