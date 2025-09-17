# 🚀 AWS DEPLOYMENT GUIDE - Activus Invoice Management

## 📋 **DEPLOYMENT ARCHITECTURE**

**Frontend:** React app on S3 + CloudFront  
**Backend:** FastAPI on EC2 with Application Load Balancer  
**Database:** MongoDB Atlas (or AWS DocumentDB)  
**Domain:** Route 53 + Certificate Manager for SSL  

---

## 🔧 **STEP 1: AWS ACCOUNT SETUP**

### **1.1 Create AWS Account**
1. Go to [AWS Console](https://aws.amazon.com)
2. Create new account or sign in
3. Set up billing alerts (recommended)

### **1.2 Create IAM User**
```bash
# Create IAM user with programmatic access
# Attach policies: EC2FullAccess, S3FullAccess, CloudFrontFullAccess, Route53FullAccess
```

### **1.3 Install AWS CLI**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)
```

---

## 🗄️ **STEP 2: DATABASE SETUP (MongoDB Atlas)**

### **2.1 Create MongoDB Atlas Cluster**
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Create database user: `admin` / `secure_password`
4. Network Access: Add IP `0.0.0.0/0` (allow all)
5. Get connection string: `mongodb+srv://admin:password@cluster.mongodb.net`

### **2.2 Test Connection**
```bash
# Test MongoDB connection
python3 -c "
from pymongo import MongoClient
client = MongoClient('your_connection_string')
print('✅ MongoDB connection successful')
"
```

---

## 🖥️ **STEP 3: BACKEND DEPLOYMENT (EC2)**

### **3.1 Create EC2 Instance**
```bash
# Create security group
aws ec2 create-security-group \
    --group-name activus-backend-sg \
    --description "Activus Invoice Backend Security Group"

# Get security group ID
SG_ID=$(aws ec2 describe-security-groups \
    --group-names activus-backend-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Add inbound rules
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 8001 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

# Launch EC2 instance
aws ec2 run-instances \
    --image-id ami-0c7217cdde317cfec \
    --count 1 \
    --instance-type t3.small \
    --key-name your-key-pair \
    --security-group-ids $SG_ID \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=activus-backend}]'
```

### **3.2 Create Key Pair (if needed)**
```bash
# Create key pair
aws ec2 create-key-pair \
    --key-name activus-keypair \
    --query 'KeyMaterial' \
    --output text > activus-keypair.pem

chmod 400 activus-keypair.pem
```

### **3.3 Setup Backend on EC2**
```bash
# Get EC2 public IP
EC2_IP=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=activus-backend" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

# SSH into EC2
ssh -i activus-keypair.pem ubuntu@$EC2_IP

# On EC2 instance - Install dependencies
sudo apt update
sudo apt install -y python3 python3-pip nginx git

# Clone your repository
git clone https://github.com/yourusername/activus-invoice-management.git
cd activus-invoice-management

# Install backend dependencies
cd backend
pip3 install -r requirements.txt

# Create environment file
cat > .env << 'EOF'
MONGO_URL=mongodb+srv://admin:password@cluster.mongodb.net
DB_NAME=activus_invoice_production
JWT_SECRET=your_super_secure_jwt_secret_for_production
PYTHONPATH=/home/ubuntu/activus-invoice-management/backend
EOF

# Create systemd service
sudo cat > /etc/systemd/system/activus-backend.service << 'EOF'
[Unit]
Description=Activus Invoice Management Backend
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/activus-invoice-management/backend
Environment=PATH=/home/ubuntu/.local/bin
ExecStart=/home/ubuntu/.local/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable activus-backend
sudo systemctl start activus-backend

# Check status
sudo systemctl status activus-backend
```

### **3.4 Configure Nginx Reverse Proxy**
```bash
# Configure Nginx
sudo cat > /etc/nginx/sites-available/activus-backend << 'EOF'
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/activus-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🌐 **STEP 4: FRONTEND DEPLOYMENT (S3 + CloudFront)**

### **4.1 Build Frontend Locally**
```bash
# On your local machine
cd frontend

# Update environment for production
cat > .env.production << 'EOF'
REACT_APP_BACKEND_URL=https://api.your-domain.com
GENERATE_SOURCEMAP=false
EOF

# Build for production
npm run build
```

### **4.2 Create S3 Bucket**
```bash
# Create S3 bucket (must be globally unique)
BUCKET_NAME="activus-invoice-management-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region us-east-1

# Configure bucket for static website hosting
aws s3 website s3://$BUCKET_NAME \
    --index-document index.html \
    --error-document index.html

# Set bucket policy for public read
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file://bucket-policy.json
```

### **4.3 Upload Frontend Files**
```bash
# Upload build files to S3
aws s3 sync frontend/build/ s3://$BUCKET_NAME/ \
    --delete \
    --cache-control max-age=31536000 \
    --exclude "index.html" \
    --exclude "service-worker.js"

# Upload index.html with no-cache
aws s3 cp frontend/build/index.html s3://$BUCKET_NAME/ \
    --cache-control no-cache

echo "S3 Website URL: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
```

### **4.4 Create CloudFront Distribution**
```bash
# Create CloudFront distribution
cat > cloudfront-config.json << EOF
{
    "CallerReference": "activus-$(date +%s)",
    "Comment": "Activus Invoice Management Frontend",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        }
    },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            }
        ]
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}
EOF

# Create distribution
aws cloudfront create-distribution \
    --distribution-config file://cloudfront-config.json
```

---

## 🌍 **STEP 5: DOMAIN & SSL SETUP**

### **5.1 Purchase Domain (Route 53)**
```bash
# Check domain availability
aws route53domains check-domain-availability \
    --domain-name your-domain.com

# Register domain (optional - can use external domain)
aws route53domains register-domain \
    --domain-name your-domain.com \
    --duration-in-years 1 \
    --admin-contact file://contact-info.json \
    --registrant-contact file://contact-info.json \
    --tech-contact file://contact-info.json
```

### **5.2 Create SSL Certificate**
```bash
# Request SSL certificate
aws acm request-certificate \
    --domain-name your-domain.com \
    --subject-alternative-names "*.your-domain.com" \
    --validation-method DNS \
    --region us-east-1

# Get certificate ARN
CERT_ARN=$(aws acm list-certificates \
    --query 'CertificateSummaryList[0].CertificateArn' \
    --output text)

echo "Certificate ARN: $CERT_ARN"
```

### **5.3 Setup DNS Records**
```bash
# Create hosted zone
aws route53 create-hosted-zone \
    --name your-domain.com \
    --caller-reference $(date +%s)

# Get hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones-by-name \
    --dns-name your-domain.com \
    --query 'HostedZones[0].Id' \
    --output text | cut -d'/' -f3)

# Create A record for main domain (pointing to CloudFront)
# Create A record for API subdomain (pointing to EC2)
```

---

## 🔄 **STEP 6: LOAD BALANCER (OPTIONAL - RECOMMENDED)**

### **6.1 Create Application Load Balancer**
```bash
# Create ALB
aws elbv2 create-load-balancer \
    --name activus-alb \
    --subnets subnet-12345 subnet-67890 \
    --security-groups $SG_ID \
    --scheme internet-facing \
    --type application

# Create target group
aws elbv2 create-target-group \
    --name activus-targets \
    --protocol HTTP \
    --port 8001 \
    --vpc-id vpc-12345 \
    --target-type instance

# Register EC2 instance with target group
aws elbv2 register-targets \
    --target-group-arn arn:aws:elasticloadbalancing:... \
    --targets Id=i-1234567890abcdef0
```

---

## 🚀 **STEP 7: DEPLOYMENT AUTOMATION**

### **7.1 Create Deployment Script**
```bash
# Create deployment script
cat > deploy-to-aws.sh << 'EOF'
#!/bin/bash

echo "🚀 Deploying Activus Invoice Management to AWS"

# Build frontend
cd frontend
npm run build
cd ..

# Upload to S3
aws s3 sync frontend/build/ s3://$BUCKET_NAME/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*"

# Update backend on EC2
ssh -i activus-keypair.pem ubuntu@$EC2_IP << 'REMOTE_EOF'
cd activus-invoice-management
git pull origin main
cd backend
pip3 install -r requirements.txt
sudo systemctl restart activus-backend
REMOTE_EOF

echo "✅ Deployment complete!"
EOF

chmod +x deploy-to-aws.sh
```

---

## 🧪 **STEP 8: TESTING & VERIFICATION**

### **8.1 Test Endpoints**
```bash
# Test backend health
curl https://api.your-domain.com/health

# Test frontend
curl https://your-domain.com

# Test full authentication flow
curl -X POST https://api.your-domain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"brightboxm@gmail.com","password":"admin123"}'
```

### **8.2 Performance Testing**
```bash
# Install testing tools
npm install -g lighthouse

# Test frontend performance
lighthouse https://your-domain.com --output html --output-path ./lighthouse-report.html

# Test backend performance
ab -n 1000 -c 10 https://api.your-domain.com/health
```

---

## 🛡️ **STEP 9: SECURITY & MONITORING**

### **9.1 Setup CloudWatch Monitoring**
```bash
# Create CloudWatch alarms
aws cloudwatch put-metric-alarm \
    --alarm-name "activus-backend-cpu" \
    --alarm-description "Backend CPU usage" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanOrEqualToThreshold \
    --evaluation-periods 2
```

### **9.2 Setup Backup Strategy**
```bash
# Create automated EC2 snapshots
aws ec2 create-snapshot \
    --volume-id vol-1234567890abcdef0 \
    --description "Activus Backend Backup $(date)"

# Setup MongoDB Atlas automated backups (in Atlas console)
```

---

## 💰 **STEP 10: COST OPTIMIZATION**

### **10.1 Monitor Costs**
```bash
# Set up billing alerts
aws budgets create-budget \
    --account-id 123456789012 \
    --budget file://budget.json
```

### **10.2 Resource Optimization**
- Use t3.micro for development (free tier eligible)
- Enable S3 lifecycle policies for old files
- Use CloudFront caching effectively
- Monitor and right-size EC2 instances

---

## 📋 **FINAL CHECKLIST**

- [ ] ✅ MongoDB Atlas cluster created and accessible
- [ ] ✅ EC2 instance running with backend service
- [ ] ✅ S3 bucket hosting frontend files
- [ ] ✅ CloudFront distribution serving frontend
- [ ] ✅ Domain pointing to CloudFront
- [ ] ✅ SSL certificate installed and working
- [ ] ✅ API subdomain pointing to EC2/ALB
- [ ] ✅ Health checks passing
- [ ] ✅ Demo login working
- [ ] ✅ All features functional

## 🎉 **SUCCESS!**

Your Activus Invoice Management System is now live on AWS:

- **Frontend:** https://your-domain.com
- **Backend API:** https://api.your-domain.com
- **Admin Login:** brightboxm@gmail.com / admin123

**🚀 Professional AWS deployment complete!**

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues:**
1. **502 Bad Gateway:** Check backend service status
2. **CORS Errors:** Update CORS settings in FastAPI
3. **SSL Issues:** Verify certificate and DNS records
4. **Database Connection:** Check MongoDB Atlas network access

### **Useful Commands:**
```bash
# Check EC2 service logs
ssh -i activus-keypair.pem ubuntu@$EC2_IP
sudo journalctl -u activus-backend -f

# Check CloudFront cache
aws cloudfront get-distribution --id $DISTRIBUTION_ID

# Monitor costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost
```

**🎯 Your professional AWS deployment is ready for client showcase!**