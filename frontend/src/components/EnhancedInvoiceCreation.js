import React, { useState, useEffect } from 'react';

const EnhancedInvoiceCreation = ({ currentUser, projectId, onClose, onSuccess }) => {
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [raTracking, setRaTracking] = useState([]);
    const [invoiceItems, setInvoiceItems] = useState([]);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    useEffect(() => {
        if (projectId) {
            fetchProjectData();
        }
    }, [projectId]);

    const fetchProjectData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const [projectResponse, raResponse] = await Promise.all([
                fetch(`${backendUrl}/api/projects/${projectId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${backendUrl}/api/projects/${projectId}/ra-tracking`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (projectResponse.ok && raResponse.ok) {
                const projectData = await projectResponse.json();
                const raData = await raResponse.json();
                
                setProject(projectData);
                setRaTracking(raData.ra_tracking || []);
                
                // Initialize invoice items with BOQ data
                setInvoiceItems(raData.ra_tracking.map(item => ({
                    ...item,
                    requested_qty: 0,
                    gst_percentage: item.gst_mapping?.total_gst_rate || 18,
                    amount: 0
                })));
            }
        } catch (err) {
            console.error('Error fetching project data:', err);
            setError('Failed to load project data');
        } finally {
            setLoading(false);
        }
    };

    const updateItemQuantity = (itemIndex, qty) => {
        const updatedItems = [...invoiceItems];
        const item = updatedItems[itemIndex];
        
        const requestedQty = Math.max(0, parseFloat(qty) || 0);
        const maxQty = item.balance_qty || 0;
        
        // Prevent over-quantity
        if (requestedQty > maxQty) {
            setError(`Quantity ${requestedQty} exceeds available balance ${maxQty} for item: ${item.description.substring(0, 50)}...`);
            return;
        }
        
        item.requested_qty = requestedQty;
        item.amount = requestedQty * (item.rate || 0);
        
        setInvoiceItems(updatedItems);
        setError(''); // Clear error if quantity is valid
    };

    const updateItemGSTPercentage = (itemIndex, gstPercent) => {
        const updatedItems = [...invoiceItems];
        updatedItems[itemIndex].gst_percentage = parseFloat(gstPercent);
        setInvoiceItems(updatedItems);
    };

    const calculateTotals = () => {
        const selectedItems = invoiceItems.filter(item => (item.requested_qty || 0) > 0);
        
        const subtotal = selectedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        const totalGST = selectedItems.reduce((sum, item) => {
            const gstAmount = (item.amount || 0) * (item.gst_percentage || 0) / 100;
            return sum + gstAmount;
        }, 0);
        const grandTotal = subtotal + totalGST;
        
        return { subtotal, totalGST, grandTotal, selectedItems };
    };

    const createInvoice = async () => {
        try {
            const { selectedItems } = calculateTotals();
            
            if (selectedItems.length === 0) {
                setError('Please select at least one item with quantity > 0');
                return;
            }

            const token = localStorage.getItem('token');
            const invoicePayload = {
                project_id: projectId,
                client_id: project.client_id,
                invoice_type: 'tax_invoice',
                items: selectedItems.map(item => ({
                    boq_item_id: item.item_id,
                    description: item.description,
                    unit: item.unit,
                    quantity: item.requested_qty,
                    rate: item.rate,
                    amount: item.amount,
                    gst_rate: item.gst_percentage
                })),
                payment_terms: 'Payment due within 30 days'
            };

            const response = await fetch(`${backendUrl}/api/invoices`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invoicePayload)
            });

            if (response.ok) {
                onSuccess();
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'Failed to create invoice');
            }
        } catch (err) {
            console.error('Error creating invoice:', err);
            setError('Network error creating invoice');
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading project data...</p>
            </div>
        );
    }

    const { subtotal, totalGST, grandTotal, selectedItems } = calculateTotals();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">📄 Create Invoice</h2>
                    <p className="text-gray-600 mt-1">
                        Project: <span className="font-medium">{project?.project_name}</span> | 
                        Client: <span className="font-medium">{project?.client_name}</span>
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                    ×
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium">⚠️ {error}</p>
                </div>
            )}

            {/* Professional BOQ Items Table */}
            <div className="bg-white rounded-lg border border-gray-200 mb-6">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">📋 Select Items & Quantities to Bill</h3>
                    <p className="text-sm text-gray-600 mt-1">Enter quantities to bill for each item. Available balance is shown for reference.</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Item Description</th>
                                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Unit</th>
                                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Available Qty</th>
                                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Bill Qty</th>
                                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-900">Rate (₹)</th>
                                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">GST %</th>
                                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-900">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {invoiceItems.map((item, index) => {
                                const hasQty = (item.requested_qty || 0) > 0;
                                const exceedsBalance = (item.requested_qty || 0) > (item.balance_qty || 0);
                                
                                return (
                                    <tr key={item.item_id} className={`
                                        ${hasQty ? 'bg-green-50' : 'bg-white'} 
                                        ${exceedsBalance ? 'bg-red-50 border-2 border-red-300' : ''}
                                        hover:bg-gray-50 transition-colors
                                    `}>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 max-w-md">
                                                {item.description}
                                            </div>
                                            {exceedsBalance && (
                                                <div className="text-xs font-bold text-red-700 mt-1 bg-red-200 px-2 py-1 rounded inline-block">
                                                    ❌ Exceeds available quantity!
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-600">
                                            {item.unit}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="text-sm font-medium text-gray-900">
                                                {item.balance_qty}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Total: {item.overall_qty}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max={item.balance_qty}
                                                value={item.requested_qty || ''}
                                                onChange={(e) => updateItemQuantity(index, e.target.value)}
                                                className={`w-24 px-3 py-2 text-sm border rounded-md text-center focus:ring-2 focus:ring-blue-500 ${
                                                    exceedsBalance ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                                }`}
                                                placeholder="0"
                                            />
                                            <div className="text-xs text-gray-500 mt-1">
                                                Max: {item.balance_qty}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                                            ₹{(item.rate || 0).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <select
                                                value={item.gst_percentage || 18}
                                                onChange={(e) => updateItemGSTPercentage(index, e.target.value)}
                                                className="w-20 px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="0">0%</option>
                                                <option value="5">5%</option>
                                                <option value="12">12%</option>
                                                <option value="18">18%</option>
                                                <option value="28">28%</option>
                                                <option value="40">40%</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="text-sm font-medium text-gray-900">
                                                ₹{(item.amount || 0).toLocaleString('en-IN')}
                                            </div>
                                            {hasQty && (
                                                <div className="text-xs text-gray-500">
                                                    GST: ₹{((item.amount || 0) * (item.gst_percentage || 0) / 100).toLocaleString('en-IN')}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoice Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Selected Items Summary */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">📊 Invoice Summary</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-blue-700">Selected Items:</span>
                            <span className="font-semibold text-blue-900">{selectedItems.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-blue-700">Subtotal:</span>
                            <span className="font-semibold text-blue-900">₹{subtotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-blue-700">Total GST:</span>
                            <span className="font-semibold text-blue-900">₹{totalGST.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-lg border-t border-blue-300 pt-3">
                            <span className="font-semibold text-blue-800">Grand Total:</span>
                            <span className="font-bold text-blue-900">₹{grandTotal.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Create Invoice</h3>
                    <div className="space-y-4">
                        <div className="text-sm text-gray-600">
                            <p>• This will create a <strong>Tax Invoice</strong> with RA tracking</p>
                            <p>• GST will be calculated per item based on selected percentages</p>
                            <p>• Quantities will be deducted from available balance</p>
                        </div>
                        
                        <div className="flex space-x-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createInvoice}
                                disabled={selectedItems.length === 0}
                                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {selectedItems.length === 0 ? 'Select Items First' : `Create Invoice (₹${grandTotal.toLocaleString('en-IN')})`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedInvoiceCreation;