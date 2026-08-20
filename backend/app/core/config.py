from pydantic_settings import BaseSettings
from typing import List, Union
import os
import logging
import json
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Art Studio Management"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # ZendBX
    ZENDBX_URL: str
    ZENDBX_ANON_KEY: str
    ZENDBX_SERVICE_KEY: str
    DATABASE_URL: str = ""  # Optional - only needed if using direct PostgreSQL connection
    
    # CORS
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://localhost:5173"]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from various formats and add common deployment URLs"""
        origins = []
        
        if isinstance(v, str):
            # Try parsing as JSON first
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    origins = parsed
            except json.JSONDecodeError:
                # Fall back to comma-separated values
                origins = [origin.strip() for origin in v.split(',') if origin.strip()]
        elif isinstance(v, list):
            origins = v
        else:
            # Default fallback
            origins = ["http://localhost:3000", "http://localhost:5173"]
        
        # Always add common deployment domains if not present
        common_domains = [
            "https://artfully-lms.vercel.app",
            "https://artfully-lms-frontend.onrender.com"
        ]
        
        for domain in common_domains:
            if domain not in origins:
                origins.append(domain)
        
        return origins
    
    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@artstudio.com"
    SMTP_FROM_NAME: str = "Art Studio"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"  # Optional - only needed if using Celery
    
    # File Upload
    MAX_FILE_SIZE: int = 5242880  # 5MB
    UPLOAD_DIR: str = "uploads"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Automation
    AUTOMATION_SECRET: str = ""
    ADMIN_EMAIL: str = ""
    APP_TIMEZONE: str = "Asia/Kolkata"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def validate_automation_config(self) -> dict:
        """
        Validate automation configuration
        
        Returns:
            dict with validation results
        """
        logger = logging.getLogger(__name__)
        issues = []
        warnings = []
        
        # Check AUTOMATION_SECRET
        if not self.AUTOMATION_SECRET or self.AUTOMATION_SECRET == "":
            issues.append("AUTOMATION_SECRET not configured - automation endpoints will be insecure")
        elif self.AUTOMATION_SECRET == "change-this-to-a-secure-random-string-in-production":
            warnings.append("AUTOMATION_SECRET is using example value - change in production")
        
        # Check ADMIN_EMAIL
        if not self.ADMIN_EMAIL or self.ADMIN_EMAIL == "":
            issues.append("ADMIN_EMAIL not configured - daily summaries cannot be sent")
        
        # Check SMTP configuration
        if not self.SMTP_USER or not self.SMTP_PASSWORD:
            issues.append("SMTP credentials not configured - emails cannot be sent")
        
        # Check timezone
        if self.APP_TIMEZONE != "Asia/Kolkata":
            warnings.append(f"APP_TIMEZONE is '{self.APP_TIMEZONE}', expected 'Asia/Kolkata'")
        
        # Log results
        if issues:
            logger.error(f"❌ Automation configuration issues: {', '.join(issues)}")
        
        if warnings:
            logger.warning(f"⚠️  Automation configuration warnings: {', '.join(warnings)}")
        
        if not issues and not warnings:
            logger.info("✅ Automation configuration validated successfully")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings
        }


settings = Settings()
