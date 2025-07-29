/**
 * Unit Tests for Logger Module
 */

const Logger = require('../../lib/logger');

describe('Logger', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    // Mock console methods
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      clear: jest.spyOn(console, 'clear').mockImplementation(() => {})
    };
    
    logger = new Logger();
  });

  afterEach(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('Constructor', () => {
    it('should create logger with default options', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger.debugMode).toBe(false);
      expect(defaultLogger.silent).toBe(false);
      expect(defaultLogger.prefix).toBe('[DinoAir]');
    });

    it('should create logger with custom options', () => {
      const customLogger = new Logger({
        debug: true,
        silent: true,
        prefix: '[Custom]'
      });
      expect(customLogger.debugMode).toBe(true);
      expect(customLogger.silent).toBe(true);
      expect(customLogger.prefix).toBe('[Custom]');
    });

    it('should detect debug mode from command line arguments', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'script.js', '--debug'];
      
      const debugLogger = new Logger();
      expect(debugLogger.debugMode).toBe(true);
      
      process.argv = originalArgv;
    });
  });

  describe('Basic Logging Methods', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Test info message')
      );
    });

    it('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]')
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Test warning message')
      );
    });

    it('should log error messages', () => {
      logger.error('Test error message');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]')
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Test error message')
      );
    });

    it('should log success messages', () => {
      logger.success('Test success message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[SUCCESS]')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Test success message')
      );
    });

    it('should log debug messages only in debug mode', () => {
      // Debug mode off
      logger.debug('Debug message');
      expect(consoleSpy.log).not.toHaveBeenCalled();

      // Enable debug mode
      logger.enableDebug();
      logger.debug('Debug message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Debug message')
      );
    });

    it('should log raw messages without formatting', () => {
      logger.raw('Raw message');
      expect(consoleSpy.log).toHaveBeenCalledWith('Raw message');
    });
  });

  describe('Silent Mode', () => {
    it('should not log when silent mode is enabled', () => {
      logger.enableSilent();
      
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      logger.success('Success message');
      logger.debug('Debug message');
      logger.raw('Raw message');
      
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should resume logging when silent mode is disabled', () => {
      logger.enableSilent();
      logger.info('Silent message');
      expect(consoleSpy.log).not.toHaveBeenCalled();
      
      logger.disableSilent();
      logger.info('Visible message');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Visible message')
      );
    });
  });

  describe('Formatting Methods', () => {
    it('should create section headers', () => {
      logger.section('Test Section');
      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('='.repeat(50))
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Test Section')
      );
    });

    it('should create subsection headers', () => {
      logger.subsection('Test Subsection');
      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('-'.repeat(30))
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Test Subsection')
      );
    });

    it('should log lists with default options', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      logger.list(items);
      
      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
      items.forEach(item => {
        expect(consoleSpy.log).toHaveBeenCalledWith(
          expect.stringContaining(item)
        );
      });
    });

    it('should log lists with custom options', () => {
      const items = ['Item 1', 'Item 2'];
      logger.list(items, { bullet: '-', indent: '    ' });
      
      expect(consoleSpy.log).toHaveBeenCalledTimes(2);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Item 1')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Item 2')
      );
    });

    it('should log key-value pairs', () => {
      const pairs = { key1: 'value1', key2: 'value2' };
      logger.keyValue(pairs);
      
      expect(consoleSpy.log).toHaveBeenCalledTimes(2);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('key1')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('value1')
      );
    });

    it('should log progress steps', () => {
      logger.step(2, 5, 'Processing step 2');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[2/5]')
      );
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Processing step 2')
      );
    });

    it('should log installation steps with different statuses', () => {
      logger.installStep('Installing component', 'running');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('⏳')
      );

      logger.installStep('Component installed', 'complete');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('✅')
      );

      logger.installStep('Installation failed', 'error');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('❌')
      );

      logger.installStep('Skipped component', 'skipped');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('⏭️')
      );
    });
  });

  describe('Utility Methods', () => {
    it('should clear console', () => {
      logger.clear();
      expect(consoleSpy.clear).toHaveBeenCalled();
    });

    it('should add new lines', () => {
      logger.newLine();
      expect(consoleSpy.log).toHaveBeenCalledWith();
    });

    it('should log colored messages', () => {
      logger.colored('Colored message', 'red');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('Colored message')
      );
    });

    it('should handle invalid colors gracefully', () => {
      logger.colored('Message', 'invalidcolor');
      expect(consoleSpy.log).toHaveBeenCalledWith('Message');
    });
  });

  describe('Mode Controls', () => {
    it('should enable and disable debug mode', () => {
      expect(logger.debugMode).toBe(false);
      
      logger.enableDebug();
      expect(logger.debugMode).toBe(true);
      
      logger.disableDebug();
      expect(logger.debugMode).toBe(false);
    });

    it('should enable and disable silent mode', () => {
      expect(logger.silent).toBe(false);
      
      logger.enableSilent();
      expect(logger.silent).toBe(true);
      
      logger.disableSilent();
      expect(logger.silent).toBe(false);
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with inherited options', () => {
      logger.enableDebug();
      logger.enableSilent();
      
      const child = logger.child();
      expect(child.debugMode).toBe(true);
      expect(child.silent).toBe(true);
      expect(child.prefix).toBe('[DinoAir]');
    });

    it('should create child logger with custom options', () => {
      const child = logger.child({ prefix: '[Child]', debug: false });
      expect(child.prefix).toBe('[Child]');
      expect(child.debugMode).toBe(false);
    });

    it('should create independent child logger instance', () => {
      const child = logger.child();
      expect(child).toBeInstanceOf(Logger);
      expect(child).not.toBe(logger);
    });
  });

  describe('Message Formatting', () => {
    it('should format messages with timestamp and prefix', () => {
      logger.info('Test message');
      const call = consoleSpy.log.mock.calls[0][0];
      
      expect(call).toMatch(/\[\d{1,2}:\d{2}:\d{2}.*\]/); // Timestamp
      expect(call).toContain('[DinoAir]'); // Prefix
      expect(call).toContain('[INFO]'); // Level
      expect(call).toContain('Test message'); // Message
    });

    it('should handle different log levels correctly', () => {
      const testCases = [
        { method: 'info', level: '[INFO]', spy: 'log' },
        { method: 'warn', level: '[WARN]', spy: 'warn' },
        { method: 'error', level: '[ERROR]', spy: 'error' },
        { method: 'success', level: '[SUCCESS]', spy: 'log' },
        { method: 'debug', level: '[DEBUG]', spy: 'log' }
      ];

      logger.enableDebug(); // Enable debug for testing

      testCases.forEach(({ method, level, spy }) => {
        consoleSpy.log.mockClear();
        consoleSpy.warn.mockClear();
        consoleSpy.error.mockClear();
        
        logger[method]('Test message');
        const calls = consoleSpy[spy].mock.calls;
        if (calls.length > 0) {
          expect(calls[calls.length - 1][0]).toContain(level);
        }
      });
    });

    it('should handle custom log levels in getLevelTag', () => {
      // Test the default case in getLevelTag method (line 49)
      const customLevel = 'custom';
      const result = logger.getLevelTag(customLevel);
      expect(result).toContain('[CUSTOM]');
    });
  });

  describe('Installation Step Edge Cases', () => {
    it('should handle unknown status in installStep', () => {
      // Test the default case in installStep method (lines 213-214)
      logger.installStep('Unknown status test', 'unknown');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️')
      );
    });
  });
});