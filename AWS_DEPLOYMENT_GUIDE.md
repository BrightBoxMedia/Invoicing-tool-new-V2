# AWS Deployment Guide - Invoice Management System with PDF Editor

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables Setup

**Backend Environment Variables (Required):**
```bash
MONGO_URL=mongodb://your-mongodb-host:27017
DB_NAME=activus_invoice_db
JWT_SECRET=your-production-jwt-secret-key-here
PORT=8001
UPLOAD_DIR=/tmp/uploads/logos
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://your-alt-domain.com
```

**Frontend Environment Variables (Required):**
```bash
REACT_APP_BACKEND_URL=https://your-backend-api-domain.com
```

### 2. Database Options for AWS

#### Option A: AWS DocumentDB (Recommended for Production)
```bash
MONGO_URL=mongodb://username:password@your-cluster.cluster-xyz.docdb.amazonaws.com:27017/?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

#### Option B: Self-managed MongoDB on EC2
```bash
MONGO_URL=mongodb://username:password@your-ec2-mongodb-ip:27017
```

#### Option C: MongoDB Atlas (Cloud)
```bash
MONGO_URL=mongodb+srv://username:password@your-cluster.mongodb.net/
```

## 🐳 Deployment Methods

### Method 1: ECS with Docker (Recommended)

1. **Push Docker images to ECR:**
```bash
# Build and push backend
docker build -f Dockerfile.backend -t your-backend-image .
docker tag your-backend-image:latest your-account.dkr.ecr.region.amazonaws.com/invoice-backend:latest
docker push your-account.dkr.ecr.region.amazonaws.com/invoice-backend:latest

# Build and push frontend
docker build -f Dockerfile.frontend -t your-frontend-image .
docker tag your-frontend-image:latest your-account.dkr.ecr.region.amazonaws.com/invoice-frontend:latest  
docker push your-account.dkr.ecr.region.amazonaws.com/invoice-frontend:latest
```

2. **Create ECS Task Definition with environment variables**

3. **Set up Application Load Balancer (ALB) with:**
   - Frontend: Port 80 (React app)
   - Backend: Port 8001 with /api/* path routing

## 📋 Step-by-Step Deployment Process

### Step 1: Database Setup
1. Create AWS DocumentDB cluster OR setup MongoDB on EC2
2. Note down connection string
3. Configure security groups for database access

### Step 2: Environment Configuration
1. Copy `.env.production.template` files
2. Update with your AWS-specific values
3. Set environment variables in your deployment service

### Step 3: Build and Deploy
1. Build Docker images using provided Dockerfiles
2. Push to ECR or deploy directly
3. Configure load balancer routing

## 🔍 Health Checks Available

- Backend: `GET /api/health`
- Frontend: `GET /health`

## 🚨 Critical Configuration Points

1. **CORS Origins:** Update ALLOWED_ORIGINS for your domain
2. **Database Connection:** Use proper MongoDB connection string
3. **File Storage:** Uses /tmp by default (consider S3 for production)
4. **SSL/HTTPS:** Configure ACM certificate for production