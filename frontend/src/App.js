import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

// Components
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
          <h2 className="text-3xl font-bold text-gray-900">Activus Invoice System</h2>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
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
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-gray-600">
          <p> </p>
        </div>
      </div>
    </div>
  );
};

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-blue-600">Activus Invoice System</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-6">
              <Link to="/dashboard" className="text-gray-700 hover:text-blue-600 font-medium">
                Dashboard
              </Link>
              <Link to="/projects" className="text-gray-700 hover:text-blue-600 font-medium">
                Projects
              </Link>
              <Link to="/invoices" className="text-gray-700 hover:text-blue-600 font-medium">
                Invoices
              </Link>
              <Link to="/clients" className="text-gray-700 hover:text-blue-600 font-medium">
                Clients
              </Link>
              {user.role === 'super_admin' && (
                <Link to="/item-master" className="text-gray-700 hover:text-blue-600 font-medium">
                  Item Master
                </Link>
              )}
              {user.role === 'super_admin' && (
                <Link to="/logs" className="text-gray-700 hover:text-blue-600 font-medium">
                  Activity Logs
                </Link>
              )}
              {user.role === 'super_admin' && (
                <Link to="/users" className="text-gray-700 hover:text-blue-600 font-medium">
                  User Management
                </Link>
              )}
              {user.role === 'super_admin' && (
                <Link to="/reports" className="text-gray-700 hover:text-blue-600 font-medium">
                  Reports
                </Link>
              )}
              {user.role === 'super_admin' && (
                <Link to="/search" className="text-gray-700 hover:text-blue-600 font-medium">
                  Search
                </Link>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {user.email} ({user.role.replace('_', ' ')})
              </span>
              <button
                onClick={onLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">P</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{stats.total_projects || 0}</h3>
              <p className="text-gray-600">Total Projects</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">I</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">{stats.total_invoices || 0}</h3>
              <p className="text-gray-600">Total Invoices</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">₹</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">₹{(stats.total_invoiced_value || 0).toLocaleString()}</h3>
              <p className="text-gray-600">Total Invoiced</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">⏳</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">₹{(stats.pending_payment || 0).toLocaleString()}</h3>
              <p className="text-gray-600">Pending Payment</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [showBOQModal, setShowBOQModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boqStatus, setBOQStatus] = useState(null);
  const [partialQuantities, setPartialQuantities] = useState({});
  const [itemGSTRates, setItemGSTRates] = useState({});
  const [invoiceType, setInvoiceType] = useState('proforma');
  const [projectInvoices, setProjectInvoices] = useState([]);
  const [editableMetadata, setEditableMetadata] = useState({
    project_name: '',
    client: '',
    architect: '',
    location: ''
  });

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure we have valid data
      const validProjects = Array.isArray(response.data) ? response.data : [];
      setProjects(validProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
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
      setClients(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  };

  const fetchBOQStatus = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/projects/${projectId}/boq-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBOQStatus(response.data);
      
      // Initialize partial quantities and GST rates
      const quantities = {};
      const gstRates = {};
      if (response.data && response.data.boq_items) {
        response.data.boq_items.forEach(item => {
          const itemId = item.id || item.serial_number;
          quantities[itemId] = 0; // Start with 0, user will input
          gstRates[itemId] = item.gst_rate || 18.0;
        });
      }
      setPartialQuantities(quantities);
      setItemGSTRates(gstRates);
      
    } catch (error) {
      console.error('Error fetching BOQ status:', error);
      alert('Error loading BOQ billing status');
    }
  };

  const fetchProjectInvoices = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const filtered = (response.data || []).filter(inv => inv.project_id === projectId);
      setProjectInvoices(filtered);
    } catch (error) {
      console.error('Error fetching project invoices:', error);
      setProjectInvoices([]);
    }
  };

  const openInvoiceModal = async (project) => {
    setSelectedProject(project);
    await fetchBOQStatus(project.id);
    await fetchProjectInvoices(project.id);
    setShowInvoiceModal(true);
  };

  const handleCreateInvoice = async () => {
    if (!selectedProject || !boqStatus) {
      alert('Please select a project first');
      return;
    }

    // Prepare invoice items from selected BOQ items with partial quantities
    const invoiceItems = (boqStatus.boq_items || [])
      .filter(item => {
        const itemId = item.id || item.serial_number;
        const quantity = partialQuantities[itemId] || 0;
        return quantity > 0 && quantity <= (item.remaining_quantity || 0);
      })
      .map(item => {
        const itemId = item.id || item.serial_number;
        const quantity = partialQuantities[itemId];
        const gstRate = itemGSTRates[itemId] || 18.0;
        const amount = quantity * item.rate;
        const gstAmount = (amount * gstRate) / 100;
        
        return {
          boq_item_id: itemId,
          serial_number: item.serial_number,
          description: item.description,
          unit: item.unit,
          quantity: quantity,
          rate: item.rate,
          amount: amount,
          gst_rate: gstRate,
          gst_amount: gstAmount,
          total_with_gst: amount + gstAmount
        };
      });

    if (invoiceItems.length === 0) {
      alert('Please select items and quantities to bill');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const invoiceData = {
        project_id: selectedProject.id,
        project_name: selectedProject.project_name,
        client_id: selectedProject.client_id,
        client_name: selectedProject.client_name,
        invoice_type: invoiceType,
        items: invoiceItems,
        is_partial: true
      };

      const response = await axios.post(`${API}/invoices`, invoiceData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`Invoice ${response.data.ra_number} created successfully! Billing ${response.data.billing_percentage?.toFixed(1)}% of project.`);
      setShowInvoiceModal(false);
      setSelectedProject(null);
      setBOQStatus(null);
      setPartialQuantities({});
      setItemGSTRates({});
      setInvoiceType('proforma');
      fetchProjects(); // Refresh projects
    } catch (error) {
      console.error('Invoice creation error:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert('Error creating invoice: ' + errorMessage);
    }
  };

  const updatePartialQuantity = (itemId, quantity) => {
    setPartialQuantities(prev => ({
      ...prev,
      [itemId]: parseFloat(quantity) || 0
    }));
  };

  const updateGSTRate = (itemId, rate) => {
    setItemGSTRates(prev => ({
      ...prev,
      [itemId]: parseFloat(rate) || 18.0
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
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
      
      // Initialize editable metadata with parsed data
      const metadata = response.data?.metadata || {};
      setEditableMetadata({
        project_name: metadata.project_name || '',
        client: metadata.client || '',
        architect: metadata.architect || '',
        location: metadata.location || ''
      });
      
      setShowBOQModal(true);
    } catch (error) {
      alert('Error uploading file: ' + (error.response?.data?.detail || error.message));
    }
  };

  const createProjectFromBOQ = async () => {
    if (!parsedData) return;

    // Validate required fields
    if (!editableMetadata.project_name || !editableMetadata.client || !editableMetadata.architect) {
      alert('Please fill in all required fields: Project Name, Client, and Architect');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Create client if new
      let clientId = null;
      const clientName = editableMetadata.client;
      
      // Check if client exists
      let existingClient = clients.find(c => c.name && c.name.toLowerCase() === clientName.toLowerCase());
      
      if (!existingClient) {
        const clientData = {
          name: clientName,
          bill_to_address: editableMetadata.location || 'Address to be updated',
          gst_no: ''
        };
        
        const clientResponse = await axios.post(`${API}/clients`, clientData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        clientId = clientResponse.data.client_id;
      } else {
        clientId = existingClient.id;
      }

      // Create project with validated data
      const projectData = {
        project_name: editableMetadata.project_name,
        architect: editableMetadata.architect,
        client_id: clientId,
        client_name: clientName,
        metadata: {
          ...editableMetadata,
          date: new Date().toISOString()
        },
        boq_items: parsedData?.items || [],
        total_project_value: parsedData?.total_value || 0,
        advance_received: 0
      };

      await axios.post(`${API}/projects`, projectData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Project created successfully!');
      setShowBOQModal(false);
      setParsedData(null);
      setEditableMetadata({ project_name: '', client: '', architect: '', location: '' });
      fetchProjects();
    } catch (error) {
      console.error('Project creation error:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert('Error creating project: ' + errorMessage);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
        <div className="flex space-x-4">
          <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
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

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Architect</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.filter(project => project && project.id).map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{project.project_name || 'Untitled Project'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{project.client_name || 'Unknown Client'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{project.architect || 'Unknown Architect'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">₹{(project.total_project_value || 0).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">₹{(project.pending_payment || 0).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{project.created_at ? new Date(project.created_at).toLocaleDateString() : 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => openInvoiceModal(project)}
                    className="text-blue-600 hover:text-blue-900 mr-4 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md"
                  >
                    Create Invoice
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Invoice Creation Modal */}
      {showInvoiceModal && selectedProject && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowInvoiceModal(false);
          }
        }}>
          <div className="relative top-5 mx-auto p-5 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Create Invoice for: {selectedProject.project_name}
                </h3>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {/* Project Summary */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Client:</span>
                    <div className="font-semibold">{selectedProject.client_name}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Architect:</span>
                    <div className="font-semibold">{selectedProject.architect}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Project Value:</span>
                    <div className="font-semibold">₹{selectedProject.total_project_value?.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Invoice Type:</span>
                    <select
                      value={invoiceType}
                      onChange={(e) => setInvoiceType(e.target.value)}
                      className="mt-1 px-2 py-1 border border-gray-300 rounded text-sm font-semibold"
                    >
                      <option value="proforma">Proforma Invoice</option>
                      <option value="tax_invoice">Tax Invoice</option>
                    </select>
                  </div>
                </div>
              </div>

              {boqStatus && (
                <>
                  {/* Billing Status Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg mb-6">
                    <h4 className="font-semibold text-blue-900 mb-3">Project Billing Status</h4>
                    <div className="grid grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600">Next RA:</span>
                        <div className="font-bold text-lg text-blue-800">{boqStatus.next_ra_number}</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Total Billed:</span>
                        <div className="font-bold">₹{boqStatus.total_billed_value?.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Remaining:</span>
                        <div className="font-bold text-green-600">₹{boqStatus.remaining_value?.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Project Completed:</span>
                        <div className="font-bold">{boqStatus.project_billing_percentage?.toFixed(1)}%</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Previous Invoices:</span>
                        <div className="font-bold">{boqStatus.total_invoices}</div>
                      </div>
                    </div>
                  </div>

                  {/* Previous Invoices */}
                  {projectInvoices.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold mb-2 text-gray-800">Previous Invoices:</h4>
                      <div className="bg-yellow-50 p-3 rounded border text-sm">
                        {projectInvoices.map((inv, idx) => (
                          <span key={inv.id} className="inline-block mr-4 mb-1">
                            <strong>{inv.ra_number}:</strong> ₹{inv.total_amount?.toLocaleString()} 
                            ({inv.invoice_type}) - {inv.status}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BOQ Items Table */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-gray-800">
                      BOQ Items - Select Quantities to Bill in {boqStatus.next_ra_number}:
                    </h4>
                    <div className="max-h-96 overflow-y-auto border rounded-lg bg-white">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-3 text-left font-medium">Item</th>
                            <th className="px-3 py-3 text-left font-medium">Unit</th>
                            <th className="px-3 py-3 text-center font-medium">Original Qty</th>
                            <th className="px-3 py-3 text-center font-medium">Billed</th>
                            <th className="px-3 py-3 text-center font-medium">Remaining</th>
                            <th className="px-3 py-3 text-right font-medium">Rate (₹)</th>
                            <th className="px-3 py-3 text-center font-medium">Bill Qty</th>
                            <th className="px-3 py-3 text-center font-medium">GST %</th>
                            <th className="px-3 py-3 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boqStatus.boq_items.map((item, index) => {
                            const itemId = item.id || item.serial_number;
                            const billQty = partialQuantities[itemId] || 0;
                            const gstRate = itemGSTRates[itemId] || 18.0;
                            const amount = billQty * item.rate;
                            const gstAmount = (amount * gstRate) / 100;
                            const totalAmount = amount + gstAmount;
                            const canBill = item.remaining_quantity > 0;
                            
                            return (
                              <tr key={itemId} className={`border-t ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              } ${!canBill ? 'opacity-50' : ''}`}>
                                <td className="px-3 py-3">
                                  <div className="font-medium text-gray-900">{item.description}</div>
                                  <div className="text-xs text-gray-500">#{item.serial_number}</div>
                                  {!canBill && <div className="text-xs text-red-500 font-medium">Fully Billed</div>}
                                </td>
                                <td className="px-3 py-3 text-center">{item.unit}</td>
                                <td className="px-3 py-3 text-center font-medium">{item.quantity}</td>
                                <td className="px-3 py-3 text-center text-red-600 font-medium">
                                  {item.billed_quantity}
                                </td>
                                <td className="px-3 py-3 text-center text-green-600 font-bold">
                                  {item.remaining_quantity}
                                </td>
                                <td className="px-3 py-3 text-right">₹{item.rate.toLocaleString()}</td>
                                <td className="px-3 py-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.remaining_quantity}
                                    step="0.01"
                                    value={billQty}
                                    onChange={(e) => updatePartialQuantity(itemId, e.target.value)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0"
                                    disabled={!canBill}
                                  />
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    step="0.1"
                                    value={gstRate}
                                    onChange={(e) => updateGSTRate(itemId, e.target.value)}
                                    className={`w-16 px-2 py-1 border rounded text-center ${
                                      boqStatus.total_invoices > 0 ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                    }`}
                                    disabled={boqStatus.total_invoices > 0 || !canBill}
                                    title={boqStatus.total_invoices > 0 ? 'GST locked for RA2+ invoices' : 'Edit GST rate for RA1'}
                                  />
                                </td>
                                <td className="px-3 py-3 text-right">
                                  {billQty > 0 && (
                                    <div>
                                      <div className="font-bold text-gray-900">₹{totalAmount.toLocaleString()}</div>
                                      <div className="text-xs text-gray-500">
                                        Base: ₹{amount.toLocaleString()}<br/>
                                        GST: ₹{gstAmount.toLocaleString()}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {boqStatus.total_invoices > 0 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <strong>RA{boqStatus.total_invoices + 1} Note:</strong> GST rates are locked to match previous invoices for consistency. Only new/unbilled items allow GST editing.
                      </div>
                    )}
                  </div>

                  {/* Invoice Summary */}
                  {Object.values(partialQuantities).some(qty => qty > 0) && (
                    <div className="bg-green-50 p-4 rounded-lg mb-4 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-3">Invoice Summary ({boqStatus.next_ra_number})</h4>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-green-600">Items Selected:</span>
                          <div className="font-bold text-lg">
                            {Object.values(partialQuantities).filter(qty => qty > 0).length}
                          </div>
                        </div>
                        <div>
                          <span className="text-green-600">Subtotal:</span>
                          <div className="font-bold text-lg">
                            ₹{boqStatus.boq_items.reduce((sum, item) => {
                              const itemId = item.id || item.serial_number;
                              const qty = partialQuantities[itemId] || 0;
                              return sum + (qty * item.rate);
                            }, 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-green-600">Total GST:</span>
                          <div className="font-bold text-lg">
                            ₹{boqStatus.boq_items.reduce((sum, item) => {
                              const itemId = item.id || item.serial_number;
                              const qty = partialQuantities[itemId] || 0;
                              const gstRate = itemGSTRates[itemId] || 18.0;
                              const amount = qty * item.rate;
                              const gstAmount = (amount * gstRate) / 100;
                              return sum + gstAmount;
                            }, 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-green-600">Total Amount:</span>
                          <div className="font-bold text-xl text-green-800">
                            ₹{boqStatus.boq_items.reduce((sum, item) => {
                              const itemId = item.id || item.serial_number;
                              const qty = partialQuantities[itemId] || 0;
                              const gstRate = itemGSTRates[itemId] || 18.0;
                              const amount = qty * item.rate;
                              const gstAmount = (amount * gstRate) / 100;
                              return sum + amount + gstAmount;
                            }, 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoice}
                  disabled={!boqStatus || Object.values(partialQuantities).every(qty => qty === 0)}
                  className={`px-6 py-2 rounded-lg font-medium text-white ${
                    boqStatus && Object.values(partialQuantities).some(qty => qty > 0)
                      ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Create {boqStatus?.next_ra_number} Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOQ Review Modal */}
      {showBOQModal && parsedData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Review BOQ Data</h3>
              
              <div className="mb-6">
                <h4 className="font-semibold mb-4">Project Information (Edit if needed):</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={editableMetadata.project_name}
                      onChange={(e) => setEditableMetadata({...editableMetadata, project_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Name *
                    </label>
                    <input
                      type="text"
                      value={editableMetadata.client}
                      onChange={(e) => setEditableMetadata({...editableMetadata, client: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter client name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Architect *
                    </label>
                    <input
                      type="text"
                      value={editableMetadata.architect}
                      onChange={(e) => setEditableMetadata({...editableMetadata, architect: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter architect name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={editableMetadata.location}
                      onChange={(e) => setEditableMetadata({...editableMetadata, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter project location"
                    />
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Total Project Value:</strong> ₹{parsedData.total_value?.toLocaleString()}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Fields marked with * are required. Auto-filled data from Excel can be edited above.
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">BOQ Items ({parsedData?.items?.length || 0}):</h4>
                <div className="max-h-64 overflow-y-auto border rounded">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-left">Qty</th>
                        <th className="px-4 py-2 text-left">Rate</th>
                        <th className="px-4 py-2 text-left">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(parsedData?.items || []).slice(0, 10).map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">{item.description}</td>
                          <td className="px-4 py-2">{item.quantity}</td>
                          <td className="px-4 py-2">₹{item.rate}</td>
                          <td className="px-4 py-2">₹{item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(parsedData?.items?.length || 0) > 10 && (
                    <div className="p-2 text-center text-gray-500">
                      ... and {(parsedData?.items?.length || 0) - 10} more items
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowBOQModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={createProjectFromBOQ}
                  disabled={!editableMetadata.project_name || !editableMetadata.client || !editableMetadata.architect}
                  className={`px-6 py-2 rounded font-medium ${
                    editableMetadata.project_name && editableMetadata.client && editableMetadata.architect
                      ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Create Project
                  {(!editableMetadata.project_name || !editableMetadata.client || !editableMetadata.architect) && 
                    <span className="ml-2 text-xs">(Fill required fields)</span>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [invoiceType, setInvoiceType] = useState('proforma');
  const [selectedItems, setSelectedItems] = useState([]);
  const [boqStatus, setBOQStatus] = useState(null);
  const [partialQuantities, setPartialQuantities] = useState({});
  const [itemGSTRates, setItemGSTRates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
    fetchProjects();
    fetchClients();
  }, []);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchBOQStatus = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/projects/${projectId}/boq-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBOQStatus(response.data);
      
      // Initialize partial quantities and GST rates
      const quantities = {};
      const gstRates = {};
      response.data.boq_items.forEach(item => {
        const itemId = item.id || item.serial_number;
        quantities[itemId] = item.remaining_quantity || 0;
        gstRates[itemId] = item.gst_rate || 18.0;
      });
      setPartialQuantities(quantities);
      setItemGSTRates(gstRates);
      
    } catch (error) {
      console.error('Error fetching BOQ status:', error);
      alert('Error loading BOQ billing status');
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedProject || !boqStatus) {
      alert('Please select a project first');
      return;
    }

    // Prepare invoice items from selected BOQ items with partial quantities
    const invoiceItems = boqStatus.boq_items
      .filter(item => {
        const itemId = item.id || item.serial_number;
        const quantity = partialQuantities[itemId] || 0;
        return quantity > 0 && quantity <= item.remaining_quantity;
      })
      .map(item => {
        const itemId = item.id || item.serial_number;
        const quantity = partialQuantities[itemId];
        const gstRate = itemGSTRates[itemId] || 18.0;
        const amount = quantity * item.rate;
        const gstAmount = (amount * gstRate) / 100;
        
        return {
          boq_item_id: itemId,
          serial_number: item.serial_number,
          description: item.description,
          unit: item.unit,
          quantity: quantity,
          rate: item.rate,
          amount: amount,
          gst_rate: gstRate,
          gst_amount: gstAmount,
          total_with_gst: amount + gstAmount
        };
      });

    if (invoiceItems.length === 0) {
      alert('Please select items and quantities to bill');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const project = projects.find(p => p.id === selectedProject);
      
      const invoiceData = {
        project_id: selectedProject,
        project_name: project.project_name,
        client_id: project.client_id,
        client_name: project.client_name,
        invoice_type: invoiceType,
        items: invoiceItems,
        is_partial: true
      };

      const response = await axios.post(`${API}/invoices`, invoiceData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`Invoice ${response.data.ra_number} created successfully! Billing ${response.data.billing_percentage?.toFixed(1)}% of project.`);
      setShowModal(false);
      setSelectedProject('');
      setBOQStatus(null);
      setPartialQuantities({});
      setItemGSTRates({});
      setInvoiceType('proforma');
      fetchInvoices();
    } catch (error) {
      console.error('Invoice creation error:', error);
      let errorMessage = 'Unknown error occurred';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert('Error creating invoice: ' + errorMessage);
    }
  };

  const handleProjectChange = async (projectId) => {
    setSelectedProject(projectId);
    if (projectId) {
      await fetchBOQStatus(projectId);
    } else {
      setBOQStatus(null);
      setPartialQuantities({});
      setItemGSTRates({});
    }
  };

  const updatePartialQuantity = (itemId, quantity) => {
    setPartialQuantities(prev => ({
      ...prev,
      [itemId]: parseFloat(quantity) || 0
    }));
  };

  const updateGSTRate = (itemId, rate) => {
    setItemGSTRates(prev => ({
      ...prev,
      [itemId]: parseFloat(rate) || 18.0
    }));
  };

  const downloadPDF = async (invoiceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Error downloading PDF: ' + error.message);
    }
  };

  const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      if (response.data.size === 0) {
        throw new Error('Empty PDF received');
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Show success message
      alert(`Invoice ${invoiceNumber} downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintInvoice = async (invoiceId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      if (response.data.size === 0) {
        throw new Error('Empty PDF received');
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        alert('Please allow popups for this site to enable printing');
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      alert('Error printing invoice: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoiceId, invoiceNumber) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/invoices/${invoiceId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      if (response.data.size === 0) {
        throw new Error('Empty PDF received');
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error viewing PDF:', error);
      alert('Error viewing PDF: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Invoices Management v2.0</h2>
          {loading && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-sm">Processing PDF...</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Partial Invoice
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice # / RA#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">🎯 TYPE</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">💰 AMOUNT</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">📄 ACTIONS</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                  <div className="text-sm text-blue-600 font-semibold">{invoice.ra_number}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{invoice.project_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{invoice.client_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    invoice.invoice_type === 'tax_invoice' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {invoice.invoice_type === 'tax_invoice' ? 'Tax Invoice' : 'Proforma'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col space-y-2">
                    <div className="text-sm font-medium text-gray-900">₹{invoice.total_amount.toLocaleString()}</div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleViewInvoice(invoice.id, invoice.invoice_number)}
                        disabled={loading}
                        className="flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        title="View PDF"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
                        disabled={loading}
                        className="flex items-center px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        title="Download PDF"
                      >
                        📥 Download
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(invoice.id)}
                        disabled={loading}
                        className="flex items-center px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                        title="Print"
                      >
                        🖨️ Print
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Partial Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowModal(false);
          }
        }}>
          <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Create Partial Invoice (RA System)</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div class="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.project_name} - {project.client_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Type</label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="proforma">Proforma Invoice</option>
                    <option value="tax_invoice">Tax Invoice</option>
                  </select>
                </div>
              </div>

              {boqStatus && (
                <div className="mb-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-blue-900">Project Billing Status</h4>
                    <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-blue-600">Next RA:</span>
                        <span className="font-bold ml-2">{boqStatus.next_ra_number}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Total Project:</span>
                        <span className="font-bold ml-2">₹{boqStatus.total_project_value?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Billed So Far:</span>
                        <span className="font-bold ml-2">₹{boqStatus.total_billed_value?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Remaining:</span>
                        <span className="font-bold ml-2">₹{boqStatus.remaining_value?.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-blue-600">Project Billed:</span>
                      <span className="font-bold ml-2">{boqStatus.project_billing_percentage}%</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-gray-800">Select Items & Quantities to Bill:</h4>
                    <div className="max-h-80 overflow-y-auto border rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Description</th>
                            <th className="px-3 py-2 text-left">Unit</th>
                            <th className="px-3 py-2 text-left">Original Qty</th>
                            <th className="px-3 py-2 text-left">Billed</th>
                            <th className="px-3 py-2 text-left">Remaining</th>
                            <th className="px-3 py-2 text-left">Rate</th>
                            <th className="px-3 py-2 text-left">Bill Qty</th>
                            <th className="px-3 py-2 text-left">GST %</th>
                            <th className="px-3 py-2 text-left">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {boqStatus.boq_items.filter(item => item.can_bill).map((item, index) => {
                            const itemId = item.id || item.serial_number;
                            const billQty = partialQuantities[itemId] || 0;
                            const gstRate = itemGSTRates[itemId] || 18.0;
                            const amount = billQty * item.rate;
                            const gstAmount = (amount * gstRate) / 100;
                            const totalAmount = amount + gstAmount;
                            
                            return (
                              <tr key={itemId} className={`border-t ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                <td className="px-3 py-2">
                                  <div className="font-medium">{item.description}</div>
                                  <div className="text-xs text-gray-500">#{item.serial_number}</div>
                                </td>
                                <td className="px-3 py-2">{item.unit}</td>
                                <td className="px-3 py-2">{item.quantity}</td>
                                <td className="px-3 py-2 text-red-600">{item.billed_quantity}</td>
                                <td className="px-3 py-2 text-green-600 font-medium">{item.remaining_quantity}</td>
                                <td className="px-3 py-2">₹{item.rate}</td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.remaining_quantity}
                                    step="0.01"
                                    value={billQty}
                                    onChange={(e) => updatePartialQuantity(itemId, e.target.value)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                    placeholder="0"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    step="0.1"
                                    value={gstRate}
                                    onChange={(e) => updateGSTRate(itemId, e.target.value)}
                                    className={`w-16 px-2 py-1 border rounded text-center ${
                                      boqStatus.total_invoices > 0 ? 'bg-gray-100 text-gray-600' : 'border-gray-300'
                                    }`}
                                    disabled={boqStatus.total_invoices > 0}
                                    title={boqStatus.total_invoices > 0 ? 'GST locked for RA2+ invoices' : 'Edit GST rate for RA1'}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  {billQty > 0 && (
                                    <div>
                                      <div className="font-medium">₹{totalAmount.toLocaleString()}</div>
                                      <div className="text-xs text-gray-500">
                                        Base: ₹{amount.toLocaleString()} + GST: ₹{gstAmount.toLocaleString()}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    {boqStatus.total_invoices > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <strong>RA{boqStatus.total_invoices + 1} Note:</strong> GST rates are locked to match previous invoices for consistency. Only new/unbilled items allow GST editing.
                      </div>
                    )}
                  </div>

                  {/* Invoice Summary */}
                  {Object.values(partialQuantities).some(qty => qty > 0) && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Invoice Summary ({boqStatus.next_ra_number})</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-green-600">Items Selected:</span>
                          <span className="font-bold ml-2">
                            {Object.values(partialQuantities).filter(qty => qty > 0).length}
                          </span>
                        </div>
                        <div>
                          <span className="text-green-600">Subtotal:</span>
                          <span className="font-bold ml-2">
                            ₹{boqStatus.boq_items.reduce((sum, item) => {
                              const itemId = item.id || item.serial_number;
                              const qty = partialQuantities[itemId] || 0;
                              return sum + (qty * item.rate);
                            }, 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-green-600">Total with GST:</span>
                          <span className="font-bold ml-2">
                            ₹{boqStatus.boq_items.reduce((sum, item) => {
                              const itemId = item.id || item.serial_number;
                              const qty = partialQuantities[itemId] || 0;
                              const gstRate = itemGSTRates[itemId] || 18.0;
                              const amount = qty * item.rate;
                              const gstAmount = (amount * gstRate) / 100;
                              return sum + amount + gstAmount;
                            }, 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoice}
                  disabled={!selectedProject || !boqStatus || Object.values(partialQuantities).every(qty => qty === 0)}
                  className={`px-6 py-2 rounded font-medium ${
                    selectedProject && boqStatus && Object.values(partialQuantities).some(qty => qty > 0)
                      ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Create {boqStatus?.next_ra_number} Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    gst_no: '',
    bill_to_address: '',
    ship_to_address: '',
    contact_person: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/clients`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Client created successfully!');
      setShowModal(false);
      setFormData({
        name: '',
        gst_no: '',
        bill_to_address: '',
        ship_to_address: '',
        contact_person: '',
        phone: '',
        email: ''
      });
      fetchClients();
    } catch (error) {
      alert('Error creating client: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Client
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{client.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{client.gst_no || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{client.contact_person}</div>
                  <div className="text-sm text-gray-500">{client.phone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{client.bill_to_address}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{new Date(client.created_at).toLocaleDateString()}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Client</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                <input
                  type="text"
                  value={formData.gst_no}
                  onChange={(e) => setFormData({...formData, gst_no: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bill To Address *</label>
                <textarea
                  value={formData.bill_to_address}
                  onChange={(e) => setFormData({...formData, bill_to_address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ship To Address</label>
                <textarea
                  value={formData.ship_to_address}
                  onChange={(e) => setFormData({...formData, ship_to_address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/activity-logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Activity Logs</h2>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{new Date(log.timestamp).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{log.user_email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {log.user_role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{log.action}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{log.description}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ItemMaster = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    unit: '',
    standard_rate: '',
    category: ''
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      
      const response = await axios.get(`${API}/item-master?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const submitData = {
        ...formData,
        standard_rate: parseFloat(formData.standard_rate)
      };

      if (editingItem) {
        await axios.put(`${API}/item-master/${editingItem.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Item updated successfully!');
      } else {
        await axios.post(`${API}/item-master`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Item created successfully!');
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({ description: '', unit: '', standard_rate: '', category: '' });
      fetchItems();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      description: item.description,
      unit: item.unit,
      standard_rate: item.standard_rate.toString(),
      category: item.category || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/item-master/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Item deleted successfully!');
      fetchItems();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAutoPopulate = async () => {
    if (!confirm('This will create master items from existing BOQ data. Continue?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/item-master/auto-populate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(response.data.message);
      fetchItems();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(fetchItems, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, categoryFilter]);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Item Master</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleAutoPopulate}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Auto-Populate from BOQ
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add New Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Filter by category..."
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Count</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{item.description}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{item.unit}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">₹{item.standard_rate.toLocaleString()}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{item.category || '-'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{item.usage_count}</div>
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Standard Rate *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.standard_rate}
                  onChange={(e) => setFormData({...formData, standard_rate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingItem(null);
                    setFormData({ description: '', unit: '', standard_rate: '', category: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
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
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={handleLogout} />
        
        <main className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/clients" element={<Clients />} />
            {user.role === 'super_admin' && (
              <>
                <Route path="/item-master" element={<ItemMaster />} />
                <Route path="/logs" element={<ActivityLogs />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/search" element={<SearchResults />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </Router>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'invoice_creator',
    company_name: ''
  });
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });

  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'invoice_creator', label: 'Invoice Creator' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'approver', label: 'Approver' },
    { value: 'client', label: 'Client' },
    { value: 'vendor', label: 'Vendor' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert('Error fetching users: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      if (editingUser) {
        // Update user
        const updateData = {
          role: formData.role,
          company_name: formData.company_name,
          is_active: formData.is_active
        };

        await axios.put(`${API}/users/${editingUser.id}`, updateData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('User updated successfully!');
      } else {
        // Create new user
        await axios.post(`${API}/auth/register`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('User created successfully!');
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', role: 'invoice_creator', company_name: '' });
      fetchUsers();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '', // Don't show existing password
      role: user.role,
      company_name: user.company_name || '',
      is_active: user.is_active
    });
    setShowModal(true);
  };

  const handleDeactivate = async (userId) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('User deactivated successfully!');
      fetchUsers();
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('Passwords do not match!');
      return;
    }

    if (passwordData.new_password.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/users/${editingUser.id}/reset-password`, {
        new_password: passwordData.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Password reset successfully!');
      setShowPasswordModal(false);
      setEditingUser(null);
      setPasswordData({ new_password: '', confirm_password: '' });
    } catch (error) {
      alert('Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const openPasswordModal = (user) => {
    setEditingUser(user);
    setShowPasswordModal(true);
  };

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add New User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                    user.role === 'invoice_creator' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'reviewer' ? 'bg-yellow-100 text-yellow-800' :
                    user.role === 'approver' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{user.company_name || '-'}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openPasswordModal(user)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Reset Password
                    </button>
                    {user.is_active && (
                      <button
                        onClick={() => handleDeactivate(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={editingUser} // Can't change email for existing users
                />
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required={!editingUser}
                    minLength="6"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editingUser && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Active User
                  </label>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                    setFormData({ email: '', password: '', role: 'invoice_creator', company_name: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-bold mb-4">
              Reset Password for {editingUser?.email}
            </h3>
            
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                  minLength="6"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                  minLength="6"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setEditingUser(null);
                    setPasswordData({ new_password: '', confirm_password: '' });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const SearchResults = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState({ projects: [], clients: [], invoices: [], total_count: 0 });
  const [entityType, setEntityType] = useState('all');
  const [loading, setLoading] = useState(false);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        query: searchQuery,
        entity_type: entityType,
        limit: '50'
      });
      
      const response = await axios.get(`${API}/search?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Global Search</h2>
      
      {/* Search Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <form onSubmit={handleSearch} className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across projects, clients, invoices..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="projects">Projects</option>
              <option value="clients">Clients</option>
              <option value="invoices">Invoices</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {/* Results Summary */}
      {results.total_count > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-blue-800">
            Found <strong>{results.total_count}</strong> results for "<strong>{searchQuery}</strong>"
          </p>
        </div>
      )}

      {/* Projects Results */}
      {results.projects.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Projects ({results.projects.length})</h3>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Architect</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{project.project_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{project.client_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{project.architect}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">₹{project.total_value.toLocaleString()}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clients Results */}
      {results.clients.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clients ({results.clients.length})</h3>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{client.bill_to_address}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{client.gst_no || '-'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoices Results */}
      {results.invoices.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoices ({results.invoices.length})</h3>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">RA Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{invoice.ra_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{invoice.project_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">₹{invoice.total_amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Results */}
      {searchQuery && results.total_count === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">No results found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
};

const Reports = () => {
  const [activeTab, setActiveTab] = useState('gst');
  const [gstSummary, setGstSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchGSTSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const response = await axios.get(`${API}/reports/gst-summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGstSummary(response.data);
    } catch (error) {
      console.error('GST report error:', error);
      alert('Failed to fetch GST summary');
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/reports/insights`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInsights(response.data);
    } catch (error) {
      console.error('Insights error:', error);
      alert('Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'gst') {
      fetchGSTSummary();
    } else if (activeTab === 'insights') {
      fetchInsights();
    }
  }, [activeTab]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Reports & Insights</h2>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('gst')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'gst' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          GST Summary
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'insights' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Business Insights
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* GST Summary Tab */}
      {activeTab === 'gst' && gstSummary && (
        <div className="space-y-6">
          {/* Date Filter */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-end space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchGSTSummary}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filter
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">Total Invoices</h3>
              <p className="text-2xl font-bold text-blue-600">{gstSummary.total_invoices}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">Taxable Amount</h3>
              <p className="text-2xl font-bold text-green-600">₹{gstSummary.total_taxable_amount.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">Total GST</h3>
              <p className="text-2xl font-bold text-orange-600">₹{gstSummary.total_gst_amount.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">Total with GST</h3>
              <p className="text-2xl font-bold text-purple-600">₹{gstSummary.total_amount_with_gst.toLocaleString()}</p>
            </div>
          </div>

          {/* GST Breakdown */}
          {gstSummary.gst_breakdown.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">GST Rate Breakdown</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxable Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {gstSummary.gst_breakdown.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">{item.rate}%</td>
                      <td className="px-6 py-4">₹{item.taxable_amount.toLocaleString()}</td>
                      <td className="px-6 py-4">₹{item.gst_amount.toLocaleString()}</td>
                      <td className="px-6 py-4">₹{item.total_amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Monthly Breakdown */}
          {gstSummary.monthly_breakdown.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Breakdown</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoices</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taxable Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {gstSummary.monthly_breakdown.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">{item.month}</td>
                      <td className="px-6 py-4">{item.total_invoices}</td>
                      <td className="px-6 py-4">₹{item.taxable_amount.toLocaleString()}</td>
                      <td className="px-6 py-4">₹{item.gst_amount.toLocaleString()}</td>
                      <td className="px-6 py-4">₹{item.total_amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Business Insights Tab */}
      {activeTab === 'insights' && insights && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">Total Projects</h3>
              <p className="text-2xl font-bold text-blue-600">{insights.overview.total_projects}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">Total Clients</h3>
              <p className="text-2xl font-bold text-green-600">{insights.overview.total_clients}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">Total Invoices</h3>
              <p className="text-2xl font-bold text-orange-600">{insights.overview.total_invoices}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900">Active Users</h3>
              <p className="text-2xl font-bold text-purple-600">{insights.overview.active_users}</p>
            </div>
          </div>

          {/* Financial Overview */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Total Project Value</p>
                <p className="text-xl font-bold text-blue-600">₹{insights.financial.total_project_value.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Invoiced</p>
                <p className="text-xl font-bold text-green-600">₹{insights.financial.total_invoiced_value.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Collection %</p>
                <p className="text-xl font-bold text-orange-600">{insights.financial.collection_percentage.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Top Clients */}
          {insights.trends.top_clients.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clients by Value</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {insights.trends.top_clients.map((client, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4">{client.name}</td>
                      <td className="px-6 py-4">₹{client.total_value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Performance Metrics */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Average Project Value</p>
                <p className="text-xl font-bold text-blue-600">₹{insights.performance.avg_project_value.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Invoice Value</p>
                <p className="text-xl font-bold text-green-600">₹{insights.performance.avg_invoice_value.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Projects per Client</p>
                <p className="text-xl font-bold text-orange-600">{insights.performance.projects_per_client.toFixed(1)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;