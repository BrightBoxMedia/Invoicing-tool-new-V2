import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';

const PixelPerfectInvoiceTemplate = ({ invoiceData, projectData, clientData, companyData }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableCompanyData, setEditableCompanyData] = useState({
        address: companyData?.address || 'AIDB Building, Industrial Area, Bangalore, Karnataka, India - 560001',
        phone: companyData?.phone || '+91 87785 07177',
        email: companyData?.email || 'info@activusdesignbuild.in'
    });

    // Company logo - convert to base64 for reliable PDF generation and cross-origin loading
    const logoUrl = 'https://customer-assets.emergentagent.com/job_activus-manager/artifacts/8scn4iq7_horizontal-with-tagline-bg-fff-1500x1500.pdf.png';

    // Calculate GST breakdown based on project GST type
    const calculateGSTBreakdown = (amount, gstRate, gstType) => {
        const gstAmount = amount * (gstRate / 100);
        
        if (gstType === 'CGST_SGST') {
            return {
                cgst: gstAmount / 2,
                sgst: gstAmount / 2,
                igst: 0,
                total: gstAmount,
                cgstRate: gstRate / 2,
                sgstRate: gstRate / 2,
                igstRate: 0
            };
        } else {
            return {
                cgst: 0,
                sgst: 0,
                igst: gstAmount,
                total: gstAmount,
                cgstRate: 0,
                sgstRate: 0,
                igstRate: gstRate
            };
        }
    };

    // Calculate totals
    const calculateTotals = () => {
        let subtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;

        invoiceData?.items?.forEach(item => {
            const itemAmount = item.quantity * item.rate;
            subtotal += itemAmount;
            
            const gstBreakdown = calculateGSTBreakdown(
                itemAmount, 
                item.gst_rate || 18, 
                projectData?.gst_type || 'IGST'
            );
            
            totalCGST += gstBreakdown.cgst;
            totalSGST += gstBreakdown.sgst;
            totalIGST += gstBreakdown.igst;
        });

        const totalGST = totalCGST + totalSGST + totalIGST;
        const grandTotal = subtotal + totalGST;

        return {
            subtotal,
            totalCGST,
            totalSGST,
            totalIGST,
            totalGST,
            grandTotal,
            cgstRate: invoiceData?.items?.[0]?.gst_rate ? (invoiceData.items[0].gst_rate / 2) : 9,
            sgstRate: invoiceData?.items?.[0]?.gst_rate ? (invoiceData.items[0].gst_rate / 2) : 9,
            igstRate: invoiceData?.items?.[0]?.gst_rate || 18
        };
    };

    const totals = calculateTotals();

    const exportToPDF = () => {
        const element = document.getElementById('pixel-perfect-invoice-template');
        const options = {
            margin: 0.2,
            filename: `invoice-${invoiceData?.invoice_number || 'new'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                allowTaint: false
            },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        
        // Temporarily hide edit controls during PDF generation
        const editControls = document.querySelector('.edit-controls');
        if (editControls) editControls.style.display = 'none';
        
        html2pdf().set(options).from(element).save().then(() => {
            if (editControls) editControls.style.display = 'block';
        });
    };

    const handleEdit = () => {
        setIsEditing(!isEditing);
    };

    const handleCompanyDataChange = (field, value) => {
        setEditableCompanyData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Default invoice items if none provided (for preview purposes)
    const defaultItems = [
        {
            description: 'Foundation Work - Amendment Test',
            unit: 'Cum',
            quantity: 20.00,
            rate: 5000.00,
            amount: 100000.00,
            gst_rate: 18
        }
    ];

    const items = invoiceData?.items || defaultItems;

    return (
        <div className="bg-white">
            {/* Editor Controls */}
            <div className="edit-controls mb-4 p-4 bg-gray-50 border-b print:hidden">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Pixel Perfect Invoice Template</h3>
                    <div className="flex space-x-3">
                        <button
                            onClick={handleEdit}
                            className={`px-4 py-2 rounded-lg font-medium ${
                                isEditing 
                                    ? 'bg-green-600 text-white hover:bg-green-700' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {isEditing ? '✓ Save Changes' : '✏️ Edit Company Info'}
                        </button>
                        <button
                            onClick={exportToPDF}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                        >
                            📄 Export PDF
                        </button>
                    </div>
                </div>
                {isEditing && (
                    <p className="text-sm text-gray-600 mt-2">
                        ℹ️ Only company address, phone, and email can be customized. All other elements are locked to maintain design consistency.
                    </p>
                )}
            </div>

            {/* Pixel Perfect Invoice Template - Matches Screenshot Exactly */}
            <div 
                id="pixel-perfect-invoice-template" 
                style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    margin: '0 auto', 
                    padding: '0',
                    fontFamily: 'Montserrat, Arial, sans-serif',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#000000',
                    backgroundColor: '#ffffff'
                }}
            >
                {/* Header Section with Logo and Company Name */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    paddingTop: '20mm',
                    paddingBottom: '10mm',
                    borderBottom: 'none'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        {/* Company Logo */}
                        <div style={{ marginBottom: '15px' }}>
                            <img 
                                src={logoUrl}
                                alt="Activus Industrial Design & Build LLP"
                                style={{ 
                                    height: '60px',
                                    width: 'auto',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                        
                        {/* Company Name and Tagline */}
                        <h1 style={{ 
                            fontSize: '28px', 
                            fontWeight: 'bold', 
                            color: '#00ACC1',
                            margin: '0 0 8px 0',
                            letterSpacing: '2px',
                            textAlign: 'center'
                        }}>
                            ACTIVUS INDUSTRIAL DESIGN & BUILD LLP
                        </h1>
                        <p style={{ 
                            fontSize: '14px', 
                            color: '#666666',
                            margin: '0',
                            textAlign: 'center',
                            fontWeight: '400'
                        }}>
                            Professional Industrial Solutions
                        </p>
                    </div>
                </div>

                {/* TAX INVOICE Title */}
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '30px',
                    paddingLeft: '20mm',
                    paddingRight: '20mm'
                }}>
                    <h2 style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold', 
                        color: '#000000',
                        margin: '0',
                        letterSpacing: '1px'
                    }}>
                        TAX INVOICE
                    </h2>
                </div>

                {/* Invoice Details Grid */}
                <div style={{ 
                    paddingLeft: '20mm',
                    paddingRight: '20mm',
                    marginBottom: '25px'
                }}>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        border: '2px solid #E0E0E0',
                        fontSize: '12px'
                    }}>
                        <tbody>
                            <tr>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#F8F9FA',
                                    fontWeight: 'bold',
                                    width: '15%'
                                }}>
                                    Invoice Number:
                                </td>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#FFFFFF',
                                    width: '35%'
                                }}>
                                    {invoiceData?.invoice_number || 'INV-000001'}
                                </td>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#F8F9FA',
                                    fontWeight: 'bold',
                                    width: '15%'
                                }}>
                                    Date:
                                </td>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#FFFFFF',
                                    width: '35%'
                                }}>
                                    {invoiceData?.invoice_date ? 
                                        new Date(invoiceData.invoice_date).toLocaleDateString('en-GB', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric' 
                                        }) : 
                                        '29/09/2025'
                                    }
                                </td>
                            </tr>
                            <tr>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#F8F9FA',
                                    fontWeight: 'bold'
                                }}>
                                    Project:
                                </td>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#FFFFFF'
                                }}>
                                    {projectData?.project_name || 'GST Amendment Test Project'}
                                </td>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#F8F9FA',
                                    fontWeight: 'bold'
                                }}>
                                    Client:
                                </td>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#FFFFFF'
                                }}>
                                    {clientData?.name || 'GST Amendment Test Client'}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#F8F9FA',
                                    fontWeight: 'bold'
                                }}>
                                    RA Number:
                                </td>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#FFFFFF'
                                }}>
                                    {invoiceData?.ra_number || 'RA1'}
                                </td>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#FFFFFF'
                                }}>
                                </td>
                                <td style={{ 
                                    padding: '12px 15px', 
                                    border: '1px solid #E0E0E0',
                                    backgroundColor: '#FFFFFF'
                                }}>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Bill To Section */}
                <div style={{ 
                    paddingLeft: '20mm',
                    paddingRight: '20mm',
                    marginBottom: '25px'
                }}>
                    <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold', 
                        marginBottom: '10px',
                        color: '#000000'
                    }}>
                        Bill To:
                    </div>
                    <div style={{ 
                        fontSize: '12px', 
                        lineHeight: '1.6',
                        color: '#000000'
                    }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                            {clientData?.name || 'GST Amendment Test Client'}
                        </div>
                        <div style={{ marginBottom: '5px' }}>
                            Same as above
                        </div>
                        <div style={{ marginBottom: '5px' }}>
                            <strong>GST No:</strong> {clientData?.gst_no || '27ABCDE1234F1Z5'}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div style={{ 
                    paddingLeft: '20mm',
                    paddingRight: '20mm',
                    marginBottom: '25px'
                }}>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        border: '2px solid #E0E0E0'
                    }}>
                        {/* Table Header */}
                        <thead>
                            <tr style={{ backgroundColor: '#00ACC1', color: 'white' }}>
                                <th style={{ 
                                    padding: '15px 10px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #00ACC1',
                                    width: '8%'
                                }}>
                                    S.No
                                </th>
                                <th style={{ 
                                    padding: '15px 10px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #00ACC1',
                                    width: '42%'
                                }}>
                                    Description
                                </th>
                                <th style={{ 
                                    padding: '15px 10px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #00ACC1',
                                    width: '8%'
                                }}>
                                    Unit
                                </th>
                                <th style={{ 
                                    padding: '15px 10px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #00ACC1',
                                    width: '10%'
                                }}>
                                    Qty
                                </th>
                                <th style={{ 
                                    padding: '15px 10px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #00ACC1',
                                    width: '12%'
                                }}>
                                    Rate (₹)
                                </th>
                                <th style={{ 
                                    padding: '15px 10px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #00ACC1',
                                    width: '15%'
                                }}>
                                    Amount (₹)
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => {
                                const itemAmount = item.quantity * item.rate;
                                
                                return (
                                    <tr key={index} style={{ backgroundColor: 'white' }}>
                                        <td style={{ 
                                            padding: '12px 10px', 
                                            textAlign: 'center', 
                                            border: '1px solid #E0E0E0',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        }}>
                                            {index + 1}
                                        </td>
                                        <td style={{ 
                                            padding: '12px 10px', 
                                            textAlign: 'left', 
                                            border: '1px solid #E0E0E0',
                                            fontSize: '11px'
                                        }}>
                                            {item.description}
                                        </td>
                                        <td style={{ 
                                            padding: '12px 10px', 
                                            textAlign: 'center', 
                                            border: '1px solid #E0E0E0',
                                            fontSize: '11px'
                                        }}>
                                            {item.unit}
                                        </td>
                                        <td style={{ 
                                            padding: '12px 10px', 
                                            textAlign: 'center', 
                                            border: '1px solid #E0E0E0',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        }}>
                                            {item.quantity.toFixed(2)}
                                        </td>
                                        <td style={{ 
                                            padding: '12px 10px', 
                                            textAlign: 'center', 
                                            border: '1px solid #E0E0E0',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        }}>
                                            ₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ 
                                            padding: '12px 10px', 
                                            textAlign: 'center', 
                                            border: '1px solid #E0E0E0',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        }}>
                                            ₹{itemAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div style={{ 
                    paddingLeft: '20mm',
                    paddingRight: '20mm',
                    marginBottom: '30px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ 
                            border: '2px solid #E0E0E0',
                            backgroundColor: '#F8F9FA',
                            minWidth: '280px'
                        }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ 
                                            padding: '12px 15px', 
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            borderBottom: '1px solid #E0E0E0',
                                            fontSize: '12px'
                                        }}>
                                            Subtotal:
                                        </td>
                                        <td style={{ 
                                            padding: '12px 15px', 
                                            textAlign: 'right',
                                            borderBottom: '1px solid #E0E0E0',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}>
                                            ₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    
                                    {/* Dynamic GST Breakdown based on project GST type */}
                                    {projectData?.gst_type === 'CGST_SGST' ? (
                                        <>
                                            <tr>
                                                <td style={{ 
                                                    padding: '12px 15px', 
                                                    textAlign: 'right',
                                                    fontWeight: 'bold',
                                                    borderBottom: '1px solid #E0E0E0',
                                                    fontSize: '12px'
                                                }}>
                                                    GST ({totals.cgstRate}%):
                                                </td>
                                                <td style={{ 
                                                    padding: '12px 15px', 
                                                    textAlign: 'right',
                                                    borderBottom: '1px solid #E0E0E0',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    ₹{totals.totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style={{ 
                                                    padding: '12px 15px', 
                                                    textAlign: 'right',
                                                    fontWeight: 'bold',
                                                    borderBottom: '1px solid #E0E0E0',
                                                    fontSize: '12px'
                                                }}>
                                                    SGST ({totals.sgstRate}%):
                                                </td>
                                                <td style={{ 
                                                    padding: '12px 15px', 
                                                    textAlign: 'right',
                                                    borderBottom: '1px solid #E0E0E0',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    ₹{totals.totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </>
                                    ) : (
                                        <tr>
                                            <td style={{ 
                                                padding: '12px 15px', 
                                                textAlign: 'right',
                                                fontWeight: 'bold',
                                                borderBottom: '1px solid #E0E0E0',
                                                fontSize: '12px'
                                            }}>
                                                GST ({totals.igstRate}%):
                                            </td>
                                            <td style={{ 
                                                padding: '12px 15px', 
                                                textAlign: 'right',
                                                borderBottom: '1px solid #E0E0E0',
                                                fontSize: '12px',
                                                fontWeight: 'bold'
                                            }}>
                                                ₹{totals.totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )}
                                    
                                    <tr style={{ backgroundColor: '#00ACC1', color: 'white' }}>
                                        <td style={{ 
                                            padding: '15px 15px', 
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            fontSize: '14px'
                                        }}>
                                            Total Amount:
                                        </td>
                                        <td style={{ 
                                            padding: '15px 15px', 
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            fontSize: '14px'
                                        }}>
                                            ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Payment Terms */}
                <div style={{ 
                    paddingLeft: '20mm',
                    paddingRight: '20mm',
                    paddingBottom: '20mm'
                }}>
                    <div style={{ 
                        fontSize: '12px',
                        color: '#000000',
                        fontWeight: 'bold'
                    }}>
                        Payment Terms: Payment due within 30 days
                    </div>
                </div>

                {/* Company Information Footer (Editable Fields) */}
                <div style={{ 
                    position: 'absolute',
                    bottom: '15mm',
                    left: '20mm',
                    right: '20mm',
                    borderTop: '1px solid #E0E0E0',
                    paddingTop: '15px',
                    fontSize: '10px',
                    color: '#666666'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '5px' }}>
                            <strong>Address:</strong> {isEditing ? (
                                <input
                                    type="text"
                                    value={editableCompanyData.address}
                                    onChange={(e) => handleCompanyDataChange('address', e.target.value)}
                                    style={{
                                        border: '1px solid #00ACC1',
                                        borderRadius: '4px',
                                        padding: '2px 5px',
                                        fontSize: '10px',
                                        marginLeft: '5px',
                                        width: '300px'
                                    }}
                                />
                            ) : (
                                editableCompanyData.address
                            )}
                        </div>
                        <div style={{ marginBottom: '5px' }}>
                            <strong>Phone:</strong> {isEditing ? (
                                <input
                                    type="tel"
                                    value={editableCompanyData.phone}
                                    onChange={(e) => handleCompanyDataChange('phone', e.target.value)}
                                    style={{
                                        border: '1px solid #00ACC1',
                                        borderRadius: '4px',
                                        padding: '2px 5px',
                                        fontSize: '10px',
                                        marginLeft: '5px',
                                        width: '150px'
                                    }}
                                />
                            ) : (
                                editableCompanyData.phone
                            )} | 
                            <strong> Email:</strong> {isEditing ? (
                                <input
                                    type="email"
                                    value={editableCompanyData.email}
                                    onChange={(e) => handleCompanyDataChange('email', e.target.value)}
                                    style={{
                                        border: '1px solid #00ACC1',
                                        borderRadius: '4px',
                                        padding: '2px 5px',
                                        fontSize: '10px',
                                        marginLeft: '5px',
                                        width: '200px'
                                    }}
                                />
                            ) : (
                                editableCompanyData.email
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PixelPerfectInvoiceTemplate;