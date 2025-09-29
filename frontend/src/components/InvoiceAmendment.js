import React, { useState, useEffect } from 'react';

const InvoiceAmendment = ({ invoice, project, currentUser, onClose, onAmendSuccess }) => {
    const [amendmentItems, setAmendmentItems] = useState([]);
    const [amendmentReason, setAmendmentReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [amendmentType, setAmendmentType] = useState('quantities'); // 'quantities' or 'gst'

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    useEffect(() => {
        if (invoice?.items) {
            // Initialize amendment items with current invoice data
            setAmendmentItems(invoice.items.map(item => ({
                ...item,
                original_quantity: item.quantity,
                new_quantity: item.quantity,
                original_gst_rate: item.gst_rate,
                new_gst_rate: item.gst_rate,
                amendment_reason: ''
            })));
        }
    }, [invoice]);

    const canAmendGST = currentUser?.role === 'Manager' || currentUser?.role === 'SuperAdmin';

    const updateItemQuantity = (index, newQuantity) => {
        const updatedItems = [...amendmentItems];
        updatedItems[index].new_quantity = parseFloat(newQuantity) || 0;
        
        // Recalculate amount
        const rate = updatedItems[index].rate || 0;
        const gstRate = updatedItems[index].new_gst_rate || 0;
        const basicAmount = updatedItems[index].new_quantity * rate;
        const gstAmount = basicAmount * (gstRate / 100);
        updatedItems[index].new_amount = basicAmount;
        updatedItems[index].new_gst_amount = gstAmount;
        updatedItems[index].new_total_amount = basicAmount + gstAmount;
        
        setAmendmentItems(updatedItems);
    };

    const updateItemGST = (index, newGSTRate) => {
        if (!canAmendGST) return;
        
        const updatedItems = [...amendmentItems];
        updatedItems[index].new_gst_rate = parseFloat(newGSTRate) || 0;
        
        // Recalculate amounts
        const quantity = updatedItems[index].new_quantity || 0;
        const rate = updatedItems[index].rate || 0;
        const basicAmount = quantity * rate;
        const gstAmount = basicAmount * (parseFloat(newGSTRate) / 100);
        updatedItems[index].new_amount = basicAmount;
        updatedItems[index].new_gst_amount = gstAmount;
        updatedItems[index].new_total_amount = basicAmount + gstAmount;
        
        setAmendmentItems(updatedItems);
    };

    const calculateAmendmentTotals = () => {
        const originalTotal = invoice?.total_amount || 0;
        const newSubtotal = amendmentItems.reduce((sum, item) => sum + (item.new_amount || 0), 0);
        const newGSTTotal = amendmentItems.reduce((sum, item) => sum + (item.new_gst_amount || 0), 0);
        const newTotal = newSubtotal + newGSTTotal;
        const difference = newTotal - originalTotal;
        
        return {
            originalTotal,
            newSubtotal,
            newGSTTotal,
            newTotal,
            difference
        };
    };

    const submitAmendment = async () => {
        try {
            setLoading(true);
            setError('');

            if (!amendmentReason.trim()) {
                setError('Amendment reason is required');
                return;
            }

            // Check if there are any changes
            const hasChanges = amendmentItems.some(item => 
                item.new_quantity !== item.original_quantity || 
                item.new_gst_rate !== item.original_gst_rate
            );

            if (!hasChanges) {
                setError('No changes detected. Please modify quantities or GST rates before submitting.');
                return;
            }

            // Prepare amendment data
            const amendmentData = {
                original_invoice_id: invoice.id,
                amendment_reason: amendmentReason,
                amendment_type: amendmentType,
                amended_items: amendmentItems.map(item => ({
                    boq_item_id: item.boq_item_id,
                    original_quantity: item.original_quantity,
                    new_quantity: item.new_quantity,
                    original_gst_rate: item.original_gst_rate,
                    new_gst_rate: item.new_gst_rate,
                    rate: item.rate,
                    description: item.description,
                    unit: item.unit
                }))
            };

            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/invoices/${invoice.id}/amend`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(amendmentData)
            });

            if (response.ok) {
                const amendedInvoice = await response.json();
                onAmendSuccess?.(amendedInvoice);
                onClose();
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'Failed to amend invoice');
            }

        } catch (err) {
            setError('Network error during amendment');
            console.error('Amendment error:', err);
        } finally {
            setLoading(false);
        }
    };

    const totals = calculateAmendmentTotals();

    if (!invoice) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10001] p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">📝 Invoice Amendment</h2>
                        <p className="text-gray-600 mt-1">
                            Amend Invoice: <span className="font-semibold">{invoice.invoice_number}</span>
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
                    <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 font-medium">⚠️ {error}</p>
                    </div>
                )}

                <div className="p-6">
                    
                    {/* Amendment Type Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Amendment Type</label>
                        <div className="flex space-x-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="amendmentType"
                                    value="quantities"
                                    checked={amendmentType === 'quantities'}
                                    onChange={(e) => setAmendmentType(e.target.value)}
                                    className="h-4 w-4 text-blue-600"
                                />
                                <span className="ml-2 text-sm text-gray-700">Quantity Amendment</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="amendmentType"
                                    value="gst"
                                    checked={amendmentType === 'gst'}
                                    onChange={(e) => setAmendmentType(e.target.value)}
                                    disabled={!canAmendGST}
                                    className="h-4 w-4 text-blue-600 disabled:opacity-50"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    GST Amendment {!canAmendGST && '(Manager/SuperAdmin Only)'}
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Amendment Reason */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Amendment Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={amendmentReason}
                            onChange={(e) => setAmendmentReason(e.target.value)}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Please provide a reason for this amendment..."
                        />
                    </div>

                    {/* Invoice Items Amendment Table */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Invoice Items Amendment</h3>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white rounded-lg">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Unit</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Original Qty</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">New Qty</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Rate (₹)</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Original GST %</th>
                                        {(amendmentType === 'gst' && canAmendGST) && (
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">New GST %</th>
                                        )}
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">New Amount (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {amendmentItems.map((item, index) => (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900 max-w-xs">
                                                    {item.description}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-600">
                                                {item.unit}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-gray-200 text-gray-800 text-sm rounded">
                                                    {item.original_quantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={item.new_quantity}
                                                    onChange={(e) => updateItemQuantity(index, e.target.value)}
                                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                                ₹{(item.rate || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded">
                                                    {item.original_gst_rate}%
                                                </span>
                                            </td>
                                            {(amendmentType === 'gst' && canAmendGST) && (
                                                <td className="px-4 py-3 text-center">
                                                    <select
                                                        value={item.new_gst_rate}
                                                        onChange={(e) => updateItemGST(index, e.target.value)}
                                                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="0">0%</option>
                                                        <option value="5">5%</option>
                                                        <option value="12">12%</option>
                                                        <option value="18">18%</option>
                                                        <option value="28">28%</option>
                                                    </select>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-right text-sm font-medium">
                                                <div className="text-gray-900">
                                                    ₹{(item.new_total_amount || 0).toLocaleString('en-IN')}
                                                </div>
                                                {item.new_total_amount !== (item.amount + (item.amount * item.original_gst_rate / 100)) && (
                                                    <div className="text-xs text-orange-600">
                                                        Changed
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Amendment Summary */}
                        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="text-lg font-semibold text-blue-900 mb-3">📊 Amendment Summary</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-blue-800">Original Total:</span>
                                    <div className="text-blue-900 font-bold">₹{totals.originalTotal.toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-blue-800">New Subtotal:</span>
                                    <div className="text-blue-900 font-bold">₹{totals.newSubtotal.toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-blue-800">New GST:</span>
                                    <div className="text-blue-900 font-bold">₹{totals.newGSTTotal.toLocaleString('en-IN')}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-blue-800">New Total:</span>
                                    <div className="text-blue-900 font-bold">₹{totals.newTotal.toLocaleString('en-IN')}</div>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-blue-200">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-blue-800">Amendment Difference:</span>
                                    <div className={`font-bold ${totals.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {totals.difference >= 0 ? '+' : ''}₹{totals.difference.toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Amendment Actions */}
                    <div className="mt-8 flex justify-end space-x-4">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={submitAmendment}
                            disabled={loading || !amendmentReason.trim()}
                            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium"
                        >
                            {loading ? 'Processing...' : 'Submit Amendment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceAmendment;