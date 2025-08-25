import React, { useState, useEffect } from 'react';

const EnhancedInvoiceCreation = ({ currentUser, projectId, onClose, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Invoice Type, 2: GST & Company Selection, 3: RA Quantity Tracking, 4: Review
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [project, setProject] = useState(null);
    const [companyProfiles, setCompanyProfiles] = useState([]);
    const [raTracking, setRaTracking] = useState([]);
    
    const [invoiceData, setInvoiceData] = useState({
        invoice_type: 'tax_invoice',
        invoice_gst_type: 'cgst_sgst',
        company_location_id: '',
        company_bank_id: '',
        payment_terms: '',
        advance_received: 0,
        selected_items: [],
        item_gst_mappings: []
    });

    const [gstSettings, setGstSettings] = useState({
        default_gst_type: 'cgst_sgst',
        customer_state: 'Same',
        supplier_state: 'Same'
    });

    const [quantityValidation, setQuantityValidation] = useState({
        valid: true,
        errors: [],
        violations: []
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_REACT_APP_BACKEND_URL;

    useEffect(() => {
        if (projectId) {
            fetchProjectDetails();
            fetchCompanyProfiles();
            fetchRATracking();
        }
    }, [projectId]);

    const fetchProjectDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/projects/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProject(data);
                
                // Set default company profile if available
                if (data.company_profile_id) {
                    setInvoiceData(prev => ({
                        ...prev,
                        company_location_id: data.selected_location_id || '',
                        company_bank_id: data.selected_bank_id || ''
                    }));
                }
            }
        } catch (err) {
            console.error('Error fetching project:', err);
        }
    };

    const fetchCompanyProfiles = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/company-profiles`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCompanyProfiles(data);
            }
        } catch (err) {
            console.error('Error fetching company profiles:', err);
        }
    };

    const fetchRATracking = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/projects/${projectId}/ra-tracking`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setRaTracking(data.ra_tracking || []);
                
                // Initialize selected items with current tracking data
                setInvoiceData(prev => ({
                    ...prev,
                    selected_items: data.ra_tracking.map(item => ({
                        id: item.item_id,
                        description: item.description,
                        unit: item.unit,
                        overall_qty: item.overall_qty,
                        balance_qty: item.balance_qty,
                        rate: item.rate,
                        requested_qty: 0,
                        amount: 0,
                        gst_type: gstSettings.default_gst_type,
                        gst_rate: item.gst_mapping?.total_gst_rate || 18,
                        ra_usage: item.ra_usage || {}
                    }))
                }));
            }
        } catch (err) {
            console.error('Error fetching RA tracking:', err);
        }
    };

    const validateQuantities = async () => {
        try {
            const token = localStorage.getItem('token');
            const itemsToValidate = invoiceData.selected_items
                .filter(item => item.requested_qty > 0)
                .map(item => ({
                    id: item.id,
                    description: item.description,
                    quantity: item.requested_qty
                }));

            const response = await fetch(`${backendUrl}/api/invoices/validate-quantities`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    project_id: projectId,
                    selected_items: itemsToValidate
                })
            });

            if (response.ok) {
                const result = await response.json();
                setQuantityValidation(result);
                return result.valid;
            }
            return false;
        } catch (err) {
            console.error('Error validating quantities:', err);
            return false;
        }
    };

    const updateItemQuantity = (itemIndex, quantity) => {
        const updatedItems = [...invoiceData.selected_items];
        const item = updatedItems[itemIndex];
        
        const requestedQty = parseFloat(quantity) || 0;
        item.requested_qty = requestedQty;
        
        // Calculate amount dynamically (NOT from Excel)
        item.amount = requestedQty * parseFloat(item.rate || 0);
        
        // Check if quantity exceeds balance - STRICT validation
        const exceedsBalance = requestedQty > parseFloat(item.balance_qty || 0);
        item.validation_error = exceedsBalance;
        
        // Force error state if exceeded
        if (exceedsBalance) {
            setError(`❌ CRITICAL: Item "${item.description}" quantity ${requestedQty} exceeds available balance ${item.balance_qty}. Reduce quantity immediately!`);
        } else if (error && error.includes(item.description)) {
            setError(''); // Clear error if this item is now valid
        }
        
        setInvoiceData(prev => ({
            ...prev,
            selected_items: updatedItems
        }));
    };

    const updateItemGSTType = (itemIndex, gstType) => {
        const updatedItems = [...invoiceData.selected_items];
        updatedItems[itemIndex].gst_type = gstType;
        
        const updatedMappings = [...invoiceData.item_gst_mappings];
        const mappingIndex = updatedMappings.findIndex(m => m.item_id === updatedItems[itemIndex].id);
        
        if (mappingIndex >= 0) {
            updatedMappings[mappingIndex].gst_type = gstType;
        } else {
            updatedMappings.push({
                item_id: updatedItems[itemIndex].id,
                gst_type: gstType,
                total_gst_rate: updatedItems[itemIndex].gst_rate,
                cgst_rate: gstType === 'cgst_sgst' ? updatedItems[itemIndex].gst_rate / 2 : 0,
                sgst_rate: gstType === 'cgst_sgst' ? updatedItems[itemIndex].gst_rate / 2 : 0,
                igst_rate: gstType === 'igst' ? updatedItems[itemIndex].gst_rate : 0
            });
        }
        
        setInvoiceData(prev => ({
            ...prev,
            selected_items: updatedItems,
            item_gst_mappings: updatedMappings
        }));
    };

    const calculateTotals = () => {
        const selectedItems = invoiceData.selected_items.filter(item => item.requested_qty > 0);
        
        let subtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;
        
        selectedItems.forEach(item => {
            subtotal += item.amount;
            
            if (item.gst_type === 'cgst_sgst') {
                const gstAmount = (item.amount * item.gst_rate) / 100;
                totalCGST += gstAmount / 2;
                totalSGST += gstAmount / 2;
            } else {
                totalIGST += (item.amount * item.gst_rate) / 100;
            }
        });
        
        return {
            subtotal,
            totalCGST,
            totalSGST,
            totalIGST,
            totalGST: totalCGST + totalSGST + totalIGST,
            grandTotal: subtotal + totalCGST + totalSGST + totalIGST
        };
    };

    const createInvoice = async () => {
        try {
            setLoading(true);
            
            // CRITICAL VALIDATION - Block if ANY item exceeds quantity
            const errorItems = invoiceData.selected_items.filter(item => 
                parseFloat(item.requested_qty || 0) > parseFloat(item.balance_qty || 0)
            );
            
            if (errorItems.length > 0) {
                const errorMessages = errorItems.map(item => 
                    `${item.description}: Requested ${item.requested_qty} > Available ${item.balance_qty}`
                );
                setError(`❌ INVOICE CREATION BLOCKED! The following items exceed available quantity:\n${errorMessages.join('\n')}`);
                setLoading(false);
                return; // HARD STOP - Don't proceed
            }

            const selectedItems = invoiceData.selected_items.filter(item => parseFloat(item.requested_qty || 0) > 0);
            
            if (selectedItems.length === 0) {
                setError('❌ Please select at least one item with quantity greater than 0.');
                setLoading(false);
                return;
            }

            // Calculate everything dynamically - NEVER use Excel values
            let subtotal = 0;
            let totalCGST = 0;
            let totalSGST = 0;
            let totalIGST = 0;
            
            selectedItems.forEach(item => {
                const amount = parseFloat(item.requested_qty) * parseFloat(item.rate);
                subtotal += amount;
                
                const gstRate = parseFloat(item.gst_rate || 18);
                if (item.gst_type === 'cgst_sgst') {
                    const halfGST = (amount * gstRate) / 200; // Divide by 200 for half of percentage
                    totalCGST += halfGST;
                    totalSGST += halfGST;
                } else {
                    totalIGST += (amount * gstRate) / 100;
                }
            });

            const totalGST = totalCGST + totalSGST + totalIGST;
            const grandTotal = subtotal + totalGST;
            
            const invoicePayload = {
                project_id: projectId,
                invoice_type: invoiceData.invoice_type,
                invoice_gst_type: invoiceData.invoice_gst_type,
                company_location_id: invoiceData.company_location_id,
                company_bank_id: invoiceData.company_bank_id,
                payment_terms: invoiceData.payment_terms || 'Net 30 Days',
                advance_received: parseFloat(invoiceData.advance_received) || 0,
                invoice_items: selectedItems.map(item => ({
                    id: item.id,
                    description: item.description,
                    quantity: parseFloat(item.requested_qty),
                    unit: item.unit,
                    rate: parseFloat(item.rate),
                    amount: parseFloat(item.requested_qty) * parseFloat(item.rate),
                    gst_rate: parseFloat(item.gst_rate || 18),
                    gst_type: item.gst_type || 'cgst_sgst'
                })),
                subtotal: subtotal,
                cgst_amount: totalCGST,
                sgst_amount: totalSGST,
                igst_amount: totalIGST,
                total_gst_amount: totalGST,
                total_amount: grandTotal
            };

            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/invoices/enhanced`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invoicePayload)
            });

            if (response.ok) {
                const result = await response.json();
                alert(`✅ SUCCESS! Invoice created: ${result.ra_number || 'Proforma'}\nTotal: ₹${grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
                
                // Force refresh of parent component
                if (onSuccess) {
                    await onSuccess();
                }
                if (onClose) {
                    onClose();
                }
                
                // Force page reload to show updated data
                window.location.reload();
            } else {
                const errorData = await response.json();
                setError(`❌ Failed to create invoice: ${errorData.detail || 'Unknown error'}`);
            }
        } catch (err) {
            setError(`❌ Network error: ${err.message}`);
            console.error('Error creating invoice:', err);
        } finally {
            setLoading(false);
        }
    };

    const getRAColumns = () => {
        if (!raTracking.length) return [];
        
        // Get all unique RA numbers from tracking data
        const raNumbers = new Set();
        raTracking.forEach(item => {
            Object.keys(item.ra_usage || {}).forEach(raNum => raNumbers.add(raNum));
        });
        
        return Array.from(raNumbers).sort();
    };

    const raColumns = getRAColumns();
    const totals = calculateTotals();

    const renderStepIndicator = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between">
                {['Invoice Type', 'GST & Company', 'RA Quantity Tracking', 'Review & Create'].map((stepName, index) => (
                    <div key={index} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            step > index + 1 ? 'bg-green-500 text-white' : 
                            step === index + 1 ? 'bg-blue-500 text-white' : 
                            'bg-gray-200 text-gray-600'
                        }`}>
                            {step > index + 1 ? '✓' : index + 1}
                        </div>
                        <span className={`ml-2 text-sm ${step === index + 1 ? 'font-medium text-blue-600' : 'text-gray-500'}`}>
                            {stepName}
                        </span>
                        {index < 3 && <div className="flex-1 mx-4 h-0.5 bg-gray-200"></div>}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border max-w-7xl shadow-lg rounded-lg bg-white min-h-[600px]">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Enhanced Invoice Creation</h2>
                    <p className="text-gray-600">Create invoice with advanced GST logic and RA bill tracking</p>
                    {project && (
                        <p className="text-sm text-gray-500 mt-2">Project: {project.project_name} | Client: {project.client_name}</p>
                    )}
                </div>

                {renderStepIndicator()}

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800">{error}</p>
                        <button
                            onClick={() => setError('')}
                            className="mt-2 text-sm text-red-600 hover:text-red-800"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Step 1: Invoice Type Selection */}
                {step === 1 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">Invoice Type Selection</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div 
                                className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                                    invoiceData.invoice_type === 'proforma' 
                                        ? 'border-blue-500 bg-blue-50' 
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setInvoiceData({...invoiceData, invoice_type: 'proforma'})}
                            >
                                <div className="flex items-center mb-4">
                                    <div className={`w-4 h-4 rounded-full mr-3 ${
                                        invoiceData.invoice_type === 'proforma' ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}></div>
                                    <h4 className="text-lg font-semibold text-gray-900">Proforma Invoice</h4>
                                </div>
                                <p className="text-gray-600">
                                    Advance billing without tax implications. Used for quotations and advance payments.
                                </p>
                                <ul className="mt-3 text-sm text-gray-500 space-y-1">
                                    <li>• No GST implications</li>
                                    <li>• Can be converted to tax invoice later</li>
                                    <li>• Used for advance collection</li>
                                </ul>
                            </div>
                            
                            <div 
                                className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                                    invoiceData.invoice_type === 'tax_invoice' 
                                        ? 'border-blue-500 bg-blue-50' 
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setInvoiceData({...invoiceData, invoice_type: 'tax_invoice'})}
                            >
                                <div className="flex items-center mb-4">
                                    <div className={`w-4 h-4 rounded-full mr-3 ${
                                        invoiceData.invoice_type === 'tax_invoice' ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}></div>
                                    <h4 className="text-lg font-semibold text-gray-900">Tax Invoice (RA Bill)</h4>
                                </div>
                                <p className="text-gray-600">
                                    Running Account (RA) bill with full GST compliance and quantity tracking.
                                </p>
                                <ul className="mt-3 text-sm text-gray-500 space-y-1">
                                    <li>• Full GST compliance</li>
                                    <li>• Quantity validation against BOQ</li>
                                    <li>• RA bill numbering (RA1, RA2, etc.)</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setStep(2)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Next: GST & Company
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: GST & Company Selection */}
                {step === 2 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">GST Configuration & Company Selection</h3>
                        
                        {/* GST Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">GST Type</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div 
                                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                                        invoiceData.invoice_gst_type === 'cgst_sgst' 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => setInvoiceData({...invoiceData, invoice_gst_type: 'cgst_sgst'})}
                                >
                                    <div className="flex items-center">
                                        <div className={`w-4 h-4 rounded-full mr-3 ${
                                            invoiceData.invoice_gst_type === 'cgst_sgst' ? 'bg-blue-500' : 'bg-gray-300'
                                        }`}></div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">CGST + SGST</h4>
                                            <p className="text-sm text-gray-600">Central + State GST (Intrastate)</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div 
                                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                                        invoiceData.invoice_gst_type === 'igst' 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => setInvoiceData({...invoiceData, invoice_gst_type: 'igst'})}
                                >
                                    <div className="flex items-center">
                                        <div className={`w-4 h-4 rounded-full mr-3 ${
                                            invoiceData.invoice_gst_type === 'igst' ? 'bg-blue-500' : 'bg-gray-300'
                                        }`}></div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">IGST</h4>
                                            <p className="text-sm text-gray-600">Integrated GST (Interstate)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Location & Bank Selection */}
                        {project && project.company_profile_id && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Location</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={invoiceData.company_location_id}
                                        onChange={(e) => setInvoiceData({...invoiceData, company_location_id: e.target.value})}
                                    >
                                        <option value="">Select Location</option>
                                        {companyProfiles.find(p => p.id === project.company_profile_id)?.locations?.map(location => (
                                            <option key={location.id} value={location.id}>
                                                {location.location_name} - {location.city}
                                                {location.is_default ? ' (Default)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={invoiceData.company_bank_id}
                                        onChange={(e) => setInvoiceData({...invoiceData, company_bank_id: e.target.value})}
                                    >
                                        <option value="">Select Bank Account</option>
                                        {companyProfiles.find(p => p.id === project.company_profile_id)?.bank_details?.map(bank => (
                                            <option key={bank.id} value={bank.id}>
                                                {bank.bank_name} - ****{bank.account_number?.slice(-4)}
                                                {bank.is_default ? ' (Default)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Payment Terms */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                            <textarea
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={invoiceData.payment_terms}
                                onChange={(e) => setInvoiceData({...invoiceData, payment_terms: e.target.value})}
                                placeholder="Enter payment terms and conditions..."
                            />
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Next: RA Tracking
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: RA Quantity Tracking */}
                {step === 3 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">RA Bill Quantity Tracking</h3>
                        <p className="text-gray-600">
                            Select quantities for this RA bill. Red rows indicate quantity exceeding available balance.
                        </p>

                        {/* RA Tracking Table */}
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall Qty</th>
                                        {raColumns.map(raNum => (
                                            <th key={raNum} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                {raNum} Used
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">This RA Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Type</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {invoiceData.selected_items.map((item, index) => {
                                        const requestedQty = parseFloat(item.requested_qty || 0);
                                        const balanceQty = parseFloat(item.balance_qty || 0);
                                        const exceedsBalance = requestedQty > balanceQty;
                                        
                                        return (
                                            <tr key={item.id} className={exceedsBalance ? 'bg-red-100 border-2 border-red-500' : 'hover:bg-gray-50'}>
                                                <td className="px-4 py-4">
                                                    <div className={`text-sm font-medium ${exceedsBalance ? 'text-red-800' : 'text-gray-900'}`}>
                                                        {item.description}
                                                    </div>
                                                    {exceedsBalance && (
                                                        <div className="text-xs font-bold text-red-700 mt-1 bg-red-200 px-2 py-1 rounded">
                                                            ❌ EXCEEDS by {(requestedQty - balanceQty).toFixed(2)} - REDUCE QUANTITY!
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={`px-4 py-4 text-sm ${exceedsBalance ? 'text-red-800 font-bold' : 'text-gray-900'}`}>
                                                    {item.unit}
                                                </td>
                                                <td className={`px-4 py-4 text-sm font-medium ${exceedsBalance ? 'text-red-800' : 'text-gray-900'}`}>
                                                    {item.overall_qty}
                                                </td>
                                                
                                                {raColumns.map(raNum => (
                                                    <td key={raNum} className="px-4 py-4 text-sm text-gray-600">
                                                        {item.ra_usage[raNum] || 0}
                                                    </td>
                                                ))}
                                                
                                                <td className="px-4 py-4">
                                                    <span className={`text-sm font-bold px-2 py-1 rounded ${
                                                        balanceQty <= 0 ? 'text-red-800 bg-red-200' : 
                                                        exceedsBalance ? 'text-red-800 bg-red-200' : 'text-green-800 bg-green-200'
                                                    }`}>
                                                        {balanceQty.toFixed(2)} {item.unit}
                                                    </span>
                                                </td>
                                                
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        max={balanceQty}
                                                        className={`w-24 px-2 py-1 border-2 rounded text-sm font-bold focus:outline-none focus:ring-2 no-spinner ${
                                                            exceedsBalance 
                                                                ? 'border-red-600 focus:ring-red-600 bg-red-50 text-red-800' 
                                                                : 'border-green-500 focus:ring-green-500 bg-white'
                                                        }`}
                                                        style={{
                                                            appearance: 'textfield',
                                                            MozAppearance: 'textfield',
                                                            WebkitAppearance: 'none'
                                                        }}
                                                        value={item.requested_qty || ''}
                                                        onChange={(e) => updateItemQuantity(index, e.target.value)}
                                                        onInput={(e) => {
                                                            // Real-time update without lag
                                                            const value = e.target.value;
                                                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                                updateItemQuantity(index, value);
                                                            }
                                                        }}
                                                        placeholder="0.00"
                                                    />
                                                    {exceedsBalance && (
                                                        <div className="text-xs text-red-700 mt-1 font-bold">
                                                            MAX: {balanceQty.toFixed(2)}
                                                        </div>
                                                    )}
                                                </td>
                                                
                                                <td className={`px-4 py-4 text-sm ${exceedsBalance ? 'text-red-800 font-bold' : 'text-gray-900'}`}>
                                                    ₹{parseFloat(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                                </td>
                                                
                                                <td className={`px-4 py-4 text-sm font-bold ${exceedsBalance ? 'text-red-800' : 'text-gray-900'}`}>
                                                    ₹{((parseFloat(item.requested_qty || 0)) * parseFloat(item.rate || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                                </td>
                                                
                                                <td className="px-4 py-4">
                                                    <select
                                                        className="text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        value={item.gst_type}
                                                        onChange={(e) => updateItemGSTType(index, e.target.value)}
                                                    >
                                                        <option value="cgst_sgst">CGST+SGST</option>
                                                        <option value="igst">IGST</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Quantity Validation Errors */}
                        {!quantityValidation.valid && quantityValidation.errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h4 className="font-medium text-red-800 mb-2">Quantity Validation Errors:</h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {quantityValidation.errors.map((error, index) => (
                                        <li key={index} className="text-red-700 text-sm">{error}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(2)}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setStep(4)}
                                disabled={invoiceData.selected_items.some(item => item.validation_error)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                Next: Review
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Review & Create */}
                {step === 4 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">Review Invoice Details</h3>
                        
                        {/* Invoice Summary */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-3">Invoice Details</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-gray-600">Type:</span> <span className="font-medium">{invoiceData.invoice_type.replace('_', ' ').toUpperCase()}</span></div>
                                        <div><span className="text-gray-600">GST Type:</span> <span className="font-medium">{invoiceData.invoice_gst_type.replace('_', '+').toUpperCase()}</span></div>
                                        <div><span className="text-gray-600">Project:</span> <span className="font-medium">{project?.project_name}</span></div>
                                        <div><span className="text-gray-600">Client:</span> <span className="font-medium">{project?.client_name}</span></div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-3">Financial Summary</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Subtotal:</span>
                                            <span className="font-medium">₹{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                        </div>
                                        {totals.totalCGST > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">CGST:</span>
                                                <span className="font-medium">₹{totals.totalCGST.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                            </div>
                                        )}
                                        {totals.totalSGST > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">SGST:</span>
                                                <span className="font-medium">₹{totals.totalSGST.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                            </div>
                                        )}
                                        {totals.totalIGST > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">IGST:</span>
                                                <span className="font-medium">₹{totals.totalIGST.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-gray-300 pt-2 mt-2">
                                            <div className="flex justify-between">
                                                <span className="font-medium text-gray-900">Total:</span>
                                                <span className="font-bold text-lg">₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Selected Items */}
                        <div>
                            <h4 className="font-medium text-gray-900 mb-3">Selected Items</h4>
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST Type</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {invoiceData.selected_items.filter(item => item.requested_qty > 0).map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.requested_qty}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.unit}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">₹{item.rate?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">₹{item.amount?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.gst_type.replace('_', '+').toUpperCase()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(3)}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={createInvoice}
                                disabled={loading || invoiceData.selected_items.some(item => parseFloat(item.requested_qty || 0) > parseFloat(item.balance_qty || 0))}
                                className={`px-6 py-2 rounded-md font-bold transition-colors ${
                                    loading || invoiceData.selected_items.some(item => parseFloat(item.requested_qty || 0) > parseFloat(item.balance_qty || 0))
                                        ? 'bg-red-400 text-white cursor-not-allowed' 
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                            >
                                {loading ? 'Creating Invoice...' : 
                                 invoiceData.selected_items.some(item => parseFloat(item.requested_qty || 0) > parseFloat(item.balance_qty || 0)) 
                                    ? '❌ FIX QUANTITY ERRORS FIRST' 
                                    : '✅ Create Invoice'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ABG Release Mapping Tracker / Cash Flow Summary Table */}
                {project && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 ABG Release Mapping Tracker / Cash Flow (Project-wise)</h3>
                        <p className="text-sm text-gray-600 mb-4">Spread - Cash Receivables (Including taxes)</p>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-2 border-gray-300">
                                <thead className="bg-blue-600 text-white">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-white">Particulars</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-white">Type</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-white">Reference No</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-white">Dated</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-white">Basic</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-white">GST (18%)</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-white">PO/Inv Value</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-white">ABG ({project.cash_flow_percentages?.abg_percentage || project.project_metadata?.abg_percentage || 30}%)</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-white">RA Bill ({project.cash_flow_percentages?.ra_bill_percentage || project.project_metadata?.ra_bill_percentage || 45}%)</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-white">Erection ({project.cash_flow_percentages?.erection_percentage || project.project_metadata?.erection_percentage || 20}%)</th>
                                        <th className="px-3 py-3 text-left text-xs font-bold uppercase">PBG ({project.cash_flow_percentages?.pbg_percentage || project.project_metadata?.pbg_percentage || 5}%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {/* Percentage Header Row */}
                                    <tr className="bg-yellow-100 font-bold text-center">
                                        <td className="px-3 py-2 border-r font-bold">%</td>
                                        <td className="px-3 py-2 border-r">-</td>
                                        <td className="px-3 py-2 border-r">-</td>
                                        <td className="px-3 py-2 border-r">-</td>
                                        <td className="px-3 py-2 border-r text-blue-800">100%</td>
                                        <td className="px-3 py-2 border-r text-blue-800">18%</td>
                                        <td className="px-3 py-2 border-r text-blue-800">118%</td>
                                        <td className="px-3 py-2 border-r text-green-800">{project.cash_flow_percentages?.abg_percentage || project.project_metadata?.abg_percentage || 30}%</td>
                                        <td className="px-3 py-2 border-r text-green-800">{project.cash_flow_percentages?.ra_bill_percentage || project.project_metadata?.ra_bill_percentage || 45}%</td>
                                        <td className="px-3 py-2 border-r text-green-800">{project.cash_flow_percentages?.erection_percentage || project.project_metadata?.erection_percentage || 20}%</td>
                                        <td className="px-3 py-2 text-green-800">{project.cash_flow_percentages?.pbg_percentage || project.project_metadata?.pbg_percentage || 5}%</td>
                                    </tr>
                                    
                                    {/* Overall Row */}
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-3 py-3 border-r font-bold text-gray-900">Overall</td>
                                        <td className="px-3 py-3 border-r">Purchase Order</td>
                                        <td className="px-3 py-3 border-r font-medium">PO-{project.project_name?.slice(0,8) || 'PROJECT'}</td>
                                        <td className="px-3 py-3 border-r">{new Date().toISOString().split('T')[0]}</td>
                                        <td className="px-3 py-3 border-r font-bold text-blue-900">₹{(project.total_project_value / 1.18).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                        <td className="px-3 py-3 border-r font-bold text-blue-900">₹{(project.total_project_value * 0.18 / 1.18).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                        <td className="px-3 py-3 border-r font-bold text-blue-900">₹{project.total_project_value.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                        <td className="px-3 py-3 border-r font-bold text-green-800">₹{(project.total_project_value * 0.30).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                        <td className="px-3 py-3 border-r font-bold text-green-800">₹{(project.total_project_value * 0.45).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                        <td className="px-3 py-3 border-r font-bold text-green-800">₹{(project.total_project_value * 0.20).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                        <td className="px-3 py-3 font-bold text-green-800">₹{(project.total_project_value * 0.05).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                    
                                    {/* Amount Left to Claim Row - Since we don't have existing invoices data, show full amounts */}
                                    <tr className="bg-blue-100 font-bold border-t-2 border-blue-400">
                                        <td className="px-3 py-3 border-r text-blue-900">Amount Left to Claim</td>
                                        <td className="px-3 py-3 border-r">-</td>
                                        <td className="px-3 py-3 border-r">-</td>
                                        <td className="px-3 py-3 border-r">-</td>
                                        <td className="px-3 py-3 border-r text-blue-900">
                                            ₹{(project.total_project_value / 1.18).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-3 py-3 border-r text-blue-900">
                                            ₹{(project.total_project_value * 0.18 / 1.18).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-3 py-3 border-r text-blue-900 font-bold">
                                            ₹{project.total_project_value.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-3 py-3 border-r text-green-800">
                                            ₹{(project.total_project_value * 0.30).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-3 py-3 border-r text-green-800">
                                            ₹{(project.total_project_value * 0.45).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-3 py-3 border-r text-green-800">
                                            ₹{(project.total_project_value * 0.20).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-3 py-3 text-green-800">
                                            ₹{(project.total_project_value * 0.05).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800 font-medium">
                                💡 <strong>Cash Flow Summary:</strong> This table shows your expected cash receivables based on project milestones and payment terms. 
                                ABG amounts can be claimed upon fulfilling advance bank guarantee requirements.
                            </p>
                        </div>
                    </div>
                )}

                {/* Modal Actions */}
                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EnhancedInvoiceCreation;