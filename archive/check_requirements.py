#!/usr/bin/env python3
"""
Enhanced DinoAir System Requirements Checker
Comprehensive system validation with detailed compatibility reports
"""

import sys
import subprocess
import platform
import psutil
import json
import socket
import time
import os
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict

# Try to import additional hardware detection libraries
try:
    import GPUtil
    GPU_UTIL_AVAILABLE = True
except ImportError:
    GPU_UTIL_AVAILABLE = False

try:
    import cpuinfo
    CPU_INFO_AVAILABLE = True
except ImportError:
    CPU_INFO_AVAILABLE = False


@dataclass
class RequirementResult:
    """Structured result for a single requirement check"""
    name: str
    status: str  # "pass", "warning", "fail"
    value: Any
    expected: str
    message: str
    details: Dict[str, Any] = None


@dataclass  
class SystemReport:
    """Comprehensive system report"""
    system_info: Dict[str, Any]
    requirements: List[RequirementResult]
    compatibility_score: float
    can_proceed: bool
    recommendations: List[str]
    timestamp: float


class EnhancedSystemChecker:
    """Enhanced system checker with comprehensive validation"""
    
    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self.requirements = {
            "python": {"min": "3.11", "max": "3.12", "weight": 10},
            "node": {"min": "18.0.0", "weight": 8},
            "ram": {"min": 8, "recommended": 16, "weight": 9},
            "disk": {"min": 10, "recommended": 30, "weight": 7},
            "gpu": {"optional": True, "weight": 6},
            "network": {"required": True, "weight": 5},
            "permissions": {"required": True, "weight": 8}
        }
        self.results: List[RequirementResult] = []
        self.system_info = {}
        self.recommendations = []
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages if verbose mode is enabled"""
        if self.verbose:
            colors = {
                "INFO": "",
                "WARNING": "⚠️ ",
                "ERROR": "❌ ",
                "SUCCESS": "✅ "
            }
            print(f"{colors.get(level, '')}{message}")
    
    def collect_system_info(self):
        """Collect comprehensive system information"""
        self.log("Collecting system information...", "INFO")
        
        # Basic system info
        self.system_info.update({
            "os": platform.system(),
            "os_version": platform.version(),
            "architecture": platform.architecture()[0],
            "machine": platform.machine(),
            "processor": platform.processor(),
            "hostname": platform.node(),
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "python_implementation": platform.python_implementation(),
            "timestamp": time.time()
        })
        
        # Enhanced CPU info
        if CPU_INFO_AVAILABLE:
            try:
                cpu_info = cpuinfo.get_cpu_info()
                self.system_info["cpu_detailed"] = {
                    "brand": cpu_info.get("brand_raw", "Unknown"),
                    "arch": cpu_info.get("arch", "Unknown"),
                    "bits": cpu_info.get("bits", 0),
                    "count": cpu_info.get("count", 0),
                    "hz_advertised": cpu_info.get("hz_advertised_friendly", "Unknown"),
                    "l2_cache_size": cpu_info.get("l2_cache_size", 0),
                    "l3_cache_size": cpu_info.get("l3_cache_size", 0)
                }
            except Exception as e:
                self.log(f"Failed to get detailed CPU info: {e}", "WARNING")
        
        # Memory info
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        self.system_info["memory"] = {
            "total_gb": memory.total / (1024**3),
            "available_gb": memory.available / (1024**3),
            "percent_used": memory.percent,
            "swap_total_gb": swap.total / (1024**3),
            "swap_used_gb": swap.used / (1024**3)
        }
        
        # Disk info
        disk = psutil.disk_usage('.')
        self.system_info["disk"] = {
            "total_gb": disk.total / (1024**3),
            "free_gb": disk.free / (1024**3),
            "used_gb": disk.used / (1024**3),
            "percent_used": (disk.used / disk.total) * 100
        }
        
        # Network interfaces
        try:
            interfaces = psutil.net_if_addrs()
            self.system_info["network_interfaces"] = {
                name: [addr.address for addr in addrs if addr.family == socket.AF_INET]
                for name, addrs in interfaces.items()
            }
        except Exception as e:
            self.log(f"Failed to get network info: {e}", "WARNING")
    
    def check_python_comprehensive(self) -> RequirementResult:
        """Comprehensive Python version and installation check"""
        version = sys.version_info
        current = f"{version.major}.{version.minor}.{version.micro}"
        min_version = self.requirements["python"]["min"]
        max_version = self.requirements["python"]["max"]
        
        # Check version requirements
        if version.major == 3 and version.minor >= 11:
            if version.minor > 12:
                status = "warning"
                message = f"Python {current} is newer than tested version {max_version}"
            else:
                status = "pass"
                message = f"Python {current} meets requirements"
        else:
            status = "fail"
            message = f"Python {min_version}+ required, found {current}"
        
        # Additional Python checks
        details = {
            "implementation": sys.implementation.name,
            "compiler": platform.python_compiler(),
            "build": platform.python_build(),
            "executable": sys.executable,
            "path": sys.path[:3],  # First 3 paths for brevity
            "modules": {}
        }
        
        # Check critical modules
        critical_modules = ["pip", "venv", "ssl", "sqlite3", "json", "urllib"]
        for module in critical_modules:
            try:
                __import__(module)
                details["modules"][module] = "available"
            except ImportError:
                details["modules"][module] = "missing"
                if status == "pass":
                    status = "warning"
                    message += f" (missing {module})"
        
        return RequirementResult(
            name="Python",
            status=status,
            value=current,
            expected=f"{min_version} - {max_version}",
            message=message,
            details=details
        )
    
    def check_nodejs_comprehensive(self) -> RequirementResult:
        """Comprehensive Node.js check"""
        try:
            # Check Node.js version
            node_result = subprocess.run(
                ['node', '--version'], 
                capture_output=True, 
                text=True,
                timeout=10
            )
            
            if node_result.returncode != 0:
                raise subprocess.CalledProcessError(node_result.returncode, 'node')
            
            node_version = node_result.stdout.strip().lstrip('v')
            
            # Check npm version
            npm_result = subprocess.run(
                ['npm', '--version'],
                capture_output=True,
                text=True,
                timeout=10
            )
            npm_version = npm_result.stdout.strip() if npm_result.returncode == 0 else "not found"
            
            min_version = self.requirements["node"]["min"]
            
            # Version comparison
            def version_tuple(v):
                return tuple(map(int, (v.split("."))))
            
            if version_tuple(node_version) >= version_tuple(min_version):
                status = "pass"
                message = f"Node.js {node_version} meets requirements"
            else:
                status = "fail"
                message = f"Node.js {min_version}+ required, found {node_version}"
            
            details = {
                "node_version": node_version,
                "npm_version": npm_version,
                "node_path": subprocess.run(['which', 'node'], capture_output=True, text=True).stdout.strip(),
                "npm_path": subprocess.run(['which', 'npm'], capture_output=True, text=True).stdout.strip()
            }
            
            return RequirementResult(
                name="Node.js",
                status=status,
                value=f"Node.js {node_version}, npm {npm_version}",
                expected=f"{min_version}+",
                message=message,
                details=details
            )
            
        except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
            return RequirementResult(
                name="Node.js",
                status="fail",
                value="Not found",
                expected=f"{self.requirements['node']['min']}+",
                message="Node.js not found or not accessible",
                details={"error": str(e)}
            )
    
    def check_memory_comprehensive(self) -> RequirementResult:
        """Comprehensive memory check"""
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        ram_gb = memory.total / (1024**3)
        available_gb = memory.available / (1024**3)
        min_ram = self.requirements["ram"]["min"]
        rec_ram = self.requirements["ram"]["recommended"]
        
        if ram_gb < min_ram:
            status = "fail"
            message = f"Minimum {min_ram}GB RAM required, found {ram_gb:.1f}GB"
        elif ram_gb < rec_ram:
            status = "warning"
            message = f"Recommended {rec_ram}GB RAM, found {ram_gb:.1f}GB"
        else:
            status = "pass"
            message = f"{ram_gb:.1f}GB RAM meets requirements"
        
        details = {
            "total_gb": ram_gb,
            "available_gb": available_gb,
            "used_percent": memory.percent,
            "swap_total_gb": swap.total / (1024**3),
            "swap_used_percent": swap.percent
        }
        
        # Add memory pressure warning
        if memory.percent > 80:
            if status == "pass":
                status = "warning"
            message += f" (high memory usage: {memory.percent:.1f}%)"
        
        return RequirementResult(
            name="Memory",
            status=status,
            value=f"{ram_gb:.1f}GB ({available_gb:.1f}GB available)",
            expected=f"{min_ram}GB minimum, {rec_ram}GB recommended",
            message=message,
            details=details
        )
    
    def check_disk_comprehensive(self) -> RequirementResult:
        """Comprehensive disk space check"""
        disk = psutil.disk_usage('.')
        disk_gb = disk.free / (1024**3)
        total_gb = disk.total / (1024**3)
        min_disk = self.requirements["disk"]["min"]
        rec_disk = self.requirements["disk"]["recommended"]
        
        if disk_gb < min_disk:
            status = "fail"
            message = f"Minimum {min_disk}GB free space required, found {disk_gb:.1f}GB"
        elif disk_gb < rec_disk:
            status = "warning"
            message = f"Recommended {rec_disk}GB free space, found {disk_gb:.1f}GB"
        else:
            status = "pass"
            message = f"{disk_gb:.1f}GB free space meets requirements"
        
        details = {
            "total_gb": total_gb,
            "free_gb": disk_gb,
            "used_gb": disk.used / (1024**3),
            "used_percent": (disk.used / disk.total) * 100
        }
        
        # Additional disk checks
        try:
            # Check write permissions
            test_file = Path("test_write_permissions.tmp")
            test_file.write_text("test")
            test_file.unlink()
            details["write_permission"] = True
        except Exception:
            details["write_permission"] = False
            if status == "pass":
                status = "warning"
            message += " (write permission issue)"
        
        return RequirementResult(
            name="Disk Space",
            status=status,
            value=f"{disk_gb:.1f}GB free of {total_gb:.1f}GB",
            expected=f"{min_disk}GB minimum, {rec_disk}GB recommended",
            message=message,
            details=details
        )
    
    def check_gpu_comprehensive(self) -> RequirementResult:
        """Comprehensive GPU detection and compatibility check"""
        gpu_info = {
            "nvidia_available": False,
            "amd_available": False,
            "intel_available": False,
            "gpus": []
        }
        
        status = "pass"  # GPU is optional
        message = "No GPU detected (optional)"
        
        # NVIDIA GPU detection
        try:
            if GPU_UTIL_AVAILABLE:
                nvidia_gpus = GPUtil.getGPUs()
                if nvidia_gpus:
                    gpu_info["nvidia_available"] = True
                    for gpu in nvidia_gpus:
                        gpu_info["gpus"].append({
                            "id": gpu.id,
                            "name": gpu.name,
                            "memory_total": gpu.memoryTotal,
                            "memory_free": gpu.memoryFree,
                            "temperature": gpu.temperature,
                            "load": gpu.load
                        })
                    status = "pass"
                    message = f"NVIDIA GPU detected: {nvidia_gpus[0].name}"
            else:
                # Fallback to nvidia-smi
                result = subprocess.run(
                    ['nvidia-smi', '--query-gpu=name,memory.total,memory.free', '--format=csv,noheader,nounits'],
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    gpu_info["nvidia_available"] = True
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        parts = line.split(', ')
                        if len(parts) >= 3:
                            gpu_info["gpus"].append({
                                "name": parts[0].strip(),
                                "memory_total": int(parts[1]),
                                "memory_free": int(parts[2])
                            })
                    status = "pass"
                    message = f"NVIDIA GPU detected: {gpu_info['gpus'][0]['name']}"
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        # AMD GPU detection
        try:
            result = subprocess.run(['rocm-smi', '--showproductname'], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                gpu_info["amd_available"] = True
                if status != "pass":
                    status = "pass"
                    message = "AMD GPU detected"
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        # Intel GPU detection (basic)
        try:
            result = subprocess.run(['lspci'], capture_output=True, text=True, timeout=10)
            if result.returncode == 0 and 'Intel' in result.stdout and 'VGA' in result.stdout:
                gpu_info["intel_available"] = True
                if not gpu_info["nvidia_available"] and not gpu_info["amd_available"]:
                    message = "Intel integrated graphics detected"
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        return RequirementResult(
            name="GPU",
            status=status,
            value=message,
            expected="Optional (NVIDIA/AMD recommended for AI workloads)",
            message=message,
            details=gpu_info
        )
    
    def check_network_connectivity(self) -> RequirementResult:
        """Check network connectivity for downloads"""
        details = {
            "interfaces": [],
            "connectivity": {},
            "dns_resolution": {}
        }
        
        # Check network interfaces
        try:
            interfaces = psutil.net_if_addrs()
            for name, addrs in interfaces.items():
                if name != 'lo':  # Skip loopback
                    for addr in addrs:
                        if addr.family == socket.AF_INET:
                            details["interfaces"].append({
                                "name": name,
                                "address": addr.address
                            })
        except Exception as e:
            details["interface_error"] = str(e)
        
        # Test connectivity to important services
        test_hosts = [
            ("github.com", 443),
            ("huggingface.co", 443),
            ("pytorch.org", 443)
        ]
        
        connectivity_score = 0
        for host, port in test_hosts:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex((host, port))
                sock.close()
                
                if result == 0:
                    details["connectivity"][host] = "success"
                    connectivity_score += 1
                else:
                    details["connectivity"][host] = "failed"
            except Exception as e:
                details["connectivity"][host] = f"error: {e}"
        
        if connectivity_score == len(test_hosts):
            status = "pass"
            message = "Network connectivity verified"
        elif connectivity_score > 0:
            status = "warning"
            message = f"Partial network connectivity ({connectivity_score}/{len(test_hosts)} hosts reachable)"
        else:
            status = "fail"
            message = "No network connectivity detected"
        
        return RequirementResult(
            name="Network",
            status=status,
            value=f"{connectivity_score}/{len(test_hosts)} hosts reachable",
            expected="Internet connectivity required",
            message=message,
            details=details
        )
    
    def check_permissions(self) -> RequirementResult:
        """Check file system permissions"""
        details = {
            "current_user": os.getenv("USER", "unknown"),
            "working_directory": str(Path.cwd()),
            "permissions": {}
        }
        
        # Test various permission scenarios
        test_cases = [
            ("read_current_dir", lambda: list(Path.cwd().iterdir())),
            ("write_temp_file", lambda: Path("temp_test.txt").write_text("test") or Path("temp_test.txt").unlink()),
            ("create_directory", lambda: Path("temp_dir").mkdir() or Path("temp_dir").rmdir()),
            ("execute_python", lambda: subprocess.run([sys.executable, "--version"], capture_output=True, timeout=5))
        ]
        
        passed_tests = 0
        for test_name, test_func in test_cases:
            try:
                test_func()
                details["permissions"][test_name] = "pass"
                passed_tests += 1
            except Exception as e:
                details["permissions"][test_name] = f"fail: {e}"
        
        if passed_tests == len(test_cases):
            status = "pass"
            message = "All permission checks passed"
        elif passed_tests >= len(test_cases) // 2:
            status = "warning"
            message = f"Some permission issues detected ({passed_tests}/{len(test_cases)} tests passed)"
        else:
            status = "fail"
            message = f"Significant permission issues ({passed_tests}/{len(test_cases)} tests passed)"
        
        return RequirementResult(
            name="Permissions",
            status=status,
            value=f"{passed_tests}/{len(test_cases)} tests passed",
            expected="Read/write/execute permissions required",
            message=message,
            details=details
        )
    
    def check_ports_comprehensive(self) -> RequirementResult:
        """Comprehensive port availability check"""
        required_ports = [3000, 8188, 11434]
        optional_ports = [5000, 8080, 8000]
        
        details = {
            "required_ports": {},
            "optional_ports": {},
            "port_scan_results": {}
        }
        
        def check_port(port):
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                result = sock.connect_ex(('localhost', port))
                sock.close()
                return result != 0  # True if port is available
            except Exception:
                return False
        
        # Check required ports
        available_required = 0
        for port in required_ports:
            is_available = check_port(port)
            details["required_ports"][port] = "available" if is_available else "in_use"
            if is_available:
                available_required += 1
        
        # Check optional ports
        for port in optional_ports:
            is_available = check_port(port)
            details["optional_ports"][port] = "available" if is_available else "in_use"
        
        if available_required == len(required_ports):
            status = "pass"
            message = "All required ports available"
        elif available_required > 0:
            status = "warning"
            message = f"Some required ports in use ({available_required}/{len(required_ports)} available)"
        else:
            status = "fail"
            message = "All required ports are in use"
        
        return RequirementResult(
            name="Port Availability",
            status=status,
            value=f"{available_required}/{len(required_ports)} required ports available",
            expected="Ports 3000, 8188, 11434 available",
            message=message,
            details=details
        )
    
    def calculate_compatibility_score(self) -> float:
        """Calculate overall compatibility score"""
        total_weight = 0
        weighted_score = 0
        
        for result in self.results:
            # Map requirement name to weight
            req_key = result.name.lower().replace(" ", "_").replace(".", "")
            weight_mapping = {
                "python": "python",
                "nodejs": "node", 
                "memory": "ram",
                "disk_space": "disk",
                "gpu": "gpu",
                "network": "network",
                "permissions": "permissions",
                "port_availability": "network"  # Use network weight for ports
            }
            
            weight_key = weight_mapping.get(req_key, "network")  # Default to network weight
            weight = self.requirements.get(weight_key, {}).get("weight", 5)
            
            # Convert status to score
            score_mapping = {"pass": 1.0, "warning": 0.6, "fail": 0.0}
            score = score_mapping.get(result.status, 0.0)
            
            weighted_score += score * weight
            total_weight += weight
        
        return (weighted_score / total_weight) * 100 if total_weight > 0 else 0
    
    def generate_recommendations(self):
        """Generate recommendations based on check results"""
        self.recommendations = []
        
        for result in self.results:
            if result.status == "fail":
                if "Python" in result.name:
                    self.recommendations.append("Install Python 3.11 or 3.12 from python.org")
                elif "Node.js" in result.name:
                    self.recommendations.append("Install Node.js 18+ from nodejs.org")
                elif "Memory" in result.name:
                    self.recommendations.append("Add more RAM or close other applications")
                elif "Disk" in result.name:
                    self.recommendations.append("Free up disk space or use a different installation directory")
                elif "Network" in result.name:
                    self.recommendations.append("Check internet connection and firewall settings")
                elif "Permissions" in result.name:
                    self.recommendations.append("Run installer with appropriate permissions or change directory")
                elif "Port" in result.name:
                    self.recommendations.append("Stop services using required ports or configure different ports")
            
            elif result.status == "warning":
                if "Memory" in result.name:
                    self.recommendations.append("Consider adding more RAM for better performance")
                elif "Disk" in result.name:
                    self.recommendations.append("Free up additional disk space for optimal performance")
                elif "GPU" in result.name and "No GPU" in result.message:
                    self.recommendations.append("Consider using a GPU for better AI performance")
    
    def run_comprehensive_check(self) -> SystemReport:
        """Run comprehensive system check"""
        self.log("Starting comprehensive system requirements check...", "INFO")
        
        # Collect system information
        self.collect_system_info()
        
        # Run all checks
        checks = [
            self.check_python_comprehensive,
            self.check_nodejs_comprehensive,
            self.check_memory_comprehensive,
            self.check_disk_comprehensive,
            self.check_gpu_comprehensive,
            self.check_network_connectivity,
            self.check_permissions,
            self.check_ports_comprehensive
        ]
        
        for check_func in checks:
            try:
                result = check_func()
                self.results.append(result)
                
                # Log result
                status_symbols = {"pass": "✅", "warning": "⚠️", "fail": "❌"}
                symbol = status_symbols.get(result.status, "❓")
                self.log(f"{symbol} {result.name}: {result.message}", result.status.upper())
                
            except Exception as e:
                error_result = RequirementResult(
                    name=check_func.__name__.replace("check_", "").replace("_comprehensive", "").title(),
                    status="fail",
                    value="Error",
                    expected="N/A",
                    message=f"Check failed: {e}",
                    details={"error": str(e)}
                )
                self.results.append(error_result)
                self.log(f"❌ {error_result.name}: Check failed with error: {e}", "ERROR")
        
        # Calculate compatibility score
        compatibility_score = self.calculate_compatibility_score()
        
        # Generate recommendations
        self.generate_recommendations()
        
        # Determine if installation can proceed
        failed_critical = any(
            result.status == "fail" and result.name in ["Python", "Memory", "Disk Space", "Permissions"]
            for result in self.results
        )
        can_proceed = not failed_critical
        
        return SystemReport(
            system_info=self.system_info,
            requirements=self.results,
            compatibility_score=compatibility_score,
            can_proceed=can_proceed,
            recommendations=self.recommendations,
            timestamp=time.time()
        )
    
    def save_detailed_report(self, report: SystemReport, filename: str = "system_compatibility_report.json"):
        """Save detailed report to file"""
        try:
            # Convert dataclasses to dicts for JSON serialization
            report_dict = {
                "system_info": report.system_info,
                "requirements": [asdict(req) for req in report.requirements],
                "compatibility_score": report.compatibility_score,
                "can_proceed": report.can_proceed,
                "recommendations": report.recommendations,
                "timestamp": report.timestamp
            }
            
            with open(filename, 'w') as f:
                json.dump(report_dict, f, indent=2, default=str)
            
            self.log(f"Detailed report saved to {filename}", "SUCCESS")
            
        except Exception as e:
            self.log(f"Failed to save report: {e}", "ERROR")
    
    def display_summary_report(self, report: SystemReport):
        """Display a summary of the compatibility report"""
        print("\n" + "="*80)
        print("🦕 DINOAIR SYSTEM COMPATIBILITY REPORT")
        print("="*80)
        
        # Overall score
        score_color = "🟢" if report.compatibility_score >= 80 else "🟡" if report.compatibility_score >= 60 else "🔴"
        print(f"\n{score_color} Overall Compatibility Score: {report.compatibility_score:.1f}/100")
        
        # System summary
        print(f"\n📋 System Summary:")
        print(f"  OS: {report.system_info.get('os', 'Unknown')} {report.system_info.get('os_version', '')}")
        print(f"  Architecture: {report.system_info.get('architecture', 'Unknown')}")
        print(f"  Python: {report.system_info.get('python_version', 'Unknown')}")
        
        if 'memory' in report.system_info:
            mem_info = report.system_info['memory']
            print(f"  Memory: {mem_info['total_gb']:.1f}GB total, {mem_info['available_gb']:.1f}GB available")
        
        if 'disk' in report.system_info:
            disk_info = report.system_info['disk']
            print(f"  Disk: {disk_info['free_gb']:.1f}GB free of {disk_info['total_gb']:.1f}GB")
        
        # Requirements status
        print(f"\n📊 Requirements Status:")
        status_counts = {"pass": 0, "warning": 0, "fail": 0}
        for result in report.requirements:
            status_counts[result.status] += 1
            status_symbol = {"pass": "✅", "warning": "⚠️", "fail": "❌"}[result.status]
            print(f"  {status_symbol} {result.name}: {result.message}")
        
        print(f"\n📈 Summary: {status_counts['pass']} passed, {status_counts['warning']} warnings, {status_counts['fail']} failed")
        
        # Recommendations
        if report.recommendations:
            print(f"\n💡 Recommendations:")
            for i, rec in enumerate(report.recommendations, 1):
                print(f"  {i}. {rec}")
        
        # Final verdict
        print(f"\n🎯 Installation Status:")
        if report.can_proceed:
            print("  ✅ System meets minimum requirements - installation can proceed")
            if report.compatibility_score < 80:
                print("  ⚠️  Consider addressing warnings for optimal performance")
        else:
            print("  ❌ System does not meet minimum requirements")
            print("  🔧 Please address critical issues before installation")
        
        print("="*80)


# Legacy compatibility class
class SystemChecker(EnhancedSystemChecker):
    """Legacy compatibility wrapper"""
    
    def __init__(self):
        super().__init__(verbose=True)
        self.errors = []
        self.warnings = []
    
    def generate_report(self):
        """Legacy method for backward compatibility"""
        report = self.run_comprehensive_check()
        
        # Convert to legacy format
        for result in report.requirements:
            if result.status == "fail":
                self.errors.append(result.message)
            elif result.status == "warning":
                self.warnings.append(result.message)
        
        # Save legacy report
        legacy_report = {
            "results": {result.name: result.value for result in report.requirements},
            "errors": self.errors,
            "warnings": self.warnings,
            "can_proceed": report.can_proceed
        }
        
        with open("system_check_report.json", 'w') as f:
            json.dump(legacy_report, f, indent=2)
        
        return report.can_proceed


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="DinoAir Enhanced System Requirements Checker")
    parser.add_argument("--verbose", "-v", action="store_true", 
                       help="Enable verbose output")
    parser.add_argument("--output", "-o", type=str, default="system_compatibility_report.json",
                       help="Output file for detailed report")
    parser.add_argument("--legacy", action="store_true",
                       help="Use legacy output format")
    parser.add_argument("--quiet", "-q", action="store_true",
                       help="Minimal output")
    
    args = parser.parse_args()
    
    # Create checker
    if args.legacy:
        checker = SystemChecker()
        can_proceed = checker.generate_report()
        print("\n✅ Legacy check completed")
    else:
        checker = EnhancedSystemChecker(verbose=not args.quiet)
        report = checker.run_comprehensive_check()
        
        # Save detailed report
        checker.save_detailed_report(report, args.output)
        
        # Display summary if not quiet
        if not args.quiet:
            checker.display_summary_report(report)
        
        can_proceed = report.can_proceed
    
    # Exit with appropriate code
    if can_proceed:
        if not args.quiet:
            print("\n🎉 System check passed!")
        sys.exit(0)
    else:
        if not args.quiet:
            print("\n⚠️  System check failed - see recommendations above")
        sys.exit(1)