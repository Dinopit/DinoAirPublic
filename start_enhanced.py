#!/usr/bin/env python3
import asyncio
import sys
import os
from pathlib import Path
import logging
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

# Import our enhanced modules
try:
    from services.service_manager import ServiceManager
    from utils.performance_monitor import PerformanceMonitor
    from config.config_manager import ConfigManager
except ImportError as e:
    print(f"Failed to import enhanced modules: {e}")
    print("Please run the enhanced installation first: python install_enhanced.py")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

class DinoAirLauncher:
    """Enhanced launcher for DinoAir"""
    
    def __init__(self):
        self.config_manager = ConfigManager()
        self.service_manager = ServiceManager()
        self.performance_monitor = PerformanceMonitor()
        
    async def start(self):
        """Start DinoAir with all services"""
        try:
            logger.info("🚀 Starting DinoAir v1.5...")
            
            # Validate configuration
            if not self.config_manager.validate_config():
                logger.error("Configuration validation failed")
                return False
            
            # Start performance monitoring
            monitor_task = asyncio.create_task(
                self.performance_monitor.monitor_loop()
            )
            
            # Start all services
            await self.service_manager.start_all()
            
            # Get service status
            status = self.service_manager.get_service_status()
            
            logger.info("\n✅ DinoAir is running!")
            logger.info(f"\n📌 Access Points:")
            logger.info(f"  Web Interface: http://localhost:3000")
            logger.info(f"  ComfyUI: http://localhost:8188")
            logger.info(f"  Ollama API: http://localhost:11434")
            logger.info(f"\n💡 Press Ctrl+C to stop all services")
            
            # Keep running
            try:
                await asyncio.Event().wait()
            except KeyboardInterrupt:
                logger.info("\n🛑 Shutting down DinoAir...")
                await self.service_manager.stop_all()
                monitor_task.cancel()
                
        except Exception as e:
            logger.error(f"Failed to start DinoAir: {e}", exc_info=True)
            return False
        
        return True

async def main():
    """Main entry point"""
    # Check if system requirements are met
    try:
        import subprocess
        result = subprocess.run([sys.executable, "check_requirements.py"], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ System requirements not met. Running troubleshooter...")
            subprocess.run([sys.executable, "troubleshoot.py"])
            print("\nPlease fix the issues above and try again.")
            return
    except FileNotFoundError:
        print("⚠️  System requirements checker not found. Continuing...")
    
    launcher = DinoAirLauncher()
    success = await launcher.start()
    
    if not success:
        print("\n❌ Failed to start DinoAir. Run troubleshooter for help:")
        print("python troubleshoot.py")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())