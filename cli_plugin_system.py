#!/usr/bin/env python3
"""
CLI Installer Plugin System
Implements a plugin system for custom installation steps in the DinoAir CLI installer.
"""

import importlib.util
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from pathlib import Path
from dataclasses import dataclass
from enum import Enum

class PluginStatus(Enum):
    """Plugin execution status."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"

@dataclass
class PluginResult:
    """Result of plugin execution."""
    status: PluginStatus
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[Exception] = None

class InstallationContext:
    """Context object passed to plugins during installation."""
    
    def __init__(self):
        self.system_info = {}
        self.installation_config = {}
        self.shared_data = {}
        self.logger = None
        self.telemetry_collector = None
        
    def set_system_info(self, info: Dict[str, Any]):
        """Set system information."""
        self.system_info = info
        
    def set_config(self, config: Dict[str, Any]):
        """Set installation configuration."""
        self.installation_config = config
        
    def set_logger(self, logger):
        """Set logger instance."""
        self.logger = logger
        
    def set_telemetry_collector(self, collector):
        """Set telemetry collector."""
        self.telemetry_collector = collector
        
    def get_shared_data(self, key: str, default=None):
        """Get shared data between plugins."""
        return self.shared_data.get(key, default)
        
    def set_shared_data(self, key: str, value: Any):
        """Set shared data for other plugins."""
        self.shared_data[key] = value

class BasePlugin(ABC):
    """Base class for all CLI installer plugins."""
    
    def __init__(self):
        self.name = self.__class__.__name__
        self.version = "1.0.0"
        self.description = ""
        self.dependencies = []
        self.priority = 100  # Lower numbers run first
        
    @abstractmethod
    def can_run(self, context: InstallationContext) -> bool:
        """Check if the plugin can run in the current context."""
        pass
        
    @abstractmethod
    def execute(self, context: InstallationContext) -> PluginResult:
        """Execute the plugin's installation step."""
        pass
        
    def get_metadata(self) -> Dict[str, Any]:
        """Get plugin metadata."""
        return {
            'name': self.name,
            'version': self.version,
            'description': self.description,
            'dependencies': self.dependencies,
            'priority': self.priority
        }

class PluginManager:
    """Manages CLI installer plugins."""
    
    def __init__(self, plugin_dir: Optional[str] = None):
        self.plugin_dir = Path(plugin_dir) if plugin_dir else Path(__file__).parent / "plugins"
        self.plugins: List[BasePlugin] = []
        self.plugin_results: Dict[str, PluginResult] = {}
        self.context = InstallationContext()
        
    def discover_plugins(self) -> List[str]:
        """Discover available plugin files."""
        plugin_files = []
        
        if not self.plugin_dir.exists():
            return plugin_files
            
        # Look for Python files in the plugins directory
        for plugin_file in self.plugin_dir.glob("*.py"):
            if plugin_file.name.startswith("__"):
                continue
            plugin_files.append(str(plugin_file))
            
        return plugin_files
        
    def load_plugin(self, plugin_path: str) -> Optional[BasePlugin]:
        """Load a single plugin from file."""
        try:
            plugin_name = Path(plugin_path).stem
            spec = importlib.util.spec_from_file_location(plugin_name, plugin_path)
            if spec is None or spec.loader is None:
                return None
                
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            # Look for plugin classes that inherit from BasePlugin
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (isinstance(attr, type) and 
                    issubclass(attr, BasePlugin) and 
                    attr != BasePlugin):
                    return attr()
                    
        except Exception as e:
            print(f"Error loading plugin {plugin_path}: {e}")
            
        return None
        
    def load_all_plugins(self) -> int:
        """Load all discovered plugins."""
        plugin_files = self.discover_plugins()
        loaded_count = 0
        
        for plugin_file in plugin_files:
            plugin = self.load_plugin(plugin_file)
            if plugin:
                self.plugins.append(plugin)
                loaded_count += 1
                
        # Sort plugins by priority
        self.plugins.sort(key=lambda p: p.priority)
        
        return loaded_count
        
    def get_runnable_plugins(self) -> List[BasePlugin]:
        """Get plugins that can run in the current context."""
        runnable = []
        
        for plugin in self.plugins:
            try:
                if plugin.can_run(self.context):
                    runnable.append(plugin)
            except Exception as e:
                print(f"Error checking if plugin {plugin.name} can run: {e}")
                
        return runnable
        
    def execute_plugin(self, plugin: BasePlugin) -> PluginResult:
        """Execute a single plugin."""
        try:
            if self.context.logger:
                self.context.logger(f"Executing plugin: {plugin.name}")
                
            result = plugin.execute(self.context)
            
            if self.context.telemetry_collector:
                self.context.telemetry_collector.record_installation_step(
                    f"plugin_{plugin.name}",
                    result.status.value,
                    {"plugin_metadata": plugin.get_metadata()}
                )
                
            return result
            
        except Exception as e:
            error_result = PluginResult(
                status=PluginStatus.FAILED,
                message=f"Plugin execution failed: {str(e)}",
                error=e
            )
            
            if self.context.telemetry_collector:
                self.context.telemetry_collector.record_error(
                    e, 
                    {"plugin_name": plugin.name},
                    f"plugin_{plugin.name}"
                )
                
            return error_result
            
    def execute_all_plugins(self) -> Dict[str, PluginResult]:
        """Execute all runnable plugins."""
        runnable_plugins = self.get_runnable_plugins()
        
        for plugin in runnable_plugins:
            result = self.execute_plugin(plugin)
            self.plugin_results[plugin.name] = result
            
            # Stop execution if a critical plugin fails
            if result.status == PluginStatus.FAILED and hasattr(plugin, 'critical'):
                if getattr(plugin, 'critical', False):
                    break
                    
        return self.plugin_results
        
    def get_plugin_results(self) -> Dict[str, PluginResult]:
        """Get results of plugin execution."""
        return self.plugin_results.copy()
        
    def create_plugin_template(self, plugin_name: str, plugin_path: Optional[str] = None) -> str:
        """Create a template plugin file."""
        if plugin_path is None:
            plugin_path = self.plugin_dir / f"{plugin_name.lower()}_plugin.py"
        else:
            plugin_path = Path(plugin_path)
            
        template = f'''#!/usr/bin/env python3
"""
{plugin_name} Plugin for DinoAir CLI Installer
"""

from cli_plugin_system import BasePlugin, InstallationContext, PluginResult, PluginStatus

class {plugin_name}Plugin(BasePlugin):
    """Custom plugin for {plugin_name} functionality."""
    
    def __init__(self):
        super().__init__()
        self.name = "{plugin_name}"
        self.version = "1.0.0"
        self.description = "Custom plugin for {plugin_name} functionality"
        self.dependencies = []  # List of required plugins
        self.priority = 100  # Execution priority (lower runs first)
        self.critical = False  # Set to True if failure should stop installation
        
    def can_run(self, context: InstallationContext) -> bool:
        """Check if the plugin can run in the current context."""
        # Add your conditions here
        # Example: return context.system_info.get('platform') == 'linux'
        return True
        
    def execute(self, context: InstallationContext) -> PluginResult:
        """Execute the plugin's installation step."""
        try:
            # Add your plugin logic here
            
            # Example: Access system info
            # platform = context.system_info.get('platform')
            
            # Example: Access configuration
            # config_value = context.installation_config.get('some_setting')
            
            # Example: Share data with other plugins
            # context.set_shared_data('my_plugin_data', {{'key': 'value'}})
            
            # Example: Get shared data from other plugins
            # other_data = context.get_shared_data('other_plugin_data')
            
            # Example: Log messages
            # if context.logger:
            #     context.logger(f"{{self.name}}: Doing something...")
            
            # Your implementation here
            message = f"{{self.name}} executed successfully"
            
            return PluginResult(
                status=PluginStatus.SUCCESS,
                message=message,
                data={{'result': 'success'}}
            )
            
        except Exception as e:
            return PluginResult(
                status=PluginStatus.FAILED,
                message=f"{{self.name}} failed: {{str(e)}}",
                error=e
            )
'''
        
        # Create plugin directory if it doesn't exist
        plugin_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write template to file
        with open(plugin_path, 'w', encoding='utf-8') as f:
            f.write(template)
            
        return str(plugin_path)

# Example built-in plugins

class SystemValidationPlugin(BasePlugin):
    """Plugin to validate system requirements."""
    
    def __init__(self):
        super().__init__()
        self.name = "SystemValidation"
        self.version = "1.0.0"
        self.description = "Validates system requirements before installation"
        self.priority = 10  # Run early
        self.critical = True  # Stop installation if this fails
        
    def can_run(self, context: InstallationContext) -> bool:
        """Always run system validation."""
        return True
        
    def execute(self, context: InstallationContext) -> PluginResult:
        """Validate system requirements."""
        try:
            # Check available disk space
            import shutil
            free_space = shutil.disk_usage('.').free / (1024**3)  # GB
            
            if free_space < 5:  # Require at least 5GB
                return PluginResult(
                    status=PluginStatus.FAILED,
                    message=f"Insufficient disk space: {free_space:.1f}GB available, 5GB required"
                )
                
            # Store validation results for other plugins
            context.set_shared_data('system_validation', {
                'free_space_gb': free_space,
                'validated': True
            })
            
            return PluginResult(
                status=PluginStatus.SUCCESS,
                message=f"System validation passed (Free space: {free_space:.1f}GB)",
                data={'free_space_gb': free_space}
            )
            
        except Exception as e:
            return PluginResult(
                status=PluginStatus.FAILED,
                message=f"System validation failed: {str(e)}",
                error=e
            )

class CustomModelDownloadPlugin(BasePlugin):
    """Plugin to download custom AI models."""
    
    def __init__(self):
        super().__init__()
        self.name = "CustomModelDownload"
        self.version = "1.0.0"
        self.description = "Downloads custom AI models based on configuration"
        self.priority = 200  # Run after system validation
        
    def can_run(self, context: InstallationContext) -> bool:
        """Run if custom models are configured."""
        custom_models = context.installation_config.get('custom_models', [])
        return len(custom_models) > 0
        
    def execute(self, context: InstallationContext) -> PluginResult:
        """Download custom models."""
        try:
            custom_models = context.installation_config.get('custom_models', [])
            downloaded_models = []
            
            for model_config in custom_models:
                model_name = model_config.get('name')
                model_url = model_config.get('url')
                
                if context.logger:
                    context.logger(f"Downloading custom model: {model_name}")
                
                # Simulate model download (replace with actual download logic)
                # download_model(model_url, model_name)
                downloaded_models.append(model_name)
                
            context.set_shared_data('custom_models_downloaded', downloaded_models)
            
            return PluginResult(
                status=PluginStatus.SUCCESS,
                message=f"Downloaded {len(downloaded_models)} custom models",
                data={'downloaded_models': downloaded_models}
            )
            
        except Exception as e:
            return PluginResult(
                status=PluginStatus.FAILED,
                message=f"Custom model download failed: {str(e)}",
                error=e
            )

# Global plugin manager instance
_plugin_manager = None

def get_plugin_manager(plugin_dir: Optional[str] = None) -> PluginManager:
    """Get the global plugin manager instance."""
    global _plugin_manager
    if _plugin_manager is None:
        _plugin_manager = PluginManager(plugin_dir)
    return _plugin_manager