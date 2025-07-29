import os
import json
import yaml
from pathlib import Path
from typing import Dict, Any, Optional
import logging

class ConfigManager:
    """Centralized configuration management for DinoAir"""
    
    def __init__(self, config_dir: Path = None):
        self.config_dir = config_dir or Path("config")
        self.config_dir.mkdir(exist_ok=True)
        
        self.config_files = {
            "main": "config.yaml",
            "services": "services.json",
            "models": "models.yaml",
            "security": "security.json"
        }
        
        self.config_cache = {}
        self.logger = logging.getLogger(__name__)
        
    def load_config(self, config_name: str) -> Dict[str, Any]:
        """Load configuration file"""
        if config_name in self.config_cache:
            return self.config_cache[config_name]
        
        config_file = self.config_dir / self.config_files.get(config_name, f"{config_name}.yaml")
        
        if not config_file.exists():
            self.logger.warning(f"Config file {config_file} not found, creating default")
            self.create_default_config(config_name)
        
        # Load based on file extension
        if config_file.suffix == ".json":
            with open(config_file, 'r') as f:
                config = json.load(f)
        elif config_file.suffix in [".yaml", ".yml"]:
            with open(config_file, 'r') as f:
                config = yaml.safe_load(f)
        else:
            raise ValueError(f"Unsupported config format: {config_file.suffix}")
        
        # Merge with environment variables
        config = self.merge_with_env(config)
        
        self.config_cache[config_name] = config
        return config
    
    def merge_with_env(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Merge configuration with environment variables"""
        for key, value in config.items():
            env_key = f"DINOAIR_{key.upper()}"
            if env_key in os.environ:
                config[key] = os.environ[env_key]
        return config
    
    def create_default_config(self, config_name: str):
        """Create default configuration files"""
        defaults = {
            "main": {
                "app_name": "DinoAir",
                "version": "1.5",
                "debug": False,
                "host": "localhost",
                "port": 3000,
                "workers": 4,
                "timeout": 300
            },
            "services": {
                "comfyui": {
                    "enabled": True,
                    "host": "localhost",
                    "port": 8188,
                    "api_path": "/api",
                    "healthcheck_interval": 30
                },
                "ollama": {
                    "enabled": True,
                    "host": "localhost",
                    "port": 11434,
                    "api_path": "/api",
                    "models": ["qwen", "llama"],
                    "default_model": "qwen"
                },
                "web_gui": {
                    "enabled": True,
                    "host": "localhost", 
                    "port": 3000,
                    "api_path": "/api"
                }
            },
            "models": {
                "text_models": {
                    "path": "models/ollama",
                    "auto_download": True,
                    "models": [
                        {"name": "qwen", "size": "7b"},
                        {"name": "llama", "size": "7b"}
                    ]
                },
                "image_models": {
                    "path": "models/comfyui",
                    "auto_download": True,
                    "models": [
                        {"name": "sdxl", "version": "1.0"},
                        {"name": "sd", "version": "1.5"}
                    ]
                }
            },
            "security": {
                "jwt_secret": os.urandom(32).hex(),
                "api_key_required": True,
                "rate_limiting": {
                    "enabled": True,
                    "requests_per_minute": 60
                },
                "cors": {
                    "enabled": True,
                    "origins": ["http://localhost:3000"]
                }
            }
        }
        
        if config_name in defaults:
            config_file = self.config_dir / self.config_files[config_name]
            
            with open(config_file, 'w') as f:
                if config_file.suffix == ".json":
                    json.dump(defaults[config_name], f, indent=2)
                else:
                    yaml.dump(defaults[config_name], f, default_flow_style=False)
    
    def update_config(self, config_name: str, updates: Dict[str, Any]):
        """Update configuration and save to file"""
        config = self.load_config(config_name)
        config.update(updates)
        
        config_file = self.config_dir / self.config_files[config_name]
        
        with open(config_file, 'w') as f:
            if config_file.suffix == ".json":
                json.dump(config, f, indent=2)
            else:
                yaml.dump(config, f, default_flow_style=False)
        
        # Update cache
        self.config_cache[config_name] = config
    
    def validate_config(self) -> bool:
        """Validate all configuration files"""
        required_configs = ["main", "services", "security"]
        
        for config_name in required_configs:
            try:
                self.load_config(config_name)
            except Exception as e:
                self.logger.error(f"Failed to load {config_name} config: {e}")
                return False
        
        return True