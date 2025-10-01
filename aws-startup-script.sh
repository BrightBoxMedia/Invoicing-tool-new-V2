#!/bin/bash

# AWS EC2 Startup Script for Invoice Management System
# Run this script on a fresh Ubuntu 22.04 EC2 instance

set -e

echo "🚀 Starting Invoice Management System Setup on AWS..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python, pip, and other dependencies
echo "📦 Installing Python and dependencies..."
sudo apt install python3 python3-pip python3-venv git nginx curl -y

# Install MongoDB
echo "📦 Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
echo "🗄️ Starting MongoDB..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Create application directory
echo "📁 Creating application directory..."
cd /home/ubuntu
mkdir -p invoice-app
cd invoice-app

# Note: User needs to upload their code here or clone from git
echo "📝 Application directory created at /home/ubuntu/invoice-app"
echo "📝 Please upload your application code to this directory"

# Create environment template
echo "🔧 Creating environment template..."
cat > backend-env-template << 'EOF'
MONGO_URL=mongodb://localhost:27017/invoicing
PORT=8001
SECRET_KEY=change-this-super-secret-key-in-production
ALLOWED_ORIGINS=*
DB_NAME=invoicing
UPLOAD_DIR=/tmp/uploads
EOF

cat > frontend-env-template << 'EOF'
REACT_APP_BACKEND_URL=http://YOUR-SERVER-IP:8001
EOF

# Create uploads directory
sudo mkdir -p /tmp/uploads
sudo chmod 777 /tmp/uploads

# Create systemd service template
echo "🔧 Creating service template..."
cat > invoice-backend.service << 'EOF'
[Unit]
Description=Invoice App Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/invoice-app/backend
Environment=PATH=/home/ubuntu/invoice-app/backend/venv/bin
ExecStart=/home/ubuntu/invoice-app/backend/venv/bin/python server.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Create nginx config template  
echo "🔧 Creating nginx config template..."
cat > nginx-config << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /home/ubuntu/invoice-app/frontend/build;
    index index.html;

    server_name _;

    # Serve React app
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8001/health;
    }
}
EOF

# Create deployment script
cat > deploy.sh << 'EOF'
#!/bin/bash

echo "🚀 Deploying Invoice Management System..."

# Check if code exists
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Backend and frontend directories not found!"
    echo "Please ensure your application code is in this directory"
    exit 1
fi

# Setup backend
echo "⚙️ Setting up backend..."
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp ../backend-env-template .env

# Test backend
echo "🧪 Testing backend..."
python server.py &
BACKEND_PID=$!
sleep 5

# Test health endpoint
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ Backend is working!"
else
    echo "❌ Backend health check failed!"
fi

# Stop test backend
kill $BACKEND_PID 2>/dev/null || true

# Setup frontend
echo "⚙️ Setting up frontend..."
cd ../frontend

# Install dependencies
npm install

# Get server IP
SERVER_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "REACT_APP_BACKEND_URL=http://$SERVER_IP:8001" > .env

# Build frontend
npm run build

echo "⚙️ Configuring services..."

# Install backend service
sudo cp ../invoice-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start invoice-backend
sudo systemctl enable invoice-backend

# Configure nginx
sudo cp ../nginx-config /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# Create admin user in MongoDB
echo "👤 Creating admin user..."
mongosh invoicing --eval "
db.users.insertOne({
  id: 'user_1',
  email: 'brightboxm@gmail.com',
  password_hash: '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3gd/9mzd2W',
  role: 'admin',
  company_name: 'Your Company',
  is_active: true,
  created_at: new Date().toISOString()
})
"

echo "✅ Deployment complete!"
echo "🌐 Your app is available at: http://$SERVER_IP"
echo "👤 Login with: brightboxm@gmail.com / admin123"

# Check service status
echo "📊 Service Status:"
sudo systemctl status invoice-backend --no-pager -l
sudo systemctl status nginx --no-pager -l
sudo systemctl status mongod --no-pager -l
EOF

chmod +x deploy.sh

echo "✅ Setup complete!"
echo ""
echo "🔥 NEXT STEPS:"
echo "1. Upload your application code to /home/ubuntu/invoice-app/"
echo "2. Ensure you have 'backend' and 'frontend' directories"
echo "3. Run: ./deploy.sh"
echo ""
echo "📁 Template files created:"
echo "  - backend-env-template (environment variables)"
echo "  - frontend-env-template (React environment)"  
echo "  - deploy.sh (deployment script)"
echo "  - nginx-config (web server config)"
echo "  - invoice-backend.service (backend service)"