# 🚀 AWS Free Tier Deployment Guide

## 📊 **Cost Analysis**
- **AWS Free Tier**: FREE for 12 months, then ~$10-20/month
- **Recommended Free Stack**: FREE FOREVER (Vercel + Railway + MongoDB Atlas)

## 🎯 **Option 1: Recommended Free Stack (PERMANENTLY FREE)**

### **Step 1: Database - MongoDB Atlas (FREE)**
1. Go to https://www.mongodb.com/atlas/database
2. Sign up for free account
3. Create M0 Sandbox cluster (FREE FOREVER)
4. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/database`
5. Whitelist IP: 0.0.0.0/0 (allow all)

### **Step 2: Backend - Railway (FREE)**
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/invoicing
   PORT=8001
   SECRET_KEY=your-secret-key-here
   ALLOWED_ORIGINS=*
   ```
6. Railway auto-detects FastAPI and deploys
7. Get your backend URL: `https://your-app.railway.app`

### **Step 3: Frontend - Vercel (FREE)**
1. Go to https://vercel.com
2. Sign up with GitHub  
3. Click "Import Project"
4. Select your repository
5. Set build settings:
   - Build Command: `cd frontend && npm run build`
   - Output Directory: `frontend/build`
6. Add environment variable:
   ```
   REACT_APP_BACKEND_URL=https://your-app.railway.app
   ```
7. Deploy automatically
8. Get your frontend URL: `https://your-app.vercel.app`

**✅ Total Cost: $0 FOREVER**

---

## 🔧 **Option 2: AWS Free Tier (12 MONTHS FREE)**

### **Prerequisites**
- AWS Account (requires credit card for verification)
- Basic Linux knowledge

### **Step 1: Launch EC2 Instance**
1. Go to AWS Console → EC2
2. Launch Instance
3. Choose "Ubuntu Server 22.04 LTS" (Free tier eligible)
4. Select "t2.micro" instance type
5. Create/use existing key pair
6. Configure Security Groups:
   ```
   SSH (22): Your IP
   HTTP (80): Anywhere
   HTTPS (443): Anywhere  
   Custom (8001): Anywhere (for FastAPI)
   Custom (3000): Anywhere (for React dev)
   ```
7. Launch instance

### **Step 2: Connect and Setup Server**
```bash
# Connect to instance
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python and pip
sudo apt install python3 python3-pip python3-venv -y

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### **Step 3: Deploy Application**
```bash
# Clone your repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo

# Setup Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create environment file
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017/invoicing
PORT=8001
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=*
EOF

# Setup Frontend
cd ../frontend
npm install
REACT_APP_BACKEND_URL=http://your-ec2-public-ip:8001 npm run build

# Create systemd service for backend
sudo tee /etc/systemd/system/backend.service > /dev/null << EOF
[Unit]
Description=FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/your-repo/backend
Environment=PATH=/home/ubuntu/your-repo/backend/venv/bin
ExecStart=/home/ubuntu/your-repo/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start backend service
sudo systemctl daemon-reload
sudo systemctl start backend
sudo systemctl enable backend
```

### **Step 4: Configure Nginx**
```bash
# Configure Nginx for React
sudo tee /etc/nginx/sites-available/default > /dev/null << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /home/ubuntu/your-repo/frontend/build;
    index index.html index.htm;

    server_name _;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Restart Nginx
sudo systemctl restart nginx
```

### **Step 5: Setup SSL (Optional)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace your-domain.com)
sudo certbot --nginx -d your-domain.com
```

## 📊 **Cost Comparison**

| Option | Year 1 | Year 2+ | Pros | Cons |
|--------|--------|---------|------|------|
| **Free Stack** | $0 | $0 | Truly free, managed services | Some limits |
| **AWS Free Tier** | $0 | ~$120-240 | Full control, AWS ecosystem | Becomes expensive |

## 🎯 **Recommendation**

**Use the Free Stack (Vercel + Railway + MongoDB Atlas)** because:
- ✅ **Permanently free**
- ✅ **Easier deployment**  
- ✅ **Better performance**
- ✅ **Automatic scaling**
- ✅ **No server maintenance**

## 📞 **Need Help?**

If you choose the AWS option and get stuck, I can help with:
1. EC2 instance setup
2. Domain configuration  
3. SSL certificate setup
4. Performance optimization
5. Monitoring and logging

## 🔗 **Quick Links**
- MongoDB Atlas: https://www.mongodb.com/atlas/database
- Railway: https://railway.app  
- Vercel: https://vercel.com
- AWS Console: https://console.aws.amazon.com