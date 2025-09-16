import React, { useState, useEffect } from 'react';

const InvoiceDesignCustomizer = ({ currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('branding');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');
    
    const [designConfig, setDesignConfig] = useState({
        // 🏢 Company Branding
        company_logo_url: '',
        company_name: 'Your Company Name',
        company_address: '',
        company_phone: '',
        company_email: '',
        company_website: '',
        company_gst_number: '',
        
        // 🎨 Colors & Styling
        primary_color: '#127285',
        secondary_color: '#0891b2', 
        header_bg_color: '#f8fafc',
        text_color: '#1f2937',
        accent_color: '#059669',
        table_border_color: '#d1d5db',
        table_header_bg: '#f3f4f6',
        table_alternate_row: '#f9fafb',
        
        // 📝 Typography
        font_family: 'Inter',
        invoice_title_size: '28px',
        company_name_size: '24px',
        header_text_size: '16px',
        body_text_size: '14px',
        small_text_size: '12px',
        table_text_size: '13px',
        
        // 📐 Layout & Spacing
        page_margin_top: '25px',
        page_margin_bottom: '25px', 
        page_margin_left: '20px',
        page_margin_right: '20px',
        section_spacing: '20px',
        logo_width: '150px',
        logo_height: '75px',
        
        // 📋 Invoice Header
        invoice_title: 'INVOICE',
        show_invoice_number: true,
        show_invoice_date: true,
        show_due_date: true,
        show_po_number: true,
        date_format: 'DD/MM/YYYY',
        invoice_number_prefix: 'INV-',
        
        // 👥 Client Information
        client_label: 'Bill To:',
        show_client_address: true,
        show_client_gst: true,
        show_client_phone: true,
        client_info_alignment: 'left',
        
        // 📊 Table Configuration
        show_serial_number: true,
        show_hsn_code: true,
        show_unit_column: true,
        show_rate_column: true,
        show_amount_column: true,
        show_gst_rate_column: true,
        show_gst_amount_column: true,
        table_header_style: 'bold',
        
        // 💰 Totals Section
        show_subtotal: true,
        show_cgst_sgst_separate: true,
        show_igst: true,
        show_total_gst: true,
        show_round_off: true,
        currency_symbol: '₹',
        currency_position: 'before',
        
        // 📝 Terms & Conditions
        show_terms: true,
        terms_title: 'Terms & Conditions:',
        default_terms: '1. Payment due within 30 days\n2. Interest @24% p.a. will be charged on delayed payments\n3. All disputes subject to local jurisdiction',
        
        // 💳 Payment Information
        show_payment_details: true,
        payment_title: 'Payment Details:',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: '',
        
        // ✍️ Signatures
        show_signature_section: true,
        signature_title: 'For [Company Name]',
        signature_space_height: '80px',
        show_company_seal: true,
        
        // 📄 Footer
        footer_text: 'Thank you for your business!',
        show_page_numbers: true,
        footer_alignment: 'center',
        
        // 🔒 Security Features  
        show_watermark: false,
        watermark_text: 'ORIGINAL',
        watermark_opacity: '0.1',
        
        // 📱 Contact Layout
        header_layout: 'logo_left_contact_right',
        contact_alignment: 'right',
        
        // 🎯 Additional Features
        show_tax_summary: true,
        show_amount_in_words: true,
        show_hsn_summary: true,
        invoice_notes: '',
        custom_fields: []
    });
    
    const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_REACT_APP_BACKEND_URL;

    useEffect(() => {
        fetchCurrentDesignConfig();
    }, []);

    const fetchCurrentDesignConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/admin/invoice-design-config`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.design_config) {
                    setDesignConfig({...designConfig, ...data.design_config});
                }
            }
        } catch (err) {
            console.error('Error fetching design config:', err);
        }
    };

    const saveDesignConfig = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/admin/invoice-design-config`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ design_config: designConfig })
            });

            if (response.ok) {
                setSuccess('✅ Invoice design configuration saved successfully! All new invoices will use this design.');
                setTimeout(() => setSuccess(''), 5000);
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'Failed to save design configuration');
            }
        } catch (err) {
            setError('Network error saving design configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select a valid image file (PNG, JPG, GIF, etc.)');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Logo file size must be less than 5MB');
            return;
        }

        setLogoFile(file);
        
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setLogoPreview(previewUrl);
        
        // Upload the file
        setLoading(true);
        setError('');
        
        try {
            const formData = new FormData();
            formData.append('logo', file);
            
            const token = localStorage.getItem('token');
            const response = await fetch(`${backendUrl}/api/admin/upload-logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setDesignConfig({...designConfig, company_logo_url: data.logo_url});
                setSuccess('✅ Logo uploaded successfully!');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'Failed to upload logo');
            }
        } catch (err) {
            setError('Network error uploading logo');
        } finally {
            setLoading(false);
        }
    };

    const removeLogo = () => {
        setLogoFile(null);
        setLogoPreview('');
        setDesignConfig({...designConfig, company_logo_url: ''});
        
        // Clear the file input
        const fileInput = document.getElementById('logo-upload');
        if (fileInput) fileInput.value = '';
    };

    const addCustomField = () => {
        const newField = {
            id: Date.now(),
            label: 'Custom Field',
            value: '',
            position: 'header'
        };
        setDesignConfig({
            ...designConfig,
            custom_fields: [...designConfig.custom_fields, newField]
        });
    };

    const removeCustomField = (id) => {
        setDesignConfig({
            ...designConfig,
            custom_fields: designConfig.custom_fields.filter(field => field.id !== id)
        });
    };

    const tabs = [
        { id: 'branding', label: '🏢 Branding', icon: '🏢' },
        { id: 'colors', label: '🎨 Colors', icon: '🎨' },
        { id: 'typography', label: '📝 Typography', icon: '📝' },
        { id: 'layout', label: '📐 Layout', icon: '📐' },
        { id: 'content', label: '📋 Content', icon: '📋' },
        { id: 'payment', label: '💳 Payment', icon: '💳' },
        { id: 'advanced', label: '⚙️ Advanced', icon: '⚙️' }
    ];

    if (!currentUser || currentUser.role !== 'super_admin') {
        return (
            <div className="p-8 text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
                    <p className="text-red-600">Only super administrators can customize invoice designs.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">🎨 Professional Invoice Designer</h1>
                <p className="text-gray-600">Design professional invoices that reflect your brand identity</p>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                    <button onClick={() => setError('')} className="text-sm text-red-600 hover:text-red-800 mt-1">Dismiss</button>
                </div>
            )}

            {success && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">{success}</p>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-1 p-4">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-blue-100 text-blue-700 border-blue-300'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* BRANDING TAB */}
                    {activeTab === 'branding' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">🏢 Company Branding</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
                                        <div className="space-y-3">
                                            <input
                                                id="logo-upload"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            {(logoPreview || designConfig.company_logo_url) && (
                                                <div className="relative inline-block">
                                                    <img
                                                        src={logoPreview || designConfig.company_logo_url}
                                                        alt="Logo Preview"
                                                        className="h-16 w-auto border border-gray-200 rounded"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={removeLogo}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                                        title="Remove logo"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500">
                                                Upload PNG, JPG, or GIF. Max size: 5MB. Recommended: 300x150px
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                                        <input
                                            type="text"
                                            value={designConfig.company_name}
                                            onChange={(e) => setDesignConfig({...designConfig, company_name: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="Your Company Name"
                                        />
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Address</label>
                                        <textarea
                                            value={designConfig.company_address}
                                            onChange={(e) => setDesignConfig({...designConfig, company_address: e.target.value})}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="Complete company address"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                                        <input
                                            type="text"
                                            value={designConfig.company_phone}
                                            onChange={(e) => setDesignConfig({...designConfig, company_phone: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="+91 9999999999"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                        <input
                                            type="email"
                                            value={designConfig.company_email}
                                            onChange={(e) => setDesignConfig({...designConfig, company_email: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="info@company.com"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                                        <input
                                            type="url"
                                            value={designConfig.company_website}
                                            onChange={(e) => setDesignConfig({...designConfig, company_website: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="www.company.com"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
                                        <input
                                            type="text"
                                            value={designConfig.company_gst_number}
                                            onChange={(e) => setDesignConfig({...designConfig, company_gst_number: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="29ABCDE1234F1Z5"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* COLORS TAB */}
                    {activeTab === 'colors' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">🎨 Color Scheme</h3>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {[
                                        { key: 'primary_color', label: 'Primary Color', desc: 'Main brand color' },
                                        { key: 'secondary_color', label: 'Secondary Color', desc: 'Accent color' },
                                        { key: 'header_bg_color', label: 'Header Background', desc: 'Header section background' },
                                        { key: 'text_color', label: 'Text Color', desc: 'Main text color' },
                                        { key: 'accent_color', label: 'Accent Color', desc: 'Highlights and links' },
                                        { key: 'table_border_color', label: 'Table Borders', desc: 'Table line colors' },
                                        { key: 'table_header_bg', label: 'Table Header', desc: 'Table header background' },
                                        { key: 'table_alternate_row', label: 'Alternate Rows', desc: 'Even row background' }
                                    ].map((color) => (
                                        <div key={color.key} className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">{color.label}</label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="color"
                                                    value={designConfig[color.key]}
                                                    onChange={(e) => setDesignConfig({...designConfig, [color.key]: e.target.value})}
                                                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={designConfig[color.key]}
                                                    onChange={(e) => setDesignConfig({...designConfig, [color.key]: e.target.value})}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500">{color.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TYPOGRAPHY TAB */}
                    {activeTab === 'typography' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Typography Settings</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                                        <select
                                            value={designConfig.font_family}
                                            onChange={(e) => setDesignConfig({...designConfig, font_family: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Inter">Inter (Modern)</option>
                                            <option value="Arial">Arial (Classic)</option>
                                            <option value="Helvetica">Helvetica (Professional)</option>
                                            <option value="Times New Roman">Times New Roman (Traditional)</option>
                                            <option value="Georgia">Georgia (Elegant)</option>
                                            <option value="Roboto">Roboto (Clean)</option>
                                            <option value="Open Sans">Open Sans (Friendly)</option>
                                            <option value="Lato">Lato (Humanist)</option>
                                        </select>
                                    </div>
                                    
                                    {[
                                        { key: 'invoice_title_size', label: 'Invoice Title Size', default: '28px' },
                                        { key: 'company_name_size', label: 'Company Name Size', default: '24px' },
                                        { key: 'header_text_size', label: 'Header Text Size', default: '16px' },
                                        { key: 'body_text_size', label: 'Body Text Size', default: '14px' },
                                        { key: 'small_text_size', label: 'Small Text Size', default: '12px' },
                                        { key: 'table_text_size', label: 'Table Text Size', default: '13px' }
                                    ].map((font) => (
                                        <div key={font.key}>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">{font.label}</label>
                                            <input
                                                type="text"
                                                value={designConfig[font.key]}
                                                onChange={(e) => setDesignConfig({...designConfig, [font.key]: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                placeholder={font.default}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LAYOUT TAB */}
                    {activeTab === 'layout' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">📐 Layout & Spacing</h3>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { key: 'page_margin_top', label: 'Top Margin' },
                                        { key: 'page_margin_bottom', label: 'Bottom Margin' },
                                        { key: 'page_margin_left', label: 'Left Margin' },
                                        { key: 'page_margin_right', label: 'Right Margin' },
                                        { key: 'section_spacing', label: 'Section Spacing' },
                                        { key: 'logo_width', label: 'Logo Width' },
                                        { key: 'logo_height', label: 'Logo Height' },
                                        { key: 'signature_space_height', label: 'Signature Space' }
                                    ].map((layout) => (
                                        <div key={layout.key}>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">{layout.label}</label>
                                            <input
                                                type="text"
                                                value={designConfig[layout.key]}
                                                onChange={(e) => setDesignConfig({...designConfig, [layout.key]: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                placeholder="20px"
                                            />
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Header Layout</label>
                                    <select
                                        value={designConfig.header_layout}
                                        onChange={(e) => setDesignConfig({...designConfig, header_layout: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="logo_left_contact_right">Logo Left, Contact Right</option>
                                        <option value="logo_center_contact_below">Logo Center, Contact Below</option>
                                        <option value="logo_right_contact_left">Logo Right, Contact Left</option>
                                        <option value="stacked_center">Everything Centered</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONTENT TAB */}
                    {activeTab === 'content' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Invoice Content</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Title</label>
                                        <input
                                            type="text"
                                            value={designConfig.invoice_title}
                                            onChange={(e) => setDesignConfig({...designConfig, invoice_title: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="INVOICE"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number Prefix</label>
                                        <input
                                            type="text"
                                            value={designConfig.invoice_number_prefix}
                                            onChange={(e) => setDesignConfig({...designConfig, invoice_number_prefix: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="INV-"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Client Label</label>
                                        <input
                                            type="text"
                                            value={designConfig.client_label}
                                            onChange={(e) => setDesignConfig({...designConfig, client_label: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="Bill To:"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                                        <select
                                            value={designConfig.date_format}
                                            onChange={(e) => setDesignConfig({...designConfig, date_format: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                            <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="mt-6">
                                    <h4 className="text-md font-medium text-gray-900 mb-3">Show/Hide Fields</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { key: 'show_invoice_number', label: 'Invoice Number' },
                                            { key: 'show_invoice_date', label: 'Invoice Date' },
                                            { key: 'show_due_date', label: 'Due Date' },
                                            { key: 'show_po_number', label: 'PO Number' },
                                            { key: 'show_serial_number', label: 'Serial Numbers' },
                                            { key: 'show_hsn_code', label: 'HSN Code' },
                                            { key: 'show_subtotal', label: 'Subtotal' },
                                            { key: 'show_round_off', label: 'Round Off' }
                                        ].map((field) => (
                                            <label key={field.key} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={designConfig[field.key]}
                                                    onChange={(e) => setDesignConfig({...designConfig, [field.key]: e.target.checked})}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{field.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PAYMENT TAB */}
                    {activeTab === 'payment' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">💳 Payment Information</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                                        <input
                                            type="text"
                                            value={designConfig.bank_name}
                                            onChange={(e) => setDesignConfig({...designConfig, bank_name: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="State Bank of India"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                                        <input
                                            type="text"
                                            value={designConfig.account_number}
                                            onChange={(e) => setDesignConfig({...designConfig, account_number: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="1234567890"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                                        <input
                                            type="text"
                                            value={designConfig.ifsc_code}
                                            onChange={(e) => setDesignConfig({...designConfig, ifsc_code: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="SBIN0001234"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                                        <input
                                            type="text"
                                            value={designConfig.branch_name}
                                            onChange={(e) => setDesignConfig({...designConfig, branch_name: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="Main Branch"
                                        />
                                    </div>
                                </div>
                                
                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
                                    <textarea
                                        value={designConfig.default_terms}
                                        onChange={(e) => setDesignConfig({...designConfig, default_terms: e.target.value})}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter terms and conditions"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ADVANCED TAB */}
                    {activeTab === 'advanced' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Advanced Settings</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency Symbol</label>
                                        <input
                                            type="text"
                                            value={designConfig.currency_symbol}
                                            onChange={(e) => setDesignConfig({...designConfig, currency_symbol: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="₹"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Currency Position</label>
                                        <select
                                            value={designConfig.currency_position}
                                            onChange={(e) => setDesignConfig({...designConfig, currency_position: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="before">Before Amount (₹1000)</option>
                                            <option value="after">After Amount (1000₹)</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Watermark Text</label>
                                        <input
                                            type="text"
                                            value={designConfig.watermark_text}
                                            onChange={(e) => setDesignConfig({...designConfig, watermark_text: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="ORIGINAL"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Footer Text</label>
                                        <input
                                            type="text"
                                            value={designConfig.footer_text}
                                            onChange={(e) => setDesignConfig({...designConfig, footer_text: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                            placeholder="Thank you for your business!"
                                        />
                                    </div>
                                </div>
                                
                                <div className="mt-6">
                                    <h4 className="text-md font-medium text-gray-900 mb-3">Additional Features</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {[
                                            { key: 'show_watermark', label: 'Show Watermark' },
                                            { key: 'show_amount_in_words', label: 'Amount in Words' },
                                            { key: 'show_tax_summary', label: 'Tax Summary' },
                                            { key: 'show_hsn_summary', label: 'HSN Summary' },
                                            { key: 'show_signature_section', label: 'Signature Section' },
                                            { key: 'show_company_seal', label: 'Company Seal' }
                                        ].map((field) => (
                                            <label key={field.key} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={designConfig[field.key]}
                                                    onChange={(e) => setDesignConfig({...designConfig, [field.key]: e.target.checked})}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm text-gray-700">{field.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="mt-6">
                                    <h4 className="text-md font-medium text-gray-900 mb-3">Custom Fields</h4>
                                    {designConfig.custom_fields.map((field, index) => (
                                        <div key={field.id} className="flex items-center space-x-2 mb-2">
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={(e) => {
                                                    const updatedFields = [...designConfig.custom_fields];
                                                    updatedFields[index].label = e.target.value;
                                                    setDesignConfig({...designConfig, custom_fields: updatedFields});
                                                }}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                placeholder="Field Label"
                                            />
                                            <select
                                                value={field.position}
                                                onChange={(e) => {
                                                    const updatedFields = [...designConfig.custom_fields];
                                                    updatedFields[index].position = e.target.value;
                                                    setDesignConfig({...designConfig, custom_fields: updatedFields});
                                                }}
                                                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            >
                                                <option value="header">Header</option>
                                                <option value="footer">Footer</option>
                                            </select>
                                            <button
                                                onClick={() => removeCustomField(field.id)}
                                                className="px-2 py-2 text-red-600 hover:text-red-800"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={addCustomField}
                                        className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                                    >
                                        + Add Custom Field
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Live Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">👀 Live Preview</h3>
                
                {/* Invoice Preview */}
                <div 
                    className="border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm max-w-4xl mx-auto"
                    style={{
                        fontFamily: designConfig.font_family,
                        color: designConfig.text_color,
                        fontSize: designConfig.body_text_size,
                        margin: `${designConfig.page_margin_top} ${designConfig.page_margin_right} ${designConfig.page_margin_bottom} ${designConfig.page_margin_left}`
                    }}
                >
                    {/* Header */}
                    <div className={`mb-6 ${designConfig.header_layout.includes('center') ? 'text-center' : 'flex justify-between items-start'}`}
                         style={{ backgroundColor: designConfig.header_bg_color, padding: '20px', marginLeft: '-24px', marginRight: '-24px', marginTop: '-24px' }}>
                        
                        <div className={designConfig.header_layout === 'logo_right_contact_left' ? 'order-2' : ''}>
                            {designConfig.company_logo_url && (
                                <img 
                                    src={designConfig.company_logo_url} 
                                    alt="Company Logo" 
                                    style={{
                                        width: designConfig.logo_width,
                                        height: designConfig.logo_height,
                                        objectFit: 'contain',
                                        marginBottom: '10px'
                                    }}
                                />
                            )}
                            <h1 
                                style={{
                                    color: designConfig.primary_color,
                                    fontSize: designConfig.company_name_size,
                                    margin: '0 0 5px 0'
                                }}
                                className="font-bold"
                            >
                                {designConfig.company_name}
                            </h1>
                        </div>

                        <div className={`${designConfig.contact_alignment === 'right' ? 'text-right' : ''} ${designConfig.header_layout === 'logo_right_contact_left' ? 'order-1' : ''}`}
                             style={{ fontSize: designConfig.small_text_size }}>
                            <div style={{ whiteSpace: 'pre-line' }}>{designConfig.company_address}</div>
                            {designConfig.company_phone && <div>📞 {designConfig.company_phone}</div>}
                            {designConfig.company_email && <div>✉️ {designConfig.company_email}</div>}
                            {designConfig.company_website && <div>🌐 {designConfig.company_website}</div>}
                            {designConfig.company_gst_number && <div><strong>GST:</strong> {designConfig.company_gst_number}</div>}
                        </div>
                    </div>

                    {/* Invoice Title */}
                    <div className="text-center mb-6">
                        <h1 
                            style={{
                                color: designConfig.primary_color,
                                fontSize: designConfig.invoice_title_size
                            }}
                            className="font-bold"
                        >
                            {designConfig.invoice_title}
                        </h1>
                    </div>

                    {/* Invoice Details & Client Info */}
                    <div className="grid grid-cols-2 gap-6 mb-6" style={{ fontSize: designConfig.small_text_size }}>
                        <div>
                            <h3 className="font-bold mb-2" style={{ color: designConfig.secondary_color }}>Invoice Details</h3>
                            {designConfig.show_invoice_number && <div><strong>Invoice No:</strong> {designConfig.invoice_number_prefix}000123</div>}
                            {designConfig.show_invoice_date && <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>}
                            {designConfig.show_due_date && <div><strong>Due Date:</strong> {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</div>}
                            {designConfig.show_po_number && <div><strong>PO Number:</strong> PO-2024-001</div>}
                        </div>
                        
                        <div>
                            <h3 className="font-bold mb-2" style={{ color: designConfig.secondary_color }}>{designConfig.client_label}</h3>
                            <div><strong>Sample Client Ltd</strong></div>
                            {designConfig.show_client_address && <div>123 Client Street<br/>City, State 400001</div>}
                            {designConfig.show_client_gst && <div><strong>GST:</strong> 27ABCDE1234F1Z5</div>}
                            {designConfig.show_client_phone && <div>📞 +91 98765 43210</div>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <table className="w-full mb-6" 
                           style={{ 
                               borderColor: designConfig.table_border_color,
                               fontSize: designConfig.table_text_size,
                               borderCollapse: 'collapse',
                               border: `1px solid ${designConfig.table_border_color}`
                           }}>
                        <thead style={{ backgroundColor: designConfig.table_header_bg }}>
                            <tr>
                                {designConfig.show_serial_number && <th className="text-left p-3 border" style={{ borderColor: designConfig.table_border_color }}>Sr.</th>}
                                <th className="text-left p-3 border" style={{ borderColor: designConfig.table_border_color }}>Description</th>
                                {designConfig.show_hsn_code && <th className="text-center p-3 border" style={{ borderColor: designConfig.table_border_color }}>HSN</th>}
                                {designConfig.show_unit_column && <th className="text-center p-3 border" style={{ borderColor: designConfig.table_border_color }}>Unit</th>}
                                <th className="text-center p-3 border" style={{ borderColor: designConfig.table_border_color }}>Qty</th>
                                {designConfig.show_rate_column && <th className="text-right p-3 border" style={{ borderColor: designConfig.table_border_color }}>Rate</th>}
                                {designConfig.show_amount_column && <th className="text-right p-3 border" style={{ borderColor: designConfig.table_border_color }}>Amount</th>}
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ backgroundColor: designConfig.table_alternate_row }}>
                                {designConfig.show_serial_number && <td className="p-3 border" style={{ borderColor: designConfig.table_border_color }}>1</td>}
                                <td className="p-3 border" style={{ borderColor: designConfig.table_border_color }}>Foundation Work - Sample Item</td>
                                {designConfig.show_hsn_code && <td className="text-center p-3 border" style={{ borderColor: designConfig.table_border_color }}>9954</td>}
                                {designConfig.show_unit_column && <td className="text-center p-3 border" style={{ borderColor: designConfig.table_border_color }}>Cum</td>}
                                <td className="text-center p-3 border" style={{ borderColor: designConfig.table_border_color }}>50.00</td>
                                {designConfig.show_rate_column && <td className="text-right p-3 border" style={{ borderColor: designConfig.table_border_color }}>{designConfig.currency_position === 'before' ? `${designConfig.currency_symbol}2,500.00` : `2,500.00${designConfig.currency_symbol}`}</td>}
                                {designConfig.show_amount_column && <td className="text-right p-3 border" style={{ borderColor: designConfig.table_border_color }}>{designConfig.currency_position === 'before' ? `${designConfig.currency_symbol}1,25,000.00` : `1,25,000.00${designConfig.currency_symbol}`}</td>}
                            </tr>
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end mb-6">
                        <div className="w-64 space-y-2" style={{ fontSize: designConfig.body_text_size }}>
                            {designConfig.show_subtotal && (
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span className="font-medium">{designConfig.currency_position === 'before' ? `${designConfig.currency_symbol}1,25,000.00` : `1,25,000.00${designConfig.currency_symbol}`}</span>
                                </div>
                            )}
                            {designConfig.show_cgst_sgst_separate && (
                                <>
                                    <div className="flex justify-between">
                                        <span>CGST (9%):</span>
                                        <span className="font-medium">{designConfig.currency_position === 'before' ? `${designConfig.currency_symbol}11,250.00` : `11,250.00${designConfig.currency_symbol}`}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>SGST (9%):</span>
                                        <span className="font-medium">{designConfig.currency_position === 'before' ? `${designConfig.currency_symbol}11,250.00` : `11,250.00${designConfig.currency_symbol}`}</span>
                                    </div>
                                </>
                            )}
                            <div className="border-t pt-2" style={{ borderColor: designConfig.table_border_color }}>
                                <div className="flex justify-between font-bold" style={{ color: designConfig.primary_color }}>
                                    <span>Total:</span>
                                    <span>{designConfig.currency_position === 'before' ? `${designConfig.currency_symbol}1,47,500.00` : `1,47,500.00${designConfig.currency_symbol}`}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Amount in Words */}
                    {designConfig.show_amount_in_words && (
                        <div className="mb-6 p-3 border rounded" style={{ borderColor: designConfig.table_border_color, backgroundColor: designConfig.header_bg_color }}>
                            <strong>Amount in Words:</strong> One Lakh Forty Seven Thousand Five Hundred Only
                        </div>
                    )}

                    {/* Terms & Payment Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" style={{ fontSize: designConfig.small_text_size }}>
                        {designConfig.show_terms && (
                            <div>
                                <h4 className="font-bold mb-2" style={{ color: designConfig.secondary_color }}>{designConfig.terms_title}</h4>
                                <div style={{ whiteSpace: 'pre-line' }}>{designConfig.default_terms}</div>
                            </div>
                        )}
                        
                        {designConfig.show_payment_details && (designConfig.bank_name || designConfig.account_number) && (
                            <div>
                                <h4 className="font-bold mb-2" style={{ color: designConfig.secondary_color }}>{designConfig.payment_title}</h4>
                                {designConfig.bank_name && <div><strong>Bank:</strong> {designConfig.bank_name}</div>}
                                {designConfig.account_number && <div><strong>A/c No:</strong> {designConfig.account_number}</div>}
                                {designConfig.ifsc_code && <div><strong>IFSC:</strong> {designConfig.ifsc_code}</div>}
                                {designConfig.branch_name && <div><strong>Branch:</strong> {designConfig.branch_name}</div>}
                            </div>
                        )}
                    </div>

                    {/* Signature */}
                    {designConfig.show_signature_section && (
                        <div className="flex justify-end">
                            <div className="text-center" style={{ minHeight: designConfig.signature_space_height }}>
                                <div className="border-t border-gray-400 pt-2 mt-12 w-48">
                                    <div className="font-medium">{designConfig.signature_title.replace('[Company Name]', designConfig.company_name)}</div>
                                    <div className="text-xs text-gray-600">Authorized Signatory</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className={`mt-6 text-center ${designConfig.footer_alignment === 'left' ? 'text-left' : designConfig.footer_alignment === 'right' ? 'text-right' : 'text-center'}`}
                         style={{ color: designConfig.accent_color, fontSize: designConfig.small_text_size }}>
                        {designConfig.footer_text}
                        {designConfig.show_page_numbers && <div className="mt-2 text-xs text-gray-500">Page 1 of 1</div>}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <div className="flex space-x-3">
                    <button
                        onClick={() => {
                            setDesignConfig({
                                company_logo_url: '', company_name: 'Your Company Name', company_address: '', company_phone: '', company_email: '', company_website: '', company_gst_number: '',
                                primary_color: '#127285', secondary_color: '#0891b2', header_bg_color: '#f8fafc', text_color: '#1f2937', accent_color: '#059669',
                                table_border_color: '#d1d5db', table_header_bg: '#f3f4f6', table_alternate_row: '#f9fafb',
                                font_family: 'Inter', invoice_title_size: '28px', company_name_size: '24px', header_text_size: '16px', body_text_size: '14px', small_text_size: '12px', table_text_size: '13px',
                                page_margin_top: '25px', page_margin_bottom: '25px', page_margin_left: '20px', page_margin_right: '20px', section_spacing: '20px', logo_width: '150px', logo_height: '75px',
                                invoice_title: 'INVOICE', show_invoice_number: true, show_invoice_date: true, show_due_date: true, show_po_number: true, date_format: 'DD/MM/YYYY', invoice_number_prefix: 'INV-',
                                client_label: 'Bill To:', show_client_address: true, show_client_gst: true, show_client_phone: true, client_info_alignment: 'left',
                                show_serial_number: true, show_hsn_code: true, show_unit_column: true, show_rate_column: true, show_amount_column: true, show_gst_rate_column: true, show_gst_amount_column: true, table_header_style: 'bold',
                                show_subtotal: true, show_cgst_sgst_separate: true, show_igst: true, show_total_gst: true, show_round_off: true, currency_symbol: '₹', currency_position: 'before',
                                show_terms: true, terms_title: 'Terms & Conditions:', default_terms: '1. Payment due within 30 days\n2. Interest @24% p.a. will be charged on delayed payments\n3. All disputes subject to local jurisdiction',
                                show_payment_details: true, payment_title: 'Payment Details:', bank_name: '', account_number: '', ifsc_code: '', branch_name: '',
                                show_signature_section: true, signature_title: 'For [Company Name]', signature_space_height: '80px', show_company_seal: true,
                                footer_text: 'Thank you for your business!', show_page_numbers: true, footer_alignment: 'center',
                                show_watermark: false, watermark_text: 'ORIGINAL', watermark_opacity: '0.1',
                                header_layout: 'logo_left_contact_right', contact_alignment: 'right',
                                show_tax_summary: true, show_amount_in_words: true, show_hsn_summary: true, invoice_notes: '', custom_fields: []
                            });
                        }}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        🔄 Reset to Defaults
                    </button>
                    
                    <button
                        onClick={fetchCurrentDesignConfig}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        📥 Reload Saved
                    </button>
                </div>
                
                <button
                    onClick={saveDesignConfig}
                    disabled={loading}
                    className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                >
                    {loading ? '⏳ Saving Design...' : '💾 Save Invoice Design'}
                </button>
            </div>
        </div>
    );
};

export default InvoiceDesignCustomizer;