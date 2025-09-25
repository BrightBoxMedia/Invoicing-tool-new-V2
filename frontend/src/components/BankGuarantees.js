import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const BankGuarantees = ({ currentUser }) => {
  const [bankGuarantees, setBankGuarantees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBG, setEditingBG] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [formData, setFormData] = useState({
    project_id: '',
    bg_type: 'performance', // performance, advance, retention
    bank_name: '',
    bg_number: '',
    bg_amount: '',
    issue_date: '',
    expiry_date: '',
    claim_percentage: '',
    status: 'active', // active, expired, claimed, cancelled
    remarks: ''
  });

  useEffect(() => {
    fetchBankGuarantees();
    fetchProjects();
  }, []);

  const fetchBankGuarantees = async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual API call
      const mockData = [
        {
          id: '1',
          project_name: 'Industrial Complex - Phase 1',
          client_name: 'ABC Industries Ltd',
          bg_type: 'performance',
          bank_name: 'State Bank of India',
          bg_number: 'PBG-2024-001',
          bg_amount: 5000000,
          issue_date: '2024-01-15',
          expiry_date: '2025-01-15',
          claim_percentage: 10,
          status: 'active',
          days_to_expiry: 120,
          remarks: 'Performance Bank Guarantee for project execution'
        },
        {
          id: '2',
          project_name: 'Manufacturing Unit Setup',
          client_name: 'XYZ Manufacturing',
          bg_type: 'advance',
          bank_name: 'ICICI Bank',
          bg_number: 'ABG-2024-002',
          bg_amount: 2500000,
          issue_date: '2024-02-10',
          expiry_date: '2024-12-10',
          claim_percentage: 20,
          status: 'active',
          days_to_expiry: 45,
          remarks: 'Advance Bank Guarantee for mobilization'
        }
      ];
      setBankGuarantees(mockData);
    } catch (error) {
      console.error('Error fetching bank guarantees:', error);
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
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Mock success for now - replace with actual API call
      alert(`Bank Guarantee ${editingBG ? 'updated' : 'created'} successfully!`);
      resetForm();
      fetchBankGuarantees();
    } catch (error) {
      console.error('Error saving bank guarantee:', error);
      alert('Error saving bank guarantee: ' + error.message);
    }
  };

  const handleEdit = (bg) => {
    setEditingBG(bg);
    setFormData({
      project_id: bg.project_id || '',
      bg_type: bg.bg_type || 'performance',
      bank_name: bg.bank_name || '',
      bg_number: bg.bg_number || '',
      bg_amount: bg.bg_amount || '',
      issue_date: bg.issue_date || '',
      expiry_date: bg.expiry_date || '',
      claim_percentage: bg.claim_percentage || '',
      status: bg.status || 'active',
      remarks: bg.remarks || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      bg_type: 'performance',
      bank_name: '',
      bg_number: '',
      bg_amount: '',
      issue_date: '',
      expiry_date: '',
      claim_percentage: '',
      status: 'active',
      remarks: ''
    });
    setEditingBG(null);
    setShowModal(false);
  };

  const getBGTypeBadge = (type) => {
    const colors = {
      'performance': 'bg-blue-100 text-blue-800',
      'advance': 'bg-green-100 text-green-800',
      'retention': 'bg-purple-100 text-purple-800',
      'warranty': 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status, daysToExpiry) => {
    if (status === 'expired') return 'bg-red-100 text-red-800';
    if (status === 'claimed') return 'bg-yellow-100 text-yellow-800';
    if (status === 'cancelled') return 'bg-gray-100 text-gray-800';
    if (daysToExpiry <= 30) return 'bg-orange-100 text-orange-800';
    if (daysToExpiry <= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (status, daysToExpiry) => {
    if (status === 'expired') return 'Expired';
    if (status === 'claimed') return 'Claimed';
    if (status === 'cancelled') return 'Cancelled';
    if (daysToExpiry <= 0) return 'Expired';
    if (daysToExpiry <= 30) return `Expiring in ${daysToExpiry} days`;
    return 'Active';
  };

  const filteredBankGuarantees = bankGuarantees.filter(bg => {
    const matchesSearch = !searchTerm || 
      bg.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bg.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bg.bg_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bg.bank_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || bg.bg_type === filterType;
    const matchesStatus = filterStatus === 'all' || bg.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🏦 Bank Guarantees</h2>
          <p className="text-gray-600">Monitor and manage all bank guarantees</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Bank Guarantee
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by project, client, BG number, or bank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="performance">Performance BG</option>
              <option value="advance">Advance BG</option>
              <option value="retention">Retention BG</option>
              <option value="warranty">Warranty BG</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="claimed">Claimed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Total BGs</div>
          <div className="text-2xl font-bold text-gray-900">{bankGuarantees.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Active BGs</div>
          <div className="text-2xl font-bold text-green-600">
            {bankGuarantees.filter(bg => bg.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Expiring Soon</div>
          <div className="text-2xl font-bold text-orange-600">
            {bankGuarantees.filter(bg => bg.days_to_expiry <= 60 && bg.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-sm text-gray-600">Total Value</div>
          <div className="text-2xl font-bold text-blue-600">
            ₹{bankGuarantees.reduce((sum, bg) => sum + (bg.bg_amount || 0), 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Bank Guarantees Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project & Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  BG Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bank & Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Validity Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBankGuarantees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-lg font-medium text-gray-900 mb-1">No bank guarantees found</p>
                      <p className="text-gray-500">Add your first bank guarantee to start tracking</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBankGuarantees.map((bg, index) => (
                  <tr key={bg.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{bg.project_name}</div>
                        <div className="text-sm text-gray-500">{bg.client_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBGTypeBadge(bg.bg_type)} mb-1`}>
                          {bg.bg_type.toUpperCase()} BG
                        </span>
                        <div className="text-sm text-gray-900">{bg.bg_number}</div>
                        <div className="text-xs text-gray-500">{bg.claim_percentage}% of project value</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{bg.bank_name}</div>
                        <div className="text-sm text-green-600 font-semibold">₹{bg.bg_amount.toLocaleString('en-IN')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900">
                          {new Date(bg.issue_date).toLocaleDateString('en-IN')} -
                        </div>
                        <div className="text-sm text-gray-900">
                          {new Date(bg.expiry_date).toLocaleDateString('en-IN')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {bg.days_to_expiry > 0 ? `${bg.days_to_expiry} days left` : 'Expired'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(bg.status, bg.days_to_expiry)}`}>
                        {getStatusText(bg.status, bg.days_to_expiry)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(bg)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Bank Guarantee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto m-4">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {editingBG ? 'Edit Bank Guarantee' : 'Add New Bank Guarantee'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project *
                    </label>
                    <select
                      required
                      value={formData.project_id}
                      onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      BG Type *
                    </label>
                    <select
                      required
                      value={formData.bg_type}
                      onChange={(e) => setFormData({...formData, bg_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="performance">Performance BG</option>
                      <option value="advance">Advance BG</option>
                      <option value="retention">Retention BG</option>
                      <option value="warranty">Warranty BG</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.bank_name}
                      onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter bank name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      BG Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.bg_number}
                      onChange={(e) => setFormData({...formData, bg_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter BG number"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      BG Amount *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.bg_amount}
                      onChange={(e) => setFormData({...formData, bg_amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Claim Percentage *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.1"
                      value={formData.claim_percentage}
                      onChange={(e) => setFormData({...formData, claim_percentage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter percentage"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.issue_date}
                      onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter any additional notes"
                  />
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingBG ? 'Update BG' : 'Create BG'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankGuarantees;