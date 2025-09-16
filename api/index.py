<file>
      <absolute_file_name>/app/api/index.py</absolute_file_name>
      <content">import sys
import os
sys.path.append('../backend')

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import bcrypt
import jwt
import uuid

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb+srv://demo:demo123@cluster0.mongodb.net')
DB_NAME = os.environ.get('DB_NAME', 'activus_invoice')
JWT_SECRET = os.environ.get('JWT_SECRET', 'activus_secret_key_2024')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

@app.get("/")
async def root():
    return {"message": "Activus Invoice Management API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/auth/login")
async def login(email: str, password: str):
    # Default admin user
    if email == "brightboxm@gmail.com" and password == "admin123":
        token = jwt.encode({
            "user_id": "admin",
            "email": email,
            "role": "super_admin",
            "exp": datetime.utcnow().timestamp() + 86400
        }, JWT_SECRET, algorithm="HS256")
        
        return {
            "token": token,
            "user": {
                "id": "admin",
                "email": email,
                "name": "Administrator",
                "role": "super_admin"
            }
        }
    
    return {"error": "Invalid credentials"}, 401

@app.get("/projects")
async def get_projects():
    return {"projects": [], "message": "No projects found"}

@app.get("/invoices")
async def get_invoices():
    return {"invoices": [], "message": "No invoices found"}

@app.get("/clients")
async def get_clients():
    return {"clients": [], "message": "No clients found"}

# Vercel handler
def handler(request, start_response):
    return app(request, start_response)
</content>
    </file>