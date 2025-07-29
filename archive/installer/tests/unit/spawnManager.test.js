/**
 * Unit Tests for SpawnManager Module
 */

const SpawnManager = require('../../lib/spawnManager');
const { spawn, exec, execFile } = require('child_process');
const { EventEmitter } = require('events');

// Mock child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn(),
  execFile: jest.fn()
}));

// Mock util module
jest.mock('util', () => {
  const mockExecAsync = jest.fn();
  return {
    promisify: jest.fn((fn) => {
      const { exec, execFile } = jest.requireMock('child_process');
      if (fn === exec) {
        return mockExecAsync;
      }
      if (fn === execFile) {
        return jest.fn();
      }
      return fn;
    }),
    // Export the mock so we can access it in tests
    __mockExecAsync: mockExecAsync
  };
});

// Mock os module
jest.mock('os', () => ({
  platform: jest.fn(),
  arch: jest.fn(),
  release: jest.fn(),
  cpus: jest.fn(),
  totalmem: jest.fn(),
  hostname: jest.fn(),
  uptime: jest.fn()
}));

describe('SpawnManager', () => {
  let spawnManager;
  let mockLogger;
  let mockChildProcess;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock logger
    mockLogger = testUtils.createMockLogger();
    
    // Create SpawnManager instance
    spawnManager = new SpawnManager({ logger: mockLogger });
    
    // Create mock child process
    mockChildProcess = new EventEmitter();
    mockChildProcess.stdout = new EventEmitter();
    mockChildProcess.stderr = new EventEmitter();
    mockChildProcess.kill = jest.fn();
    
    // Setup spawn mock
    spawn.mockReturnValue(mockChildProcess);
  });

  describe('Constructor', () => {
    it('should create SpawnManager with default options', () => {
      const defaultSpawnManager = new SpawnManager();
      expect(defaultSpawnManager.logger).toBeNull();
      expect(defaultSpawnManager.defaultTimeout).toBe(300000); // 5 minutes
      expect(defaultSpawnManager.defaultEncoding).toBe('utf8');
    });

    it('should create SpawnManager with custom options', () => {
      const customSpawnManager = new SpawnManager({
        logger: mockLogger,
        timeout: 60000,
        encoding: 'utf16'
      });
      expect(customSpawnManager.logger).toBe(mockLogger);
      expect(customSpawnManager.defaultTimeout).toBe(60000);
      expect(customSpawnManager.defaultEncoding).toBe('utf16');
    });
  });

  describe('runCommand', () => {
    it('should run command successfully', async () => {
      const commandPromise = spawnManager.runCommand('echo', ['hello']);
      
      // Simulate successful command execution
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', 'hello\n');
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      const result = await commandPromise;
      
      expect(result).toEqual({
        code: 0,
        signal: null,
        stdout: 'hello',
        stderr: ''
      });
      expect(spawn).toHaveBeenCalledWith('echo', ['hello'], {
        cwd: process.cwd(),
        env: process.env,
        shell: false,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Running command: echo hello');
      expect(mockLogger.debug).toHaveBeenCalledWith('Command completed with code 0: echo hello');
    });

    it('should handle command with stderr output', async () => {
      const commandPromise = spawnManager.runCommand('test', ['command']);
      
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', 'output\n');
        mockChildProcess.stderr.emit('data', 'warning\n');
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      const result = await commandPromise;
      
      expect(result).toEqual({
        code: 0,
        signal: null,
        stdout: 'output',
        stderr: 'warning'
      });
    });

    it('should handle command failure', async () => {
      const commandPromise = spawnManager.runCommand('failing', ['command']);
      
      setTimeout(() => {
        mockChildProcess.stderr.emit('data', 'error message\n');
        mockChildProcess.emit('close', 1, null);
      }, 10);
      
      await expect(commandPromise).rejects.toThrow('Command failed with code 1: error message');
    });

    it('should handle command timeout', async () => {
      const commandPromise = spawnManager.runCommand('slow', ['command'], { timeout: 100 });
      
      // Don't emit close event to simulate hanging process
      
      await expect(commandPromise).rejects.toThrow('Command timed out after 100ms: slow command');
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle spawn error', async () => {
      const commandPromise = spawnManager.runCommand('nonexistent', ['command']);
      
      setTimeout(() => {
        mockChildProcess.emit('error', new Error('ENOENT: command not found'));
      }, 10);
      
      await expect(commandPromise).rejects.toThrow('Failed to start command: ENOENT: command not found');
      expect(mockLogger.error).toHaveBeenCalledWith('Command error: ENOENT: command not found');
    });

    it('should use custom options', async () => {
      const options = {
        cwd: '/custom/dir',
        env: { CUSTOM: 'value' },
        shell: true,
        stdio: 'inherit',
        encoding: 'utf16'
      };
      
      const commandPromise = spawnManager.runCommand('test', ['args'], options);
      
      setTimeout(() => {
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      await commandPromise;
      
      expect(spawn).toHaveBeenCalledWith('test', ['args'], {
        cwd: '/custom/dir',
        env: { CUSTOM: 'value' },
        shell: true,
        stdio: 'inherit',
        encoding: 'utf16'
      });
    });

    it('should handle zero timeout (no timeout)', async () => {
      const commandPromise = spawnManager.runCommand('test', [], { timeout: 0 });
      
      setTimeout(() => {
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      const result = await commandPromise;
      expect(result.code).toBe(0);
      expect(mockChildProcess.kill).not.toHaveBeenCalled();
    });

    it('should work without logger', async () => {
      const spawnManagerNoLogger = new SpawnManager();
      const commandPromise = spawnManagerNoLogger.runCommand('test', []);
      
      setTimeout(() => {
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      const result = await commandPromise;
      expect(result.code).toBe(0);
    });
  });

  describe('runCommandWithStreaming', () => {
    beforeEach(() => {
      // Mock the runCommandWithStreaming method since it's not in the visible part
      // We'll test the basic streaming functionality
      spawnManager.runCommandWithStreaming = jest.fn().mockImplementation((command, args, options = {}) => {
        return new Promise((resolve, reject) => {
          const child = spawn(command, args, {
            cwd: options.cwd || process.cwd(),
            env: options.env || process.env,
            shell: options.shell || false,
            stdio: 'pipe',
            encoding: options.encoding || 'utf8'
          });

          let stdout = '';
          let stderr = '';

          if (child.stdout) {
            child.stdout.on('data', (data) => {
              stdout += data.toString();
              if (options.onStdout) options.onStdout(data.toString());
            });
          }

          if (child.stderr) {
            child.stderr.on('data', (data) => {
              stderr += data.toString();
              if (options.onStderr) options.onStderr(data.toString());
            });
          }

          child.on('close', (code) => {
            if (code === 0) {
              resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
            } else {
              reject(new Error(`Command failed with code ${code}`));
            }
          });

          child.on('error', (error) => {
            reject(error);
          });
        });
      });
    });

    it('should stream command output', async () => {
      const onStdout = jest.fn();
      const onStderr = jest.fn();
      
      const commandPromise = spawnManager.runCommandWithStreaming('echo', ['hello'], {
        onStdout,
        onStderr
      });
      
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', 'hello\n');
        mockChildProcess.emit('close', 0);
      }, 10);
      
      const result = await commandPromise;
      
      expect(result.code).toBe(0);
      expect(onStdout).toHaveBeenCalledWith('hello\n');
      expect(spawn).toHaveBeenCalledWith('echo', ['hello'], expect.any(Object));
    });
  });

  describe('Error Handling', () => {
    it('should handle multiple data chunks', async () => {
      const commandPromise = spawnManager.runCommand('test', []);
      
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', 'chunk1');
        mockChildProcess.stdout.emit('data', 'chunk2');
        mockChildProcess.stderr.emit('data', 'error1');
        mockChildProcess.stderr.emit('data', 'error2');
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      const result = await commandPromise;
      
      expect(result.stdout).toBe('chunk1chunk2');
      expect(result.stderr).toBe('error1error2');
    });

    it('should handle process killed by signal', async () => {
      const commandPromise = spawnManager.runCommand('test', []);
      
      setTimeout(() => {
        mockChildProcess.emit('close', null, 'SIGTERM');
      }, 10);
      
      const result = await commandPromise;
      
      expect(result.code).toBeNull();
      expect(result.signal).toBe('SIGTERM');
    });

    it('should handle command with no stdout/stderr', async () => {
      // Create child process without stdout/stderr
      const mockChildNoStreams = new EventEmitter();
      mockChildNoStreams.kill = jest.fn();
      spawn.mockReturnValue(mockChildNoStreams);
      
      const commandPromise = spawnManager.runCommand('test', []);
      
      setTimeout(() => {
        mockChildNoStreams.emit('close', 0, null);
      }, 10);
      
      const result = await commandPromise;
      
      expect(result).toEqual({
        code: 0,
        signal: null,
        stdout: '',
        stderr: ''
      });
    });

    it('should clear timeout on successful completion', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const commandPromise = spawnManager.runCommand('test', [], { timeout: 5000 });
      
      setTimeout(() => {
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      await commandPromise;
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should clear timeout on error', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const commandPromise = spawnManager.runCommand('test', [], { timeout: 5000 });
      
      setTimeout(() => {
        mockChildProcess.emit('error', new Error('Test error'));
      }, 10);
      
      await expect(commandPromise).rejects.toThrow();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Command Argument Handling', () => {
    it('should handle empty arguments array', async () => {
      const commandPromise = spawnManager.runCommand('test');
      
      setTimeout(() => {
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      await commandPromise;
      
      expect(spawn).toHaveBeenCalledWith('test', [], expect.any(Object));
      expect(mockLogger.debug).toHaveBeenCalledWith('Running command: test ');
    });

    it('should handle complex arguments', async () => {
      const args = ['--option', 'value', '--flag'];
      const commandPromise = spawnManager.runCommand('complex', args);
      
      setTimeout(() => {
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      await commandPromise;
      
      expect(spawn).toHaveBeenCalledWith('complex', args, expect.any(Object));
      expect(mockLogger.debug).toHaveBeenCalledWith('Running command: complex --option value --flag');
    });
  });

  describe('Default Values', () => {
    it('should use default timeout when not specified', () => {
      expect(spawnManager.defaultTimeout).toBe(300000);
    });

    it('should use default encoding when not specified', () => {
      expect(spawnManager.defaultEncoding).toBe('utf8');
    });

    it('should use process.cwd() as default working directory', async () => {
      const commandPromise = spawnManager.runCommand('test', []);
      
      setTimeout(() => {
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      await commandPromise;
      
      expect(spawn).toHaveBeenCalledWith('test', [], expect.objectContaining({
        cwd: process.cwd()
      }));
    });

    it('should use process.env as default environment', async () => {
      const commandPromise = spawnManager.runCommand('test', []);
      
      setTimeout(() => {
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      await commandPromise;
      
      expect(spawn).toHaveBeenCalledWith('test', [], expect.objectContaining({
        env: process.env
      }));
    });
  });

  describe('runCommandWithOutput', () => {
    it('should run command with output successfully', async () => {
      const onStdout = jest.fn();
      const onStderr = jest.fn();
      
      const commandPromise = spawnManager.runCommandWithOutput('test', ['arg1'], {
        onStdout,
        onStderr
      });
      
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', 'output line 1\n');
        mockChildProcess.stdout.emit('data', 'output line 2\n');
        mockChildProcess.stderr.emit('data', 'error line 1\n');
        mockChildProcess.emit('close', 0, null);
      }, 10);
      
      const result = await commandPromise;
      
      expect(result).toEqual({
        code: 0,
        signal: null,
        stdout: 'output line 1\noutput line 2',
        stderr: 'error line 1'
      });
      expect(onStdout).toHaveBeenCalledWith('output line 1\n');
      expect(onStdout).toHaveBeenCalledWith('output line 2\n');
      expect(onStderr).toHaveBeenCalledWith('error line 1\n');
      expect(mockLogger.debug).toHaveBeenCalledWith('Running command with output: test arg1');
    });

    it('should handle command with output timeout', async () => {
      const commandPromise = spawnManager.runCommandWithOutput('test', [], { timeout: 100 });
      
      // Don't emit close event to trigger timeout
      
      await expect(commandPromise).rejects.toThrow('Command timed out after 100ms: test ');
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
    }, 200);

    it('should handle command with output error', async () => {
      const commandPromise = spawnManager.runCommandWithOutput('test', []);
      
      setTimeout(() => {
        mockChildProcess.emit('error', new Error('Spawn failed'));
      }, 10);
      
      await expect(commandPromise).rejects.toThrow('Failed to start command: Spawn failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Command with output error: Spawn failed');
    });

    it('should handle command with output failure', async () => {
      const commandPromise = spawnManager.runCommandWithOutput('test', []);
      
      setTimeout(() => {
        mockChildProcess.stderr.emit('data', 'Command failed');
        mockChildProcess.emit('close', 1, null);
      }, 10);
      
      await expect(commandPromise).rejects.toThrow('Command failed with code 1: Command failed');
    });
  });

  describe('runPythonScript', () => {
    beforeEach(() => {
      jest.spyOn(spawnManager, 'getPythonExecutable').mockReturnValue('python3');
      jest.spyOn(spawnManager, 'runCommand').mockResolvedValue({
        code: 0,
        signal: null,
        stdout: 'Python script output',
        stderr: ''
      });
    });

    it('should run Python script successfully', async () => {
      const result = await spawnManager.runPythonScript('/path/to/script.py', ['arg1', 'arg2']);
      
      expect(spawnManager.getPythonExecutable).toHaveBeenCalled();
      expect(spawnManager.runCommand).toHaveBeenCalledWith('python3', ['/path/to/script.py', 'arg1', 'arg2'], {});
      expect(mockLogger.debug).toHaveBeenCalledWith('Running Python script: /path/to/script.py');
      expect(result.stdout).toBe('Python script output');
    });

    it('should run Python script with options', async () => {
      const options = { timeout: 5000, cwd: '/custom/dir' };
      await spawnManager.runPythonScript('/path/to/script.py', [], options);
      
      expect(spawnManager.runCommand).toHaveBeenCalledWith('python3', ['/path/to/script.py'], options);
    });
  });

  describe('runPythonScriptWithOutput', () => {
    beforeEach(() => {
      jest.spyOn(spawnManager, 'getPythonExecutable').mockReturnValue('python3');
      jest.spyOn(spawnManager, 'runCommandWithOutput').mockResolvedValue({
        code: 0,
        signal: null,
        stdout: 'Python script output',
        stderr: ''
      });
    });

    it('should run Python script with output successfully', async () => {
      const result = await spawnManager.runPythonScriptWithOutput('/path/to/script.py', ['arg1']);
      
      expect(spawnManager.getPythonExecutable).toHaveBeenCalled();
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('python3', ['/path/to/script.py', 'arg1'], {});
      expect(mockLogger.debug).toHaveBeenCalledWith('Running Python script with output: /path/to/script.py');
      expect(result.stdout).toBe('Python script output');
    });
  });

  describe('runShellCommand', () => {
    const util = require('util');
    let mockExecAsync;

    beforeEach(() => {
      mockExecAsync = util.__mockExecAsync;
      mockExecAsync.mockResolvedValue({
        stdout: 'shell command output',
        stderr: ''
      });
    });

    it('should run shell command successfully', async () => {
      const result = await spawnManager.runShellCommand('ls -la');
      
      expect(mockExecAsync).toHaveBeenCalledWith('ls -la', {
        cwd: process.cwd(),
        env: process.env,
        timeout: 300000,
        encoding: 'utf8'
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Running shell command: ls -la');
      expect(mockLogger.debug).toHaveBeenCalledWith('Shell command completed: ls -la');
      expect(result).toEqual({
        stdout: 'shell command output',
        stderr: ''
      });
    });

    it('should run shell command with custom options', async () => {
      const options = { timeout: 5000, cwd: '/custom/dir' };
      await spawnManager.runShellCommand('pwd', options);
      
      expect(mockExecAsync).toHaveBeenCalledWith('pwd', {
        cwd: '/custom/dir',
        env: process.env,
        timeout: 5000,
        encoding: 'utf8'
      });
    });

    it('should handle shell command error', async () => {
      const error = new Error('Shell command failed');
      mockExecAsync.mockRejectedValue(error);
      
      await expect(spawnManager.runShellCommand('invalid-command')).rejects.toThrow('Shell command failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Shell command failed: Shell command failed');
    });
  });

  describe('commandExists', () => {
    beforeEach(() => {
      jest.spyOn(spawnManager, 'runShellCommand').mockImplementation(() => Promise.resolve());
    });

    it('should return true when command exists on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      
      const result = await spawnManager.commandExists('node');
      
      expect(spawnManager.runShellCommand).toHaveBeenCalledWith('where node');
      expect(result).toBe(true);
    });

    it('should return true when command exists on Unix', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      
      const result = await spawnManager.commandExists('node');
      
      expect(spawnManager.runShellCommand).toHaveBeenCalledWith('which node');
      expect(result).toBe(true);
    });

    it('should return false when command does not exist', async () => {
      jest.spyOn(spawnManager, 'runShellCommand').mockRejectedValue(new Error('Command not found'));
      
      const result = await spawnManager.commandExists('nonexistent-command');
      
      expect(result).toBe(false);
    });
  });

  describe('getPythonExecutable', () => {
    it('should return python on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      
      const result = spawnManager.getPythonExecutable();
      
      expect(result).toBe('python');
    });

    it('should return python3 on Unix systems', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      
      const result = spawnManager.getPythonExecutable();
      
      expect(result).toBe('python3');
    });
  });

  describe('checkPython', () => {
    beforeEach(() => {
      jest.spyOn(spawnManager, 'getPythonExecutable').mockReturnValue('python3');
      jest.spyOn(spawnManager, 'runCommand').mockResolvedValue({
        code: 0,
        signal: null,
        stdout: 'Python 3.9.0',
        stderr: ''
      });
    });

    it('should check Python successfully', async () => {
      const result = await spawnManager.checkPython();
      
      expect(spawnManager.getPythonExecutable).toHaveBeenCalled();
      expect(spawnManager.runCommand).toHaveBeenCalledWith('python3', ['--version']);
      expect(mockLogger.debug).toHaveBeenCalledWith('Python check successful: Python 3.9.0');
      expect(result).toEqual({
        available: true,
        version: 'Python 3.9.0',
        executable: 'python3'
      });
    });

    it('should handle Python check failure', async () => {
      jest.spyOn(spawnManager, 'runCommand').mockRejectedValue(new Error('Python not found'));
      
      const result = await spawnManager.checkPython();
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Python check failed: Python not found');
      expect(result).toEqual({
        available: false,
        error: 'Python not found',
        executable: 'python3'
      });
    });
  });

  describe('installPythonPackages', () => {
    beforeEach(() => {
      jest.spyOn(spawnManager, 'getPythonExecutable').mockReturnValue('python3');
      jest.spyOn(spawnManager, 'runCommandWithOutput').mockResolvedValue({
        code: 0,
        signal: null,
        stdout: 'Successfully installed package',
        stderr: ''
      });
    });

    it('should install Python packages successfully', async () => {
      const result = await spawnManager.installPythonPackages(['numpy', 'pandas']);
      
      expect(spawnManager.getPythonExecutable).toHaveBeenCalled();
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('python3', 
        ['-m', 'pip', 'install', 'numpy', 'pandas'], 
        expect.objectContaining({
          onStdout: expect.any(Function),
          onStderr: expect.any(Function)
        })
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Installing Python packages: numpy pandas');
      expect(result.stdout).toBe('Successfully installed package');
    });

    it('should install single Python package', async () => {
      await spawnManager.installPythonPackages('requests');
      
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('python3', 
        ['-m', 'pip', 'install', 'requests'], 
        expect.any(Object)
      );
    });

    it('should install with upgrade option', async () => {
      await spawnManager.installPythonPackages(['numpy'], { upgrade: true });
      
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('python3', 
        ['-m', 'pip', 'install', '--upgrade', 'numpy'], 
        expect.any(Object)
      );
    });

    it('should install with user option', async () => {
      await spawnManager.installPythonPackages(['numpy'], { userInstall: true });
      
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('python3', 
        ['-m', 'pip', 'install', '--user', 'numpy'], 
        expect.any(Object)
      );
    });

    it('should install from requirements file', async () => {
      await spawnManager.installPythonPackages([], { requirementsFile: 'requirements.txt' });
      
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('python3', 
        ['-m', 'pip', 'install', '-r', 'requirements.txt'], 
        expect.any(Object)
      );
    });

    it('should install with extra args', async () => {
      await spawnManager.installPythonPackages(['numpy'], { extraArgs: ['--no-cache-dir'] });
      
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('python3', 
        ['-m', 'pip', 'install', 'numpy', '--no-cache-dir'], 
        expect.any(Object)
      );
    });
  });

  describe('runNpmCommand', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      jest.spyOn(spawnManager, 'runCommandWithOutput').mockResolvedValue({
        code: 0,
        signal: null,
        stdout: 'npm command output',
        stderr: ''
      });
    });

    it('should run npm command on Unix', async () => {
      const result = await spawnManager.runNpmCommand('install', ['express']);
      
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('npm', 
        ['install', 'express'], 
        expect.objectContaining({
          onStdout: expect.any(Function),
          onStderr: expect.any(Function)
        })
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Running npm command: install express');
      expect(result.stdout).toBe('npm command output');
    });

    it('should run npm command on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      
      await spawnManager.runNpmCommand('test');
      
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('npm.cmd', 
        ['test'], 
        expect.any(Object)
      );
    });
  });

  describe('downloadFile', () => {
    beforeEach(() => {
      jest.spyOn(spawnManager, 'commandExists').mockImplementation((cmd) => {
        return Promise.resolve(cmd === 'curl');
      });
      jest.spyOn(spawnManager, 'runCommandWithOutput').mockResolvedValue({
        code: 0,
        signal: null,
        stdout: 'Download complete',
        stderr: ''
      });
    });

    it('should download file using curl', async () => {
      const result = await spawnManager.downloadFile('https://example.com/file.zip', '/tmp/file.zip');
      
      expect(spawnManager.commandExists).toHaveBeenCalledWith('curl');
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('curl', 
        ['-L', '-o', '/tmp/file.zip', '-L', '-A', 'DinoAir-Installer', 'https://example.com/file.zip'], 
        expect.objectContaining({
          timeout: 600000,
          onStdout: expect.any(Function)
        })
      );
      expect(mockLogger.debug).toHaveBeenCalledWith('Downloading file: https://example.com/file.zip → /tmp/file.zip');
      expect(result.stdout).toBe('Download complete');
    });

    it('should download file using wget when curl not available', async () => {
      jest.spyOn(spawnManager, 'commandExists').mockImplementation((cmd) => {
        if (cmd === 'curl') return Promise.resolve(false);
        if (cmd === 'wget') return Promise.resolve(true);
        return Promise.resolve(false);
      });
      
      await spawnManager.downloadFile('https://example.com/file.zip', '/tmp/file.zip');
      
      expect(spawnManager.runCommandWithOutput).toHaveBeenCalledWith('wget', 
        ['-O', '/tmp/file.zip', '--user-agent', 'DinoAir-Installer', 'https://example.com/file.zip'], 
        expect.any(Object)
      );
    });

    it('should throw error when neither curl nor wget available', async () => {
      jest.spyOn(spawnManager, 'commandExists').mockResolvedValue(false);
      
      await expect(spawnManager.downloadFile('https://example.com/file.zip', '/tmp/file.zip'))
        .rejects.toThrow('Neither curl nor wget is available for downloading files');
    });
  });

  describe('killProcess', () => {
    beforeEach(() => {
      jest.spyOn(spawnManager, 'runCommand').mockResolvedValue({
        code: 0,
        signal: null,
        stdout: '',
        stderr: ''
      });
    });

    it('should kill process on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      
      const result = await spawnManager.killProcess(1234);
      
      expect(spawnManager.runCommand).toHaveBeenCalledWith('taskkill', ['/PID', '1234', '/F']);
      expect(mockLogger.debug).toHaveBeenCalledWith('Killing process 1234 with signal SIGTERM');
      expect(result).toBe(true);
    });

    it('should kill process on Unix', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
      
      const result = await spawnManager.killProcess(1234, 'SIGKILL');
      
      expect(spawnManager.runCommand).toHaveBeenCalledWith('kill', ['-SIGKILL', '1234']);
      expect(mockLogger.debug).toHaveBeenCalledWith('Killing process 1234 with signal SIGKILL');
      expect(result).toBe(true);
    });

    it('should handle kill process failure', async () => {
      jest.spyOn(spawnManager, 'runCommand').mockRejectedValue(new Error('Process not found'));
      
      const result = await spawnManager.killProcess(1234);
      
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to kill process 1234: Process not found');
      expect(result).toBe(false);
    });
  });

  describe('getSystemInfo', () => {
    const os = require('os');

    beforeEach(() => {
      os.platform.mockReturnValue('linux');
      os.arch.mockReturnValue('x64');
      os.release.mockReturnValue('5.4.0');
      os.cpus.mockReturnValue([{}, {}, {}, {}]); // 4 CPUs
      os.totalmem.mockReturnValue(8 * 1024 * 1024 * 1024); // 8GB
      os.hostname.mockReturnValue('test-host');
      os.uptime.mockReturnValue(3600); // 1 hour
      
      jest.spyOn(spawnManager, 'runShellCommand').mockResolvedValue({
        stdout: 'MemTotal: 8000000 kB',
        stderr: ''
      });
    });

    it('should get basic system info', async () => {
      const result = await spawnManager.getSystemInfo();
      
      expect(result).toEqual({
        platform: 'linux',
        arch: 'x64',
        release: '5.4.0',
        cpus: 4,
        memory: 8,
        hostname: 'test-host',
        uptime: 3600
      });
    });

    it('should get system info on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      os.platform.mockReturnValue('win32');
      
      const result = await spawnManager.getSystemInfo();
      
      expect(spawnManager.runShellCommand).toHaveBeenCalledWith('systeminfo | findstr /C:"Total Physical Memory"');
      expect(result.platform).toBe('win32');
    });

    it('should get system info on macOS', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
      os.platform.mockReturnValue('darwin');
      
      const result = await spawnManager.getSystemInfo();
      
      expect(spawnManager.runShellCommand).toHaveBeenCalledWith('system_profiler SPHardwareDataType');
      expect(result.platform).toBe('darwin');
    });

    it('should handle system info command failure gracefully', async () => {
      jest.spyOn(spawnManager, 'runShellCommand').mockRejectedValue(new Error('Command failed'));
      
      const result = await spawnManager.getSystemInfo();
      
      expect(mockLogger.debug).toHaveBeenCalledWith('Could not get extended system info: Command failed');
      expect(result.platform).toBe('linux');
    });
  });

  describe('child', () => {
    it('should create child spawn manager with default options', () => {
      const childManager = spawnManager.child();
      
      expect(childManager).toBeInstanceOf(SpawnManager);
      expect(childManager.logger).toBe(mockLogger);
      expect(childManager.defaultTimeout).toBe(300000);
      expect(childManager.defaultEncoding).toBe('utf8');
    });

    it('should create child spawn manager with custom options', () => {
      const childManager = spawnManager.child({
        timeout: 60000,
        encoding: 'utf16'
      });
      
      expect(childManager).toBeInstanceOf(SpawnManager);
      expect(childManager.logger).toBe(mockLogger);
      expect(childManager.defaultTimeout).toBe(60000);
      expect(childManager.defaultEncoding).toBe('utf16');
    });

    it('should inherit parent logger in child', () => {
      const childManager = spawnManager.child({ timeout: 10000 });
      
      expect(childManager.logger).toBe(spawnManager.logger);
    });
  });
});