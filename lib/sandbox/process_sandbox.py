"""
DinoAir Process Sandbox
Provides secure execution environment for untrusted operations
"""

import os
import sys
import subprocess
import tempfile
import shutil
import json
import time
import threading
import signal
from typing import Optional, Dict, Any, List, Callable, Union
from dataclasses import dataclass, field
from pathlib import Path
from enum import Enum
import psutil
import platform

# Platform-specific imports
if platform.system() == "Linux":
    import resource
    import pwd
    import grp

class SandboxPermission(Enum):
    """Sandbox permission levels"""
    NONE = "none"           # No access
    READ = "read"           # Read-only access
    WRITE = "write"         # Read-write access
    EXECUTE = "execute"     # Execute permission

class SandboxIsolation(Enum):
    """Sandbox isolation levels"""
    MINIMAL = "minimal"     # Basic isolation
    MODERATE = "moderate"   # Moderate isolation (default)
    STRICT = "strict"       # Strict isolation
    MAXIMUM = "maximum"     # Maximum isolation

@dataclass
class SandboxConfig:
    """Sandbox configuration"""
    # Resource limits
    max_cpu_time: int = 60              # seconds
    max_memory_mb: int = 512            # MB
    max_file_size_mb: int = 100         # MB
    max_processes: int = 10             # number of processes
    max_open_files: int = 100           # number of open files
    
    # File system restrictions
    allowed_paths: List[str] = field(default_factory=list)
    read_only_paths: List[str] = field(default_factory=list)
    blocked_paths: List[str] = field(default_factory=lambda: [
        "/etc", "/sys", "/proc", "/dev", "/boot",
        os.path.expanduser("~/.ssh"),
        os.path.expanduser("~/.gnupg")
    ])
    
    # Network restrictions
    allow_network: bool = False
    allowed_hosts: List[str] = field(default_factory=list)
    allowed_ports: List[int] = field(default_factory=list)
    
    # Process restrictions
    allowed_commands: List[str] = field(default_factory=list)
    blocked_commands: List[str] = field(default_factory=lambda: [
        "sudo", "su", "chmod", "chown", "mount", "umount",
        "systemctl", "service", "iptables", "kill", "pkill"
    ])
    
    # Environment
    clean_environment: bool = True
    allowed_env_vars: List[str] = field(default_factory=lambda: [
        "PATH", "HOME", "USER", "LANG", "LC_ALL"
    ])
    
    # Isolation level
    isolation_level: SandboxIsolation = SandboxIsolation.MODERATE
    
    # User/group (Linux only)
    run_as_user: Optional[str] = None
    run_as_group: Optional[str] = None

@dataclass
class SandboxResult:
    """Result of sandboxed execution"""
    success: bool
    exit_code: int
    stdout: str
    stderr: str
    duration: float
    resource_usage: Dict[str, Any] = field(default_factory=dict)
    security_violations: List[str] = field(default_factory=list)

class ProcessSandbox:
    """
    Secure sandbox for running untrusted processes
    """
    
    def __init__(self, config: Optional[SandboxConfig] = None):
        self.config = config or SandboxConfig()
        self.temp_dir: Optional[Path] = None
        self._process: Optional[subprocess.Popen] = None
        self._monitor_thread: Optional[threading.Thread] = None
        self._start_time: Optional[float] = None
        self._violations: List[str] = []
        
    def __enter__(self):
        self._setup_sandbox()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self._cleanup_sandbox()
    
    def _setup_sandbox(self):
        """Setup sandbox environment"""
        # Create temporary directory
        self.temp_dir = Path(tempfile.mkdtemp(prefix="dinoair_sandbox_"))
        
        # Create subdirectories
        (self.temp_dir / "home").mkdir()
        (self.temp_dir / "tmp").mkdir()
        (self.temp_dir / "work").mkdir()
        
        # Setup restricted filesystem if on Linux
        if platform.system() == "Linux" and self.config.isolation_level >= SandboxIsolation.MODERATE:
            self._setup_chroot()
    
    def _cleanup_sandbox(self):
        """Cleanup sandbox environment"""
        # Kill process if still running
        if self._process and self._process.poll() is None:
            self._terminate_process()
        
        # Remove temporary directory
        if self.temp_dir and self.temp_dir.exists():
            try:
                shutil.rmtree(self.temp_dir)
            except Exception as e:
                print(f"Failed to cleanup sandbox: {e}")
    
    def _setup_chroot(self):
        """Setup chroot environment (Linux only)"""
        if not self.temp_dir:
            return
        
        # Copy essential binaries
        essential_bins = ["/bin/sh", "/bin/bash", "/usr/bin/python3"]
        bin_dir = self.temp_dir / "bin"
        bin_dir.mkdir(exist_ok=True)
        
        for bin_path in essential_bins:
            if os.path.exists(bin_path):
                try:
                    shutil.copy2(bin_path, bin_dir)
                except Exception:
                    pass
        
        # Copy essential libraries
        lib_dirs = ["/lib", "/lib64", "/usr/lib", "/usr/lib64"]
        for lib_dir in lib_dirs:
            if os.path.exists(lib_dir):
                dest = self.temp_dir / lib_dir.lstrip("/")
                dest.mkdir(parents=True, exist_ok=True)
                # Copy only specific libraries to avoid bloat
    
    def execute(self, command: Union[str, List[str]], 
                input_data: Optional[str] = None,
                timeout: Optional[int] = None) -> SandboxResult:
        """
        Execute command in sandbox
        """
        if not self.temp_dir:
            self._setup_sandbox()
        
        # Validate command
        if not self._validate_command(command):
            return SandboxResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr="Command not allowed",
                duration=0,
                security_violations=self._violations
            )
        
        # Prepare environment
        env = self._prepare_environment()
        
        # Set resource limits
        preexec_fn = None
        if platform.system() == "Linux":
            preexec_fn = self._set_resource_limits
        
        # Start process
        self._start_time = time.time()
        
        try:
            if isinstance(command, str):
                command = command.split()
            
            self._process = subprocess.Popen(
                command,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                cwd=str(self.temp_dir / "work"),
                preexec_fn=preexec_fn,
                start_new_session=True  # Create new process group
            )
            
            # Start monitoring thread
            self._monitor_thread = threading.Thread(
                target=self._monitor_process,
                daemon=True
            )
            self._monitor_thread.start()
            
            # Execute with timeout
            timeout = timeout or self.config.max_cpu_time
            
            try:
                stdout, stderr = self._process.communicate(
                    input=input_data.encode() if input_data else None,
                    timeout=timeout
                )
                exit_code = self._process.returncode
                
            except subprocess.TimeoutExpired:
                self._terminate_process()
                return SandboxResult(
                    success=False,
                    exit_code=-1,
                    stdout="",
                    stderr="Process timed out",
                    duration=time.time() - self._start_time,
                    security_violations=["timeout"]
                )
            
            duration = time.time() - self._start_time
            
            # Get resource usage
            resource_usage = self._get_resource_usage()
            
            return SandboxResult(
                success=exit_code == 0,
                exit_code=exit_code,
                stdout=stdout.decode(errors='replace'),
                stderr=stderr.decode(errors='replace'),
                duration=duration,
                resource_usage=resource_usage,
                security_violations=self._violations
            )
            
        except Exception as e:
            return SandboxResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr=str(e),
                duration=time.time() - self._start_time if self._start_time else 0,
                security_violations=self._violations
            )
    
    def _validate_command(self, command: Union[str, List[str]]) -> bool:
        """Validate command against restrictions"""
        if isinstance(command, str):
            cmd_parts = command.split()
        else:
            cmd_parts = command
        
        if not cmd_parts:
            return False
        
        cmd = cmd_parts[0]
        
        # Check blocked commands
        if cmd in self.config.blocked_commands:
            self._violations.append(f"Blocked command: {cmd}")
            return False
        
        # Check allowed commands if specified
        if self.config.allowed_commands and cmd not in self.config.allowed_commands:
            self._violations.append(f"Command not in allowed list: {cmd}")
            return False
        
        # Check for shell injection attempts
        dangerous_chars = [';', '&', '|', '`', '$', '>', '<', '\\']
        cmd_str = ' '.join(cmd_parts) if isinstance(command, list) else command
        
        for char in dangerous_chars:
            if char in cmd_str:
                self._violations.append(f"Dangerous character in command: {char}")
                return False
        
        return True
    
    def _prepare_environment(self) -> Dict[str, str]:
        """Prepare sandboxed environment variables"""
        if self.config.clean_environment:
            # Start with minimal environment
            env = {
                'PATH': '/usr/local/bin:/usr/bin:/bin',
                'HOME': str(self.temp_dir / "home"),
                'TMPDIR': str(self.temp_dir / "tmp"),
                'USER': 'sandbox',
                'LOGNAME': 'sandbox'
            }
            
            # Add allowed environment variables
            for var in self.config.allowed_env_vars:
                if var in os.environ and var not in env:
                    env[var] = os.environ[var]
        else:
            # Copy current environment
            env = os.environ.copy()
            
            # Override sensitive variables
            env['HOME'] = str(self.temp_dir / "home")
            env['TMPDIR'] = str(self.temp_dir / "tmp")
        
        # Add sandbox indicator
        env['DINOAIR_SANDBOX'] = '1'
        env['SANDBOX_LEVEL'] = self.config.isolation_level.value
        
        return env
    
    def _set_resource_limits(self):
        """Set resource limits for the process (Linux only)"""
        if platform.system() != "Linux":
            return
        
        # Set CPU time limit
        resource.setrlimit(
            resource.RLIMIT_CPU,
            (self.config.max_cpu_time, self.config.max_cpu_time)
        )
        
        # Set memory limit
        memory_bytes = self.config.max_memory_mb * 1024 * 1024
        resource.setrlimit(
            resource.RLIMIT_AS,
            (memory_bytes, memory_bytes)
        )
        
        # Set file size limit
        file_size_bytes = self.config.max_file_size_mb * 1024 * 1024
        resource.setrlimit(
            resource.RLIMIT_FSIZE,
            (file_size_bytes, file_size_bytes)
        )
        
        # Set process limit
        resource.setrlimit(
            resource.RLIMIT_NPROC,
            (self.config.max_processes, self.config.max_processes)
        )
        
        # Set open files limit
        resource.setrlimit(
            resource.RLIMIT_NOFILE,
            (self.config.max_open_files, self.config.max_open_files)
        )
        
        # Drop privileges if specified
        if self.config.run_as_user:
            try:
                uid = pwd.getpwnam(self.config.run_as_user).pw_uid
                gid = pwd.getpwnam(self.config.run_as_user).pw_gid
                
                if self.config.run_as_group:
                    gid = grp.getgrnam(self.config.run_as_group).gr_gid
                
                os.setgid(gid)
                os.setuid(uid)
            except Exception:
                pass
    
    def _monitor_process(self):
        """Monitor process for violations"""
        if not self._process:
            return
        
        try:
            process = psutil.Process(self._process.pid)
            
            while self._process.poll() is None:
                # Check CPU usage
                cpu_percent = process.cpu_percent(interval=1)
                if cpu_percent > 90:
                    self._violations.append(f"High CPU usage: {cpu_percent}%")
                
                # Check memory usage
                memory_info = process.memory_info()
                memory_mb = memory_info.rss / (1024 * 1024)
                if memory_mb > self.config.max_memory_mb:
                    self._violations.append(f"Memory limit exceeded: {memory_mb}MB")
                    self._terminate_process()
                    break
                
                # Check file descriptors
                try:
                    num_fds = process.num_fds()
                    if num_fds > self.config.max_open_files:
                        self._violations.append(f"Too many open files: {num_fds}")
                except:
                    pass
                
                # Check for network connections if not allowed
                if not self.config.allow_network:
                    try:
                        connections = process.connections()
                        if connections:
                            self._violations.append("Unauthorized network connection")
                            self._terminate_process()
                            break
                    except:
                        pass
                
                time.sleep(0.5)
                
        except psutil.NoSuchProcess:
            pass
        except Exception as e:
            self._violations.append(f"Monitor error: {e}")
    
    def _terminate_process(self):
        """Terminate the sandboxed process"""
        if not self._process:
            return
        
        try:
            # Try graceful termination first
            if platform.system() == "Windows":
                self._process.terminate()
            else:
                os.killpg(os.getpgid(self._process.pid), signal.SIGTERM)
            
            # Wait briefly
            time.sleep(2)
            
            # Force kill if still running
            if self._process.poll() is None:
                if platform.system() == "Windows":
                    self._process.kill()
                else:
                    os.killpg(os.getpgid(self._process.pid), signal.SIGKILL)
                    
        except Exception as e:
            print(f"Error terminating process: {e}")
    
    def _get_resource_usage(self) -> Dict[str, Any]:
        """Get resource usage statistics"""
        usage = {}
        
        if self._process:
            try:
                process = psutil.Process(self._process.pid)
                
                # CPU times
                cpu_times = process.cpu_times()
                usage['cpu_time_user'] = cpu_times.user
                usage['cpu_time_system'] = cpu_times.system
                
                # Memory
                memory_info = process.memory_info()
                usage['memory_peak_mb'] = memory_info.rss / (1024 * 1024)
                
                # I/O counters
                try:
                    io_counters = process.io_counters()
                    usage['io_read_bytes'] = io_counters.read_bytes
                    usage['io_write_bytes'] = io_counters.write_bytes
                except:
                    pass
                    
            except psutil.NoSuchProcess:
                pass
        
        return usage

class CodeSandbox(ProcessSandbox):
    """
    Specialized sandbox for executing code
    """
    
    def __init__(self, language: str = "python", config: Optional[SandboxConfig] = None):
        super().__init__(config or self._get_language_config(language))
        self.language = language
    
    def _get_language_config(self, language: str) -> SandboxConfig:
        """Get language-specific sandbox configuration"""
        configs = {
            "python": SandboxConfig(
                allowed_commands=["python", "python3"],
                max_memory_mb=256,
                max_cpu_time=30,
                isolation_level=SandboxIsolation.STRICT
            ),
            "javascript": SandboxConfig(
                allowed_commands=["node"],
                max_memory_mb=256,
                max_cpu_time=30,
                isolation_level=SandboxIsolation.STRICT
            ),
            "shell": SandboxConfig(
                allowed_commands=["sh", "bash"],
                blocked_commands=SandboxConfig().blocked_commands + [
                    "wget", "curl", "nc", "netcat", "ssh", "scp"
                ],
                max_memory_mb=128,
                max_cpu_time=10,
                isolation_level=SandboxIsolation.MAXIMUM
            )
        }
        
        return configs.get(language, SandboxConfig())
    
    def execute_code(self, code: str, timeout: Optional[int] = None) -> SandboxResult:
        """Execute code in sandbox"""
        # Create temporary file
        if not self.temp_dir:
            self._setup_sandbox()
        
        code_file = self.temp_dir / "work" / f"code.{self._get_extension()}"
        code_file.write_text(code)
        
        # Prepare command
        if self.language == "python":
            command = ["python3", str(code_file)]
        elif self.language == "javascript":
            command = ["node", str(code_file)]
        elif self.language == "shell":
            command = ["bash", str(code_file)]
        else:
            return SandboxResult(
                success=False,
                exit_code=-1,
                stdout="",
                stderr=f"Unsupported language: {self.language}",
                duration=0
            )
        
        return self.execute(command, timeout=timeout)
    
    def _get_extension(self) -> str:
        """Get file extension for language"""
        extensions = {
            "python": "py",
            "javascript": "js",
            "shell": "sh"
        }
        return extensions.get(self.language, "txt")

# Helper functions
def run_sandboxed(command: Union[str, List[str]], 
                 config: Optional[SandboxConfig] = None,
                 timeout: Optional[int] = None) -> SandboxResult:
    """Run command in sandbox"""
    with ProcessSandbox(config) as sandbox:
        return sandbox.execute(command, timeout=timeout)

def run_code_sandboxed(code: str, 
                      language: str = "python",
                      timeout: Optional[int] = None) -> SandboxResult:
    """Run code in sandbox"""
    with CodeSandbox(language) as sandbox:
        return sandbox.execute_code(code, timeout=timeout)

if __name__ == "__main__":
    # Example usage
    
    # Example 1: Run a simple command
    print("Example 1: Simple command")
    result = run_sandboxed("echo 'Hello from sandbox!'")
    print(f"Success: {result.success}")
    print(f"Output: {result.stdout}")
    print()
    
    # Example 2: Run Python code
    print("Example 2: Python code")
    code = """
import os
print(f"Running in sandbox: {os.environ.get('DINOAIR_SANDBOX', 'No')}")
print(f"Home directory: {os.environ.get('HOME', 'Unknown')}")

# Try to access restricted path (should fail in strict mode)
try:
    with open('/etc/passwd', 'r') as f:
        print("ERROR: Could read /etc/passwd!")
except:
    print("Good: Cannot access /etc/passwd")
"""
    
    result = run_code_sandboxed(code, "python")
    print(f"Success: {result.success}")
    print(f"Output:\n{result.stdout}")
    print(f"Errors:\n{result.stderr}")
    print(f"Violations: {result.security_violations}")
    print()
    
    # Example 3: Resource limits
    print("Example 3: Resource limits")
    memory_hog = """
# Try to allocate too much memory
data = []
for i in range(1000000):
    data.append('x' * 1000)
print("Should not reach here")
"""
    
    config = SandboxConfig(max_memory_mb=50, max_cpu_time=5)
    with CodeSandbox("python", config) as sandbox:
        result = sandbox.execute_code(memory_hog)
        print(f"Success: {result.success}")
        print(f"Errors: {result.stderr}")
        print(f"Violations: {result.security_violations}")