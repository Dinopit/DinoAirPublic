"""
DinoAir Installation Prerequisite Checker
Validates system requirements and dependencies before installation
"""

import os
import sys
import platform
import subprocess
import shutil
import psutil
import json
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum


class CheckStatus(Enum):
    """Status of prerequisite checks"""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    SKIPPED = "skipped"


@dataclass
class CheckResult:
    """Result of a prerequisite check"""
    name: str
    status: CheckStatus
    message: str
    details: Optional[Dict] = None
    recovery_action: Optional[str] = None


class PrerequisiteChecker:
    """Comprehensive prerequisite checker for DinoAir installation"""
    
    # Minimum requirements
    MIN_PYTHON_VERSION = (3, 10)
    MIN_NODE_VERSION = (16, 0, 0)
    MIN_NPM_VERSION = (7, 0, 0)
    MIN_GIT_VERSION = (2, 0, 0)
    
    # Resource requirements
    MIN_DISK_SPACE_GB = 20  # Minimum free disk space
    MIN_MEMORY_GB = 8       # Minimum RAM
    RECOMMENDED_MEMORY_GB = 16
    
    # Required Python packages for basic operation
    REQUIRED_PACKAGES = ["pip", "setuptools", "wheel"]
    
    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self.results: List[CheckResult] = []
        self.critical_failures: List[CheckResult] = []
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with level"""
        if self.verbose:
            print(f"[{level}] {message}")
    
    def run_all_checks(self) -> Tuple[bool, List[CheckResult]]:
        """Run all prerequisite checks"""
        self.log("Starting comprehensive prerequisite checks...")
        
        # System checks
        self.check_operating_system()
        self.check_system_resources()
        
        # Python environment
        self.check_python_version()
        self.check_python_packages()
        
        # External dependencies
        self.check_nodejs_npm()
        self.check_git()
        self.check_ollama()
        
        # Network and permissions
        self.check_network_connectivity()
        self.check_file_permissions()
        
        # Analyze results
        all_passed = all(
            r.status in [CheckStatus.PASSED, CheckStatus.WARNING] 
            for r in self.results
        )
        
        return all_passed, self.results
    
    def check_operating_system(self) -> CheckResult:
        """Check operating system compatibility"""
        try:
            os_name = platform.system()
            os_version = platform.version()
            architecture = platform.machine()
            
            supported_os = ["Windows", "Linux", "Darwin"]
            
            if os_name in supported_os:
                result = CheckResult(
                    name="Operating System",
                    status=CheckStatus.PASSED,
                    message=f"{os_name} {os_version} ({architecture})",
                    details={
                        "os": os_name,
                        "version": os_version,
                        "arch": architecture
                    }
                )
            else:
                result = CheckResult(
                    name="Operating System",
                    status=CheckStatus.WARNING,
                    message=f"Untested OS: {os_name}",
                    recovery_action="Proceed with caution"
                )
            
        except Exception as e:
            result = CheckResult(
                name="Operating System",
                status=CheckStatus.FAILED,
                message=f"Failed to detect OS: {str(e)}",
                recovery_action="Check system configuration"
            )
        
        self.results.append(result)
        return result
    
    def check_system_resources(self) -> CheckResult:
        """Check available system resources"""
        try:
            # Get memory info
            memory = psutil.virtual_memory()
            total_memory_gb = memory.total / (1024**3)
            available_memory_gb = memory.available / (1024**3)
            
            # Get disk space for current directory
            disk = psutil.disk_usage(os.getcwd())
            free_disk_gb = disk.free / (1024**3)
            
            # Check CPU
            cpu_count = psutil.cpu_count()
            
            details = {
                "total_memory_gb": round(total_memory_gb, 2),
                "available_memory_gb": round(available_memory_gb, 2),
                "free_disk_gb": round(free_disk_gb, 2),
                "cpu_cores": cpu_count
            }
            
            # Determine status
            issues = []
            if total_memory_gb < self.MIN_MEMORY_GB:
                issues.append(f"Insufficient RAM: {total_memory_gb:.1f}GB < {self.MIN_MEMORY_GB}GB required")
            elif total_memory_gb < self.RECOMMENDED_MEMORY_GB:
                issues.append(f"Low RAM: {total_memory_gb:.1f}GB < {self.RECOMMENDED_MEMORY_GB}GB recommended")
            
            if free_disk_gb < self.MIN_DISK_SPACE_GB:
                issues.append(f"Insufficient disk space: {free_disk_gb:.1f}GB < {self.MIN_DISK_SPACE_GB}GB required")
            
            if issues:
                status = CheckStatus.FAILED if "Insufficient" in str(issues) else CheckStatus.WARNING
                message = "; ".join(issues)
                recovery = "Free up disk space or add more RAM" if status == CheckStatus.FAILED else "Performance may be limited"
            else:
                status = CheckStatus.PASSED
                message = f"Memory: {total_memory_gb:.1f}GB, Disk: {free_disk_gb:.1f}GB free, CPU: {cpu_count} cores"
                recovery = None
            
            result = CheckResult(
                name="System Resources",
                status=status,
                message=message,
                details=details,
                recovery_action=recovery
            )
            
        except Exception as e:
            result = CheckResult(
                name="System Resources",
                status=CheckStatus.WARNING,
                message=f"Could not fully check resources: {str(e)}",
                recovery_action="Install psutil: pip install psutil"
            )
        
        self.results.append(result)
        if result.status == CheckStatus.FAILED:
            self.critical_failures.append(result)
        return result
    
    def check_python_version(self) -> CheckResult:
        """Check Python version"""
        current_version = sys.version_info[:3]
        min_version_str = f"{self.MIN_PYTHON_VERSION[0]}.{self.MIN_PYTHON_VERSION[1]}"
        current_version_str = f"{current_version[0]}.{current_version[1]}.{current_version[2]}"
        
        if current_version >= self.MIN_PYTHON_VERSION:
            result = CheckResult(
                name="Python Version",
                status=CheckStatus.PASSED,
                message=f"Python {current_version_str}",
                details={"version": current_version_str}
            )
        else:
            result = CheckResult(
                name="Python Version",
                status=CheckStatus.FAILED,
                message=f"Python {current_version_str} < {min_version_str} required",
                recovery_action=f"Install Python {min_version_str} or higher from python.org"
            )
            self.critical_failures.append(result)
        
        self.results.append(result)
        return result
    
    def check_python_packages(self) -> CheckResult:
        """Check required Python packages"""
        missing_packages = []
        package_versions = {}
        
        for package in self.REQUIRED_PACKAGES:
            try:
                mod = __import__(package)
                if hasattr(mod, '__version__'):
                    package_versions[package] = mod.__version__
                else:
                    package_versions[package] = "installed"
            except ImportError:
                missing_packages.append(package)
        
        if missing_packages:
            result = CheckResult(
                name="Python Packages",
                status=CheckStatus.FAILED,
                message=f"Missing packages: {', '.join(missing_packages)}",
                details={"missing": missing_packages, "installed": package_versions},
                recovery_action=f"Run: pip install {' '.join(missing_packages)}"
            )
            self.critical_failures.append(result)
        else:
            result = CheckResult(
                name="Python Packages",
                status=CheckStatus.PASSED,
                message="All required packages installed",
                details={"packages": package_versions}
            )
        
        self.results.append(result)
        return result
    
    def _check_node_availability_and_version(self):
        """Check if Node.js is available and get its version information."""
        node_paths = self._find_executable("node")
        if not node_paths:
            return None, CheckResult(
                name="Node.js/npm",
                status=CheckStatus.FAILED,
                message="Node.js not found",
                recovery_action="Install Node.js from https://nodejs.org/"
            )
        
        # Check Node.js version
        node_version = self._get_version(node_paths[0], "--version")
        if not node_version:
            return None, CheckResult(
                name="Node.js/npm",
                status=CheckStatus.FAILED,
                message="Could not determine Node.js version",
                recovery_action="Verify Node.js installation"
            )
        
        return (node_paths[0], node_version), None
    
    def _evaluate_node_version(self, node_version: str):
        """Evaluate Node.js version against minimum requirements."""
        version_parts = self._parse_version(node_version.strip('v'))
        if version_parts and version_parts >= self.MIN_NODE_VERSION:
            return CheckStatus.PASSED, f"Node.js {node_version}"
        else:
            min_version_str = '.'.join(map(str, self.MIN_NODE_VERSION))
            return CheckStatus.WARNING, f"Node.js {node_version} (minimum recommended: {min_version_str})"
    
    def _check_npm_availability_and_version(self, node_msg: str):
        """Check if npm is available and get its version information."""
        npm_paths = self._find_npm()
        if not npm_paths:
            return None, CheckResult(
                name="Node.js/npm",
                status=CheckStatus.FAILED,
                message=f"{node_msg}, but npm not found",
                recovery_action="Reinstall Node.js or fix npm installation"
            )
        
        npm_version = self._get_version(npm_paths[0], "--version")
        return (npm_paths[0], npm_version), None
    
    def _create_nodejs_result(self, node_info, npm_info, node_status, node_msg):
        """Create the final CheckResult for Node.js/npm check."""
        node_path, node_version = node_info
        npm_path, npm_version = npm_info
        
        if npm_version:
            return CheckResult(
                name="Node.js/npm",
                status=node_status,
                message=f"{node_msg}, npm {npm_version}",
                details={
                    "node_path": node_path,
                    "node_version": node_version,
                    "npm_path": npm_path,
                    "npm_version": npm_version
                }
            )
        else:
            return CheckResult(
                name="Node.js/npm",
                status=CheckStatus.WARNING,
                message=f"{node_msg}, npm found but version unknown",
                details={"node_path": node_path, "npm_path": npm_path}
            )

    def check_nodejs_npm(self) -> CheckResult:
        """Enhanced Node.js and npm detection"""
        try:
            # Check Node.js availability and version
            node_info, error_result = self._check_node_availability_and_version()
            if error_result:
                self.results.append(error_result)
                return error_result
            
            # Evaluate Node.js version
            node_path, node_version = node_info
            node_status, node_msg = self._evaluate_node_version(node_version)
            
            # Check npm availability and version
            npm_info, error_result = self._check_npm_availability_and_version(node_msg)
            if error_result:
                self.results.append(error_result)
                return error_result
            
            # Create final result
            result = self._create_nodejs_result(node_info, npm_info, node_status, node_msg)
            
        except Exception as e:
            result = CheckResult(
                name="Node.js/npm",
                status=CheckStatus.FAILED,
                message=f"Error checking Node.js/npm: {str(e)}",
                recovery_action="Check Node.js installation"
            )
        
        self.results.append(result)
        return result
    
    def check_git(self) -> CheckResult:
        """Check Git installation"""
        try:
            git_paths = self._find_executable("git")
            if not git_paths:
                result = CheckResult(
                    name="Git",
                    status=CheckStatus.FAILED,
                    message="Git not found",
                    recovery_action="Install Git from https://git-scm.com/"
                )
            else:
                version = self._get_version(git_paths[0], "--version")
                if version:
                    # Extract version number from "git version X.Y.Z"
                    version_match = version.split()[-1]
                    result = CheckResult(
                        name="Git",
                        status=CheckStatus.PASSED,
                        message=f"Git {version_match}",
                        details={"path": git_paths[0], "version": version_match}
                    )
                else:
                    result = CheckResult(
                        name="Git",
                        status=CheckStatus.WARNING,
                        message="Git found but version unknown",
                        details={"path": git_paths[0]}
                    )
            
        except Exception as e:
            result = CheckResult(
                name="Git",
                status=CheckStatus.FAILED,
                message=f"Error checking Git: {str(e)}",
                recovery_action="Install Git"
            )
        
        self.results.append(result)
        if result.status == CheckStatus.FAILED:
            self.critical_failures.append(result)
        return result
    
    def check_ollama(self) -> CheckResult:
        """Check Ollama installation"""
        try:
            ollama_paths = self._find_executable("ollama")
            if not ollama_paths:
                result = CheckResult(
                    name="Ollama",
                    status=CheckStatus.WARNING,
                    message="Ollama not found",
                    recovery_action="Install from https://ollama.ai/ for chat functionality"
                )
            else:
                version = self._get_version(ollama_paths[0], "--version")
                if version:
                    result = CheckResult(
                        name="Ollama",
                        status=CheckStatus.PASSED,
                        message=f"Ollama {version}",
                        details={"path": ollama_paths[0], "version": version}
                    )
                else:
                    result = CheckResult(
                        name="Ollama",
                        status=CheckStatus.PASSED,
                        message="Ollama found",
                        details={"path": ollama_paths[0]}
                    )
            
        except Exception as e:
            result = CheckResult(
                name="Ollama",
                status=CheckStatus.WARNING,
                message=f"Could not check Ollama: {str(e)}",
                recovery_action="Install Ollama if chat features are needed"
            )
        
        self.results.append(result)
        return result
    
    def check_network_connectivity(self) -> CheckResult:
        """Check network connectivity to required services"""
        try:
            import urllib.request
            import ssl
            
            # Create unverified context for testing
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            test_urls = [
                ("GitHub", "https://github.com"),
                ("npm Registry", "https://registry.npmjs.org"),
                ("Python Package Index", "https://pypi.org")
            ]
            
            failed_connections = []
            for name, url in test_urls:
                try:
                    req = urllib.request.Request(url, headers={'User-Agent': 'DinoAir-Installer'})
                    urllib.request.urlopen(req, timeout=5, context=ctx)
                except Exception:
                    failed_connections.append(name)
            
            if failed_connections:
                result = CheckResult(
                    name="Network Connectivity",
                    status=CheckStatus.WARNING,
                    message=f"Could not reach: {', '.join(failed_connections)}",
                    recovery_action="Check internet connection and firewall settings"
                )
            else:
                result = CheckResult(
                    name="Network Connectivity",
                    status=CheckStatus.PASSED,
                    message="All required services reachable"
                )
            
        except Exception as e:
            result = CheckResult(
                name="Network Connectivity",
                status=CheckStatus.WARNING,
                message=f"Could not test connectivity: {str(e)}",
                recovery_action="Ensure internet connection is available"
            )
        
        self.results.append(result)
        return result
    
    def check_file_permissions(self) -> CheckResult:
        """Check file system permissions"""
        try:
            test_file = os.path.join(os.getcwd(), ".dinoair_test_permissions")
            
            # Test write permissions
            with open(test_file, 'w') as f:
                f.write("test")
            
            # Test read permissions
            with open(test_file, 'r') as f:
                content = f.read()
            
            # Clean up
            os.remove(test_file)
            
            result = CheckResult(
                name="File Permissions",
                status=CheckStatus.PASSED,
                message="Read/write permissions verified"
            )
            
        except Exception as e:
            result = CheckResult(
                name="File Permissions",
                status=CheckStatus.FAILED,
                message=f"Insufficient permissions: {str(e)}",
                recovery_action="Run installer with appropriate permissions"
            )
            self.critical_failures.append(result)
        
        self.results.append(result)
        return result
    
    def _get_windows_search_paths(self):
        """Get Windows-specific search paths for executables."""
        return [
            os.environ.get("ProgramFiles", ""),
            os.environ.get("ProgramFiles(x86)", ""),
            os.environ.get("LOCALAPPDATA", ""),
            os.environ.get("APPDATA", ""),
            "C:\\Program Files",
            "C:\\Program Files (x86)"
        ]
    
    def _search_windows_paths(self, name: str, paths: List[str]):
        """Search for executable in Windows-specific paths."""
        found_paths = []
        extensions = [".exe", ".cmd", ".bat"]
        
        for ext in extensions:
            exe_name = name if name.endswith(ext) else name + ext
            for search_path in paths:
                if search_path:
                    possible_path = os.path.join(search_path, exe_name)
                    if os.path.exists(possible_path) and possible_path not in found_paths:
                        found_paths.append(possible_path)
        
        return found_paths

    def _find_executable(self, name: str) -> List[str]:
        """Find all paths to an executable"""
        paths = []
        
        # Check PATH first
        path_exe = shutil.which(name)
        if path_exe:
            paths.append(path_exe)
        
        # Platform-specific searches
        if platform.system() == "Windows":
            search_paths = self._get_windows_search_paths()
            windows_paths = self._search_windows_paths(name, search_paths)
            paths.extend(windows_paths)
        
        return paths
    
    def _get_npm_specific_paths(self):
        """Get npm-specific installation paths based on platform."""
        if platform.system() == "Windows":
            return [
                os.path.join(os.environ.get("APPDATA", ""), "npm", "npm.cmd"),
                os.path.join(os.environ.get("ProgramFiles", ""), "nodejs", "npm.cmd"),
                os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "nodejs", "npm.cmd")
            ]
        else:
            return [
                "/usr/local/lib/node_modules/npm/bin/npm-cli.js",
                os.path.expanduser("~/.npm-global/bin/npm"),
                "/opt/nodejs/bin/npm"
            ]

    def _find_npm(self) -> List[str]:
        """Special handling for finding npm"""
        npm_paths = self._find_executable("npm")
        
        # Additional npm-specific locations
        additional_paths = self._get_npm_specific_paths()
        
        for path in additional_paths:
            if os.path.exists(path) and path not in npm_paths:
                npm_paths.append(path)
        
        return npm_paths
    
    def _get_version(self, executable: str, version_flag: str) -> Optional[str]:
        """Get version output from an executable"""
        try:
            result = subprocess.run(
                [executable, version_flag],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        return None
    
    def _parse_version(self, version_str: str) -> Optional[Tuple[int, ...]]:
        """Parse version string into tuple of integers"""
        try:
            # Remove any prefix like 'v' and split by dots
            version_str = version_str.lstrip('v')
            # Split by dots and handle version suffixes like '-beta.1'
            parts = version_str.split('.', 2)  # Get at most 3 parts
            version_parts = []
            
            for i, part in enumerate(parts):
                # For the last part, remove any suffix after dash or plus
                if i == len(parts) - 1:
                    part = part.split('-')[0].split('+')[0]
                version_parts.append(int(part))
            
            # Ensure we have at least 3 parts (pad with zeros if needed)
            while len(version_parts) < 3:
                version_parts.append(0)
            
            return tuple(version_parts[:3])  # Return only major, minor, patch
        except Exception:
            return None
    
    def generate_report(self) -> str:
        """Generate a detailed report of all checks"""
        report = ["DinoAir Installation Prerequisite Check Report"]
        report.append("=" * 60)
        from datetime import datetime
        report.append(f"Timestamp: {datetime.now().isoformat()}")
        report.append(f"Platform: {platform.platform()}")
        report.append("")
        
        # Summary
        passed = sum(1 for r in self.results if r.status == CheckStatus.PASSED)
        warnings = sum(1 for r in self.results if r.status == CheckStatus.WARNING)
        failed = sum(1 for r in self.results if r.status == CheckStatus.FAILED)
        
        report.append("SUMMARY")
        report.append("-" * 20)
        report.append(f"Total Checks: {len(self.results)}")
        report.append(f"Passed: {passed}")
        report.append(f"Warnings: {warnings}")
        report.append(f"Failed: {failed}")
        report.append("")
        
        # Detailed results
        report.append("DETAILED RESULTS")
        report.append("-" * 20)
        
        for result in self.results:
            status_symbol = {
                CheckStatus.PASSED: "✓",
                CheckStatus.WARNING: "⚠",
                CheckStatus.FAILED: "✗",
                CheckStatus.SKIPPED: "○"
            }.get(result.status, "?")
            
            report.append(f"\n{status_symbol} {result.name}")
            report.append(f"  Status: {result.status.value}")
            report.append(f"  Message: {result.message}")
            
            if result.details:
                report.append(f"  Details: {json.dumps(result.details, indent=4)}")
            
            if result.recovery_action:
                report.append(f"  Recovery: {result.recovery_action}")
        
        # Critical failures
        if self.critical_failures:
            report.append("\n\nCRITICAL FAILURES REQUIRING ATTENTION")
            report.append("-" * 40)
            for failure in self.critical_failures:
                report.append(f"\n- {failure.name}: {failure.message}")
                if failure.recovery_action:
                    report.append(f"  Action: {failure.recovery_action}")
        
        return "\n".join(report)
    
    def save_report(self, filepath: str = "prerequisite_check_report.txt"):
        """Save the report to a file"""
        report = self.generate_report()
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report)
        self.log(f"Report saved to: {filepath}")


def main():
    """Run prerequisite checks standalone"""
    checker = PrerequisiteChecker(verbose=True)
    all_passed, results = checker.run_all_checks()
    
    print("\n" + "=" * 60)
    print("PREREQUISITE CHECK COMPLETE")
    print("=" * 60)
    
    if all_passed:
        print("✓ All checks passed! System is ready for DinoAir installation.")
    else:
        print("✗ Some checks failed. Please address the issues before installing.")
        print("\nCritical failures:")
        for failure in checker.critical_failures:
            print(f"  - {failure.name}: {failure.recovery_action or failure.message}")
    
    # Save report
    checker.save_report()
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())