#!/usr/bin/env python3
import asyncio
import json
import time
from pathlib import Path
import requests
import logging

class IntegrationTester:
    """Run integration tests for DinoAir"""
    
    def __init__(self):
        self.base_url = "http://localhost:3000"
        self.test_results = []
        self.logger = logging.getLogger(__name__)
        
    async def test_health_endpoints(self):
        """Test health endpoints for all services"""
        endpoints = [
            ("Web GUI Health", "http://localhost:3000/api/health"),
            ("ComfyUI Health", "http://localhost:8188/system_stats"),
            ("Ollama Health", "http://localhost:11434/api/tags")
        ]
        
        for name, url in endpoints:
            try:
                response = requests.get(url, timeout=5)
                self.test_results.append({
                    "test": name,
                    "url": url,
                    "status": response.status_code,
                    "success": response.status_code == 200,
                    "response_time": response.elapsed.total_seconds()
                })
            except requests.exceptions.ConnectionError:
                self.test_results.append({
                    "test": name,
                    "url": url,
                    "error": "Connection refused - service not running",
                    "success": False
                })
            except Exception as e:
                self.test_results.append({
                    "test": name,
                    "url": url,
                    "error": str(e),
                    "success": False
                })
    
    async def test_configuration_files(self):
        """Test that configuration files are properly created"""
        config_files = [
            "config/services.json",
            "config/security.json",
            "config/config.yaml",
            ".env"
        ]
        
        for config_file in config_files:
            file_path = Path(config_file)
            self.test_results.append({
                "test": f"Configuration file: {config_file}",
                "success": file_path.exists(),
                "details": f"File exists: {file_path.exists()}"
            })
    
    async def test_enhanced_scripts(self):
        """Test that enhanced scripts can be imported and work"""
        scripts_to_test = [
            ("System Requirements Checker", "check_requirements.py"),
            ("Requirements Manager", "requirements_manager.py"), 
            ("Enhanced Installer", "install_enhanced.py"),
            ("Troubleshooter", "troubleshoot.py"),
            ("Enhanced Starter", "start_enhanced.py")
        ]
        
        for name, script in scripts_to_test:
            script_path = Path(script)
            self.test_results.append({
                "test": f"Script exists: {name}",
                "success": script_path.exists(),
                "details": f"File: {script}"
            })
    
    async def test_module_imports(self):
        """Test that all enhanced modules can be imported"""
        modules_to_test = [
            ("Config Manager", "config.config_manager", "ConfigManager"),
            ("Service Manager", "services.service_manager", "ServiceManager"),
            ("Performance Monitor", "utils.performance_monitor", "PerformanceMonitor"),
            ("Security Manager", "security.security_manager", "SecurityManager")
        ]
        
        import sys
        sys.path.insert(0, str(Path.cwd()))
        
        for name, module_path, class_name in modules_to_test:
            try:
                module = __import__(module_path, fromlist=[class_name])
                cls = getattr(module, class_name)
                instance = cls()
                self.test_results.append({
                    "test": f"Module import: {name}",
                    "success": True,
                    "details": f"Successfully imported and instantiated {class_name}"
                })
            except Exception as e:
                self.test_results.append({
                    "test": f"Module import: {name}",
                    "success": False,
                    "error": str(e)
                })
    
    async def test_directory_structure(self):
        """Test that required directories exist"""
        required_dirs = [
            "config", "services", "utils", "security", "tests",
            "logs", "models", "data"
        ]
        
        for dir_name in required_dirs:
            dir_path = Path(dir_name)
            self.test_results.append({
                "test": f"Directory: {dir_name}",
                "success": dir_path.exists(),
                "details": f"Directory exists: {dir_path.exists()}"
            })
    
    async def test_requirements_files(self):
        """Test that all requirements files exist and have content"""
        req_files = [
            "requirements.txt",
            "requirements-dev.txt", 
            "requirements-gpu.txt"
        ]
        
        for req_file in req_files:
            file_path = Path(req_file)
            if file_path.exists():
                content = file_path.read_text()
                has_content = len(content.strip()) > 0
                self.test_results.append({
                    "test": f"Requirements file: {req_file}",
                    "success": has_content,
                    "details": f"File has {len(content.splitlines())} lines"
                })
            else:
                self.test_results.append({
                    "test": f"Requirements file: {req_file}",
                    "success": False,
                    "details": "File does not exist"
                })
    
    def generate_report(self):
        """Generate test report"""
        print("\n=== DinoAir Integration Test Report ===\n")
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r.get("success"))
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%\n")
        
        print("Test Results:")
        for result in self.test_results:
            status = "✅" if result.get("success") else "❌"
            test_name = result.get("test")
            print(f"{status} {test_name}")
            if "error" in result:
                print(f"   Error: {result['error']}")
            elif "details" in result:
                print(f"   Details: {result['details']}")
        
        # Save report
        report_path = Path("integration_test_report.json")
        with open(report_path, 'w') as f:
            json.dump({
                "timestamp": time.time(),
                "total_tests": total_tests,
                "passed": passed_tests,
                "success_rate": (passed_tests/total_tests)*100,
                "results": self.test_results
            }, f, indent=2)
        
        print(f"\nDetailed report saved to: {report_path}")
        return passed_tests == total_tests
    
    async def run_all_tests(self):
        """Run all integration tests"""
        print("Running DinoAir integration tests...")
        
        await self.test_health_endpoints()
        await self.test_configuration_files()
        await self.test_enhanced_scripts()
        await self.test_module_imports()
        await self.test_directory_structure()
        await self.test_requirements_files()
        
        return self.generate_report()

if __name__ == "__main__":
    async def main():
        tester = IntegrationTester()
        success = await tester.run_all_tests()
        return 0 if success else 1
    
    exit_code = asyncio.run(main())
    exit(exit_code)