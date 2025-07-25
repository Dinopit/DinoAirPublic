/**
 * Spawn Manager Module
 * Provides process management functionality for the DinoAir CLI installer
 */

const { spawn, exec, execFile } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

class SpawnManager {
  constructor(options = {}) {
    this.logger = options.logger || null;
    this.defaultTimeout = options.timeout || 300000; // 5 minutes default
    this.defaultEncoding = options.encoding || 'utf8';
  }

  /**
   * Run a command and return the result
   */
  async runCommand(command, args = [], options = {}) {
    const {
      cwd = process.cwd(),
      env = process.env,
      timeout = this.defaultTimeout,
      encoding = this.defaultEncoding,
      shell = false,
      stdio = 'pipe'
    } = options;

    return new Promise((resolve, reject) => {
      if (this.logger) {
        this.logger.debug(`Running command: ${command} ${args.join(' ')}`);
      }

      const child = spawn(command, args, {
        cwd,
        env,
        shell,
        stdio,
        encoding
      });

      let stdout = '';
      let stderr = '';
      let timeoutId;

      // Set up timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timed out after ${timeout}ms: ${command} ${args.join(' ')}`));
        }, timeout);
      }

      // Collect stdout
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      // Collect stderr
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      // Handle process completion
      child.on('close', (code, signal) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (this.logger) {
          this.logger.debug(`Command completed with code ${code}: ${command} ${args.join(' ')}`);
        }

        if (code === 0 || (code === null && signal)) {
          resolve({
            code,
            signal,
            stdout: stdout.trim(),
            stderr: stderr.trim()
          });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout || 'Unknown error'}`));
        }
      });

      // Handle process errors
      child.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (this.logger) {
          this.logger.error(`Command error: ${error.message}`);
        }

        reject(new Error(`Failed to start command: ${error.message}`));
      });
    });
  }

  /**
   * Run a command with real-time output streaming
   */
  async runCommandWithOutput(command, args = [], options = {}) {
    const {
      cwd = process.cwd(),
      env = process.env,
      timeout = this.defaultTimeout,
      onStdout = null,
      onStderr = null,
      shell = false
    } = options;

    return new Promise((resolve, reject) => {
      if (this.logger) {
        this.logger.debug(`Running command with output: ${command} ${args.join(' ')}`);
      }

      const child = spawn(command, args, {
        cwd,
        env,
        shell,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let timeoutId;

      // Set up timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timed out after ${timeout}ms: ${command} ${args.join(' ')}`));
        }, timeout);
      }

      // Handle stdout
      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        
        if (onStdout) {
          onStdout(text);
        }
      });

      // Handle stderr
      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        
        if (onStderr) {
          onStderr(text);
        }
      });

      // Handle process completion
      child.on('close', (code, signal) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (this.logger) {
          this.logger.debug(`Command with output completed with code ${code}: ${command} ${args.join(' ')}`);
        }

        if (code === 0 || (code === null && signal)) {
          resolve({
            code,
            signal,
            stdout: stdout.trim(),
            stderr: stderr.trim()
          });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout || 'Unknown error'}`));
        }
      });

      // Handle process errors
      child.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (this.logger) {
          this.logger.error(`Command with output error: ${error.message}`);
        }

        reject(new Error(`Failed to start command: ${error.message}`));
      });
    });
  }

  /**
   * Run a Python script
   */
  async runPythonScript(scriptPath, args = [], options = {}) {
    const pythonPath = this.getPythonExecutable();
    const fullArgs = [scriptPath, ...args];

    if (this.logger) {
      this.logger.debug(`Running Python script: ${scriptPath}`);
    }

    return this.runCommand(pythonPath, fullArgs, options);
  }

  /**
   * Run a Python script with real-time output
   */
  async runPythonScriptWithOutput(scriptPath, args = [], options = {}) {
    const pythonPath = this.getPythonExecutable();
    const fullArgs = [scriptPath, ...args];

    if (this.logger) {
      this.logger.debug(`Running Python script with output: ${scriptPath}`);
    }

    return this.runCommandWithOutput(pythonPath, fullArgs, options);
  }

  /**
   * Run a shell command using exec (for complex commands with pipes, etc.)
   */
  async runShellCommand(command, options = {}) {
    const {
      cwd = process.cwd(),
      env = process.env,
      timeout = this.defaultTimeout,
      encoding = this.defaultEncoding
    } = options;

    if (this.logger) {
      this.logger.debug(`Running shell command: ${command}`);
    }

    try {
      const result = await execAsync(command, {
        cwd,
        env,
        timeout,
        encoding
      });

      if (this.logger) {
        this.logger.debug(`Shell command completed: ${command}`);
      }

      return {
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim()
      };
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Shell command failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if a command exists in PATH
   */
  async commandExists(command) {
    const checkCommand = process.platform === 'win32' 
      ? `where ${command}` 
      : `which ${command}`;

    try {
      await this.runShellCommand(checkCommand);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the appropriate Python executable
   */
  getPythonExecutable() {
    if (process.platform === 'win32') {
      return 'python';
    } else {
      return 'python3';
    }
  }

  /**
   * Check if Python is available
   */
  async checkPython() {
    const pythonPath = this.getPythonExecutable();
    
    try {
      const result = await this.runCommand(pythonPath, ['--version']);
      
      if (this.logger) {
        this.logger.debug(`Python check successful: ${result.stdout}`);
      }
      
      return {
        available: true,
        version: result.stdout,
        executable: pythonPath
      };
    } catch (error) {
      if (this.logger) {
        this.logger.debug(`Python check failed: ${error.message}`);
      }
      
      return {
        available: false,
        error: error.message,
        executable: pythonPath
      };
    }
  }

  /**
   * Install Python packages using pip
   */
  async installPythonPackages(packages, options = {}) {
    const {
      upgrade = false,
      userInstall = false,
      requirementsFile = null,
      extraArgs = []
    } = options;

    const pythonPath = this.getPythonExecutable();
    const args = ['-m', 'pip', 'install'];

    if (upgrade) {
      args.push('--upgrade');
    }

    if (userInstall) {
      args.push('--user');
    }

    if (requirementsFile) {
      args.push('-r', requirementsFile);
    } else if (Array.isArray(packages)) {
      args.push(...packages);
    } else {
      args.push(packages);
    }

    args.push(...extraArgs);

    if (this.logger) {
      this.logger.debug(`Installing Python packages: ${args.slice(3).join(' ')}`);
    }

    return this.runCommandWithOutput(pythonPath, args, {
      ...options,
      onStdout: (data) => {
        if (this.logger) {
          this.logger.debug(`pip: ${data.trim()}`);
        }
      },
      onStderr: (data) => {
        if (this.logger) {
          this.logger.debug(`pip stderr: ${data.trim()}`);
        }
      }
    });
  }

  /**
   * Run npm command
   */
  async runNpmCommand(command, args = [], options = {}) {
    const npmPath = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const fullArgs = [command, ...args];

    if (this.logger) {
      this.logger.debug(`Running npm command: ${command} ${args.join(' ')}`);
    }

    return this.runCommandWithOutput(npmPath, fullArgs, {
      ...options,
      onStdout: (data) => {
        if (this.logger) {
          this.logger.debug(`npm: ${data.trim()}`);
        }
      },
      onStderr: (data) => {
        if (this.logger) {
          this.logger.debug(`npm stderr: ${data.trim()}`);
        }
      }
    });
  }

  /**
   * Download a file using curl or wget
   */
  async downloadFile(url, outputPath, options = {}) {
    const { 
      timeout = 600000, // 10 minutes for downloads
      followRedirects = true,
      userAgent = 'DinoAir-Installer'
    } = options;

    let command, args;

    // Try curl first, then wget
    if (await this.commandExists('curl')) {
      command = 'curl';
      args = ['-L', '-o', outputPath];
      
      if (followRedirects) {
        args.push('-L');
      }
      
      args.push('-A', userAgent, url);
    } else if (await this.commandExists('wget')) {
      command = 'wget';
      args = ['-O', outputPath];
      
      if (userAgent) {
        args.push('--user-agent', userAgent);
      }
      
      args.push(url);
    } else {
      throw new Error('Neither curl nor wget is available for downloading files');
    }

    if (this.logger) {
      this.logger.debug(`Downloading file: ${url} → ${outputPath}`);
    }

    return this.runCommandWithOutput(command, args, {
      timeout,
      onStdout: (data) => {
        if (this.logger) {
          this.logger.debug(`Download: ${data.trim()}`);
        }
      }
    });
  }

  /**
   * Kill a process by PID
   */
  async killProcess(pid, signal = 'SIGTERM') {
    const command = process.platform === 'win32' ? 'taskkill' : 'kill';
    const args = process.platform === 'win32' 
      ? ['/PID', pid.toString(), '/F'] 
      : [`-${signal}`, pid.toString()];

    if (this.logger) {
      this.logger.debug(`Killing process ${pid} with signal ${signal}`);
    }

    try {
      await this.runCommand(command, args);
      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to kill process ${pid}: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo() {
    const info = {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      cpus: os.cpus().length,
      memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // GB
      hostname: os.hostname(),
      uptime: os.uptime()
    };

    // Try to get additional info on different platforms
    try {
      if (process.platform === 'win32') {
        const result = await this.runShellCommand('systeminfo | findstr /C:"Total Physical Memory"');
        // Parse Windows system info if needed
      } else if (process.platform === 'linux') {
        const result = await this.runShellCommand('cat /proc/meminfo | grep MemTotal');
        // Parse Linux memory info if needed
      } else if (process.platform === 'darwin') {
        const result = await this.runShellCommand('system_profiler SPHardwareDataType');
        // Parse macOS system info if needed
      }
    } catch (error) {
      if (this.logger) {
        this.logger.debug(`Could not get extended system info: ${error.message}`);
      }
    }

    return info;
  }

  /**
   * Create a child spawn manager with different options
   */
  child(options = {}) {
    return new SpawnManager({
      logger: this.logger,
      timeout: this.defaultTimeout,
      encoding: this.defaultEncoding,
      ...options
    });
  }
}

module.exports = SpawnManager;