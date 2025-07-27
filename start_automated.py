"""
Automated DinoAir Launcher - No Unicode Characters
Based on start.py but with simplified output
"""

import os
import sys
import subprocess
import time
import platform
import socket
import webbrowser
from pathlib import Path

# Set encoding for better compatibility
os.environ['PYTHONIOENCODING'] = 'utf-8'

def run_command(command, capture_output=False):
    """Run a command and return success status."""
    try:
        if capture_output:
            result = subprocess.run(command, shell=True, capture_output=True, text=True)
            return result.returncode == 0, result.stdout
        else:
            result = subprocess.run(command, shell=True)
            return result.returncode == 0
    except Exception as e:
        print(f"Error running command: {e}")
        return False

def check_port(port):
    """Check if a port is available."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('', port))
            return True
        except:
            return False

def start_ollama():
    """Start Ollama service."""
    print("\n[INFO] Starting Ollama...")
    
    if platform.system() == "Windows":
        # Try to start Ollama in background
        subprocess.Popen("ollama serve", shell=True, 
                        stdout=subprocess.DEVNULL, 
                        stderr=subprocess.DEVNULL)
    else:
        subprocess.Popen(["ollama", "serve"], 
                        stdout=subprocess.DEVNULL, 
                        stderr=subprocess.DEVNULL)
    
    # Wait for Ollama to start
    time.sleep(3)
    
    # Check if Ollama is running
    success, _ = run_command("ollama list", capture_output=True)
    if success:
        print("[OK] Ollama started successfully")
        return True
    else:
        print("[WARNING] Ollama may not have started properly")
        return False

def start_comfyui():
    """Start ComfyUI service."""
    print("\n[INFO] Starting ComfyUI...")
    
    comfyui_path = Path("ComfyUI")
    if not comfyui_path.exists():
        print("[ERROR] ComfyUI directory not found")
        return None
    
    # Start ComfyUI
    if platform.system() == "Windows":
        process = subprocess.Popen(
            [sys.executable, "main.py", "--listen", "0.0.0.0", "--port", "8188"],
            cwd=comfyui_path,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    else:
        process = subprocess.Popen(
            [sys.executable, "main.py", "--listen", "0.0.0.0", "--port", "8188"],
            cwd=comfyui_path,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    
    print("[OK] ComfyUI started on port 8188")
    return process

def start_webgui():
    """Start Web GUI service."""
    print("\n[INFO] Starting Web GUI...")
    
    webgui_path = Path("web-gui-node")
    if not webgui_path.exists():
        print("[ERROR] Web GUI directory not found")
        return None
    
    # Start Web GUI
    if platform.system() == "Windows":
        process = subprocess.Popen(
            "npm start",
            shell=True,
            cwd=webgui_path,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    else:
        process = subprocess.Popen(
            ["npm", "start"],
            cwd=webgui_path,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    
    print("[OK] Web GUI started on port 3000")
    return process

def main():
    print("=== DinoAir Automated Launcher ===")
    print("Starting all services...")
    
    # Check ports
    print("\n[INFO] Checking port availability...")
    ports = {
        3000: "Web GUI",
        8188: "ComfyUI",
        11434: "Ollama"
    }
    
    for port, service in ports.items():
        if not check_port(port):
            print(f"[WARNING] Port {port} ({service}) is already in use")
    
    # Start services
    processes = []
    
    # Start Ollama
    start_ollama()
    
    # Start ComfyUI
    comfyui_process = start_comfyui()
    if comfyui_process:
        processes.append(comfyui_process)
    
    # Start Web GUI
    webgui_process = start_webgui()
    if webgui_process:
        processes.append(webgui_process)
    
    # Wait a bit for services to fully start
    print("\n[INFO] Waiting for services to initialize...")
    time.sleep(5)
    
    # Open browser
    print("\n[INFO] Opening browser...")
    webbrowser.open("http://localhost:3000")
    
    print("\n=== DinoAir is running! ===")
    print("\nAccess points:")
    print("  Web GUI: http://localhost:3000")
    print("  ComfyUI: http://localhost:8188")
    print("  Ollama:  http://localhost:11434")
    print("\nPress Ctrl+C to stop all services")
    
    # Keep running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n[INFO] Shutting down services...")
        
        # Terminate processes
        for process in processes:
            try:
                process.terminate()
            except:
                pass
        
        # Stop Ollama
        if platform.system() == "Windows":
            subprocess.run("taskkill /F /IM ollama.exe", shell=True, 
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            subprocess.run(["pkill", "ollama"], 
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        
        print("[OK] All services stopped")

if __name__ == "__main__":
    main()