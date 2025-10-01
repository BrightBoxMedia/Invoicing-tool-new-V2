import React, { useState, useEffect } from 'react';

const PDFTemplateManager = ({ currentUser }) => {
    const [template, setTemplate] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('layout');
    const [uploadingLogo, setUploadingLogo] = useState(false);

    useEffect(() => {
        loadCurrentTemplate();
    }, []);

    const loadCurrentTemplate = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/pdf-template/active`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const templateData = await response.json();
                setTemplate(templateData);
            }
        } catch (error) {
            console.error('Error loading template:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveTemplate = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/pdf-template`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(template)
            });

            if (response.ok) {
                alert('Template saved successfully!');
                await loadCurrentTemplate();
            } else {
                alert('Error saving template');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Error saving template');
        } finally {
            setSaving(false);
        }
    };

    const generatePreview = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/pdf-template/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(template)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                alert('Error generating preview');
            }
        } catch (error) {
            console.error('Error generating preview:', error);
            alert('Error generating preview');
        }
    };

    const updateTemplate = (field, value) => {
        setTemplate(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleLogoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setUploadingLogo(true);
        
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/pdf-template/upload-logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                updateTemplate('logo_url', result.logo_url);
                alert('Logo uploaded successfully!');
            } else {
                alert('Failed to upload logo');
            }
        } catch (error) {
            console.error('Logo upload error:', error);
            alert('Error uploading logo');
        } finally {
            setUploadingLogo(false);
        }
    };

    const tabs = [
        { id: 'layout', label: '📐 Layout & Spacing', icon: '📐' },
        { id: 'header', label: '📋 Header Settings', icon: '📋' },
        { id: 'table', label: '📊 Table Configuration', icon: '📊' },
        { id: 'styling', label: '🎨 Colors & Fonts', icon: '🎨' },
        { id: 'preview', label: '👁️ Live Preview', icon: '👁️' }
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading PDF template configuration...</p>
                </div>
            </div>
        );
    }

    if (!template) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">Failed to load template configuration.</p>
                <button 
                    onClick={loadCurrentTemplate}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 bg-white">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">PDF Template Manager</h1>
                        <p className="text-gray-600 mt-2">Configure invoice PDF layout, styling, and formatting</p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={generatePreview}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                        >
                            🔍 Preview PDF
                        </button>
                        <button
                            onClick={saveTemplate}
                            disabled={saving}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                        >
                            {saving ? '💾 Saving...' : '💾 Save Template'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-4 px-2 border-b-2 font-medium text-sm ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                
                {/* Layout & Spacing Tab */}
                {activeTab === 'layout' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Page Settings</h3>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
                                <select
                                    value={template.page_size}
                                    onChange={(e) => updateTemplate('page_size', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="A4">A4</option>
                                    <option value="Letter">Letter</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Top Margin (mm)</label>
                                    <input
                                        type="number"
                                        value={template.margin_top}
                                        onChange={(e) => updateTemplate('margin_top', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bottom Margin (mm)</label>
                                    <input
                                        type="number"
                                        value={template.margin_bottom}
                                        onChange={(e) => updateTemplate('margin_bottom', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Left Margin (mm)</label>
                                    <input
                                        type="number"
                                        value={template.margin_left}
                                        onChange={(e) => updateTemplate('margin_left', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Right Margin (mm)</label>
                                    <input
                                        type="number"
                                        value={template.margin_right}
                                        onChange={(e) => updateTemplate('margin_right', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Logo Settings</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo Width (px)</label>
                                    <input
                                        type="number"
                                        value={template.logo_width}
                                        onChange={(e) => updateTemplate('logo_width', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo Height (px)</label>
                                    <input
                                        type="number"
                                        value={template.logo_height}
                                        onChange={(e) => updateTemplate('logo_height', parseFloat(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Position</label>
                                <select
                                    value={template.logo_position}
                                    onChange={(e) => updateTemplate('logo_position', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="TOP_RIGHT">Top Right</option>
                                    <option value="TOP_LEFT">Top Left</option>
                                    <option value="TOP_CENTER">Top Center</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Upload</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                        id="logo-upload"
                                    />
                                    <label htmlFor="logo-upload" className="cursor-pointer">
                                        <div className="space-y-2">
                                            <div className="text-gray-500">
                                                <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                <span className="font-medium text-blue-600">Click to upload logo</span> or drag and drop
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                PNG, JPG, GIF up to 5MB
                                            </div>
                                        </div>
                                    </label>
                                </div>
                                
                                {template.logo_url && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Logo uploaded successfully</span>
                                            <button
                                                onClick={() => updateTemplate('logo_url', null)}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Settings Tab */}
                {activeTab === 'header' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">Header Configuration</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">TAX Invoice Font Size</label>
                                <input
                                    type="number"
                                    value={template.header_tax_invoice_font_size}
                                    onChange={(e) => updateTemplate('header_tax_invoice_font_size', parseFloat(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title Alignment</label>
                                <select
                                    value={template.header_tax_invoice_alignment}
                                    onChange={(e) => updateTemplate('header_tax_invoice_alignment', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="LEFT">Left</option>
                                    <option value="CENTER">Center</option>
                                    <option value="RIGHT">Right</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title Color</label>
                                <input
                                    type="color"
                                    value={template.header_tax_invoice_color}
                                    onChange={(e) => updateTemplate('header_tax_invoice_color', e.target.value)}
                                    className="w-full h-10 border border-gray-300 rounded-md"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Table Configuration Tab */}
                {activeTab === 'table' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">Table Settings</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-800">Column Widths (mm)</h4>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                                        <input
                                            type="number"
                                            value={template.col_item_width}
                                            onChange={(e) => updateTemplate('col_item_width', parseFloat(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">GST Rate</label>
                                        <input
                                            type="number"
                                            value={template.col_gst_rate_width}
                                            onChange={(e) => updateTemplate('col_gst_rate_width', parseFloat(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                        <input
                                            type="number"
                                            value={template.col_quantity_width}
                                            onChange={(e) => updateTemplate('col_quantity_width', parseFloat(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Rate</label>
                                        <input
                                            type="number"
                                            value={template.col_rate_width}
                                            onChange={(e) => updateTemplate('col_rate_width', parseFloat(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                                        <input
                                            type="number"
                                            value={template.col_amount_width}
                                            onChange={(e) => updateTemplate('col_amount_width', parseFloat(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">IGST</label>
                                        <input
                                            type="number"
                                            value={template.col_igst_width}
                                            onChange={(e) => updateTemplate('col_igst_width', parseFloat(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                                        <input
                                            type="number"
                                            value={template.col_total_width}
                                            onChange={(e) => updateTemplate('col_total_width', parseFloat(e.target.value))}
                                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-800">Row Settings</h4>
                                
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        id="alternating-colors"
                                        checked={template.use_alternating_row_colors}
                                        onChange={(e) => updateTemplate('use_alternating_row_colors', e.target.checked)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    />
                                    <label htmlFor="alternating-colors" className="text-sm font-medium text-gray-700">
                                        Use Alternating Row Colors
                                    </label>
                                </div>
                                
                                {template.use_alternating_row_colors && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Alternating Row Color</label>
                                        <input
                                            type="color"
                                            value={template.alternating_row_color}
                                            onChange={(e) => updateTemplate('alternating_row_color', e.target.value)}
                                            className="w-full h-10 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Colors & Fonts Tab */}
                {activeTab === 'styling' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900">Colors & Typography</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-800">Table Colors</h4>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Table Header Background</label>
                                    <input
                                        type="color"
                                        value={template.table_header_color}
                                        onChange={(e) => updateTemplate('table_header_color', e.target.value)}
                                        className="w-full h-10 border border-gray-300 rounded-md"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Header Text Color</label>
                                    <input
                                        type="color"
                                        value={template.table_header_text_color}
                                        onChange={(e) => updateTemplate('table_header_text_color', e.target.value)}
                                        className="w-full h-10 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-medium text-gray-800">Currency Settings</h4>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency Symbol</label>
                                    <input
                                        type="text"
                                        value={template.currency_symbol}
                                        onChange={(e) => updateTemplate('currency_symbol', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        placeholder="₹"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency Format</label>
                                    <select
                                        value={template.currency_format}
                                        onChange={(e) => updateTemplate('currency_format', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    >
                                        <option value="SYMBOL">Symbol (₹)</option>
                                        <option value="TEXT">Text (Rs.)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Tab */}
                {activeTab === 'preview' && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">PDF Template Preview</h3>
                            <p className="text-gray-600 mb-6">Click the button below to generate a preview of your current template settings</p>
                            
                            <button
                                onClick={generatePreview}
                                className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 font-medium text-lg"
                            >
                                🔍 Generate PDF Preview
                            </button>
                        </div>
                        
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h4 className="font-medium text-gray-800 mb-4">Current Template Summary</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Page Size:</span> {template.page_size}
                                </div>
                                <div>
                                    <span className="font-medium">Logo Size:</span> {template.logo_width}x{template.logo_height}px
                                </div>
                                <div>
                                    <span className="font-medium">Header Font Size:</span> {template.header_tax_invoice_font_size}px
                                </div>
                                <div>
                                    <span className="font-medium">Currency:</span> {template.currency_symbol} ({template.currency_format})
                                </div>
                                <div>
                                    <span className="font-medium">Table Header Color:</span> {template.table_header_color}
                                </div>
                                <div>
                                    <span className="font-medium">Alternating Rows:</span> {template.use_alternating_row_colors ? 'Yes' : 'No'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFTemplateManager;