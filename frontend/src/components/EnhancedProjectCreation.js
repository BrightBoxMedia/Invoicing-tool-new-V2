import React, { useState, useEffect } from 'react';

const EnhancedProjectCreation = ({ currentUser, parsedBoqData, onClose, onSuccess }) => {
    const [projectData, setProjectData] = useState({
        project_name: '',
        architect_name: '',
        architect_address: '',
        client_name: '',
        client_address: '',
        purchase_order_number: '',
        abg_percentage: 0,
        ra_percentage: 0,
        erection_percentage: 0,
        pbg_percentage: 0,
        company_profile_id: '',
        selected_location_id: '',
        selected_bank_id: ''
    });

    const [companyProfiles, setCompanyProfiles] = useState([]);
    const [clients, setClients] = useState([]);
    const [selectedProfile, setSelectedProfile] = useState(null);
    
    // Excel-like metadata state
    const [metadataRows, setMetadataRows] = useState([{
        id: 1,
        purchase_order_number: '',
        type: '',
        reference_no: '',
        dated: '',
        basic: 0,
        overall_multiplier: 1,
        po_inv_value: 0,
        abg_percentage: 0,
        ra_bill_with_taxes_percentage: 0,
        erection_percentage: 0,
        pbg_percentage: 0,
        // Calculated fields
        abg_amount: 0,
        ra_bill_amount: 0,
        erection_amount: 0,
        pbg_amount: 0
    }]);

    const [boqFile, setBoqFile] = useState(null);
    const [boqItems, setBoqItems] = useState([]);
    const [validationResult, setValidationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1); // 1: Basic Info, 2: Company Selection, 3: Review BOQ & Create

    const backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

    useEffect(() => {
        fetchCompanyProfiles();
        fetchClients();
    }, []);

    // Handle parsed BOQ data from file upload
    useEffect(() => {
        if (parsedBoqData) {
            console.log('📋 Received parsed BOQ data:', parsedBoqData);
            
            // Set BOQ items if available
            if (parsedBoqData.boq_items) {
                setBoqItems(parsedBoqData.boq_items);
                console.log(`✅ Loaded ${parsedBoqData.boq_items.length} BOQ items`);
            }
            
            // Set project name from filename or project info
            if (parsedBoqData.project_info?.project_name) {
                setProjectData(prev => ({
                    ...prev,
                    project_name: parsedBoqData.project_info.project_name
                }));
            }
            
            // Auto-advance to review step if BOQ items exist  
            if (parsedBoqData.boq_items?.length > 0) {
                setStep(3); // Go directly to review step
                setValidationResult({
                    success: true,
                    message: `Successfully loaded ${parsedBoqData.boq_items.length} BOQ items`,
                    items_count: parsedBoqData.boq_items.length,
                    total_amount: parsedBoqData.project_info?.total_amount || 0
                });
            }
        }
    }, [parsedBoqData]);

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
            } else {
                // If endpoint doesn't exist or no data, provide default company profile
                console.log('Company profiles endpoint not found, using default profile');
                const defaultProfile = {
                    id: 'default-company-1',
                    company_name: 'Activus Design & Build',
                    gst_number: '',
                    pan_number: '',
                    email: 'info@activus.com',
                    address: '',
                    locations: [
                        {
                            id: 'loc-1',
                            location_name: 'Main Office',
                            city: 'Mumbai',
                            address: 'Main Office Address',
                            is_default: true
                        }
                    ],
                    bank_details: [
                        {
                            id: 'bank-1',
                            bank_name: 'HDFC Bank',
                            account_number: '1234567890',
                            ifsc_code: 'HDFC0001234',
                            branch: 'Main Branch',
                            swift_code: 'HDFCINBB',
                            is_default: true
                        }
                    ]
                };
                setCompanyProfiles([defaultProfile]);
            }
        } catch (err) {
            console.error('Error fetching company profiles:', err);
            // Provide default profile on error
            const defaultProfile = {
                id: 'default-company-1',
                company_name: 'Activus Design & Build',
                gst_number: '',
                pan_number: '',
                email: 'info@activus.com',
                address: '',
                locations: [
                    {
                        id: 'loc-1',
                        location_name: 'Main Office',
                        city: 'Mumbai',
                        address: 'Main Office Address',
                        is_default: true
                    }
                ],
                bank_details: [
                    {
                        id: 'bank-1',
                        bank_name: 'HDFC Bank',
                        account_number: '1234567890',
                        ifsc_code: 'HDFC0001234',
                        branch: 'Main Branch',
                        swift_code: 'HDFCINBB',
                        is_default: true
                    }
                ]
            };
            setCompanyProfiles([defaultProfile]);
        }
    };

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/clients`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setClients(data);
            }
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
    };

    // Excel-like metadata calculations
    const calculateRowAmounts = (row) => {
        const poValue = parseFloat(row.po_inv_value) || 0;
        
        return {
            ...row,
            abg_amount: (poValue * (parseFloat(row.abg_percentage) || 0)) / 100,
            ra_bill_amount: (poValue * (parseFloat(row.ra_bill_with_taxes_percentage) || 0)) / 100,
            erection_amount: (poValue * (parseFloat(row.erection_percentage) || 0)) / 100,
            pbg_amount: (poValue * (parseFloat(row.pbg_percentage) || 0)) / 100
        };
    };

    const updateMetadataRow = (rowIndex, field, value) => {
        const updatedRows = [...metadataRows];
        updatedRows[rowIndex] = {
            ...updatedRows[rowIndex],
            [field]: value
        };

        // Recalculate amounts for this row
        updatedRows[rowIndex] = calculateRowAmounts(updatedRows[rowIndex]);
        
        setMetadataRows(updatedRows);
    };

    const addMetadataRow = () => {
        const newRow = {
            id: Date.now(),
            purchase_order_number: '',
            type: '',
            reference_no: '',
            dated: '',
            basic: 0,
            overall_multiplier: 1,
            po_inv_value: 0,
            abg_percentage: 0,
            ra_bill_with_taxes_percentage: 0,
            erection_percentage: 0,
            pbg_percentage: 0,
            abg_amount: 0,
            ra_bill_amount: 0,
            erection_amount: 0,
            pbg_amount: 0
        };
        
        setMetadataRows([...metadataRows, newRow]);
    };

    const removeMetadataRow = (rowIndex) => {
        if (metadataRows.length > 1) {
            setMetadataRows(metadataRows.filter((_, index) => index !== rowIndex));
        }
    };

    const handleCompanyProfileChange = (profileId) => {
        const profile = companyProfiles.find(p => p.id === profileId);
        setSelectedProfile(profile);
        setProjectData({
            ...projectData,
            company_profile_id: profileId,
            selected_location_id: profile?.default_location_id || '',
            selected_bank_id: profile?.default_bank_id || ''
        });
    };

    const handleBOQUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setBOQFile(file);
        
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/projects/parse-boq`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setBoqItems(data.items || []);
                setError('');
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'Failed to parse BOQ file');
            }
        } catch (err) {
            setError('Network error uploading BOQ');
            console.error('Error uploading BOQ:', err);
        } finally {
            setLoading(false);
        }
    };

    const validateMetadata = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const response = await fetch(`${backendUrl}/api/projects/validate-metadata`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    metadata: metadataRows,
                    boq_items: boqItems
                })
            });

            if (response.ok) {
                const result = await response.json();
                setValidationResult(result);
                
                if (!result.valid) {
                    setError('Metadata validation failed. Please check the errors and correct them.');
                } else {
                    setError('');
                    setStep(4); // Move to final review
                }
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'Validation failed');
            }
        } catch (err) {
            setError('Network error during validation');
            console.error('Error validating metadata:', err);
        } finally {
            setLoading(false);
        }
    };

    const createProject = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            
            const projectPayload = {
                ...projectData,
                metadata: metadataRows,
                boq_items: boqItems,
                total_project_value: boqItems.reduce((sum, item) => sum + (item.total_with_gst || 0), 0)
            };

            const response = await fetch(`${backendUrl}/api/projects`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(projectPayload)
            });

            if (response.ok) {
                onSuccess?.();
                onClose?.();
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'Failed to create project');
            }
        } catch (err) {
            setError('Network error creating project');
            console.error('Error creating project:', err);
        } finally {
            setLoading(false);
        }
    };

    const getTotalValues = () => {
        return metadataRows.reduce((totals, row) => ({
            po_total: totals.po_total + (parseFloat(row.po_inv_value) || 0),
            abg_total: totals.abg_total + (parseFloat(row.abg_amount) || 0),
            ra_total: totals.ra_total + (parseFloat(row.ra_bill_amount) || 0),
            erection_total: totals.erection_total + (parseFloat(row.erection_amount) || 0),
            pbg_total: totals.pbg_total + (parseFloat(row.pbg_amount) || 0)
        }), { po_total: 0, abg_total: 0, ra_total: 0, erection_total: 0, pbg_total: 0 });
    };

    const totals = getTotalValues();

    const renderStepIndicator = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between">
                {['Basic Info', 'Company Selection', 'Review BOQ & Create'].map((stepName, index) => (
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
                        {index < 4 && <div className="flex-1 mx-4 h-0.5 bg-gray-200"></div>}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border max-w-6xl shadow-lg rounded-lg bg-white min-h-[600px]">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Enhanced Project Creation</h2>
                    <p className="text-gray-600">Create project with company profile, metadata validation, and BOQ upload</p>
                </div>

                {renderStepIndicator()}

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Step 1: Basic Info - ENHANCED AS PER REQUIREMENTS */}
                {step === 1 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">Basic Project Information</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Project Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Project Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={projectData.project_name}
                                    onChange={(e) => setProjectData({...projectData, project_name: e.target.value})}
                                    placeholder="Enter project name"
                                />
                            </div>
                            
                            {/* Purchase Order Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Order Number *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={projectData.purchase_order_number}
                                    onChange={(e) => setProjectData({...projectData, purchase_order_number: e.target.value})}
                                    placeholder="Enter PO number"
                                />
                            </div>
                            
                            {/* Architect Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Architect Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={projectData.architect_name}
                                    onChange={(e) => setProjectData({...projectData, architect_name: e.target.value})}
                                    placeholder="Enter architect name"
                                />
                            </div>
                            
                            {/* Architect Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Architect Address *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={projectData.architect_address}
                                    onChange={(e) => setProjectData({...projectData, architect_address: e.target.value})}
                                    placeholder="Enter architect address"
                                />
                            </div>
                            
                            {/* Client Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={projectData.client_name}
                                    onChange={(e) => setProjectData({...projectData, client_name: e.target.value})}
                                    placeholder="Enter client name"
                                />
                            </div>
                            
                            {/* Client Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Client Address *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={projectData.client_address}
                                    onChange={(e) => setProjectData({...projectData, client_address: e.target.value})}
                                    placeholder="Enter client address"
                                />
                            </div>
                        </div>

                        {/* Project Percentages Section */}
                        <div className="mt-8">
                            <h4 className="text-md font-semibold text-gray-900 mb-4">💼 Project Percentages</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                
                                {/* ABG Percentage */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">ABG % *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={projectData.abg_percentage}
                                        onChange={(e) => setProjectData({...projectData, abg_percentage: parseFloat(e.target.value) || 0})}
                                        placeholder="0.0"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">Advance Bank Guarantee</div>
                                </div>
                                
                                {/* RA Bill Percentage */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">RA Bill % *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={projectData.ra_percentage}
                                        onChange={(e) => setProjectData({...projectData, ra_percentage: parseFloat(e.target.value) || 0})}
                                        placeholder="0.0"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">RA Bill with Taxes</div>
                                </div>
                                
                                {/* Erection Percentage */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Erection % *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={projectData.erection_percentage}
                                        onChange={(e) => setProjectData({...projectData, erection_percentage: parseFloat(e.target.value) || 0})}
                                        placeholder="0.0"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">Erection Work</div>
                                </div>
                                
                                {/* PBG Percentage */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">PBG % *</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={projectData.pbg_percentage}
                                        onChange={(e) => setProjectData({...projectData, pbg_percentage: parseFloat(e.target.value) || 0})}
                                        placeholder="0.0"
                                    />
                                    <div className="text-xs text-gray-500 mt-1">Performance Bank Guarantee</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!projectData.project_name || !projectData.purchase_order_number || !projectData.architect_name || !projectData.architect_address || !projectData.client_name || !projectData.client_address}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                Next: Company Selection
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Company Selection - ENHANCED WITH DETAILED INFO */}
                {step === 2 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">🏢 Company Details & Configuration</h3>
                        
                        {/* Company Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Profile *</label>
                            <select
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={projectData.company_profile_id}
                                onChange={(e) => handleCompanyProfileChange(e.target.value)}
                            >
                                <option value="">Select Company Profile</option>
                                {companyProfiles.map(profile => (
                                    <option key={profile.id} value={profile.id}>{profile.company_name}</option>
                                ))}
                            </select>
                        </div>

                        {selectedProfile && (
                            <>
                                {/* Company Information Display */}
                                <div className="bg-gray-50 p-4 rounded-lg border">
                                    <h4 className="font-semibold text-gray-900 mb-3">📋 Company Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        
                                        {/* Company Name - Editable */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={selectedProfile.company_name || ''}
                                                onChange={(e) => {
                                                    const updatedProfile = {...selectedProfile, company_name: e.target.value};
                                                    setSelectedProfile(updatedProfile);
                                                }}
                                            />
                                        </div>

                                        {/* GST Number - Editable */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={selectedProfile.gst_number || ''}
                                                onChange={(e) => {
                                                    const updatedProfile = {...selectedProfile, gst_number: e.target.value};
                                                    setSelectedProfile(updatedProfile);
                                                }}
                                                placeholder="Enter GST number"
                                            />
                                        </div>

                                        {/* PAN Number - Editable */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={selectedProfile.pan_number || ''}
                                                onChange={(e) => {
                                                    const updatedProfile = {...selectedProfile, pan_number: e.target.value};
                                                    setSelectedProfile(updatedProfile);
                                                }}
                                                placeholder="Enter PAN number"
                                            />
                                        </div>

                                        {/* Email - Editable */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={selectedProfile.email || ''}
                                                onChange={(e) => {
                                                    const updatedProfile = {...selectedProfile, email: e.target.value};
                                                    setSelectedProfile(updatedProfile);
                                                }}
                                                placeholder="Enter email address"
                                            />
                                        </div>
                                    </div>

                                    {/* Company Address - Full Width & Editable */}
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                                        <textarea
                                            rows="2"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={selectedProfile.address || ''}
                                            onChange={(e) => {
                                                const updatedProfile = {...selectedProfile, address: e.target.value};
                                                setSelectedProfile(updatedProfile);
                                            }}
                                            placeholder="Enter company address"
                                        />
                                    </div>
                                </div>

                                {/* Location Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">📍 Location</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={projectData.selected_location_id}
                                        onChange={(e) => setProjectData({...projectData, selected_location_id: e.target.value})}
                                    >
                                        <option value="">Select Location</option>
                                        {selectedProfile.locations?.map(location => (
                                            <option key={location.id} value={location.id}>
                                                {location.location_name} - {location.city}
                                                {location.is_default ? ' (Default)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Bank Account Details */}
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <h4 className="font-semibold text-gray-900 mb-3">🏦 Bank Account Details</h4>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account *</label>
                                        <select
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={projectData.selected_bank_id}
                                            onChange={(e) => setProjectData({...projectData, selected_bank_id: e.target.value})}
                                        >
                                            <option value="">Select Bank Account</option>
                                            {selectedProfile.bank_details?.map(bank => (
                                                <option key={bank.id} value={bank.id}>
                                                    {bank.bank_name} - ****{bank.account_number?.slice(-4)}
                                                    {bank.is_default ? ' (Default)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Show selected bank details */}
                                    {projectData.selected_bank_id && selectedProfile.bank_details && (
                                        <div className="mt-4 p-3 bg-white rounded border">
                                            {(() => {
                                                const selectedBank = selectedProfile.bank_details.find(b => b.id === projectData.selected_bank_id);
                                                return selectedBank ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                                        <div><strong>Bank:</strong> {selectedBank.bank_name}</div>
                                                        <div><strong>Account No:</strong> {selectedBank.account_number}</div>
                                                        <div><strong>IFSC:</strong> {selectedBank.ifsc_code}</div>
                                                        <div><strong>Branch:</strong> {selectedBank.branch}</div>
                                                        {selectedBank.swift_code && <div><strong>SWIFT:</strong> {selectedBank.swift_code}</div>}
                                                    </div>
                                                ) : null;
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!projectData.company_profile_id || !projectData.selected_bank_id}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                            >
                                Next: Review BOQ
                            </button>
                        </div>
                    </div>
                )}





                {/* Step 3: Review BOQ & Create Project */}
                {step === 3 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">📋 Review BOQ Items & Create Project</h3>

                        {/* BOQ Items Display */}
                        {boqItems && boqItems.length > 0 ? (
                            <>
                                {/* BOQ Summary */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h4 className="font-medium text-green-900 mb-3">✅ BOQ Successfully Parsed</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-800">{boqItems.length}</div>
                                            <div className="text-sm text-green-600">Total Items</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                ₹{boqItems.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-sm text-gray-600">Total Amount</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-orange-600">
                                                {boqItems.reduce((sum, item) => sum + (item.quantity || 0), 0).toFixed(2)}
                                            </div>
                                            <div className="text-sm text-gray-600">Total Quantity</div>
                                        </div>
                                    </div>
                                </div>

                                {/* BOQ Items Table */}
                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                    <h4 className="font-medium text-gray-900 p-4 bg-gray-50 border-b">BOQ Items Preview</h4>
                                    <div className="overflow-x-auto max-h-96">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sr. No</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unit</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {boqItems.slice(0, 10).map((item, index) => (
                                                    <tr key={item.id || index} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-sm text-gray-900">{item.sr_no || index + 1}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs">
                                                            {item.description || 'Unknown Item'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 text-center">
                                                            {item.unit || 'Nos'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 text-center font-medium">
                                                            {item.quantity || 0}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                            ₹{(item.rate || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                                            ₹{(item.amount || 0).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {boqItems.length > 10 && (
                                            <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600 text-center">
                                                ... and {boqItems.length - 10} more items
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h4 className="font-medium text-yellow-900">⚠️ No BOQ Items Found</h4>
                                <p className="text-yellow-700 text-sm mt-1">
                                    No BOQ items were parsed from the uploaded file. Please check the file format and try again.
                                </p>
                            </div>
                        )}

                        {/* Project Summary */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-medium text-blue-900 mb-3">🏗️ Project Summary</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div><strong>Project Name:</strong> {projectData.project_name}</div>
                                <div><strong>Purchase Order:</strong> {projectData.purchase_order_number}</div>
                                <div><strong>Architect:</strong> {projectData.architect_name}</div>
                                <div><strong>Client:</strong> {projectData.client_name}</div>
                                <div><strong>Company:</strong> {selectedProfile?.company_name}</div>
                                <div><strong>ABG %:</strong> {projectData.abg_percentage}%</div>
                                <div><strong>RA Bill %:</strong> {projectData.ra_percentage}%</div>
                                <div><strong>Erection %:</strong> {projectData.erection_percentage}%</div>
                                <div><strong>PBG %:</strong> {projectData.pbg_percentage}%</div>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(2)}
                                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Previous: Company Selection
                            </button>
                            
                            <button
                                onClick={createProject}
                                disabled={loading || !boqItems || boqItems.length === 0}
                                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                            >
                                {loading ? 'Creating Project...' : '🎉 Create Project'}
                            </button>
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

export default EnhancedProjectCreation;