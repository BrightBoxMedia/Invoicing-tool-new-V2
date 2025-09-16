#!/bin/bash

# Activus Invoice Management - Install Everything Script
# This installs ALL required dependencies and packages

echo "🚀 Installing Everything for Activus Invoice Management"
echo "====================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Installing Python..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip
fi

# Install Vercel CLI globally
echo "📦 Installing Vercel CLI..."
npm install -g vercel@latest

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps
cd ..

# Install API dependencies
echo "📦 Installing API dependencies..."
cd api
pip3 install -r requirements.txt
cd ..

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
__pycache__/
*.pyc
.Python

# Build outputs
/frontend/build/
/frontend/dist/

# Environment files
.env
.env.local
.env.production

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/

# Vercel
.vercel/
EOF
fi

echo ""
echo "🎉 INSTALLATION COMPLETE!"
echo "========================"
echo ""
echo "✅ All dependencies installed"
echo "✅ Vercel CLI ready"
echo "✅ Frontend packages ready"
echo "✅ API packages ready"
echo "✅ Project structure complete"
echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "Next steps:"
echo "1. git add ."
echo "2. git commit -m 'Complete Activus Invoice Management System'"
echo "3. git push origin main"
echo "4. Deploy to Vercel"
echo ""
echo "📖 See FOOLPROOF_DEPLOYMENT.md for deployment steps"
echo ""