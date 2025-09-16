# 🏢 Activus Invoice Management System

A comprehensive, enterprise-grade invoice and project management system built with React, FastAPI, and MongoDB. Streamline your BOQ processing, project tracking, and GST-compliant invoice generation with advanced features like partial billing, quantity validation, and professional invoice customization.

**🚀 PRODUCTION READY - Optimized for Vercel Deployment**

## ✨ Features

### 🎯 Core Features
- **📊 Dashboard Analytics** - Real-time project and invoice metrics
- **📋 BOQ Processing** - Excel BOQ upload with intelligent parsing
- **🧾 Invoice Management** - Proforma and Tax invoices with GST compliance
- **📈 Project Tracking** - Comprehensive project lifecycle management
- **👥 User Management** - Role-based access control (Super Admin, Admin, User)
- **🔍 Smart Search** - Global search across projects, invoices, and clients

### 💼 Advanced Features
- **⚡ Quantity Validation** - Hard-blocking over-quantity billing prevention (RESOLVED USER ISSUE #1)
- **🏢 Company Profile Management** - Multi-location and bank account support
- **🎨 Invoice Design Customizer** - Professional invoice template customization
- **🖼️ Logo Upload System** - File upload with base64 storage (RESOLVED USER ISSUE #2)
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **📄 PDF Generation** - Professional PDF invoices with custom branding
- **📝 Activity Logging** - Comprehensive audit trail for all operations

### 🔒 Security & Production Features
- **🛡️ JWT Authentication** - Secure token-based authentication
- **📊 GST Compliance** - CGST/SGST and IGST support with automatic detection
- **🔐 Role-Based Access** - Granular permissions for different user types
- **📋 Data Validation** - Comprehensive input validation and sanitization
- **🚨 Error Boundary** - Production-ready error handling
- **📊 Health Monitoring** - System health check endpoints
- **🔒 Security Headers** - Production security middleware
- **⚡ Rate Limiting** - API rate limiting for protection

## 🚀 Production Deployment (Vercel Ready)

### Prerequisites
- Node.js 16+ and Yarn
- MongoDB Atlas account (free tier available)
- Vercel account (free tier available)
- GitHub account

### Quick Deploy to Vercel

1. **Clone and Prepare:**
```bash
git clone https://github.com/yourusername/activus-invoice-management.git
cd activus-invoice-management
chmod +x deploy.sh
./deploy.sh
```

2. **Push to GitHub:**
```bash
git add .
git commit -m "Production ready: Activus Invoice Management System"
git push origin main
```

3. **Deploy on Vercel:**
- Import your GitHub repository on Vercel
- Set environment variables (see below)
- Deploy automatically

### Environment Variables for Vercel

Set these in your Vercel dashboard under Settings → Environment Variables:

```bash
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net
DB_NAME=invoice_management_prod
JWT_SECRET=your_super_secure_jwt_secret_key_here
REACT_APP_BACKEND_URL=https://your-project-name.vercel.app

# Optional - for custom CORS origins
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18, Tailwind CSS, Radix UI Components
- **Backend**: FastAPI, Python 3.8+
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT with bcrypt password hashing
- **File Processing**: OpenPyXL, ReportLab
- **Deployment**: Vercel (Frontend + Serverless Backend)
- **Bundle Size**: Optimized from >250MB to ~50MB

### Project Structure
```
activus-invoice-management/
├── backend/                 # FastAPI backend
│   ├── server.py           # Main application file
│   ├── main.py            # Vercel entry point
│   ├── config.py          # Production configuration
│   ├── health.py          # Health check utilities
│   ├── middleware.py      # Security middleware
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── config.js     # Frontend configuration
│   │   ├── App.js        # Main application component
│   │   └── index.js      # Application entry point
│   └── package.json      # Node.js dependencies
├── vercel.json            # Vercel deployment config
├── deploy.sh             # Deployment script
├── DEPLOYMENT.md         # Detailed deployment guide
└── QUICK_FIX_INSTRUCTIONS.md # Production fixes
```

## 📊 Default Credentials

**Super Admin Access:**
```
Email: brightboxm@gmail.com
Password: admin123
```

⚠️ **CRITICAL**: Change the default password immediately after first login in production!

## 🎯 Key Workflows

### 1. Project Creation
1. Upload Excel BOQ file with intelligent column mapping
2. Add project metadata (PO details, percentages, client info)
3. System validates BOQ structure and creates project

### 2. Invoice Generation
1. Select project and BOQ items for billing
2. Enter quantities with real-time validation
3. System prevents over-quantity billing automatically
4. Generate professional PDF invoices

### 3. Company Management
1. Configure multiple company profiles with locations
2. Set up bank account details for different locations
3. Upload logos and customize invoice designs

## 🔧 Production Features

### Health Monitoring
- `/health` - Basic health check
- `/health/detailed` - Comprehensive system health
- `/api/admin/system-health` - Admin system monitoring

### Security Features
- Rate limiting (1000 requests/minute)
- Security headers (XSS protection, content type options)
- CORS configuration
- JWT token validation
- Input sanitization

### Performance Optimizations
- Bundle size optimized for Vercel (50MB vs 250MB+)
- Async database operations
- Error boundaries for production
- Request logging and monitoring

## 🐛 Troubleshooting

### Common Deployment Issues

1. **404 Error after Deployment:**
   - Check `REACT_APP_BACKEND_URL` is set correctly in Vercel
   - Ensure it points to your Vercel app URL

2. **Database Connection Issues:**
   - Verify MongoDB Atlas connection string
   - Check IP whitelist (use 0.0.0.0/0 for Vercel)
   - Confirm database user permissions

3. **Build Failures:**
   - Check all environment variables are set
   - Verify vercel.json configuration
   - Review build logs for specific errors

## 🎉 Recent Achievements

✅ **Critical User Issues Resolved:**
- Issue #1: Quantity validation prevents over-billing (7.30 > 1.009 scenario blocked)
- Issue #2: Logo upload with file interface and base64 storage

✅ **Production Optimizations:**
- Bundle size reduced by 80% (250MB → 50MB)
- Vercel deployment optimized
- Error handling and monitoring added
- Security middleware implemented

✅ **Core Features Verified:**
- Invoice creation with quantity validation
- Excel BOQ processing
- PDF generation
- User management
- Company profiles
- Dashboard analytics

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

### Documentation
- [Deployment Guide](./DEPLOYMENT.md) - Complete production deployment
- [Quick Fix Guide](./QUICK_FIX_INSTRUCTIONS.md) - Common issues and solutions

### Getting Help
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Verify all environment variables are set correctly
4. Check browser console for frontend errors

---

**Built with ❤️ for professional invoice management and streamlined business processes.**

🚀 **Ready for production deployment on Vercel!**
