#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path
from packaging.requirements import Requirement
import importlib.util

class RequirementsManager:
    """Manage Python and Node.js dependencies"""
    
    def __init__(self):
        self.root_dir = Path.cwd()
        self.requirements_files = {
            "base": "requirements.txt",
            "dev": "requirements-dev.txt", 
            "gpu": "requirements-gpu.txt"
        }
        
    def generate_requirements(self):
        """Generate requirements.txt from current environment"""
        print("Generating enhanced requirements files...")
        
        # Base requirements
        base_reqs = [
            "# Base requirements for DinoAir",
            "# Generated automatically - enhanced version",
            "",
            "# Core web framework",
            "fastapi>=0.104.0",
            "uvicorn>=0.24.0",
            "pydantic>=2.4.0",
            "",
            "# Database and ORM",
            "sqlalchemy>=2.0.0",
            "alembic>=1.12.0",
            "",
            "# Authentication and security",
            "python-jose>=3.3.0",
            "passlib>=1.7.4",
            "bcrypt>=4.0.0",
            "",
            "# HTTP and WebSocket support",
            "python-multipart>=0.0.6",
            "aiofiles>=23.2.0",
            "httpx>=0.25.0",
            "websockets>=12.0",
            "",
            "# Task processing and caching",
            "redis>=5.0.0",
            "celery>=5.3.0",
            "",
            "# Monitoring and observability",
            "prometheus-client>=0.18.0",
            "structlog>=23.2.0",
            "sentry-sdk>=2.0.0",
            "",
            "# Configuration and environment",
            "python-dotenv>=1.0.0",
            "pyyaml>=6.0.1",
            "",
            "# CLI and utilities",
            "click>=8.1.0",
            "rich>=13.6.0",
            "",
            "# HTTP requests and parsing",
            "requests>=2.31.0",
            "beautifulsoup4>=4.12.0",
            "",
            "# System and file handling",
            "psutil>=5.9.0",
            "colorama>=0.4.6",
            "tqdm>=4.66.0",
            "packaging>=23.0",
            "",
            "# Data processing",
            "pillow>=10.1.0",
            "numpy>=1.24.0",
            "",
            "# Cryptography",
            "cryptography>=41.0.0",
            "",
            "# Telemetry (existing)",
            "opentelemetry-api>=1.20.0",
            "opentelemetry-sdk>=1.20.0",
            "opentelemetry-exporter-jaeger-thrift>=1.20.0",
            "opentelemetry-exporter-otlp-proto-grpc>=1.20.0",
            "opentelemetry-semantic-conventions>=0.41b0",
        ]
        
        # GPU requirements
        gpu_reqs = [
            "# GPU requirements for DinoAir",
            "# Install with: pip install -r requirements-gpu.txt",
            "",
            "-r requirements.txt",
            "",
            "# PyTorch and related",
            "torch>=2.1.0",
            "torchvision>=0.16.0", 
            "torchaudio>=2.1.0",
            "",
            "# AI/ML libraries",
            "transformers>=4.35.0",
            "accelerate>=0.24.0",
            "diffusers>=0.23.0",
            "safetensors>=0.4.0",
            "",
            "# Performance optimizations",
            "xformers>=0.0.22",
            "",
            "# Computer vision",
            "opencv-python>=4.8.0",
            "",
            "# ONNX runtime",
            "onnxruntime-gpu>=1.16.0",
        ]
        
        # Dev requirements
        dev_reqs = [
            "# Development requirements for DinoAir", 
            "# Install with: pip install -r requirements-dev.txt",
            "",
            "-r requirements.txt",
            "",
            "# Testing",
            "pytest>=7.4.0",
            "pytest-cov>=4.1.0",
            "pytest-asyncio>=0.21.0",
            "",
            "# Code formatting and linting",
            "black>=23.10.0",
            "flake8>=6.1.0",
            "mypy>=1.6.0", 
            "isort>=5.12.0",
            "",
            "# Pre-commit hooks",
            "pre-commit>=3.5.0",
            "",
            "# Development tools",
            "ipython>=8.16.0",
            "jupyter>=1.0.0",
            "notebook>=7.0.0",
        ]
        
        # Write requirements files
        for filename, content in [
            ("requirements.txt", base_reqs),
            ("requirements-gpu.txt", gpu_reqs), 
            ("requirements-dev.txt", dev_reqs)
        ]:
            with open(self.root_dir / filename, 'w') as f:
                f.write('\n'.join(content))
        
        print("✅ Enhanced requirements files generated successfully")
    
    def check_dependencies(self):
        """Check if all dependencies are installed"""
        missing_deps = []
        
        try:
            with open(self.root_dir / "requirements.txt", 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and not line.startswith('-r'):
                        try:
                            # Use packaging library for robust requirement parsing
                            req = Requirement(line)
                            pkg_name = req.name
                            
                            # Define common variations for the package name
                            variations = [
                                pkg_name.replace('_', '-'),
                                pkg_name.lower(),
                                pkg_name.upper()
                            ]
                            
                            # Try to find and import the module
                            # Handle cases where package name differs from import name
                            import_name = pkg_name.replace('-', '_')
                            spec = importlib.util.find_spec(import_name)
                            if spec is None:
                                found = False
                                for variation in variations:
                                    spec = importlib.util.find_spec(variation.replace('-', '_'))
                                    if spec is not None:
                                        found = True
                                        break
                                
                                if not found:
                                    missing_deps.append(line)
                        except (InvalidRequirement, ValueError):
                            # If requirement parsing fails, add to missing deps
                            missing_deps.append(line)
        except FileNotFoundError:
            print("❌ requirements.txt not found")
            return False
        
        if missing_deps:
            print("❌ Missing dependencies:")
            for dep in missing_deps:
                print(f"  - {dep}")
            return False
        else:
            print("✅ All dependencies are installed")
            return True
    
    def update_dependencies(self):
        """Update all dependencies to latest compatible versions"""
        print("Updating dependencies...")
        
        # Update pip first
        subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
        
        # Update all packages
        subprocess.run([
            sys.executable, "-m", "pip", "install", "--upgrade", 
            "-r", "requirements.txt"
        ])
        
        print("✅ Dependencies updated")

if __name__ == "__main__":
    manager = RequirementsManager()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "generate":
            manager.generate_requirements()
        elif sys.argv[1] == "check":
            manager.check_dependencies()
        elif sys.argv[1] == "update":
            manager.update_dependencies()
    else:
        print("Usage: python requirements_manager.py [generate|check|update]")