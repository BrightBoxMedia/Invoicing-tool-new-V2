import React, { useState, useEffect } from 'react';

const InvoiceViewer = ({ invoice, project, onClose }) => {
    const [invoiceDetails, setInvoiceDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    useEffect(() => {
        fetchInvoiceDetails();
    }, [invoice]);

    const fetchInvoiceDetails = async () => {
        if (!invoice?.id) {
            setInvoiceDetails(invoice);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/invoices/${invoice.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setInvoiceDetails(data);
            } else {
                setError('Failed to fetch invoice details');
                setInvoiceDetails(invoice); // Fallback to provided data
            }
        } catch (err) {
            setError('Network error fetching invoice details');
            setInvoiceDetails(invoice); // Fallback to provided data
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
                <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading invoice details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!invoiceDetails) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">👁️ Invoice Viewer</h2>
                        <p className="text-gray-600 mt-1">
                            Invoice: <span className="font-semibold">{invoiceDetails.invoice_number}</span>
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
                    <div className="mx-6 mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800">⚠️ {error} (Showing cached data)</p>
                    </div>
                )}

                <div className="p-6">
                    
                    {/* Invoice Header Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Invoice Information</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Invoice Number:</span>
                                    <span className="text-blue-600 font-bold">{invoiceDetails.invoice_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Invoice Type:</span>
                                    <span className="text-gray-900">{invoiceDetails.invoice_type || 'Tax Invoice'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Invoice Date:</span>
                                    <span className="text-gray-900">
                                        {new Date(invoiceDetails.invoice_date || invoiceDetails.created_at).toLocaleDateString('en-IN')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Due Date:</span>
                                    <span className="text-gray-900">
                                        {invoiceDetails.due_date ? new Date(invoiceDetails.due_date).toLocaleDateString('en-IN') : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">RA Number:</span>
                                    <span className="text-gray-900">{invoiceDetails.ra_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Status:</span>
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        invoiceDetails.status === 'amended' ? 'bg-orange-100 text-orange-800' :
                                        invoiceDetails.status === 'approval_pending' ? 'bg-yellow-100 text-yellow-800' :
                                        invoiceDetails.status === 'superseded' ? 'bg-red-100 text-red-800' :
                                        invoiceDetails.status === 'paid' ? 'bg-green-100 text-green-800' :
                                        invoiceDetails.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {invoiceDetails.status === 'amended' ? 'Amended' :
                                         invoiceDetails.status === 'approval_pending' ? 'Approval Pending' :
                                         invoiceDetails.status === 'superseded' ? 'Superseded' :
                                         invoiceDetails.status || 'Created'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">🏢 Project Information</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Project:</span>
                                    <span className="text-gray-900">{project?.project_name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Client:</span>
                                    <span className="text-gray-900">{project?.client_name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">GST Type:</span>
                                    <span className="text-gray-900">{invoiceDetails.gst_type || project?.gst_type || 'IGST'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-medium text-gray-700">Payment Terms:</span>
                                    <span className="text-gray-900 text-xs">{invoiceDetails.payment_terms || 'Payment due within 30 days'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Items Table */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Invoice Items</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b">Description</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b">Qty</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b">Unit</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-b">Rate (₹)</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b">GST %</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-b">Amount (₹)</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-b">Total (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {(invoiceDetails.items || []).map((item, index) => {
                                        const basicAmount = item.amount || (item.quantity * item.rate);
                                        const gstAmount = basicAmount * (item.gst_rate || 0) / 100;
                                        const totalAmount = basicAmount + gstAmount;
                                        
                                        return (
                                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-4 py-3 text-sm text-gray-900 border-b">
                                                    <div className="max-w-xs">{item.description}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-900 border-b">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-900 border-b">
                                                    {item.unit}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b">
                                                    ₹{(item.rate || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-900 border-b">
                                                    {item.gst_rate || 0}%
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b">
                                                    ₹{basicAmount.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 border-b">
                                                    ₹{totalAmount.toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-green-900 mb-4">💰 Financial Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-green-800">Subtotal:</span>
                                    <span className="font-bold text-green-900">₹{(invoiceDetails.subtotal || 0).toLocaleString('en-IN')}</span>
                                </div>
                                
                                {/* GST Breakdown */}
                                {invoiceDetails.gst_type === 'CGST_SGST' ? (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-green-800">CGST:</span>
                                            <span className="font-bold text-green-900">₹{(invoiceDetails.cgst_amount || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium text-green-800">SGST:</span>
                                            <span className="font-bold text-green-900">₹{(invoiceDetails.sgst_amount || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-green-800">IGST:</span>
                                        <span className="font-bold text-green-900">₹{(invoiceDetails.igst_amount || invoiceDetails.total_gst_amount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between text-sm pt-2 border-t border-green-300">
                                    <span className="font-medium text-green-800">Total GST:</span>
                                    <span className="font-bold text-green-900">₹{(invoiceDetails.total_gst_amount || 0).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between text-lg pt-2 border-t border-green-300">
                                    <span className="font-bold text-green-800">Total Amount:</span>
                                    <span className="font-bold text-green-900 text-xl">₹{(invoiceDetails.total_amount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-green-800">Advance Received:</span>
                                    <span className="font-bold text-green-900">₹{(invoiceDetails.advance_received || 0).toLocaleString('en-IN')}</span>
                                </div>
                                
                                <div className="flex justify-between text-sm pb-2 border-b border-green-300">
                                    <span className="font-medium text-green-800">Net Amount Due:</span>
                                    <span className="font-bold text-green-900">₹{(invoiceDetails.net_amount_due || invoiceDetails.total_amount || 0).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Amendment Information */}
                    {(invoiceDetails.amendment_reason || invoiceDetails.original_invoice_id) && (
                        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
                            <h4 className="text-md font-semibold text-orange-900 mb-2">📝 Amendment Information</h4>
                            {invoiceDetails.amendment_reason && (
                                <div className="text-sm text-orange-800">
                                    <span className="font-medium">Reason:</span> {invoiceDetails.amendment_reason}
                                </div>
                            )}
                            {invoiceDetails.original_invoice_id && (
                                <div className="text-sm text-orange-800 mt-1">
                                    <span className="font-medium">Original Invoice ID:</span> {invoiceDetails.original_invoice_id}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-8 flex justify-end space-x-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceViewer;