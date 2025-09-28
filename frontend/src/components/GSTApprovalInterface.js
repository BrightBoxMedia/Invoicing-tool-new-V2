import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GSTApprovalInterface = ({ currentUser, onClose }) => {
    const [pendingProjects, setPendingProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processingProject, setProcessingProject] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [gstUpdates, setGstUpdates] = useState({});

    const navigate = useNavigate();
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    // Handle close - use either provided onClose prop or navigate back
    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            navigate(-1); // Go back to previous page
        }
    };

    useEffect(() => {
        fetchPendingProjects();
    }, []);

    // Add ESC key handler
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [handleClose]);

    const fetchPendingProjects = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/projects/pending-gst-approval`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const projects = await response.json();
                setPendingProjects(projects);
            } else {
                setError('Failed to fetch pending GST approvals');
            }
        } catch (err) {
            setError('Network error fetching pending approvals');
        } finally {
            setLoading(false);
        }
    };

    const updateItemGST = (projectId, itemId, gstRate) => {
        setGstUpdates(prev => ({
            ...prev,
            [`${projectId}_${itemId}`]: parseFloat(gstRate) || 18.0
        }));
    };

    const processGSTApproval = async (projectId, action) => {
        try {
            setProcessingProject(projectId);
            setError('');
            
            const project = pendingProjects.find(p => p.id === projectId);
            
            // Prepare BOQ GST updates
            const boqGstUpdates = project.boq_items.map(item => ({
                item_id: item.id,
                gst_rate: gstUpdates[`${projectId}_${item.id}`] || item.gst_rate || 18.0
            }));

            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/projects/${projectId}/gst-approval`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    boq_gst_updates: boqGstUpdates
                })
            });

            if (response.ok) {
                // Remove from pending list
                setPendingProjects(prev => prev.filter(p => p.id !== projectId));
                setSelectedProject(null);
                
                // Show success message
                alert(`GST configuration ${action}d successfully!`);
            } else {
                const errorData = await response.json();
                setError(errorData.detail || `Failed to ${action} GST configuration`);
            }
        } catch (err) {
            setError(`Network error during GST ${action}`);
        } finally {
            setProcessingProject(null);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading GST approvals...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">🧾 GST Approval Management</h2>
                        <p className="text-gray-600 mt-1">Review and approve GST configurations for projects</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 font-medium">⚠️ {error}</p>
                    </div>
                )}

                <div className="p-6">
                    {pendingProjects.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
                            <p className="text-gray-600">No projects are pending GST approval at this time.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {pendingProjects.map(project => (
                                <div key={project.id} className="border border-gray-200 rounded-lg p-6">
                                    
                                    {/* Project Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-900">{project.project_name}</h3>
                                            <p className="text-gray-600">Client: {project.client_name}</p>
                                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                                <span>GST Type: <span className="font-medium text-blue-600">{project.gst_type}</span></span>
                                                <span>BOQ Items: {project.boq_items_count}</span>
                                                <span>Value: ₹{project.total_project_value?.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => setSelectedProject(
                                                    selectedProject?.id === project.id ? null : project
                                                )}
                                                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                            >
                                                {selectedProject?.id === project.id ? 'Hide Details' : 'Review Items'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* BOQ Items Review */}
                                    {selectedProject?.id === project.id && (
                                        <div className="mt-6 bg-gray-50 rounded-lg p-4">
                                            <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 BOQ Items GST Review</h4>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full bg-white rounded-lg">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Qty</th>
                                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Unit</th>
                                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Rate (₹)</th>
                                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Current GST %</th>
                                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Approved GST %</th>
                                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Amount (₹)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {project.boq_items.map((item, index) => {
                                                            const gstRate = gstUpdates[`${project.id}_${item.id}`] || item.gst_rate || 18.0;
                                                            return (
                                                                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                    <td className="px-4 py-3">
                                                                        <div className="text-sm font-medium text-gray-900 max-w-xs">
                                                                            {item.description}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                                                        {item.quantity}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                                                        {item.unit}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                                                        ₹{item.rate?.toLocaleString('en-IN')}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                                                            {item.gst_rate || 18}%
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <select
                                                                            value={gstRate}
                                                                            onChange={(e) => updateItemGST(project.id, item.id, e.target.value)}
                                                                            className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                                                                        >
                                                                            <option value="0">0%</option>
                                                                            <option value="5">5%</option>
                                                                            <option value="12">12%</option>
                                                                            <option value="18">18%</option>
                                                                            <option value="28">28%</option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                                                        ₹{(item.amount || 0).toLocaleString('en-IN')}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* GST Type Information */}
                                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                                <h5 className="font-semibold text-blue-900 mb-2">
                                                    GST Type: {project.gst_type}
                                                </h5>
                                                {project.gst_type === 'CGST_SGST' ? (
                                                    <p className="text-sm text-blue-800">
                                                        This project will use <strong>CGST + SGST</strong> for intra-state transactions. 
                                                        GST will be split 50-50 between CGST and SGST.
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-blue-800">
                                                        This project will use <strong>IGST</strong> for inter-state transactions.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Approval Actions */}
                                            <div className="mt-6 flex justify-end space-x-4">
                                                <button
                                                    onClick={() => processGSTApproval(project.id, 'reject')}
                                                    disabled={processingProject === project.id}
                                                    className="px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                                                >
                                                    {processingProject === project.id ? 'Processing...' : 'Reject'}
                                                </button>
                                                <button
                                                    onClick={() => processGSTApproval(project.id, 'approve')}
                                                    disabled={processingProject === project.id}
                                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                                                >
                                                    {processingProject === project.id ? 'Processing...' : 'Approve GST Configuration'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GSTApprovalInterface;