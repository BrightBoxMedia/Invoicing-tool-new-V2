import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import axios from 'axios';
import './App.css';

// Import components
import ActivityLogs from './components/ActivityLogs';
import ItemMaster from './components/ItemMaster';
import SmartSearch from './components/SmartSearch';
import Reports from './components/Reports';
import PDFProcessor from './components/PDFProcessor';
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
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
    { path: '/item-master', icon: '📦', label: 'Item Master' },
    { path: '/smart-search', icon: '🔍', label: 'Smart Search' },
    { path: '/pdf-processor', icon: '📄', label: 'PDF Processor' },
    { path: '/reports', icon: '📈', label: 'Reports' },
  ];

  const enhancedFeatures = [
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

        <div className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-8">
          Enhanced Features
        </div>
        {enhancedFeatures.map((item) => (
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

// Enhanced Project Billing Status Component
const ProjectBillingStatus = ({ project, onCreateInvoice }) => {
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project?.id) {
      fetchBillingStatus();
    }
  }, [project]);

  const fetchBillingStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/projects/${project.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBillingStatus(response.data.billing_status);
    } catch (error) {
      console.error('Error fetching billing status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading billing status...</div>;
  }

  if (!billingStatus) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      {/* Project Billing Summary */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-blue-900 mb-3">📊 Project Billing Status</h4>
        <div className="grid grid-cols-5 gap-4 text-sm">
          <div>
            <span className="text-blue-600">Next RA:</span>
            <div className="font-bold text-lg text-blue-800">{billingStatus.next_ra}</div>
          </div>
          <div>
            <span className="text-blue-600">Total Billed:</span>
            <div className="font-bold">₹{billingStatus.total_billed?.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-blue-600">Remaining:</span>
            <div className="font-bold text-green-600">₹{billingStatus.remaining_value?.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-blue-600">Project Completed:</span>
            <div className="font-bold">{billingStatus.completion_percentage}%</div>
          </div>
          <div>
            <span className="text-blue-600">Previous Invoices:</span>
            <div className="font-bold">{billingStatus.previous_invoices}</div>
          </div>
        </div>
      </div>

      {/* Dynamic Invoice Links with Percentages */}
      {billingStatus.invoice_links && billingStatus.invoice_links.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h5 className="font-semibold mb-3 text-gray-800">💼 Cash Flow Management Percentages</h5>
          <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
            <div className="bg-blue-100 p-3 rounded text-center">
              <div className="text-blue-600 font-medium">ABG %</div>
              <div className="text-lg font-bold text-blue-800">{project.abg_percentage || 0}%</div>
              <div className="text-xs text-blue-600">Advance Bank Guarantee</div>
            </div>
            <div className="bg-green-100 p-3 rounded text-center">
              <div className="text-green-600 font-medium">RA Bill %</div>
              <div className="text-lg font-bold text-green-800">{project.ra_percentage || 0}%</div>
              <div className="text-xs text-green-600">RA Bill with Taxes</div>
            </div>
            <div className="bg-yellow-100 p-3 rounded text-center">
              <div className="text-yellow-600 font-medium">Erection %</div>
              <div className="text-lg font-bold text-yellow-800">{project.erection_percentage || 0}%</div>
              <div className="text-xs text-yellow-600">Erection Work</div>
            </div>
            <div className="bg-purple-100 p-3 rounded text-center">
              <div className="text-purple-600 font-medium">PBG %</div>
              <div className="text-lg font-bold text-purple-800">{project.pbg_percentage || 0}%</div>
              <div className="text-xs text-purple-600">Performance Bank Guarantee</div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h6 className="font-medium text-gray-700 mb-2">Invoice History with Hyperlinks:</h6>
            <div className="space-y-2">
              {billingStatus.invoice_links.map((invoice, index) => (
                <div key={invoice.invoice_id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-blue-600">
                      <a 
                        href={`#/invoices/${invoice.invoice_id}`}
                        className="hover:text-blue-800 underline"
                      >
                        {invoice.invoice_number}
                      </a>
                    </span>
                    <span className="text-sm text-gray-600">
                      {new Date(invoice.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    ₹{invoice.amount?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOQ Items Billing Table */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3 text-gray-800 flex items-center">
          📋 BOQ Items - Select Quantities to Bill in {billingStatus.next_ra}:
        </h4>
        
        {billingStatus.boq_items && billingStatus.boq_items.length > 0 ? (
          <div className="overflow-x-auto border rounded-lg bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Item</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-700">Unit</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-700">Original Qty</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-700">Billed</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-700">Remaining</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-700">Rate (₹)</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-700">Bill Qty</th>
                  <th className="px-3 py-3 text-center font-medium text-gray-700">GST %</th>
                  <th className="px-3 py-3 text-right font-medium text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {billingStatus.boq_items.map((item, index) => (
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
                      ₹{item.rate.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={item.remaining_quantity}
                        placeholder=""
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-center"
                        defaultValue=""
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <select className="w-20 px-1 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18" selected>18%</option>
                        <option value="28">28%</option>
                        <option value="40">40%</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-medium">
                      ₹{item.amount?.toLocaleString() || '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            <p>No BOQ items found for this project</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => onCreateInvoice && onCreateInvoice(project)}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
        >
          Create {billingStatus.next_ra} Invoice
        </button>
      </div>
    </div>
  );
};

// Projects Component
const Projects = ({ currentUser }) => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showBOQModal, setShowBOQModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
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
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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
        <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
        <div className="flex space-x-4">
          <label className="text-white px-4 py-2 rounded-lg hover:opacity-90 cursor-pointer transition-colors" 
                 style={{backgroundColor: '#127285'}}>
            Upload BOQ Excel
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

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{project.project_name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div><strong>Client:</strong> {project.client_name}</div>
                  <div><strong>Architect:</strong> {project.architect}</div>
                  <div><strong>Location:</strong> {project.location}</div>
                  <div><strong>Value:</strong> ₹{project.total_project_value?.toLocaleString()}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                className="ml-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {selectedProject?.id === project.id ? 'Hide Details' : 'View Billing'}
              </button>
            </div>
            
            {/* Show billing status when project is selected */}
            {selectedProject?.id === project.id && (
              <ProjectBillingStatus 
                project={project} 
                onCreateInvoice={() => setShowInvoiceModal(true)}
              />
            )}
          </div>
        ))}
      </div>

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

              {/* BOQ Items */}
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Total Project Value: ₹{parsedData?.parsed_data?.total_project_value?.toLocaleString()}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Fields marked with * are required. Auto-filled data from Excel can be edited above.
                </p>
                
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

// Dashboard Component  
const Dashboard = ({ currentUser }) => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📊 Dashboard</h1>
        <p className="text-gray-600">Overview of your invoice management system</p>
        <div className="text-sm text-gray-500 mt-1">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-blue-900">{stats.total_projects || 0}</h3>
              <p className="text-blue-600">Total Projects</p>
              <p className="text-xs text-blue-500">Active projects</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-green-900">₹{(stats.total_project_value / 10000000 || 0).toFixed(1)}Cr</h3>
              <p className="text-green-600">Total Project Value</p>
              <p className="text-xs text-green-500">Across all projects</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 3a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100-2H7a1 1 0 000 2zm3-2a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-purple-900">{stats.total_invoices || 0}</h3>
              <p className="text-purple-600">Total Invoices</p>
              <p className="text-xs text-purple-500">Generated invoices</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-orange-900">₹{(stats.pending_collections / 100000 || 0).toFixed(1)}L</h3>
              <p className="text-orange-600">Pending Collections</p>
              <p className="text-xs text-orange-500">Collection efficiency: {stats.collection_efficiency?.toFixed(1) || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">⚡ Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/projects" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors">
            <div className="text-2xl mb-2">🏗️</div>
            <div className="font-medium text-gray-900">New Project</div>
            <div className="text-sm text-gray-500">Upload BOQ & Create</div>
          </Link>
          <Link to="/invoices" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors">
            <div className="text-2xl mb-2">📄</div>
            <div className="font-medium text-gray-900">Create Invoice</div>
            <div className="text-sm text-gray-500">Generate new invoice</div>
          </Link>
          <Link to="/clients" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors">
            <div className="text-2xl mb-2">👥</div>
            <div className="font-medium text-gray-900">Add Client</div>
            <div className="text-sm text-gray-500">Manage clients</div>
          </Link>
          <Link to="/reports" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium text-gray-900">View Reports</div>
            <div className="text-sm text-gray-500">Analytics & insights</div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
            <div className="flex-1">
              <div className="font-medium text-green-900">System Ready</div>
              <div className="text-sm text-green-700">All services operational - Ready for production use</div>
            </div>
            <div className="text-sm text-green-600">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
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
                  <Route path="/item-master" element={<ItemMaster currentUser={user} />} />
                  <Route path="/smart-search" element={<SmartSearch currentUser={user} />} />
                  <Route path="/pdf-processor" element={<PDFProcessor currentUser={user} />} />
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