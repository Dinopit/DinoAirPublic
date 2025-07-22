"""
DinoAir SDXL Model Downloader
Automated download solution for SDXL models with progress tracking, resume capability, and mirror support.
"""

import os
import sys
import time
import hashlib
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

try:
    import requests
    from tqdm import tqdm
except ImportError:
    print("Error: Required packages not found. Please install: pip install requests tqdm")
    sys.exit(1)


class ModelDownloader:
    """Handles downloading of SDXL models with progress tracking and resume capability."""
    
    # Model configurations with multiple mirror options
    MODELS = {
        "sd_xl_base_1.0.safetensors": {
            "size": 6938078334,  # ~6.94GB
            "sha256": "31e35c80fc4829d14f90153f4c74cd59c90b779f6afe05a74cd6120b893f7e5b",
            "mirrors": [
                {
                    "name": "HuggingFace",
                    "url": "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors",
                    "headers": {}
                },
                # Add CivitAI mirror if available
                # {
                #     "name": "CivitAI",
                #     "url": "https://civitai.com/api/download/models/...",
                #     "headers": {"Authorization": "Bearer YOUR_API_KEY"}  # Optional API key
                # }
            ]
        },
        "sdxl_vae.safetensors": {
            "size": 334643268,  # ~335MB
            "sha256": "63aeecb90ff9e1fb3b1c7d8c7bbfd68d8b5b37e72ba80a3ff0d1c45c2db40f5f",
            "mirrors": [
                {
                    "name": "HuggingFace",
                    "url": "https://huggingface.co/stabilityai/sdxl-vae/resolve/main/sdxl_vae.safetensors",
                    "headers": {}
                }
            ]
        },
        # Optional: SDXL Refiner (commented out by default to save bandwidth)
        # "sd_xl_refiner_1.0.safetensors": {
        #     "size": 6075981930,  # ~6.08GB
        #     "sha256": "7440042bbdc8a24813002c09b6b69b64dc90fded4472613437b7f55f9b7d9c5f",
        #     "mirrors": [
        #         {
        #             "name": "HuggingFace",
        #             "url": "https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0/resolve/main/sd_xl_refiner_1.0.safetensors",
        #             "headers": {}
        #         }
        #     ]
        # }
    }
    
    def __init__(self, models_dir: str = "ComfyUI/models/checkpoints", chunk_size: int = 8192 * 1024):
        """
        Initialize the ModelDownloader.
        
        Args:
            models_dir: Directory to save models
            chunk_size: Download chunk size (default: 8MB)
        """
        self.models_dir = Path(models_dir)
        self.chunk_size = chunk_size
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'DinoAir/1.0 (https://github.com/yourusername/DinoAir)'
        })
        
    def ensure_models_directory(self):
        """Create models directory if it doesn't exist."""
        self.models_dir.mkdir(parents=True, exist_ok=True)
        print(f"Models directory: {self.models_dir.absolute()}")
        
    def format_bytes(self, bytes: int) -> str:
        """Format bytes to human readable string."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes < 1024.0:
                return f"{bytes:.2f} {unit}"
            bytes /= 1024.0
        return f"{bytes:.2f} PB"
        
    def format_time(self, seconds: float) -> str:
        """Format seconds to human readable string."""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            secs = int(seconds % 60)
            return f"{minutes}m {secs}s"
        else:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            return f"{hours}h {minutes}m"
            
    def calculate_checksum(self, filepath: Path, algorithm: str = "sha256") -> str:
        """Calculate file checksum."""
        hash_func = hashlib.new(algorithm)
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(8192 * 1024), b''):
                hash_func.update(chunk)
        return hash_func.hexdigest()
        
    def verify_file(self, filepath: Path, expected_size: int, expected_hash: str) -> bool:
        """Verify downloaded file integrity."""
        if not filepath.exists():
            return False
            
        # Check file size
        actual_size = filepath.stat().st_size
        if actual_size != expected_size:
            print(f"Size mismatch: expected {expected_size}, got {actual_size}")
            return False
            
        # Check hash
        print(f"Verifying checksum for {filepath.name}...")
        actual_hash = self.calculate_checksum(filepath)
        if actual_hash.lower() != expected_hash.lower():
            print(f"Checksum mismatch: expected {expected_hash}, got {actual_hash}")
            return False
            
        return True
        
    def download_with_progress(self, url: str, filepath: Path, headers: Dict = None, 
                             expected_size: int = None, resume: bool = True) -> bool:
        """
        Download file with progress bar and resume capability.
        
        Returns:
            bool: True if download successful, False otherwise
        """
        temp_filepath = filepath.with_suffix(filepath.suffix + '.tmp')
        
        # Check if we can resume
        resume_pos = 0
        if resume and temp_filepath.exists():
            resume_pos = temp_filepath.stat().st_size
            
        # Prepare headers
        req_headers = headers.copy() if headers else {}
        if resume_pos > 0:
            req_headers['Range'] = f'bytes={resume_pos}-'
            
        try:
            response = self.session.get(url, headers=req_headers, stream=True, timeout=30)
            response.raise_for_status()
            
            # Get total size
            total_size = int(response.headers.get('content-length', 0))
            if resume_pos > 0:
                total_size += resume_pos
                
            # Validate expected size
            if expected_size and total_size != expected_size:
                print(f"Warning: Server reports different file size ({total_size} vs {expected_size})")
                
            # Setup progress bar
            mode = 'ab' if resume_pos > 0 else 'wb'
            with open(temp_filepath, mode) as f:
                with tqdm(total=total_size, initial=resume_pos, unit='B', 
                         unit_scale=True, desc=filepath.name) as pbar:
                    
                    start_time = time.time()
                    downloaded = resume_pos
                    
                    for chunk in response.iter_content(chunk_size=self.chunk_size):
                        if chunk:
                            f.write(chunk)
                            chunk_size = len(chunk)
                            downloaded += chunk_size
                            pbar.update(chunk_size)
                            
                            # Calculate speed and ETA
                            elapsed = time.time() - start_time
                            if elapsed > 0:
                                speed = (downloaded - resume_pos) / elapsed
                                remaining = total_size - downloaded
                                eta = remaining / speed if speed > 0 else 0
                                
                                pbar.set_postfix({
                                    'speed': f'{self.format_bytes(speed)}/s',
                                    'eta': self.format_time(eta)
                                })
                                
            # Move temp file to final location
            temp_filepath.rename(filepath)
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"\nDownload error: {e}")
            return False
        except KeyboardInterrupt:
            print("\nDownload interrupted by user")
            return False
        except Exception as e:
            print(f"\nUnexpected error: {e}")
            return False
            
    def download_model(self, model_name: str, model_config: Dict, mirror_index: int = 0) -> bool:
        """
        Download a single model with retry logic.
        
        Returns:
            bool: True if download successful, False otherwise
        """
        filepath = self.models_dir / model_name
        
        # Check if already downloaded and valid
        if filepath.exists():
            print(f"\nChecking existing {model_name}...")
            if self.verify_file(filepath, model_config['size'], model_config['sha256']):
                print(f"✓ {model_name} already downloaded and verified")
                return True
            else:
                print(f"✗ {model_name} exists but failed verification, re-downloading...")
                
        # Try mirrors in order
        mirrors = model_config['mirrors']
        for i in range(mirror_index, len(mirrors)):
            mirror = mirrors[i]
            print(f"\nDownloading {model_name} from {mirror['name']}...")
            print(f"File size: {self.format_bytes(model_config['size'])}")
            
            success = self.download_with_progress(
                url=mirror['url'],
                filepath=filepath,
                headers=mirror.get('headers', {}),
                expected_size=model_config['size']
            )
            
            if success:
                # Verify download
                if self.verify_file(filepath, model_config['size'], model_config['sha256']):
                    print(f"✓ {model_name} downloaded and verified successfully")
                    return True
                else:
                    print(f"✗ {model_name} download corrupted, trying next mirror...")
                    filepath.unlink(missing_ok=True)
            else:
                # Try next mirror
                if i < len(mirrors) - 1:
                    print(f"Trying mirror {i + 2} of {len(mirrors)}...")
                    
        return False
        
    def download_all_models(self, models: List[str] = None) -> Tuple[List[str], List[str]]:
        """
        Download all specified models.
        
        Args:
            models: List of model names to download (None = all models)
            
        Returns:
            Tuple of (successful_downloads, failed_downloads)
        """
        self.ensure_models_directory()
        
        if models is None:
            models = list(self.MODELS.keys())
            
        successful = []
        failed = []
        
        print(f"\nPreparing to download {len(models)} model(s)...")
        total_size = sum(self.MODELS[m]['size'] for m in models if m in self.MODELS)
        print(f"Total download size: {self.format_bytes(total_size)}")
        
        for model_name in models:
            if model_name not in self.MODELS:
                print(f"Warning: Unknown model {model_name}, skipping...")
                continue
                
            if self.download_model(model_name, self.MODELS[model_name]):
                successful.append(model_name)
            else:
                failed.append(model_name)
                
        return successful, failed


def interactive_download():
    """Interactive download process with user prompts."""
    print("=" * 60)
    print("DinoAir SDXL Model Downloader")
    print("=" * 60)
    
    downloader = ModelDownloader()
    
    # Show available models
    print("\nAvailable models:")
    total_size = 0
    for i, (name, config) in enumerate(downloader.MODELS.items(), 1):
        size = config['size']
        total_size += size
        print(f"{i}. {name} ({downloader.format_bytes(size)})")
        
    print(f"\nTotal size if all models downloaded: {downloader.format_bytes(total_size)}")
    
    # Ask user which models to download
    print("\nWhich models would you like to download?")
    print("1. All models")
    print("2. Essential models only (base + VAE)")
    print("3. Skip model download")
    
    choice = input("\nEnter your choice (1-3) [2]: ").strip() or "2"
    
    if choice == "1":
        models_to_download = list(downloader.MODELS.keys())
    elif choice == "2":
        models_to_download = ["sd_xl_base_1.0.safetensors", "sdxl_vae.safetensors"]
    elif choice == "3":
        print("\nSkipping model download. You'll need to manually place models in:")
        print(f"{downloader.models_dir.absolute()}")
        return
    else:
        print("Invalid choice, using default (essential models only)")
        models_to_download = ["sd_xl_base_1.0.safetensors", "sdxl_vae.safetensors"]
        
    # Start download
    start_time = time.time()
    successful, failed = downloader.download_all_models(models_to_download)
    elapsed = time.time() - start_time
    
    # Summary
    print("\n" + "=" * 60)
    print("Download Summary")
    print("=" * 60)
    print(f"Time elapsed: {downloader.format_time(elapsed)}")
    print(f"Successful downloads: {len(successful)}")
    if successful:
        for model in successful:
            print(f"  ✓ {model}")
    print(f"Failed downloads: {len(failed)}")
    if failed:
        for model in failed:
            print(f"  ✗ {model}")
            
    if failed:
        print("\nTo retry failed downloads, run this script again.")
        print("The downloader will resume interrupted downloads automatically.")
        
    print(f"\nModels are saved in: {downloader.models_dir.absolute()}")
    

if __name__ == "__main__":
    try:
        interactive_download()
    except KeyboardInterrupt:
        print("\n\nDownload cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)