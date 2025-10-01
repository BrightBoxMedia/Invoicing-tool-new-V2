# 🚀 Simple AWS Deployment Guide - Step by Step

## 📋 **What You'll Get**
- ✅ Your app running on AWS Free Tier
- ✅ MongoDB database included  
- ✅ Everything on one server (simple!)
- ✅ Public URL to access your app
- ✅ Free for 12 months

---

## 🎯 **Step 1: Create AWS Account (5 minutes)**

1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Enter email, password, account name
4. **Verification**: Provide phone number and credit card (for verification only)
5. Choose "Basic Plan" (Free)
6. ✅ **Account created!**

---

## 🖥️ **Step 2: Launch Server (10 minutes)**

### **2.1: Go to EC2 Dashboard**
1. Login to AWS Console: https://console.aws.amazon.com
2. Search "EC2" in the top search bar
3. Click "EC2" service

### **2.2: Launch Instance**
1. Click **"Launch Instance"** button (orange button)
2. **Name**: Enter `invoice-app-server`

### **2.3: Choose Operating System**
1. Select **"Ubuntu Server 22.04 LTS"** 
2. Make sure it says **"Free tier eligible"** ✅

### **2.4: Choose Instance Type**
1. Select **"t2.micro"** (should be pre-selected)
2. Make sure it says **"Free tier eligible"** ✅

### **2.5: Create Key Pair (Important!)**
1. Click **"Create new key pair"**
2. **Name**: `invoice-app-key`
3. **Type**: RSA
4. **Format**: .pem
5. Click **"Create key pair"**
6. 🔥 **IMPORTANT**: Save the downloaded file safely!

### **2.6: Network Settings**
1. Click **"Edit"** next to Network settings
2. **Allow SSH**: ✅ Checked (for your IP)
3. **Allow HTTP**: ✅ Check this box
4. **Allow HTTPS**: ✅ Check this box

### **2.7: Storage**
1. Keep default **30 GB** (Free tier limit)

### **2.8: Launch**
1. Click **"Launch Instance"** 
2. ✅ **Server is starting!**

---

## 🔗 **Step 3: Connect to Your Server (5 minutes)**

### **3.1: Get Server Details**
1. Go to "Instances" in EC2 dashboard
2. Click on your `invoice-app-server`
3. Copy the **"Public IPv4 address"** (e.g., 18.123.45.67)

### **3.2: Connect (Choose Your Method)**

**🖥️ For Windows:**
1. Download and install PuTTY: https://putty.org
2. Convert .pem key using PuTTYgen (included with PuTTY)
3. Use PuTTY to connect with converted .ppk key

**💻 For Mac/Linux:**
```bash
# Navigate to where you downloaded the key
cd Downloads

# Set correct permissions
chmod 400 invoice-app-key.pem

# Connect to server (replace with your IP)
ssh -i invoice-app-key.pem ubuntu@YOUR-SERVER-IP
```

**🌐 Browser Method (Easiest):**
1. In EC2 console, select your instance
2. Click **"Connect"** button
3. Choose **"EC2 Instance Connect"** 
4. Click **"Connect"**
5. ✅ **Terminal opens in browser!**

---

## ⚙️ **Step 4: Setup Server (15 minutes)**

Copy and paste these commands **one by one**:

### **4.1: Update System**
```bash
sudo apt update && sudo apt upgrade -y
```

### **4.2: Install Node.js (for Frontend)**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### **4.3: Install Python (for Backend)**
```bash
sudo apt install python3 python3-pip python3-venv git nginx -y
```

### **4.4: Install MongoDB**
```bash
# Add MongoDB repository
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

✅ **All software installed!**

---

## 📁 **Step 5: Deploy Your App (10 minutes)**

### **5.1: Upload Your Code**

**Method A: Git Clone (Recommended)**
```bash
# Clone your repository (replace with your GitHub repo URL)
git clone https://github.com/yourusername/your-invoice-app.git
cd your-invoice-app
```

**Method B: Create Files Manually**
If you don't have GitHub, I'll help you create the files directly on the server.

### **5.2: Setup Backend**
```bash
# Go to backend directory
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create environment file
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017/invoicing
PORT=8001
SECRET_KEY=super-secret-key-change-in-production
ALLOWED_ORIGINS=*
DB_NAME=invoicing
UPLOAD_DIR=/tmp/uploads
EOF

# Create uploads directory
sudo mkdir -p /tmp/uploads
sudo chmod 777 /tmp/uploads

# Test backend
python server.py &
sleep 5
curl http://localhost:8001/health
# Should return: {"status":"healthy"}

# Stop test
pkill -f "python server.py"
```

### **5.3: Setup Frontend**
```bash
# Go to frontend directory
cd ../frontend

# Install dependencies
npm install

# Create environment file with your server's public IP
echo "REACT_APP_BACKEND_URL=http://YOUR-SERVER-IP:8001" > .env

# Build for production
npm run build
```

**🔥 Replace `YOUR-SERVER-IP` with your actual server IP address!**

---

## 🌐 **Step 6: Configure Web Server (10 minutes)**

### **6.1: Create Backend Service**
```bash
# Create systemd service file
sudo tee /etc/systemd/system/invoice-backend.service > /dev/null << EOF
[Unit]
Description=Invoice App Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/your-invoice-app/backend
Environment=PATH=/home/ubuntu/your-invoice-app/backend/venv/bin
ExecStart=/home/ubuntu/your-invoice-app/backend/venv/bin/python server.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Start the service
sudo systemctl daemon-reload
sudo systemctl start invoice-backend
sudo systemctl enable invoice-backend

# Check if it's running
sudo systemctl status invoice-backend
```

### **6.2: Configure Nginx (Web Server)**
```bash
# Backup default config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Create new config
sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /home/ubuntu/your-invoice-app/frontend/build;
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

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🎉 **Step 7: Access Your App!**

### **7.1: Open Your App**
1. Go to your browser
2. Visit: `http://YOUR-SERVER-IP`
3. 🎉 **Your app should be live!**

### **7.2: Test Login**
- **Email**: `brightboxm@gmail.com`
- **Password**: `admin123`

### **7.3: Create First User (if needed)**
```bash
# Connect to MongoDB and create admin user
mongosh invoicing

# In MongoDB shell:
db.users.insertOne({
  id: "user_1",
  email: "brightboxm@gmail.com", 
  password_hash: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3gd/9mzd2W",
  role: "admin",
  company_name: "Your Company",
  is_active: true,
  created_at: new Date().toISOString()
})

# Exit MongoDB
exit
```

---

## 🔧 **Troubleshooting**

### **Problem: Can't access the app**
```bash
# Check if services are running
sudo systemctl status invoice-backend
sudo systemctl status nginx
sudo systemctl status mongod

# Check logs
sudo journalctl -u invoice-backend -f
sudo tail -f /var/log/nginx/error.log
```

### **Problem: Backend not starting**
```bash
# Check backend logs
cd /home/ubuntu/your-invoice-app/backend
source venv/bin/activate
python server.py
# Look for error messages
```

### **Problem: MongoDB connection failed**
```bash
# Test MongoDB
mongosh
# If this works, MongoDB is running

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

---

## 🎯 **Your App URLs**

- **Main App**: `http://YOUR-SERVER-IP`
- **Backend API**: `http://YOUR-SERVER-IP:8001`
- **Health Check**: `http://YOUR-SERVER-IP/health`

---

## 💰 **Free Tier Monitoring**

### **Stay Within Limits:**
- **EC2 Hours**: 750/month (one t2.micro = ~720 hours)
- **Storage**: 30GB (you're using ~10GB)
- **Data Transfer**: 15GB outbound/month

### **Monitor Usage:**
1. AWS Console → Billing → Free Tier
2. Check usage monthly
3. Set up billing alerts

---

## 🚀 **Next Steps**

1. **Custom Domain** (optional): Point your domain to the server IP
2. **SSL Certificate**: Add HTTPS using Let's Encrypt
3. **Backups**: Setup MongoDB backups
4. **Monitoring**: Add CloudWatch monitoring

---

## ❓ **Need Help?**

If anything doesn't work:
1. Check each step carefully
2. Look at error messages
3. Try the troubleshooting section
4. Ask me for help with specific errors!

**🎉 Congratulations! Your Invoice Management System is now live on AWS!**