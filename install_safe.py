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
from typing import Optional, Tuple, Dict, Any
from pathlib import Path

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


class SafeInstaller:
    """Enhanced installer with safety features"""
    
    def __init__(self, args):
        self.args = args
        self.script_dir = Path(__file__).parent
        self.install_log = []
        self.rollback_actions = []
        self.npm_cmd = None
        self.prerequisite_checker = PrerequisiteChecker(verbose=not args.quiet)
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}"
        self.install_log.append(log_entry)
        
        if not self.args.quiet:
            # Color coding for different levels
            colors = {
                "INFO": "\033[0m",     # Default
                "SUCCESS": "\033[92m",  # Green
                "WARNING": "\033[93m",  # Yellow
                "ERROR": "\033[91m",    # Red
                "DEBUG": "\033[94m"     # Blue
            }
            color = colors.get(level, "\033[0m")
            print(f"{color}{log_entry}\033[0m")
    
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
        """Main installation process"""
        try:
            self.log("=" * 60, "INFO")
            self.log("DinoAir Safe Installation", "INFO")
            self.log("=" * 60, "INFO")
            
            # Step 1: Prerequisites
            if not self.run_prerequisite_checks():
                if not self.args.force:
                    self.log("Installation aborted due to prerequisite failures", "ERROR")
                    return False
            
            # Step 2: User confirmation
            if not self.args.yes:
                response = input("\nProceed with installation? [Y/n] ").strip().lower()
                if response in ['n', 'no']:
                    self.log("Installation cancelled by user", "INFO")
                    return False
            
            # Step 3: Install components
            steps = [
                ("ComfyUI", self.install_comfyui_safe),
                ("Workflows", self.copy_workflows_safe),
                ("Web GUI", self.install_web_gui_safe),
                ("Models", self.download_models_safe),
            ]
            
            for step_name, step_func in steps:
                self.log(f"\nStep: {step_name}", "INFO")
                success = step_func()
                if not success and step_name in ["ComfyUI"]:  # Critical steps
                    self.log(f"Critical step '{step_name}' failed", "ERROR")
                    if not self.args.force:
                        self.perform_rollback()
                        return False
            
            # Step 4: Create safe start script
            self.create_safe_start_script()
            
            # Step 5: Summary
            self.log("\n" + "=" * 60, "INFO")
            self.log("Installation completed!", "SUCCESS")
            self.log("=" * 60, "INFO")
            self.log("\nTo start DinoAir safely, run:", "INFO")
            self.log(f"  python {self.script_dir}/start_safe.py", "INFO")
            
            return True
            
        except Exception as e:
            self.log(f"Unexpected error: {e}", "ERROR")
            self.log(traceback.format_exc(), "DEBUG")
            self.perform_rollback()
            return False
        
        finally:
            self.save_install_log()


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="DinoAir Safe Installer")
    parser.add_argument("--force", action="store_true",
                       help="Continue installation despite warnings")
    parser.add_argument("--no-models", action="store_true",
                       help="Skip model downloads")
    parser.add_argument("--yes", "-y", action="store_true",
                       help="Skip confirmation prompts")
    parser.add_argument("--quiet", "-q", action="store_true",
                       help="Minimize output")
    
    args = parser.parse_args()
    
    # Check if running as administrator on Windows
    if platform.system() == "Windows":
        import ctypes
        if not ctypes.windll.shell32.IsUserAnAdmin():
            print("WARNING: Not running as administrator. Some operations may fail.")
    
    installer = SafeInstaller(args)
    success = installer.run()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()