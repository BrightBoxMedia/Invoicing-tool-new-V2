# 🏢 Activus Invoice Management System

A comprehensive, enterprise-grade invoice and project management system built with React, FastAPI, and MongoDB. Streamline your BOQ processing, project tracking, and GST-compliant invoice generation with advanced features like partial billing, quantity validation, and professional invoice customization.

## ✨ Features

### 🎯 Core Features
- **📊 Dashboard Analytics** - Real-time project and invoice metrics
- **📋 BOQ Processing** - Excel BOQ upload with intelligent parsing
- **🧾 Invoice Management** - Proforma and Tax invoices with GST compliance
- **📈 Project Tracking** - Comprehensive project lifecycle management
- **👥 User Management** - Role-based access control (Super Admin, Admin, User)
- **🔍 Smart Search** - Global search across projects, invoices, and clients

### 💼 Advanced Features
- **⚡ Quantity Validation** - Hard-blocking over-quantity billing prevention
- **🏢 Company Profile Management** - Multi-location and bank account support
- **🎨 Invoice Design Customizer** - Professional invoice template customization
- **📱 Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **📄 PDF Generation** - Professional PDF invoices with custom branding
- **📝 Activity Logging** - Comprehensive audit trail for all operations

### 🔒 Security & Compliance
- **🛡️ JWT Authentication** - Secure token-based authentication
- **📊 GST Compliance** - CGST/SGST and IGST support with automatic detection
- **🔐 Role-Based Access** - Granular permissions for different user types
- **📋 Data Validation** - Comprehensive input validation and sanitization

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and Yarn
- Python 3.8+
- MongoDB (Atlas recommended for production)

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/activus-invoice-management.git
cd activus-invoice-management

# Set up backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Update .env with your MongoDB connection string

# Set up frontend
cd ../frontend
yarn install
cp .env.example .env
# Update .env with your backend URL

# Run the application
# Terminal 1 - Backend
cd backend && uvicorn server:app --reload

# Terminal 2 - Frontend
cd frontend && yarn start
```

### Production Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions for GitHub and Vercel.

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 19, Tailwind CSS, Radix UI Components
- **Backend**: FastAPI, Python 3.8+
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT with bcrypt password hashing
- **File Processing**: OpenPyXL, ReportLab, PDFMiner
- **Deployment**: Vercel (Frontend + Serverless Backend)

### Project Structure
```
activus-invoice-management/
├── backend/                 # FastAPI backend
│   ├── server.py           # Main application file
│   ├── main.py            # Vercel entry point
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── App.js        # Main application component
│   │   └── index.js      # Application entry point
│   └── package.json      # Node.js dependencies
├── vercel.json            # Vercel deployment config
└── DEPLOYMENT.md          # Deployment guide
```

## 📊 Default Credentials

**Super Admin Access:**
- Email: `brightboxm@gmail.com`
- Password: `admin123`

⚠️ **Important**: Change the default password immediately after first login in production!

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
3. Customize invoice designs with logo upload and branding

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net
DB_NAME=invoice_management_prod
JWT_SECRET=your_secure_jwt_secret
```

**Frontend (.env):**
```
REACT_APP_BACKEND_URL=https://your-backend-url.vercel.app
```

## 🚀 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions for GitHub and Vercel.

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

### Getting Help
If you encounter issues:
1. Check the [troubleshooting section](./DEPLOYMENT.md#troubleshooting) in the deployment guide
2. Review the browser console for frontend errors
3. Check application logs for backend issues
4. Verify all environment variables are correctly set

## 🎉 Recent Achievements

✅ **Quantity Validation** - Prevents over-billing with real-time validation  
✅ **Unified Invoice System** - Single, streamlined invoice creation workflow  
✅ **Logo Upload Feature** - File upload instead of URL input  
✅ **Professional PDF Generation** - Customizable invoice templates  
✅ **Production Ready** - Configured for Vercel deployment  

---

Built with ❤️ for streamlined invoice management and professional billing processes.
