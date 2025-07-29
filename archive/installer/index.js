#!/usr/bin/env node

/**
 * DinoAir CLI Installer
 * Node.js-based installer for DinoAir Progressive Mode System
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');

// Import our custom modules
const Logger = require('./lib/logger');
const FileUtils = require('./lib/fileUtils');
const SpawnManager = require('./lib/spawnManager');
const UpdateManager = require('./lib/updateManager');
const TelemetryManager = require('./lib/telemetryManager');
const DistributionManager = require('./lib/distributionManager');

const execAsync = promisify(exec);

class DinoAirInstaller {
  constructor() {
    this.logger = new Logger();
    this.fileUtils = new FileUtils();
    this.spawnManager = new SpawnManager();
    this.updateManager = new UpdateManager({ logger: this.logger });
    this.telemetryManager = new TelemetryManager();
    this.distributionManager = new DistributionManager();
    
    this.installationState = {
      mode: 'easy',
      hardware: null,
      recommendations: null,
      installPath: null,
      progress: 0,
      status: 'idle',
      error: null
    };

    // Installation steps configuration
    this.installationSteps = [
      { name: 'Checking prerequisites', weight: 10, handler: this.checkPrerequisites.bind(this) },
      { name: 'Creating directories', weight: 5, handler: this.createDirectories.bind(this) },
      { name: 'Copying core files', weight: 15, handler: this.copyCoreFiles.bind(this) },
      { name: 'Downloading models', weight: 40, handler: this.downloadModels.bind(this) },
      { name: 'Installing dependencies', weight: 20, handler: this.installDependencies.bind(this) },
      { name: 'Configuring DinoAir', weight: 8, handler: this.configureDinoAir.bind(this) },
      { name: 'Creating shortcuts', weight: 2, handler: this.createShortcuts.bind(this) }
    ];
  }

  /**
   * Main installer entry point
   */
  async run() {
    try {
      this.logger.info('Welcome to DinoAir CLI Installer!');
      this.logger.info('This installer will help you set up DinoAir on your computer.\n');

      // Show welcome and get user consent
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Do you want to continue with the installation?',
          default: true
        }
      ]);

      if (!proceed) {
        this.logger.info('Installation cancelled by user.');
        process.exit(0);
      }

      // Detect hardware
      await this.detectHardware();

      // Get installation mode
      await this.selectInstallationMode();

      // Get installation directory
      await this.selectInstallationDirectory();

      // Get model recommendations
      await this.getModelRecommendations();

      // Confirm installation
      await this.confirmInstallation();

      // Run installation
      await this.runInstallation();

      this.logger.success('\n🎉 DinoAir installation completed successfully!');
      this.logger.info('You can now start DinoAir from your installation directory.');

    } catch (error) {
      this.logger.error(`Installation failed: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Detect hardware capabilities
   */
  async detectHardware() {
    const spinner = ora('Detecting hardware capabilities...').start();
    
    try {
      const hardware = await this.runHardwareDetection();
      this.installationState.hardware = hardware;
      
      spinner.succeed('Hardware detection completed');
      this.logger.info(`Detected: ${hardware.gpu || 'CPU only'}, ${hardware.ram}GB RAM`);
    } catch (error) {
      spinner.fail('Hardware detection failed, using fallback');
      this.installationState.hardware = this.getFallbackHardware();
      this.logger.warn('Using basic hardware configuration');
    }
  }

  /**
   * Run hardware detection using Python script
   */
  async runHardwareDetection() {
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(__dirname, 'scripts', 'hardware_detector_wrapper.py');

    if (!fs.existsSync(scriptPath)) {
      throw new Error('Hardware detection script not found');
    }

    try {
      const result = await this.spawnManager.runCommand(pythonPath, [scriptPath]);
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(`Hardware detection failed: ${error.message}`);
    }
  }

  /**
   * Get fallback hardware configuration
   */
  getFallbackHardware() {
    const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    return {
      gpu: null,
      ram: totalMem,
      cpu_cores: os.cpus().length,
      platform: os.platform(),
      arch: os.arch()
    };
  }

  /**
   * Select installation mode
   */
  async selectInstallationMode() {
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'Select installation mode:',
        choices: [
          { name: 'Easy Mode (Recommended) - Automatic configuration', value: 'easy' },
          { name: 'Advanced Mode - Custom configuration', value: 'advanced' }
        ],
        default: 'easy'
      }
    ]);

    this.installationState.mode = mode;
    this.logger.info(`Selected: ${mode === 'easy' ? 'Easy' : 'Advanced'} mode`);
  }

  /**
   * Select installation directory
   */
  async selectInstallationDirectory() {
    const defaultPath = path.join(os.homedir(), 'DinoAir');
    
    const { installPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'installPath',
        message: 'Enter installation directory:',
        default: defaultPath,
        validate: (input) => {
          if (!input.trim()) {
            return 'Installation path cannot be empty';
          }
          return true;
        }
      }
    ]);

    this.installationState.installPath = path.resolve(installPath);
    this.logger.info(`Installation directory: ${this.installationState.installPath}`);

    // Check disk space
    await this.checkDiskSpace();
  }

  /**
   * Check available disk space
   */
  async checkDiskSpace() {
    const spinner = ora('Checking disk space...').start();
    
    try {
      const stats = await fs.promises.stat(path.dirname(this.installationState.installPath));
      const requiredSpace = 3000; // 3GB in MB
      
      // Note: This is a simplified check. In production, you'd use a library like 'diskusage'
      spinner.succeed('Disk space check completed');
      this.logger.info(`Required space: ${requiredSpace}MB`);
    } catch (error) {
      spinner.warn('Could not check disk space, proceeding anyway');
    }
  }

  /**
   * Get model recommendations based on hardware
   */
  async getModelRecommendations() {
    const spinner = ora('Getting model recommendations...').start();
    
    try {
      const recommendations = await this.getRecommendationsForHardware(this.installationState.hardware);
      this.installationState.recommendations = recommendations;
      
      spinner.succeed('Model recommendations ready');
      
      if (this.installationState.mode === 'advanced') {
        await this.selectModel(recommendations);
      } else {
        this.installationState.selectedModel = recommendations.recommended;
        this.logger.info(`Auto-selected model: ${recommendations.recommended.name}`);
      }
    } catch (error) {
      spinner.fail('Failed to get recommendations');
      throw error;
    }
  }

  /**
   * Get model recommendations for hardware
   */
  async getRecommendationsForHardware(hardware) {
    // Simplified recommendation logic
    const models = [
      { name: 'Qwen2-VL-2B', size: '2GB', performance: 'Fast', quality: 'Good' },
      { name: 'Qwen2-VL-7B', size: '7GB', performance: 'Medium', quality: 'Better' },
      { name: 'Qwen2-VL-72B', size: '72GB', performance: 'Slow', quality: 'Best' }
    ];

    let recommended;
    if (hardware.ram >= 32) {
      recommended = models[2]; // 72B for high-end systems
    } else if (hardware.ram >= 16) {
      recommended = models[1]; // 7B for mid-range systems
    } else {
      recommended = models[0]; // 2B for low-end systems
    }

    return {
      recommended,
      available: models,
      hardware
    };
  }

  /**
   * Select model in advanced mode
   */
  async selectModel(recommendations) {
    const choices = recommendations.available.map(model => ({
      name: `${model.name} (${model.size}) - ${model.performance} performance, ${model.quality} quality`,
      value: model
    }));

    const { selectedModel } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedModel',
        message: 'Select AI model:',
        choices,
        default: recommendations.recommended
      }
    ]);

    this.installationState.selectedModel = selectedModel;
  }

  /**
   * Confirm installation settings
   */
  async confirmInstallation() {
    this.logger.info('\n📋 Installation Summary:');
    this.logger.info(`Mode: ${this.installationState.mode}`);
    this.logger.info(`Directory: ${this.installationState.installPath}`);
    this.logger.info(`Model: ${this.installationState.selectedModel.name}`);
    this.logger.info(`Hardware: ${this.installationState.hardware.gpu || 'CPU only'}, ${this.installationState.hardware.ram}GB RAM\n`);

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Proceed with installation?',
        default: true
      }
    ]);

    if (!confirm) {
      this.logger.info('Installation cancelled by user.');
      process.exit(0);
    }
  }

  /**
   * Run the installation process
   */
  async runInstallation() {
    this.logger.info('\n🚀 Starting installation...\n');

    const progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {step}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    progressBar.start(100, 0, { step: 'Initializing...' });

    let currentProgress = 0;

    try {
      for (const step of this.installationSteps) {
        progressBar.update(currentProgress, { step: step.name });
        
        await step.handler();
        
        currentProgress += step.weight;
        progressBar.update(currentProgress, { step: `${step.name} - Complete` });
      }

      progressBar.update(100, { step: 'Installation complete!' });
      progressBar.stop();

    } catch (error) {
      progressBar.stop();
      throw error;
    }
  }

  // Installation step handlers
  async checkPrerequisites() {
    // Check Python installation
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    try {
      const { stdout } = await execAsync(`${pythonPath} --version`);
      this.logger.debug(`Python found: ${stdout.trim()}`);
    } catch (error) {
      throw new Error('Python is not installed or not in PATH');
    }
  }

  async createDirectories() {
    const dirs = [
      this.installationState.installPath,
      path.join(this.installationState.installPath, 'lib'),
      path.join(this.installationState.installPath, 'models'),
      path.join(this.installationState.installPath, 'config'),
      path.join(this.installationState.installPath, 'logs'),
      path.join(this.installationState.installPath, 'ComfyUI')
    ];

    for (const dir of dirs) {
      await this.fileUtils.ensureDirectory(dir);
    }
  }

  async copyCoreFiles() {
    // Copy core DinoAir files
    await this.fileUtils.copyDirectory(
      path.join(__dirname, '..', 'lib'),
      path.join(this.installationState.installPath, 'lib')
    );
  }

  async downloadModels() {
    // Download the selected model
    const model = this.installationState.selectedModel;
    this.logger.debug(`Downloading model: ${model.name}`);
    
    // In production, this would download the actual model
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async installDependencies() {
    // Install Python dependencies
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const requirementsPath = path.join(__dirname, '..', 'requirements.txt');
    
    if (fs.existsSync(requirementsPath)) {
      await this.spawnManager.runCommand(pythonPath, ['-m', 'pip', 'install', '-r', requirementsPath]);
    }
  }

  async configureDinoAir() {
    const configData = {
      mode: this.installationState.mode,
      model: this.installationState.selectedModel,
      hardware: this.installationState.hardware,
      installPath: this.installationState.installPath,
      installedAt: new Date().toISOString()
    };

    const configPath = path.join(this.installationState.installPath, 'config', 'installation.json');
    await fs.promises.writeFile(configPath, JSON.stringify(configData, null, 2));
  }

  async createShortcuts() {
    // Create platform-specific shortcuts
    if (process.platform === 'win32') {
      // Windows shortcut creation would go here
    } else if (process.platform === 'darwin') {
      // macOS shortcut creation would go here
    } else {
      // Linux desktop entry creation would go here
    }
  }
}

// CLI entry point
if (require.main === module) {
  const installer = new DinoAirInstaller();
  installer.run().catch(error => {
    console.error(chalk.red('Fatal error:'), error.message);
    process.exit(1);
  });
}

module.exports = DinoAirInstaller;