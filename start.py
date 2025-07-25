#!/usr/bin/env python3
import os
import sys
import subprocess
import time
import webbrowser
import platform
import signal
import atexit
import socket
import json
from pathlib import Path

# Track running processes
running_processes = []

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_error(message):
    """Print error message in red."""
    print(f"{Colors.RED}❌ ERROR: {message}{Colors.END}")

def print_warning(message):
    """Print warning message in yellow."""
    print(f"{Colors.YELLOW}⚠️  WARNING: {message}{Colors.END}")

def print_success(message):
    """Print success message in green."""
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_info(message):
    """Print info message in blue."""
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")

def cleanup():
    """Clean up running processes on exit."""
    print("\nShutting down services...")
    for process in running_processes:
        try:
            if platform.system() == "Windows":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(process.pid)], capture_output=True)
            else:
                os.killpg(os.getpgid(process.pid), signal.SIGTERM)
        except:
            pass
    print("Services stopped.")

# Register cleanup function
atexit.register(cleanup)

def signal_handler(sig, frame):
    """Handle Ctrl+C gracefully."""
    print("\nReceived interrupt signal...")
    cleanup()
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def check_python_version():
    """Check if Python version is 3.10 or higher."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print_error(f"Python 3.10 or higher is required. You have Python {version.major}.{version.minor}.{version.micro}")
        print_info("Please install Python 3.10+ from https://www.python.org/downloads/")
        return False
    return True

def check_port(port):
    """Check if a port is available."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex(('localhost', port))
            return result != 0
    except Exception as e:
        print_warning(f"Could not check port {port}: {e}")
        return True  # Assume port is available if check fails

def find_process_on_port(port):
    """Find which process is using a port."""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True,
                text=True,
                shell=True
            )
            for line in result.stdout.split('\n'):
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.split()
                    if len(parts) >= 5:
                        return parts[-1]  # PID
        else:
            result = subprocess.run(
                ["lsof", "-t", f"-i:{port}"],
                capture_output=True,
                text=True
            )
            if result.stdout.strip():
                return result.stdout.strip()
    except:
        pass
    return None

def check_nodejs():
    """Check if Node.js and npm are installed."""
    try:
        # Check Node.js
        node_result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True
        )
        if node_result.returncode != 0:
            return False, "Node.js"
        
        # Check npm
        npm_cmd = "npm.cmd" if platform.system() == "Windows" else "npm"
        npm_result = subprocess.run(
            [npm_cmd, "--version"],
            capture_output=True,
            text=True
        )
        if npm_result.returncode != 0:
            return False, "npm"
            
        return True, None
    except FileNotFoundError:
        return False, "Node.js"

def start_comfyui():
    """Start ComfyUI server."""
    print_info("Starting ComfyUI...")
    comfyui_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ComfyUI")
    
    if not os.path.exists(comfyui_path):
        print_error("ComfyUI not found!")
        print_info("Please run 'python install.py' first to set up ComfyUI.")
        return None
    
    # Check if main.py exists
    main_py = os.path.join(comfyui_path, "main.py")
    if not os.path.exists(main_py):
        print_error(f"ComfyUI main.py not found at {main_py}")
        print_info("ComfyUI installation may be corrupted. Please run install.py again.")
        return None
    
    try:
        # Check if port 8188 is available
        if not check_port(8188):
            pid = find_process_on_port(8188)
            if pid:
                print_warning(f"Port 8188 is already in use by process {pid}")
            print_info("ComfyUI appears to be already running.")
            print_info("You can access it at http://localhost:8188")
            return None
            
        # Start ComfyUI
        if platform.system() == "Windows":
            process = subprocess.Popen(
                [sys.executable, "main.py", "--listen", "127.0.0.1"],
                cwd=comfyui_path,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
        else:
            process = subprocess.Popen(
                [sys.executable, "main.py", "--listen", "127.0.0.1"],
                cwd=comfyui_path,
                preexec_fn=os.setsid
            )
        
        print_success("ComfyUI started on http://localhost:8188")
        return process
    except subprocess.SubprocessError as e:
        print_error(f"Failed to start ComfyUI: {e}")
        print_info("Please check if Python is properly installed and in PATH.")
        return None
    except Exception as e:
        print_error(f"Unexpected error starting ComfyUI: {e}")
        return None

def check_ollama():
    """Check if Ollama is running and start if needed."""
    print_info("Checking Ollama...")
    try:
        # Check if Ollama is installed
        check_result = subprocess.run(
            ["ollama", "--version"],
            capture_output=True,
            text=True
        )
        if check_result.returncode != 0:
            raise FileNotFoundError
            
        # Check if Ollama is running
        result = subprocess.run(["ollama", "list"], capture_output=True, text=True)
        if result.returncode == 0:
            print_success("Ollama is running.")
            
            # Check if any models are installed
            if "NAME" in result.stdout and len(result.stdout.strip().split('\n')) > 1:
                print_success("Ollama models are available.")
            else:
                print_warning("No Ollama models found.")
                print_info("Run 'ollama pull llama2' to download a model.")
            return True
        else:
            print_info("Starting Ollama service...")
            if platform.system() == "Windows":
                subprocess.Popen(["ollama", "serve"], 
                               creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                               stdout=subprocess.DEVNULL, 
                               stderr=subprocess.DEVNULL)
            else:
                subprocess.Popen(["ollama", "serve"],
                               stdout=subprocess.DEVNULL,
                               stderr=subprocess.DEVNULL)
            # Wait for Ollama to start
            for i in range(5):
                time.sleep(1)
                check = subprocess.run(["ollama", "list"], capture_output=True, text=True)
                if check.returncode == 0:
                    print_success("Ollama service started successfully.")
                    return True
            
            print_warning("Ollama service is taking longer than expected to start.")
            return True
            
    except FileNotFoundError:
        print_error("Ollama not found!")
        print_info("Please install Ollama from https://ollama.ai/")
        print_info("After installation, run 'ollama pull llama2' to download a model.")
        return False
    except Exception as e:
        print_error(f"Unexpected error checking Ollama: {e}")
        return False

def start_web_gui():
    """Start the Next.js web GUI."""
    print("Starting Web GUI...")
    web_gui_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web-gui")
    
    if not os.path.exists(web_gui_path):
        print("Error: Web GUI not found. Please run install.py first.")
        return None
    
    # Check if node_modules exists
    node_modules = os.path.join(web_gui_path, "node_modules")
    if not os.path.exists(node_modules):
        print("Error: Web GUI dependencies not installed. Please run install.py first.")
        return None
    
    try:
        # Check if port 3000 is available
        if not check_port(3000):
            print("Web GUI appears to be already running on port 3000")
            return None
            
        # Start Next.js
        if platform.system() == "Windows":
            npm_cmd = "npm.cmd"
            process = subprocess.Popen(
                [npm_cmd, "run", "dev"],
                cwd=web_gui_path,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
            )
        else:
            npm_cmd = "npm"
            process = subprocess.Popen(
                [npm_cmd, "run", "dev"],
                cwd=web_gui_path,
                preexec_fn=os.setsid
            )
        
        print("Web GUI starting on http://localhost:3000")
        return process
    except Exception as e:
        print(f"Error starting Web GUI: {e}")
        return None

def open_browser():
    """Open the browser to the Web GUI."""
    print("\nWaiting for services to initialize...")
    time.sleep(5)  # Give services time to start
    
    # Wait for the web server to be ready
    max_attempts = 30
    for i in range(max_attempts):
        if not check_port(3000):
            print("\nOpening browser to http://localhost:3000")
            webbrowser.open("http://localhost:3000")
            break
        time.sleep(1)
    else:
        print("\nWeb GUI did not start in time. Please open http://localhost:3000 manually.")

def print_startup_banner():
    """Print the DinoAir startup banner."""
    print("="*60)
    print("DinoAir Free Tier Launcher")
    print("="*60)

def validate_prerequisites():
    """Validate that all required prerequisites are available."""
    if not check_ollama():
        print("\nCannot proceed without Ollama. Exiting...")
        sys.exit(1)

def start_services():
    """Start all DinoAir services and return True if any were started."""
    services_started = False
    
    # Start ComfyUI
    comfyui_process = start_comfyui()
    if comfyui_process:
        running_processes.append(comfyui_process)
        services_started = True
    
    # Give ComfyUI time to start
    time.sleep(3)
    
    # Start Web GUI
    web_gui_process = start_web_gui()
    if web_gui_process:
        running_processes.append(web_gui_process)
        services_started = True
    
    return services_started

def print_running_banner():
    """Print the banner showing services are running."""
    print("\n" + "="*60)
    print("DinoAir Free Tier is running!")
    print("="*60)
    print("\nServices:")
    print("  - Web GUI: http://localhost:3000")
    print("  - ComfyUI: http://localhost:8188")
    print("  - Ollama: Running in background")
    print("\nPress Ctrl+C to stop all services.")
    print("="*60)

def monitor_services():
    """Monitor running services and exit when all have stopped."""
    try:
        # Keep the script running
        while True:
            time.sleep(1)
            # Check if processes are still running
            for process in running_processes[:]:
                if process.poll() is not None:
                    running_processes.remove(process)
            
            if not running_processes:
                print("\nAll services have stopped.")
                break
                
    except KeyboardInterrupt:
        pass

def main():
    """Main function to start all services."""
    print_startup_banner()
    
    validate_prerequisites()
    
    services_started = start_services()
    
    if not services_started:
        print("\nNo services were started. They may already be running.")
        print("You can access the Web GUI at http://localhost:3000")
        sys.exit(0)
    
    # Open browser
    open_browser()
    
    print_running_banner()
    
    monitor_services()

if __name__ == "__main__":
    main()