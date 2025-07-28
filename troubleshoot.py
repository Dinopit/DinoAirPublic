#!/usr/bin/env python3
import sys
import subprocess
import psutil
import json
import socket
from pathlib import Path
import requests
import logging

class DinoAirTroubleshooter:
    """Automated troubleshooting for common DinoAir issues"""
    
    def __init__(self):
        self.issues = []
        self.fixes_applied = []
        self.logger = logging.getLogger(__name__)
        
    def check_python_environment(self):
        """Check Python environment issues"""
        print("🔍 Checking Python environment...")
        
        # Check Python version
        if sys.version_info < (3, 11):
            self.issues.append({
                "issue": "Python version too old",
                "severity": "critical",
                "fix": "Install Python 3.11 or higher"
            })
        
        # Check virtual environment
        if not hasattr(sys, 'real_prefix') and sys.base_prefix == sys.prefix:
            self.issues.append({
                "issue": "Not running in virtual environment",
                "severity": "warning",
                "fix": "Activate the virtual environment: source venv/bin/activate"
            })
        
        # Check pip
        try:
            subprocess.run(["pip", "--version"], capture_output=True, check=True)
        except:
            self.issues.append({
                "issue": "pip not found",
                "severity": "critical",
                "fix": "Install pip: python -m ensurepip"
            })
    
    def check_node_environment(self):
        """Check Node.js environment issues"""
        print("🔍 Checking Node.js environment...")
        
        try:
            result = subprocess.run(
                ["node", "--version"],
                capture_output=True,
                text=True,
                check=True
            )
            version = result.stdout.strip()
            major_version = int(version.split('.')[0].lstrip('v'))
            
            if major_version < 18:
                self.issues.append({
                    "issue": f"Node.js version too old: {version}",
                    "severity": "critical",
                    "fix": "Install Node.js 18 or higher"
                })
        except:
            self.issues.append({
                "issue": "Node.js not found",
                "severity": "critical",
                "fix": "Install Node.js from https://nodejs.org"
            })
    
    def check_port_conflicts(self):
        """Check for port conflicts"""
        print("🔍 Checking port availability...")
        
        ports = {
            3000: "Web GUI",
            8188: "ComfyUI",
            11434: "Ollama"
        }
        
        for port, service in ports.items():
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('localhost', port))
            sock.close()
            
            if result == 0:
                # Port is in use - check if it's our service
                try:
                    if port == 3000:
                        response = requests.get(f"http://localhost:{port}/api/health", timeout=2)
                        if response.status_code != 200:
                            self.issues.append({
                                "issue": f"Port {port} in use by another application",
                                "severity": "error",
                                "fix": f"Stop the application using port {port} or change {service} port"
                            })
                    else:
                        # For ComfyUI and Ollama, assume they're running correctly if port is open
                        pass
                except:
                    self.issues.append({
                        "issue": f"Port {port} in use by unknown application",
                        "severity": "warning",
                        "fix": f"Check what's using port {port}: lsof -i :{port}"
                    })
    
    def check_dependencies(self):
        """Check missing dependencies"""
        print("🔍 Checking dependencies...")
        
        # Check critical Python modules
        critical_modules = [
            "psutil", "requests", "pathlib", "json", "logging"
        ]
        
        for module in critical_modules:
            try:
                __import__(module)
            except ImportError:
                self.issues.append({
                    "issue": f"Missing Python module: {module}",
                    "severity": "critical",
                    "fix": f"Install module: pip install {module}"
                })
        
        # Check node_modules
        node_dirs = ["web-gui", "web-gui-node"]
        for dir_name in node_dirs:
            node_modules = Path(dir_name) / "node_modules"
            if Path(dir_name).exists() and not node_modules.exists():
                self.issues.append({
                    "issue": f"Missing node_modules in {dir_name}",
                    "severity": "error",
                    "fix": f"Run: cd {dir_name} && npm install"
                })
    
    def check_configuration(self):
        """Check configuration issues"""
        print("🔍 Checking configuration...")
        
        # Check .env file
        if not Path(".env").exists():
            self.issues.append({
                "issue": "Missing .env file",
                "severity": "error",
                "fix": "Run the enhanced installation script or copy .env.example to .env"
            })
        
        # Check config files
        config_files = ["config/services.json"]
        for config_file in config_files:
            if not Path(config_file).exists():
                self.issues.append({
                    "issue": f"Missing {config_file}",
                    "severity": "error",
                    "fix": "Run the enhanced installation script to generate config files"
                })
    
    def check_permissions(self):
        """Check file permissions"""
        print("🔍 Checking permissions...")
        
        # Check write permissions
        dirs_need_write = ["logs", "data", "models"]
        for dir_name in dirs_need_write:
            dir_path = Path(dir_name)
            if dir_path.exists():
                try:
                    test_file = dir_path / ".test_write"
                    test_file.touch()
                    test_file.unlink()
                except:
                    self.issues.append({
                        "issue": f"No write permission for {dir_name}",
                        "severity": "error",
                        "fix": f"Run: chmod 755 {dir_name}"
                    })
            else:
                self.issues.append({
                    "issue": f"Directory {dir_name} does not exist",
                    "severity": "warning",
                    "fix": f"Create directory: mkdir -p {dir_name}"
                })
    
    def check_gpu(self):
        """Check GPU availability"""
        print("🔍 Checking GPU...")
        
        try:
            import torch
            if not torch.cuda.is_available():
                self.issues.append({
                    "issue": "CUDA not available",
                    "severity": "warning",
                    "fix": "Install CUDA drivers or use CPU mode"
                })
        except ImportError:
            self.issues.append({
                "issue": "PyTorch not installed",
                "severity": "warning",
                "fix": "Run: pip install torch torchvision torchaudio"
            })
    
    def auto_fix(self):
        """Attempt to auto-fix issues"""
        print("\n🔧 Attempting auto-fixes...")
        
        for issue in self.issues:
            if "Missing directory" in issue["issue"] and "mkdir" in issue["fix"]:
                try:
                    dir_name = issue.get("directory")  # Use the explicit directory field
                    if dir_name:
                        Path(dir_name).mkdir(parents=True, exist_ok=True)
                        self.fixes_applied.append(f"Created directory: {dir_name}")
                except:
                    pass
    
    def generate_report(self):
        """Generate troubleshooting report"""
        print("\n=== DinoAir Troubleshooting Report ===\n")
        
        if not self.issues:
            print("✅ No issues found! DinoAir appears to be properly configured.")
        else:
            # Group by severity
            critical = [i for i in self.issues if i["severity"] == "critical"]
            errors = [i for i in self.issues if i["severity"] == "error"]
            warnings = [i for i in self.issues if i["severity"] == "warning"]
            
            if critical:
                print("❌ CRITICAL ISSUES (must fix):")
                for issue in critical:
                    print(f"  - {issue['issue']}")
                    print(f"    Fix: {issue['fix']}")
            
            if errors:
                print("\n⚠️  ERRORS (should fix):")
                for issue in errors:
                    print(f"  - {issue['issue']}")
                    print(f"    Fix: {issue['fix']}")
            
            if warnings:
                print("\n⚡ WARNINGS (optional):")
                for issue in warnings:
                    print(f"  - {issue['issue']}")
                    print(f"    Fix: {issue['fix']}")
        
        if self.fixes_applied:
            print("\n✅ Auto-fixes applied:")
            for fix in self.fixes_applied:
                print(f"  - {fix}")
        
        # Save report
        report = {
            "issues": self.issues,
            "fixes_applied": self.fixes_applied,
            "total_issues": len(self.issues),
            "critical_count": len([i for i in self.issues if i["severity"] == "critical"])
        }
        
        with open("troubleshooting_report.json", 'w') as f:
            json.dump(report, f, indent=2)
        
        print("\nDetailed report saved to: troubleshooting_report.json")
    
    def run(self):
        """Run all checks"""
        print("🚀 Starting DinoAir troubleshooting...\n")
        
        self.check_python_environment()
        self.check_node_environment()
        self.check_port_conflicts()
        self.check_dependencies()
        self.check_configuration()
        self.check_permissions()
        self.check_gpu()
        
        self.auto_fix()
        self.generate_report()

if __name__ == "__main__":
    troubleshooter = DinoAirTroubleshooter()
    troubleshooter.run()