import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import axios from 'axios';
import './App.css';

// Import components
import ActivityLogs from './components/ActivityLogs';
import SmartSearch from './components/SmartSearch';
import Reports from './components/Reports';
import AdminInterface from './components/AdminInterface';
import CompanyProfileManagement from './components/CompanyProfileManagement';
import InvoiceDesignCustomizer from './components/InvoiceDesignCustomizer';
import EnhancedInvoiceCreation from './components/EnhancedInvoiceCreation';
import Invoices from './components/Invoices';
import Clients from './components/Clients';
import BankGuarantees from './components/BankGuarantees';
import UserManagement from './components/UserManagement';
import { ProjectWebSocketProvider } from './components/ProjectWebSocket';
import EnhancedProjectDetails from './components/EnhancedProjectDetails';

// API configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

// Login Component
const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user);
    } catch (error) {
      setError(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Invoicing Tool</h2>
          <p className="text-gray-600 mt-2">Professional Invoice Management</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-3 px-4 rounded-lg hover:opacity-90 focus:ring-4 focus:ring-opacity-50 font-medium transition-colors disabled:opacity-50"
            style={{backgroundColor: '#127285', focusRingColor: '#127285'}}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ currentUser }) => {
  const location = useLocation();
  
  const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/projects', icon: '🏗️', label: 'Projects' },
    { path: '/invoices', icon: '📄', label: 'Invoices' },
    { path: '/clients', icon: '👥', label: 'Clients' },
    { path: '/bank-guarantees', icon: '🏦', label: 'Bank Guarantees' },
    { path: '/smart-search', icon: '🔍', label: 'Smart Search' },
    { path: '/reports', icon: '📈', label: 'Reports' },
    { path: '/company-profiles', icon: '🏢', label: 'Company Profiles' },
  ];

  const adminItems = [
    { path: '/activity-logs', icon: '📝', label: 'Activity Logs' },
    { path: '/user-management', icon: '👤', label: 'User Management' },
    { path: '/admin-interface', icon: '⚙️', label: 'Admin Interface' },
    { path: '/invoice-design', icon: '🎨', label: 'Invoice Design' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="w-64 bg-white shadow-lg h-full">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Invoicing Tool</h1>
      </div>
      
      <nav className="mt-6">
        <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Navigation
        </div>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
              isActive(item.path)
                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="mr-3">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
          <>
            <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-8">
              Admin
            </div>
            {adminItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </div>
  );
};

// Enhanced Dashboard Component with Better Filters
const Dashboard = ({ currentUser }) => {
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('last30');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter, statusFilter, clientFilter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all data
      const [statsResponse, projectsResponse, invoicesResponse] = await Promise.all([
        axios.get(`${API}/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setStats(statsResponse.data);
      setProjects(projectsResponse.data || []);
      setInvoices(invoicesResponse.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on selected filters
  const filteredProjects = projects.filter(project => {
    let matches = true;
    
    if (statusFilter !== 'all') {
      matches = matches && project.status === statusFilter;
    }
    
    if (clientFilter !== 'all') {
      matches = matches && project.client_name?.toLowerCase().includes(clientFilter.toLowerCase());
    }
    
    return matches;
  });

  const filteredInvoices = invoices.filter(invoice => {
    let matches = true;
    
    if (statusFilter !== 'all') {
      matches = matches && invoice.status === statusFilter;
    }
    
    return matches;
  });

  const uniqueClients = [...new Set(projects.map(p => p.client_name).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Filters */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Dashboard</h1>
          <p className="text-gray-600">Real-time overview with advanced filtering</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">🔍 Advanced Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="last7">Last 7 days</option>
              <option value="last30">Last 30 days</option>
              <option value="last90">Last 90 days</option>
              <option value="thisyear">This year</option>
              <option value="all">All time</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Filter</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clients</option>
              {uniqueClients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredProjects.length} projects and {filteredInvoices.length} invoices
        </div>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold">{filteredProjects.length}</h3>
              <p className="text-blue-100">Total Projects</p>
            </div>
            <div className="p-3 bg-blue-400 rounded-lg">
              🏗️
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold">₹{((stats.total_project_value || 0) / 10000000).toFixed(1)}Cr</h3>
              <p className="text-green-100">Project Value</p>
            </div>
            <div className="p-3 bg-green-400 rounded-lg">
              💰
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold">{filteredInvoices.length}</h3>
              <p className="text-purple-100">Total Invoices</p>
            </div>
            <div className="p-3 bg-purple-400 rounded-lg">
              📄
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-bold">₹{((stats.pending_collections || 0) / 100000).toFixed(1)}L</h3>
              <p className="text-orange-100">Pending Collections</p>
            </div>
            <div className="p-3 bg-orange-400 rounded-lg">
              💳
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">⚡ Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/projects" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors">
              <div className="text-2xl mb-2">🏗️</div>
              <div className="font-medium text-gray-900">New Project</div>
            </Link>
            <Link to="/invoices" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors">
              <div className="text-2xl mb-2">📄</div>
              <div className="font-medium text-gray-900">Create Invoice</div>
            </Link>
            <Link to="/clients" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors">
              <div className="text-2xl mb-2">👥</div>
              <div className="font-medium text-gray-900">Add Client</div>
            </Link>
            <Link to="/reports" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-gray-900">View Reports</div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📈 Performance Metrics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Collection Efficiency</span>
              <span className="font-semibold text-green-600">{(stats.collection_efficiency || 0).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Projects</span>
              <span className="font-semibold text-blue-600">{filteredProjects.filter(p => p.status === 'active').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed Projects</span>
              <span className="font-semibold text-gray-600">{filteredProjects.filter(p => p.status === 'completed').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Recent Projects</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.slice(0, 5).map((project) => (
                <tr key={project.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {project.project_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.client_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{(project.total_project_value || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ENHANCED Projects Component with REAL-TIME WEBSOCKET SYSTEM
const Projects = ({ currentUser }) => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [showBOQModal, setShowBOQModal] = useState(false);
  const [showEnhancedInvoice, setShowEnhancedInvoice] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProjectBillingData = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Get project details and invoices
      const [projectResponse, invoicesResponse] = await Promise.all([
        axios.get(`${API}/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const project = projectResponse.data;
      const allInvoices = invoicesResponse.data || [];
      
      // Filter invoices for this project
      const projectInvoices = allInvoices.filter(inv => inv.project_id === projectId);
      const taxInvoices = projectInvoices.filter(inv => inv.invoice_type === 'tax_invoice');
      
      // Calculate billing summary
      const totalBilled = taxInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalProjectValue = project.total_project_value || 0;
      const remainingValue = totalProjectValue - totalBilled;
      const completionPercentage = totalProjectValue > 0 ? (totalBilled / totalProjectValue * 100) : 0;
      
      // Create professional billing data
      const billingData = {
        project_name: project.project_name,
        client_name: project.client_name,
        total_value: totalProjectValue,
        total_billed: totalBilled,
        remaining_value: remainingValue,
        completion_percentage: completionPercentage,
        next_ra: `RA${taxInvoices.length + 1}`,
        total_invoices: projectInvoices.length,
        tax_invoices: taxInvoices.length,
        proforma_invoices: projectInvoices.filter(inv => inv.invoice_type === 'proforma').length,
        
        // Cash flow percentages
        abg_percentage: project.abg_percentage || 0,
        ra_percentage: project.ra_percentage || 0,
        erection_percentage: project.erection_percentage || 0,
        pbg_percentage: project.pbg_percentage || 0,
        
        // Invoice links with hyperlinks
        invoice_history: taxInvoices.map(inv => ({
          invoice_number: inv.invoice_number,
          invoice_id: inv.id,
          ra_number: inv.ra_number,
          amount: inv.total_amount,
          date: inv.invoice_date || inv.created_at,
          status: inv.status || 'Created'
        })),
        
        // Prepare BOQ items for billing
        boq_items_for_billing: (project.boq_items || []).map(item => {
          // Calculate already billed quantity from tax invoices
          let billedQty = 0;
          taxInvoices.forEach(invoice => {
            (invoice.items || []).forEach(invoiceItem => {
              if (invoiceItem.boq_item_id === item.id) {
                billedQty += invoiceItem.quantity || 0;
              }
            });
          });
          
          return {
            id: item.id,
            description: item.description,
            unit: item.unit,
            original_quantity: item.quantity || 0,
            billed_quantity: billedQty,
            remaining_quantity: Math.max(0, (item.quantity || 0) - billedQty),
            rate: item.rate || 0,
            gst_rate: item.gst_rate || 18,
            bill_quantity: '', // Empty by default as requested
            amount: 0
          };
        })
      };
      
      setProjectBillingData(billingData);
      
    } catch (error) {
      console.error('Error fetching project billing data:', error);
      setProjectBillingData(null);
    }
  };

  const handleViewProjectDetails = (project) => {
    setSelectedProject(project);
    setShowProjectDetails(true);
  };

  const handleCreateInvoice = (project) => {
    setSelectedProject(project);
    setShowEnhancedInvoice(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/upload-boq`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setParsedData(response.data);
      setShowBOQModal(true);
    } catch (error) {
      alert('Error uploading file: ' + (error.response?.data?.detail || error.message));
    }
  };

  const filteredProjects = projects.filter(project => {
    return !searchTerm || 
      project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🏗️ Projects</h2>
        <label className="text-white px-4 py-2 rounded-lg hover:opacity-90 cursor-pointer transition-colors bg-blue-600">
          📄 Upload BOQ Excel
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <input
          type="text"
          placeholder="Search projects or clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Projects List with PROFESSIONAL BILLING STATUS */}
      <div className="space-y-4">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Project Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{project.project_name}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Client:</span>
                      <div className="font-medium text-gray-900">{project.client_name}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Architect:</span>
                      <div className="font-medium text-gray-900">{project.architect}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Location:</span>
                      <div className="font-medium text-gray-900">{project.location}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Value:</span>
                      <div className="font-bold text-lg text-green-600">₹{(project.total_project_value || 0).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleViewProjectDetails(project)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Project Details
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setShowEnhancedInvoice(true);
                    }}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    🧾 Create Invoice
                  </button>
                </div>
              </div>
            </div>

            {/* PROFESSIONAL BILLING STATUS TABLE */}
            {selectedProject?.id === project.id && projectBillingData && (
              <div className="p-6 bg-gray-50">
                
                {/* Billing Summary Cards */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                    <div className="text-blue-600 text-sm font-medium">Next RA</div>
                    <div className="text-2xl font-bold text-blue-800">{projectBillingData.next_ra}</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                    <div className="text-green-600 text-sm font-medium">Total Billed</div>
                    <div className="text-lg font-bold text-green-800">₹{projectBillingData.total_billed.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
                    <div className="text-orange-600 text-sm font-medium">Remaining Value</div>
                    <div className="text-lg font-bold text-orange-800">₹{projectBillingData.remaining_value.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
                    <div className="text-purple-600 text-sm font-medium">Project Completed</div>
                    <div className="text-lg font-bold text-purple-800">{projectBillingData.completion_percentage.toFixed(1)}%</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200">
                    <div className="text-gray-600 text-sm font-medium">Total Invoices</div>
                    <div className="text-lg font-bold text-gray-800">{projectBillingData.total_invoices}</div>
                  </div>
                </div>

                {/* Cash Flow Management Percentages */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-3 text-blue-900">💼 Cash Flow Management Percentages</h4>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="bg-blue-100 p-3 rounded border border-blue-300">
                      <div className="text-blue-600 font-medium">ABG %</div>
                      <div className="text-2xl font-bold text-blue-800">{projectBillingData.abg_percentage}%</div>
                      <div className="text-xs text-blue-600">Advance Bank Guarantee</div>
                    </div>
                    <div className="bg-green-100 p-3 rounded border border-green-300">
                      <div className="text-green-600 font-medium">RA Bill %</div>
                      <div className="text-2xl font-bold text-green-800">{projectBillingData.ra_percentage}%</div>
                      <div className="text-xs text-green-600">RA Bill with Taxes</div>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded border border-yellow-300">
                      <div className="text-yellow-600 font-medium">Erection %</div>
                      <div className="text-2xl font-bold text-yellow-800">{projectBillingData.erection_percentage}%</div>
                      <div className="text-xs text-yellow-600">Erection Work</div>
                    </div>
                    <div className="bg-purple-100 p-3 rounded border border-purple-300">
                      <div className="text-purple-600 font-medium">PBG %</div>
                      <div className="text-2xl font-bold text-purple-800">{projectBillingData.pbg_percentage}%</div>
                      <div className="text-xs text-purple-600">Performance Bank Guarantee</div>
                    </div>
                  </div>
                </div>

                {/* Invoice History with Hyperlinks */}
                {projectBillingData.invoice_history.length > 0 && (
                  <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                    <h4 className="font-semibold mb-3 text-gray-800">📄 Invoice History</h4>
                    <div className="space-y-2">
                      {projectBillingData.invoice_history.map((invoice, index) => (
                        <div key={invoice.invoice_id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                          <div className="flex items-center space-x-4">
                            <Link 
                              to={`/invoices`}
                              className="font-medium text-blue-600 hover:text-blue-800 underline"
                            >
                              {invoice.invoice_number}
                            </Link>
                            {invoice.ra_number && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                {invoice.ra_number}
                              </span>
                            )}
                            <span className="text-sm text-gray-600">
                              {new Date(invoice.date).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          <div className="font-semibold text-gray-900">
                            ₹{invoice.amount.toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* BOQ Items for Next Billing - DYNAMIC TABLE */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-gray-800 flex items-center">
                    📋 BOQ Items - Select Quantities for {projectBillingData.next_ra}:
                  </h4>
                  
                  {projectBillingData.boq_items_for_billing && projectBillingData.boq_items_for_billing.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg bg-white">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Item Description</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700">Unit</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700">Original Qty</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700">Billed Qty</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700">Available Qty</th>
                            <th className="px-3 py-3 text-right font-medium text-gray-700">Rate (₹)</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700">Bill Qty</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700">GST %</th>
                            <th className="px-3 py-3 text-right font-medium text-gray-700">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectBillingData.boq_items_for_billing.map((item, index) => (
                            <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900 max-w-xs">
                                  {item.description}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-sm text-gray-600">
                                {item.unit}
                              </td>
                              <td className="px-3 py-3 text-center text-sm font-medium">
                                {item.original_quantity}
                              </td>
                              <td className="px-3 py-3 text-center text-sm text-red-600 font-medium">
                                {item.billed_quantity}
                              </td>
                              <td className="px-3 py-3 text-center text-sm text-green-600 font-medium">
                                {item.remaining_quantity}
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-medium">
                                ₹{item.rate.toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={item.remaining_quantity}
                                  placeholder=""
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-center"
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <select className="w-20 px-1 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
                                  <option value="0">0%</option>
                                  <option value="5">5%</option>
                                  <option value="12">12%</option>
                                  <option value="18" defaultValue>18%</option>
                                  <option value="28">28%</option>
                                  <option value="40">40%</option>
                                </select>
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-medium">
                                ₹0
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
                      <p>No BOQ items available for billing</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setShowEnhancedInvoice(true);
                    }}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                  >
                    Create {projectBillingData.next_ra} Invoice
                  </button>
                </div>

              </div>
            )}
          </div>
        ))}
      </div>

      {/* Enhanced Invoice Creation Modal */}
      {showEnhancedInvoice && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto m-4">
            <EnhancedInvoiceCreation
              currentUser={currentUser}
              projectId={selectedProject.id}
              onClose={() => {
                setShowEnhancedInvoice(false);
                setSelectedProject(null);
              }}
              onSuccess={() => {
                setShowEnhancedInvoice(false);
                setSelectedProject(null);
                fetchProjects();
                alert('Invoice created successfully!');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ErrorBoundary>
      <ProjectWebSocketProvider>
        <AuthContext.Provider value={{ user, logout: handleLogout }}>
          <Router>
            <div className="flex h-screen bg-gray-50">
              <Sidebar currentUser={user} />
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                  <div className="flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-gray-800">Invoicing Tool</h1>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">Welcome, {user.email}</span>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-auto">
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard currentUser={user} />} />
                    <Route path="/projects" element={<Projects currentUser={user} />} />
                    <Route path="/invoices" element={<Invoices currentUser={user} />} />
                    <Route path="/clients" element={<Clients currentUser={user} />} />
                    <Route path="/bank-guarantees" element={<BankGuarantees currentUser={user} />} />
                    <Route path="/smart-search" element={<SmartSearch currentUser={user} />} />
                    <Route path="/reports" element={<Reports currentUser={user} />} />
                    <Route path="/company-profiles" element={<CompanyProfileManagement currentUser={user} />} />
                    <Route path="/activity-logs" element={<ActivityLogs currentUser={user} />} />
                    <Route path="/user-management" element={<UserManagement currentUser={user} />} />
                    <Route path="/admin-interface" element={<AdminInterface currentUser={user} />} />
                    <Route path="/invoice-design" element={<InvoiceDesignCustomizer currentUser={user} />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </main>
              </div>
            </div>
          </Router>
        </AuthContext.Provider>
      </ProjectWebSocketProvider>
    </ErrorBoundary>
  );
}

export default App;