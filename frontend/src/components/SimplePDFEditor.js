import React, { useState, useEffect, useRef } from 'react';

// Interactive Logo Editor Component
const LogoEditor = ({ logoUrl, logoWidth, logoHeight, logoX, logoY, logoLayer, logoOpacity = 100, logoFit = 'contain', onLogoChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ width: 0, height: 0 });
    const logoRef = useRef(null);

    const handleMouseDown = (e) => {
        if (e.target.classList.contains('resize-handle')) {
            setIsResizing(true);
            setResizeStart({ width: logoWidth, height: logoHeight });
        } else {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - logoX,
                y: e.clientY - logoY
            });
        }
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            const containerRect = logoRef.current.parentElement.getBoundingClientRect();
            // COMPLETELY FREE MOVEMENT - No restrictions!
            const newX = e.clientX - dragStart.x - containerRect.left;
            const newY = e.clientY - dragStart.y - containerRect.top;
            
            onLogoChange({ logo_x: newX, logo_y: newY });
        } else if (isResizing) {
            const containerRect = logoRef.current.parentElement.getBoundingClientRect();
            // FREE RESIZING - Much more flexible limits
            const newWidth = Math.max(20, Math.min(e.clientX - containerRect.left - logoX, 500));
            const newHeight = Math.max(15, Math.min(e.clientY - containerRect.top - logoY, 300));
            
            onLogoChange({ logo_width: newWidth, logo_height: newHeight });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    useEffect(() => {
        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, dragStart, logoX, logoY, logoWidth, logoHeight]);

    return (
        <div
            ref={logoRef}
            className={`absolute select-none border-2 border-dashed transition-all group hover:border-blue-400 ${
                isDragging || isResizing ? 'border-blue-500 shadow-lg' : 'border-transparent'
            }`}
            style={{
                left: logoX,
                top: logoY,
                width: logoWidth,
                height: logoHeight,
                zIndex: logoLayer === 'above' ? 20 : 5,
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Logo Image */}
            <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full pointer-events-none"
                style={{ 
                    objectFit: logoFit,
                    opacity: logoOpacity / 100
                }}
                draggable={false}
            />
            
            {/* Resize Handle */}
            <div
                className="resize-handle absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ transform: 'translate(50%, 50%)' }}
            />
            
            {/* Quick Action Buttons */}
            <div className="absolute top-0 right-0 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ transform: 'translate(100%, -100%)' }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onLogoChange({ logo_layer: logoLayer === 'above' ? 'behind' : 'above' });
                    }}
                    className="px-2 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-800"
                    title={`Move ${logoLayer === 'above' ? 'Behind' : 'Above'} Text`}
                >
                    {logoLayer === 'above' ? '⬇️' : '⬆️'}
                </button>
            </div>
        </div>
    );
};

const SimplePDFEditor = ({ currentUser }) => {
    const [template, setTemplate] = useState({
        // Company Information
        company_name: 'Activus Industrial Design & Build',
        company_address: 'Plot no. A-52, Sector no. 27, Phase - 2\nTaloja, Maharashtra, India - 410206',
        company_gst: '27ABCCS1234A1Z5',
        company_email: 'info@activus.co.in',
        company_phone: '+91 99999 99999',
        
        // Logo Settings
        logo_url: null,
        logo_width: 120,
        logo_height: 60,
        logo_x: 400,
        logo_y: 10,
        logo_layer: 'above', // 'above' or 'behind' text
        logo_opacity: 100,
        logo_fit: 'contain',
        
        // Invoice Styling
        header_color: '#127285',
        table_header_color: '#127285',
        table_header_text_color: '#ffffff',
        currency_symbol: 'Rs.',
        
        // Fonts
        header_font_size: 24,
        content_font_size: 12,
        table_font_size: 11,
        
        // Colors
        company_section_color: '#e8f5e8',
        client_section_color: '#e8f8ff',
        total_row_color: '#f0f9ff'
    });

    const [activeTab, setActiveTab] = useState('company');
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Load existing template
    useEffect(() => {
        loadActiveTemplate();
    }, []);

    const loadActiveTemplate = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/pdf-template/active`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setTemplate(prev => ({ ...prev, ...data }));
            }
        } catch (error) {
            console.error('Error loading template:', error);
        }
    };

    const updateField = (field, value) => {
        setTemplate(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleLogoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

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
                updateField('logo_url', result.logo_url);
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
            } else {
                alert('Failed to save template');
            }
        } catch (error) {
            console.error('Save error:', error);
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
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                alert('Failed to generate preview');
            }
        } catch (error) {
            console.error('Preview error:', error);
            alert('Error generating preview');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <h1 className="text-2xl font-bold text-gray-900">PDF Editor</h1>
                        <div className="flex space-x-3">
                            <button
                                onClick={generatePreview}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Preview PDF
                            </button>
                            <button
                                onClick={saveTemplate}
                                disabled={saving}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Template'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left Panel - Form Controls */}
                    <div className="space-y-6">
                        
                        {/* Tabs */}
                        <div className="bg-white rounded-lg shadow-sm">
                            <div className="border-b border-gray-200">
                                <nav className="flex">
                                    {[
                                        { id: 'company', name: 'Company Info' },
                                        { id: 'styling', name: 'Colors & Styling' },
                                        { id: 'logo', name: 'Logo & Branding' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                                activeTab === tab.id
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {tab.name}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-6">
                                {/* Company Info Tab */}
                                {activeTab === 'company' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-900">Company Information</h3>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Company Name
                                            </label>
                                            <input
                                                type="text"
                                                value={template.company_name}
                                                onChange={(e) => updateField('company_name', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Your Company Name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Company Address
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={template.company_address}
                                                onChange={(e) => updateField('company_address', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Complete company address"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    GST Number
                                                </label>
                                                <input
                                                    type="text"
                                                    value={template.company_gst}
                                                    onChange={(e) => updateField('company_gst', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="GST Number"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="text"
                                                    value={template.company_phone}
                                                    onChange={(e) => updateField('company_phone', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Phone Number"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                value={template.company_email}
                                                onChange={(e) => updateField('company_email', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Email Address"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Colors & Styling Tab */}
                                {activeTab === 'styling' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-900">Colors & Styling</h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Header Color
                                                </label>
                                                <input
                                                    type="color"
                                                    value={template.header_color}
                                                    onChange={(e) => updateField('header_color', e.target.value)}
                                                    className="w-full h-10 border border-gray-300 rounded-md"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Table Header Color
                                                </label>
                                                <input
                                                    type="color"
                                                    value={template.table_header_color}
                                                    onChange={(e) => updateField('table_header_color', e.target.value)}
                                                    className="w-full h-10 border border-gray-300 rounded-md"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Company Section Color
                                                </label>
                                                <input
                                                    type="color"
                                                    value={template.company_section_color}
                                                    onChange={(e) => updateField('company_section_color', e.target.value)}
                                                    className="w-full h-10 border border-gray-300 rounded-md"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Client Section Color
                                                </label>
                                                <input
                                                    type="color"
                                                    value={template.client_section_color}
                                                    onChange={(e) => updateField('client_section_color', e.target.value)}
                                                    className="w-full h-10 border border-gray-300 rounded-md"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Header Font Size
                                                </label>
                                                <input
                                                    type="number"
                                                    min="16"
                                                    max="32"
                                                    value={template.header_font_size}
                                                    onChange={(e) => updateField('header_font_size', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Content Font Size
                                                </label>
                                                <input
                                                    type="number"
                                                    min="10"
                                                    max="16"
                                                    value={template.content_font_size}
                                                    onChange={(e) => updateField('content_font_size', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Table Font Size
                                                </label>
                                                <input
                                                    type="number"
                                                    min="8"
                                                    max="14"
                                                    value={template.table_font_size}
                                                    onChange={(e) => updateField('table_font_size', parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Currency Symbol
                                            </label>
                                            <select
                                                value={template.currency_symbol}
                                                onChange={(e) => updateField('currency_symbol', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="Rs.">Rs.</option>
                                                <option value="₹">₹</option>
                                                <option value="INR">INR</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Logo & Branding Tab */}
                                {activeTab === 'logo' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-900">Logo & Branding</h3>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Company Logo
                                            </label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    className="hidden"
                                                    id="logo-upload"
                                                    disabled={uploadingLogo}
                                                />
                                                <label htmlFor="logo-upload" className="cursor-pointer">
                                                    {uploadingLogo ? (
                                                        <div className="text-blue-600">
                                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                                            <p>Uploading...</p>
                                                        </div>
                                                    ) : template.logo_url ? (
                                                        <div>
                                                            <img 
                                                                src={template.logo_url} 
                                                                alt="Company Logo" 
                                                                className="max-h-20 mx-auto mb-2"
                                                            />
                                                            <p className="text-green-600">Logo uploaded successfully</p>
                                                            <p className="text-sm text-gray-500 mt-1">Click to change</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-500">
                                                            <div className="text-4xl mb-2">📷</div>
                                                            <p>Click to upload company logo</p>
                                                            <p className="text-sm mt-1">PNG, JPG up to 5MB</p>
                                                        </div>
                                                    )}
                                                </label>
                                            </div>
                                        </div>

                                        {template.logo_url && (
                                            <div className="space-y-4">
                                                {/* Logo Positioning Controls */}
                                                <div className="bg-blue-50 p-4 rounded-lg">
                                                    <h4 className="font-medium text-blue-900 mb-3">Interactive Logo Controls</h4>
                                                    <div className="text-sm text-blue-700 space-y-2">
                                                        <p>💡 <strong>In the preview:</strong> Drag the logo to move it around</p>
                                                        <p>🔧 <strong>Resize:</strong> Drag the blue dot in bottom-right corner</p>
                                                        <p>📑 <strong>Layer:</strong> Click ⬆️/⬇️ button to move above/behind text</p>
                                                    </div>
                                                </div>

                                                {/* Precise Controls */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Logo Layer Position
                                                    </label>
                                                    <select
                                                        value={template.logo_layer}
                                                        onChange={(e) => updateField('logo_layer', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="above">Above Text (Front Layer)</option>
                                                        <option value="behind">Behind Text (Background)</option>
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Position X (Left)
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="500"
                                                            value={template.logo_x}
                                                            onChange={(e) => updateField('logo_x', parseInt(e.target.value))}
                                                            className="w-full"
                                                        />
                                                        <div className="text-xs text-gray-500 text-center mt-1">{template.logo_x}px</div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Position Y (Top)
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="150"
                                                            value={template.logo_y}
                                                            onChange={(e) => updateField('logo_y', parseInt(e.target.value))}
                                                            className="w-full"
                                                        />
                                                        <div className="text-xs text-gray-500 text-center mt-1">{template.logo_y}px</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Width
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="50"
                                                            max="300"
                                                            value={template.logo_width}
                                                            onChange={(e) => updateField('logo_width', parseInt(e.target.value))}
                                                            className="w-full"
                                                        />
                                                        <div className="text-xs text-gray-500 text-center mt-1">{template.logo_width}px</div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Height
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="30"
                                                            max="200"
                                                            value={template.logo_height}
                                                            onChange={(e) => updateField('logo_height', parseInt(e.target.value))}
                                                            className="w-full"
                                                        />
                                                        <div className="text-xs text-gray-500 text-center mt-1">{template.logo_height}px</div>
                                                    </div>
                                                </div>

                                                {/* Quick Preset Positions */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Quick Position Presets
                                                    </label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <button
                                                            onClick={() => {
                                                                updateField('logo_x', 10);
                                                                updateField('logo_y', 10);
                                                            }}
                                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                                                        >
                                                            Top Left
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                updateField('logo_x', 250);
                                                                updateField('logo_y', 10);
                                                            }}
                                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                                                        >
                                                            Top Center
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                updateField('logo_x', 450);
                                                                updateField('logo_y', 10);
                                                            }}
                                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                                                        >
                                                            Top Right
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Logo Style Controls */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Logo Style & Effects
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Opacity</label>
                                                            <input
                                                                type="range"
                                                                min="20"
                                                                max="100"
                                                                value={template.logo_opacity || 100}
                                                                onChange={(e) => updateField('logo_opacity', parseInt(e.target.value))}
                                                                className="w-full"
                                                            />
                                                            <div className="text-xs text-gray-500 text-center">{template.logo_opacity || 100}%</div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-gray-500 mb-1">Fit Style</label>
                                                            <select
                                                                value={template.logo_fit || 'contain'}
                                                                onChange={(e) => updateField('logo_fit', e.target.value)}
                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                            >
                                                                <option value="contain">Fit (Keep aspect ratio)</option>
                                                                <option value="cover">Fill (May crop)</option>
                                                                <option value="fill">Stretch (May distort)</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {template.logo_url && (
                                            <button
                                                onClick={() => updateField('logo_url', null)}
                                                className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                            >
                                                Remove Logo
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Live Preview */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>
                            
                            {/* Invoice Preview */}
                            <div className="border border-gray-300 bg-white p-6 rounded-lg" style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
                                
                                {/* Header with Interactive Logo */}
                                <div className="relative mb-6" style={{ minHeight: '120px' }}>
                                    {/* Header Text */}
                                    <div className="relative z-10">
                                        <h1 
                                            className="font-bold mb-2" 
                                            style={{ 
                                                fontSize: `${template.header_font_size}px`, 
                                                color: template.header_color 
                                            }}
                                        >
                                            TAX INVOICE
                                        </h1>
                                        <div style={{ fontSize: `${template.content_font_size}px` }}>
                                            <div><strong>Invoice No:</strong> #PREVIEW-001</div>
                                            <div><strong>Invoice Date:</strong> {new Date().toLocaleDateString()}</div>
                                            <div><strong>Created By:</strong> {template.company_name}</div>
                                        </div>
                                    </div>
                                    
                                    {/* Interactive Draggable Logo */}
                                    {template.logo_url && (
                                        <LogoEditor 
                                            logoUrl={template.logo_url}
                                            logoWidth={template.logo_width}
                                            logoHeight={template.logo_height}
                                            logoX={template.logo_x || 400}
                                            logoY={template.logo_y || 10}
                                            logoLayer={template.logo_layer || 'above'}
                                            logoOpacity={template.logo_opacity || 100}
                                            logoFit={template.logo_fit || 'contain'}
                                            onLogoChange={(changes) => {
                                                Object.keys(changes).forEach(key => {
                                                    updateField(key, changes[key]);
                                                });
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Company and Client Info */}
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div 
                                        className="p-3 rounded"
                                        style={{ 
                                            backgroundColor: template.company_section_color,
                                            fontSize: `${template.content_font_size}px`
                                        }}
                                    >
                                        <div className="font-bold mb-2">BILLED BY:</div>
                                        <div className="font-semibold">{template.company_name}</div>
                                        <div className="whitespace-pre-line text-sm mt-1">{template.company_address}</div>
                                        <div className="text-sm">GST: {template.company_gst}</div>
                                        <div className="text-sm">Email: {template.company_email}</div>
                                        <div className="text-sm">Phone: {template.company_phone}</div>
                                    </div>
                                    
                                    <div 
                                        className="p-3 rounded"
                                        style={{ 
                                            backgroundColor: template.client_section_color,
                                            fontSize: `${template.content_font_size}px`
                                        }}
                                    >
                                        <div className="font-bold mb-2">BILLED TO:</div>
                                        <div className="font-semibold">Sample Client Ltd.</div>
                                        <div className="text-sm mt-1">123 Client Street, Client City - 400001</div>
                                        <div className="text-sm">GST: 27BBBBB1234B1Z5</div>
                                        <div className="text-sm">Email: client@example.com</div>
                                        <div className="text-sm">Phone: +91 9876543210</div>
                                    </div>
                                </div>

                                {/* Project Info */}
                                <div className="mb-4" style={{ fontSize: `${template.content_font_size}px` }}>
                                    <div><strong>Project:</strong> Sample Construction Project</div>
                                    <div><strong>Location:</strong> Sample Location, Sample City</div>
                                </div>

                                {/* Items Table */}
                                <table className="w-full border-collapse border border-gray-400 mb-4">
                                    <thead>
                                        <tr 
                                            style={{ 
                                                backgroundColor: template.table_header_color,
                                                color: template.table_header_text_color,
                                                fontSize: `${template.table_font_size}px`
                                            }}
                                        >
                                            <th className="border border-gray-400 p-2 text-left">Item</th>
                                            <th className="border border-gray-400 p-2">GST Rate</th>
                                            <th className="border border-gray-400 p-2">Qty</th>
                                            <th className="border border-gray-400 p-2">Rate</th>
                                            <th className="border border-gray-400 p-2">Amount</th>
                                            <th className="border border-gray-400 p-2">IGST</th>
                                            <th className="border border-gray-400 p-2">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody style={{ fontSize: `${template.table_font_size}px` }}>
                                        <tr>
                                            <td className="border border-gray-400 p-2">Sample Construction Work</td>
                                            <td className="border border-gray-400 p-2 text-center">18%</td>
                                            <td className="border border-gray-400 p-2 text-center">100</td>
                                            <td className="border border-gray-400 p-2 text-right">{template.currency_symbol} 1,000</td>
                                            <td className="border border-gray-400 p-2 text-right">{template.currency_symbol} 100,000</td>
                                            <td className="border border-gray-400 p-2 text-right">{template.currency_symbol} 18,000</td>
                                            <td className="border border-gray-400 p-2 text-right">{template.currency_symbol} 118,000</td>
                                        </tr>
                                        <tr className="bg-gray-50">
                                            <td className="border border-gray-400 p-2">Additional Work</td>
                                            <td className="border border-gray-400 p-2 text-center">18%</td>
                                            <td className="border border-gray-400 p-2 text-center">50</td>
                                            <td className="border border-gray-400 p-2 text-right">{template.currency_symbol} 800</td>
                                            <td className="border border-gray-400 p-2 text-right">{template.currency_symbol} 40,000</td>
                                            <td className="border border-gray-400 p-2 text-right">{template.currency_symbol} 7,200</td>
                                            <td className="border border-gray-400 p-2 text-right">{template.currency_symbol} 47,200</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Totals */}
                                <div className="flex justify-end">
                                    <table className="border-collapse border border-gray-400" style={{ fontSize: `${template.content_font_size}px` }}>
                                        <tbody>
                                            <tr>
                                                <td className="border border-gray-400 p-2 text-right">Subtotal:</td>
                                                <td className="border border-gray-400 p-2 text-right font-semibold">{template.currency_symbol} 140,000</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-gray-400 p-2 text-right">IGST (18%):</td>
                                                <td className="border border-gray-400 p-2 text-right font-semibold">{template.currency_symbol} 25,200</td>
                                            </tr>
                                            <tr style={{ backgroundColor: template.total_row_color }}>
                                                <td className="border border-gray-400 p-2 text-right font-bold">Total Amount:</td>
                                                <td className="border border-gray-400 p-2 text-right font-bold">{template.currency_symbol} 165,200</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-gray-400 p-2 text-right">Advance Received:</td>
                                                <td className="border border-gray-400 p-2 text-right font-semibold">({template.currency_symbol} 20,000)</td>
                                            </tr>
                                            <tr style={{ backgroundColor: template.total_row_color }}>
                                                <td className="border border-gray-400 p-2 text-right font-bold">Net Amount Due:</td>
                                                <td className="border border-gray-400 p-2 text-right font-bold">{template.currency_symbol} 145,200</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Footer */}
                                <div className="mt-6" style={{ fontSize: `${template.content_font_size}px` }}>
                                    <div className="mb-4">
                                        <strong>Payment Terms:</strong> Payment due within 30 days
                                    </div>
                                    <div className="text-right">
                                        <div className="mt-8">
                                            <div className="font-semibold">Authorised Signatory</div>
                                            <div>{template.company_name}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimplePDFEditor;