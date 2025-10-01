import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const ModernPDFDesigner = ({ currentUser }) => {
    const [template, setTemplate] = useState({
        id: 'template-1',
        name: 'Modern Invoice Template',
        elements: [
            {
                id: 'logo',
                type: 'logo',
                x: 20,
                y: 20,
                width: 120,
                height: 60,
                content: null,
                locked: false
            },
            {
                id: 'title',
                type: 'text',
                x: 300,
                y: 30,
                width: 200,
                height: 40,
                content: 'TAX INVOICE',
                fontSize: 24,
                fontWeight: 'bold',
                color: '#1a1a1a',
                locked: false
            },
            {
                id: 'company-info',
                type: 'company-block',
                x: 20,
                y: 100,
                width: 250,
                height: 120,
                content: {
                    name: 'Activus Industrial Design & Build',
                    address: 'Plot no. A-52, Sector no. 27, Phase - 2\nTaloja, Maharashtra, India - 410206',
                    gst: '27ABCCS1234A1Z5',
                    email: 'info@activus.co.in',
                    phone: '+91 99999 99999'
                },
                locked: false
            },
            {
                id: 'client-info',
                type: 'client-block',
                x: 300,
                y: 100,
                width: 250,
                height: 120,
                content: {
                    label: 'BILLED TO:',
                    placeholder: 'Client information will appear here'
                },
                locked: false
            },
            {
                id: 'invoice-table',
                type: 'table',
                x: 20,
                y: 250,
                width: 530,
                height: 200,
                content: {
                    headers: ['Item', 'Qty', 'Rate', 'Amount', 'GST', 'Total'],
                    headerBg: '#f3f4f6',
                    headerTextColor: '#374151',
                    rowBg: '#ffffff',
                    altRowBg: '#f9fafb',
                    borderColor: '#d1d5db'
                },
                locked: false
            },
            {
                id: 'summary',
                type: 'summary-block',
                x: 350,
                y: 470,
                width: 200,
                height: 100,
                content: {
                    currency: 'Rs.',
                    fields: ['Subtotal', 'GST (18%)', 'Total Amount']
                },
                locked: false
            }
        ],
        canvas: {
            width: 595, // A4 width in points
            height: 842, // A4 height in points
            zoom: 0.7,
            grid: true,
            snapToGrid: true
        }
    });

    const [selectedElement, setSelectedElement] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showPropertyPanel, setShowPropertyPanel] = useState(true);
    const canvasRef = useRef(null);

    // Handle element selection
    const handleElementClick = (element, e) => {
        e.stopPropagation();
        setSelectedElement(element);
    };

    // Handle canvas click (deselect)
    const handleCanvasClick = () => {
        setSelectedElement(null);
    };

    // Handle mouse down for dragging
    const handleMouseDown = (e, element) => {
        if (element.locked) return;
        
        setIsDragging(true);
        setDragStart({
            x: e.clientX - element.x,
            y: e.clientY - element.y
        });
        setSelectedElement(element);
    };

    // Handle mouse move for dragging
    const handleMouseMove = (e) => {
        if (!isDragging || !selectedElement) return;

        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Snap to grid if enabled
        const snapSize = 10;
        const snappedX = template.canvas.snapToGrid ? Math.round(newX / snapSize) * snapSize : newX;
        const snappedY = template.canvas.snapToGrid ? Math.round(newY / snapSize) * snapSize : newY;

        updateElement(selectedElement.id, {
            x: Math.max(0, Math.min(snappedX, template.canvas.width - selectedElement.width)),
            y: Math.max(0, Math.min(snappedY, template.canvas.height - selectedElement.height))
        });
    };

    // Handle mouse up
    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    // Add mouse event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);

        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, selectedElement, dragStart]);

    // Update element properties
    const updateElement = (elementId, updates) => {
        setTemplate(prev => ({
            ...prev,
            elements: prev.elements.map(el => 
                el.id === elementId ? { ...el, ...updates } : el
            )
        }));
    };

    // Resize handles component
    const ResizeHandles = ({ element }) => {
        if (!selectedElement || selectedElement.id !== element.id || element.locked) return null;

        const handleResize = (direction, e) => {
            e.stopPropagation();
            setIsResizing(true);
            // Implement resize logic based on direction
        };

        return (
            <div className="absolute pointer-events-none">
                {/* Corner handles */}
                <div 
                    className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-nw-resize pointer-events-auto"
                    style={{ left: -4, top: -4 }}
                    onMouseDown={(e) => handleResize('nw', e)}
                />
                <div 
                    className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-ne-resize pointer-events-auto"
                    style={{ right: -4, top: -4 }}
                    onMouseDown={(e) => handleResize('ne', e)}
                />
                <div 
                    className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-sw-resize pointer-events-auto"
                    style={{ left: -4, bottom: -4 }}
                    onMouseDown={(e) => handleResize('sw', e)}
                />
                <div 
                    className="absolute w-2 h-2 bg-blue-500 border border-white rounded-full cursor-se-resize pointer-events-auto"
                    style={{ right: -4, bottom: -4 }}
                    onMouseDown={(e) => handleResize('se', e)}
                />
            </div>
        );
    };

    // Render element based on type
    const renderElement = (element) => {
        const isSelected = selectedElement && selectedElement.id === element.id;
        const baseStyle = {
            position: 'absolute',
            left: element.x,
            top: element.y,
            width: element.width,
            height: element.height,
            cursor: element.locked ? 'default' : 'move',
            border: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
            borderRadius: '4px'
        };

        switch (element.type) {
            case 'logo':
                return (
                    <div
                        key={element.id}
                        style={baseStyle}
                        className="bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-sm"
                        onMouseDown={(e) => handleMouseDown(e, element)}
                        onClick={(e) => handleElementClick(element, e)}
                    >
                        {element.content ? (
                            <img src={element.content} alt="Logo" className="max-w-full max-h-full object-contain" />
                        ) : (
                            <div className="text-center">
                                <div className="text-2xl mb-1">🏢</div>
                                <div>Logo</div>
                            </div>
                        )}
                        <ResizeHandles element={element} />
                    </div>
                );

            case 'text':
                return (
                    <div
                        key={element.id}
                        style={{
                            ...baseStyle,
                            fontSize: element.fontSize,
                            fontWeight: element.fontWeight,
                            color: element.color,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px'
                        }}
                        className="bg-transparent"
                        onMouseDown={(e) => handleMouseDown(e, element)}
                        onClick={(e) => handleElementClick(element, e)}
                    >
                        {element.content}
                        <ResizeHandles element={element} />
                    </div>
                );

            case 'company-block':
                return (
                    <div
                        key={element.id}
                        style={baseStyle}
                        className="bg-green-50 p-3 text-sm"
                        onMouseDown={(e) => handleMouseDown(e, element)}
                        onClick={(e) => handleElementClick(element, e)}
                    >
                        <div className="font-semibold text-green-800 mb-1">BILLED BY:</div>
                        <div className="font-medium">{element.content.name}</div>
                        <div className="text-xs mt-1 whitespace-pre-line">{element.content.address}</div>
                        <div className="text-xs">GST: {element.content.gst}</div>
                        <div className="text-xs">{element.content.email}</div>
                        <div className="text-xs">{element.content.phone}</div>
                        <ResizeHandles element={element} />
                    </div>
                );

            case 'client-block':
                return (
                    <div
                        key={element.id}
                        style={baseStyle}
                        className="bg-blue-50 p-3 text-sm"
                        onMouseDown={(e) => handleMouseDown(e, element)}
                        onClick={(e) => handleElementClick(element, e)}
                    >
                        <div className="font-semibold text-blue-800 mb-1">{element.content.label}</div>
                        <div className="text-gray-600 italic">{element.content.placeholder}</div>
                        <ResizeHandles element={element} />
                    </div>
                );

            case 'table':
                return (
                    <div
                        key={element.id}
                        style={baseStyle}
                        className="bg-white border border-gray-300"
                        onMouseDown={(e) => handleMouseDown(e, element)}
                        onClick={(e) => handleElementClick(element, e)}
                    >
                        <table className="w-full h-full text-xs">
                            <thead>
                                <tr style={{ backgroundColor: element.content.headerBg }}>
                                    {element.content.headers.map((header, index) => (
                                        <th key={index} className="p-1 border border-gray-300 text-left">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-1 border border-gray-300">Sample Item</td>
                                    <td className="p-1 border border-gray-300">1</td>
                                    <td className="p-1 border border-gray-300">1,000</td>
                                    <td className="p-1 border border-gray-300">1,000</td>
                                    <td className="p-1 border border-gray-300">180</td>
                                    <td className="p-1 border border-gray-300">1,180</td>
                                </tr>
                                <tr style={{ backgroundColor: element.content.altRowBg }}>
                                    <td className="p-1 border border-gray-300">Another Item</td>
                                    <td className="p-1 border border-gray-300">2</td>
                                    <td className="p-1 border border-gray-300">500</td>
                                    <td className="p-1 border border-gray-300">1,000</td>
                                    <td className="p-1 border border-gray-300">180</td>
                                    <td className="p-1 border border-gray-300">1,180</td>
                                </tr>
                            </tbody>
                        </table>
                        <ResizeHandles element={element} />
                    </div>
                );

            case 'summary-block':
                return (
                    <div
                        key={element.id}
                        style={baseStyle}
                        className="bg-gray-50 p-2 text-sm"
                        onMouseDown={(e) => handleMouseDown(e, element)}
                        onClick={(e) => handleElementClick(element, e)}
                    >
                        {element.content.fields.map((field, index) => (
                            <div key={index} className="flex justify-between mb-1">
                                <span>{field}:</span>
                                <span>{element.content.currency} {(1000 * (index + 1)).toLocaleString()}</span>
                            </div>
                        ))}
                        <ResizeHandles element={element} />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="h-screen bg-gray-100 flex">
            {/* Left Toolbar */}
            <div className="w-16 bg-gray-900 flex flex-col items-center py-4 space-y-4">
                <button className="p-3 bg-blue-600 rounded-lg text-white hover:bg-blue-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                </button>
                <button className="p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </button>
                <button className="p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
                <button className="p-3 bg-gray-700 rounded-lg text-white hover:bg-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                </button>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Toolbar */}
                <div className="h-16 bg-white border-b flex items-center px-4 justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl font-semibold text-gray-900">Modern Invoice Designer</h1>
                        <div className="flex items-center space-x-2">
                            <button className="px-3 py-1 bg-gray-200 rounded text-sm">
                                Zoom: {Math.round(template.canvas.zoom * 100)}%
                            </button>
                            <button className="px-3 py-1 bg-gray-200 rounded text-sm">
                                Grid: {template.canvas.grid ? 'On' : 'Off'}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            Preview PDF
                        </button>
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Save Template
                        </button>
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 flex">
                    <div className="flex-1 p-8 overflow-auto">
                        <div className="flex justify-center">
                            <div
                                ref={canvasRef}
                                className="relative bg-white shadow-2xl"
                                style={{
                                    width: template.canvas.width * template.canvas.zoom,
                                    height: template.canvas.height * template.canvas.zoom,
                                    transform: `scale(${template.canvas.zoom})`,
                                    transformOrigin: 'top left'
                                }}
                                onClick={handleCanvasClick}
                            >
                                {/* Grid overlay */}
                                {template.canvas.grid && (
                                    <div 
                                        className="absolute inset-0 pointer-events-none opacity-20"
                                        style={{
                                            backgroundImage: `
                                                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                                                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                                            `,
                                            backgroundSize: '20px 20px'
                                        }}
                                    />
                                )}

                                {/* Render all elements */}
                                {template.elements.map(renderElement)}
                            </div>
                        </div>
                    </div>

                    {/* Right Property Panel */}
                    {showPropertyPanel && (
                        <div className="w-80 bg-white border-l p-4 overflow-y-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Properties</h3>
                                <button 
                                    onClick={() => setShowPropertyPanel(false)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    ✕
                                </button>
                            </div>

                            {selectedElement ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Element Type
                                        </label>
                                        <div className="px-3 py-2 bg-gray-100 rounded text-sm capitalize">
                                            {selectedElement.type.replace('-', ' ')}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">X</label>
                                            <input
                                                type="number"
                                                value={selectedElement.x}
                                                onChange={(e) => updateElement(selectedElement.id, { x: parseInt(e.target.value) })}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Y</label>
                                            <input
                                                type="number"
                                                value={selectedElement.y}
                                                onChange={(e) => updateElement(selectedElement.id, { y: parseInt(e.target.value) })}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                                            <input
                                                type="number"
                                                value={selectedElement.width}
                                                onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                                            <input
                                                type="number"
                                                value={selectedElement.height}
                                                onChange={(e) => updateElement(selectedElement.id, { height: parseInt(e.target.value) })}
                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                    </div>

                                    {selectedElement.type === 'text' && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Text Content</label>
                                                <input
                                                    type="text"
                                                    value={selectedElement.content}
                                                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Font Size</label>
                                                <input
                                                    type="number"
                                                    value={selectedElement.fontSize}
                                                    onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                                <input
                                                    type="color"
                                                    value={selectedElement.color}
                                                    onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                                                    className="w-full h-8 border border-gray-300 rounded"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedElement.locked}
                                            onChange={(e) => updateElement(selectedElement.id, { locked: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <label className="text-sm text-gray-700">Lock Element</label>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-500">
                                    <div className="text-4xl mb-2">👆</div>
                                    <p>Select an element to edit its properties</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModernPDFDesigner;