/**
 * Rollback Manager Module
 * Provides rollback functionality for failed DinoAir installations
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { spawn } = require('child_process');

class RollbackManager {
  constructor(options = {}) {
    this.logger = options.logger;
    this.fileUtils = options.fileUtils;
    this.verbose = options.verbose || false;
    
    // Rollback state tracking
    this.rollbackState = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      installPath: null,
      actions: [],
      backups: [],
      createdFiles: [],
      createdDirectories: [],
      modifiedFiles: [],
      installedPackages: [],
      systemChanges: [],
      isActive: false
    };
    
    // Rollback data file path
    this.rollbackDataPath = path.join(process.cwd(), '.dinoair-rollback.json');
  }

  /**
   * Generate unique session ID for rollback tracking
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize rollback tracking
   * @param {string} installPath - Installation path
   */
  initialize(installPath) {
    this.rollbackState.installPath = installPath;
    this.rollbackState.isActive = true;
    this.rollbackState.startTime = Date.now();
    
    // Save initial state
    this.saveRollbackState();
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Rollback tracking initialized for session: ${this.rollbackState.sessionId}`);
      this.logger.debug(`Install path: ${installPath}`);
    }
  }

  /**
   * Track file creation
   * @param {string} filePath - Path of created file
   * @param {Object} metadata - Additional metadata
   */
  trackFileCreation(filePath, metadata = {}) {
    if (!this.rollbackState.isActive) return;
    
    const action = {
      type: 'file_created',
      path: filePath,
      timestamp: Date.now(),
      metadata
    };
    
    this.rollbackState.actions.push(action);
    this.rollbackState.createdFiles.push(filePath);
    this.saveRollbackState();
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Tracked file creation: ${filePath}`);
    }
  }

  /**
   * Track directory creation
   * @param {string} dirPath - Path of created directory
   * @param {Object} metadata - Additional metadata
   */
  trackDirectoryCreation(dirPath, metadata = {}) {
    if (!this.rollbackState.isActive) return;
    
    const action = {
      type: 'directory_created',
      path: dirPath,
      timestamp: Date.now(),
      metadata
    };
    
    this.rollbackState.actions.push(action);
    this.rollbackState.createdDirectories.push(dirPath);
    this.saveRollbackState();
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Tracked directory creation: ${dirPath}`);
    }
  }

  /**
   * Track file modification with backup
   * @param {string} filePath - Path of file to modify
   * @param {Object} metadata - Additional metadata
   */
  async trackFileModification(filePath, metadata = {}) {
    if (!this.rollbackState.isActive) return;
    
    try {
      // Create backup if file exists
      if (fs.existsSync(filePath)) {
        const backupPath = await this.createBackup(filePath);
        
        const action = {
          type: 'file_modified',
          path: filePath,
          backupPath,
          timestamp: Date.now(),
          metadata
        };
        
        this.rollbackState.actions.push(action);
        this.rollbackState.modifiedFiles.push({
          original: filePath,
          backup: backupPath
        });
        
        this.saveRollbackState();
        
        if (this.verbose && this.logger) {
          this.logger.debug(`Tracked file modification: ${filePath} (backup: ${backupPath})`);
        }
      }
    } catch (error) {
      if (this.logger) {
        this.logger.warn(`Failed to create backup for ${filePath}: ${error.message}`);
      }
    }
  }

  /**
   * Track package installation
   * @param {string} packageName - Name of installed package
   * @param {string} packageManager - Package manager used (npm, pip, etc.)
   * @param {Object} metadata - Additional metadata
   */
  trackPackageInstallation(packageName, packageManager, metadata = {}) {
    if (!this.rollbackState.isActive) return;
    
    const action = {
      type: 'package_installed',
      packageName,
      packageManager,
      timestamp: Date.now(),
      metadata
    };
    
    this.rollbackState.actions.push(action);
    this.rollbackState.installedPackages.push({
      name: packageName,
      manager: packageManager,
      ...metadata
    });
    
    this.saveRollbackState();
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Tracked package installation: ${packageName} (${packageManager})`);
    }
  }

  /**
   * Track system changes (registry, environment variables, etc.)
   * @param {string} changeType - Type of system change
   * @param {Object} changeData - Data about the change
   * @param {Object} metadata - Additional metadata
   */
  trackSystemChange(changeType, changeData, metadata = {}) {
    if (!this.rollbackState.isActive) return;
    
    const action = {
      type: 'system_change',
      changeType,
      changeData,
      timestamp: Date.now(),
      metadata
    };
    
    this.rollbackState.actions.push(action);
    this.rollbackState.systemChanges.push({
      type: changeType,
      data: changeData,
      ...metadata
    });
    
    this.saveRollbackState();
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Tracked system change: ${changeType}`);
    }
  }

  /**
   * Create backup of a file
   * @param {string} filePath - Path of file to backup
   * @returns {string} Path to backup file
   */
  async createBackup(filePath) {
    const backupDir = path.join(path.dirname(this.rollbackDataPath), '.dinoair-backups', this.rollbackState.sessionId);
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const fileName = path.basename(filePath);
    const timestamp = Date.now();
    const backupPath = path.join(backupDir, `${fileName}.${timestamp}.backup`);
    
    // Copy file to backup location
    if (this.fileUtils && this.fileUtils.copyFile) {
      await this.fileUtils.copyFile(filePath, backupPath);
    } else {
      fs.copyFileSync(filePath, backupPath);
    }
    
    this.rollbackState.backups.push({
      original: filePath,
      backup: backupPath,
      timestamp
    });
    
    return backupPath;
  }

  /**
   * Save rollback state to file
   */
  saveRollbackState() {
    try {
      fs.writeFileSync(this.rollbackDataPath, JSON.stringify(this.rollbackState, null, 2));
    } catch (error) {
      if (this.logger) {
        this.logger.warn(`Failed to save rollback state: ${error.message}`);
      }
    }
  }

  /**
   * Load rollback state from file
   * @param {string} rollbackDataPath - Path to rollback data file
   * @returns {Object|null} Loaded rollback state or null if not found
   */
  loadRollbackState(rollbackDataPath = this.rollbackDataPath) {
    try {
      if (fs.existsSync(rollbackDataPath)) {
        const data = fs.readFileSync(rollbackDataPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.warn(`Failed to load rollback state: ${error.message}`);
      }
    }
    return null;
  }

  /**
   * Execute rollback operation
   * @param {Object} options - Rollback options
   * @returns {boolean} True if rollback successful
   */
  async executeRollback(options = {}) {
    const { 
      interactive = true, 
      force = false,
      rollbackDataPath = this.rollbackDataPath 
    } = options;
    
    try {
      // Load rollback state
      const state = this.loadRollbackState(rollbackDataPath);
      if (!state) {
        if (this.logger) {
          this.logger.error('No rollback data found. Cannot perform rollback.');
        }
        return false;
      }
      
      if (this.logger) {
        this.logger.info(`Starting rollback for session: ${state.sessionId}`);
        this.logger.info(`Installation started: ${new Date(state.startTime).toLocaleString()}`);
        this.logger.info(`Actions to rollback: ${state.actions.length}`);
      }
      
      // Confirm rollback if interactive
      if (interactive && !force) {
        const { confirm } = await this.promptConfirmation();
        if (!confirm) {
          if (this.logger) {
            this.logger.info('Rollback cancelled by user.');
          }
          return false;
        }
      }
      
      // Execute rollback actions in reverse order
      const actions = [...state.actions].reverse();
      let successCount = 0;
      let failureCount = 0;
      
      for (const action of actions) {
        try {
          await this.executeRollbackAction(action);
          successCount++;
          
          if (this.verbose && this.logger) {
            this.logger.debug(`Rolled back: ${action.type} - ${action.path || action.packageName || action.changeType}`);
          }
        } catch (error) {
          failureCount++;
          if (this.logger) {
            this.logger.warn(`Failed to rollback ${action.type}: ${error.message}`);
          }
        }
      }
      
      // Clean up rollback data
      await this.cleanupRollbackData(state);
      
      if (this.logger) {
        this.logger.success(`Rollback completed: ${successCount} successful, ${failureCount} failed`);
      }
      
      return failureCount === 0;
      
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Rollback failed: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Execute individual rollback action
   * @param {Object} action - Rollback action to execute
   */
  async executeRollbackAction(action) {
    switch (action.type) {
      case 'file_created':
        await this.rollbackFileCreation(action);
        break;
      case 'directory_created':
        await this.rollbackDirectoryCreation(action);
        break;
      case 'file_modified':
        await this.rollbackFileModification(action);
        break;
      case 'package_installed':
        await this.rollbackPackageInstallation(action);
        break;
      case 'system_change':
        await this.rollbackSystemChange(action);
        break;
      default:
        throw new Error(`Unknown rollback action type: ${action.type}`);
    }
  }

  /**
   * Rollback file creation (delete file)
   * @param {Object} action - File creation action
   */
  async rollbackFileCreation(action) {
    if (fs.existsSync(action.path)) {
      fs.unlinkSync(action.path);
    }
  }

  /**
   * Rollback directory creation (remove directory)
   * @param {Object} action - Directory creation action
   */
  async rollbackDirectoryCreation(action) {
    if (fs.existsSync(action.path)) {
      // Only remove if directory is empty or force removal
      try {
        fs.rmdirSync(action.path);
      } catch (error) {
        // Directory not empty, try recursive removal
        if (this.fileUtils && this.fileUtils.removeDirectory) {
          await this.fileUtils.removeDirectory(action.path);
        } else {
          fs.rmSync(action.path, { recursive: true, force: true });
        }
      }
    }
  }

  /**
   * Rollback file modification (restore from backup)
   * @param {Object} action - File modification action
   */
  async rollbackFileModification(action) {
    if (action.backupPath && fs.existsSync(action.backupPath)) {
      if (this.fileUtils && this.fileUtils.copyFile) {
        await this.fileUtils.copyFile(action.backupPath, action.path);
      } else {
        fs.copyFileSync(action.backupPath, action.path);
      }
    }
  }

  /**
   * Rollback package installation (uninstall package)
   * @param {Object} action - Package installation action
   */
  async rollbackPackageInstallation(action) {
    const { packageName, packageManager } = action;
    
    try {
      let command, args;
      
      switch (packageManager) {
        case 'npm':
          command = 'npm';
          args = ['uninstall', packageName];
          break;
        case 'pip':
          command = 'pip';
          args = ['uninstall', '-y', packageName];
          break;
        case 'apt':
          command = 'apt';
          args = ['remove', '-y', packageName];
          break;
        default:
          throw new Error(`Unsupported package manager: ${packageManager}`);
      }
      
      await this.executeCommand(command, args);
      
    } catch (error) {
      throw new Error(`Failed to uninstall ${packageName}: ${error.message}`);
    }
  }

  /**
   * Rollback system change
   * @param {Object} action - System change action
   */
  async rollbackSystemChange(action) {
    const { changeType, changeData } = action;
    
    switch (changeType) {
      case 'environment_variable':
        // Restore or remove environment variable
        if (changeData.previousValue !== undefined) {
          process.env[changeData.name] = changeData.previousValue;
        } else {
          delete process.env[changeData.name];
        }
        break;
      case 'registry_key':
        // Windows registry rollback (would need Windows-specific implementation)
        if (this.logger) {
          this.logger.warn('Registry rollback not implemented');
        }
        break;
      case 'file_association':
        // File association rollback
        if (this.logger) {
          this.logger.warn('File association rollback not implemented');
        }
        break;
      default:
        throw new Error(`Unknown system change type: ${changeType}`);
    }
  }

  /**
   * Execute command with promise
   * @param {string} command - Command to execute
   * @param {Array} args - Command arguments
   * @returns {Promise} Command execution promise
   */
  executeCommand(command, args) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Prompt user for rollback confirmation
   * @returns {Object} User confirmation response
   */
  async promptConfirmation() {
    if (typeof require !== 'undefined') {
      try {
        const inquirer = require('inquirer');
        return await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Are you sure you want to rollback the installation? This will undo all changes made during the installation.',
            default: false
          }
        ]);
      } catch (error) {
        // Fallback if inquirer not available
        return { confirm: true };
      }
    }
    return { confirm: true };
  }

  /**
   * Clean up rollback data and backups
   * @param {Object} state - Rollback state
   */
  async cleanupRollbackData(state) {
    try {
      // Remove rollback data file
      if (fs.existsSync(this.rollbackDataPath)) {
        fs.unlinkSync(this.rollbackDataPath);
      }
      
      // Remove backup directory
      const backupDir = path.join(path.dirname(this.rollbackDataPath), '.dinoair-backups', state.sessionId);
      if (fs.existsSync(backupDir)) {
        if (this.fileUtils && this.fileUtils.removeDirectory) {
          await this.fileUtils.removeDirectory(backupDir);
        } else {
          fs.rmSync(backupDir, { recursive: true, force: true });
        }
      }
      
      if (this.verbose && this.logger) {
        this.logger.debug('Rollback data cleaned up');
      }
      
    } catch (error) {
      if (this.logger) {
        this.logger.warn(`Failed to cleanup rollback data: ${error.message}`);
      }
    }
  }

  /**
   * Complete rollback tracking (successful installation)
   */
  complete() {
    this.rollbackState.isActive = false;
    
    // Clean up rollback data on successful installation
    this.cleanupRollbackData(this.rollbackState);
    
    if (this.verbose && this.logger) {
      this.logger.debug('Rollback tracking completed - installation successful');
    }
  }

  /**
   * Check if rollback data exists
   * @param {string} rollbackDataPath - Path to rollback data file
   * @returns {boolean} True if rollback data exists
   */
  hasRollbackData(rollbackDataPath = this.rollbackDataPath) {
    return fs.existsSync(rollbackDataPath);
  }

  /**
   * Get rollback summary
   * @param {string} rollbackDataPath - Path to rollback data file
   * @returns {Object|null} Rollback summary or null if no data
   */
  getRollbackSummary(rollbackDataPath = this.rollbackDataPath) {
    const state = this.loadRollbackState(rollbackDataPath);
    if (!state) return null;
    
    return {
      sessionId: state.sessionId,
      startTime: new Date(state.startTime).toLocaleString(),
      installPath: state.installPath,
      totalActions: state.actions.length,
      createdFiles: state.createdFiles.length,
      createdDirectories: state.createdDirectories.length,
      modifiedFiles: state.modifiedFiles.length,
      installedPackages: state.installedPackages.length,
      systemChanges: state.systemChanges.length
    };
  }
}

module.exports = RollbackManager;