const readline = require('readline');

class ConsentHandler {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async getConsent() {
    console.log('\n🔒 Privacy & Data Collection Consent');
    console.log('=====================================\n');
    
    console.log('DinoAir respects your privacy. We collect minimal data to provide our services.');
    console.log('Please review and choose your data collection preferences:\n');

    console.log('📋 Data we collect:');
    console.log('  • Essential: Authentication, chat sessions, user preferences (required)');
    console.log('  • Analytics: Usage patterns, performance metrics (optional)');
    console.log('  • Improvements: Feature usage data for development (optional)\n');

    const essential = true;
    console.log('✅ Essential data collection: REQUIRED (cannot be disabled)\n');

    const analytics = await this.askQuestion('📊 Allow analytics data collection? (y/N): ');
    const improvements = await this.askQuestion('🔧 Allow improvement data collection? (y/N): ');

    const consent = {
      essential,
      analytics: this.parseYesNo(analytics),
      improvements: this.parseYesNo(improvements),
      timestamp: new Date().toISOString()
    };

    console.log('\n📝 Your privacy preferences:');
    console.log(`  • Essential: ${consent.essential ? 'Enabled' : 'Disabled'}`);
    console.log(`  • Analytics: ${consent.analytics ? 'Enabled' : 'Disabled'}`);
    console.log(`  • Improvements: ${consent.improvements ? 'Enabled' : 'Disabled'}`);
    
    const confirm = await this.askQuestion('\nConfirm these settings? (Y/n): ');
    
    if (this.parseYesNo(confirm, true)) {
      console.log('\n✅ Privacy preferences saved!');
      console.log('You can change these settings anytime in the DinoAir settings panel.\n');
      
      try {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(process.cwd(), '.dinoair-consent.json');
        fs.writeFileSync(configPath, JSON.stringify(consent, null, 2));
      } catch (error) {
        console.warn('Warning: Could not save consent preferences to file:', error.message);
      }
      
      return consent;
    } else {
      console.log('\nPlease review your choices again.\n');
      return this.getConsent();
    }
  }

  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  parseYesNo(answer, defaultValue = false) {
    const normalized = answer.toLowerCase();
    if (normalized === 'y' || normalized === 'yes') return true;
    if (normalized === 'n' || normalized === 'no') return false;
    return defaultValue;
  }

  close() {
    this.rl.close();
  }
}

module.exports = { ConsentHandler };
