#!/bin/bash

# Vercel Deployment Verification Script
# Ensures all files are correctly configured for Vercel deployment

echo "🚀 Vercel Deployment Verification"
echo "================================="

# Check critical files exist
CRITICAL_FILES=(
    "vercel.json"
    "backend/server.py"
    "frontend/package.json"
    "backend/requirements.txt"
    "README.md"
)

echo "📋 Checking critical files..."
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
        exit 1
    fi
done

# Check vercel.json configuration
echo ""
echo "🔧 Validating vercel.json..."
if jq . vercel.json > /dev/null 2>&1; then
    echo "✅ vercel.json is valid JSON"
else
    echo "❌ vercel.json has invalid JSON"
    exit 1
fi

# Check backend entry point
echo ""
echo "🐍 Checking backend configuration..."
if grep -q "def handler" backend/server.py; then
    echo "✅ Vercel handler function present"
else
    echo "❌ Vercel handler function missing"
    exit 1
fi

# Check frontend build script
echo ""
echo "⚛️ Checking frontend configuration..."
if grep -q "vercel-build" frontend/package.json; then
    echo "✅ Vercel build script configured"
else
    echo "❌ Vercel build script missing"
    exit 1
fi

# Check environment template
echo ""
echo "🔐 Checking environment configuration..."
if [ -f "frontend/.env.example" ]; then
    echo "✅ Frontend environment template exists"
else
    echo "❌ Frontend environment template missing"
fi

if [ -f "backend/.env.example" ]; then
    echo "✅ Backend environment template exists"
else
    echo "❌ Backend environment template missing"
fi

echo ""
echo "🎉 VERIFICATION COMPLETE!"
echo "========================"
echo ""
echo "✅ Your project is ready for Vercel deployment!"
echo ""
echo "Next steps:"
echo "1. Create new GitHub repository"
echo "2. Push this code to GitHub"
echo "3. Import repository to Vercel"
echo "4. Set environment variables in Vercel dashboard"
echo "5. Deploy and test"
echo ""
echo "📖 See VERCEL_DEPLOYMENT_COMPLETE.md for detailed instructions"
echo ""