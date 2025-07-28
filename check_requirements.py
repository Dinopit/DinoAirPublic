#!/usr/bin/env python3
import sys
import subprocess
import platform
import psutil
import json
import socket
from pathlib import Path

class SystemChecker:
    def __init__(self):
        self.requirements = {
            "python": {"min": "3.11", "max": "3.12"},
            "node": {"min": "18.0.0"},
            "ram": {"min": 8, "recommended": 16},
            "disk": {"min": 10, "recommended": 30},
            "gpu": {"optional": True}
        }
        self.errors = []
        self.warnings = []

    def check_python(self):
        """Check Python version"""
        version = sys.version_info
        current = f"{version.major}.{version.minor}"
        min_version = self.requirements["python"]["min"]
        
        if current < min_version:
            self.errors.append(f"Python {min_version}+ required, found {current}")
        return current

    def check_node(self):
        """Check Node.js version"""
        try:
            result = subprocess.run(['node', '--version'], 
                                  capture_output=True, text=True)
            version = result.stdout.strip().lstrip('v')
            min_version = self.requirements["node"]["min"]
            
            if version < min_version:
                self.errors.append(f"Node.js {min_version}+ required, found {version}")
            return version
        except FileNotFoundError:
            self.errors.append("Node.js not found")
            return None

    def check_memory(self):
        """Check available RAM"""
        ram_gb = psutil.virtual_memory().total / (1024**3)
        min_ram = self.requirements["ram"]["min"]
        rec_ram = self.requirements["ram"]["recommended"]
        
        if ram_gb < min_ram:
            self.errors.append(f"Minimum {min_ram}GB RAM required, found {ram_gb:.1f}GB")
        elif ram_gb < rec_ram:
            self.warnings.append(f"Recommended {rec_ram}GB RAM, found {ram_gb:.1f}GB")
        return ram_gb

    def check_disk_space(self):
        """Check available disk space"""
        disk_gb = psutil.disk_usage('.').free / (1024**3)
        min_disk = self.requirements["disk"]["min"]
        rec_disk = self.requirements["disk"]["recommended"]
        
        if disk_gb < min_disk:
            self.errors.append(f"Minimum {min_disk}GB disk space required, found {disk_gb:.1f}GB")
        elif disk_gb < rec_disk:
            self.warnings.append(f"Recommended {rec_disk}GB disk space, found {disk_gb:.1f}GB")
        return disk_gb

    def check_gpu(self):
        """Check GPU availability"""
        try:
            import torch
            if torch.cuda.is_available():
                return f"CUDA available: {torch.cuda.get_device_name(0)}"
            else:
                self.warnings.append("No CUDA GPU detected - performance will be limited")
                return "No GPU"
        except ImportError:
            return "PyTorch not installed"

    def check_ports(self):
        """Check if required ports are available"""
        ports = [3000, 8188, 11434]
        blocked_ports = []
        
        for port in ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            result = sock.connect_ex(('localhost', port))
            if result == 0:
                blocked_ports.append(port)
            sock.close()
        
        if blocked_ports:
            self.warnings.append(f"Ports already in use: {blocked_ports}")
        return blocked_ports

    def generate_report(self):
        """Generate system check report"""
        print("=== DinoAir System Requirements Check ===\n")
        
        results = {
            "Python": self.check_python(),
            "Node.js": self.check_node(),
            "RAM": f"{self.check_memory():.1f} GB",
            "Disk Space": f"{self.check_disk_space():.1f} GB",
            "GPU": self.check_gpu(),
            "Port Conflicts": self.check_ports()
        }
        
        # Display results
        for key, value in results.items():
            print(f"{key}: {value}")
        
        # Display errors and warnings
        if self.errors:
            print("\n❌ ERRORS (must fix):")
            for error in self.errors:
                print(f"  - {error}")
        
        if self.warnings:
            print("\n⚠️  WARNINGS (recommended to fix):")
            for warning in self.warnings:
                print(f"  - {warning}")
        
        # Save report
        report_path = Path("system_check_report.json")
        with open(report_path, 'w') as f:
            json.dump({
                "results": results,
                "errors": self.errors,
                "warnings": self.warnings,
                "can_proceed": len(self.errors) == 0
            }, f, indent=2)
        
        return len(self.errors) == 0

if __name__ == "__main__":
    checker = SystemChecker()
    can_proceed = checker.generate_report()
    
    if can_proceed:
        print("\n✅ System meets requirements! You can proceed with installation.")
        sys.exit(0)
    else:
        print("\n❌ System does not meet requirements. Please fix errors before proceeding.")
        sys.exit(1)