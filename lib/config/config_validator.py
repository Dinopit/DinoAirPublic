"""
DinoAir Configuration Validator
Provides type checking, validation, and safe defaults for all configuration
"""

import os
import json
import yaml
import logging
from typing import Any, Dict, List, Optional, Union, Type, Callable
from dataclasses import dataclass, field, fields
from enum import Enum
from pathlib import Path
import re
from datetime import timedelta
import ipaddress

logger = logging.getLogger(__name__)

class ConfigError(Exception):
    """Configuration validation error"""
    pass

class ConfigValueType(Enum):
    """Supported configuration value types"""
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    LIST = "list"
    DICT = "dict"
    PATH = "path"
    URL = "url"
    EMAIL = "email"
    IP_ADDRESS = "ip_address"
    PORT = "port"
    DURATION = "duration"
    ENUM = "enum"

@dataclass
class ConfigField:
    """Configuration field definition"""
    name: str
    type: ConfigValueType
    required: bool = True
    default: Any = None
    description: str = ""
    min_value: Optional[Union[int, float]] = None
    max_value: Optional[Union[int, float]] = None
    pattern: Optional[str] = None
    choices: Optional[List[Any]] = None
    validator: Optional[Callable[[Any], bool]] = None
    sanitizer: Optional[Callable[[Any], Any]] = None

@dataclass
class ServerConfig:
    """Server configuration"""
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4
    timeout: int = 300
    max_request_size: int = 100 * 1024 * 1024  # 100MB
    cors_origins: List[str] = field(default_factory=lambda: ["http://localhost:3000"])
    ssl_cert: Optional[str] = None
    ssl_key: Optional[str] = None

@dataclass
class DatabaseConfig:
    """Database configuration"""
    type: str = "sqlite"
    host: str = "localhost"
    port: int = 5432
    name: str = "dinoair"
    user: str = "dinoair"
    password: str = ""
    connection_pool_size: int = 10
    connection_timeout: int = 30

@dataclass
class SecurityConfig:
    """Security configuration"""
    secret_key: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24
    api_key_length: int = 32
    bcrypt_rounds: int = 12
    allowed_hosts: List[str] = field(default_factory=lambda: ["localhost", "127.0.0.1"])
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds
    session_timeout: int = 3600  # seconds

@dataclass
class ComfyUIConfig:
    """ComfyUI service configuration"""
    enabled: bool = True
    host: str = "localhost"
    port: int = 8188
    api_timeout: int = 120
    max_queue_size: int = 100
    workflow_timeout: int = 600
    custom_nodes_path: str = "./ComfyUI/custom_nodes"
    models_path: str = "./ComfyUI/models"
    output_path: str = "./ComfyUI/output"

@dataclass
class OllamaConfig:
    """Ollama service configuration"""
    enabled: bool = True
    host: str = "localhost"
    port: int = 11434
    api_timeout: int = 60
    default_model: str = "llama2"
    max_context_length: int = 4096
    temperature: float = 0.7
    top_p: float = 0.9
    models_path: str = "./ollama/models"

@dataclass
class ResourceLimitsConfig:
    """Resource limits configuration"""
    max_memory_mb: int = 8192  # 8GB
    max_cpu_percent: float = 80.0
    max_disk_usage_gb: int = 50
    max_file_size_mb: int = 100
    max_upload_size_mb: int = 50
    max_concurrent_requests: int = 50
    max_models_loaded: int = 3

@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    format: str = "json"
    file_path: str = "./logs/dinoair.log"
    max_file_size_mb: int = 10
    backup_count: int = 10
    console_output: bool = True
    syslog_enabled: bool = False
    syslog_host: str = "localhost"
    syslog_port: int = 514

@dataclass
class MonitoringConfig:
    """Monitoring configuration"""
    enabled: bool = True
    health_check_interval: int = 30
    metrics_interval: int = 60
    alert_email: Optional[str] = None
    webhook_url: Optional[str] = None
    prometheus_enabled: bool = False
    prometheus_port: int = 9090

@dataclass
class DinoAirConfig:
    """Main DinoAir configuration"""
    app_name: str = "DinoAir"
    version: str = "1.0.0"
    environment: str = "development"
    debug: bool = False
    
    server: ServerConfig = field(default_factory=ServerConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    comfyui: ComfyUIConfig = field(default_factory=ComfyUIConfig)
    ollama: OllamaConfig = field(default_factory=OllamaConfig)
    resources: ResourceLimitsConfig = field(default_factory=ResourceLimitsConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)

class ConfigValidator:
    """Configuration validator with type checking"""
    
    # Field definitions for validation
    FIELD_DEFINITIONS = {
        # Server fields
        "server.host": ConfigField(
            name="host",
            type=ConfigValueType.IP_ADDRESS,
            default="0.0.0.0",
            description="Server bind address"
        ),
        "server.port": ConfigField(
            name="port",
            type=ConfigValueType.PORT,
            default=8000,
            description="Server port"
        ),
        "server.workers": ConfigField(
            name="workers",
            type=ConfigValueType.INTEGER,
            default=4,
            min_value=1,
            max_value=100,
            description="Number of worker processes"
        ),
        
        # Security fields
        "security.secret_key": ConfigField(
            name="secret_key",
            type=ConfigValueType.STRING,
            required=True,
            pattern=r"^.{32,}$",
            description="Secret key for encryption (min 32 chars)",
            sanitizer=lambda x: x.strip()
        ),
        "security.jwt_algorithm": ConfigField(
            name="jwt_algorithm",
            type=ConfigValueType.ENUM,
            default="HS256",
            choices=["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"],
            description="JWT signing algorithm"
        ),
        
        # Resource limits
        "resources.max_memory_mb": ConfigField(
            name="max_memory_mb",
            type=ConfigValueType.INTEGER,
            default=8192,
            min_value=512,
            max_value=65536,
            description="Maximum memory usage in MB"
        ),
        "resources.max_cpu_percent": ConfigField(
            name="max_cpu_percent",
            type=ConfigValueType.FLOAT,
            default=80.0,
            min_value=10.0,
            max_value=100.0,
            description="Maximum CPU usage percentage"
        ),
        
        # Logging
        "logging.level": ConfigField(
            name="level",
            type=ConfigValueType.ENUM,
            default="INFO",
            choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
            description="Logging level"
        ),
        "logging.format": ConfigField(
            name="format",
            type=ConfigValueType.ENUM,
            default="json",
            choices=["json", "text"],
            description="Log format"
        ),
    }
    
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def validate(self, config: Dict[str, Any], schema: Type[dataclass] = DinoAirConfig) -> DinoAirConfig:
        """Validate configuration against schema"""
        self.errors = []
        self.warnings = []
        
        # Validate and create config object
        validated_config = self._validate_dataclass(config, schema, "")
        
        if self.errors:
            raise ConfigError(f"Configuration validation failed:\n" + "\n".join(self.errors))
        
        if self.warnings:
            print("Configuration warnings:")
            for warning in self.warnings:
                print(f"  - {warning}")
        
        return validated_config
    
    def _validate_dataclass(self, data: Dict[str, Any], schema: Type[dataclass], path: str) -> Any:
        """Recursively validate dataclass"""
        # Create instance with defaults
        instance = schema()
        
        # Validate each field
        for field_info in fields(schema):
            field_name = field_info.name
            field_path = f"{path}.{field_name}" if path else field_name
            field_value = data.get(field_name, field_info.default)
            
            # Handle nested dataclasses
            if hasattr(field_info.type, '__dataclass_fields__'):
                if isinstance(field_value, dict):
                    nested_value = self._validate_dataclass(
                        field_value, field_info.type, field_path
                    )
                    setattr(instance, field_name, nested_value)
                else:
                    setattr(instance, field_name, field_info.type())
            else:
                # Validate field
                validated_value = self._validate_field(
                    field_path, field_value, field_info
                )
                setattr(instance, field_name, validated_value)
        
        # Check for unknown fields
        known_fields = {f.name for f in fields(schema)}
        for key in data:
            if key not in known_fields:
                self.warnings.append(f"Unknown field '{path}.{key}' in configuration")
        
        return instance
    
    def _validate_field(self, path: str, value: Any, field_info: Any) -> Any:
        """Validate individual field"""
        # Get field definition if exists
        field_def = self.FIELD_DEFINITIONS.get(path)
        
        if field_def:
            return self._validate_with_definition(path, value, field_def)
        else:
            # Basic type validation
            return self._validate_basic_type(path, value, field_info.type)
    
    def _validate_with_definition(self, path: str, value: Any, field_def: ConfigField) -> Any:
        """Validate field with definition"""
        # Check required
        if field_def.required and value is None:
            self.errors.append(f"{path}: Required field is missing")
            return field_def.default
        
        # Use default if value is None
        if value is None:
            return field_def.default
        
        # Apply sanitizer
        if field_def.sanitizer:
            value = field_def.sanitizer(value)
        
        # Type validation
        validated_value = self._validate_type(path, value, field_def)
        
        # Custom validator
        if field_def.validator and not field_def.validator(validated_value):
            self.errors.append(f"{path}: Custom validation failed")
        
        return validated_value
    
    def _validate_type(self, path: str, value: Any, field_def: ConfigField) -> Any:
        """Validate value type"""
        try:
            if field_def.type == ConfigValueType.STRING:
                if not isinstance(value, str):
                    value = str(value)
                
                # Check if value is an environment variable template
                is_env_template = (
                    value.startswith('${') and value.endswith('}') or
                    value.startswith('env://') or 
                    value.startswith('$')
                )
                
                if field_def.pattern and not is_env_template and not re.match(field_def.pattern, value):
                    self.errors.append(
                        f"{path}: Value '{value}' does not match pattern '{field_def.pattern}'"
                    )
                
            elif field_def.type == ConfigValueType.INTEGER:
                value = int(value)
                if field_def.min_value is not None and value < field_def.min_value:
                    self.errors.append(
                        f"{path}: Value {value} is below minimum {field_def.min_value}"
                    )
                if field_def.max_value is not None and value > field_def.max_value:
                    self.errors.append(
                        f"{path}: Value {value} is above maximum {field_def.max_value}"
                    )
                    
            elif field_def.type == ConfigValueType.FLOAT:
                value = float(value)
                if field_def.min_value is not None and value < field_def.min_value:
                    self.errors.append(
                        f"{path}: Value {value} is below minimum {field_def.min_value}"
                    )
                if field_def.max_value is not None and value > field_def.max_value:
                    self.errors.append(
                        f"{path}: Value {value} is above maximum {field_def.max_value}"
                    )
                    
            elif field_def.type == ConfigValueType.BOOLEAN:
                if isinstance(value, str):
                    value = value.lower() in ('true', 'yes', '1', 'on')
                else:
                    value = bool(value)
                    
            elif field_def.type == ConfigValueType.LIST:
                if not isinstance(value, list):
                    self.errors.append(f"{path}: Expected list, got {type(value).__name__}")
                    value = []
                    
            elif field_def.type == ConfigValueType.DICT:
                if not isinstance(value, dict):
                    self.errors.append(f"{path}: Expected dict, got {type(value).__name__}")
                    value = {}
                    
            elif field_def.type == ConfigValueType.PATH:
                value = str(value)
                # Validate path format
                try:
                    Path(value)
                except Exception:
                    self.errors.append(f"{path}: Invalid path format '{value}'")
                    
            elif field_def.type == ConfigValueType.URL:
                value = str(value)
                url_pattern = r'^https?://.+'
                if not re.match(url_pattern, value):
                    self.errors.append(f"{path}: Invalid URL format '{value}'")
                    
            elif field_def.type == ConfigValueType.EMAIL:
                value = str(value)
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, value):
                    self.errors.append(f"{path}: Invalid email format '{value}'")
                    
            elif field_def.type == ConfigValueType.IP_ADDRESS:
                value = str(value)
                try:
                    ipaddress.ip_address(value)
                except ValueError:
                    self.errors.append(f"{path}: Invalid IP address '{value}'")
                    
            elif field_def.type == ConfigValueType.PORT:
                value = int(value)
                if not 1 <= value <= 65535:
                    self.errors.append(f"{path}: Port {value} must be between 1 and 65535")
                    
            elif field_def.type == ConfigValueType.ENUM:
                if field_def.choices and value not in field_def.choices:
                    self.errors.append(
                        f"{path}: Value '{value}' not in allowed choices {field_def.choices}"
                    )
                    
        except (ValueError, TypeError) as e:
            self.errors.append(f"{path}: Type conversion failed - {str(e)}")
            return field_def.default
            
        return value
    
    def _validate_basic_type(self, path: str, value: Any, expected_type: Type) -> Any:
        """Basic type validation without field definition"""
        if expected_type == str:
            return str(value) if value is not None else ""
        elif expected_type == int:
            try:
                return int(value) if value is not None else 0
            except (ValueError, TypeError):
                self.errors.append(f"{path}: Expected integer, got {type(value).__name__}")
                return 0
        elif expected_type == float:
            try:
                return float(value) if value is not None else 0.0
            except (ValueError, TypeError):
                self.errors.append(f"{path}: Expected float, got {type(value).__name__}")
                return 0.0
        elif expected_type == bool:
            if isinstance(value, str):
                return value.lower() in ('true', 'yes', '1', 'on')
            return bool(value) if value is not None else False
        elif hasattr(expected_type, '__origin__'):
            # Handle generic types like List[str]
            if expected_type.__origin__ == list:
                if not isinstance(value, list):
                    self.warnings.append(f"{path}: Expected list, converting from {type(value).__name__}")
                    return [value] if value is not None else []
                return value
        
        return value

class ConfigLoader:
    """Load and merge configuration from multiple sources"""
    
    def __init__(self, validator: Optional[ConfigValidator] = None):
        self.validator = validator or ConfigValidator()
    
    def load(self, 
             config_files: Optional[List[str]] = None,
             env_prefix: str = "DINOAIR_",
             defaults: Optional[Dict[str, Any]] = None) -> DinoAirConfig:
        """Load configuration from files and environment"""
        config = defaults or {}
        
        # Load from files
        if config_files:
            for file_path in config_files:
                if os.path.exists(file_path):
                    file_config = self._load_file(file_path)
                    config = self._deep_merge(config, file_config)
        
        # Load from environment
        env_config = self._load_from_env(env_prefix)
        config = self._deep_merge(config, env_config)
        
        # Validate and return
        return self.validator.validate(config)
    
    def _load_file(self, file_path: str) -> Dict[str, Any]:
        """Load configuration from file"""
        path = Path(file_path)
        
        try:
            with open(path, 'r') as f:
                if path.suffix in ['.yaml', '.yml']:
                    config = yaml.safe_load(f) or {}
                elif path.suffix == '.json':
                    config = json.load(f)
                else:
                    raise ConfigError(f"Unsupported config file format: {path.suffix}")
            
            # Substitute environment variables in the loaded config
            return self._substitute_env_vars(config)
            
        except Exception as e:
            raise ConfigError(f"Failed to load config file {file_path}: {e}")
    
    def _substitute_env_vars(self, config: Any) -> Any:
        """Recursively substitute environment variables in config"""
        if isinstance(config, dict):
            return {key: self._substitute_env_vars(value) for key, value in config.items()}
        elif isinstance(config, list):
            return [self._substitute_env_vars(item) for item in config]
        elif isinstance(config, str):
            # Handle ${VAR} and ${VAR:-default} patterns
            import re
            def replace_env_var(match):
                var_expr = match.group(1)
                if ':-' in var_expr:
                    var_name, default_value = var_expr.split(':-', 1)
                    return os.environ.get(var_name, default_value)
                else:
                    return os.environ.get(var_expr, match.group(0))  # Return original if not found
            
            # Replace ${VAR} and ${VAR:-default} patterns
            config = re.sub(r'\$\{([^}]+)\}', replace_env_var, config)
            
            # Handle env:// prefix for tests
            if config.startswith('env://'):
                env_var = config[6:]  # Remove 'env://' prefix
                return os.environ.get(env_var, config)  # Return original if not found
                
        return config
    
    def _load_from_env(self, prefix: str) -> Dict[str, Any]:
        """Load configuration from environment variables"""
        config = {}
        
        for key, value in os.environ.items():
            if key.startswith(prefix):
                # Convert DINOAIR_SERVER_PORT to server.port but DINOAIR_APP_NAME to app_name
                config_key = key[len(prefix):].lower()
                
                # Only convert underscores to dots for known nested structures
                # For simple fields like app_name, keep underscores
                if config_key.startswith('server_'):
                    config_key = config_key.replace('_', '.', 1)
                elif config_key.startswith('database_'):
                    config_key = config_key.replace('_', '.', 1)
                elif config_key.startswith('security_'):
                    config_key = config_key.replace('_', '.', 1)
                elif config_key.startswith('comfyui_'):
                    config_key = config_key.replace('_', '.', 1)
                elif config_key.startswith('ollama_'):
                    config_key = config_key.replace('_', '.', 1)
                elif config_key.startswith('resources_'):
                    config_key = config_key.replace('_', '.', 1)
                elif config_key.startswith('logging_'):
                    config_key = config_key.replace('_', '.', 1)
                elif config_key.startswith('monitoring_'):
                    config_key = config_key.replace('_', '.', 1)
                # For top-level fields, keep underscores as they are
                
                # Try to parse value
                try:
                    # Try JSON first (for lists/dicts)
                    parsed_value = json.loads(value)
                except:
                    # Try to convert to appropriate type
                    if value.lower() in ('true', 'false'):
                        parsed_value = value.lower() == 'true'
                    elif value.isdigit():
                        parsed_value = int(value)
                    elif '.' in value and all(part.isdigit() for part in value.split('.', 1)):
                        parsed_value = float(value)
                    else:
                        parsed_value = value
                
                # Set nested value
                self._set_nested(config, config_key, parsed_value)
        
        return config
    
    def _set_nested(self, config: Dict[str, Any], key: str, value: Any):
        """Set nested configuration value"""
        parts = key.split('.')
        current = config
        
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        
        current[parts[-1]] = value
    
    def _config_to_dict(self, config: DinoAirConfig) -> Dict[str, Any]:
        """Convert config object to dictionary"""
        def convert_value(value):
            if hasattr(value, '__dict__'):
                return {k: convert_value(v) for k, v in value.__dict__.items()}
            elif isinstance(value, list):
                return [convert_value(item) for item in value]
            else:
                return value
        
        return convert_value(config)

    def _deep_merge(self, base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge dictionaries"""
        result = base.copy()
        
        for key, value in update.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result

def load_config(config_path: Optional[str] = None, environment: Optional[str] = None) -> DinoAirConfig:
    """Load DinoAir configuration with environment-specific support"""
    loader = ConfigLoader()
    
    # Determine environment
    env = environment or os.getenv("DINOAIR_ENV", "development")
    
    # Default config files to check
    config_files = []
    
    if config_path:
        config_files.append(config_path)
    else:
        # Check common locations and environment-specific files
        base_configs = ['config.yaml', 'config.json']
        env_configs = [
            f'config/environments/{env}.yaml',
            f'config/environments/{env}.json',
            f'config.{env}.yaml',
            f'config.{env}.json'
        ]
        
        # Add base config first
        for path in base_configs:
            if os.path.exists(path):
                config_files.append(path)
                break
        
        # Add environment-specific config
        for path in env_configs:
            if os.path.exists(path):
                config_files.append(path)
                break
    
    # Load with defaults
    config = loader.load(
        config_files=config_files,
        defaults={
            "app_name": "DinoAir",
            "environment": env,
            "version": "1.0.0"
        }
    )
    
    # Resolve secrets if secrets manager is available
    try:
        from .secrets_manager import secrets_manager
        config_dict = loader._config_to_dict(config)
        resolved_dict = secrets_manager.resolve_config_secrets(config_dict)
        
        # Re-validate with resolved secrets
        config = loader.validator.validate(resolved_dict)
    except ImportError:
        pass  # Secrets manager not available
    except Exception as e:
        logger.warning(f"Failed to resolve secrets: {e}")
    
    return config

# Example configuration file template
CONFIG_TEMPLATE = """
# DinoAir Configuration
app_name: DinoAir
version: 1.0.0
environment: production
debug: false

server:
  host: 0.0.0.0
  port: 8000
  workers: 4
  timeout: 300
  cors_origins:
    - http://localhost:3000
    - https://yourdomain.com

database:
  type: postgresql
  host: localhost
  port: 5432
  name: dinoair
  user: dinoair
  password: ${DINOAIR_DB_PASSWORD}
  connection_pool_size: 10

security:
  secret_key: ${DINOAIR_SECRET_KEY}
  jwt_algorithm: HS256
  jwt_expiry_hours: 24
  allowed_hosts:
    - localhost
    - yourdomain.com
  rate_limit_requests: 100
  rate_limit_window: 60

comfyui:
  enabled: true
  host: localhost
  port: 8188
  api_timeout: 120
  models_path: ./ComfyUI/models
  output_path: ./ComfyUI/output

ollama:
  enabled: true
  host: localhost
  port: 11434
  default_model: llama2
  max_context_length: 4096

resources:
  max_memory_mb: 8192
  max_cpu_percent: 80.0
  max_disk_usage_gb: 50
  max_concurrent_requests: 50

logging:
  level: INFO
  format: json
  file_path: ./logs/dinoair.log
  max_file_size_mb: 10
  backup_count: 10
  console_output: true

monitoring:
  enabled: true
  health_check_interval: 30
  metrics_interval: 60
  alert_email: admin@yourdomain.com
"""

if __name__ == "__main__":
    # Example usage
    
    # Create example config file
    with open("config.example.yaml", "w") as f:
        f.write(CONFIG_TEMPLATE)
    
    # Test configuration
    test_config = {
        "app_name": "DinoAir Test",
        "server": {
            "port": "8080",  # Will be converted to int
            "workers": "invalid"  # Will cause validation error
        },
        "security": {
            # Missing required secret_key
        },
        "unknown_field": "test"  # Will generate warning
    }
    
    validator = ConfigValidator()
    
    try:
        config = validator.validate(test_config)
        print("Configuration validated successfully!")
        print(f"Server port: {config.server.port}")
    except ConfigError as e:
        print(f"Configuration error: {e}")
    
    # Test loading from file
    print("\nTesting config loader...")
    loader = ConfigLoader()
    
    # Set some environment variables
    os.environ["DINOAIR_SERVER_PORT"] = "9000"
    os.environ["DINOAIR_SECURITY_SECRET_KEY"] = "test-secret-key-at-least-32-chars-long"
    
    try:
        config = loader.load()
        print(f"Loaded config: {config.app_name}")
        print(f"Server port from env: {config.server.port}")
    except ConfigError as e:
        print(f"Failed to load config: {e}")