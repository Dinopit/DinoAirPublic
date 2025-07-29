/**
 * Integration Tests for CLI-Python Communication
 */

const SpawnManager = require('../../lib/spawnManager');
const Logger = require('../../lib/logger');
const FileUtils = require('../../lib/fileUtils');
const path = require('path');
const fs = require('fs');

describe('CLI-Python Integration', () => {
  let spawnManager;
  let logger;
  let fileUtils;
  let tempDir;

  beforeAll(() => {
    // Create instances with real functionality for integration testing
    logger = new Logger({ silent: true }); // Silent to avoid cluttering test output
    spawnManager = new SpawnManager({ logger });
    fileUtils = new FileUtils({ logger });
  });

  beforeEach(() => {
    // Create temporary directory for each test
    tempDir = testUtils.createTempDir();
  });

  afterEach(() => {
    // Clean up temporary directory
    if (tempDir) {
      testUtils.cleanupTempDir(tempDir);
    }
  });

  describe('Python Process Spawning', () => {
    it('should successfully spawn Python and get version', async () => {
      try {
        const result = await spawnManager.runCommand('python', ['--version'], {
          timeout: 10000
        });
        
        expect(result.code).toBe(0);
        expect(result.stdout || result.stderr).toMatch(/Python \d+\.\d+/);
      } catch (error) {
        // If Python is not available, skip this test
        if (error.message.includes('ENOENT') || error.message.includes('not found')) {
          console.warn('Python not found, skipping Python integration tests');
          return;
        }
        throw error;
      }
    }, 15000);

    it('should handle Python script execution', async () => {
      // Create a simple Python script
      const scriptPath = path.join(tempDir, 'test_script.py');
      const scriptContent = `
import sys
import json

def main():
    data = {
        "message": "Hello from Python",
        "args": sys.argv[1:],
        "python_version": sys.version
    }
    print(json.dumps(data))

if __name__ == "__main__":
    main()
`;

      await fileUtils.ensureDirectory(tempDir);
      await fs.promises.writeFile(scriptPath, scriptContent);

      try {
        const result = await spawnManager.runCommand('python', [scriptPath, 'arg1', 'arg2'], {
          timeout: 10000
        });

        expect(result.code).toBe(0);
        
        const output = JSON.parse(result.stdout);
        expect(output.message).toBe('Hello from Python');
        expect(output.args).toEqual(['arg1', 'arg2']);
        expect(output.python_version).toMatch(/\d+\.\d+\.\d+/);
      } catch (error) {
        if (error.message.includes('ENOENT') || error.message.includes('not found')) {
          console.warn('Python not found, skipping Python script execution test');
          return;
        }
        throw error;
      }
    }, 15000);

    it('should handle Python script with error', async () => {
      // Create a Python script that raises an error
      const scriptPath = path.join(tempDir, 'error_script.py');
      const scriptContent = `
import sys
print("This will cause an error", file=sys.stderr)
raise ValueError("Test error from Python")
`;

      await fileUtils.ensureDirectory(tempDir);
      await fs.promises.writeFile(scriptPath, scriptContent);

      try {
        await expect(
          spawnManager.runCommand('python', [scriptPath], { timeout: 10000 })
        ).rejects.toThrow();
      } catch (error) {
        if (error.message.includes('ENOENT') || error.message.includes('not found')) {
          console.warn('Python not found, skipping Python error handling test');
          return;
        }
        throw error;
      }
    }, 15000);
  });

  describe('CLI Module Integration', () => {
    it('should integrate logger, fileUtils, and spawnManager', async () => {
      // Test scenario: Create a file, log the operation, then verify with a command
      const testFile = path.join(tempDir, 'integration_test.txt');
      const testContent = 'Integration test content';

      // Use fileUtils to create directory and file
      await fileUtils.ensureDirectory(tempDir);
      await fs.promises.writeFile(testFile, testContent);

      // Verify file exists using fileUtils
      const exists = await fileUtils.exists(testFile);
      expect(exists).toBe(true);

      // Use spawnManager to verify file content (cross-platform approach)
      try {
        let result;
        if (process.platform === 'win32') {
          result = await spawnManager.runCommand('type', [testFile], { timeout: 5000 });
        } else {
          result = await spawnManager.runCommand('cat', [testFile], { timeout: 5000 });
        }
        
        expect(result.code).toBe(0);
        expect(result.stdout.trim()).toBe(testContent);
      } catch (error) {
        // If command not found, read file directly to verify integration
        const content = await fs.promises.readFile(testFile, 'utf8');
        expect(content).toBe(testContent);
      }

      // Test logger integration (verify it doesn't throw errors)
      expect(() => {
        logger.info('Integration test completed');
        logger.success('All modules working together');
      }).not.toThrow();
    });

    it('should handle file operations with process execution', async () => {
      const sourceFile = path.join(tempDir, 'source.txt');
      const destFile = path.join(tempDir, 'destination.txt');
      const content = 'File operation test';

      // Create source file
      await fileUtils.ensureDirectory(tempDir);
      await fs.promises.writeFile(sourceFile, content);

      // Copy file using fileUtils
      await fileUtils.copyFile(sourceFile, destFile);

      // Verify both files exist
      expect(await fileUtils.exists(sourceFile)).toBe(true);
      expect(await fileUtils.exists(destFile)).toBe(true);

      // Verify content matches
      const sourceContent = await fs.promises.readFile(sourceFile, 'utf8');
      const destContent = await fs.promises.readFile(destFile, 'utf8');
      expect(sourceContent).toBe(destContent);
      expect(destContent).toBe(content);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cascading errors gracefully', async () => {
      // Test scenario: Try to execute a command in a non-existent directory
      const nonExistentDir = path.join(tempDir, 'nonexistent');

      try {
        await spawnManager.runCommand('echo', ['test'], {
          cwd: nonExistentDir,
          timeout: 5000
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('ENOENT');
      }
    });

    it('should handle file operation errors with logging', async () => {
      const nonExistentFile = path.join(tempDir, 'nonexistent', 'file.txt');

      // This should fail because parent directory doesn't exist and we're not creating it
      try {
        await fs.promises.writeFile(nonExistentFile, 'test');
      } catch (error) {
        expect(error.code).toBe('ENOENT');
      }

      // Verify fileUtils.exists handles non-existent files gracefully
      const exists = await fileUtils.exists(nonExistentFile);
      expect(exists).toBe(false);
    });
  });

  describe('Performance and Timeout Handling', () => {
    it('should handle command timeouts appropriately', async () => {
      // Create a script that sleeps longer than the timeout
      if (process.platform === 'win32') {
        try {
          await expect(
            spawnManager.runCommand('timeout', ['2'], { timeout: 500 })
          ).rejects.toThrow(/timed out after \d+ms/);
        } catch (error) {
          if (error.message.includes('ENOENT') || error.message.includes('Input redirection is not supported')) {
            // timeout command not available or doesn't work as expected, use ping instead
            await expect(
              spawnManager.runCommand('ping', ['-n', '3', '127.0.0.1'], { timeout: 500 })
            ).rejects.toThrow(/timed out after \d+ms/);
          } else {
            throw error;
          }
        }
      } else {
        await expect(
          spawnManager.runCommand('sleep', ['2'], { timeout: 500 })
        ).rejects.toThrow(/timed out after \d+ms/);
      }
    }, 10000);

    it('should handle multiple concurrent operations', async () => {
      const operations = [];
      
      // Create multiple file operations
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(tempDir, `concurrent_${i}.txt`);
        operations.push(
          fs.promises.writeFile(filePath, `Content ${i}`)
            .then(() => fileUtils.exists(filePath))
        );
      }

      const results = await Promise.all(operations);
      results.forEach(exists => {
        expect(exists).toBe(true);
      });
    });
  });

  describe('Real-world Scenarios', () => {
    it('should simulate basic installation workflow', async () => {
      // Simulate a basic installation workflow
      const installDir = path.join(tempDir, 'installation');
      const configFile = path.join(installDir, 'config.json');
      
      // Step 1: Create installation directory
      await fileUtils.ensureDirectory(installDir);
      expect(await fileUtils.exists(installDir)).toBe(true);

      // Step 2: Create configuration file
      const config = {
        version: '1.0.0',
        installPath: installDir,
        timestamp: new Date().toISOString()
      };
      
      await fs.promises.writeFile(configFile, JSON.stringify(config, null, 2));
      expect(await fileUtils.exists(configFile)).toBe(true);

      // Step 3: Verify configuration
      const savedConfig = JSON.parse(await fs.promises.readFile(configFile, 'utf8'));
      expect(savedConfig.version).toBe('1.0.0');
      expect(savedConfig.installPath).toBe(installDir);

      // Step 4: Log completion
      expect(() => {
        logger.section('Installation Complete');
        logger.keyValue({
          'Installation Directory': installDir,
          'Configuration File': configFile,
          'Version': savedConfig.version
        });
        logger.success('Installation workflow completed successfully');
      }).not.toThrow();
    });

    it('should handle cleanup operations', async () => {
      // Create some test files and directories
      const testFiles = [];
      for (let i = 0; i < 3; i++) {
        const filePath = path.join(tempDir, `cleanup_test_${i}.txt`);
        await fs.promises.writeFile(filePath, `Test content ${i}`);
        testFiles.push(filePath);
      }

      // Verify files exist
      for (const file of testFiles) {
        expect(await fileUtils.exists(file)).toBe(true);
      }

      // Cleanup files
      for (const file of testFiles) {
        await fileUtils.deleteFile(file);
        expect(await fileUtils.exists(file)).toBe(false);
      }

      // Log cleanup completion
      expect(() => {
        logger.info(`Cleaned up ${testFiles.length} test files`);
        logger.success('Cleanup completed');
      }).not.toThrow();
    });
  });
});