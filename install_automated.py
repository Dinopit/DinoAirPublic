"""
Automated DinoAir Installation Script - No User Prompts
Based on install.py but with automated responses
"""

import os
import sys
import subprocess
import platform

# Set environment for better encoding support
os.environ['PYTHONIOENCODING'] = 'utf-8'

def run_command(command, capture_output=False):
    """Run a command and return success status."""
    try:
        if capture_output:
            result = subprocess.run(command, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
            return result.returncode == 0, result.stdout
        else:
            result = subprocess.run(command, shell=True, encoding='utf-8', errors='replace')
            return result.returncode == 0
    except Exception as e:
        print(f"Error running command: {e}")
        return False, str(e) if capture_output else False

def main():
    print("=== DinoAir Automated Installation ===")
    print("Installing with default settings...")
    
    # Check Python version
    if sys.version_info < (3, 10):
        print(f"Error: Python 3.10+ required, found {sys.version}")
        return False
    
    print("[OK] Python version OK")
    
    # Install Python requirements
    print("\nInstalling Python requirements...")
    if not run_command(f"{sys.executable} -m pip install -r requirements.txt"):
        print("Failed to install Python requirements")
        return False
    print("[OK] Python requirements installed")
    
    # Check if ComfyUI exists
    if not os.path.exists("ComfyUI"):
        print("\nCloning ComfyUI...")
        if not run_command("git clone https://github.com/comfyanonymous/ComfyUI.git"):
            print("Failed to clone ComfyUI")
            return False
        print("[OK] ComfyUI cloned")
    
    # Install ComfyUI requirements
    if os.path.exists("ComfyUI/requirements.txt"):
        print("\nInstalling ComfyUI requirements...")
        if not run_command(f"{sys.executable} -m pip install -r ComfyUI/requirements.txt"):
            print("Failed to install ComfyUI requirements")
            return False
        print("[OK] ComfyUI requirements installed")
    
    # Download models
    print("\nDownloading models (this may take a while)...")
    if not run_command(f"{sys.executable} download_models.py"):
        print("Warning: Model download may have failed, continuing...")
    
    # Install web GUI
    if os.path.exists("web-gui-node"):
        print("\nInstalling web GUI...")
        os.chdir("web-gui-node")
        
        # Install npm dependencies
        if not run_command("npm install"):
            print("Warning: npm install failed, web GUI may not work properly")
        else:
            print("[OK] Web GUI installed")
        
        os.chdir("..")
    
    print("\n=== Installation Complete ===")
    print("\nTo start DinoAir, run:")
    print(f"  {sys.executable} start.py")
    print("\nThe web interface will be available at:")
    print("  http://localhost:3000")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)