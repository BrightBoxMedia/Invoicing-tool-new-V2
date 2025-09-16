# 🔥 FIREBASE DEPLOYMENT - EXACT COMMANDS

## ⚡ COPY-PASTE THESE COMMANDS EXACTLY

### **Step 1: Install Firebase CLI**
```bash
npm install -g firebase-tools
```

### **Step 2: Login to Firebase**
```bash
firebase login
```
*This will open browser - login with your Google account*

### **Step 3: Initialize Firebase Project**
```bash
firebase init
```

**When prompted, select:**
- ✅ **Hosting: Configure files for Firebase Hosting**
- ✅ **Functions: Configure a Cloud Functions directory**

**Then answer:**
- **Use existing project or create new:** Create new project
- **Project name:** `activus-invoice-management`
- **Public directory:** `frontend/build`
- **Single-page app:** `y` (Yes)
- **Set up automatic builds:** `n` (No)
- **Functions language:** `Python`
- **Functions source directory:** `functions`
- **Install dependencies:** `y` (Yes)

### **Step 4: Build Frontend**
```bash
cd frontend
npm run build
cd ..
```

### **Step 5: Configure Firebase Functions**
```bash
# Create functions directory
mkdir -p functions

# Copy API to functions
cp -r api/* functions/

# Create functions main.py
cat > functions/main.py << 'EOF'
from firebase_functions import https_fn
from firebase_admin import initialize_app
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

# Import your API
from index import app

# Initialize Firebase Admin
initialize_app()

@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    return app(req.environ, lambda status, headers: None)
EOF
```

### **Step 6: Update Functions Requirements**
```bash
cat > functions/requirements.txt << 'EOF'
functions-framework
firebase-functions
firebase-admin
fastapi
uvicorn
motor
pymongo
bcrypt
pyjwt
python-multipart
starlette
EOF
```

### **Step 7: Configure Firebase Hosting**
```bash
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
      ],
      "predeploy": []
    }
  ]
}
EOF
```

### **Step 8: Deploy to Firebase**
```bash
firebase deploy
```

---

## 🎯 **ALTERNATIVE: QUICK DEPLOY SCRIPT**

If you want to run everything at once, create this script:

```bash
# Create deploy script
cat > firebase-deploy.sh << 'EOF'
#!/bin/bash

echo "🔥 Deploying to Firebase..."

# Install Firebase CLI if not installed
if ! command -v firebase &> /dev/null; then
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Build frontend
echo "Building frontend..."
cd frontend
npm run build
cd ..

# Ensure functions directory exists
mkdir -p functions

# Copy API files to functions
echo "Setting up functions..."
cp api/index.py functions/
cp api/requirements.txt functions/

# Create Firebase functions entry point
cat > functions/main.py << 'FUNC_EOF'
from firebase_functions import https_fn
import sys
import os
sys.path.append(os.path.dirname(__file__))
from index import app

@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    return app(req.environ, lambda status, headers: None)
FUNC_EOF

# Update requirements for Firebase
cat > functions/requirements.txt << 'REQ_EOF'
functions-framework
firebase-functions
firebase-admin
fastapi
uvicorn
motor
pymongo
bcrypt
pyjwt
python-multipart
starlette
REQ_EOF

# Deploy
echo "Deploying to Firebase..."
firebase deploy

echo "🎉 Deployment complete!"
EOF

# Make executable
chmod +x firebase-deploy.sh

# Run the script
./firebase-deploy.sh
```

---

## 🚨 **TROUBLESHOOTING COMMANDS**

### **If Firebase Init Fails:**
```bash
firebase logout
firebase login --reauth
firebase projects:create activus-invoice-management
firebase use activus-invoice-management
```

### **If Functions Fail:**
```bash
cd functions
pip install -r requirements.txt
cd ..
firebase deploy --only functions
```

### **If Hosting Fails:**
```bash
cd frontend
npm run build
cd ..
firebase deploy --only hosting
```

### **View Logs:**
```bash
firebase functions:log
```

---

## ✅ **SUCCESS INDICATORS**

After `firebase deploy` completes, you'll see:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/activus-invoice-management
Hosting URL: https://activus-invoice-management.web.app
```

**Test immediately:**
1. Go to your Hosting URL
2. Should show login page
3. Login: `brightboxm@gmail.com` / `admin123`

---

## 🎯 **FINAL COMMAND SEQUENCE**

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Build frontend
cd frontend && npm run build && cd ..

# 4. Initialize (follow prompts above)
firebase init

# 5. Deploy
firebase deploy
```

**🔥 Your app will be live at: `https://your-project-id.web.app`**

---

*Copy these commands exactly for guaranteed Firebase deployment success!*