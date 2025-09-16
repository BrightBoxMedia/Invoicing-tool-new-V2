#!/bin/bash

# Quick Firebase Deployment Script
# Run this after: npm install -g firebase-tools && firebase login

echo "🔥 Quick Firebase Deployment for Activus Invoice Management"
echo "=========================================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
    echo "✅ Firebase CLI installed"
fi

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
cd ..
echo "✅ Frontend built successfully"

# Create functions directory
echo "🔧 Setting up Firebase functions..."
mkdir -p functions

# Copy API files
cp api/index.py functions/ 2>/dev/null || echo "⚠️  api/index.py not found, creating minimal API"
cp api/requirements.txt functions/ 2>/dev/null || echo "⚠️  Creating minimal requirements.txt"

# Create minimal API if not exists
if [ ! -f "functions/index.py" ]; then
    cat > functions/index.py << 'EOF'
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import jwt
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Activus Invoice Management API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.post("/auth/login")
async def login():
    # Demo login
    return {
        "token": "demo_token_123",
        "user": {
            "id": "admin",
            "email": "brightboxm@gmail.com",
            "name": "Administrator",
            "role": "super_admin"
        }
    }
EOF
fi

# Create requirements if not exists
if [ ! -f "functions/requirements.txt" ]; then
    cat > functions/requirements.txt << 'EOF'
functions-framework
firebase-functions
firebase-admin
fastapi
uvicorn
starlette
pyjwt
EOF
fi

# Create Firebase functions main.py
cat > functions/main.py << 'EOF'
from firebase_functions import https_fn
import sys
import os

sys.path.append(os.path.dirname(__file__))
from index import app

@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    return app(req.environ, lambda status, headers: None)
EOF

echo "✅ Functions setup complete"

# Create firebase.json
echo "📝 Creating Firebase configuration..."
cat > firebase.json << 'EOF'
{
  "hosting": {
    "public": "frontend/build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "venv",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ]
    }
  ]
}
EOF

echo "✅ Firebase configuration created"

# Check if logged in
echo "🔐 Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Please login to Firebase first:"
    echo "   Run: firebase login"
    exit 1
fi

echo "✅ Firebase authentication verified"

# Deploy
echo "🚀 Deploying to Firebase..."
firebase deploy --project activus-invoice-management

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "========================="
    echo ""
    echo "✅ Your app is now live!"
    echo "🌐 URL: https://activus-invoice-management.web.app"
    echo ""
    echo "🔐 Demo Login:"
    echo "   Email: brightboxm@gmail.com"
    echo "   Password: admin123"
    echo ""
    echo "🎯 Ready for client showcase!"
else
    echo "❌ Deployment failed. Check the errors above."
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Make sure you're logged in: firebase login"
    echo "2. Create project: firebase projects:create activus-invoice-management"
    echo "3. Use project: firebase use activus-invoice-management"
    echo "4. Try again: firebase deploy"
fi