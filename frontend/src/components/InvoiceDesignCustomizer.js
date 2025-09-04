import React, { useState, useEffect } from 'react';

const InvoiceDesignCustomizer = ({ currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [designConfig, setDesignConfig] = useState({
        // Colors
        primary_color: '#127285',
        secondary_color: '#0891b2',
        text_color: '#1f2937',
        accent_color: '#059669',
        
        // Typography
        font_family: 'Inter',
        header_font_size: '24px',
        body_font_size: '14px',
        small_font_size: '12px',
        
        // Layout
        margin_top: '20px',
        margin_bottom: '20px',
        margin_left: '15px',
        margin_right: '15px',
        
        // Logo & Header
        company_logo_url: '',
        logo_width: '120px',
        logo_height: '60px',
        header_alignment: 'left',
        
        // Invoice Styling
        table_border_color: '#d1d5db',
        table_header_bg: '#f3f4f6',
        invoice_title_alignment: 'center',
        
        // Footer
        footer_text: 'Thank you for your business!',
        footer_alignment: 'center',
        
        // Signatures
        signature_space_height: '60px',
        signature_alignment: 'right'
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
                    setDesignConfig(data.design_config);
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
                setSuccess('✅ Invoice design configuration saved successfully!');
                setTimeout(() => setSuccess(''), 3000);
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

    const resetToDefaults = () => {
        setDesignConfig({
            primary_color: '#127285',
            secondary_color: '#0891b2',
            text_color: '#1f2937',
            accent_color: '#059669',
            font_family: 'Inter',
            header_font_size: '24px',
            body_font_size: '14px',
            small_font_size: '12px',
            margin_top: '20px',
            margin_bottom: '20px',
            margin_left: '15px',
            margin_right: '15px',
            company_logo_url: '',
            logo_width: '120px',
            logo_height: '60px',
            header_alignment: 'left',
            table_border_color: '#d1d5db',
            table_header_bg: '#f3f4f6',
            invoice_title_alignment: 'center',
            footer_text: 'Thank you for your business!',
            footer_alignment: 'center',
            signature_space_height: '60px',
            signature_alignment: 'right'
        });
    };

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
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">🎨 Invoice Design Customizer</h1>
                <p className="text-gray-600">Customize the appearance of all invoices across the system</p>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">{success}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Configuration Panel */}
                <div className="space-y-6">
                    {/* Colors Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎨 Color Scheme</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="color"
                                        value={designConfig.primary_color}
                                        onChange={(e) => setDesignConfig({...designConfig, primary_color: e.target.value})}
                                        className="w-12 h-8 rounded border border-gray-300"
                                    />
                                    <input
                                        type="text"
                                        value={designConfig.primary_color}
                                        onChange={(e) => setDesignConfig({...designConfig, primary_color: e.target.value})}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="color"
                                        value={designConfig.secondary_color}
                                        onChange={(e) => setDesignConfig({...designConfig, secondary_color: e.target.value})}
                                        className="w-12 h-8 rounded border border-gray-300"
                                    />
                                    <input
                                        type="text"
                                        value={designConfig.secondary_color}
                                        onChange={(e) => setDesignConfig({...designConfig, secondary_color: e.target.value})}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="color"
                                        value={designConfig.text_color}
                                        onChange={(e) => setDesignConfig({...designConfig, text_color: e.target.value})}
                                        className="w-12 h-8 rounded border border-gray-300"
                                    />
                                    <input
                                        type="text"
                                        value={designConfig.text_color}
                                        onChange={(e) => setDesignConfig({...designConfig, text_color: e.target.value})}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="color"
                                        value={designConfig.accent_color}
                                        onChange={(e) => setDesignConfig({...designConfig, accent_color: e.target.value})}
                                        className="w-12 h-8 rounded border border-gray-300"
                                    />
                                    <input
                                        type="text"
                                        value={designConfig.accent_color}
                                        onChange={(e) => setDesignConfig({...designConfig, accent_color: e.target.value})}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Typography Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Typography</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                                <select
                                    value={designConfig.font_family}
                                    onChange={(e) => setDesignConfig({...designConfig, font_family: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="Inter">Inter</option>
                                    <option value="Arial">Arial</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Roboto">Roboto</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Header Font Size</label>
                                <input
                                    type="text"
                                    value={designConfig.header_font_size}
                                    onChange={(e) => setDesignConfig({...designConfig, header_font_size: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="24px"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Body Font Size</label>
                                <input
                                    type="text"
                                    value={designConfig.body_font_size}
                                    onChange={(e) => setDesignConfig({...designConfig, body_font_size: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="14px"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Small Font Size</label>
                                <input
                                    type="text"
                                    value={designConfig.small_font_size}
                                    onChange={(e) => setDesignConfig({...designConfig, small_font_size: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="12px"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Logo & Header Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏢 Logo & Header</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo URL</label>
                                <input
                                    type="url"
                                    value={designConfig.company_logo_url}
                                    onChange={(e) => setDesignConfig({...designConfig, company_logo_url: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="https://example.com/logo.png"
                                />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo Width</label>
                                    <input
                                        type="text"
                                        value={designConfig.logo_width}
                                        onChange={(e) => setDesignConfig({...designConfig, logo_width: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="120px"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo Height</label>
                                    <input
                                        type="text"
                                        value={designConfig.logo_height}
                                        onChange={(e) => setDesignConfig({...designConfig, logo_height: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="60px"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Header Alignment</label>
                                    <select
                                        value={designConfig.header_alignment}
                                        onChange={(e) => setDesignConfig({...designConfig, header_alignment: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer & Signatures */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Footer & Signatures</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Footer Text</label>
                                <input
                                    type="text"
                                    value={designConfig.footer_text}
                                    onChange={(e) => setDesignConfig({...designConfig, footer_text: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Thank you for your business!"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Footer Alignment</label>
                                    <select
                                        value={designConfig.footer_alignment}
                                        onChange={(e) => setDesignConfig({...designConfig, footer_alignment: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Signature Alignment</label>
                                    <select
                                        value={designConfig.signature_alignment}
                                        onChange={(e) => setDesignConfig({...designConfig, signature_alignment: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">👀 Live Preview</h3>
                    
                    {/* Invoice Preview */}
                    <div 
                        className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm"
                        style={{
                            fontFamily: designConfig.font_family,
                            color: designConfig.text_color,
                            fontSize: designConfig.body_font_size
                        }}
                    >
                        {/* Header */}
                        <div className={`mb-4 ${designConfig.header_alignment === 'center' ? 'text-center' : designConfig.header_alignment === 'right' ? 'text-right' : 'text-left'}`}>
                            {designConfig.company_logo_url && (
                                <img 
                                    src={designConfig.company_logo_url} 
                                    alt="Company Logo" 
                                    style={{
                                        width: designConfig.logo_width,
                                        height: designConfig.logo_height,
                                        objectFit: 'contain'
                                    }}
                                    className="mb-2"
                                />
                            )}
                            <h1 
                                style={{
                                    color: designConfig.primary_color,
                                    fontSize: designConfig.header_font_size
                                }}
                                className="font-bold"
                            >
                                INVOICE
                            </h1>
                        </div>

                        {/* Sample Content */}
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                                <p><strong>Invoice No:</strong> INV-000123</p>
                                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                                <p><strong>Project:</strong> Sample Project</p>
                            </div>
                            <div>
                                <p><strong>Client:</strong> Sample Client Ltd</p>
                                <p><strong>GST No:</strong> 29ABCDE1234F1Z5</p>
                                <p><strong>Amount:</strong> ₹1,50,000.00</p>
                            </div>
                        </div>

                        {/* Sample Table */}
                        <table className="w-full mb-4 text-xs" style={{ borderColor: designConfig.table_border_color }}>
                            <thead style={{ backgroundColor: designConfig.table_header_bg }}>
                                <tr className="border-b" style={{ borderColor: designConfig.table_border_color }}>
                                    <th className="text-left p-2">Description</th>
                                    <th className="text-center p-2">Qty</th>
                                    <th className="text-right p-2">Rate</th>
                                    <th className="text-right p-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b" style={{ borderColor: designConfig.table_border_color }}>
                                    <td className="p-2">Foundation Work</td>
                                    <td className="text-center p-2">50</td>
                                    <td className="text-right p-2">₹2,500</td>
                                    <td className="text-right p-2">₹1,25,000</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Footer */}
                        <div className={`mt-4 text-sm ${designConfig.footer_alignment === 'center' ? 'text-center' : designConfig.footer_alignment === 'right' ? 'text-right' : 'text-left'}`}>
                            <p style={{ color: designConfig.accent_color }}>{designConfig.footer_text}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <button
                    onClick={resetToDefaults}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                    Reset to Defaults
                </button>
                
                <div className="space-x-3">
                    <button
                        onClick={fetchCurrentDesignConfig}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Reload
                    </button>
                    
                    <button
                        onClick={saveDesignConfig}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        {loading ? 'Saving...' : 'Save Design'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDesignCustomizer;