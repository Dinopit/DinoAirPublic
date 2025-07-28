#!/usr/bin/env python3
import os
import sys
import subprocess
import json
import logging
import shutil
from pathlib import Path
from datetime import datetime
import venv
import platform
import secrets

# Setup logging
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f"install_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class EnhancedInstaller:
    def __init__(self):
        self.root_dir = Path.cwd()
        self.venv_dir = self.root_dir / "venv"
        self.backup_dir = self.root_dir / "backups"
        self.config_file = self.root_dir / "config" / "install_config.json"
        
    def create_backup(self):
        """Create backup of existing installation"""
        if not self.backup_dir.exists():
            self.backup_dir.mkdir()
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = self.backup_dir / f"backup_{timestamp}"
        
        # Backup critical directories
        dirs_to_backup = ["config", "data", "models"]
        for dir_name in dirs_to_backup:
            src = self.root_dir / dir_name
            if src.exists():
                dst = backup_path / dir_name
                shutil.copytree(src, dst)
                logger.info(f"Backed up {dir_name} to {dst}")
        
        return backup_path

    def setup_virtual_environment(self):
        """Create and activate virtual environment"""
        logger.info("Setting up Python virtual environment...")
        
        if self.venv_dir.exists():
            logger.warning("Virtual environment already exists, recreating...")
            shutil.rmtree(self.venv_dir)
        
        # Create venv
        venv.create(self.venv_dir, with_pip=True)
        
        # Get activation command based on OS
        if platform.system() == "Windows":
            pip_cmd = str(self.venv_dir / "Scripts" / "pip")
            python_cmd = str(self.venv_dir / "Scripts" / "python")
        else:
            pip_cmd = str(self.venv_dir / "bin" / "pip")
            python_cmd = str(self.venv_dir / "bin" / "python")
        
        # Upgrade pip
        subprocess.run([pip_cmd, "install", "--upgrade", "pip"], check=True)
        
        return pip_cmd, python_cmd

    def install_python_dependencies(self, pip_cmd):
        """Install Python dependencies with proper error handling"""
        logger.info("Installing Python dependencies...")
        
        # Install with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                subprocess.run(
                    [pip_cmd, "install", "-r", "requirements.txt"],
                    check=True
                )
                logger.info("Python dependencies installed successfully")
                break
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to install Python dependencies (attempt {attempt + 1}/{max_retries})")
                if attempt == max_retries - 1:
                    raise

    def install_node_dependencies(self):
        """Install Node.js dependencies for web GUI"""
        logger.info("Installing Node.js dependencies...")
        
        node_dirs = ["web-gui", "web-gui-node", "mobile-app"]
        
        for dir_name in node_dirs:
            node_dir = self.root_dir / dir_name
            if node_dir.exists() and (node_dir / "package.json").exists():
                logger.info(f"Installing dependencies for {dir_name}...")
                
                # Clean install
                node_modules = node_dir / "node_modules"
                if node_modules.exists():
                    shutil.rmtree(node_modules)
                
                # Install dependencies
                subprocess.run(
                    ["npm", "ci" if (node_dir / "package-lock.json").exists() else "install"],
                    cwd=str(node_dir),
                    check=True
                )

    def setup_services(self):
        """Configure and validate services (ComfyUI, Ollama)"""
        logger.info("Setting up services...")
        
        # Create service configuration
        services_config = {
            "comfyui": {
                "port": 8188,
                "host": "localhost",
                "models_dir": str(self.root_dir / "models" / "comfyui")
            },
            "ollama": {
                "port": 11434,
                "host": "localhost",
                "models_dir": str(self.root_dir / "models" / "ollama")
            },
            "web_gui": {
                "port": 3000,
                "host": "localhost",
                "api_key": self.generate_api_key()
            }
        }
        
        # Save service configuration
        config_dir = self.root_dir / "config"
        config_dir.mkdir(exist_ok=True)
        
        with open(config_dir / "services.json", 'w') as f:
            json.dump(services_config, f, indent=2)
        
        # Create model directories
        for service, config in services_config.items():
            if "models_dir" in config:
                Path(config["models_dir"]).mkdir(parents=True, exist_ok=True)

    def generate_api_key(self):
        """Generate secure API key"""
        return secrets.token_urlsafe(32)

    def create_environment_file(self, pip_cmd, python_cmd):
        """Create .env file with configuration"""
        env_content = f"""# DinoAir Environment Configuration
# Generated on {datetime.now().isoformat()}

# Python Environment
PYTHON_PATH={python_cmd}
PIP_PATH={pip_cmd}
VENV_PATH={self.venv_dir}

# Service Ports
WEB_GUI_PORT=3000
COMFYUI_PORT=8188
OLLAMA_PORT=11434

# API Configuration
API_KEY={self.generate_api_key()}
JWT_SECRET={self.generate_api_key()}

# Model Paths
OLLAMA_MODELS={self.root_dir / "models" / "ollama"}
COMFYUI_MODELS={self.root_dir / "models" / "comfyui"}
SDXL_MODELS={self.root_dir / "models" / "sdxl"}

# Database
DATABASE_URL=sqlite:///{self.root_dir / "data" / "dinoair.db"}

# Logging
LOG_LEVEL=INFO
LOG_DIR={self.root_dir / "logs"}

# Performance
MAX_WORKERS=4
REQUEST_TIMEOUT=300
RATE_LIMIT_PER_MINUTE=60

# Development
DEBUG=false
RELOAD=false
"""
        
        # Generate the API key once and store it
        api_key = self.generate_api_key()
        
        # Create the .env file
        env_file = self.root_dir / ".env"
        env_content = env_content.replace("your-api-key-placeholder", api_key)
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        # Create the .env.example file
        example_content = env_content.replace(api_key, "your-api-key-here")
        with open(self.root_dir / ".env.example", 'w') as f:
            f.write(example_content)

    def validate_installation(self):
        """Validate the installation"""
        logger.info("Validating installation...")
        
        checks = {
            "Python virtual environment": self.venv_dir.exists(),
            "Configuration files": (self.root_dir / "config" / "services.json").exists(),
            "Environment file": (self.root_dir / ".env").exists(),
            "Model directories": (self.root_dir / "models").exists(),
            "Log directory": (self.root_dir / "logs").exists()
        }
        
        # Check node modules for existing node directories
        node_dirs = ["web-gui", "web-gui-node"]
        for dir_name in node_dirs:
            node_dir = self.root_dir / dir_name
            if node_dir.exists():
                node_modules = node_dir / "node_modules"
                checks[f"Node modules ({dir_name})"] = node_modules.exists()
        
        all_passed = True
        for check, result in checks.items():
            status = "✅" if result else "❌"
            logger.info(f"{status} {check}")
            if not result:
                all_passed = False
        
        return all_passed

    def run(self):
        """Main installation process"""
        try:
            logger.info("Starting DinoAir Enhanced Installation")
            
            # Run system check first
            if subprocess.run([sys.executable, "check_requirements.py"]).returncode != 0:
                logger.error("System requirements not met. Please fix issues and retry.")
                return False
            
            # Create backup
            backup_path = self.create_backup()
            logger.info(f"Backup created at: {backup_path}")
            
            # Setup Python environment
            pip_cmd, python_cmd = self.setup_virtual_environment()
            
            # Install dependencies
            self.install_python_dependencies(pip_cmd)
            self.install_node_dependencies()
            
            # Configure services
            self.setup_services()
            
            # Create environment file
            self.create_environment_file(pip_cmd, python_cmd)
            
            # Validate installation
            if self.validate_installation():
                logger.info("✅ Installation completed successfully!")
                logger.info("\nNext steps:")
                logger.info("1. Review the .env file and adjust settings if needed")
                logger.info("2. Run 'python start_enhanced.py' to start DinoAir")
                logger.info("3. Access the web interface at http://localhost:3000")
                return True
            else:
                logger.error("❌ Installation validation failed")
                return False
                
        except Exception as e:
            logger.error(f"Installation failed: {str(e)}", exc_info=True)
            return False

if __name__ == "__main__":
    installer = EnhancedInstaller()
    success = installer.run()
    sys.exit(0 if success else 1)