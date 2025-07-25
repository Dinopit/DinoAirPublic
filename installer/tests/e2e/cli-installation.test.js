/**
 * End-to-End Tests for CLI Installation Scenarios
 */

const SpawnManager = require('../../lib/spawnManager');
const Logger = require('../../lib/logger');
const FileUtils = require('../../lib/fileUtils');
const path = require('path');
const fs = require('fs');

describe('CLI Installation E2E Tests', () => {
  let spawnManager;
  let logger;
  let fileUtils;
  let tempDir;
  let installationDir;

  beforeAll(() => {
    // Create instances for E2E testing
    logger = new Logger({ silent: true });
    spawnManager = new SpawnManager({ logger, timeout: 30000 });
    fileUtils = new FileUtils({ logger });
  });

  beforeEach(() => {
    // Create temporary directories for each test
    tempDir = testUtils.createTempDir();
    installationDir = path.join(tempDir, 'dinoair_installation');
  });

  afterEach(() => {
    // Clean up temporary directories
    if (tempDir) {
      testUtils.cleanupTempDir(tempDir);
    }
  });

  describe('Installation Workflow Scenarios', () => {
    it('should simulate complete installation process', async () => {
      // Step 1: Pre-installation checks
      logger.section('Pre-installation Checks');
      
      // Check if installation directory already exists
      const alreadyExists = await fileUtils.exists(installationDir);
      expect(alreadyExists).toBe(false);

      // Step 2: Create installation directory structure
      logger.section('Creating Installation Structure');
      
      const directories = [
        installationDir,
        path.join(installationDir, 'lib'),
        path.join(installationDir, 'config'),
        path.join(installationDir, 'logs'),
        path.join(installationDir, 'temp')
      ];

      for (const dir of directories) {
        await fileUtils.ensureDirectory(dir);
        expect(await fileUtils.exists(dir)).toBe(true);
        logger.installStep(`Created directory: ${path.basename(dir)}`, 'complete');
      }

      // Step 3: Create configuration files
      logger.section('Creating Configuration Files');
      
      const configFile = path.join(installationDir, 'config', 'settings.json');
      const config = {
        version: '1.5.0',
        installationPath: installationDir,
        installationDate: new Date().toISOString(),
        components: ['core', 'ui', 'python-backend'],
        settings: {
          logLevel: 'info',
          autoUpdate: true,
          telemetry: false
        }
      };

      await fs.promises.writeFile(configFile, JSON.stringify(config, null, 2));
      expect(await fileUtils.exists(configFile)).toBe(true);
      logger.installStep('Configuration file created', 'complete');

      // Step 4: Simulate component installation
      logger.section('Installing Components');
      
      const components = ['core.dll', 'ui.exe', 'python_backend.py'];
      for (const component of components) {
        const componentPath = path.join(installationDir, 'lib', component);
        const componentContent = `// Mock ${component} content\nversion: 1.5.0\ninstalled: ${new Date().toISOString()}`;
        
        await fs.promises.writeFile(componentPath, componentContent);
        expect(await fileUtils.exists(componentPath)).toBe(true);
        logger.installStep(`Installed ${component}`, 'complete');
        
        // Simulate installation delay
        await testUtils.wait(100);
      }

      // Step 5: Create startup script
      logger.section('Creating Startup Scripts');
      
      const startupScript = path.join(installationDir, 'start.bat');
      const scriptContent = `@echo off
echo Starting DinoAir...
echo Installation directory: ${installationDir}
echo Configuration loaded from: ${configFile}
echo All components ready
pause`;

      await fs.promises.writeFile(startupScript, scriptContent);
      expect(await fileUtils.exists(startupScript)).toBe(true);
      logger.installStep('Startup script created', 'complete');

      // Step 6: Verify installation integrity
      logger.section('Verifying Installation');
      
      const verificationChecks = [
        { path: configFile, name: 'Configuration file' },
        { path: path.join(installationDir, 'lib'), name: 'Library directory' },
        { path: path.join(installationDir, 'logs'), name: 'Logs directory' },
        { path: startupScript, name: 'Startup script' }
      ];

      for (const check of verificationChecks) {
        const exists = await fileUtils.exists(check.path);
        expect(exists).toBe(true);
        logger.installStep(`Verified ${check.name}`, 'complete');
      }

      // Step 7: Installation completion
      logger.section('Installation Complete');
      logger.success('DinoAir installation completed successfully');
      logger.keyValue({
        'Installation Directory': installationDir,
        'Components Installed': components.length.toString(),
        'Configuration File': configFile,
        'Installation Size': 'Simulated'
      });

      // Final verification
      const finalConfig = JSON.parse(await fs.promises.readFile(configFile, 'utf8'));
      expect(finalConfig.version).toBe('1.5.0');
      expect(finalConfig.components).toHaveLength(3);
    }, 30000);

    it('should handle installation with existing directory', async () => {
      // Pre-create installation directory
      await fileUtils.ensureDirectory(installationDir);
      const existingFile = path.join(installationDir, 'existing.txt');
      await fs.promises.writeFile(existingFile, 'Existing content');

      logger.section('Installation with Existing Directory');

      // Check for existing installation
      const exists = await fileUtils.exists(installationDir);
      expect(exists).toBe(true);
      logger.warn('Installation directory already exists');

      // Backup existing files
      const backupDir = path.join(tempDir, 'backup');
      await fileUtils.ensureDirectory(backupDir);
      await fileUtils.copyFile(existingFile, path.join(backupDir, 'existing.txt'));
      
      logger.installStep('Existing files backed up', 'complete');

      // Proceed with installation
      const newConfigFile = path.join(installationDir, 'config.json');
      const newConfig = { version: '1.5.0', upgraded: true };
      await fs.promises.writeFile(newConfigFile, JSON.stringify(newConfig, null, 2));

      // Verify both old and new files exist
      expect(await fileUtils.exists(existingFile)).toBe(true);
      expect(await fileUtils.exists(newConfigFile)).toBe(true);
      expect(await fileUtils.exists(path.join(backupDir, 'existing.txt'))).toBe(true);

      logger.success('Installation completed with existing directory handling');
    });

    it('should handle installation failure and rollback', async () => {
      logger.section('Installation with Simulated Failure');

      // Start installation
      await fileUtils.ensureDirectory(installationDir);
      const partialFiles = [];

      try {
        // Create some files successfully
        for (let i = 0; i < 3; i++) {
          const filePath = path.join(installationDir, `component_${i}.txt`);
          await fs.promises.writeFile(filePath, `Component ${i} content`);
          partialFiles.push(filePath);
          logger.installStep(`Installed component ${i}`, 'complete');
        }

        // Simulate failure during installation
        logger.installStep('Installing critical component', 'running');
        throw new Error('Simulated installation failure: Insufficient disk space');

      } catch (error) {
        logger.installStep('Installation failed', 'error');
        logger.error(`Installation error: ${error.message}`);

        // Rollback: Clean up partial installation
        logger.section('Rolling Back Installation');
        
        for (const file of partialFiles) {
          if (await fileUtils.exists(file)) {
            await fileUtils.deleteFile(file);
            logger.installStep(`Removed ${path.basename(file)}`, 'complete');
          }
        }

        // Remove installation directory if empty
        try {
          const remainingFiles = await fs.promises.readdir(installationDir);
          if (remainingFiles.length === 0) {
            await fileUtils.deleteDirectory(installationDir);
            logger.installStep('Removed installation directory', 'complete');
          }
        } catch (rollbackError) {
          logger.warn(`Rollback warning: ${rollbackError.message}`);
        }

        logger.success('Rollback completed successfully');

        // Verify rollback
        const installDirExists = await fileUtils.exists(installationDir);
        expect(installDirExists).toBe(false);
      }
    });
  });

  describe('User Interaction Scenarios', () => {
    it('should simulate user configuration choices', async () => {
      logger.section('User Configuration Simulation');

      // Simulate user choices
      const userChoices = {
        installationType: 'custom',
        components: ['core', 'ui'],
        installPath: installationDir,
        createShortcuts: true,
        autoStart: false,
        telemetry: false
      };

      logger.keyValue({
        'Installation Type': userChoices.installationType,
        'Selected Components': userChoices.components.join(', '),
        'Install Path': userChoices.installPath,
        'Create Shortcuts': userChoices.createShortcuts.toString(),
        'Auto Start': userChoices.autoStart.toString(),
        'Telemetry': userChoices.telemetry.toString()
      });

      // Apply user choices
      await fileUtils.ensureDirectory(userChoices.installPath);

      // Install only selected components
      for (const component of userChoices.components) {
        const componentPath = path.join(userChoices.installPath, `${component}.dll`);
        await fs.promises.writeFile(componentPath, `Component: ${component}`);
        logger.installStep(`Installed ${component}`, 'complete');
      }

      // Create shortcuts if requested
      if (userChoices.createShortcuts) {
        const shortcutPath = path.join(userChoices.installPath, 'DinoAir.lnk');
        await fs.promises.writeFile(shortcutPath, 'Shortcut content');
        logger.installStep('Desktop shortcut created', 'complete');
      }

      // Save user preferences
      const prefsFile = path.join(userChoices.installPath, 'user_preferences.json');
      await fs.promises.writeFile(prefsFile, JSON.stringify(userChoices, null, 2));

      // Verify installation matches user choices
      const installedComponents = await fs.promises.readdir(userChoices.installPath);
      const expectedFiles = userChoices.components.map(c => `${c}.dll`);
      expectedFiles.push('user_preferences.json');
      
      if (userChoices.createShortcuts) {
        expectedFiles.push('DinoAir.lnk');
      }

      for (const expectedFile of expectedFiles) {
        expect(installedComponents).toContain(expectedFile);
      }

      logger.success('User configuration applied successfully');
    });

    it('should handle installation progress tracking', async () => {
      logger.section('Installation Progress Tracking');

      const totalSteps = 10;
      const steps = [
        'Initializing installation',
        'Checking system requirements',
        'Creating directories',
        'Downloading components',
        'Extracting files',
        'Installing core components',
        'Installing UI components',
        'Configuring settings',
        'Creating shortcuts',
        'Finalizing installation'
      ];

      await fileUtils.ensureDirectory(installationDir);

      for (let i = 0; i < steps.length; i++) {
        const stepNumber = i + 1;
        const stepName = steps[i];
        
        logger.step(stepNumber, totalSteps, stepName);
        
        // Simulate step execution time
        await testUtils.wait(200);
        
        // Create a file to represent step completion
        const stepFile = path.join(installationDir, `step_${stepNumber}.completed`);
        await fs.promises.writeFile(stepFile, `Step: ${stepName}\nCompleted: ${new Date().toISOString()}`);
        
        logger.installStep(stepName, 'complete');
      }

      // Verify all steps completed
      const completedFiles = await fs.promises.readdir(installationDir);
      const stepFiles = completedFiles.filter(f => f.endsWith('.completed'));
      expect(stepFiles).toHaveLength(totalSteps);

      logger.success(`Installation completed: ${totalSteps}/${totalSteps} steps`);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle network interruption during download simulation', async () => {
      logger.section('Network Interruption Simulation');

      await fileUtils.ensureDirectory(installationDir);
      const downloadDir = path.join(installationDir, 'downloads');
      await fileUtils.ensureDirectory(downloadDir);

      const filesToDownload = [
        'component1.zip',
        'component2.zip', 
        'component3.zip'
      ];

      let downloadedFiles = [];
      let networkError = false;

      try {
        for (let i = 0; i < filesToDownload.length; i++) {
          const fileName = filesToDownload[i];
          const filePath = path.join(downloadDir, fileName);
          
          logger.installStep(`Downloading ${fileName}`, 'running');
          
          // Simulate network error on second file
          if (i === 1) {
            networkError = true;
            throw new Error('Network connection lost');
          }
          
          // Simulate successful download
          await fs.promises.writeFile(filePath, `Downloaded content for ${fileName}`);
          downloadedFiles.push(filePath);
          logger.installStep(`Downloaded ${fileName}`, 'complete');
          
          await testUtils.wait(100);
        }
      } catch (error) {
        logger.installStep('Download failed', 'error');
        logger.error(`Download error: ${error.message}`);
        
        // Implement retry mechanism
        logger.section('Retrying Failed Downloads');
        
        for (let i = downloadedFiles.length; i < filesToDownload.length; i++) {
          const fileName = filesToDownload[i];
          const filePath = path.join(downloadDir, fileName);
          
          logger.installStep(`Retrying download: ${fileName}`, 'running');
          
          // Simulate successful retry
          await fs.promises.writeFile(filePath, `Downloaded content for ${fileName} (retry)`);
          downloadedFiles.push(filePath);
          logger.installStep(`Downloaded ${fileName}`, 'complete');
          
          await testUtils.wait(100);
        }
      }

      // Verify all files were eventually downloaded
      expect(downloadedFiles).toHaveLength(filesToDownload.length);
      
      for (const filePath of downloadedFiles) {
        expect(await fileUtils.exists(filePath)).toBe(true);
      }

      logger.success('All downloads completed successfully after retry');
    });

    it('should handle insufficient disk space scenario', async () => {
      logger.section('Disk Space Check Simulation');

      // Simulate disk space check
      const requiredSpace = 1000; // MB
      const availableSpace = 500; // MB (insufficient)

      logger.keyValue({
        'Required Space': `${requiredSpace} MB`,
        'Available Space': `${availableSpace} MB`,
        'Status': availableSpace >= requiredSpace ? 'Sufficient' : 'Insufficient'
      });

      if (availableSpace < requiredSpace) {
        logger.installStep('Disk space check', 'error');
        logger.error('Insufficient disk space for installation');
        
        // Suggest cleanup options
        logger.section('Cleanup Suggestions');
        logger.list([
          'Clear temporary files',
          'Remove old log files', 
          'Uninstall unused programs',
          'Move files to external storage'
        ]);

        // Simulate user cleanup (for testing, we'll just proceed)
        logger.section('Simulating Cleanup');
        const cleanupActions = [
          'Cleared 200 MB of temporary files',
          'Removed 150 MB of old logs',
          'Freed 300 MB total space'
        ];

        for (const action of cleanupActions) {
          logger.installStep(action, 'complete');
          await testUtils.wait(100);
        }

        const newAvailableSpace = availableSpace + 300;
        logger.keyValue({
          'New Available Space': `${newAvailableSpace} MB`,
          'Status': newAvailableSpace >= requiredSpace ? 'Sufficient' : 'Still Insufficient'
        });

        if (newAvailableSpace >= requiredSpace) {
          logger.success('Sufficient disk space available after cleanup');
          
          // Proceed with installation
          await fileUtils.ensureDirectory(installationDir);
          const testFile = path.join(installationDir, 'installation_success.txt');
          await fs.promises.writeFile(testFile, 'Installation completed after disk cleanup');
          
          expect(await fileUtils.exists(testFile)).toBe(true);
        }
      }
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should handle platform-specific paths and commands', async () => {
      logger.section('Platform Compatibility Check');
      
      const platform = process.platform;
      logger.keyValue({
        'Platform': platform,
        'Architecture': process.arch,
        'Node Version': process.version
      });

      // Create platform-specific installation structure
      await fileUtils.ensureDirectory(installationDir);
      
      let executableExtension = '';
      let scriptExtension = '';
      let pathSeparator = path.sep;

      if (platform === 'win32') {
        executableExtension = '.exe';
        scriptExtension = '.bat';
      } else {
        executableExtension = '';
        scriptExtension = '.sh';
      }

      // Create platform-specific files
      const executable = path.join(installationDir, `dinoair${executableExtension}`);
      const script = path.join(installationDir, `start${scriptExtension}`);
      
      await fs.promises.writeFile(executable, 'Executable content');
      await fs.promises.writeFile(script, 'Script content');

      // Test path handling
      const subDir = path.join(installationDir, 'sub', 'directory');
      await fileUtils.ensureDirectory(subDir);
      
      const testFile = path.join(subDir, 'test.txt');
      await fs.promises.writeFile(testFile, 'Cross-platform test');

      // Verify files exist with correct paths
      expect(await fileUtils.exists(executable)).toBe(true);
      expect(await fileUtils.exists(script)).toBe(true);
      expect(await fileUtils.exists(testFile)).toBe(true);

      logger.installStep(`Created ${path.basename(executable)}`, 'complete');
      logger.installStep(`Created ${path.basename(script)}`, 'complete');
      logger.installStep('Created nested directory structure', 'complete');

      logger.success('Platform-specific installation completed');
    });
  });
});