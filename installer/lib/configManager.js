/**
 * Configuration Manager Module
 * Provides configuration file support for automated DinoAir installations
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class ConfigManager {
  constructor(options = {}) {
    this.logger = options.logger;
    this.verbose = options.verbose || false;
    
    // Default configuration schema
    this.defaultConfig = {
      installation: {
        mode: 'easy', // 'easy', 'advanced', 'custom'
        installPath: null, // null = auto-detect
        skipConfirmation: false,
        createShortcuts: true,
        addToPath: true
      },
      hardware: {
        autoDetect: true,
        forceGPU: false,
        forceCPU: false,
        memoryLimit: null // null = auto-detect
      },
      models: {
        downloadModels: true,
        modelTypes: ['qwen:7b-chat-v1.5-q4_K_M'], // Default models to download
        skipExisting: true,
        verifyChecksums: true
      },
      dependencies: {
        installPython: true,
        installNode: true,
        installGit: true,
        skipExisting: true,
        useSystemPackages: false
      },
      ui: {
        verbose: false,
        quiet: false,
        noProgress: false,
        noColor: false
      },
      advanced: {
        parallelDownloads: 3,
        retryAttempts: 3,
        timeout: 300000, // 5 minutes
        backupExisting: true,
        cleanupOnFailure: true
      }
    };
    
    this.config = null;
    this.configPath = null;
  }

  /**
   * Load configuration from file
   * @param {string} configPath - Path to configuration file
   * @returns {Object} Loaded configuration
   */
  async loadConfig(configPath) {
    try {
      if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      const ext = path.extname(configPath).toLowerCase();
      
      let parsedConfig;
      
      switch (ext) {
        case '.json':
          parsedConfig = JSON.parse(configContent);
          break;
        case '.yaml':
        case '.yml':
          parsedConfig = yaml.load(configContent);
          break;
        default:
          throw new Error(`Unsupported configuration file format: ${ext}. Supported formats: .json, .yaml, .yml`);
      }

      // Validate and merge with defaults
      this.config = this.validateAndMergeConfig(parsedConfig);
      this.configPath = configPath;
      
      if (this.verbose && this.logger) {
        this.logger.debug(`Configuration loaded from: ${configPath}`);
        this.logger.debug(`Configuration: ${JSON.stringify(this.config, null, 2)}`);
      }
      
      return this.config;
      
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to load configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Save configuration to file
   * @param {Object} config - Configuration to save
   * @param {string} configPath - Path to save configuration
   * @param {string} format - Format to save ('json' or 'yaml')
   */
  async saveConfig(config, configPath, format = 'json') {
    try {
      let configContent;
      
      switch (format.toLowerCase()) {
        case 'json':
          configContent = JSON.stringify(config, null, 2);
          break;
        case 'yaml':
        case 'yml':
          configContent = yaml.dump(config, {
            indent: 2,
            lineWidth: 120,
            noRefs: true
          });
          break;
        default:
          throw new Error(`Unsupported format: ${format}. Supported formats: json, yaml`);
      }

      // Ensure directory exists
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(configPath, configContent, 'utf8');
      
      if (this.verbose && this.logger) {
        this.logger.debug(`Configuration saved to: ${configPath}`);
      }
      
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to save configuration: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate example configuration file
   * @param {string} outputPath - Path to save example configuration
   * @param {string} format - Format to save ('json' or 'yaml')
   */
  async generateExampleConfig(outputPath, format = 'json') {
    const exampleConfig = {
      ...this.defaultConfig,
      // Add comments as properties for documentation
      _comments: {
        installation: "Installation settings",
        hardware: "Hardware detection and preferences",
        models: "AI model download settings",
        dependencies: "System dependency installation",
        ui: "User interface preferences",
        advanced: "Advanced installation options"
      }
    };

    await this.saveConfig(exampleConfig, outputPath, format);
    
    if (this.logger) {
      this.logger.success(`Example configuration generated: ${outputPath}`);
    }
  }

  /**
   * Validate and merge configuration with defaults
   * @param {Object} userConfig - User-provided configuration
   * @returns {Object} Validated and merged configuration
   */
  validateAndMergeConfig(userConfig) {
    const merged = this.deepMerge(this.defaultConfig, userConfig);
    
    // Validate configuration values
    this.validateConfig(merged);
    
    return merged;
  }

  /**
   * Validate configuration values
   * @param {Object} config - Configuration to validate
   */
  validateConfig(config) {
    const errors = [];

    // Validate installation mode
    const validModes = ['easy', 'advanced', 'custom'];
    if (!validModes.includes(config.installation.mode)) {
      errors.push(`Invalid installation mode: ${config.installation.mode}. Valid modes: ${validModes.join(', ')}`);
    }

    // Validate install path if provided
    if (config.installation.installPath && !path.isAbsolute(config.installation.installPath)) {
      errors.push(`Install path must be absolute: ${config.installation.installPath}`);
    }

    // Validate memory limit if provided
    if (config.hardware.memoryLimit && (typeof config.hardware.memoryLimit !== 'number' || config.hardware.memoryLimit <= 0)) {
      errors.push(`Memory limit must be a positive number: ${config.hardware.memoryLimit}`);
    }

    // Validate model types
    if (!Array.isArray(config.models.modelTypes)) {
      errors.push('Model types must be an array');
    }

    // Validate advanced settings
    if (config.advanced.parallelDownloads < 1 || config.advanced.parallelDownloads > 10) {
      errors.push('Parallel downloads must be between 1 and 10');
    }

    if (config.advanced.retryAttempts < 0 || config.advanced.retryAttempts > 10) {
      errors.push('Retry attempts must be between 0 and 10');
    }

    if (config.advanced.timeout < 10000 || config.advanced.timeout > 3600000) {
      errors.push('Timeout must be between 10 seconds and 1 hour');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Get configuration value by path
   * @param {string} path - Dot-separated path (e.g., 'installation.mode')
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} Configuration value
   */
  get(path, defaultValue = null) {
    if (!this.config) {
      return defaultValue;
    }

    const keys = path.split('.');
    let current = this.config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  /**
   * Set configuration value by path
   * @param {string} path - Dot-separated path (e.g., 'installation.mode')
   * @param {*} value - Value to set
   */
  set(path, value) {
    if (!this.config) {
      this.config = { ...this.defaultConfig };
    }

    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Check if running in automated mode
   * @returns {boolean} True if automated installation
   */
  isAutomated() {
    return this.config && this.config.installation.skipConfirmation;
  }

  /**
   * Get installation mode
   * @returns {string} Installation mode
   */
  getInstallationMode() {
    return this.get('installation.mode', 'easy');
  }

  /**
   * Get install path
   * @returns {string|null} Install path or null for auto-detect
   */
  getInstallPath() {
    return this.get('installation.installPath', null);
  }

  /**
   * Check if should skip confirmations
   * @returns {boolean} True if should skip confirmations
   */
  shouldSkipConfirmation() {
    return this.get('installation.skipConfirmation', false);
  }

  /**
   * Get UI preferences
   * @returns {Object} UI preferences
   */
  getUIPreferences() {
    return this.get('ui', {
      verbose: false,
      quiet: false,
      noProgress: false,
      noColor: false
    });
  }

  /**
   * Get current configuration
   * @returns {Object|null} Current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Check if configuration is loaded
   * @returns {boolean} True if configuration is loaded
   */
  isLoaded() {
    return this.config !== null;
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = null;
    this.configPath = null;
  }

  /**
   * Find configuration file in common locations
   * @param {string} startDir - Directory to start searching from
   * @returns {string|null} Path to configuration file or null if not found
   */
  findConfigFile(startDir = process.cwd()) {
    const configNames = [
      'dinoair.config.json',
      'dinoair.config.yaml',
      'dinoair.config.yml',
      '.dinoairrc.json',
      '.dinoairrc.yaml',
      '.dinoairrc.yml'
    ];

    const searchPaths = [
      startDir,
      path.join(startDir, 'config'),
      path.join(os.homedir(), '.dinoair'),
      path.join(os.homedir())
    ];

    for (const searchPath of searchPaths) {
      for (const configName of configNames) {
        const configPath = path.join(searchPath, configName);
        if (fs.existsSync(configPath)) {
          if (this.verbose && this.logger) {
            this.logger.debug(`Found configuration file: ${configPath}`);
          }
          return configPath;
        }
      }
    }

    return null;
  }
}

module.exports = ConfigManager;