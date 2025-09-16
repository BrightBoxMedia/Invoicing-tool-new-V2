"""
Health check and system monitoring endpoints for production deployment
"""
import os
import time
from datetime import datetime
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

async def check_database_health():
    """Check MongoDB connection health"""
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = AsyncIOMotorClient(mongo_url)
        
        # Test connection with a simple ping
        await client.admin.command('ping')
        
        # Get database stats
        db_name = os.environ.get('DB_NAME', 'test_database')
        db = client[db_name]
        stats = await db.command("dbstats")
        
        return {
            "status": "connected",
            "database": db_name,
            "collections": stats.get("collections", 0),
            "data_size": stats.get("dataSize", 0),
            "storage_size": stats.get("storageSize", 0)
        }
        
    except Exception as e:
        return {
            "status": "disconnected",
            "error": str(e),
            "database": "unknown"
        }

def get_system_info():
    """Get system information for health checks"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.environ.get("VERCEL_ENV", "development"),
        "region": os.environ.get("VERCEL_REGION", "unknown"),
        "python_version": os.environ.get("PYTHON_VERSION", "unknown"),
        "app_version": "1.0.0"
    }

async def comprehensive_health_check():
    """Comprehensive health check for the entire system"""
    health_data = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Database health check
    db_health = await check_database_health()
    health_data["checks"]["database"] = db_health
    
    # Environment variables check
    required_env_vars = ["MONGO_URL", "DB_NAME", "JWT_SECRET"]
    env_check = {
        "status": "ok",
        "missing_vars": []
    }
    
    for var in required_env_vars:
        if not os.environ.get(var):
            env_check["missing_vars"].append(var)
            env_check["status"] = "warning"
    
    health_data["checks"]["environment"] = env_check
    
    # System info
    health_data["system"] = get_system_info()
    
    # Overall health status
    if (db_health["status"] != "connected" or 
        env_check["status"] == "warning"):
        health_data["status"] = "unhealthy"
    
    return health_data