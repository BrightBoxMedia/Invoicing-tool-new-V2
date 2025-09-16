/**
 * Frontend configuration for Activus Invoice Management System
 * Optimized for Firebase deployment
 */

const config = {
  // API Configuration - Firebase Functions
  API_BASE_URL: process.env.REACT_APP_API_URL || window.location.origin,
  API_TIMEOUT: 30000, // 30 seconds
  
  // Application Settings
  APP_NAME: 'Activus Invoice Management System',
  APP_VERSION: '1.0.0',
  COMPANY_NAME: 'Activus Design & Build',
  
  // Authentication
  JWT_STORAGE_KEY: 'activus_auth_token',
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  
  // File Upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'],
  ALLOWED_EXCEL_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ],
  
  // UI Configuration
  ITEMS_PER_PAGE: 10,
  DEBOUNCE_DELAY: 300,
  
  // Feature Flags
  FEATURES: {
    PDF_GENERATION: true,
    LOGO_UPLOAD: true,
    QUANTITY_VALIDATION: true,
    ADVANCED_SEARCH: true,
    COMPANY_PROFILES: true,
    INVOICE_CUSTOMIZATION: true,
    REAL_TIME_VALIDATION: true,
    DASHBOARD_ANALYTICS: true
  },
  
  // Environment Detection
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  // API Endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      LOGOUT: '/api/auth/logout',
      REFRESH: '/api/auth/refresh'
    },
    PROJECTS: '/api/projects',
    INVOICES: '/api/invoices',
    CLIENTS: '/api/clients',
    COMPANY_PROFILES: '/api/company-profiles',
    ADMIN: {
      USERS: '/api/admin/users',
      SYSTEM_HEALTH: '/api/admin/system-health',
      UPLOAD_LOGO: '/api/admin/upload-logo'
    },
    HEALTH: '/api/health'
  },
  
  // Firebase Configuration
  FIREBASE: {
    REGION: 'us-central1',
    PROJECT_ID: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'activus-invoice-management'
  },
  
  // Theme Configuration
  THEME: {
    PRIMARY_COLOR: '#1f2937',
    SECONDARY_COLOR: '#3b82f6',
    SUCCESS_COLOR: '#10b981',
    WARNING_COLOR: '#f59e0b',
    ERROR_COLOR: '#ef4444'
  }
};

// Validation for critical configuration
if (!config.API_BASE_URL) {
  console.error('CRITICAL: API_BASE_URL not configured');
}

if (config.IS_PRODUCTION && config.API_BASE_URL.includes('localhost')) {
  console.warn('WARNING: Using localhost API URL in production');
}

// Development helpers
if (config.IS_DEVELOPMENT) {
  console.log('🔧 Activus Invoice Management - Development Mode');
  console.log('📡 API Base URL:', config.API_BASE_URL);
  console.log('🔥 Firebase Project:', config.FIREBASE.PROJECT_ID);
}

export default config;