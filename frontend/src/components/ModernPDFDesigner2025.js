import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    PhotographIcon as PhotoIcon, 
    DocumentTextIcon, 
    TableIcon as TableCellsIcon, 
    CursorClickIcon as CursorArrowRippleIcon,
    EyeIcon,
    CloudUploadIcon as CloudArrowUpIcon,
    AdjustmentsIcon as AdjustmentsHorizontalIcon,
    DotsHorizontalIcon as GridDotsIcon,
    LockClosedIcon,
    LockOpenIcon,
    TrashIcon,
    DuplicateIcon
} from '@heroicons/react/outline';

const ModernPDFDesigner2025 = ({ currentUser }) => {
    const [template, setTemplate] = useState({
        id: 'template-1',
        name: 'Modern Invoice Template',
        elements: [
            {
                id: 'logo-1',
                type: 'logo',
                x: 30,
                y: 30,
                width: 120,
                height: 60,
                content: null,
                locked: false,
                zIndex: 1
            },
            {
                id: 'title-1',
                type: 'text',
                x: 320,
                y: 40,
                width: 220,
                height: 50,
                content: 'TAX INVOICE',
                fontSize: 28,
                fontWeight: '700',
                color: '#1e293b',
                locked: false,
                zIndex: 2
            },
            {
                id: 'company-1',
                type: 'company-block',
                x: 30,
                y: 110,
                width: 260,
                height: 130,
                content: {
                    name: 'Activus Industrial Design & Build',
                    address: 'Plot no. A-52, Sector no. 27, Phase - 2\nTaloja, Maharashtra, India - 410206',
                    gst: '27ABCCS1234A1Z5',
                    email: 'info@activus.co.in',
                    phone: '+91 99999 99999'
                },
                locked: false,
                zIndex: 3
            },
            {
                id: 'client-1',
                type: 'client-block',
                x: 310,
                y: 110,
                width: 250,
                height: 130,
                content: {
                    label: 'BILLED TO:',
                    placeholder: 'Client information will appear here'
                },
                locked: false,
                zIndex: 4
            },
            {
                id: 'table-1',
                type: 'table',
                x: 30,
                y: 260,
                width: 530,
                height: 180,
                content: {
                    headers: ['Item Description', 'Qty', 'Rate', 'Amount', 'GST', 'Total'],
                    headerBg: '#f1f5f9',
                    headerTextColor: '#374151',
                    rowBg: '#ffffff',
                    altRowBg: '#f8fafc',
                    borderColor: '#e2e8f0'
                },
                locked: false,
                zIndex: 5
            },
            {
                id: 'summary-1',
                type: 'summary-block',
                x: 360,
                y: 460,
                width: 200,
                height: 120,
                content: {
                    currency: 'Rs.',
                    fields: ['Subtotal', 'GST (18%)', 'Total Amount', 'Advance', 'Net Due']
                },
                locked: false,
                zIndex: 6
            }
        ],
        canvas: {
            width: 595,
            height: 842,
            zoom: 0.75,
            grid: true,
            snapToGrid: true,
            backgroundColor: '#ffffff'
        }
    });

    const [selectedElement, setSelectedElement] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showPropertyPanel, setShowPropertyPanel] = useState(true);
    const [showElementsPanel, setShowElementsPanel] = useState(true);
    const [activeTab, setActiveTab] = useState('elements');
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    const canvasRef = useRef(null);

    // Element templates for adding new elements
    const elementTemplates = [
        {
            type: 'text',
            icon: DocumentTextIcon,
            label: 'Text',
            template: {
                type: 'text',
                width: 150,
                height: 30,
                content: 'New Text',
                fontSize: 16,
                fontWeight: '400',
                color: '#1e293b'
            }
        },
        {
            type: 'logo',
            icon: PhotoIcon,
            label: 'Logo',
            template: {
                type: 'logo',
                width: 100,
                height: 50,
                content: null
            }
        },
        {
            type: 'table',
            icon: TableCellsIcon,
            label: 'Table',
            template: {
                type: 'table',
                width: 400,
                height: 150,
                content: {
                    headers: ['Column 1', 'Column 2', 'Column 3'],
                    headerBg: '#f1f5f9',
                    headerTextColor: '#374151',
                    rowBg: '#ffffff',
                    altRowBg: '#f8fafc',
                    borderColor: '#e2e8f0'
                }
            }
        }
    ];

    // Save state to history for undo/redo
    const saveToHistory = useCallback(() => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(template)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex, template]);

    // Undo/Redo functions
    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setTemplate(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setTemplate(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    // Handle element selection
    const handleElementClick = (element, e) => {
        e.stopPropagation();
        setSelectedElement(element);
    };

    // Handle canvas click (deselect)
    const handleCanvasClick = () => {
        setSelectedElement(null);
    };

    // Add new element
    const addElement = (elementTemplate) => {
        const newElement = {
            ...elementTemplate.template,
            id: `${elementTemplate.type}-${Date.now()}`,
            x: 50,
            y: 50,
            locked: false,
            zIndex: Math.max(...template.elements.map(el => el.zIndex), 0) + 1
        };

        setTemplate(prev => ({
            ...prev,
            elements: [...prev.elements, newElement]
        }));
        
        setSelectedElement(newElement);
        saveToHistory();
    };

    // Delete selected element
    const deleteElement = () => {
        if (selectedElement) {
            setTemplate(prev => ({
                ...prev,
                elements: prev.elements.filter(el => el.id !== selectedElement.id)
            }));
            setSelectedElement(null);
            saveToHistory();
        }
    };

    // Duplicate selected element
    const duplicateElement = () => {
        if (selectedElement) {
            const newElement = {
                ...selectedElement,
                id: `${selectedElement.type}-${Date.now()}`,
                x: selectedElement.x + 20,
                y: selectedElement.y + 20,
                zIndex: Math.max(...template.elements.map(el => el.zIndex), 0) + 1
            };

            setTemplate(prev => ({
                ...prev,
                elements: [...prev.elements, newElement]
            }));
            
            setSelectedElement(newElement);
            saveToHistory();
        }
    };

    // Handle mouse down for dragging
    const handleMouseDown = useCallback((e, element) => {
        if (element.locked) return;
        
        e.preventDefault();
        setIsDragging(true);
        const rect = canvasRef.current.getBoundingClientRect();
        setDragStart({
            x: (e.clientX - rect.left) / template.canvas.zoom - element.x,
            y: (e.clientY - rect.top) / template.canvas.zoom - element.y
        });
        setSelectedElement(element);
    }, [template.canvas.zoom]);

    // Handle mouse move for dragging
    const handleMouseMove = useCallback((e) => {
        if (!isDragging || !selectedElement || selectedElement.locked) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const newX = (e.clientX - rect.left) / template.canvas.zoom - dragStart.x;
        const newY = (e.clientY - rect.top) / template.canvas.zoom - dragStart.y;

        // Snap to grid if enabled
        const snapSize = 10;
        const snappedX = template.canvas.snapToGrid ? Math.round(newX / snapSize) * snapSize : newX;
        const snappedY = template.canvas.snapToGrid ? Math.round(newY / snapSize) * snapSize : newY;

        updateElement(selectedElement.id, {
            x: Math.max(0, Math.min(snappedX, template.canvas.width - selectedElement.width)),
            y: Math.max(0, Math.min(snappedY, template.canvas.height - selectedElement.height))
        });
    }, [isDragging, selectedElement, dragStart, template.canvas.zoom, template.canvas.snapToGrid, template.canvas.width]);

    // Handle mouse up
    const handleMouseUp = useCallback(() => {
        if (isDragging) {
            setIsDragging(false);
            saveToHistory();
        }
        setIsResizing(false);
    }, [isDragging, saveToHistory]);

    // Update element properties
    const updateElement = (elementId, updates) => {
        setTemplate(prev => ({
            ...prev,
            elements: prev.elements.map(el => 
                el.id === elementId ? { ...el, ...updates } : el
            )
        }));
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            redo();
                        } else {
                            undo();
                        }
                        break;
                    case 'd':
                        e.preventDefault();
                        duplicateElement();
                        break;
                    case 'Delete':
                    case 'Backspace':
                        if (selectedElement && !selectedElement.locked) {
                            e.preventDefault();
                            deleteElement();
                        }
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedElement, undo, redo, duplicateElement, deleteElement]);

    // Add mouse event listeners
    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    // Resize handles component with smooth animations
    const ResizeHandles = ({ element }) => {
        if (!selectedElement || selectedElement.id !== element.id || element.locked) return null;

        const handleResize = (direction, e) => {
            e.stopPropagation();
            setIsResizing(true);
            // Enhanced resize logic with constraints
        };

        return (
            <motion.div 
                className="absolute pointer-events-none"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
            >
                {/* Corner handles */}
                {['nw', 'ne', 'sw', 'se'].map((direction) => {
                    const positions = {
                        nw: { left: -6, top: -6, cursor: 'nw-resize' },
                        ne: { right: -6, top: -6, cursor: 'ne-resize' },
                        sw: { left: -6, bottom: -6, cursor: 'sw-resize' },
                        se: { right: -6, bottom: -6, cursor: 'se-resize' }
                    };

                    return (
                        <motion.div
                            key={direction}
                            className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow-lg pointer-events-auto hover:bg-blue-600 transition-colors"
                            style={{
                                ...positions[direction],
                                cursor: positions[direction].cursor
                            }}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onMouseDown={(e) => handleResize(direction, e)}
                        />
                    );
                })}
            </motion.div>
        );
    };

    // Render element with animations and modern styling
    const renderElement = (element) => {
        const isSelected = selectedElement && selectedElement.id === element.id;
        
        return (
            <motion.div
                key={element.id}
                className={`absolute cursor-move ${element.locked ? 'cursor-not-allowed' : 'cursor-move'}`}
                style={{
                    left: element.x,
                    top: element.y,
                    width: element.width,
                    height: element.height,
                    zIndex: element.zIndex
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                    opacity: 1, 
                    scale: 1,
                    boxShadow: isSelected ? '0 0 0 2px #3b82f6, 0 8px 25px rgba(59, 130, 246, 0.15)' : 'none'
                }}
                whileHover={{ 
                    boxShadow: isSelected ? '0 0 0 2px #3b82f6, 0 8px 25px rgba(59, 130, 246, 0.15)' : '0 2px 10px rgba(0, 0, 0, 0.1)' 
                }}
                transition={{ duration: 0.2 }}
                onMouseDown={(e) => handleMouseDown(e, element)}
                onClick={(e) => handleElementClick(element, e)}
            >
                {renderElementContent(element)}
                <ResizeHandles element={element} />
                
                {/* Lock indicator */}
                {element.locked && (
                    <div className="absolute top-1 right-1 p-1 bg-gray-800 text-white rounded-full">
                        <LockClosedIcon className="w-3 h-3" />
                    </div>
                )}
            </motion.div>
        );
    };

    // Render element content based on type
    const renderElementContent = (element) => {
        switch (element.type) {
            case 'logo':
                return (
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500">
                        {element.content ? (
                            <img src={element.content} alt="Logo" className="max-w-full max-h-full object-contain rounded" />
                        ) : (
                            <div className="text-center">
                                <PhotoIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                <div className="text-xs font-medium">Logo</div>
                            </div>
                        )}
                    </div>
                );

            case 'text':
                return (
                    <div
                        className="w-full h-full flex items-center px-2 bg-transparent"
                        style={{
                            fontSize: element.fontSize,
                            fontWeight: element.fontWeight,
                            color: element.color
                        }}
                    >
                        {element.content}
                    </div>
                );

            case 'company-block':
                return (
                    <div className="w-full h-full bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 text-sm">
                        <div className="font-bold text-green-800 mb-2">BILLED BY:</div>
                        <div className="font-semibold text-gray-900">{element.content.name}</div>
                        <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">{element.content.address}</div>
                        <div className="text-xs text-gray-600">GST: {element.content.gst}</div>
                        <div className="text-xs text-gray-600">{element.content.email}</div>
                        <div className="text-xs text-gray-600">{element.content.phone}</div>
                    </div>
                );

            case 'client-block':
                return (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <div className="font-bold text-blue-800 mb-2">{element.content.label}</div>
                        <div className="text-gray-500 italic">{element.content.placeholder}</div>
                    </div>
                );

            case 'table':
                return (
                    <div className="w-full h-full bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full h-full text-xs">
                            <thead>
                                <tr style={{ backgroundColor: element.content.headerBg }}>
                                    {element.content.headers.map((header, index) => (
                                        <th key={index} className="p-2 text-left font-semibold border-r border-gray-200 last:border-r-0">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-200">
                                    <td className="p-2 border-r border-gray-200">Sample Construction Work</td>
                                    <td className="p-2 border-r border-gray-200">100</td>
                                    <td className="p-2 border-r border-gray-200">Rs. 1,000</td>
                                    <td className="p-2 border-r border-gray-200">Rs. 100,000</td>
                                    <td className="p-2 border-r border-gray-200">Rs. 18,000</td>
                                    <td className="p-2">Rs. 118,000</td>
                                </tr>
                                <tr style={{ backgroundColor: element.content.altRowBg }}>
                                    <td className="p-2 border-r border-gray-200">Additional Work</td>
                                    <td className="p-2 border-r border-gray-200">50</td>
                                    <td className="p-2 border-r border-gray-200">Rs. 800</td>
                                    <td className="p-2 border-r border-gray-200">Rs. 40,000</td>
                                    <td className="p-2 border-r border-gray-200">Rs. 7,200</td>
                                    <td className="p-2">Rs. 47,200</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                );

            case 'summary-block':
                return (
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-3 text-sm">
                        <div className="space-y-2">
                            {element.content.fields.map((field, index) => {
                                const amounts = [140000, 25200, 165200, -20000, 145200];
                                return (
                                    <div key={index} className="flex justify-between items-center">
                                        <span className="text-gray-700">{field}:</span>
                                        <span className="font-semibold">
                                            {element.content.currency} {amounts[index]?.toLocaleString() || '0'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="h-screen bg-gray-50 flex overflow-hidden">
            {/* Left Elements Panel */}
            <AnimatePresence>
                {showElementsPanel && (
                    <motion.div
                        className="w-64 bg-white border-r border-gray-200 flex flex-col"
                        initial={{ x: -264 }}
                        animate={{ x: 0 }}
                        exit={{ x: -264 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    >
                        {/* Panel Header */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">Elements</h3>
                                <button 
                                    onClick={() => setShowElementsPanel(false)}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Element Templates */}
                        <div className="p-4 space-y-3">
                            <div className="text-sm font-medium text-gray-700 mb-3">Add Elements</div>
                            {elementTemplates.map((template) => (
                                <motion.button
                                    key={template.type}
                                    onClick={() => addElement(template)}
                                    className="w-full p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-lg flex items-center space-x-3 transition-all duration-200"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <template.icon className="w-5 h-5 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">{template.label}</span>
                                </motion.button>
                            ))}
                        </div>

                        {/* Layer List */}
                        <div className="flex-1 p-4">
                            <div className="text-sm font-medium text-gray-700 mb-3">Layers</div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {template.elements
                                    .sort((a, b) => b.zIndex - a.zIndex)
                                    .map((element) => (
                                    <motion.div
                                        key={element.id}
                                        className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                            selectedElement?.id === element.id
                                                ? 'bg-blue-50 border-blue-200'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                        }`}
                                        onClick={() => setSelectedElement(element)}
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                {element.locked ? (
                                                    <LockClosedIcon className="w-3 h-3 text-gray-400" />
                                                ) : (
                                                    <LockOpenIcon className="w-3 h-3 text-gray-400" />
                                                )}
                                                <span className="text-xs font-medium capitalize">
                                                    {element.type.replace('-', ' ')}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500">{element.zIndex}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Canvas Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Toolbar */}
                <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
                    <div className="flex items-center space-x-6">
                        {!showElementsPanel && (
                            <button
                                onClick={() => setShowElementsPanel(true)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <GridDotsIcon className="w-5 h-5 text-gray-600" />
                            </button>
                        )}
                        
                        <h1 className="text-xl font-bold text-gray-900">Visual Invoice Designer 2025</h1>
                        
                        <div className="flex items-center space-x-3">
                            <motion.button
                                onClick={undo}
                                disabled={historyIndex <= 0}
                                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                                whileTap={{ scale: 0.95 }}
                            >
                                ↶ Undo
                            </motion.button>
                            
                            <motion.button
                                onClick={redo}
                                disabled={historyIndex >= history.length - 1}
                                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                                whileTap={{ scale: 0.95 }}
                            >
                                ↷ Redo
                            </motion.button>
                            
                            <div className="text-sm text-gray-600">
                                Zoom: {Math.round(template.canvas.zoom * 100)}%
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        {selectedElement && (
                            <div className="flex items-center space-x-2">
                                <motion.button
                                    onClick={duplicateElement}
                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <DuplicateIcon className="w-4 h-4" />
                                </motion.button>
                                
                                <motion.button
                                    onClick={deleteElement}
                                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </motion.button>
                            </div>
                        )}
                        
                        <motion.button
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <EyeIcon className="w-4 h-4" />
                            <span>Preview PDF</span>
                        </motion.button>
                        
                        <motion.button
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <CloudArrowUpIcon className="w-4 h-4" />
                            <span>Save Template</span>
                        </motion.button>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 flex">
                    <div className="flex-1 p-8 overflow-auto bg-gray-100">
                        <div className="flex justify-center">
                            <motion.div
                                ref={canvasRef}
                                className="relative bg-white shadow-2xl rounded-lg"
                                style={{
                                    width: template.canvas.width * template.canvas.zoom,
                                    height: template.canvas.height * template.canvas.zoom,
                                    transform: `scale(${template.canvas.zoom})`,
                                    transformOrigin: 'top left'
                                }}
                                onClick={handleCanvasClick}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                {/* Grid overlay */}
                                {template.canvas.grid && (
                                    <div 
                                        className="absolute inset-0 pointer-events-none opacity-10"
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
                            </motion.div>
                        </div>
                    </div>

                    {/* Right Property Panel */}
                    <AnimatePresence>
                        {showPropertyPanel && selectedElement && (
                            <motion.div
                                className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto"
                                initial={{ x: 320 }}
                                animate={{ x: 0 }}
                                exit={{ x: 320 }}
                                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-gray-900">Properties</h3>
                                    <button 
                                        onClick={() => setShowPropertyPanel(false)}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Element Type
                                        </label>
                                        <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm capitalize font-medium">
                                            {selectedElement.type.replace('-', ' ')}
                                        </div>
                                    </div>

                                    {/* Position & Size */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">Position & Size</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">X Position</label>
                                                <input
                                                    type="number"
                                                    value={selectedElement.x}
                                                    onChange={(e) => updateElement(selectedElement.id, { x: parseInt(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Y Position</label>
                                                <input
                                                    type="number"
                                                    value={selectedElement.y}
                                                    onChange={(e) => updateElement(selectedElement.id, { y: parseInt(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Width</label>
                                                <input
                                                    type="number"
                                                    value={selectedElement.width}
                                                    onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Height</label>
                                                <input
                                                    type="number"
                                                    value={selectedElement.height}
                                                    onChange={(e) => updateElement(selectedElement.id, { height: parseInt(e.target.value) })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Text-specific properties */}
                                    {selectedElement.type === 'text' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Text Content</label>
                                                <input
                                                    type="text"
                                                    value={selectedElement.content}
                                                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Font Size</label>
                                                    <input
                                                        type="number"
                                                        min="8"
                                                        max="72"
                                                        value={selectedElement.fontSize}
                                                        onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Font Weight</label>
                                                    <select
                                                        value={selectedElement.fontWeight}
                                                        onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                    >
                                                        <option value="300">Light</option>
                                                        <option value="400">Normal</option>
                                                        <option value="500">Medium</option>
                                                        <option value="600">Semibold</option>
                                                        <option value="700">Bold</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Text Color</label>
                                                <input
                                                    type="color"
                                                    value={selectedElement.color}
                                                    onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                                                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Element Actions */}
                                    <div className="pt-4 border-t border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedElement.locked}
                                                    onChange={(e) => updateElement(selectedElement.id, { locked: e.target.checked })}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label className="text-sm text-gray-700">Lock Element</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default ModernPDFDesigner2025;