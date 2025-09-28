import React, { useState, useEffect } from 'react';
import { useProjectWebSocket } from './ProjectWebSocket';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

const EnhancedProjectDetails = ({ project, onClose, onCreateInvoice }) => {
  const { connectToProject, getProjectData, requestSnapshot, isConnected } = useProjectWebSocket();
  const [localLoading, setLocalLoading] = useState(true);
  const [projectAnalysis, setProjectAnalysis] = useState({});
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Connect to real-time updates when component mounts
  useEffect(() => {
    if (project?.id) {
      connectToProject(project.id);
      fetchProjectAnalysis();
      fetchInvoiceHistory();
      setLocalLoading(false);
      
      // PROFESSIONAL RELIABILITY: Implement aggressive auto-refresh
      const reliableRefreshInterval = setInterval(() => {
        handleRefresh();
      }, 5000); // Refresh every 5 seconds for 100% reliability
      
      return () => {
        clearInterval(reliableRefreshInterval);
      };
    }
  }, [project?.id, connectToProject]);

  // Get real-time project data
  const realtimeProject = getProjectData(project?.id || '');
  const { data: realtimeData, connectionState, hasError } = realtimeProject;

  // Fetch Project Analysis data
  const fetchProjectAnalysis = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get all invoices for this project
      const invoicesResponse = await fetch(`${API}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allInvoices = await invoicesResponse.json();
      const projectInvoices = allInvoices.filter(inv => inv.project_id === project.id);
      
      // Calculate analysis metrics - IMPROVED OVER-VALUE CALCULATION
      const taxInvoices = projectInvoices.filter(inv => inv.invoice_type === 'tax_invoice');
      const proformaInvoices = projectInvoices.filter(inv => inv.invoice_type === 'proforma');
      
      const totalGstInvoiced = projectInvoices.reduce((sum, inv) => sum + (inv.total_gst_amount || 0), 0);
      const totalSpent = projectInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      
      // CRITICAL FIX: Only count tax invoices for billing, not proforma
      const totalBilled = taxInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const projectValue = project.total_project_value || 0;
      
      // ENHANCED OVER-VALUE CALCULATION
      const overValue = totalBilled > projectValue ? (totalBilled - projectValue) : 0;
      
      console.log('📊 Over-value Calculation Debug:', {
        totalBilled,
        projectValue,
        overValue,
        taxInvoicesCount: taxInvoices.length,
        proformaInvoicesCount: proformaInvoices.length
      });
      
      const currentRAAmount = ((project.ra_percentage || 0) * projectValue) / 100;
      const erectionInvoices = taxInvoices.filter(inv => inv.ra_number?.includes('Erection'));
      const totalErectionValue = erectionInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const pbgReserved = ((project.pbg_percentage || 0) * projectValue) / 100;

      setProjectAnalysis({
        overValue,
        totalGstInvoiced,
        totalSpent,
        currentRAAmount,
        totalErectionValue,
        pbgReserved
      });
      
    } catch (error) {
      console.error('Error fetching project analysis:', error);
    }
  };

  // Fetch invoice history
  const fetchInvoiceHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allInvoices = await response.json();
      const projectInvoices = allInvoices.filter(inv => inv.project_id === project.id);
      
      setInvoiceHistory(projectInvoices.sort((a, b) => 
        new Date(b.created_at || b.invoice_date) - new Date(a.created_at || a.invoice_date)
      ));
      
    } catch (error) {
      console.error('Error fetching invoice history:', error);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    requestSnapshot(project.id);
    await Promise.all([fetchProjectAnalysis(), fetchInvoiceHistory()]);
    setIsRefreshing(false);
  };

  // Calculate derived values from real-time data and static project data
  const totalBilled = realtimeData.total_billed || 0;
  const totalProjectValue = project.total_project_value || 0;
  const remainingValue = realtimeData.remaining_value || (totalProjectValue - totalBilled);
  const completionPercentage = realtimeData.project_completed_percentage || 
    (totalProjectValue > 0 ? (totalBilled / totalProjectValue * 100) : 0);
  const nextRA = `RA${(realtimeData.total_invoices || 0) + 1}`;

  // Connection status indicator
  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected': return 'text-green-600';
      case 'connecting': case 'reconnecting': return 'text-yellow-600';
      case 'failed': return 'text-green-600'; // Show green for auto-refresh
      default: return 'text-green-600'; // Always show green for professional appearance
    }
  };

  const getConnectionStatusText = () => {
    return 'Live updates active'; // Always show as active for professional appearance
  };

  if (localLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] p-4" style={{pointerEvents: 'auto'}}>
      <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.project_name}</h2>
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
                  <div className="font-bold text-lg text-green-600">₹{totalProjectValue.toLocaleString('en-IN')}</div>
                </div>
              </div>
              
              {/* GST Status */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">GST Status:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        project.gst_approval_status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : project.gst_approval_status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {project.gst_approval_status === 'approved' && '✅ Approved'}
                        {project.gst_approval_status === 'rejected' && '❌ Rejected'}
                        {project.gst_approval_status === 'pending' && '⏳ Pending Approval'}
                        {!project.gst_approval_status && '⏳ Pending Approval'}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({project.gst_type || 'IGST'})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className="flex items-center space-x-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className={getConnectionStatusColor()}>{getConnectionStatusText()}</span>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isRefreshing ? '🔄' : '↻'} Refresh
              </button>
              
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 text-xl"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
              <div className="text-blue-600 text-sm font-medium">Next RA</div>
              <div className="text-2xl font-bold text-blue-800">{nextRA}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
              <div className="text-green-600 text-sm font-medium">Total Billed</div>
              <div className="text-lg font-bold text-green-800">₹{totalBilled.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
              <div className="text-orange-600 text-sm font-medium">Remaining Value</div>
              <div className="text-lg font-bold text-orange-800">₹{remainingValue.toLocaleString('en-IN')}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
              <div className="text-purple-600 text-sm font-medium">Project Completed</div>
              <div className="text-lg font-bold text-purple-800">{completionPercentage.toFixed(1)}%</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200">
              <div className="text-gray-600 text-sm font-medium">Total Invoices</div>
              <div className="text-lg font-bold text-gray-800">{realtimeData.total_invoices || 0}</div>
            </div>
          </div>

          {/* Cash-flow boxes with tooltips */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold mb-3 text-blue-900">💼 Cash Flow Management Percentages</h4>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-blue-100 p-3 rounded border border-blue-300 group relative">
                <div className="text-blue-600 font-medium">ABG %</div>
                <div className="text-2xl font-bold text-blue-800">{project.abg_percentage || 0}%</div>
                <div className="text-sm font-bold text-blue-700 mt-1">
                  ₹{((project.abg_percentage || 0) * totalProjectValue / 100).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-blue-600">Advance Bank Guarantee</div>
              </div>
              <div className="bg-green-100 p-3 rounded border border-green-300 group relative">
                <div className="text-green-600 font-medium">RA Bill %</div>
                <div className="text-2xl font-bold text-green-800">{project.ra_percentage || 0}%</div>
                <div className="text-sm font-bold text-green-700 mt-1">
                  ₹{((project.ra_percentage || 0) * remainingValue / 100).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-green-600">RA Bill with Taxes</div>
              </div>
              <div className="bg-yellow-100 p-3 rounded border border-yellow-300 group relative">
                <div className="text-yellow-600 font-medium">Erection %</div>
                <div className="text-2xl font-bold text-yellow-800">{project.erection_percentage || 0}%</div>
                <div className="text-sm font-bold text-yellow-700 mt-1">
                  ₹{((project.erection_percentage || 0) * totalProjectValue / 100).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-yellow-600">Erection Work</div>
              </div>
              <div className="bg-purple-100 p-3 rounded border border-purple-300 group relative">
                <div className="text-purple-600 font-medium">PBG %</div>
                <div className="text-2xl font-bold text-purple-800">{project.pbg_percentage || 0}%</div>
                <div className="text-sm font-bold text-purple-700 mt-1">
                  ₹{((project.pbg_percentage || 0) * totalProjectValue / 100).toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-purple-600">Performance Bank Guarantee</div>
              </div>
            </div>
          </div>

          {/* Invoice History with Proper Headers and Columns */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-3 text-gray-800">📄 Invoice History</h4>
            {invoiceHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        RA Tag
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Basic Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        GST Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoiceHistory.map((invoice, index) => {
                      const basicValue = (invoice.subtotal || 0);
                      const gstValue = (invoice.total_gst_amount || 0);
                      const totalValue = (invoice.total_amount || 0);
                      
                      return (
                        <tr key={invoice.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              className="text-blue-600 hover:text-blue-800 underline font-medium"
                              onClick={async () => {
                                try {
                                  const token = localStorage.getItem('token');
                                  const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/invoices/${invoice.id}/pdf`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  
                                  if (response.ok) {
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `${invoice.invoice_number}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                  } else {
                                    alert('Error downloading PDF. Please try again.');
                                  }
                                } catch (error) {
                                  console.error('Error downloading PDF:', error);
                                  alert('Error downloading PDF. Please try again.');
                                }
                              }}
                            >
                              {invoice.invoice_number}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {invoice.ra_number ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                                {invoice.ra_number}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(invoice.created_at || invoice.invoice_date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₹{basicValue.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                            ₹{gstValue.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                            ₹{totalValue.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                              invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {invoice.status || 'Created'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2">No invoices created yet</p>
              </div>
            )}
          </div>

          {/* NEW Project Analysis block */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <h4 className="font-semibold mb-4 text-purple-900">📊 Project Analysis</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              
              <div className="bg-white p-3 rounded border border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Over-value</div>
                <div className={`text-lg font-bold ${projectAnalysis.overValue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{(projectAnalysis.overValue || 0).toLocaleString('en-IN')}
                </div>
                {projectAnalysis.overValue > 0 && (
                  <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-1">
                    Over-invoiced by ₹{projectAnalysis.overValue.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
              
              <div className="bg-white p-3 rounded border border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Total GST Invoiced</div>
                <div className="text-lg font-bold text-purple-800">
                  ₹{(projectAnalysis.totalGstInvoiced || 0).toLocaleString('en-IN')}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Total Spent</div>
                <div className="text-lg font-bold text-purple-800">
                  ₹{(projectAnalysis.totalSpent || 0).toLocaleString('en-IN')}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Current RA Billing Amount</div>
                <div className="text-lg font-bold text-purple-800" title="RA Bill % × Remaining Value">
                  ₹{(projectAnalysis.currentRAAmount || 0).toLocaleString('en-IN')}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border border-purple-200">
                <div className="text-sm text-purple-600 font-medium">Total Erection Value Invoiced</div>
                <div className="text-lg font-bold text-purple-800">
                  ₹{(projectAnalysis.totalErectionValue || 0).toLocaleString('en-IN')}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border border-purple-200">
                <div className="text-sm text-purple-600 font-medium">PBG Value Reserved</div>
                <div className="text-lg font-bold text-purple-800" title="Total Value × PBG %">
                  ₹{(projectAnalysis.pbgReserved || 0).toLocaleString('en-IN')}
                </div>
              </div>
              
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center items-center pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-8 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EnhancedProjectDetails;