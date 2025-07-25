/**
 * Update Manager Module
 * Provides self-update functionality for the DinoAir CLI installer
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');
const semver = require('semver');
const chalk = require('chalk');
const ora = require('ora');

const execAsync = promisify(exec);

class UpdateManager {
  constructor(options = {}) {
    this.logger = options.logger;
    this.fileUtils = options.fileUtils;
    this.verbose = options.verbose || false;
    this.updateChannel = options.updateChannel || 'stable';
    this.telemetryEnabled = options.telemetryEnabled !== false;
    
    // Update configuration
    this.config = {
      updateUrl: 'https://api.github.com/repos/dinoair/installer/releases/latest',
      downloadUrl: 'https://github.com/dinoair/installer/archive/refs/tags/{version}.zip',
      currentVersion: this.getCurrentVersion(),
      updateCheckInterval: 24 * 60 * 60 * 1000, // 24 hours
      backupDir: path.join(process.cwd(), '.dinoair-update-backup'),
      tempDir: path.join(process.cwd(), '.dinoair-update-temp'),
      checksumAlgorithm: 'sha256'
    };
    
    // Update state
    this.updateState = {
      isChecking: false,
      isUpdating: false,
      lastCheckTime: null,
      availableVersion: null,
      updateAvailable: false,
      downloadProgress: 0,
      error: null
    };
  }

  /**
   * Get current installer version
   * @returns {string} Current version
   */
  getCurrentVersion() {
    try {
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version || '1.0.0';
      }
    } catch (error) {
      if (this.verbose && this.logger) {
        this.logger.debug(`Failed to read current version: ${error.message}`);
      }
    }
    return '1.0.0'; // Default version
  }

  /**
   * Check for available updates
   * @param {Object} options - Check options
   * @returns {Object} Update check result
   */
  async checkForUpdates(options = {}) {
    const { force = false, silent = false } = options;
    
    if (this.updateState.isChecking) {
      return { updateAvailable: false, message: 'Update check already in progress' };
    }
    
    // Check if we need to check for updates
    if (!force && this.updateState.lastCheckTime) {
      const timeSinceLastCheck = Date.now() - this.updateState.lastCheckTime;
      if (timeSinceLastCheck < this.config.updateCheckInterval) {
        return {
          updateAvailable: this.updateState.updateAvailable,
          currentVersion: this.config.currentVersion,
          availableVersion: this.updateState.availableVersion,
          message: 'Using cached update check result'
        };
      }
    }
    
    this.updateState.isChecking = true;
    this.updateState.error = null;
    
    try {
      if (!silent && this.logger) {
        this.logger.info('Checking for installer updates...');
      }
      
      const releaseInfo = await this.fetchLatestRelease();
      const latestVersion = this.parseVersion(releaseInfo.tag_name);
      const currentVersion = this.parseVersion(this.config.currentVersion);
      
      this.updateState.availableVersion = releaseInfo.tag_name;
      this.updateState.updateAvailable = this.isNewerVersion(latestVersion, currentVersion);
      this.updateState.lastCheckTime = Date.now();
      
      const result = {
        updateAvailable: this.updateState.updateAvailable,
        currentVersion: this.config.currentVersion,
        availableVersion: this.updateState.availableVersion,
        releaseNotes: releaseInfo.body,
        publishedAt: releaseInfo.published_at
      };
      
      if (this.updateState.updateAvailable && !silent && this.logger) {
        this.logger.info(`Update available: ${this.config.currentVersion} → ${this.updateState.availableVersion}`);
      } else if (!silent && this.logger) {
        this.logger.info('Installer is up to date');
      }
      
      if (this.verbose && this.logger) {
        this.logger.debug(`Update check result: ${JSON.stringify(result, null, 2)}`);
      }
      
      return result;
      
    } catch (error) {
      this.updateState.error = error.message;
      
      if (!silent && this.logger) {
        this.logger.warn(`Failed to check for updates: ${error.message}`);
      }
      
      return {
        updateAvailable: false,
        error: error.message,
        currentVersion: this.config.currentVersion
      };
      
    } finally {
      this.updateState.isChecking = false;
    }
  }

  /**
   * Fetch latest release information from GitHub API
   * @returns {Object} Release information
   */
  async fetchLatestRelease() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/dinoair/installer/releases/latest',
        method: 'GET',
        headers: {
          'User-Agent': 'DinoAir-Installer-Updater',
          'Accept': 'application/vnd.github.v3+json'
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const releaseInfo = JSON.parse(data);
              resolve(releaseInfo);
            } else {
              reject(new Error(`GitHub API returned status ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse GitHub API response: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Failed to fetch release info: ${error.message}`));
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout while checking for updates'));
      });
      
      req.end();
    });
  }

  /**
   * Parse version string into comparable format
   * @param {string} versionString - Version string (e.g., "v1.2.3" or "1.2.3")
   * @returns {Array} Version parts as numbers
   */
  parseVersion(versionString) {
    const cleanVersion = versionString.replace(/^v/, '');
    return cleanVersion.split('.').map(part => parseInt(part, 10) || 0);
  }

  /**
   * Check if version A is newer than version B
   * @param {Array} versionA - Version A parts
   * @param {Array} versionB - Version B parts
   * @returns {boolean} True if version A is newer
   */
  isNewerVersion(versionA, versionB) {
    for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
      const a = versionA[i] || 0;
      const b = versionB[i] || 0;
      
      if (a > b) return true;
      if (a < b) return false;
    }
    return false;
  }

  /**
   * Perform installer update
   * @param {Object} options - Update options
   * @returns {boolean} True if update successful
   */
  async performUpdate(options = {}) {
    const { 
      force = false, 
      backup = true, 
      interactive = true,
      restartAfterUpdate = true 
    } = options;
    
    if (this.updateState.isUpdating) {
      if (this.logger) {
        this.logger.warn('Update already in progress');
      }
      return false;
    }
    
    try {
      this.updateState.isUpdating = true;
      this.updateState.error = null;
      
      // Check for updates first
      const updateCheck = await this.checkForUpdates({ silent: true });
      if (!updateCheck.updateAvailable && !force) {
        if (this.logger) {
          this.logger.info('No updates available');
        }
        return false;
      }
      
      if (this.logger) {
        this.logger.info(`Starting update to version ${this.updateState.availableVersion}`);
      }
      
      // Confirm update if interactive
      if (interactive && !force) {
        const confirmed = await this.confirmUpdate();
        if (!confirmed) {
          if (this.logger) {
            this.logger.info('Update cancelled by user');
          }
          return false;
        }
      }
      
      // Create backup if requested
      if (backup) {
        await this.createBackup();
      }
      
      // Download update
      const updatePath = await this.downloadUpdate();
      
      // Verify download
      await this.verifyUpdate(updatePath);
      
      // Apply update
      await this.applyUpdate(updatePath);
      
      // Cleanup
      await this.cleanupUpdate();
      
      if (this.logger) {
        this.logger.success(`Successfully updated to version ${this.updateState.availableVersion}`);
      }
      
      // Restart installer if requested
      if (restartAfterUpdate) {
        await this.restartInstaller();
      }
      
      return true;
      
    } catch (error) {
      this.updateState.error = error.message;
      
      if (this.logger) {
        this.logger.error(`Update failed: ${error.message}`);
      }
      
      // Attempt to restore from backup
      if (backup) {
        await this.restoreFromBackup();
      }
      
      return false;
      
    } finally {
      this.updateState.isUpdating = false;
    }
  }

  /**
   * Confirm update with user
   * @returns {boolean} True if user confirmed
   */
  async confirmUpdate() {
    if (typeof require !== 'undefined') {
      try {
        const inquirer = require('inquirer');
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Update installer from ${this.config.currentVersion} to ${this.updateState.availableVersion}?`,
            default: true
          }
        ]);
        return confirm;
      } catch (error) {
        // Fallback if inquirer not available
        return true;
      }
    }
    return true;
  }

  /**
   * Create backup of current installer
   */
  async createBackup() {
    if (this.logger) {
      this.logger.info('Creating backup of current installer...');
    }
    
    const installerDir = path.dirname(__dirname);
    const backupPath = path.join(this.config.backupDir, `backup-${this.config.currentVersion}-${Date.now()}`);
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
    
    // Copy installer directory to backup
    if (this.fileUtils && this.fileUtils.copyDirectory) {
      await this.fileUtils.copyDirectory(installerDir, backupPath);
    } else {
      await this.copyDirectoryRecursive(installerDir, backupPath);
    }
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Backup created at: ${backupPath}`);
    }
  }

  /**
   * Download update package
   * @returns {string} Path to downloaded update
   */
  async downloadUpdate() {
    if (this.logger) {
      this.logger.info('Downloading update...');
    }
    
    const downloadUrl = this.config.downloadUrl.replace('{version}', this.updateState.availableVersion);
    const downloadPath = path.join(this.config.tempDir, `update-${this.updateState.availableVersion}.zip`);
    
    // Ensure temp directory exists
    if (!fs.existsSync(this.config.tempDir)) {
      fs.mkdirSync(this.config.tempDir, { recursive: true });
    }
    
    await this.downloadFile(downloadUrl, downloadPath);
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Update downloaded to: ${downloadPath}`);
    }
    
    return downloadPath;
  }

  /**
   * Download file with progress tracking
   * @param {string} url - URL to download
   * @param {string} outputPath - Output file path
   */
  async downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);
      
      const request = https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          return this.downloadFile(response.headers.location, outputPath)
            .then(resolve)
            .catch(reject);
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }
        
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloadedSize = 0;
        
        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
          this.updateState.downloadProgress = totalSize ? (downloadedSize / totalSize) * 100 : 0;
          
          if (this.verbose && this.logger && totalSize) {
            const progress = Math.round(this.updateState.downloadProgress);
            this.logger.debug(`Download progress: ${progress}%`);
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve();
        });
        
        file.on('error', (error) => {
          fs.unlink(outputPath, () => {}); // Delete partial file
          reject(error);
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.setTimeout(60000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Verify downloaded update
   * @param {string} updatePath - Path to update file
   */
  async verifyUpdate(updatePath) {
    if (this.logger) {
      this.logger.info('Verifying update...');
    }
    
    // Check if file exists and has content
    if (!fs.existsSync(updatePath)) {
      throw new Error('Update file not found');
    }
    
    const stats = fs.statSync(updatePath);
    if (stats.size === 0) {
      throw new Error('Update file is empty');
    }
    
    // TODO: Add checksum verification if available from release info
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Update file verified: ${updatePath} (${stats.size} bytes)`);
    }
  }

  /**
   * Apply update to installer
   * @param {string} updatePath - Path to update file
   */
  async applyUpdate(updatePath) {
    if (this.logger) {
      this.logger.info('Applying update...');
    }
    
    // Extract update (assuming it's a zip file)
    const extractPath = path.join(this.config.tempDir, 'extracted');
    await this.extractZip(updatePath, extractPath);
    
    // Find the installer directory in the extracted files
    const installerSourcePath = await this.findInstallerDirectory(extractPath);
    const installerTargetPath = path.dirname(__dirname);
    
    // Replace current installer with updated version
    if (this.fileUtils && this.fileUtils.copyDirectory) {
      await this.fileUtils.copyDirectory(installerSourcePath, installerTargetPath, { overwrite: true });
    } else {
      await this.copyDirectoryRecursive(installerSourcePath, installerTargetPath, true);
    }
    
    if (this.verbose && this.logger) {
      this.logger.debug('Update applied successfully');
    }
  }

  /**
   * Extract ZIP file
   * @param {string} zipPath - Path to ZIP file
   * @param {string} extractPath - Path to extract to
   */
  async extractZip(zipPath, extractPath) {
    // This is a simplified implementation
    // In a real implementation, you'd use a proper ZIP library like 'yauzl' or 'adm-zip'
    
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }
    
    // For now, we'll assume the update is provided as a directory structure
    // In a real implementation, you'd extract the ZIP file here
    throw new Error('ZIP extraction not implemented - please implement with a proper ZIP library');
  }

  /**
   * Find installer directory in extracted files
   * @param {string} extractPath - Path to extracted files
   * @returns {string} Path to installer directory
   */
  async findInstallerDirectory(extractPath) {
    // Look for package.json to identify the installer directory
    const entries = fs.readdirSync(extractPath);
    
    for (const entry of entries) {
      const entryPath = path.join(extractPath, entry);
      const packageJsonPath = path.join(entryPath, 'package.json');
      
      if (fs.existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.name === 'dinoair-installer') {
            return entryPath;
          }
        } catch (error) {
          // Continue searching
        }
      }
    }
    
    throw new Error('Installer directory not found in update package');
  }

  /**
   * Copy directory recursively
   * @param {string} src - Source directory
   * @param {string} dest - Destination directory
   * @param {boolean} overwrite - Whether to overwrite existing files
   */
  async copyDirectoryRecursive(src, dest, overwrite = false) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src);
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      const stat = fs.statSync(srcPath);
      
      if (stat.isDirectory()) {
        await this.copyDirectoryRecursive(srcPath, destPath, overwrite);
      } else {
        if (!fs.existsSync(destPath) || overwrite) {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
  }

  /**
   * Cleanup update files
   */
  async cleanupUpdate() {
    try {
      if (fs.existsSync(this.config.tempDir)) {
        if (this.fileUtils && this.fileUtils.removeDirectory) {
          await this.fileUtils.removeDirectory(this.config.tempDir);
        } else {
          fs.rmSync(this.config.tempDir, { recursive: true, force: true });
        }
      }
      
      if (this.verbose && this.logger) {
        this.logger.debug('Update cleanup completed');
      }
    } catch (error) {
      if (this.logger) {
        this.logger.warn(`Failed to cleanup update files: ${error.message}`);
      }
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup() {
    try {
      if (this.logger) {
        this.logger.info('Restoring from backup...');
      }
      
      // Find the most recent backup
      const backups = fs.readdirSync(this.config.backupDir)
        .filter(name => name.startsWith('backup-'))
        .sort()
        .reverse();
      
      if (backups.length === 0) {
        throw new Error('No backup found');
      }
      
      const latestBackup = path.join(this.config.backupDir, backups[0]);
      const installerDir = path.dirname(__dirname);
      
      // Restore from backup
      if (this.fileUtils && this.fileUtils.copyDirectory) {
        await this.fileUtils.copyDirectory(latestBackup, installerDir, { overwrite: true });
      } else {
        await this.copyDirectoryRecursive(latestBackup, installerDir, true);
      }
      
      if (this.logger) {
        this.logger.success('Successfully restored from backup');
      }
      
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to restore from backup: ${error.message}`);
      }
    }
  }

  /**
   * Restart installer after update
   */
  async restartInstaller() {
    if (this.logger) {
      this.logger.info('Restarting installer...');
    }
    
    // Get the current process arguments
    const args = process.argv.slice(2);
    const installerPath = process.argv[1];
    
    // Spawn new process
    const child = spawn(process.execPath, [installerPath, ...args], {
      detached: true,
      stdio: 'inherit'
    });
    
    child.unref();
    
    // Exit current process
    process.exit(0);
  }

  /**
   * Get update status
   * @returns {Object} Current update status
   */
  getUpdateStatus() {
    return {
      ...this.updateState,
      currentVersion: this.config.currentVersion
    };
  }

  /**
   * Enable automatic update checks
   * @param {number} interval - Check interval in milliseconds
   */
  enableAutoUpdateCheck(interval = this.config.updateCheckInterval) {
    this.config.updateCheckInterval = interval;
    
    // Check for updates periodically
    setInterval(async () => {
      await this.checkForUpdates({ silent: true });
    }, interval);
    
    if (this.verbose && this.logger) {
      this.logger.debug(`Automatic update checks enabled (interval: ${interval}ms)`);
    }
  }

  /**
   * Get the latest release for the specified channel
   * @param {Array} releases Array of release objects
   * @returns {Object|null} Latest release or null
   */
  getLatestReleaseForChannel(releases) {
    if (!Array.isArray(releases) || releases.length === 0) return null;
    
    const channelReleases = releases.filter(release => {
      if (this.updateChannel === 'stable') {
        return !release.prerelease;
      } else if (this.updateChannel === 'beta') {
        return release.prerelease && release.tag_name.includes('beta');
      } else if (this.updateChannel === 'alpha') {
        return release.prerelease && (release.tag_name.includes('alpha') || release.tag_name.includes('beta'));
      }
      return false;
    });

    return channelReleases.length > 0 ? channelReleases[0] : null;
  }

  /**
   * Get download URL for the current platform
   * @param {Object} release Release object
   * @returns {string} Download URL
   */
  getDownloadUrlForPlatform(release) {
    const platform = process.platform;
    const assets = release.assets || [];

    let assetName;
    if (platform === 'win32') {
      assetName = assets.find(asset => asset.name.endsWith('.exe'));
    } else if (platform === 'darwin') {
      assetName = assets.find(asset => asset.name.endsWith('.dmg'));
    } else if (platform === 'linux') {
      assetName = assets.find(asset => asset.name.endsWith('.AppImage')) ||
                  assets.find(asset => asset.name.endsWith('.deb')) ||
                  assets.find(asset => asset.name.endsWith('.rpm'));
    }

    if (!assetName) {
      throw new Error(`No installer found for platform: ${platform}`);
    }

    return assetName.browser_download_url;
  }

  /**
   * Configure update settings
   * @param {Object} settings Update configuration
   * @returns {Promise<void>}
   */
  async configureUpdates(settings) {
    const configPath = path.join(process.cwd(), 'update-config.json');
    const config = {
      channel: settings.channel || this.updateChannel || 'stable',
      autoUpdate: settings.autoUpdate !== undefined ? settings.autoUpdate : false,
      telemetryEnabled: settings.telemetryEnabled !== undefined ? settings.telemetryEnabled : true,
      checkInterval: settings.checkInterval || 24 * 60 * 60 * 1000, // 24 hours
      ...settings
    };

    try {
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
      
      // Update instance properties
      Object.assign(this, config);
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to save update config: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get current update configuration
   * @returns {Promise<Object>} Current configuration
   */
  async getUpdateConfig() {
    const configPath = path.join(process.cwd(), 'update-config.json');
    
    try {
      const configData = await fs.promises.readFile(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      // Return default config if file doesn't exist
      return {
        channel: this.updateChannel || 'stable',
        autoUpdate: false,
        telemetryEnabled: true,
        checkInterval: 24 * 60 * 60 * 1000
      };
    }
  }

  /**
   * Send telemetry data (if enabled)
   * @param {string} event Event name
   * @param {Object} data Event data
   * @returns {Promise<void>}
   */
  async sendTelemetry(event, data = {}) {
    if (!this.telemetryEnabled) return;

    try {
      const telemetryData = {
        event,
        timestamp: new Date().toISOString(),
        version: this.config.currentVersion,
        platform: process.platform,
        arch: process.arch,
        ...data
      };

      // For now, just log telemetry. In production, this would send to an analytics service
      if (this.verbose && this.logger) {
        this.logger.debug('Telemetry:', JSON.stringify(telemetryData));
      }
      
      // TODO: Implement actual telemetry sending to analytics service
    } catch (error) {
      // Silently fail telemetry - don't interrupt user experience
      if (this.verbose && this.logger) {
        this.logger.debug('Telemetry failed:', error.message);
      }
    }
  }
}
}

module.exports = UpdateManager;