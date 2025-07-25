import os
import sys
import subprocess
import json
from importlib import import_module
import platform
import argparse
import shutil

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

def find_npm_command():
    """Finds the npm command by checking common locations."""
    # Try direct command first
    npm_commands = ["npm", "npm.cmd"]
    
    # Common Node.js installation paths
    common_paths = []
    if platform.system() == "Windows":
        common_paths.extend([
            os.path.join(os.environ.get("ProgramFiles", ""), "nodejs"),
            os.path.join(os.environ.get("ProgramFiles(x86)", ""), "nodejs"),
            os.path.join(os.environ.get("APPDATA", ""), "npm"),
            os.path.join(os.environ.get("LOCALAPPDATA", ""), "Programs", "nodejs")
        ])
        npm_commands.extend(["npm.cmd", "npm.exe"])
    else:
        common_paths.extend([
            "/usr/local/bin",
            "/usr/bin",
            "/opt/nodejs/bin",
            os.path.expanduser("~/.nvm/current/bin"),
            os.path.expanduser("~/.npm-global/bin")
        ])
    
    # Try commands in PATH first
    for cmd in npm_commands:
        npm_path = shutil.which(cmd)
        if npm_path:
            return npm_path
    
    # Try common installation paths
    for path in common_paths:
        if os.path.exists(path):
            for cmd in npm_commands:
                npm_path = os.path.join(path, cmd)
                if os.path.exists(npm_path) and os.access(npm_path, os.X_OK):
                    return npm_path
    
    # Try using 'where' or 'which' command
    try:
        if platform.system() == "Windows":
            result = subprocess.run(["where", "npm"], capture_output=True, text=True)
        else:
            result = subprocess.run(["which", "npm"], capture_output=True, text=True)
        
        if result.returncode == 0:
            npm_path = result.stdout.strip().split('\n')[0]
            if npm_path and os.path.exists(npm_path):
                return npm_path
    except:
        pass
    
    return None

def check_node_installation():
    """Check if Node.js is installed and return (success, version_info)."""
    try:
        node_cmd = shutil.which("node") or shutil.which("node.exe")
        if not node_cmd:
            print("Node.js not found in PATH.")
            return False, None
            
        node_result = subprocess.run([node_cmd, "--version"], capture_output=True, text=True)
        if node_result.returncode == 0:
            node_version = node_result.stdout.strip()
            print(f"Node.js {node_version} found.")
            return True, (node_cmd, node_version)
        else:
            return False, None
    except Exception as e:
        print(f"Error checking Node.js: {e}")
        return False, None

def check_npm_installation():
    """Check if npm is installed and return (success, npm_path, version)."""
    try:
        npm_cmd = find_npm_command()
        if not npm_cmd:
            print("npm not found. Searched common installation locations.")
            print("Please ensure Node.js and npm are properly installed.")
            return False, None, None
            
        # Check npm version
        npm_result = subprocess.run([npm_cmd, "--version"], capture_output=True, text=True)
        if npm_result.returncode == 0:
            npm_version = npm_result.stdout.strip()
            print(f"npm {npm_version} found at: {npm_cmd}")
            return True, npm_cmd, npm_version
        else:
            print(f"npm found at {npm_cmd} but couldn't get version.")
            return False, None, None
    except Exception as e:
        print(f"Error checking npm: {e}")
        return False, None, None

def check_nodejs():
    """Checks if Node.js and npm are installed."""
    try:
        # Check Node.js first
        node_success, node_info = check_node_installation()
        if not node_success:
            return False
        
        # Check npm
        npm_success, npm_cmd, npm_version = check_npm_installation()
        if not npm_success:
            return False, None
            
        return True, npm_cmd
            
    except Exception as e:
        print(f"Error checking Node.js/npm: {e}")
        print("Please install Node.js from https://nodejs.org/ and try again.")
        return False, None

def confirm_installation():
    """Asks the user to confirm the installation."""
    prompt = "Warning: This installer will install Qwen 7B Vision, ComfyUI, Web GUI, and related dependencies to your local system. Please confirm to proceed [Y/n] "
    response = input(prompt).lower().strip()
    if response not in ["y", "yes", ""]:
        print("Installation cancelled by user.")
        sys.exit(0)
    return True

def check_comfyui_installation():
    """Check if ComfyUI is already installed and valid. Returns (exists, valid)."""
    comfyui_exists = os.path.exists("ComfyUI")
    comfyui_valid = False
    
    if comfyui_exists:
        # Check for essential files that indicate a proper installation
        required_files = ["requirements.txt", "main.py", "server.py"]
        comfyui_valid = all(os.path.exists(os.path.join("ComfyUI", f)) for f in required_files)
        
        if not comfyui_valid:
            print("ComfyUI directory exists but is empty or incomplete. Removing and re-cloning...")
            shutil.rmtree("ComfyUI", ignore_errors=True)
            comfyui_exists = False
    
    return comfyui_exists, comfyui_valid

def clone_comfyui_repository():
    """Clone the ComfyUI repository with retry logic."""
    print("Cloning ComfyUI repository...")
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            subprocess.run(["git", "clone", "https://github.com/comfyanonymous/ComfyUI.git"],
                         check=True, capture_output=True, text=True)
            print("ComfyUI cloned successfully.")
            return True
        except subprocess.CalledProcessError as clone_error:
            if attempt < max_retries - 1:
                print(f"Clone attempt {attempt + 1} failed: {clone_error}")
                print(f"Retrying in 5 seconds...")
                import time
                time.sleep(5)
            else:
                print(f"Failed to clone ComfyUI after {max_retries} attempts.")
                print("\nError details:")
                print(f"  {clone_error}")
                print("\nPossible solutions:")
                print("  1. Check your internet connection")
                print("  2. Try again later if GitHub is having issues")
                print("  3. Manually clone: git clone https://github.com/comfyanonymous/ComfyUI.git")
                print("  4. Download ComfyUI manually from https://github.com/comfyanonymous/ComfyUI/archive/refs/heads/master.zip")
                print("     and extract it to a 'ComfyUI' folder")
                raise clone_error
    
    return False

def install_comfyui_dependencies():
    """Install ComfyUI dependencies if requirements.txt exists."""
    if os.path.exists("ComfyUI/requirements.txt"):
        pip_args = [sys.executable, "-m", "pip", "install", "-r", "ComfyUI/requirements.txt"]
        subprocess.run(pip_args, check=True)
        print("ComfyUI dependencies installed successfully.")
    else:
        print("Warning: ComfyUI/requirements.txt not found. Skipping dependency installation.")
        print("You may need to install dependencies manually.")

def install_comfyui():
    """Clones ComfyUI and installs its dependencies."""
    print("Installing ComfyUI...")
    try:
        comfyui_exists, comfyui_valid = check_comfyui_installation()
        
        # Clone if directory doesn't exist or was removed
        if not comfyui_exists:
            clone_comfyui_repository()
        else:
            print("ComfyUI already exists with valid installation.")
        
        # Install dependencies
        install_comfyui_dependencies()
        
        print("ComfyUI installation process completed.")
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"Error during ComfyUI installation: {e}")
        sys.exit(1)

def copy_comfyui_workflows():
    """Copies the ComfyUI workflows to the ComfyUI directory."""
    print("Copying ComfyUI workflows...")
    # Fix path resolution
    script_dir = os.path.dirname(os.path.abspath(__file__))
    source_dir = os.path.join(script_dir, "FreeTierPacked")
    
    # Check if source directory exists
    if not os.path.exists(source_dir):
        print(f"Warning: Workflow source directory not found at {source_dir}")
        return False
    
    target_dir = "ComfyUI/workflows"
    
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

def install_web_gui(npm_cmd):
    """Installs the web GUI dependencies."""
    print("\nInstalling Web GUI...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    web_gui_path = os.path.join(script_dir, "web-gui")
    
    if not os.path.exists(web_gui_path):
        print(f"Error: web-gui directory not found at {web_gui_path}!")
        print("Please ensure the installer is run from the correct directory.")
        return False
    
    try:
        # Change to web-gui directory
        original_dir = os.getcwd()
        os.chdir(web_gui_path)
        
        print("Installing npm dependencies (this may take a few minutes)...")
        print(f"Using npm at: {npm_cmd}")
        
        # Use the detected npm command
        subprocess.run([npm_cmd, "install"], check=True)
        
        print("Web GUI dependencies installed successfully.")
        
        # Return to original directory
        os.chdir(original_dir)
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"Error installing Web GUI dependencies: {e}")
        print("\nTroubleshooting:")
        print("1. Check your internet connection")
        print("2. Try running 'npm cache clean --force' and retry")
        print("3. Ensure you have sufficient permissions")
        os.chdir(original_dir)
        return False
    except Exception as e:
        print(f"Unexpected error during Web GUI installation: {e}")
        print(f"Error type: {type(e).__name__}")
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


def parse_command_line_args():
    """Parse and return command line arguments."""
    parser = argparse.ArgumentParser(description="DinoAir Free Tier Installer")
    parser.add_argument("--no-models", action="store_true",
                       help="Skip downloading SDXL and Ollama models")
    return parser.parse_args()

def print_installation_banner(skip_models=False):
    """Print the installation banner."""
    print("="*60)
    print("DinoAir Free Tier Installation")
    print("="*60)
    
    if skip_models:
        print("\n--no-models flag detected: Will skip model downloads")

def validate_system_prerequisites(skip_models=False):
    """Validate system prerequisites and return True if all checks pass."""
    check_python_version()
    check_pip_version()
    
    # Check Ollama if models are needed
    if not check_ollama():
        if not skip_models:
            print("\nError: Ollama is required when --no-models flag is not used.")
            sys.exit(1)
        else:
            print("\nWarning: Ollama not found, but skipping due to --no-models flag.")
    
    return True

def check_and_setup_nodejs():
    """Check Node.js availability and return (available, npm_cmd)."""
    nodejs_result = check_nodejs()
    if isinstance(nodejs_result, tuple):
        nodejs_available, npm_cmd = nodejs_result
    else:
        nodejs_available = nodejs_result
        npm_cmd = None
        
    if not nodejs_available:
        print("\nWarning: Node.js/npm not found. Web GUI will not be installed.")
        print("You can install Node.js later and run this installer again.\n")
    
    return nodejs_available, npm_cmd

def install_core_components():
    """Install core DinoAir components."""
    install_comfyui()
    copy_comfyui_workflows()

def install_models_if_requested(skip_models=False):
    """Install models if not skipping them. Returns True if models were downloaded."""
    if skip_models:
        print("\nSkipping Ollama model pull due to --no-models flag")
        print("Skipping SDXL model download due to --no-models flag")
        return False
    
    pull_ollama_models()
    return download_sdxl_models()

def install_web_gui_if_available(nodejs_available, npm_cmd):
    """Install Web GUI if Node.js is available. Returns True if installed."""
    if nodejs_available and npm_cmd:
        return install_web_gui(npm_cmd)
    return False

def finalize_installation(models_downloaded, web_gui_installed):
    """Generate logs and print installation summary."""
    generate_dependency_log()
    print_summary(models_downloaded, web_gui_installed)

def main():
    """Main function to run the installer."""
    args = parse_command_line_args()
    
    print_installation_banner(args.no_models)
    
    validate_system_prerequisites(args.no_models)
    
    nodejs_available, npm_cmd = check_and_setup_nodejs()
        
    confirm_installation()

    install_core_components()
    
    models_downloaded = install_models_if_requested(args.no_models)
    
    web_gui_installed = install_web_gui_if_available(nodejs_available, npm_cmd)
    
    finalize_installation(models_downloaded, web_gui_installed)

if __name__ == "__main__":
    main()