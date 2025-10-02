# 🚀 AWS App Runner Deployment Instructions

## Files Created for You:
1. ✅ `Dockerfile` - Container configuration
2. ✅ `apprunner.yaml` - App Runner configuration with your MongoDB details
3. ✅ `backend/server_static.py` - Modified server for static file serving

## Your MongoDB Details (Already Added):
```
Connection: mongodb+srv://abhishek_db_user:6wnZLJTTyQ6eMIA@invoice-cluster.dhjcmx5.mongodb.net/invoicing?retryWrites=true&w=majority
Database: invoicing
Username: abhishek_db_user
Password: 6wnZLJTTyQ6eMIA
```

## Step-by-Step Deployment:

### Step 1: Push Files to GitHub
1. Copy these 3 files to your repository root:
   - `Dockerfile`
   - `apprunner.yaml` 
   - `backend/server_static.py`
2. Commit and push to your GitHub repo

### Step 2: AWS App Runner Setup
1. Go to: https://console.aws.amazon.com
2. Search "App Runner" → Click "AWS App Runner"
3. Click "Create an App Runner service"

### Step 3: Configure Source
- **Repository type**: Source code repository
- **Provider**: GitHub
- **Repository**: BrightBoxMedia/Invoicing-tool-new-V2
- **Branch**: main
- **Deployment trigger**: ✅ Automatic

### Step 4: Build Configuration
- **Configuration source**: ✅ Use a configuration file
- **Configuration file**: apprunner.yaml

### Step 5: Service Settings
- **Service name**: invoice-management-app
- **CPU**: 1 vCPU
- **Memory**: 2 GB

### Step 6: Deploy
- Click "Create & deploy"
- Wait 10-15 minutes for deployment
- Get your app URL: https://[random].us-east-1.awsapprunner.com

## Login Details:
- **Email**: brightboxm@gmail.com
- **Password**: admin123

## Expected Cost:
- **First 2 months**: FREE
- **After**: ~$15-25/month

## Troubleshooting:
- Check "Logs" tab in App Runner if deployment fails
- Verify all files are in GitHub repository root
- Make sure MongoDB connection string is correct

🎉 Your app will be live at the App Runner URL after successful deployment!