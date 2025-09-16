"""
Production configuration and environment validation
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class Config:
    """Application configuration with validation"""
    
    def __init__(self):
        self.validate_environment()
    
    @property
    def mongo_url(self) -> str:
        """MongoDB connection URL with validation"""
        url = os.environ.get('MONGO_URL')
        if not url:
            logger.warning("MONGO_URL not set, using default localhost")
            return 'mongodb://localhost:27017'
        return url
    
    @property
    def db_name(self) -> str:
        """Database name with validation"""
        name = os.environ.get('DB_NAME')
        if not name:
            logger.warning("DB_NAME not set, using default test_database")
            return 'test_database'
        return name
    
    @property
    def jwt_secret(self) -> str:
        """JWT secret key with validation"""
        secret = os.environ.get('JWT_SECRET')
        if not secret:
            logger.warning("JWT_SECRET not set, using default (NOT SECURE FOR PRODUCTION)")
            return 'activus_secret_key_2024'
        return secret
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment"""
        return os.environ.get('VERCEL_ENV') == 'production'
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment"""
        return os.environ.get('VERCEL_ENV') == 'development' or not os.environ.get('VERCEL_ENV')
    
    def validate_environment(self):
        """Validate critical environment variables"""
        critical_vars = {
            'MONGO_URL': 'Database connection string',
            'DB_NAME': 'Database name',
            'JWT_SECRET': 'JWT secret key for authentication'
        }
        
        missing_vars = []
        for var, description in critical_vars.items():
            if not os.environ.get(var):
                missing_vars.append(f"{var} ({description})")
        
        if missing_vars and self.is_production:
            logger.error(f"CRITICAL: Missing environment variables in production: {', '.join(missing_vars)}")
        elif missing_vars:
            logger.warning(f"Missing environment variables (using defaults): {', '.join(missing_vars)}")
    
    def get_cors_origins(self) -> list:
        """Get CORS origins based on environment"""
        if self.is_production:
            # In production, you should set specific origins
            custom_origins = os.environ.get('CORS_ORIGINS', '').split(',')
            if custom_origins and custom_origins[0]:
                return [origin.strip() for origin in custom_origins]
            else:
                # Fallback to allow all in production (should be restricted)
                logger.warning("CORS_ORIGINS not set in production, allowing all origins")
                return ["*"]
        else:
            # Development - allow all
            return ["*"]

# Global config instance
config = Config()