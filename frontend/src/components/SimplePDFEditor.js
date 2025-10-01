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
            x: 200, y: 20, width: 200, height: 40,
            content: 'TAX INVOICE',
            style: { fontSize: 24, fontWeight: 'bold', color: '#127285' },
            editable: true
        },
        'invoice-details': {
            type: 'text-group',
            x: 20, y: 80, width: 300, height: 80,
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
            x: 310, y: 180, width: 250, height: 150,
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
            x: 20, y: 350, width: 520, height: 60,
            content: {
                project_name: 'Sample Construction Project',
                location: 'Sample Location, Sample City'
            },
            style: { fontSize: 12, color: '#000000' },
            editable: true
        },
        'items-table': {
            type: 'table',
            x: 20, y: 430, width: 540, height: 200,
            content: {
                headers: ['Item', 'GST Rate', 'Qty', 'Rate', 'Amount', 'IGST', 'Total'],
                rows: [
                    ['Sample Construction Work', '18%', '100', 'Rs. 1,000', 'Rs. 100,000', 'Rs. 18,000', 'Rs. 118,000'],
                    ['Additional Work', '18%', '50', 'Rs. 800', 'Rs. 40,000', 'Rs. 7,200', 'Rs. 47,200']
                ]
            },
            style: { fontSize: 11, backgroundColor: '#f8fafc', headerColor: '#127285', headerTextColor: '#ffffff' },
            editable: true
        },
        'total-section': {
            type: 'info-section',
            x: 350, y: 650, width: 210, height: 100,
            content: {
                title: 'TOTAL SUMMARY:',
                subtotal: 'Rs. 140,000',
                igst: 'Rs. 25,200',
                total: 'Rs. 165,200'
            },
            style: { backgroundColor: '#f0f9ff', fontSize: 12, color: '#000000' },
            editable: true
        },
        'footer-section': {
            type: 'text',
            x: 20, y: 770, width: 540, height: 40,
            content: 'Thank you for your business!\n\nAuthorised Signatory',
            style: { fontSize: 12, color: '#000000', textAlign: 'center' },
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

    const [activeTab, setActiveTab] = useState('elements');
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
                    invoice_no: '#NEW-001',
                    invoice_date: new Date().toLocaleDateString(),
                    created_by: 'Company Name'
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
            case 'table':
                return {
                    headers: ['Item', 'Qty', 'Rate', 'Amount'],
                    rows: [
                        ['New Item 1', '1', 'Rs. 100', 'Rs. 100'],
                        ['New Item 2', '2', 'Rs. 200', 'Rs. 400']
                    ]
                };
            case 'total-section':
                return {
                    title: 'TOTAL SUMMARY:',
                    subtotal: 'Rs. 0',
                    igst: 'Rs. 0',
                    total: 'Rs. 0'
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
            case 'table':
                return { fontSize: 11, backgroundColor: '#f8fafc', headerColor: '#127285', headerTextColor: '#ffffff' };
            case 'total-section':
                return { backgroundColor: '#f0f9ff', fontSize: 12, color: '#000000', padding: 12 };
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

    // Render content for different element types
    const renderElementContent = (elementId, element) => {
        const { type, content, style } = element;
        
        switch (type) {
            case 'text':
                return (
                    <EditableText
                        text={content}
                        onTextChange={(newText) => updateElementContent(elementId, newText)}
                        style={{
                            fontSize: `${style.fontSize}px`,
                            fontWeight: style.fontWeight,
                            color: style.color,
                            display: 'block',
                            width: '100%'
                        }}
                        className="font-bold select-none"
                    />
                );

            case 'text-group':
                return (
                    <div style={{ fontSize: `${style.fontSize}px`, color: style.color }}>
                        <div>
                            <strong>Invoice No:</strong> 
                            <EditableText
                                text={content.invoice_no}
                                onTextChange={(newText) => updateElementContent(elementId, { invoice_no: newText })}
                                style={{ marginLeft: '8px' }}
                            />
                        </div>
                        <div>
                            <strong>Invoice Date:</strong> 
                            <EditableText
                                text={content.invoice_date}
                                onTextChange={(newText) => updateElementContent(elementId, { invoice_date: newText })}
                                style={{ marginLeft: '8px' }}
                            />
                        </div>
                        <div>
                            <strong>Created By:</strong> 
                            <EditableText
                                text={content.created_by}
                                onTextChange={(newText) => updateElementContent(elementId, { created_by: newText })}
                                style={{ marginLeft: '8px' }}
                            />
                        </div>
                    </div>
                );

            case 'info-section':
                return (
                    <div 
                        className="p-3 rounded border"
                        style={{ 
                            backgroundColor: style.backgroundColor,
                            fontSize: `${style.fontSize}px`,
                            color: style.color,
                            borderColor: template.border_color
                        }}
                    >
                        <div className="font-bold mb-2">
                            <EditableText
                                text={content.title}
                                onTextChange={(newText) => updateElementContent(elementId, { title: newText })}
                                style={{ fontWeight: 'bold' }}
                            />
                        </div>
                        <div className="font-semibold">
                            <EditableText
                                text={content.company_name}
                                onTextChange={(newText) => updateElementContent(elementId, { company_name: newText })}
                                style={{ fontWeight: '600' }}
                            />
                        </div>
                        <div className="text-sm mt-1">
                            <EditableTextArea
                                text={content.company_address}
                                onTextChange={(newText) => updateElementContent(elementId, { company_address: newText })}
                                style={{ fontSize: '11px', lineHeight: '1.4' }}
                            />
                        </div>
                        <div className="text-sm">
                            GST: <EditableText
                                text={content.company_gst}
                                onTextChange={(newText) => updateElementContent(elementId, { company_gst: newText })}
                                style={{ fontSize: '11px' }}
                            />
                        </div>
                        <div className="text-sm">
                            Email: <EditableText
                                text={content.company_email}
                                onTextChange={(newText) => updateElementContent(elementId, { company_email: newText })}
                                style={{ fontSize: '11px' }}
                            />
                        </div>
                        <div className="text-sm">
                            Phone: <EditableText
                                text={content.company_phone}
                                onTextChange={(newText) => updateElementContent(elementId, { company_phone: newText })}
                                style={{ fontSize: '11px' }}
                            />
                        </div>
                    </div>
                );

            case 'project-info':
                return (
                    <div style={{ fontSize: `${style.fontSize}px`, color: style.color }}>
                        <div>
                            <strong>Project:</strong> 
                            <EditableText
                                text={content.project_name}
                                onTextChange={(newText) => updateElementContent(elementId, { project_name: newText })}
                                style={{ marginLeft: '8px' }}
                            />
                        </div>
                        <div>
                            <strong>Location:</strong> 
                            <EditableText
                                text={content.location}
                                onTextChange={(newText) => updateElementContent(elementId, { location: newText })}
                                style={{ marginLeft: '8px' }}
                            />
                        </div>
                    </div>
                );

            case 'table':
                return (
                    <div className="w-full border border-gray-400 rounded" style={{ fontSize: `${style.fontSize}px` }}>
                        {/* Table Headers */}
                        <div 
                            className="grid grid-cols-7 border-b border-gray-400 font-bold text-white p-2"
                            style={{ 
                                backgroundColor: style.headerColor || '#127285',
                                color: style.headerTextColor || '#ffffff',
                                fontSize: `${style.fontSize}px`
                            }}
                        >
                            {content.headers?.map((header, index) => (
                                <div key={index} className="text-center text-xs">
                                    <EditableText
                                        text={header}
                                        onTextChange={(newText) => {
                                            const newHeaders = [...content.headers];
                                            newHeaders[index] = newText;
                                            updateElementContent(elementId, { headers: newHeaders });
                                        }}
                                        style={{ color: 'white', fontSize: `${(style.fontSize || 12) - 1}px` }}
                                    />
                                </div>
                            ))}
                        </div>
                        
                        {/* Table Rows */}
                        {content.rows?.map((row, rowIndex) => (
                            <div 
                                key={rowIndex} 
                                className={`grid grid-cols-7 border-b border-gray-300 p-2 ${rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                            >
                                {row.map((cell, cellIndex) => (
                                    <div key={cellIndex} className="text-center text-xs">
                                        <EditableText
                                            text={cell}
                                            onTextChange={(newText) => {
                                                const newRows = [...content.rows];
                                                newRows[rowIndex][cellIndex] = newText;
                                                updateElementContent(elementId, { rows: newRows });
                                            }}
                                            style={{ fontSize: `${(style.fontSize || 12) - 1}px` }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                );

            case 'total-section':
                return (
                    <div 
                        className="p-3 rounded border"
                        style={{ 
                            backgroundColor: style.backgroundColor,
                            fontSize: `${style.fontSize}px`,
                            color: style.color,
                            borderColor: template.border_color
                        }}
                    >
                        <div className="font-bold mb-2">
                            <EditableText
                                text={content.title}
                                onTextChange={(newText) => updateElementContent(elementId, { title: newText })}
                                style={{ fontWeight: 'bold' }}
                            />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <EditableText
                                    text={content.subtotal}
                                    onTextChange={(newText) => updateElementContent(elementId, { subtotal: newText })}
                                />
                            </div>
                            <div className="flex justify-between">
                                <span>IGST (18%):</span>
                                <EditableText
                                    text={content.igst}
                                    onTextChange={(newText) => updateElementContent(elementId, { igst: newText })}
                                />
                            </div>
                            <div className="flex justify-between font-bold border-t pt-1">
                                <span>Total Amount:</span>
                                <EditableText
                                    text={content.total}
                                    onTextChange={(newText) => updateElementContent(elementId, { total: newText })}
                                    style={{ fontWeight: 'bold' }}
                                />
                            </div>
                        </div>
                    </div>
                );

            default:
                return (
                    <div style={{ fontSize: `${style.fontSize}px`, color: style.color }}>
                        <EditableText
                            text={content}
                            onTextChange={(newText) => updateElementContent(elementId, newText)}
                            style={{ display: 'block', width: '100%' }}
                        />
                    </div>
                );
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
                
                // Only load canvas elements if they exist and have meaningful content
                // Otherwise keep the default canvas elements (original invoice design)
                if (data.canvas_elements && Object.keys(data.canvas_elements).length > 2) {
                    setCanvasElements(data.canvas_elements);
                } else {
                    // Keep the default canvas elements (original invoice design format)
                    console.log('Using default canvas elements - original invoice design');
                    // Don't override canvasElements state - let it keep the defaults
                }
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
            // Include canvas elements in template data
            const templateWithCanvas = {
                ...template,
                canvas_elements: canvasElements
            };
            
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/admin/pdf-template`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(templateWithCanvas)
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Panel - Form Controls */}
                    <div className="space-y-6">
                        
                        {/* Tabs */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex flex-wrap gap-1 mb-6">
                                <button
                                    onClick={() => setActiveTab('elements')}
                                    className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm ${
                                        activeTab === 'elements'
                                            ? 'bg-purple-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    ➕ Elements
                                </button>
                                <button
                                    onClick={() => setActiveTab('company')}
                                    className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm ${
                                        activeTab === 'company'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    🏢 Company
                                </button>
                                <button
                                    onClick={() => setActiveTab('styling')}
                                    className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm ${
                                        activeTab === 'styling'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    🎨 Styling
                                </button>
                                <button
                                    onClick={() => setActiveTab('logo')}
                                    className={`px-3 py-2 rounded-t-lg font-medium transition-colors text-sm ${
                                        activeTab === 'logo'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    🖼️ Logo
                                </button>
                            </div>

                                {/* Elements Tab */}
                                {activeTab === 'elements' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium text-gray-900">Add Elements</h3>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={() => addCanvasElement('text')}
                                                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-center"
                                            >
                                                <div className="text-2xl mb-2">📝</div>
                                                <div className="font-medium">Text</div>
                                                <div className="text-sm text-gray-500">Add text element</div>
                                            </button>
                                            
                                            <button
                                                onClick={() => addCanvasElement('text-group')}
                                                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-center"
                                            >
                                                <div className="text-2xl mb-2">📄</div>
                                                <div className="font-medium">Text Group</div>
                                                <div className="text-sm text-gray-500">Multiple text lines</div>
                                            </button>
                                            
                                            <button
                                                onClick={() => addCanvasElement('info-section')}
                                                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-center"
                                            >
                                                <div className="text-2xl mb-2">🏢</div>
                                                <div className="font-medium">Info Section</div>
                                                <div className="text-sm text-gray-500">Company/client info</div>
                                            </button>
                                            
                                            <button
                                                onClick={() => addCanvasElement('table')}
                                                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-center"
                                            >
                                                <div className="text-2xl mb-2">📊</div>
                                                <div className="font-medium">Table</div>
                                                <div className="text-sm text-gray-500">Data table</div>
                                            </button>
                                            
                                            <button
                                                onClick={() => addCanvasElement('total-section')}
                                                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-center"
                                            >
                                                <div className="text-2xl mb-2">🧮</div>
                                                <div className="font-medium">Total Summary</div>
                                                <div className="text-sm text-gray-500">Subtotal/Total calc</div>
                                            </button>
                                        </div>
                                        
                                        {selectedElement && (
                                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                                <h4 className="font-medium text-purple-900 mb-2">Selected: {selectedElement}</h4>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => duplicateElement(selectedElement)}
                                                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                                                    >
                                                        Duplicate
                                                    </button>
                                                    <button
                                                        onClick={() => removeCanvasElement(selectedElement)}
                                                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                                
                                                {/* Quick positioning controls */}
                                                <div className="mt-3">
                                                    <div className="text-sm font-medium text-purple-800 mb-2">Position:</div>
                                                    <div className="grid grid-cols-3 gap-1 text-xs">
                                                        <button
                                                            onClick={() => updateElementPosition(selectedElement, 20, 20)}
                                                            className="px-2 py-1 bg-white rounded border border-purple-300 hover:bg-purple-100"
                                                        >
                                                            Top-Left
                                                        </button>
                                                        <button
                                                            onClick={() => updateElementPosition(selectedElement, 200, 20)}
                                                            className="px-2 py-1 bg-white rounded border border-purple-300 hover:bg-purple-100"
                                                        >
                                                            Top-Center
                                                        </button>
                                                        <button
                                                            onClick={() => updateElementPosition(selectedElement, 380, 20)}
                                                            className="px-2 py-1 bg-white rounded border border-purple-300 hover:bg-purple-100"
                                                        >
                                                            Top-Right
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h4 className="font-medium text-blue-900 mb-2">🎯 How to Use</h4>
                                            <div className="text-sm text-blue-800 space-y-1">
                                                <p>• <strong>Add:</strong> Click element buttons to add to canvas</p>
                                                <p>• <strong>Move:</strong> Drag elements to reposition</p>
                                                <p>• <strong>Edit:</strong> Double-click text to edit</p>
                                                <p>• <strong>Select:</strong> Single-click to select elements</p>
                                                <p>• <strong>Delete:</strong> Select element, then click Delete</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

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

                    {/* Middle Panel - Interactive Canvas */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Interactive Canvas</h3>
                                <div className="text-sm text-gray-500">
                                    Click elements to select • Double-click to edit • Drag to move
                                </div>
                            </div>
                            
                            {/* Interactive Canvas - Canva Style */}
                            <div 
                                className="border border-gray-300 bg-white rounded-lg relative overflow-visible cursor-default"
                                style={{ 
                                    fontSize: '12px', 
                                    fontFamily: 'Arial, sans-serif', 
                                    minHeight: '850px',
                                    height: '850px',
                                    width: '600px',
                                    maxWidth: '100%'
                                }}
                                onClick={handleCanvasClick}
                            >
                                {/* Render all canvas elements */}
                                {Object.entries(canvasElements).map(([elementId, element]) => {
                                    const isSelected = selectedElement === elementId;
                                    
                                    return (
                                        <DraggableElement
                                            key={elementId}
                                            elementId={elementId}
                                            x={element.x}
                                            y={element.y}
                                            width={element.width}
                                            height={element.height}
                                            isSelected={isSelected}
                                            onSelect={setSelectedElement}
                                            onPositionChange={(x, y) => updateElementPosition(elementId, x, y)}
                                            onSizeChange={(width, height) => updateElementSize(elementId, width, height)}
                                            canResize={element.type !== 'text'}
                                            zIndex={element.zIndex || 10}
                                        >
                                            {renderElementContent(elementId, element)}
                                        </DraggableElement>
                                    );
                                })}
                                
                                {/* Logo element (if exists) */}
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
                                
                                {/* Canvas guide lines (optional) */}
                                {selectedElement && (
                                    <>
                                        <div className="absolute top-0 left-0 w-full h-px bg-blue-300 opacity-50 pointer-events-none" style={{ top: canvasElements[selectedElement]?.y }} />
                                        <div className="absolute top-0 left-0 w-px h-full bg-blue-300 opacity-50 pointer-events-none" style={{ left: canvasElements[selectedElement]?.x }} />
                                    </>
                                )}
                            </div>
                            
                            {/* Canvas Tools */}
                            <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
                                <div>
                                    Elements: {Object.keys(canvasElements).length} | 
                                    Selected: {selectedElement || 'None'}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCanvasElements({})}
                                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                    >
                                        Clear All
                                    </button>
                                    <button
                                        onClick={() => setSelectedElement(null)}
                                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                                    >
                                        Deselect
                                    </button>
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