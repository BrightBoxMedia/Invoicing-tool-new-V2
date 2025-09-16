# 🚀 Activus Invoice Management - Deployment Guide

This guide will help you deploy the Activus Invoice Management System to GitHub and Vercel for production use.

## 📋 Prerequisites

1. **GitHub Account** - For code repository
2. **Vercel Account** - For hosting (free tier available)
3. **MongoDB Atlas Account** - For production database (free tier available)
4. **Domain (Optional)** - For custom domain

## 🗄️ Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new cluster (choose the free M0 tier)

### Step 2: Configure Database Access
1. Go to "Database Access" in your Atlas dashboard
2. Add a new database user with read/write permissions
3. Note down the username and password

### Step 3: Configure Network Access
1. Go to "Network Access" in your Atlas dashboard
2. Add IP address `0.0.0.0/0` (allows access from anywhere - for production, restrict this)

### Step 4: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string (it will look like: `mongodb+srv://username:password@cluster.mongodb.net`)

## 📂 GitHub Repository Setup

### Step 1: Create GitHub Repository
1. Go to [GitHub](https://github.com) and create a new repository
2. Name it something like `activus-invoice-management`
3. Keep it public or private as per your preference

### Step 2: Prepare Local Repository
```bash
# Initialize git repository (if not already done)
cd /path/to/your/project
git init

# Add all files
git add .

# Make initial commit
git commit -m "Initial commit: Activus Invoice Management System"

# Add GitHub remote
git remote add origin https://github.com/yourusername/activus-invoice-management.git

# Push to GitHub
git push -u origin main
```

## 🚀 Vercel Deployment

### Step 1: Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### Step 2: Deploy via Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration from `vercel.json`

### Step 3: Configure Environment Variables
In your Vercel project dashboard, go to Settings > Environment Variables and add:

**For All Environments (Production, Preview, Development):**
- `MONGO_URL` = Your MongoDB Atlas connection string
- `DB_NAME` = `invoice_management_prod`
- `JWT_SECRET` = Your secure JWT secret key
- `REACT_APP_BACKEND_URL` = Your Vercel app URL (e.g., `https://your-app.vercel.app`)

### Step 4: Deploy
1. Push any changes to your GitHub repository
2. Vercel will automatically deploy
3. Your app will be available at `https://your-app.vercel.app`

## 🔧 Post-Deployment Configuration

### Step 1: Update CORS Settings
The backend is configured to allow all origins (`*`) for development. For production, update the CORS settings in `backend/server.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com", "https://your-app.vercel.app"],  # Restrict to your domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 2: Set Up Default Admin User
1. Access your deployed app
2. The system will automatically create a default super admin user:
   - Email: `brightboxm@gmail.com`
   - Password: `admin123`
3. **Important:** Change this password immediately after first login!

### Step 3: Configure Company Profiles
1. Login as super admin
2. Go to "Company Profiles" and add your company information
3. Go to "Invoice Design" to customize invoice templates

## 🔒 Security Recommendations

### Production Security Checklist:
- [ ] Change default admin password
- [ ] Update JWT secret key to a strong, unique value
- [ ] Restrict CORS origins to your domain only
- [ ] Enable MongoDB IP whitelist restrictions
- [ ] Set up SSL/TLS (Vercel provides this automatically)
- [ ] Regularly backup your MongoDB database
- [ ] Monitor application logs

## 📁 File Structure for Production

```
activus-invoice-management/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
├── vercel.json
├── .gitignore
├── DEPLOYMENT.md
└── README.md
```

## 🐛 Troubleshooting

### Common Issues:

1. **Build Fails on Vercel**
   - Check that all dependencies are listed in `requirements.txt` and `package.json`
   - Verify environment variables are set correctly

2. **Database Connection Issues**
   - Verify MongoDB connection string is correct
   - Check that your IP is whitelisted in MongoDB Atlas
   - Ensure database user has proper permissions

3. **CORS Errors**
   - Make sure `REACT_APP_BACKEND_URL` points to your Vercel backend URL
   - Verify CORS settings in `server.py`

4. **File Upload Issues**
   - Vercel has limitations on file uploads for serverless functions
   - Consider using external storage like AWS S3 for production file uploads

## 🔄 Updates and Maintenance

### Updating the Application:
1. Make changes to your code locally
2. Test thoroughly in development
3. Commit and push to GitHub
4. Vercel will automatically redeploy

### Database Backups:
1. Use MongoDB Atlas automated backups
2. Or set up manual backup procedures
3. Test restore procedures regularly

## 📞 Support

If you encounter issues during deployment:
1. Check Vercel deployment logs
2. Review browser console for frontend errors
3. Monitor application logs for backend issues
4. Ensure all environment variables are correctly set

## 🎉 Success!

Once deployed successfully, your Activus Invoice Management System will be:
- ✅ Accessible via your Vercel URL
- ✅ Connected to MongoDB Atlas
- ✅ Ready for production use
- ✅ Automatically deployed on code changes

**Default Login Credentials:**
- Email: `brightboxm@gmail.com`
- Password: `admin123` (⚠️ Change immediately!)

Your invoice management system is now live and ready to help streamline your billing processes!