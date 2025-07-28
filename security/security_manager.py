import secrets
import hashlib
import json
from datetime import datetime, timedelta
from typing import Optional, Dict
from pathlib import Path
import re

class SecurityManager:
    """Handle security aspects of DinoAir"""
    
    def __init__(self, config_path: Path = None):
        self.config_path = config_path or Path("config/security.json")
        self.config = self.load_security_config()
        self.jwt_secret = self.config.get("jwt_secret", secrets.token_urlsafe(32))
        
    def load_security_config(self) -> Dict:
        """Load security configuration"""
        if self.config_path.exists():
            with open(self.config_path, 'r') as f:
                return json.load(f)
        else:
            # Create default config
            default_config = {
                "jwt_secret": secrets.token_urlsafe(32),
                "jwt_algorithm": "HS256",
                "jwt_expiry_hours": 24,
                "api_key_required": True,
                "password_min_length": 8,
                "password_require_special": True,
                "rate_limit_enabled": True,
                "rate_limit_requests": 60,
                "rate_limit_window": 60
            }
            
            self.config_path.parent.mkdir(exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(default_config, f, indent=2)
            
            return default_config
    
    def generate_api_key(self) -> str:
        """Generate a secure API key"""
        return f"da_{secrets.token_urlsafe(32)}"
    
    def hash_password(self, password: str) -> str:
        """Hash a password using SHA256 with salt"""
        salt = secrets.token_hex(16)
        password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return f"{salt}:{password_hash}"
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify a password against a hash"""
        try:
            salt, stored_hash = hashed.split(':')
            password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
            return password_hash == stored_hash
        except ValueError:
            return False
    
    def validate_password(self, password: str) -> tuple[bool, str]:
        """Validate password meets requirements"""
        if len(password) < self.config["password_min_length"]:
            return False, f"Password must be at least {self.config['password_min_length']} characters"
        
        if self.config["password_require_special"]:
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
                return False, "Password must contain at least one special character"
        
        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        
        if not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"
        
        if not re.search(r'[0-9]', password):
            return False, "Password must contain at least one number"
        
        return True, "Password is valid"
    
    def generate_jwt_token(self, user_id: str, additional_claims: Dict = None) -> str:
        """Generate a JWT token (simplified version)"""
        payload = {
            "user_id": user_id,
            "exp": (datetime.utcnow() + timedelta(hours=self.config["jwt_expiry_hours"])).timestamp(),
            "iat": datetime.utcnow().timestamp()
        }
        
        if additional_claims:
            payload.update(additional_claims)
        
        # Simple token generation for demo (in production, use proper JWT library)
        token_data = json.dumps(payload)
        token_hash = hashlib.sha256((token_data + self.jwt_secret).encode()).hexdigest()
        return f"{secrets.token_urlsafe(16)}.{token_hash[:32]}"
    
    def sanitize_input(self, input_str: str) -> str:
        """Sanitize user input to prevent injection attacks"""
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>&"\'`]', '', input_str)
        
        # Limit length
        sanitized = sanitized[:1000]
        
        return sanitized.strip()
    
    def validate_file_upload(self, filename: str, content_type: str) -> tuple[bool, str]:
        """Validate file uploads"""
        allowed_extensions = {
            '.png', '.jpg', '.jpeg', '.gif', '.webp',  # Images
            '.json', '.yaml', '.yml', '.txt',  # Config files
            '.safetensors', '.ckpt', '.bin'  # Model files
        }
        
        allowed_content_types = {
            'image/png', 'image/jpeg', 'image/gif', 'image/webp',
            'application/json', 'text/plain', 'application/yaml'
        }
        
        # Check extension
        ext = Path(filename).suffix.lower()
        if ext not in allowed_extensions:
            return False, f"File extension {ext} not allowed"
        
        # Check content type
        if content_type not in allowed_content_types:
            return False, f"Content type {content_type} not allowed"
        
        # Check for path traversal
        if '..' in filename or '/' in filename or '\\' in filename:
            return False, "Invalid filename"
        
        return True, "File is valid"