import asyncio
import subprocess
import psutil
import requests
import time
import json
from pathlib import Path
from typing import Dict, Optional
import logging

class ServiceManager:
    """Manage DinoAir services (ComfyUI, Ollama, Web GUI)"""
    
    def __init__(self, config_path: Path = None):
        self.config_path = config_path or Path("config/services.json")
        self.services = self.load_service_config()
        self.logger = logging.getLogger(__name__)
        self.processes = {}
        
    def load_service_config(self) -> Dict:
        """Load service configuration"""
        if self.config_path.exists():
            with open(self.config_path, 'r') as f:
                return json.load(f)
        else:
            # Return default configuration
            return {
                "comfyui": {
                    "enabled": True,
                    "host": "localhost",
                    "port": 8188,
                    "api_path": "/api"
                },
                "ollama": {
                    "enabled": True,
                    "host": "localhost", 
                    "port": 11434,
                    "api_path": "/api"
                },
                "web_gui": {
                    "enabled": True,
                    "host": "localhost",
                    "port": 3000,
                    "api_path": "/api"
                }
            }
    
    async def start_service(self, service_name: str) -> bool:
        """Start a specific service"""
        if service_name not in self.services:
            self.logger.error(f"Unknown service: {service_name}")
            return False
        
        service_config = self.services[service_name]
        
        # Service-specific start commands
        start_commands = {
            "comfyui": [
                "python", "-m", "comfyui.main",
                "--listen", service_config["host"],
                "--port", str(service_config["port"])
            ],
            "ollama": [
                "ollama", "serve"
            ],
            "web_gui": [
                "npm", "run", "start",
                "--prefix", "web-gui-node"
            ]
        }
        
        if service_name not in start_commands:
            self.logger.error(f"No start command defined for {service_name}")
            return False
        
        # Check if already running
        if self.is_service_running(service_name):
            self.logger.info(f"{service_name} is already running")
            return True
        
        # Start the service
        try:
            process = subprocess.Popen(
                start_commands[service_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            self.processes[service_name] = process
            
            # Wait for service to be ready
            if await self.wait_for_service(service_name):
                self.logger.info(f"✅ {service_name} started successfully")
                return True
            else:
                self.logger.error(f"❌ {service_name} failed to start")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to start {service_name}: {e}")
            return False
    
    async def wait_for_service(self, service_name: str, timeout: int = 60) -> bool:
        """Wait for service to be ready"""
        service_config = self.services[service_name]
        health_endpoints = {
            "comfyui": f"http://{service_config['host']}:{service_config['port']}/system_stats",
            "ollama": f"http://{service_config['host']}:{service_config['port']}/api/tags",
            "web_gui": f"http://{service_config['host']}:{service_config['port']}/api/health"
        }
        
        endpoint = health_endpoints.get(service_name)
        if not endpoint:
            return True  # No health check defined
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(endpoint, timeout=5)
                if response.status_code == 200:
                    return True
            except:
                pass
            
            await asyncio.sleep(1)
        
        return False
    
    def is_service_running(self, service_name: str) -> bool:
        """Check if service is running"""
        service_config = self.services[service_name]
        port = service_config["port"]
        
        # Check if port is in use
        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == 'LISTEN':
                return True
        
        return False
    
    async def stop_service(self, service_name: str):
        """Stop a specific service"""
        if service_name in self.processes:
            process = self.processes[service_name]
            process.terminate()
            
            # Wait for graceful shutdown
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
            
            del self.processes[service_name]
            self.logger.info(f"✅ {service_name} stopped")
    
    async def start_all(self):
        """Start all services"""
        self.logger.info("Starting all services...")
        
        # Start services in order
        service_order = ["ollama", "comfyui", "web_gui"]
        
        for service in service_order:
            if service in self.services and self.services[service].get("enabled", True):
                await self.start_service(service)
                await asyncio.sleep(2)  # Brief pause between services
    
    async def stop_all(self):
        """Stop all services"""
        self.logger.info("Stopping all services...")
        
        for service_name in list(self.processes.keys()):
            await self.stop_service(service_name)
    
    async def restart_service(self, service_name: str):
        """Restart a specific service"""
        await self.stop_service(service_name)
        await asyncio.sleep(2)
        await self.start_service(service_name)
    
    def get_service_status(self) -> Dict:
        """Get status of all services"""
        status = {}
        
        for service_name, config in self.services.items():
            status[service_name] = {
                "running": self.is_service_running(service_name),
                "port": config["port"],
                "host": config["host"]
            }
        
        return status