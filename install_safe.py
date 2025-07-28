"""
DinoAir Safe Installation Script
Enhanced version with comprehensive safety checks and error recovery
"""

import os
import sys
import subprocess
import platform
import argparse
import shutil
import time
import traceback
import getpass
from typing import Optional, Tuple, Dict, Any, List
from pathlib import Path
from dataclasses import dataclass, asdict

# Cross-platform terminal color support
from colorama import init, Fore, Back, Style

# Initialize colorama for cross-platform support
init(autoreset=True)

# Add lib directory to path for imports
script_dir = Path(__file__).parent
lib_dir = script_dir / "lib"
sys.path.insert(0, str(lib_dir))

try:
    from installation.prerequisite_checker import PrerequisiteChecker, CheckStatus
except ImportError:
    print("Error: Could not import prerequisite checker.")
    print("Please ensure the lib/installation directory exists.")
    sys.exit(1)


@dataclass
class InstallationConfig:
    """Configuration for installation process"""
    enable_privacy_mode: bool = True
    enable_telemetry: bool = False
    enable_auto_updates: bool = True
    installation_path: str = ""
    backup_enabled: bool = True
    hardware_optimization: bool = True
    interactive_mode: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'InstallationConfig':
        return cls(**data)


class InteractiveWizard:
    """Interactive installation wizard for user-friendly setup"""
    
    def __init__(self, installer):
        self.installer = installer
        self.config = InstallationConfig()
    
    def print_banner(self):
        """Print welcome banner"""
        banner = f"""
{Fore.CYAN}╔══════════════════════════════════════════════════════════════════════════════╗
║                            DinoAir Installation Wizard                      ║
║                           Privacy-First AI Platform                         ║
╚══════════════════════════════════════════════════════════════════════════════╝{Style.RESET_ALL}

Welcome to DinoAir! This wizard will guide you through a secure, privacy-focused
installation tailored to your system and preferences.
"""
        print(banner)
    
    def get_user_input(self, prompt: str, default: str = "", choices: List[str] = None) -> str:
        """Get user input with validation"""
        while True:
            if choices:
                choice_str = f"[{'/'.join(choices)}]"
                full_prompt = f"{prompt} {choice_str}: "
            else:
                full_prompt = f"{prompt}: "
            
            if default:
                full_prompt = f"{prompt} (default: {default}): "
            
            try:
                response = input(full_prompt).strip()
                if not response and default:
                    return default
                
                if choices and response.lower() not in [c.lower() for c in choices]:
                    print(f"{Fore.RED}Please choose from: {choices}{Style.RESET_ALL}")
                    continue
                    
                return response.lower() if choices else response
            except KeyboardInterrupt:
                print(f"\n{Fore.YELLOW}Installation cancelled by user{Style.RESET_ALL}")
                sys.exit(0)
    
    def privacy_setup(self):
        """Configure privacy settings"""
        print(f"\n{Fore.GREEN}🔒 Privacy & Security Configuration{Style.RESET_ALL}")
        print("DinoAir prioritizes your privacy. Let's configure your preferences:")
        
        # Privacy mode
        privacy_choice = self.get_user_input(
            "\nEnable Privacy Mode? (Disables external telemetry & analytics)",
            "Y", ["Y", "n"]
        )
        self.config.enable_privacy_mode = privacy_choice.lower() in ['y', 'yes', '']
        
        if not self.config.enable_privacy_mode:
            # Telemetry opt-in only if privacy mode is disabled
            telemetry_choice = self.get_user_input(
                "Enable anonymous usage telemetry? (Helps improve DinoAir)",
                "n", ["Y", "n"]
            )
            self.config.enable_telemetry = telemetry_choice.lower() in ['y', 'yes']
        else:
            self.config.enable_telemetry = False
            print(f"{Fore.GREEN}✓ Privacy mode enabled - telemetry disabled{Style.RESET_ALL}")
        
        # Auto-updates
        updates_choice = self.get_user_input(
            "Enable automatic security updates?",
            "Y", ["Y", "n"]
        )
        self.config.enable_auto_updates = updates_choice.lower() in ['y', 'yes', '']
        
        # Backup
        backup_choice = self.get_user_input(
            "Enable automatic configuration backups?",
            "Y", ["Y", "n"]
        )
        self.config.backup_enabled = backup_choice.lower() in ['y', 'yes', '']
    
    def hardware_optimization_setup(self):
        """Configure hardware optimization"""
        print(f"\n{Fore.BLUE}⚡ Hardware Optimization{Style.RESET_ALL}")
        
        # Detect hardware
        self.installer.detect_hardware()
        
        optimize_choice = self.get_user_input(
            "Enable automatic hardware optimization?",
            "Y", ["Y", "n"]
        )
        self.config.hardware_optimization = optimize_choice.lower() in ['y', 'yes', '']
        
        if self.config.hardware_optimization:
            print(f"{Fore.GREEN}✓ Hardware optimization enabled{Style.RESET_ALL}")
            self.installer.log("Hardware optimization will be applied during installation", "INFO")
    
    def installation_path_setup(self):
        """Configure installation path"""
        print(f"\n{Fore.MAGENTA}📁 Installation Path{Style.RESET_ALL}")
        
        default_path = str(Path.cwd())
        custom_path = self.get_user_input(
            f"Installation directory",
            default_path
        )
        
        self.config.installation_path = custom_path
        
        # Validate path
        path_obj = Path(custom_path)
        if not path_obj.exists():
            create_choice = self.get_user_input(
                f"Directory '{custom_path}' doesn't exist. Create it?",
                "Y", ["Y", "n"]
            )
            if create_choice.lower() in ['y', 'yes', '']:
                try:
                    path_obj.mkdir(parents=True, exist_ok=True)
                    print(f"{Fore.GREEN}✓ Directory created{Style.RESET_ALL}")
                except Exception as e:
                    print(f"{Fore.RED}Failed to create directory: {e}{Style.RESET_ALL}")
                    return False
        
        return True
    
    def review_configuration(self):
        """Review and confirm configuration"""
        print(f"\n{Fore.YELLOW}📋 Configuration Review{Style.RESET_ALL}")
        print("Please review your installation configuration:")
        
        config_items = [
            ("Privacy Mode", "Enabled" if self.config.enable_privacy_mode else "Disabled"),
            ("Telemetry", "Enabled" if self.config.enable_telemetry else "Disabled"),
            ("Auto Updates", "Enabled" if self.config.enable_auto_updates else "Disabled"),
            ("Backups", "Enabled" if self.config.backup_enabled else "Disabled"),
            ("Hardware Optimization", "Enabled" if self.config.hardware_optimization else "Disabled"),
            ("Installation Path", self.config.installation_path)
        ]
        
        for item, value in config_items:
            status_color = Fore.GREEN if "Enabled" in value else Fore.CYAN
            print(f"  {item:<20}: {status_color}{value}{Style.RESET_ALL}")
        
        confirm = self.get_user_input(
            "\nProceed with this configuration?",
            "Y", ["Y", "n"]
        )
        
        return confirm.lower() in ['y', 'yes', '']
    
    def run(self) -> InstallationConfig:
        """Run the interactive wizard"""
        if not self.config.interactive_mode:
            return self.config
        
        self.print_banner()
        
        # Run wizard steps
        self.privacy_setup()
        self.hardware_optimization_setup()
        
        if not self.installation_path_setup():
            sys.exit(1)
        
        if not self.review_configuration():
            print(f"{Fore.YELLOW}Installation cancelled by user{Style.RESET_ALL}")
            sys.exit(0)
        
        # Save configuration
        self.save_configuration()
        
        return self.config
    
    def save_configuration(self):
        """Save configuration to file"""
        config_dir = Path(self.config.installation_path) / "config"
        config_dir.mkdir(exist_ok=True)
        
        config_file = config_dir / "installation_config.json"
        try:
            with open(config_file, 'w') as f:
                json.dump(self.config.to_dict(), f, indent=2)
            print(f"{Fore.GREEN}✓ Configuration saved to {config_file}{Style.RESET_ALL}")
        except Exception as e:
            print(f"{Fore.RED}Warning: Could not save configuration: {e}{Style.RESET_ALL}")


class HardwareDetector:
    """Advanced hardware detection and optimization"""
    
    def __init__(self, installer):
        self.installer = installer
        self.hardware_info = {}
    
    def detect_cpu(self):
        """Detect CPU information"""
        try:
            cpu_info = {
                'cores': psutil.cpu_count(logical=False),
                'threads': psutil.cpu_count(logical=True),
                'frequency': psutil.cpu_freq().max if psutil.cpu_freq() else 0,
                'usage': psutil.cpu_percent(interval=1)
            }
            self.hardware_info['cpu'] = cpu_info
            self.installer.log(f"CPU: {cpu_info['cores']} cores, {cpu_info['threads']} threads", "INFO")
        except Exception as e:
            self.installer.log(f"CPU detection failed: {e}", "WARNING")
    
    def detect_memory(self):
        """Detect memory information"""
        try:
            import psutil
            memory = psutil.virtual_memory()
            memory_info = {
                'total_gb': memory.total / (1024**3),
                'available_gb': memory.available / (1024**3),
                'usage_percent': memory.percent
            }
            self.hardware_info['memory'] = memory_info
            self.installer.log(f"Memory: {memory_info['total_gb']:.1f}GB total, {memory_info['available_gb']:.1f}GB available", "INFO")
        except Exception as e:
            self.installer.log(f"Memory detection failed: {e}", "WARNING")
    
    def detect_gpu(self):
        """Detect GPU information"""
        gpu_info = {'type': 'none', 'name': 'Not detected', 'memory': 0}
        
        try:
            # Try NVIDIA detection first
            result = subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    name, memory = line.split(', ')
                    gpu_info = {'type': 'nvidia', 'name': name.strip(), 'memory': int(memory)}
                    break
        except:
            pass
        
        if gpu_info['type'] == 'none':
            try:
                # Try AMD detection
                result = subprocess.run(['rocm-smi', '--showproductname'], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    gpu_info = {'type': 'amd', 'name': 'AMD GPU detected', 'memory': 0}
            except:
                pass
        
        self.hardware_info['gpu'] = gpu_info
        self.installer.log(f"GPU: {gpu_info['name']} ({gpu_info['type']})", "INFO")
    
    def detect_storage(self):
        """Detect storage information"""
        try:
            import psutil
            disk = psutil.disk_usage('.')
            storage_info = {
                'total_gb': disk.total / (1024**3),
                'free_gb': disk.free / (1024**3),
                'usage_percent': (disk.used / disk.total) * 100
            }
            self.hardware_info['storage'] = storage_info
            self.installer.log(f"Storage: {storage_info['free_gb']:.1f}GB free of {storage_info['total_gb']:.1f}GB", "INFO")
        except Exception as e:
            self.installer.log(f"Storage detection failed: {e}", "WARNING")
    
    def get_optimization_recommendations(self) -> Dict[str, Any]:
        """Get hardware-specific optimization recommendations"""
        recommendations = {
            'batch_size': 1,
            'memory_limit': 4096,
            'cpu_threads': 4,
            'gpu_enabled': False
        }
        
        if 'memory' in self.hardware_info:
            memory_gb = self.hardware_info['memory']['total_gb']
            if memory_gb >= 16:
                recommendations['memory_limit'] = 8192
                recommendations['batch_size'] = 2
            elif memory_gb >= 32:
                recommendations['memory_limit'] = 16384
                recommendations['batch_size'] = 4
        
        if 'cpu' in self.hardware_info:
            cpu_cores = self.hardware_info['cpu']['cores']
            recommendations['cpu_threads'] = min(cpu_cores, 8)
        
        if 'gpu' in self.hardware_info and self.hardware_info['gpu']['type'] != 'none':
            recommendations['gpu_enabled'] = True
        
        return recommendations


class BackupManager:
    """Manages backups and restoration for safe installation"""
    
    def __init__(self, installer):
        self.installer = installer
        self.backup_dir = Path.cwd() / "backups" / f"install_backup_{int(time.time())}"
    
    def create_pre_install_backup(self) -> bool:
        """Create backup before installation starts"""
        try:
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Backup existing config files
            config_files = [
                "config.yaml", "config.json", ".env", "docker-compose.yml"
            ]
            
            backed_up_files = []
            for config_file in config_files:
                source = Path(config_file)
                if source.exists():
                    dest = self.backup_dir / config_file
                    shutil.copy2(source, dest)
                    backed_up_files.append(config_file)
            
            # Create backup manifest
            manifest = {
                "timestamp": time.time(),
                "files": backed_up_files,
                "backup_dir": str(self.backup_dir)
            }
            
            with open(self.backup_dir / "manifest.json", 'w') as f:
                json.dump(manifest, f, indent=2)
            
            if backed_up_files:
                self.installer.log(f"Backup created: {self.backup_dir}", "SUCCESS")
                self.installer.log(f"Backed up files: {', '.join(backed_up_files)}", "INFO")
            else:
                self.installer.log("No existing configuration files to backup", "INFO")
            
            return True
            
        except Exception as e:
            self.installer.log(f"Backup creation failed: {e}", "ERROR")
            return False
    
    def restore_backup(self) -> bool:
        """Restore from backup"""
        try:
            manifest_file = self.backup_dir / "manifest.json"
            if not manifest_file.exists():
                return False
            
            with open(manifest_file, 'r') as f:
                manifest = json.load(f)
            
            for file_name in manifest["files"]:
                source = self.backup_dir / file_name
                dest = Path(file_name)
                if source.exists():
                    shutil.copy2(source, dest)
                    self.installer.log(f"Restored: {file_name}", "INFO")
            
            return True
            
        except Exception as e:
            self.installer.log(f"Backup restoration failed: {e}", "ERROR")
            return False


class PrivacyManager:
    """Handles privacy and security features"""
    
    def __init__(self, installer):
        self.installer = installer
        self.config = installer.config
    
    def setup_privacy_features(self):
        """Configure privacy features based on user preferences"""
        if self.config.enable_privacy_mode:
            self.installer.log("Configuring privacy-first settings...", "INFO")
            
            # Disable telemetry
            self.disable_telemetry()
            
            # Configure local data encryption
            self.setup_local_encryption()
            
            # Setup secure deletion
            self.setup_secure_deletion()
            
            self.installer.log("Privacy features configured", "SUCCESS")
    
    def disable_telemetry(self):
        """Disable all telemetry and external data collection"""
        try:
            # Create/update .env file with privacy settings
            env_file = Path(".env")
            privacy_settings = [
                "TELEMETRY_ENABLED=false",
                "ANALYTICS_ENABLED=false",
                "CRASH_REPORTING=false",
                "USAGE_STATS=false",
                "PRIVACY_MODE=true"
            ]
            
            existing_content = ""
            if env_file.exists():
                with open(env_file, 'r') as f:
                    existing_content = f.read()
            
            # Add privacy settings
            with open(env_file, 'a') as f:
                f.write("\n# Privacy Settings\n")
                for setting in privacy_settings:
                    if setting.split('=')[0] not in existing_content:
                        f.write(f"{setting}\n")
            
            self.installer.log("Telemetry and analytics disabled", "INFO")
            
        except Exception as e:
            self.installer.log(f"Failed to configure privacy settings: {e}", "WARNING")
    
    def setup_local_encryption(self):
        """Setup local data encryption for sensitive data"""
        try:
            # Create encryption configuration
            crypto_config = {
                "local_encryption": True,
                "encryption_algorithm": "AES-256",
                "key_derivation": "PBKDF2",
                "secure_storage": True
            }
            
            config_dir = Path("config")
            config_dir.mkdir(exist_ok=True)
            
            with open(config_dir / "crypto_config.json", 'w') as f:
                json.dump(crypto_config, f, indent=2)
            
            self.installer.log("Local encryption configured", "INFO")
            
        except Exception as e:
            self.installer.log(f"Failed to setup encryption: {e}", "WARNING")
    
    def setup_secure_deletion(self):
        """Configure secure file deletion policies"""
        try:
            deletion_config = {
                "secure_delete": True,
                "overwrite_passes": 3,
                "auto_cleanup": True,
                "cleanup_interval_days": 30
            }
            
            config_dir = Path("config")
            config_dir.mkdir(exist_ok=True)
            
            with open(config_dir / "deletion_policy.json", 'w') as f:
                json.dump(deletion_config, f, indent=2)
            
            self.installer.log("Secure deletion configured", "INFO")
            
        except Exception as e:
            self.installer.log(f"Failed to setup secure deletion: {e}", "WARNING")


class ProgressTracker:
    """Enhanced progress tracking with recovery capabilities"""
    
    def __init__(self, installer):
        self.installer = installer
        self.progress_file = Path("install_progress.json")
        self.current_step = 0
        self.total_steps = 0
        self.step_details = {}
    
    def initialize(self, steps: List[str]):
        """Initialize progress tracking"""
        self.total_steps = len(steps)
        self.step_details = {i: {"name": step, "status": "pending", "timestamp": None} 
                           for i, step in enumerate(steps)}
        self.save_progress()
    
    def update_step(self, step_index: int, status: str, details: str = ""):
        """Update step status"""
        if step_index in self.step_details:
            self.step_details[step_index].update({
                "status": status,
                "timestamp": time.time(),
                "details": details
            })
            self.current_step = step_index
            self.save_progress()
            self.display_progress()
    
    def save_progress(self):
        """Save progress to file for recovery"""
        try:
            progress_data = {
                "current_step": self.current_step,
                "total_steps": self.total_steps,
                "steps": self.step_details,
                "timestamp": time.time()
            }
            
            with open(self.progress_file, 'w') as f:
                json.dump(progress_data, f, indent=2)
                
        except Exception as e:
            self.installer.log(f"Failed to save progress: {e}", "WARNING")
    
    def load_progress(self) -> bool:
        """Load progress from previous installation attempt"""
        try:
            if self.progress_file.exists():
                with open(self.progress_file, 'r') as f:
                    progress_data = json.load(f)
                
                self.current_step = progress_data.get("current_step", 0)
                self.total_steps = progress_data.get("total_steps", 0)
                self.step_details = progress_data.get("steps", {})
                
                return True
                
        except Exception as e:
            self.installer.log(f"Failed to load progress: {e}", "WARNING")
        
        return False
    
    def display_progress(self):
        """Display current progress"""
        if self.total_steps == 0:
            return
        
        completed = sum(1 for step in self.step_details.values() if step["status"] == "completed")
        percentage = (completed / self.total_steps) * 100
        
        # Create progress bar
        bar_length = 40
        filled_length = int(bar_length * completed // self.total_steps)
        bar = "█" * filled_length + "░" * (bar_length - filled_length)
        
        self.installer.log(f"Progress: [{bar}] {percentage:.1f}% ({completed}/{self.total_steps})", "INFO")
    
    def cleanup(self):
        """Clean up progress file after successful installation"""
        try:
            if self.progress_file.exists():
                self.progress_file.unlink()
        except Exception:
            pass


class SafeInstaller:
    """Enhanced installer with safety features, interactive wizard, and privacy controls"""
    
    def __init__(self, args):
        self.args = args
        self.script_dir = Path(__file__).parent
        self.install_log = []
        self.rollback_actions = []
        self.npm_cmd = None
        self.prerequisite_checker = PrerequisiteChecker(verbose=not args.quiet)
        self.config = InstallationConfig()
        self.wizard = InteractiveWizard(self) if not args.quiet and not args.yes else None
        self.hardware_detector = HardwareDetector(self)
        self.backup_manager = BackupManager(self)
        self.privacy_manager = PrivacyManager(self)
        self.progress_tracker = ProgressTracker(self)
        
    def detect_hardware(self):
        """Run comprehensive hardware detection"""
        self.log("Detecting hardware configuration...", "INFO")
        self.hardware_detector.detect_cpu()
        self.hardware_detector.detect_memory()
        self.hardware_detector.detect_gpu()
        self.hardware_detector.detect_storage()
    
    def create_backup(self):
        """Create backup before installation"""
        if self.config.backup_enabled:
            return self.backup_manager.create_pre_install_backup()
        return True
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}"
        self.install_log.append(log_entry)
        
        if not self.args.quiet:
            # Color coding for different levels using colorama for cross-platform support
            colors = {
                "INFO": Style.RESET_ALL,          # Default
                "SUCCESS": Fore.GREEN,            # Green
                "WARNING": Fore.YELLOW,           # Yellow
                "ERROR": Fore.RED,                # Red
                "DEBUG": Fore.BLUE                # Blue
            }
            color = colors.get(level, Style.RESET_ALL)
            print(f"{color}{log_entry}{Style.RESET_ALL}")
    
    def save_install_log(self):
        """Save installation log to file"""
        log_file = self.script_dir / "install_safe.log"
        try:
            with open(log_file, 'w', encoding='utf-8') as f:
                f.write("\n".join(self.install_log))
            self.log(f"Installation log saved to: {log_file}", "SUCCESS")
        except Exception as e:
            self.log(f"Failed to save installation log: {e}", "ERROR")
    
    def add_rollback_action(self, action: str, data: Dict[str, Any]):
        """Add an action to the rollback stack"""
        self.rollback_actions.append({
            "action": action,
            "data": data,
            "timestamp": time.time()
        })
    
    def perform_rollback(self):
        """Perform rollback of installation actions"""
        if not self.rollback_actions:
            return
        
        self.log("Performing rollback of installation actions...", "WARNING")
        
        # Process rollback actions in reverse order
        for action in reversed(self.rollback_actions):
            try:
                action_type = action["action"]
                data = action["data"]
                
                if action_type == "directory_created":
                    path = Path(data["path"])
                    if path.exists():
                        shutil.rmtree(path, ignore_errors=True)
                        self.log(f"Removed directory: {path}", "INFO")
                
                elif action_type == "file_created":
                    path = Path(data["path"])
                    if path.exists():
                        path.unlink()
                        self.log(f"Removed file: {path}", "INFO")
                
                elif action_type == "package_installed":
                    # Note: We don't uninstall packages as they might be used by other apps
                    self.log(f"Package {data['package']} was installed (not removed)", "INFO")
                
            except Exception as e:
                self.log(f"Rollback error: {e}", "ERROR")
    
    def run_prerequisite_checks(self) -> bool:
        """Run all prerequisite checks"""
        self.log("Running prerequisite checks...", "INFO")
        
        all_passed, results = self.prerequisite_checker.run_all_checks()
        
        # Save prerequisite report
        report_file = self.script_dir / "prerequisite_report.txt"
        self.prerequisite_checker.save_report(str(report_file))
        
        if not all_passed:
            self.log("Prerequisite checks failed!", "ERROR")
            
            # Show critical failures
            for failure in self.prerequisite_checker.critical_failures:
                self.log(f"  {failure.name}: {failure.message}", "ERROR")
                if failure.recovery_action:
                    self.log(f"    → {failure.recovery_action}", "WARNING")
            
            if not self.args.force:
                return False
            else:
                self.log("Continuing despite failures (--force flag used)", "WARNING")
        else:
            self.log("All prerequisite checks passed!", "SUCCESS")
        
        # Extract npm command from results
        for result in results:
            if result.name == "Node.js/npm" and result.status in [CheckStatus.PASSED, CheckStatus.WARNING]:
                if result.details and "npm_path" in result.details:
                    self.npm_cmd = result.details["npm_path"]
                    self.log(f"Using npm at: {self.npm_cmd}", "INFO")
        
        return True
    
    def safe_execute_command(self, cmd: list, timeout: int = 300, cwd: Optional[Path] = None) -> Tuple[bool, str]:
        """Execute command with timeout and error handling"""
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=cwd
            )
            
            if result.returncode == 0:
                return True, result.stdout
            else:
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            return False, f"Command timed out after {timeout} seconds"
        except Exception as e:
            return False, str(e)
    
    def install_comfyui_safe(self) -> bool:
        """Install ComfyUI with enhanced error handling"""
        self.log("Installing ComfyUI...", "INFO")
        
        comfyui_dir = self.script_dir / "ComfyUI"
        
        # Check if directory exists and is valid
        if comfyui_dir.exists():
            required_files = ["requirements.txt", "main.py", "server.py"]
            is_valid = all((comfyui_dir / f).exists() for f in required_files)
            
            if is_valid:
                self.log("ComfyUI already installed and valid", "SUCCESS")
                return True
            else:
                self.log("ComfyUI directory exists but is incomplete", "WARNING")
                
                # Backup existing directory
                backup_dir = self.script_dir / f"ComfyUI_backup_{int(time.time())}"
                try:
                    shutil.move(str(comfyui_dir), str(backup_dir))
                    self.log(f"Backed up existing ComfyUI to: {backup_dir}", "INFO")
                    self.add_rollback_action("directory_created", {"path": str(backup_dir)})
                except Exception as e:
                    self.log(f"Failed to backup ComfyUI: {e}", "ERROR")
                    return False
        
        # Try multiple methods to get ComfyUI
        methods = [
            ("Git Clone", self._clone_comfyui_git),
            ("Direct Download", self._download_comfyui_zip),
            ("Manual Copy", self._check_manual_comfyui)
        ]
        
        for method_name, method_func in methods:
            self.log(f"Attempting ComfyUI installation via {method_name}...", "INFO")
            success = method_func()
            if success:
                self.add_rollback_action("directory_created", {"path": str(comfyui_dir)})
                
                # Install requirements
                if self._install_comfyui_requirements():
                    self.log("ComfyUI installation completed successfully!", "SUCCESS")
                    return True
                else:
                    self.log("Failed to install ComfyUI requirements", "ERROR")
                    return False
            else:
                self.log(f"{method_name} failed, trying next method...", "WARNING")
        
        self.log("All ComfyUI installation methods failed", "ERROR")
        return False
    
    def _clone_comfyui_git(self) -> bool:
        """Clone ComfyUI using git"""
        max_retries = 3
        retry_delay = 5
        
        for attempt in range(max_retries):
            self.log(f"Git clone attempt {attempt + 1}/{max_retries}", "DEBUG")
            
            success, output = self.safe_execute_command(
                ["git", "clone", "https://github.com/comfyanonymous/ComfyUI.git"],
                timeout=120,
                cwd=self.script_dir
            )
            
            if success:
                return True
            else:
                self.log(f"Git clone failed: {output}", "WARNING")
                if attempt < max_retries - 1:
                    self.log(f"Retrying in {retry_delay} seconds...", "INFO")
                    time.sleep(retry_delay)
        
        return False
    
    def _download_comfyui_zip(self) -> bool:
        """Download ComfyUI as ZIP file"""
        try:
            import urllib.request
            import zipfile
            
            url = "https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip"
            zip_path = self.script_dir / "ComfyUI_master.zip"
            
            self.log("Downloading ComfyUI ZIP file...", "INFO")
            
            # Download with progress
            def download_progress(block_num, block_size, total_size):
                downloaded = block_num * block_size
                percent = min(100, (downloaded / total_size) * 100)
                self.log(f"Download progress: {percent:.1f}%", "DEBUG")
            
            urllib.request.urlretrieve(url, zip_path, reporthook=download_progress)
            
            # Extract ZIP
            self.log("Extracting ComfyUI...", "INFO")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(self.script_dir)
            
            # Rename extracted directory
            extracted_dir = self.script_dir / "ComfyUI-master"
            if extracted_dir.exists():
                extracted_dir.rename(self.script_dir / "ComfyUI")
            
            # Clean up ZIP file
            zip_path.unlink()
            
            return True
            
        except Exception as e:
            self.log(f"ZIP download failed: {e}", "ERROR")
            return False
    
    def _check_manual_comfyui(self) -> bool:
        """Check if user manually placed ComfyUI"""
        self.log("Checking for manual ComfyUI installation...", "INFO")
        
        manual_path = self.script_dir / "ComfyUI_manual"
        if manual_path.exists():
            try:
                shutil.move(str(manual_path), str(self.script_dir / "ComfyUI"))
                self.log("Found and moved manual ComfyUI installation", "SUCCESS")
                return True
            except Exception as e:
                self.log(f"Failed to move manual ComfyUI: {e}", "ERROR")
        
        return False
    
    def _install_comfyui_requirements(self) -> bool:
        """Install ComfyUI Python requirements"""
        req_file = self.script_dir / "ComfyUI" / "requirements.txt"
        
        if not req_file.exists():
            self.log("ComfyUI requirements.txt not found", "ERROR")
            return False
        
        self.log("Installing ComfyUI Python requirements...", "INFO")
        
        success, output = self.safe_execute_command(
            [sys.executable, "-m", "pip", "install", "-r", str(req_file)],
            timeout=600  # 10 minutes timeout for pip install
        )
        
        if success:
            self.log("ComfyUI requirements installed successfully", "SUCCESS")
            return True
        else:
            self.log(f"Failed to install requirements: {output}", "ERROR")
            return False
    
    def copy_workflows_safe(self) -> bool:
        """Copy workflows with validation"""
        self.log("Copying ComfyUI workflows...", "INFO")
        
        source_dir = self.script_dir / "FreeTierPacked"
        target_dir = self.script_dir / "ComfyUI" / "workflows"
        
        if not source_dir.exists():
            self.log(f"Workflow source directory not found: {source_dir}", "WARNING")
            return True  # Not critical
        
        # Create target directory
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy JSON files
        copied = 0
        for json_file in source_dir.glob("*.json"):
            try:
                shutil.copy2(json_file, target_dir)
                self.log(f"Copied workflow: {json_file.name}", "DEBUG")
                copied += 1
            except Exception as e:
                self.log(f"Failed to copy {json_file.name}: {e}", "WARNING")
        
        self.log(f"Copied {copied} workflow files", "SUCCESS")
        return True
    
    def install_web_gui_safe(self) -> bool:
        """Install Web GUI with enhanced error handling"""
        if not self.npm_cmd:
            self.log("npm not available, skipping Web GUI installation", "WARNING")
            return False
        
        self.log("Installing Web GUI...", "INFO")
        
        web_gui_dir = self.script_dir / "web-gui"
        if not web_gui_dir.exists():
            self.log("Web GUI directory not found", "ERROR")
            return False
        
        # Clean npm cache first (helps with many issues)
        self.log("Cleaning npm cache...", "INFO")
        self.safe_execute_command([self.npm_cmd, "cache", "clean", "--force"])
        
        # Install dependencies
        self.log("Installing npm dependencies (this may take several minutes)...", "INFO")
        
        success, output = self.safe_execute_command(
            [self.npm_cmd, "install", "--no-audit", "--no-fund"],
            timeout=600,  # 10 minutes
            cwd=web_gui_dir
        )
        
        if success:
            self.log("Web GUI dependencies installed successfully", "SUCCESS")
            return True
        else:
            self.log(f"npm install failed: {output}", "ERROR")
            
            # Try alternative install command
            self.log("Trying alternative npm install...", "INFO")
            success, output = self.safe_execute_command(
                [self.npm_cmd, "install", "--legacy-peer-deps"],
                timeout=600,
                cwd=web_gui_dir
            )
            
            if success:
                self.log("Web GUI installed with legacy peer deps", "SUCCESS")
                return True
            
            return False
    
    def download_models_safe(self) -> bool:
        """Download models with size checking"""
        if self.args.no_models:
            self.log("Skipping model downloads (--no-models flag)", "INFO")
            return True
        
        # Check available disk space
        import psutil
        disk = psutil.disk_usage(str(self.script_dir))
        free_gb = disk.free / (1024**3)
        
        if free_gb < 10:  # Need at least 10GB for models
            self.log(f"Insufficient disk space for models: {free_gb:.1f}GB available", "ERROR")
            return False
        
        # Run download script
        download_script = self.script_dir / "download_models.py"
        if not download_script.exists():
            self.log("Model download script not found", "WARNING")
            return True  # Not critical
        
        self.log("Starting model downloads...", "INFO")
        
        # Install download dependencies first
        self.safe_execute_command(
            [sys.executable, "-m", "pip", "install", "requests", "tqdm"],
            timeout=120
        )
        
        # Run download script
        success, output = self.safe_execute_command(
            [sys.executable, str(download_script)],
            timeout=3600  # 1 hour timeout for model downloads
        )
        
        if success:
            self.log("Model downloads completed", "SUCCESS")
            return True
        else:
            self.log("Model downloads failed or cancelled", "WARNING")
            return True  # Not critical
    
    def create_safe_start_script(self):
        """Create an enhanced start script with safety features"""
        start_script = self.script_dir / "start_safe.py"
        
        script_content = '''#!/usr/bin/env python3
"""
DinoAir Safe Start Script
Enhanced version with process management and safety controls
"""

import os
import sys
import subprocess
import time
import psutil
import signal
from pathlib import Path

class SafeStarter:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.processes = []
        self.running = True
        
        # Set up signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        print("\\nShutdown signal received. Stopping services...")
        self.running = False
        self.cleanup()
        sys.exit(0)
    
    def check_port(self, port):
        """Check if a port is available"""
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("", port))
                return True
            except:
                return False
    
    def start_service(self, name, cmd, cwd=None, port=None):
        """Start a service with monitoring"""
        if port and not self.check_port(port):
            print(f"Port {port} is already in use. {name} may already be running.")
            return None
        
        print(f"Starting {name}...")
        try:
            process = subprocess.Popen(
                cmd,
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.processes.append((name, process))
            return process
        except Exception as e:
            print(f"Failed to start {name}: {e}")
            return None
    
    def monitor_resources(self):
        """Monitor system resources"""
        memory = psutil.virtual_memory()
        if memory.percent > 90:
            print("WARNING: High memory usage detected!")
            # Could implement automatic model unloading here
    
    def cleanup(self):
        """Clean up all processes"""
        for name, process in self.processes:
            if process.poll() is None:
                print(f"Stopping {name}...")
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
    
    def run(self):
        """Main run loop"""
        print("DinoAir Safe Start - Enhanced Version")
        print("Press Ctrl+C to stop all services\\n")
        
        # Start ComfyUI
        comfyui_cmd = [sys.executable, "main.py", "--port", "8188"]
        self.start_service(
            "ComfyUI",
            comfyui_cmd,
            cwd=self.script_dir / "ComfyUI",
            port=8188
        )
        
        # Start Ollama
        self.start_service("Ollama", ["ollama", "serve"], port=11434)
        
        # Start Web GUI
        time.sleep(5)  # Give services time to start
        self.start_service(
            "Web GUI",
            ["npm", "run", "dev"],
            cwd=self.script_dir / "web-gui",
            port=3000
        )
        
        print("\\nAll services started. Web GUI available at http://localhost:3000")
        
        # Monitor loop
        while self.running:
            time.sleep(5)
            self.monitor_resources()
            
            # Check if processes are still running
            for name, process in self.processes:
                if process.poll() is not None:
                    print(f"WARNING: {name} has stopped unexpectedly!")

if __name__ == "__main__":
    starter = SafeStarter()
    starter.run()
'''
        
        with open(start_script, 'w') as f:
            f.write(script_content)
        
        # Make executable on Unix
        if platform.system() != "Windows":
            os.chmod(start_script, 0o755)
        
        self.log(f"Created safe start script: {start_script}", "SUCCESS")
    
    def run(self) -> bool:
        """Main installation process with enhanced features"""
        try:
            self.log("=" * 60, "INFO")
            self.log("DinoAir Enhanced Safe Installation", "INFO")
            self.log("=" * 60, "INFO")
            
            # Step 0: Run interactive wizard if enabled
            if self.wizard and not self.args.yes:
                self.config = self.wizard.run()
            
            # Step 1: Check for previous installation attempt
            if self.progress_tracker.load_progress():
                recovery_choice = "n"
                if not self.args.yes:
                    recovery_choice = input("\nPrevious installation attempt detected. Resume? [y/N] ").strip().lower()
                
                if recovery_choice in ['y', 'yes']:
                    self.log("Resuming previous installation...", "INFO")
                else:
                    self.progress_tracker.cleanup()
            
            # Initialize progress tracking
            installation_steps = [
                "Hardware Detection",
                "Prerequisites Check", 
                "Backup Creation",
                "Privacy Configuration",
                "ComfyUI Installation",
                "Workflows Setup",
                "Web GUI Installation",
                "Models Download",
                "Configuration Optimization"
            ]
            self.progress_tracker.initialize(installation_steps)
            
            # Step 2: Hardware detection and optimization
            self.progress_tracker.update_step(0, "running", "Detecting hardware configuration")
            self.detect_hardware()
            if self.config.hardware_optimization:
                recommendations = self.hardware_detector.get_optimization_recommendations()
                self.log(f"Hardware optimization recommendations: {recommendations}", "INFO")
            self.progress_tracker.update_step(0, "completed")
            
            # Step 3: Prerequisites
            self.progress_tracker.update_step(1, "running", "Checking system prerequisites")
            if not self.run_prerequisite_checks():
                if not self.args.force:
                    self.log("Installation aborted due to prerequisite failures", "ERROR")
                    return False
            self.progress_tracker.update_step(1, "completed")
            
            # Step 4: Create backup
            self.progress_tracker.update_step(2, "running", "Creating backup")
            if not self.create_backup():
                self.log("Backup creation failed", "WARNING")
            self.progress_tracker.update_step(2, "completed")
            
            # Step 5: Configure privacy features
            self.progress_tracker.update_step(3, "running", "Configuring privacy settings")
            self.privacy_manager.setup_privacy_features()
            self.progress_tracker.update_step(3, "completed")
            
            # Step 6: User confirmation (if not automated)
            if not self.args.yes and not self.wizard:
                response = input("\nProceed with installation? [Y/n] ").strip().lower()
                if response in ['n', 'no']:
                    self.log("Installation cancelled by user", "INFO")
                    return False
            
            # Step 7-10: Install components
            component_steps = [
                (4, "ComfyUI Installation", self.install_comfyui_safe),
                (5, "Workflows Setup", self.copy_workflows_safe),
                (6, "Web GUI Installation", self.install_web_gui_safe),
                (7, "Models Download", self.download_models_safe),
            ]
            
            for step_index, step_name, step_func in component_steps:
                self.progress_tracker.update_step(step_index, "running", f"Installing {step_name}")
                self.log(f"\nStep: {step_name}", "INFO")
                success = step_func()
                if not success and step_name in ["ComfyUI Installation"]:  # Critical steps
                    self.log(f"Critical step '{step_name}' failed", "ERROR")
                    if not self.args.force:
                        self.perform_rollback()
                        return False
                    self.progress_tracker.update_step(step_index, "failed", f"Failed but continuing with --force")
                else:
                    self.progress_tracker.update_step(step_index, "completed")
            
            # Step 11: Configuration optimization
            self.progress_tracker.update_step(8, "running", "Optimizing configuration")
            self.optimize_configuration()
            self.progress_tracker.update_step(8, "completed")
            
            # Step 12: Create safe start script
            self.create_safe_start_script()
            
            # Step 13: Final cleanup and summary
            self.progress_tracker.cleanup()
            
            # Step 14: Summary
            self.log("\n" + "=" * 60, "INFO")
            self.log("🎉 Installation completed successfully!", "SUCCESS")
            self.log("=" * 60, "INFO")
            
            if self.config.enable_privacy_mode:
                self.log("🔒 Privacy mode enabled - your data stays local", "SUCCESS")
            
            self.log("\nTo start DinoAir safely, run:", "INFO")
            self.log(f"  python {self.script_dir}/start_safe.py", "INFO")
            
            if self.config.backup_enabled:
                self.log(f"\n💾 Backup available at: {self.backup_manager.backup_dir}", "INFO")
            
            return True
            
        except Exception as e:
            self.log(f"Unexpected error: {e}", "ERROR")
            self.log(traceback.format_exc(), "DEBUG")
            self.perform_rollback()
            return False
        
        finally:
            self.save_install_log()
    
    def optimize_configuration(self):
        """Apply hardware-specific optimizations to configuration"""
        try:
            if not self.config.hardware_optimization:
                return
            
            recommendations = self.hardware_detector.get_optimization_recommendations()
            
            # Create optimized configuration
            config_dir = Path("config")
            config_dir.mkdir(exist_ok=True)
            
            optimization_config = {
                "performance": {
                    "batch_size": recommendations.get("batch_size", 1),
                    "memory_limit_mb": recommendations.get("memory_limit", 4096),
                    "cpu_threads": recommendations.get("cpu_threads", 4),
                    "gpu_enabled": recommendations.get("gpu_enabled", False)
                },
                "hardware_detected": self.hardware_detector.hardware_info,
                "optimization_applied": True,
                "timestamp": time.time()
            }
            
            with open(config_dir / "hardware_optimization.json", 'w') as f:
                json.dump(optimization_config, f, indent=2)
            
            self.log("Hardware-specific optimizations applied", "SUCCESS")
            
        except Exception as e:
            self.log(f"Configuration optimization failed: {e}", "WARNING")


def main():
    """Main entry point with enhanced argument parsing"""
    parser = argparse.ArgumentParser(description="DinoAir Enhanced Safe Installer with Privacy Features")
    parser.add_argument("--force", action="store_true",
                       help="Continue installation despite warnings")
    parser.add_argument("--no-models", action="store_true",
                       help="Skip model downloads")
    parser.add_argument("--yes", "-y", action="store_true",
                       help="Skip confirmation prompts and use defaults")
    parser.add_argument("--quiet", "-q", action="store_true",
                       help="Minimize output and skip interactive wizard")
    parser.add_argument("--no-privacy", action="store_true",
                       help="Disable privacy mode (enables telemetry)")
    parser.add_argument("--no-backup", action="store_true",
                       help="Skip backup creation")
    parser.add_argument("--no-optimization", action="store_true",
                       help="Skip hardware optimization")
    parser.add_argument("--install-path", type=str,
                       help="Custom installation path")
    
    args = parser.parse_args()
    
    # Override config with command line arguments
    if args.no_privacy:
        print(f"{Fore.YELLOW}Warning: Privacy mode disabled via command line{Style.RESET_ALL}")
    
    # Check if running as administrator on Windows
    if platform.system() == "Windows":
        import ctypes
        if not ctypes.windll.shell32.IsUserAnAdmin():
            print("WARNING: Not running as administrator. Some operations may fail.")
    
    # Display welcome message
    if not args.quiet:
        print(f"\n{Fore.CYAN}🦕 DinoAir Enhanced Installer{Style.RESET_ALL}")
        print(f"{Fore.CYAN}Privacy-First AI Platform Installation{Style.RESET_ALL}\n")
    
    installer = SafeInstaller(args)
    
    # Apply command line overrides
    if args.no_privacy:
        installer.config.enable_privacy_mode = False
        installer.config.enable_telemetry = True
    if args.no_backup:
        installer.config.backup_enabled = False
    if args.no_optimization:
        installer.config.hardware_optimization = False
    if args.install_path:
        installer.config.installation_path = args.install_path
    
    success = installer.run()
    
    if success:
        print(f"\n{Fore.GREEN}✅ Installation completed successfully!{Style.RESET_ALL}")
        if installer.config.enable_privacy_mode:
            print(f"{Fore.GREEN}🔒 Privacy mode active - your data stays secure{Style.RESET_ALL}")
    else:
        print(f"\n{Fore.RED}❌ Installation failed. Check logs for details.{Style.RESET_ALL}")
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()