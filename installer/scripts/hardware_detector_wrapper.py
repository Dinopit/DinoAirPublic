#!/usr/bin/env python3
"""
Hardware Detector Wrapper for DinoAir Installer
This wrapper ensures the hardware detector can run from the bundled installer
"""

import sys
import os
import json
import subprocess

def setup_python_path():
    """Add the lib directory to Python path"""
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # In the bundled app, the lib directory should be at ../lib relative to this script
    # In development, it might be at ../../lib
    possible_paths = [
        os.path.join(script_dir, '..', 'lib'),
        os.path.join(script_dir, '..', '..', 'lib'),
        os.path.join(script_dir, '..', 'resources', 'lib'),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            sys.path.insert(0, os.path.abspath(path))
            break

def detect_hardware():
    """Run hardware detection and return JSON result"""
    try:
        setup_python_path()
        
        # Import the hardware detector
        from hardware_detection.hardware_detector import HardwareDetector
        
        # Create detector instance
        detector = HardwareDetector()
        
        # Detect hardware
        profile = detector.detect_all()
        
        # Convert to simplified format for the installer
        result = {
            'success': True,
            'data': {
                'cpu': {
                    'name': profile.cpu.name,
                    'cores': profile.cpu.cores_physical,
                    'threads': profile.cpu.cores_logical,
                    'frequency': profile.cpu.frequency_max
                },
                'ram': {
                    'total_gb': round(profile.ram_total / 1024, 1),
                    'available_gb': round(profile.ram_available / 1024, 1)
                },
                'gpu': {
                    'devices': [gpu.name for gpu in profile.gpus],
                    'cuda_available': any(gpu.cuda_available for gpu in profile.gpus),
                    'total_vram_gb': sum(gpu.memory_total for gpu in profile.gpus) / 1024 if profile.gpus else 0
                },
                'system': {
                    'platform': profile.platform,
                    'os': profile.system,
                    'tier': profile.hardware_tier
                }
            }
        }
        
        return result
        
    except ImportError as e:
        # Try to install required packages
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'psutil', 'GPUtil'])
            # Retry after installation
            return detect_hardware()
        except:
            return {
                'success': False,
                'error': f'Missing required packages: {str(e)}',
                'data': get_fallback_hardware()
            }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'data': get_fallback_hardware()
        }

def get_fallback_hardware():
    """Get basic hardware info using only standard library"""
    import platform
    import multiprocessing
    
    try:
        # Basic CPU info
        cpu_count = multiprocessing.cpu_count()
        
        # Basic memory estimate (very rough)
        # On Windows, we can try WMI
        total_ram = 8  # Default 8GB
        if sys.platform == 'win32':
            try:
                import subprocess
                result = subprocess.run(
                    ['wmic', 'computersystem', 'get', 'TotalPhysicalMemory'],
                    capture_output=True, text=True
                )
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    if len(lines) > 1:
                        total_ram = int(int(lines[1]) / (1024**3))
            except:
                pass
        
        return {
            'cpu': {
                'name': platform.processor() or 'Unknown CPU',
                'cores': cpu_count,
                'threads': cpu_count,
                'frequency': 0.0
            },
            'ram': {
                'total_gb': total_ram,
                'available_gb': int(total_ram * 0.5)
            },
            'gpu': {
                'devices': [],
                'cuda_available': False,
                'total_vram_gb': 0
            },
            'system': {
                'platform': platform.machine(),
                'os': platform.system(),
                'tier': 'low'
            }
        }
    except:
        # Ultimate fallback
        return {
            'cpu': {
                'name': 'Unknown CPU',
                'cores': 4,
                'threads': 4,
                'frequency': 0.0
            },
            'ram': {
                'total_gb': 8,
                'available_gb': 4
            },
            'gpu': {
                'devices': [],
                'cuda_available': False,
                'total_vram_gb': 0
            },
            'system': {
                'platform': 'unknown',
                'os': 'unknown',
                'tier': 'low'
            }
        }

if __name__ == '__main__':
    # Detect hardware and output JSON
    result = detect_hardware()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result['success'] else 1)