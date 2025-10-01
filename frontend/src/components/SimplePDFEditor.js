import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// PHASE 1: CORE CANVAS INFRASTRUCTURE - CANVA-LIKE FUNCTIONALITY
// ============================================================================

// Universal Draggable Element Component - Works for ANY element type
const DraggableElement = ({ 
    children, 
    elementId, 
    x, 
    y, 
    width, 
    height, 
    onPositionChange, 
    onSizeChange, 
    onDoubleClick,
    isSelected = false,
    onSelect,
    canResize = false,
    zIndex = 10
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect && onSelect(elementId);
        setIsDragging(true);
        setStartPos({
            x: e.clientX - x,
            y: e.clientY - y
        });
    };

    const handleDoubleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDoubleClick && onDoubleClick(elementId);
    };

    const handleResizeStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setStartPos({
            x: e.clientX,
            y: e.clientY
        });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                const newX = e.clientX - startPos.x;
                const newY = e.clientY - startPos.y;
                onPositionChange && onPositionChange(Math.max(0, newX), Math.max(0, newY));
            } else if (isResizing && canResize) {
                const deltaX = e.clientX - startPos.x;
                const deltaY = e.clientY - startPos.y;
                const newWidth = Math.max(50, (width || 100) + deltaX);
                const newHeight = Math.max(30, (height || 50) + deltaY);
                onSizeChange && onSizeChange(newWidth, newHeight);
                setStartPos({ x: e.clientX, y: e.clientY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, startPos, x, y, width, height, onPositionChange, onSizeChange, canResize]);

    return (
        <div
            className={`absolute select-none group cursor-move ${
                isSelected ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'
            }`}
            style={{
                left: x,
                top: y,
                width: width || 'auto',
                height: height || 'auto',
                zIndex: isSelected ? zIndex + 10 : zIndex
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
        >
            {/* Element Content */}
            <div className="w-full h-full">
                {children}
            </div>
            
            {/* Selection Indicators */}
            {isSelected && (
                <>
                    {/* Corner resize handles (only if resizable) */}
                    {canResize && (
                        <>
                            <div
                                className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-se-resize shadow-sm hover:bg-blue-600"
                                onMouseDown={handleResizeStart}
                                title="Drag to resize"
                            />
                            <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white rounded-full"></div>
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white rounded-full"></div>
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white rounded-full"></div>
                        </>
                    )}
                    
                    {/* Element ID label */}
                    <div className="absolute -top-6 left-0 text-xs bg-blue-500 text-white px-2 py-1 rounded opacity-75">
                        {elementId}
                    </div>
                </>
            )}
        </div>
    );
};

// Editable Text Component - Click to edit functionality
const EditableText = ({ text, onTextChange, style = {}, className = "", placeholder = "Click to edit" }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(text);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsEditing(true);
        setEditValue(text);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveText();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    };

    const saveText = () => {
        onTextChange(editValue);
        setIsEditing(false);
    };

    const cancelEdit = () => {
        setEditValue(text);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveText}
                onKeyDown={handleKeyDown}
                className={`bg-white border border-blue-500 rounded px-1 ${className}`}
                style={style}
                placeholder={placeholder}
            />
        );
    }

    return (
        <span
            className={`cursor-text hover:bg-blue-50 hover:outline hover:outline-1 hover:outline-blue-300 rounded px-1 ${className}`}
            style={style}
            onDoubleClick={handleDoubleClick}
            title="Double-click to edit"
        >
            {text || placeholder}
        </span>
    );
};

// Multi-line Editable Text Component
const EditableTextArea = ({ text, onTextChange, style = {}, className = "", placeholder = "Click to edit" }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(text);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsEditing(true);
        setEditValue(text);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            saveText();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    };

    const saveText = () => {
        onTextChange(editValue);
        setIsEditing(false);
    };

    const cancelEdit = () => {
        setEditValue(text);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={saveText}
                onKeyDown={handleKeyDown}
                className={`bg-white border border-blue-500 rounded px-2 py-1 resize-none ${className}`}
                style={{ ...style, minHeight: '60px' }}
                placeholder={placeholder}
                rows={3}
            />
        );
    }

    return (
        <div
            className={`cursor-text hover:bg-blue-50 hover:outline hover:outline-1 hover:outline-blue-300 rounded px-2 py-1 ${className}`}
            style={style}
            onDoubleClick={handleDoubleClick}
            title="Double-click to edit (Ctrl+Enter to save)"
        >
            {text ? (
                <div className="whitespace-pre-line">{text}</div>
            ) : (
                <div className="text-gray-400 italic">{placeholder}</div>
            )}
        </div>
    );
};

// WORKING Draggable Logo - Actually Functions!
const DraggableLogo = ({ logoUrl, logoWidth, logoHeight, logoX, logoY, onLogoChange }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const handleDragStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setStartPos({
            x: e.clientX - logoX,
            y: e.clientY - logoY
        });
    };

    const handleResizeStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setStartPos({
            x: e.clientX,
            y: e.clientY
        });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                onLogoChange({
                    logo_x: e.clientX - startPos.x,
                    logo_y: e.clientY - startPos.y
                });
            } else if (isResizing) {
                const deltaX = e.clientX - startPos.x;
                const deltaY = e.clientY - startPos.y;
                onLogoChange({
                    logo_width: Math.max(50, logoWidth + deltaX),
                    logo_height: Math.max(30, logoHeight + deltaY)
                });
                setStartPos({ x: e.clientX, y: e.clientY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, startPos, logoX, logoY, logoWidth, logoHeight, onLogoChange]);

    return (
        <div
            className="absolute select-none group"
            style={{
                left: logoX,
                top: logoY,
                width: logoWidth,
                height: logoHeight,
                zIndex: 20
            }}
        >
            {/* Logo Image with drag */}
            <div
                className={`w-full h-full border-2 cursor-move ${
                    isDragging 
                        ? 'border-blue-500 shadow-lg' 
                        : 'border-dashed border-gray-400 hover:border-blue-400'
                }`}
                onMouseDown={handleDragStart}
            >
                <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                />
            </div>
            
            {/* Working Resize Handle */}
            <div
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-se-resize shadow-md hover:bg-blue-600 group-hover:opacity-100 opacity-75"
                onMouseDown={handleResizeStart}
                title="Drag to resize"
            />
        </div>
    );
};

const SimplePDFEditor = ({ currentUser }) => {
    // ============================================================================
    // PHASE 1: CANVAS STATE MANAGEMENT - CANVA-LIKE FUNCTIONALITY
    // ============================================================================
    const [selectedElement, setSelectedElement] = useState(null);
    const [canvasElements, setCanvasElements] = useState({
        'tax-invoice-title': {
            type: 'text',
            x: 20, y: 20, width: 200, height: 40,
            content: 'TAX INVOICE',
            style: { fontSize: 24, fontWeight: 'bold', color: '#127285' },
            editable: true
        },
        'invoice-details': {
            type: 'text-group',
            x: 20, y: 70, width: 300, height: 80,
            content: {
                invoice_no: '#PREVIEW-001',
                invoice_date: new Date().toLocaleDateString(),
                created_by: 'Activus Industrial Design & Build'
            },
            style: { fontSize: 12, color: '#000000' },
            editable: true
        },
        'billed-by-section': {
            type: 'info-section',
            x: 20, y: 180, width: 250, height: 150,
            content: {
                title: 'BILLED BY:',
                company_name: 'Activus Industrial Design & Build',
                company_address: 'Plot no. A-52, Sector no. 27, Phase - 2\nTaloja, Maharashtra, India - 410206',
                company_gst: '27ABCCS1234A1Z5',
                company_email: 'info@activus.co.in',
                company_phone: '+91 99999 99999'
            },
            style: { backgroundColor: '#e8f5e8', fontSize: 12, color: '#000000' },
            editable: true
        },
        'billed-to-section': {
            type: 'info-section',
            x: 290, y: 180, width: 250, height: 150,
            content: {
                title: 'BILLED TO:',
                company_name: 'Sample Client Ltd.',
                company_address: '123 Client Street, Client City - 400001',
                company_gst: '27BBBBB1234B1Z5',
                company_email: 'client@example.com',
                company_phone: '+91 9876543210'
            },
            style: { backgroundColor: '#e8f8ff', fontSize: 12, color: '#000000' },
            editable: true
        },
        'project-info': {
            type: 'text-group',
            x: 20, y: 350, width: 500, height: 40,
            content: {
                project_name: 'Sample Construction Project',
                location: 'Sample Location, Sample City'
            },
            style: { fontSize: 12, color: '#000000' },
            editable: true
        }
    });
    
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
        logo_x: 350,
        logo_y: 20,
        logo_layer: 'above', // 'above' or 'behind' text
        logo_opacity: 100,
        logo_fit: 'contain',
        
        // Invoice Styling
        header_color: '#127285',
        header_text_color: '#127285',
        table_header_color: '#127285',
        table_header_text_color: '#ffffff',
        currency_symbol: 'Rs.',
        
        // Text Colors
        invoice_details_text_color: '#000000',
        company_text_color: '#000000',
        client_text_color: '#000000',
        project_text_color: '#000000',
        table_data_text_color: '#000000',
        summary_text_color: '#000000',
        
        // Fonts
        header_font_size: 24,
        content_font_size: 12,
        table_font_size: 11,
        
        // Section Background Colors
        company_section_color: '#e8f5e8',
        client_section_color: '#e8f8ff',
        total_row_color: '#f0f9ff',
        
        // Alternate Colors
        table_alt_row_color: '#f8fafc',
        border_color: '#e2e8f0',
        
        // Canvas Elements (for persistence)
        canvas_elements: {}
    });

    const [activeTab, setActiveTab] = useState('company');
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // ============================================================================
    // PHASE 1: CANVAS MANAGEMENT FUNCTIONS
    // ============================================================================

    // Update element position
    const updateElementPosition = (elementId, x, y) => {
        setCanvasElements(prev => ({
            ...prev,
            [elementId]: {
                ...prev[elementId],
                x: x,
                y: y
            }
        }));
    };

    // Update element size
    const updateElementSize = (elementId, width, height) => {
        setCanvasElements(prev => ({
            ...prev,
            [elementId]: {
                ...prev[elementId],
                width: width,
                height: height
            }
        }));
    };

    // Update element content
    const updateElementContent = (elementId, newContent) => {
        setCanvasElements(prev => ({
            ...prev,
            [elementId]: {
                ...prev[elementId],
                content: typeof newContent === 'object' 
                    ? { ...prev[elementId].content, ...newContent }
                    : newContent
            }
        }));
    };

    // Add new element to canvas
    const addCanvasElement = (elementType) => {
        const newId = `${elementType}-${Date.now()}`;
        const newElement = {
            type: elementType,
            x: 50 + Math.random() * 100, // Random position to avoid overlap
            y: 50 + Math.random() * 100,
            width: elementType === 'text' ? 200 : 300,
            height: elementType === 'text' ? 40 : 100,
            content: getDefaultContent(elementType),
            style: getDefaultStyle(elementType),
            editable: true
        };
        
        setCanvasElements(prev => ({
            ...prev,
            [newId]: newElement
        }));
        
        setSelectedElement(newId);
    };

    // Remove element from canvas
    const removeCanvasElement = (elementId) => {
        if (selectedElement === elementId) {
            setSelectedElement(null);
        }
        setCanvasElements(prev => {
            const newElements = { ...prev };
            delete newElements[elementId];
            return newElements;
        });
    };

    // Get default content for new elements
    const getDefaultContent = (elementType) => {
        switch (elementType) {
            case 'text':
                return 'New Text Element';
            case 'text-group':
                return {
                    line1: 'Text Line 1',
                    line2: 'Text Line 2',
                    line3: 'Text Line 3'
                };
            case 'info-section':
                return {
                    title: 'SECTION TITLE:',
                    company_name: 'Company Name',
                    company_address: 'Address Line 1\nAddress Line 2',
                    company_gst: 'GST Number',
                    company_email: 'email@company.com',
                    company_phone: '+91 1234567890'
                };
            default:
                return 'New Element';
        }
    };

    // Get default style for new elements
    const getDefaultStyle = (elementType) => {
        switch (elementType) {
            case 'text':
                return { fontSize: 14, fontWeight: 'normal', color: '#000000' };
            case 'text-group':
                return { fontSize: 12, color: '#000000' };
            case 'info-section':
                return { backgroundColor: '#f5f5f5', fontSize: 12, color: '#000000', padding: 12 };
            default:
                return { fontSize: 12, color: '#000000' };
        }
    };

    // Handle canvas clicks (deselect elements)
    const handleCanvasClick = (e) => {
        if (e.target === e.currentTarget) {
            setSelectedElement(null);
        }
    };

    // Duplicate element
    const duplicateElement = (elementId) => {
        const element = canvasElements[elementId];
        if (!element) return;
        
        const newId = `${element.type}-${Date.now()}`;
        const duplicatedElement = {
            ...element,
            x: element.x + 20,
            y: element.y + 20
        };
        
        setCanvasElements(prev => ({
            ...prev,
            [newId]: duplicatedElement
        }));
        
        setSelectedElement(newId);
    };

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
                                        
                                        {/* Background Colors Section */}
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-800 mb-4">Background Colors</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Header Background
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
                                                        Table Header Background
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
                                                        Company Section Background
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
                                                        Client Section Background
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.client_section_color}
                                                        onChange={(e) => updateField('client_section_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Total Row Background
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.total_row_color}
                                                        onChange={(e) => updateField('total_row_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Alternate Row Background
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.table_alt_row_color}
                                                        onChange={(e) => updateField('table_alt_row_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Text Colors Section */}
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-blue-800 mb-4">Text Colors</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Header Text Color
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.header_text_color}
                                                        onChange={(e) => updateField('header_text_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Table Header Text Color
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.table_header_text_color}
                                                        onChange={(e) => updateField('table_header_text_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Invoice Details Text Color
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.invoice_details_text_color}
                                                        onChange={(e) => updateField('invoice_details_text_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Company Text Color
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.company_text_color}
                                                        onChange={(e) => updateField('company_text_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Client Text Color
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.client_text_color}
                                                        onChange={(e) => updateField('client_text_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Table Data Text Color
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.table_data_text_color}
                                                        onChange={(e) => updateField('table_data_text_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Summary Text Color
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.summary_text_color}
                                                        onChange={(e) => updateField('summary_text_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Border Color
                                                    </label>
                                                    <input
                                                        type="color"
                                                        value={template.border_color}
                                                        onChange={(e) => updateField('border_color', e.target.value)}
                                                        className="w-full h-10 border border-gray-300 rounded-md"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Font Sizes */}
                                        <div className="bg-green-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-green-800 mb-4">Font Sizes</h4>
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
                                        </div>

                                        {/* Currency & Formatting */}
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
                                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                                    <h4 className="font-medium text-blue-900 mb-3">📝 How to Use Logo</h4>
                                                    <div className="text-sm text-blue-700 space-y-2">
                                                        <p>1. <strong>Drag Logo:</strong> Click the logo in preview and drag to move</p>
                                                        <p>2. <strong>Resize:</strong> Drag the blue circle in bottom-right corner</p>
                                                        <p>3. <strong>Position:</strong> Or use the number inputs below for precise control</p>
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

                                                <div>
                                                    <h5 className="font-medium text-gray-800 mb-3">Position</h5>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm text-gray-600 mb-1">Left</label>
                                                            <input
                                                                type="number"
                                                                value={template.logo_x}
                                                                onChange={(e) => updateField('logo_x', parseInt(e.target.value) || 0)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm text-gray-600 mb-1">Top</label>
                                                            <input
                                                                type="number"
                                                                value={template.logo_y}
                                                                onChange={(e) => updateField('logo_y', parseInt(e.target.value) || 0)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h5 className="font-medium text-gray-800 mb-3">Size</h5>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm text-gray-600 mb-1">Width</label>
                                                            <input
                                                                type="number"
                                                                min="20"
                                                                value={template.logo_width}
                                                                onChange={(e) => updateField('logo_width', parseInt(e.target.value) || 20)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm text-gray-600 mb-1">Height</label>
                                                            <input
                                                                type="number"
                                                                min="15"
                                                                value={template.logo_height}
                                                                onChange={(e) => updateField('logo_height', parseInt(e.target.value) || 15)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                            />
                                                        </div>
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
                                                                updateField('logo_x', 20);
                                                                updateField('logo_y', 15);
                                                            }}
                                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                                                        >
                                                            📍 Top Left
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                updateField('logo_x', 220);
                                                                updateField('logo_y', 15);
                                                            }}
                                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                                                        >
                                                            📍 Top Center
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                updateField('logo_x', 350);
                                                                updateField('logo_y', 15);
                                                            }}
                                                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
                                                        >
                                                            📍 Top Right
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
                            
                            {/* Invoice Preview - Canva Style Free Area */}
                            <div className="border border-gray-300 bg-white p-6 rounded-lg relative overflow-visible" style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif', minHeight: '800px' }}>
                                
                                {/* Header with ALL Draggable Elements */}
                                <div className="relative mb-6" style={{ minHeight: '200px', overflow: 'visible' }}>
                                    
                                    {/* Draggable TAX INVOICE Title */}
                                    <DraggableElement
                                        elementId="tax-invoice-title"
                                        x={template.title_x || 20}
                                        y={template.title_y || 20}
                                        onPositionChange={(x, y) => {
                                            updateField('title_x', x);
                                            updateField('title_y', y);
                                        }}
                                    >
                                        <h1 
                                            className="font-bold select-none" 
                                            style={{ 
                                                fontSize: `${template.header_font_size}px`, 
                                                color: template.header_text_color 
                                            }}
                                        >
                                            TAX INVOICE
                                        </h1>
                                    </DraggableElement>
                                    
                                    {/* Draggable Invoice Details */}
                                    <DraggableElement
                                        elementId="invoice-details"
                                        x={template.details_x || 20}
                                        y={template.details_y || 70}
                                        onPositionChange={(x, y) => {
                                            updateField('details_x', x);
                                            updateField('details_y', y);
                                        }}
                                    >
                                        <div style={{ 
                                            fontSize: `${template.content_font_size}px`,
                                            color: template.invoice_details_text_color 
                                        }}>
                                            <div><strong>Invoice No:</strong> #PREVIEW-001</div>
                                            <div><strong>Invoice Date:</strong> {new Date().toLocaleDateString()}</div>
                                            <div><strong>Created By:</strong> {template.company_name}</div>
                                        </div>
                                    </DraggableElement>
                                    
                                    {/* Draggable Logo */}
                                    {template.logo_url && (
                                        <DraggableLogo 
                                            logoUrl={template.logo_url}
                                            logoWidth={template.logo_width}
                                            logoHeight={template.logo_height}
                                            logoX={template.logo_x || 350}
                                            logoY={template.logo_y || 20}
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
                                            fontSize: `${template.content_font_size}px`,
                                            color: template.company_text_color,
                                            borderColor: template.border_color
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
                                            fontSize: `${template.content_font_size}px`,
                                            color: template.client_text_color,
                                            borderColor: template.border_color
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
                                <div className="mb-4" style={{ 
                                    fontSize: `${template.content_font_size}px`,
                                    color: template.project_text_color 
                                }}>
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
                                    <tbody style={{ 
                                        fontSize: `${template.table_font_size}px`,
                                        color: template.table_data_text_color 
                                    }}>
                                        <tr>
                                            <td className="border p-2" style={{ borderColor: template.border_color }}>Sample Construction Work</td>
                                            <td className="border p-2 text-center" style={{ borderColor: template.border_color }}>18%</td>
                                            <td className="border p-2 text-center" style={{ borderColor: template.border_color }}>100</td>
                                            <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>{template.currency_symbol} 1,000</td>
                                            <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>{template.currency_symbol} 100,000</td>
                                            <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>{template.currency_symbol} 18,000</td>
                                            <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>{template.currency_symbol} 118,000</td>
                                        </tr>
                                        <tr style={{ backgroundColor: template.table_alt_row_color }}>
                                            <td className="border p-2" style={{ borderColor: template.border_color }}>Additional Work</td>
                                            <td className="border p-2 text-center" style={{ borderColor: template.border_color }}>18%</td>
                                            <td className="border p-2 text-center" style={{ borderColor: template.border_color }}>50</td>
                                            <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>{template.currency_symbol} 800</td>
                                            <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>{template.currency_symbol} 40,000</td>
                                            <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>{template.currency_symbol} 7,200</td>
                                            <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>{template.currency_symbol} 47,200</td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Totals */}
                                <div className="flex justify-end">
                                    <table className="border-collapse border" style={{ 
                                        fontSize: `${template.content_font_size}px`,
                                        color: template.summary_text_color,
                                        borderColor: template.border_color 
                                    }}>
                                        <tbody>
                                            <tr>
                                                <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>Subtotal:</td>
                                                <td className="border p-2 text-right font-semibold" style={{ borderColor: template.border_color }}>{template.currency_symbol} 140,000</td>
                                            </tr>
                                            <tr>
                                                <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>IGST (18%):</td>
                                                <td className="border p-2 text-right font-semibold" style={{ borderColor: template.border_color }}>{template.currency_symbol} 25,200</td>
                                            </tr>
                                            <tr style={{ backgroundColor: template.total_row_color }}>
                                                <td className="border p-2 text-right font-bold" style={{ borderColor: template.border_color }}>Total Amount:</td>
                                                <td className="border p-2 text-right font-bold" style={{ borderColor: template.border_color }}>{template.currency_symbol} 165,200</td>
                                            </tr>
                                            <tr>
                                                <td className="border p-2 text-right" style={{ borderColor: template.border_color }}>Advance Received:</td>
                                                <td className="border p-2 text-right font-semibold" style={{ borderColor: template.border_color }}>({template.currency_symbol} 20,000)</td>
                                            </tr>
                                            <tr style={{ backgroundColor: template.total_row_color }}>
                                                <td className="border p-2 text-right font-bold" style={{ borderColor: template.border_color }}>Net Amount Due:</td>
                                                <td className="border p-2 text-right font-bold" style={{ borderColor: template.border_color }}>{template.currency_symbol} 145,200</td>
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