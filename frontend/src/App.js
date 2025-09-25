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

// RESTORED ORIGINAL Projects Component with WORKING Invoice Creation
const Projects = ({ currentUser }) => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showBOQModal, setShowBOQModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showEnhancedInvoice, setShowEnhancedInvoice] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [editableMetadata, setEditableMetadata] = useState({
    project_name: '',
    client: '',
    architect: '',
    location: '',
    abg_percentage: 0,
    ra_percentage: 0,
    erection_percentage: 0,
    pbg_percentage: 0
  });

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [architectFilter, setArchitectFilter] = useState('');

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
      
      // Initialize metadata with parsed data
      const projectInfo = response.data?.parsed_data?.project_info || {};
      setEditableMetadata({
        project_name: projectInfo.project_name || '',
        client: projectInfo.client_name || '',
        architect: projectInfo.architect || '',
        location: projectInfo.location || '',
        abg_percentage: 10,
        ra_percentage: 80,
        erection_percentage: 5,
        pbg_percentage: 5
      });
      
      setShowBOQModal(true);
    } catch (error) {
      alert('Error uploading file: ' + (error.response?.data?.detail || error.message));
    }
  };

  const createProjectFromBOQ = async () => {
    if (!parsedData) return;

    // Validate percentages
    const total = editableMetadata.abg_percentage + editableMetadata.ra_percentage + 
                  editableMetadata.erection_percentage + editableMetadata.pbg_percentage;
    
    if (Math.abs(total - 100) > 0.01) {
      alert(`Percentages must total 100%. Current total: ${total}%`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Create client if new
      let clientId = null;
      const clientName = editableMetadata.client;
      
      let existingClient = clients.find(c => c.name?.toLowerCase() === clientName.toLowerCase());
      
      if (!existingClient) {
        const clientData = {
          name: clientName,
          email: `${clientName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          phone: '+91 9999999999',
          address: editableMetadata.location || 'Address to be updated',
          city: 'Bangalore',
          state: 'Karnataka',
          gst_no: '',
          bill_to_address: editableMetadata.location || 'Address to be updated'
        };
        
        const clientResponse = await axios.post(`${API}/clients`, clientData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        clientId = clientResponse.data.client_id;
      } else {
        clientId = existingClient.id;
      }

      // Create project
      const projectData = {
        project_name: editableMetadata.project_name,
        client_id: clientId,
        client_name: clientName,
        architect: editableMetadata.architect,
        location: editableMetadata.location,
        abg_percentage: editableMetadata.abg_percentage,
        ra_percentage: editableMetadata.ra_percentage,
        erection_percentage: editableMetadata.erection_percentage,
        pbg_percentage: editableMetadata.pbg_percentage,
        total_project_value: parsedData?.parsed_data?.total_project_value || 0,
        boq_items: parsedData?.parsed_data?.boq_items || []
      };

      await axios.post(`${API}/projects`, projectData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Project created successfully!');
      setShowBOQModal(false);
      setParsedData(null);
      setEditableMetadata({
        project_name: '', client: '', architect: '', location: '',
        abg_percentage: 0, ra_percentage: 0, erection_percentage: 0, pbg_percentage: 0
      });
      fetchProjects();
    } catch (error) {
      console.error('Project creation error:', error);
      alert('Error creating project: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchTerm || 
      project.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.architect?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArchitect = !architectFilter || 
      project.architect?.toLowerCase().includes(architectFilter.toLowerCase());
    
    return matchesSearch && matchesArchitect;
  });

  const uniqueArchitects = [...new Set(projects.map(p => p.architect).filter(Boolean))];

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🏗️ Projects</h2>
        <div className="flex space-x-4">
          <label className="text-white px-4 py-2 rounded-lg hover:opacity-90 cursor-pointer transition-colors" 
                 style={{backgroundColor: '#127285'}}>
            📄 Upload BOQ Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Projects</label>
            <input
              type="text"
              placeholder="Search by project, client, or architect..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Architect</label>
            <select
              value={architectFilter}
              onChange={(e) => setArchitectFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Architects</option>
              {uniqueArchitects.map(architect => (
                <option key={architect} value={architect}>{architect}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setArchitectFilter('');
              }}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Projects List with ORIGINAL WORKING Design */}
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
                    onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {selectedProject?.id === project.id ? 'Hide Details' : 'View Billing'}
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

            {/* ORIGINAL WORKING Project Details */}
            {selectedProject?.id === project.id && (
              <div className="p-6 bg-gray-50">
                
                {/* Cash Flow Percentages */}
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-3 text-blue-900">💼 Cash Flow Management Percentages</h4>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="bg-blue-100 p-3 rounded">
                      <div className="text-blue-600 font-medium">ABG %</div>
                      <div className="text-2xl font-bold text-blue-800">{project.abg_percentage || 0}%</div>
                      <div className="text-xs text-blue-600">Advance Bank Guarantee</div>
                    </div>
                    <div className="bg-green-100 p-3 rounded">
                      <div className="text-green-600 font-medium">RA Bill %</div>
                      <div className="text-2xl font-bold text-green-800">{project.ra_percentage || 0}%</div>
                      <div className="text-xs text-green-600">RA Bill with Taxes</div>
                    </div>
                    <div className="bg-yellow-100 p-3 rounded">
                      <div className="text-yellow-600 font-medium">Erection %</div>
                      <div className="text-2xl font-bold text-yellow-800">{project.erection_percentage || 0}%</div>
                      <div className="text-xs text-yellow-600">Erection Work</div>
                    </div>
                    <div className="bg-purple-100 p-3 rounded">
                      <div className="text-purple-600 font-medium">PBG %</div>
                      <div className="text-2xl font-bold text-purple-800">{project.pbg_percentage || 0}%</div>
                      <div className="text-xs text-purple-600">Performance Bank Guarantee</div>
                    </div>
                  </div>
                </div>

                {/* BOQ Items Table */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 text-gray-800">📋 BOQ Items ({project.boq_items?.length || 0} items)</h4>
                  
                  {project.boq_items && project.boq_items.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg bg-white">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">S.No</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Description</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700">Unit</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700">Quantity</th>
                            <th className="px-3 py-3 text-right font-medium text-gray-700">Rate (₹)</th>
                            <th className="px-3 py-3 text-right font-medium text-gray-700">Amount (₹)</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700">GST %</th>
                            <th className="px-3 py-3 text-center font-medium text-gray-700">Billed Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {project.boq_items.slice(0, 10).map((item, index) => (
                            <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3 text-center">{item.sr_no || (index + 1)}</td>
                              <td className="px-4 py-3">
                                <div className="max-w-md">
                                  <div className="font-medium text-gray-900">{item.description}</div>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center text-gray-600">{item.unit}</td>
                              <td className="px-3 py-3 text-center font-medium">{item.quantity}</td>
                              <td className="px-3 py-3 text-right font-medium">₹{(item.rate || 0).toLocaleString('en-IN')}</td>
                              <td className="px-3 py-3 text-right font-semibold text-green-600">₹{(item.amount || 0).toLocaleString('en-IN')}</td>
                              <td className="px-3 py-3 text-center">
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                  {item.gst_rate || 18}%
                                </span>
                              </td>
                              <td className="px-3 py-3 text-center text-red-600 font-medium">
                                {item.billed_quantity || 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {project.boq_items.length > 10 && (
                        <div className="p-3 text-center text-gray-500 text-sm border-t">
                          ... and {project.boq_items.length - 10} more items
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
                      <p>No BOQ items found for this project</p>
                    </div>
                  )}
                </div>

                {/* Project Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600">Total Items</div>
                    <div className="text-2xl font-bold text-gray-900">{project.boq_items?.length || 0}</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600">Total Billed</div>
                    <div className="text-2xl font-bold text-blue-600">₹{(project.total_billed || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600">Remaining Value</div>
                    <div className="text-2xl font-bold text-green-600">₹{(project.remaining_value || project.total_project_value || 0).toLocaleString('en-IN')}</div>
                  </div>
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

      {/* BOQ Upload Modal */}
      {showBOQModal && parsedData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Review BOQ Data</h3>
              
              {/* Project Information */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold mb-3">Project Information (Edit if needed):</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Project Name *</label>
                    <input
                      type="text"
                      value={editableMetadata.project_name}
                      onChange={(e) => setEditableMetadata({...editableMetadata, project_name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Client Name *</label>
                    <input
                      type="text"
                      value={editableMetadata.client}
                      onChange={(e) => setEditableMetadata({...editableMetadata, client: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Enter client name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Architect *</label>
                    <input
                      type="text"
                      value={editableMetadata.architect}
                      onChange={(e) => setEditableMetadata({...editableMetadata, architect: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Enter architect name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <input
                      type="text"
                      value={editableMetadata.location}
                      onChange={(e) => setEditableMetadata({...editableMetadata, location: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Enter location"
                    />
                  </div>
                </div>

                {/* Cash Flow Percentages */}
                <div className="mt-4">
                  <h5 className="font-semibold mb-2">💰 Cash Flow Management Percentages</h5>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-blue-600 mb-1">ABG %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editableMetadata.abg_percentage}
                        onChange={(e) => setEditableMetadata({...editableMetadata, abg_percentage: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border rounded-md text-center"
                      />
                      <div className="text-xs text-blue-600 mt-1">Advance Bank Guarantee</div>
                    </div>
                    <div>
                      <label className="block text-sm text-green-600 mb-1">RA Bill %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editableMetadata.ra_percentage}
                        onChange={(e) => setEditableMetadata({...editableMetadata, ra_percentage: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border rounded-md text-center"
                      />
                      <div className="text-xs text-green-600 mt-1">RA Bill with Taxes</div>
                    </div>
                    <div>
                      <label className="block text-sm text-yellow-600 mb-1">Erection %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editableMetadata.erection_percentage}
                        onChange={(e) => setEditableMetadata({...editableMetadata, erection_percentage: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border rounded-md text-center"
                      />
                      <div className="text-xs text-yellow-600 mt-1">Erection Work</div>
                    </div>
                    <div>
                      <label className="block text-sm text-purple-600 mb-1">PBG %</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editableMetadata.pbg_percentage}
                        onChange={(e) => setEditableMetadata({...editableMetadata, pbg_percentage: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border rounded-md text-center"
                      />
                      <div className="text-xs text-purple-600 mt-1">Performance Bank Guarantee</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-blue-600">Total: </span>
                    <span className={`font-bold ${
                      Math.abs((editableMetadata.abg_percentage + editableMetadata.ra_percentage + 
                               editableMetadata.erection_percentage + editableMetadata.pbg_percentage) - 100) > 0.01 
                        ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {(editableMetadata.abg_percentage + editableMetadata.ra_percentage + 
                        editableMetadata.erection_percentage + editableMetadata.pbg_percentage).toFixed(1)}%
                    </span>
                    {Math.abs((editableMetadata.abg_percentage + editableMetadata.ra_percentage + 
                              editableMetadata.erection_percentage + editableMetadata.pbg_percentage) - 100) > 0.01 && (
                      <span className="text-red-600 ml-2">⚠️ Note: Total doesn't equal 100%</span>
                    )}
                  </div>
                </div>
              </div>

              {/* BOQ Items Preview */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Total Project Value: ₹{parsedData?.parsed_data?.total_project_value?.toLocaleString()}</h4>
                <h4 className="font-semibold mb-2">BOQ Items ({parsedData?.parsed_data?.boq_items?.length || 0}):</h4>
                <div className="max-h-64 overflow-y-auto border rounded">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-center">Unit</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData?.parsed_data?.boq_items?.slice(0, 10).map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-3 py-2 max-w-xs truncate">{item.description}</td>
                          <td className="px-3 py-2 text-center">{item.unit}</td>
                          <td className="px-3 py-2 text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">₹{item.rate?.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">₹{item.amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData?.parsed_data?.boq_items?.length > 10 && (
                    <div className="p-2 text-center text-gray-500 text-sm">
                      ... and {parsedData.parsed_data.boq_items.length - 10} more items
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowBOQModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createProjectFromBOQ}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Project
                </button>
              </div>
            </div>
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
    </ErrorBoundary>
  );
}

export default App;