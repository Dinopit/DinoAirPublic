/**
 * Logger Module
 * Provides colored logging functionality for the DinoAir CLI installer
 */

const chalk = require('chalk');

class Logger {
  constructor(options = {}) {
    // Parse command line arguments for verbosity settings
    this.parseCommandLineArgs();
    
    // Set verbosity levels (can be overridden by options)
    this.verbosityLevel = options.verbosity !== undefined ? options.verbosity : this.getVerbosityFromArgs();
    this.debugMode = options.debug !== undefined ? options.debug : (this.verbosityLevel >= 4 || process.argv.includes('--debug') || process.argv.includes('--dev'));
    this.silent = options.silent !== undefined ? options.silent : (this.verbosityLevel === 0);
    this.quiet = options.quiet !== undefined ? options.quiet : (this.verbosityLevel === 1);
    this.verbose = options.verbose !== undefined ? options.verbose : (this.verbosityLevel >= 3);
    this.noColor = options.noColor !== undefined ? options.noColor : process.argv.includes('--no-color');
    
    this.prefix = options.prefix || '[DinoAir]';
    
    // Verbosity levels:
    // 0 = silent (no output)
    // 1 = quiet (errors only)
    // 2 = normal (errors, warnings, info, success)
    // 3 = verbose (+ detailed info)
    // 4 = debug (+ debug messages)
    // 5 = trace (+ trace messages)
    
    if (this.verbosityLevel >= 4 && !this.silent) {
      this.debug(`Logger initialized with verbosity level: ${this.verbosityLevel}`);
    }
  }

  /**
   * Parse command line arguments for verbosity settings
   */
  parseCommandLineArgs() {
    this.cmdArgs = {
      silent: process.argv.includes('--silent') || process.argv.includes('-s'),
      quiet: process.argv.includes('--quiet') || process.argv.includes('-q'),
      verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
      debug: process.argv.includes('--debug') || process.argv.includes('--dev'),
      trace: process.argv.includes('--trace'),
      noColor: process.argv.includes('--no-color')
    };
  }

  /**
   * Get verbosity level from command line arguments
   * @returns {number} Verbosity level (0-5)
   */
  getVerbosityFromArgs() {
    if (this.cmdArgs.silent) return 0;
    if (this.cmdArgs.quiet) return 1;
    if (this.cmdArgs.trace) return 5;
    if (this.cmdArgs.debug) return 4;
    if (this.cmdArgs.verbose) return 3;
    return 2; // normal
  }

  /**
   * Set verbosity level programmatically
   * @param {number} level - Verbosity level (0-5)
   */
  setVerbosity(level) {
    this.verbosityLevel = Math.max(0, Math.min(5, level));
    this.silent = this.verbosityLevel === 0;
    this.quiet = this.verbosityLevel === 1;
    this.verbose = this.verbosityLevel >= 3;
    this.debugMode = this.verbosityLevel >= 4;
    
    if (this.verbosityLevel >= 4) {
      this.debug(`Verbosity level changed to: ${this.verbosityLevel}`);
    }
  }

  /**
   * Get current verbosity level
   * @returns {number} Current verbosity level
   */
  getVerbosity() {
    return this.verbosityLevel;
  }

  /**
   * Check if should output at given level
   * @param {number} requiredLevel - Required verbosity level
   * @returns {boolean} True if should output
   */
  shouldOutput(requiredLevel) {
    return this.verbosityLevel >= requiredLevel;
  }

  /**
   * Format timestamp for logs
   */
  getTimestamp() {
    return new Date().toLocaleTimeString();
  }

  /**
   * Format log message with prefix and timestamp
   */
  formatMessage(level, message) {
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const prefix = chalk.blue(this.prefix);
    const levelTag = this.getLevelTag(level);
    
    return `${timestamp} ${prefix} ${levelTag} ${message}`;
  }

  /**
   * Get colored level tag
   */
  getLevelTag(level) {
    const tags = {
      'info': this.noColor ? '[INFO]' : chalk.cyan('[INFO]'),
      'warn': this.noColor ? '[WARN]' : chalk.yellow('[WARN]'),
      'error': this.noColor ? '[ERROR]' : chalk.red('[ERROR]'),
      'success': this.noColor ? '[SUCCESS]' : chalk.green('[SUCCESS]'),
      'debug': this.noColor ? '[DEBUG]' : chalk.magenta('[DEBUG]'),
      'trace': this.noColor ? '[TRACE]' : chalk.gray('[TRACE]'),
      'detail': this.noColor ? '[DETAIL]' : chalk.blue('[DETAIL]')
    };
    
    return tags[level] || (this.noColor ? `[${level.toUpperCase()}]` : chalk.white(`[${level.toUpperCase()}]`));
  }

  /**
   * Log info message (verbosity level 2+)
   */
  info(message) {
    if (this.shouldOutput(2)) {
      console.log(this.formatMessage('info', message));
    }
  }

  /**
   * Log warning message (verbosity level 1+)
   */
  warn(message) {
    if (this.shouldOutput(1)) {
      console.warn(this.formatMessage('warn', message));
    }
  }

  /**
   * Log error message (verbosity level 1+)
   */
  error(message) {
    if (this.shouldOutput(1)) {
      console.error(this.formatMessage('error', message));
    }
  }

  /**
   * Log success message (verbosity level 2+)
   */
  success(message) {
    if (this.shouldOutput(2)) {
      console.log(this.formatMessage('success', message));
    }
  }

  /**
   * Log debug message (verbosity level 4+)
   */
  debug(message) {
    if (this.shouldOutput(4)) {
      console.log(this.formatMessage('debug', message));
    }
  }

  /**
   * Log trace message (verbosity level 5+)
   */
  trace(message) {
    if (this.shouldOutput(5)) {
      console.log(this.formatMessage('trace', message));
    }
  }

  /**
   * Log detailed message (verbosity level 3+)
   */
  detail(message) {
    if (this.shouldOutput(3)) {
      console.log(this.formatMessage('detail', message));
    }
  }

  /**
   * Log raw message without formatting (verbosity level 2+)
   */
  raw(message) {
    if (this.shouldOutput(2)) {
      console.log(message);
    }
  }

  /**
   * Log with custom color (verbosity level 2+)
   */
  colored(message, color = 'white') {
    if (this.shouldOutput(2)) {
      const coloredMessage = this.noColor ? message : (chalk[color] ? chalk[color](message) : message);
      console.log(coloredMessage);
    }
  }

  /**
   * Display help information for verbosity options
   */
  showVerbosityHelp() {
    if (this.shouldOutput(2)) {
      console.log('\nVerbosity Options:');
      console.log('  --silent, -s     No output (level 0)');
      console.log('  --quiet, -q      Errors only (level 1)');
      console.log('  (default)        Normal output (level 2)');
      console.log('  --verbose, -v    Detailed output (level 3)');
      console.log('  --debug          Debug output (level 4)');
      console.log('  --trace          Trace output (level 5)');
      console.log('  --no-color       Disable colored output');
      console.log('');
    }
  }

  /**
   * Get verbosity level description
   * @returns {string} Description of current verbosity level
   */
  getVerbosityDescription() {
    const descriptions = {
      0: 'Silent (no output)',
      1: 'Quiet (errors only)',
      2: 'Normal (standard output)',
      3: 'Verbose (detailed output)',
      4: 'Debug (debug messages)',
      5: 'Trace (all messages)'
    };
    return descriptions[this.verbosityLevel] || 'Unknown';
  }

  /**
   * Check if currently in quiet mode
   * @returns {boolean} True if in quiet mode
   */
  isQuiet() {
    return this.verbosityLevel <= 1;
  }

  /**
   * Check if currently in verbose mode
   * @returns {boolean} True if in verbose mode
   */
  isVerbose() {
    return this.verbosityLevel >= 3;
  }

  /**
   * Check if currently in debug mode
   * @returns {boolean} True if in debug mode
   */
  isDebug() {
    return this.verbosityLevel >= 4;
  }

  /**
   * Create a section header
   */
  section(title) {
    if (!this.silent) {
      const separator = '='.repeat(50);
      console.log(chalk.cyan(separator));
      console.log(chalk.cyan.bold(`  ${title}`));
      console.log(chalk.cyan(separator));
    }
  }

  /**
   * Create a subsection header
   */
  subsection(title) {
    if (!this.silent) {
      const separator = '-'.repeat(30);
      console.log(chalk.blue(separator));
      console.log(chalk.blue.bold(`  ${title}`));
      console.log(chalk.blue(separator));
    }
  }

  /**
   * Log a list of items
   */
  list(items, options = {}) {
    if (this.silent) return;

    const bullet = options.bullet || '•';
    const color = options.color || 'white';
    const indent = options.indent || '  ';

    items.forEach(item => {
      const coloredBullet = chalk[color] ? chalk[color](bullet) : bullet;
      console.log(`${indent}${coloredBullet} ${item}`);
    });
  }

  /**
   * Log key-value pairs
   */
  keyValue(pairs, options = {}) {
    if (this.silent) return;

    const keyColor = options.keyColor || 'cyan';
    const valueColor = options.valueColor || 'white';
    const separator = options.separator || ': ';
    const indent = options.indent || '  ';

    Object.entries(pairs).forEach(([key, value]) => {
      const coloredKey = chalk[keyColor] ? chalk[keyColor](key) : key;
      const coloredValue = chalk[valueColor] ? chalk[valueColor](value) : value;
      console.log(`${indent}${coloredKey}${separator}${coloredValue}`);
    });
  }

  /**
   * Log a progress step
   */
  step(stepNumber, totalSteps, message) {
    if (!this.silent) {
      const progress = chalk.gray(`[${stepNumber}/${totalSteps}]`);
      const arrow = chalk.blue('→');
      console.log(`${progress} ${arrow} ${message}`);
    }
  }

  /**
   * Log an installation step with status
   */
  installStep(message, status = 'running') {
    if (this.silent) return;

    let statusIcon;
    let statusColor;

    switch (status) {
      case 'running':
        statusIcon = '⏳';
        statusColor = 'yellow';
        break;
      case 'complete':
        statusIcon = '✅';
        statusColor = 'green';
        break;
      case 'error':
        statusIcon = '❌';
        statusColor = 'red';
        break;
      case 'skipped':
        statusIcon = '⏭️';
        statusColor = 'gray';
        break;
      default:
        statusIcon = 'ℹ️';
        statusColor = 'blue';
    }

    const coloredMessage = chalk[statusColor] ? chalk[statusColor](message) : message;
    console.log(`${statusIcon} ${coloredMessage}`);
  }

  /**
   * Clear the console
   */
  clear() {
    if (!this.silent) {
      console.clear();
    }
  }

  /**
   * Add empty line
   */
  newLine() {
    if (!this.silent) {
      console.log();
    }
  }

  /**
   * Enable debug mode
   */
  enableDebug() {
    this.debugMode = true;
  }

  /**
   * Disable debug mode
   */
  disableDebug() {
    this.debugMode = false;
  }

  /**
   * Enable silent mode
   */
  enableSilent() {
    this.silent = true;
  }

  /**
   * Disable silent mode
   */
  disableSilent() {
    this.silent = false;
  }

  /**
   * Create a child logger with different options
   */
  child(options = {}) {
    return new Logger({
      debug: this.debugMode,
      silent: this.silent,
      prefix: this.prefix,
      ...options
    });
  }
}

module.exports = Logger;