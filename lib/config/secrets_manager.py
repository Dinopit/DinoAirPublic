"""
DinoAir Secrets Management Module
Provides secure secrets integration with HashiCorp Vault and AWS Secrets Manager
"""

import os
import json
import logging
from typing import Dict, Any, Optional, Union
from abc import ABC, abstractmethod
from dataclasses import dataclass
import urllib.parse
import base64

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False
    boto3 = None
    ClientError = Exception
    NoCredentialsError = Exception

try:
    import hvac
    VAULT_AVAILABLE = True
except ImportError:
    VAULT_AVAILABLE = False
    hvac = None

logger = logging.getLogger(__name__)

class SecretsError(Exception):
    """Secrets management error"""
    pass

@dataclass
class SecretRef:
    """Reference to a secret in external systems"""
    provider: str  # vault, aws, env
    path: str
    key: Optional[str] = None
    version: Optional[str] = None

class SecretsProvider(ABC):
    """Abstract base class for secrets providers"""
    
    @abstractmethod
    def get_secret(self, path: str, key: Optional[str] = None) -> Union[str, Dict[str, Any]]:
        """Get secret value"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available and configured"""
        pass

class VaultSecretsProvider(SecretsProvider):
    """HashiCorp Vault secrets provider"""
    
    def __init__(self, 
                 vault_url: Optional[str] = None,
                 vault_token: Optional[str] = None,
                 vault_role_id: Optional[str] = None,
                 vault_secret_id: Optional[str] = None):
        self.vault_url = vault_url or os.getenv('VAULT_ADDR')
        self.vault_token = vault_token or os.getenv('VAULT_TOKEN')
        self.vault_role_id = vault_role_id or os.getenv('VAULT_ROLE_ID')
        self.vault_secret_id = vault_secret_id or os.getenv('VAULT_SECRET_ID')
        self.client = None
        
        if VAULT_AVAILABLE and self.vault_url:
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Vault client"""
        try:
            self.client = hvac.Client(url=self.vault_url)
            
            # Authenticate
            if self.vault_token:
                self.client.token = self.vault_token
            elif self.vault_role_id and self.vault_secret_id:
                # AppRole authentication
                auth_response = self.client.auth.approle.login(
                    role_id=self.vault_role_id,
                    secret_id=self.vault_secret_id
                )
                self.client.token = auth_response['auth']['client_token']
            else:
                raise SecretsError("No valid Vault authentication method configured")
                
            # Verify authentication
            if not self.client.is_authenticated():
                raise SecretsError("Failed to authenticate with Vault")
                
        except Exception as e:
            logger.error(f"Failed to initialize Vault client: {e}")
            self.client = None
    
    def get_secret(self, path: str, key: Optional[str] = None) -> Union[str, Dict[str, Any]]:
        """Get secret from Vault"""
        if not self.client:
            raise SecretsError("Vault client not initialized")
        
        try:
            # Determine if using KV v1 or v2
            mount_point = path.split('/')[0]
            
            # Try KV v2 first
            try:
                response = self.client.secrets.kv.v2.read_secret_version(
                    path=path.replace(f"{mount_point}/", ""),
                    mount_point=mount_point
                )
                secret_data = response['data']['data']
            except:
                # Fall back to KV v1
                response = self.client.secrets.kv.v1.read_secret(path=path)
                secret_data = response['data']
            
            if key:
                if key not in secret_data:
                    raise SecretsError(f"Key '{key}' not found in secret '{path}'")
                return secret_data[key]
            
            return secret_data
            
        except Exception as e:
            logger.error(f"Failed to get secret from Vault: {e}")
            raise SecretsError(f"Failed to retrieve secret '{path}': {e}")
    
    def is_available(self) -> bool:
        """Check if Vault is available"""
        return VAULT_AVAILABLE and self.client is not None

class AWSSecretsProvider(SecretsProvider):
    """AWS Secrets Manager provider"""
    
    def __init__(self, region_name: Optional[str] = None):
        self.region_name = region_name or os.getenv('AWS_DEFAULT_REGION', 'us-east-1')
        self.client = None
        
        if AWS_AVAILABLE:
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize AWS Secrets Manager client"""
        try:
            self.client = boto3.client('secretsmanager', region_name=self.region_name)
            
            # Test credentials by listing secrets (with limit to avoid large responses)
            self.client.list_secrets(MaxResults=1)
            
        except (NoCredentialsError, ClientError) as e:
            logger.error(f"Failed to initialize AWS Secrets Manager client: {e}")
            self.client = None
        except Exception as e:
            logger.warning(f"AWS credentials may not be configured: {e}")
            self.client = None
    
    def get_secret(self, path: str, key: Optional[str] = None) -> Union[str, Dict[str, Any]]:
        """Get secret from AWS Secrets Manager"""
        if not self.client:
            raise SecretsError("AWS Secrets Manager client not initialized")
        
        try:
            response = self.client.get_secret_value(SecretId=path)
            
            # Handle different secret formats
            if 'SecretString' in response:
                secret_value = response['SecretString']
                
                # Try to parse as JSON
                try:
                    secret_data = json.loads(secret_value)
                    if isinstance(secret_data, dict) and key:
                        if key not in secret_data:
                            raise SecretsError(f"Key '{key}' not found in secret '{path}'")
                        return secret_data[key]
                    elif key:
                        raise SecretsError(f"Secret '{path}' is not a JSON object, cannot extract key '{key}'")
                    
                    return secret_data if isinstance(secret_data, dict) else secret_value
                except json.JSONDecodeError:
                    # Plain text secret
                    if key:
                        raise SecretsError(f"Secret '{path}' is plain text, cannot extract key '{key}'")
                    return secret_value
            else:
                # Binary secret
                secret_value = base64.b64decode(response['SecretBinary']).decode('utf-8')
                if key:
                    raise SecretsError(f"Binary secret '{path}' does not support key extraction")
                return secret_value
                
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'ResourceNotFoundException':
                raise SecretsError(f"Secret '{path}' not found")
            else:
                raise SecretsError(f"Failed to retrieve secret '{path}': {e}")
        except Exception as e:
            logger.error(f"Failed to get secret from AWS: {e}")
            raise SecretsError(f"Failed to retrieve secret '{path}': {e}")
    
    def is_available(self) -> bool:
        """Check if AWS Secrets Manager is available"""
        return AWS_AVAILABLE and self.client is not None

class EnvSecretsProvider(SecretsProvider):
    """Environment variables secrets provider"""
    
    def get_secret(self, path: str, key: Optional[str] = None) -> Union[str, Dict[str, Any]]:
        """Get secret from environment variable"""
        value = os.getenv(path)
        if value is None:
            raise SecretsError(f"Environment variable '{path}' not found")
        
        # Try to parse as JSON if key is requested
        if key:
            try:
                secret_data = json.loads(value)
                if not isinstance(secret_data, dict):
                    raise SecretsError(f"Environment variable '{path}' is not a JSON object")
                if key not in secret_data:
                    raise SecretsError(f"Key '{key}' not found in environment variable '{path}'")
                return secret_data[key]
            except json.JSONDecodeError:
                raise SecretsError(f"Environment variable '{path}' is not valid JSON")
        
        return value
    
    def is_available(self) -> bool:
        """Environment variables are always available"""
        return True

class SecretsManager:
    """Central secrets manager that handles multiple providers"""
    
    def __init__(self):
        self.providers: Dict[str, SecretsProvider] = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize available secrets providers"""
        # Always available
        self.providers['env'] = EnvSecretsProvider()
        
        # Initialize Vault if available
        vault_provider = VaultSecretsProvider()
        if vault_provider.is_available():
            self.providers['vault'] = vault_provider
            logger.info("Vault secrets provider initialized")
        
        # Initialize AWS if available
        aws_provider = AWSSecretsProvider()
        if aws_provider.is_available():
            self.providers['aws'] = aws_provider
            logger.info("AWS Secrets Manager provider initialized")
        
        logger.info(f"Initialized secrets providers: {list(self.providers.keys())}")
    
    def get_secret(self, secret_ref: Union[str, SecretRef]) -> Union[str, Dict[str, Any]]:
        """Get secret using provider-specific reference"""
        if isinstance(secret_ref, str):
            # Parse secret reference string (format: provider://path/to/secret#key)
            secret_ref = self._parse_secret_ref(secret_ref)
        
        provider = self.providers.get(secret_ref.provider)
        if not provider:
            raise SecretsError(f"Secrets provider '{secret_ref.provider}' not available")
        
        return provider.get_secret(secret_ref.path, secret_ref.key)
    
    def _parse_secret_ref(self, ref_string: str) -> SecretRef:
        """Parse secret reference string"""
        # Format: provider://path/to/secret#key or provider://path/to/secret
        
        if '://' not in ref_string:
            # Default to environment variable
            return SecretRef(provider='env', path=ref_string)
        
        parts = ref_string.split('://', 1)
        provider = parts[0]
        
        path_and_key = parts[1]
        if '#' in path_and_key:
            path, key = path_and_key.split('#', 1)
        else:
            path = path_and_key
            key = None
        
        return SecretRef(provider=provider, path=path, key=key)
    
    def resolve_config_secrets(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve secrets in configuration recursively"""
        resolved_config = {}
        
        for key, value in config.items():
            if isinstance(value, dict):
                resolved_config[key] = self.resolve_config_secrets(value)
            elif isinstance(value, str) and self._is_secret_ref(value):
                try:
                    resolved_config[key] = self.get_secret(value)
                except SecretsError as e:
                    logger.error(f"Failed to resolve secret for {key}: {e}")
                    # Keep original value as fallback
                    resolved_config[key] = value
            else:
                resolved_config[key] = value
        
        return resolved_config
    
    def _is_secret_ref(self, value: str) -> bool:
        """Check if value is a secret reference"""
        return (
            value.startswith('vault://') or 
            value.startswith('aws://') or
            value.startswith('env://') or
            (value.startswith('${') and value.endswith('}') and any(
                provider in value for provider in ['VAULT_', 'AWS_SECRET_', 'SECRET_']
            ))
        )
    
    def list_available_providers(self) -> Dict[str, bool]:
        """List available secrets providers"""
        return {
            provider: provider_instance.is_available() 
            for provider, provider_instance in self.providers.items()
        }

# Global secrets manager instance
secrets_manager = SecretsManager()

def get_secret(secret_ref: Union[str, SecretRef]) -> Union[str, Dict[str, Any]]:
    """Convenience function to get secret"""
    return secrets_manager.get_secret(secret_ref)

def resolve_secrets(config: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function to resolve secrets in config"""
    return secrets_manager.resolve_config_secrets(config)