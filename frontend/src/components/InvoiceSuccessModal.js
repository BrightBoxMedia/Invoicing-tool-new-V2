import React from 'react';

const InvoiceSuccessModal = ({ invoice, project, onClose, onDownloadPDF, onCreateAnother }) => {
    if (!invoice) return null;

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    const handleDownloadPDF = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/invoices/${invoice.id}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${invoice.invoice_number}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6">
                {/* Success Header */}
                <div className="text-center mb-6">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 Invoice Created Successfully!</h2>
                    <p className="text-gray-600">
                        Your invoice has been generated and is ready for download
                    </p>
                </div>

                {/* Invoice Details */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Invoice Details</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium text-gray-700">Invoice Number:</span>
                            <div className="text-blue-600 font-bold text-lg">{invoice.invoice_number}</div>
                        </div>
                        
                        <div>
                            <span className="font-medium text-gray-700">RA Number:</span>
                            <div className="text-blue-600 font-bold text-lg">{invoice.ra_number || 'N/A'}</div>
                        </div>
                        
                        <div>
                            <span className="font-medium text-gray-700">Project:</span>
                            <div className="text-gray-900 font-medium">{project?.project_name}</div>
                        </div>
                        
                        <div>
                            <span className="font-medium text-gray-700">Client:</span>
                            <div className="text-gray-900 font-medium">{project?.client_name}</div>
                        </div>
                        
                        <div>
                            <span className="font-medium text-gray-700">Invoice Date:</span>
                            <div className="text-gray-900">{new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString('en-IN')}</div>
                        </div>
                        
                        <div>
                            <span className="font-medium text-gray-700">Items Count:</span>
                            <div className="text-gray-900">{invoice.items?.length || 0} items</div>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-sm font-medium text-gray-700">Subtotal</div>
                                <div className="text-lg font-bold text-gray-900">₹{(invoice.subtotal || 0).toLocaleString('en-IN')}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-medium text-gray-700">GST Amount</div>
                                <div className="text-lg font-bold text-orange-600">₹{(invoice.total_gst_amount || 0).toLocaleString('en-IN')}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-medium text-gray-700">Total Amount</div>
                                <div className="text-xl font-bold text-green-600">₹{(invoice.total_amount || 0).toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Download PDF</span>
                    </button>
                    
                    <button
                        onClick={() => {
                            onClose();
                            onCreateAnother?.();
                        }}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Create Another</span>
                    </button>
                    
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        Done
                    </button>
                </div>

                {/* Additional Info */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                        <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-blue-800">
                            <p className="font-medium">Next Steps:</p>
                            <ul className="mt-1 space-y-1 text-xs">
                                <li>• Download and send the PDF to your client</li>
                                <li>• The quantities have been deducted from your project balance</li>
                                <li>• You can view this invoice in the project's invoice history</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceSuccessModal;