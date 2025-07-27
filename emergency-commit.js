#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const commitMessage = process.argv.slice(2).join(' ') || 'Emergency commit';

console.log('\n⚠️  EMERGENCY COMMIT MODE ⚠️');
console.log('This will bypass ALL pre-commit checks!');
console.log(`\nCommit message: "${commitMessage}"`);
console.log('\nThis should only be used when:');
console.log('  • You need to commit WIP code urgently');
console.log('  • Pre-commit hooks are broken');
console.log('  • You\'re fixing the linting setup itself');
console.log('\n🚨 Remember to fix linting issues later!\n');

rl.question('Are you sure you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    try {
      const date = new Date().toISOString();
      const fs = require('fs');
      const emergencyLog = `.emergency-commits.log`;
      
      fs.appendFileSync(emergencyLog, `${date}: ${commitMessage}\n`);
      
      console.log('\n📝 Creating emergency commit...');
      execSync(`SKIP_HOOKS=1 git commit -m "${commitMessage} [EMERGENCY]"`, { 
        stdio: 'inherit',
        env: { ...process.env, SKIP_HOOKS: '1' }
      });
      
      console.log('\n✅ Emergency commit created successfully!');
      console.log('\n📋 TODO: Run these commands later to fix issues:');
      console.log('  npm run lint:fix       # In both web-gui and web-gui-node');
      console.log('  npm run format:fix     # Fix formatting');
      console.log('  npm test               # Ensure tests pass');
      console.log('\n💡 To see all emergency commits: cat .emergency-commits.log');
      
    } catch (error) {
      console.error('\n❌ Emergency commit failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n❌ Emergency commit cancelled.');
  }
  
  rl.close();
});