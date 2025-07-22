import os
import sys
import subprocess
import json
from importlib import import_module
import platform

def check_python_version():
    """Checks if the Python version is 3.11 or higher."""
    if sys.version_info < (3, 11):
        print("Error: Python 3.11 or higher is required.")
        sys.exit(1)
    print("Python version check passed.")

def check_pip_version():
    """Checks if pip is installed and at a sufficient version."""
    try:
        import pip
        pip_version = tuple(map(int, pip.__version__.split('.')))
        if pip_version < (21, 0):
            print("Warning: pip version 21.0 or higher is recommended.")
    except ImportError:
        print("Error: pip is not installed. Please install pip.")
        sys.exit(1)
    print("pip check passed.")

def check_ollama():
    """Checks if ollama is installed and accessible."""
    try:
        subprocess.run(["ollama", "--version"], check=True, capture_output=True)
        print("Ollama installation check passed.")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: Ollama is not installed or not in your PATH.")
        print("Please install Ollama from https://ollama.ai/ and try again.")
        return False

def check_nodejs():
    """Checks if Node.js and npm are installed."""
    try:
        # Check Node.js
        node_result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if node_result.returncode == 0:
            node_version = node_result.stdout.strip()
            print(f"Node.js {node_version} found.")
        else:
            return False
            
        # Check npm
        npm_result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
        if npm_result.returncode == 0:
            npm_version = npm_result.stdout.strip()
            print(f"npm {npm_version} found.")
        else:
            return False
            
        return True
    except FileNotFoundError:
        print("Error: Node.js/npm is not installed or not in your PATH.")
        print("Please install Node.js from https://nodejs.org/ and try again.")
        return False

def confirm_installation():
    """Asks the user to confirm the installation."""
    prompt = "Warning: This installer will install Qwen 7B Vision, ComfyUI, Web GUI, and related dependencies to your local system. Please confirm to proceed [Y/n] "
    response = input(prompt).lower().strip()
    if response not in ["y", "yes", ""]:
        print("Installation cancelled by user.")
        sys.exit(0)
    return True

def install_comfyui():
    """Clones ComfyUI and installs its dependencies."""
    print("Installing ComfyUI...")
    try:
        if not os.path.exists("ComfyUI"):
            subprocess.run(["git", "clone", "https://github.com/comfyanonymous/ComfyUI.git"], check=True)
        
        # Install dependencies
        pip_args = [sys.executable, "-m", "pip", "install", "-r", "ComfyUI/requirements.txt"]
        subprocess.run(pip_args, check=True)
        
        print("ComfyUI installed successfully.")
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"Error during ComfyUI installation: {e}")
        sys.exit(1)

import shutil

def copy_comfyui_workflows():
    """Copies the ComfyUI workflows to the ComfyUI directory."""
    print("Copying ComfyUI workflows...")
    source_dir = os.path.join(os.path.dirname(__file__), "..", "FreeTierPacked")
    target_dir = "ComfyUI/workflows" # This might need adjustment based on where ComfyUI stores workflows
    
    # Ensure the target directory exists
    os.makedirs(target_dir, exist_ok=True)

    for item in os.listdir(source_dir):
        if item.endswith(".json"):
            source_item = os.path.join(source_dir, item)
            target_item = os.path.join(target_dir, item)
            shutil.copy2(source_item, target_item)
            print(f"Copied {item} to {target_dir}")

def install_model_downloader_deps():
    """Install dependencies required for the model downloader."""
    print("Installing model downloader dependencies...")
    try:
        pip_args = [sys.executable, "-m", "pip", "install", "requests", "tqdm"]
        subprocess.run(pip_args, check=True)
        print("Model downloader dependencies installed successfully.")
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"Error installing dependencies: {e}")
        return False
    return True

def download_sdxl_models():
    """Download SDXL models using the download_models.py script."""
    print("\n" + "="*60)
    print("SDXL Model Download")
    print("="*60)
    
    # Check if models already exist
    models_dir = "ComfyUI/models/checkpoints"
    base_model = os.path.join(models_dir, "sd_xl_base_1.0.safetensors")
    vae_model = os.path.join(models_dir, "sdxl_vae.safetensors")
    
    if os.path.exists(base_model) and os.path.exists(vae_model):
        print("\nSDXL models already exist in the checkpoints directory.")
        response = input("Do you want to re-download or verify them? [y/N] ").lower().strip()
        if response not in ["y", "yes"]:
            print("Skipping model download.")
            return True
    
    # Ask user if they want to download models
    print("\nDinoAir requires SDXL models to function properly.")
    print("The base model and VAE are approximately 7.3GB total.")
    print("\nWould you like to download the SDXL models automatically?")
    print("(You can also manually place models in ComfyUI/models/checkpoints later)")
    
    response = input("\nDownload SDXL models now? [Y/n] ").lower().strip()
    if response in ["n", "no"]:
        print("\nSkipping model download.")
        print("You'll need to manually download and place these files:")
        print("  - sd_xl_base_1.0.safetensors")
        print("  - sdxl_vae.safetensors")
        print(f"Into: {os.path.abspath(models_dir)}")
        return True
    
    # Install dependencies if needed
    try:
        import requests
        import tqdm
    except ImportError:
        print("\nInstalling required packages for model download...")
        if not install_model_downloader_deps():
            print("Failed to install dependencies. Please install manually: pip install requests tqdm")
            return False
    
    # Run the download script
    try:
        download_script = os.path.join(os.path.dirname(__file__), "download_models.py")
        subprocess.run([sys.executable, download_script], check=True)
        return True
    except subprocess.CalledProcessError:
        print("\nModel download failed or was cancelled.")
        print("You can run the download script manually later:")
        print(f"  python {download_script}")
        return False
    except Exception as e:
        print(f"\nError during model download: {e}")
        return False

def pull_ollama_models():
    """Pulls the Qwen 7B Vision model."""
    print("Pulling Qwen 7B Vision model from Ollama...")
    try:
        subprocess.run(["ollama", "pull", "qwen:7b-chat-v1.5-q4_K_M"], check=True)
        print("Model pulled successfully.")
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"Error pulling Ollama model: {e}")
        sys.exit(1)

def install_web_gui():
    """Installs the web GUI dependencies."""
    print("\nInstalling Web GUI...")
    web_gui_path = os.path.join(os.path.dirname(__file__), "web-gui")
    
    if not os.path.exists(web_gui_path):
        print("Error: web-gui directory not found!")
        return False
    
    try:
        # Change to web-gui directory
        original_dir = os.getcwd()
        os.chdir(web_gui_path)
        
        print("Installing npm dependencies (this may take a few minutes)...")
        if platform.system() == "Windows":
            subprocess.run(["npm.cmd", "install"], check=True)
        else:
            subprocess.run(["npm", "install"], check=True)
        
        print("Web GUI dependencies installed successfully.")
        
        # Return to original directory
        os.chdir(original_dir)
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"Error installing Web GUI dependencies: {e}")
        os.chdir(original_dir)
        return False
    except Exception as e:
        print(f"Unexpected error during Web GUI installation: {e}")
        os.chdir(original_dir)
        return False

def generate_dependency_log():
    """Generates a log of installed packages."""
    print("Generating dependency log...")
    log_path = os.path.join(os.path.dirname(__file__), "dinoair_install_log.txt")
    try:
        with open(log_path, "w") as f:
            subprocess.run([sys.executable, "-m", "pip", "freeze"], stdout=f, check=True)
        print(f"Dependency log created at {log_path}")
    except (subprocess.CalledProcessError, IOError) as e:
        print(f"Error generating dependency log: {e}")

def print_summary(models_downloaded=False, web_gui_installed=False):
    """Prints a summary of the installation."""
    print("\n" + "="*60)
    print("DinoAir Free Tier Installation Summary")
    print("="*60)
    print(f"Python Version: {sys.version}")
    try:
        import pip
        print(f"pip Version: {pip.__version__}")
    except ImportError:
        print("pip Version: Not found")
    
    print("\n✓ ComfyUI installed")
    print("✓ Workflows copied")
    print("✓ Ollama models pulled")
    
    if web_gui_installed:
        print("✓ Web GUI installed")
    else:
        print("⚠ Web GUI not installed - manual setup required")
    
    if models_downloaded:
        print("✓ SDXL models downloaded")
    else:
        print("⚠ SDXL models not downloaded - manual setup required")
        print("\n  To download models later, run:")
        print(f"  python {os.path.join(os.path.dirname(__file__), 'download_models.py')}")
    
    print("\n" + "="*60)
    print("Installation complete!")
    print("="*60)
    
    if web_gui_installed:
        print("\nTo start DinoAir Free Tier, run:")
        print(f"  python {os.path.join(os.path.dirname(__file__), 'start.py')}")
        print("\nThe Web GUI will be available at: http://localhost:3000")
    
    print("\nNote: You can easily swap in another SDXL model by placing the model file in the `ComfyUI/models/checkpoints` directory.")


def main():
    """Main function to run the installer."""
    print("="*60)
    print("DinoAir Free Tier Installation")
    print("="*60)

    check_python_version()
    check_pip_version()
    
    if not check_ollama():
        sys.exit(1)
    
    nodejs_available = check_nodejs()
    if not nodejs_available:
        print("\nWarning: Node.js/npm not found. Web GUI will not be installed.")
        print("You can install Node.js later and run this installer again.\n")
        
    confirm_installation()

    install_comfyui()
    copy_comfyui_workflows()
    pull_ollama_models()
    
    # Download SDXL models
    models_downloaded = download_sdxl_models()
    
    # Install Web GUI if Node.js is available
    web_gui_installed = False
    if nodejs_available:
        web_gui_installed = install_web_gui()
    
    generate_dependency_log()
    print_summary(models_downloaded, web_gui_installed)

if __name__ == "__main__":
    main()