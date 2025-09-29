import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';

const PixelPerfectInvoiceTemplate = ({ invoiceData, projectData, clientData, companyData }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableCompanyData, setEditableCompanyData] = useState({
        address: companyData?.address || 'AIDB Building, Industrial Area, Bangalore, Karnataka, India - 560001',
        phone: companyData?.phone || '+91 87785 07177',
        email: companyData?.email || 'info@activusdesignbuild.in'
    });

    // Company logo - using local copy to avoid CORS issues
    const logoUrl = '/activus-logo.png';

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

            {/* Pixel Perfect Invoice Template - Exactly matching your reference */}
            <div 
                id="pixel-perfect-invoice-template" 
                style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    margin: '0 auto', 
                    padding: '20mm',
                    fontFamily: 'Montserrat, Arial, sans-serif',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#000000',
                    backgroundColor: '#ffffff'
                }}
            >
                {/* Header with TAX Invoice title and Logo */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '30px'
                }}>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ 
                            fontSize: '28px', 
                            fontWeight: 'bold', 
                            color: '#4A90A4',  // Matching your reference color
                            margin: '0 0 20px 0',
                            letterSpacing: '1px'
                        }}>
                            TAX Invoice
                        </h1>
                        
                        {/* Invoice Details */}
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Invoice No #</strong> {invoiceData?.invoice_number || 'AIDB/25-26/0019'}
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Invoice Date</strong> {invoiceData?.invoice_date ? 
                                    new Date(invoiceData.invoice_date).toLocaleDateString('en-GB', { 
                                        day: '2-digit', 
                                        month: 'short', 
                                        year: 'numeric' 
                                    }) : 
                                    'Jun 06, 2025'
                                }
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <strong>Created By</strong> {invoiceData?.created_by || 'Sathiya Narayanan Kannan'}
                            </div>
                        </div>
                    </div>
                    
                    {/* Company Logo */}
                    <div style={{ 
                        width: '200px', 
                        height: '80px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#4A90A4',
                        borderRadius: '8px',
                        padding: '10px'
                    }}>
                        <img 
                            src={logoUrl}
                            alt="Activus Industrial Design & Build LLP"
                            style={{ 
                                maxWidth: '100%', 
                                maxHeight: '100%', 
                                objectFit: 'contain'
                            }}
                            // Local logo - no CORS needed
                        />
                    </div>
                </div>

                {/* Billed By and Billed To sections */}
                <div style={{ 
                    display: 'flex', 
                    gap: '20px', 
                    marginBottom: '30px' 
                }}>
                    {/* Billed By */}
                    <div style={{ 
                        flex: 1, 
                        backgroundColor: '#E0F2F1', 
                        padding: '15px', 
                        borderRadius: '8px',
                        border: '1px solid #B2DFDB'
                    }}>
                        <h3 style={{ 
                            fontSize: '16px', 
                            fontWeight: 'bold', 
                            marginBottom: '10px',
                            color: '#00695C'
                        }}>
                            Billed By
                        </h3>
                        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                Activus Industrial Design And Build LLP
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                {isEditing ? (
                                    <textarea
                                        value={editableCompanyData.address}
                                        onChange={(e) => handleCompanyDataChange('address', e.target.value)}
                                        style={{
                                            width: '100%',
                                            minHeight: '60px',
                                            border: '2px solid #4A90A4',
                                            borderRadius: '4px',
                                            padding: '5px',
                                            fontSize: '12px',
                                            marginBottom: '5px'
                                        }}
                                    />
                                ) : (
                                    'Flat No.125 7th Cross Rd, Opp Bannerghatta Road, Dollar Layout, BTM Layout Stage 2, Bilekahlli, Bengaluru, Karnataka, India - 560076'
                                )}
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>GSTIN:</strong> 29ACGFA5744D1ZF
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>PAN:</strong> ACGFA5744D
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>Email:</strong> {isEditing ? (
                                    <input
                                        type="email"
                                        value={editableCompanyData.email}
                                        onChange={(e) => handleCompanyDataChange('email', e.target.value)}
                                        style={{
                                            border: '2px solid #4A90A4',
                                            borderRadius: '4px',
                                            padding: '2px 5px',
                                            fontSize: '12px',
                                            marginLeft: '5px',
                                            width: '200px'
                                        }}
                                    />
                                ) : (
                                    'finance@activusdesignbuild.in'
                                )}
                            </div>
                            <div>
                                <strong>Phone:</strong> {isEditing ? (
                                    <input
                                        type="tel"
                                        value={editableCompanyData.phone}
                                        onChange={(e) => handleCompanyDataChange('phone', e.target.value)}
                                        style={{
                                            border: '2px solid #4A90A4',
                                            borderRadius: '4px',
                                            padding: '2px 5px',
                                            fontSize: '12px',
                                            marginLeft: '5px',
                                            width: '120px'
                                        }}
                                    />
                                ) : (
                                    '+91 87785 07177'
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Billed To */}
                    <div style={{ 
                        flex: 1, 
                        backgroundColor: '#E3F2FD', 
                        padding: '15px', 
                        borderRadius: '8px',
                        border: '1px solid #BBDEFB'
                    }}>
                        <h3 style={{ 
                            fontSize: '16px', 
                            fontWeight: 'bold', 
                            marginBottom: '10px',
                            color: '#1976D2'
                        }}>
                            Billed To
                        </h3>
                        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                UNITED BREWERIES LIMITED
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                PLOT NO M-1 & M-1 /2,TALOJA DIST. RAIGAD,Maharashtra-410208.,
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                Taloja,
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                Maharashtra, India - 410206
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>GSTIN:</strong> 27AAACU6053C1ZL
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>PAN:</strong> AAACU6053C
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>Email:</strong> ubltaloja@ubmail.com
                            </div>
                            <div>
                                <strong>Phone:</strong> +91 82706 64250
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table - Matching your reference exactly */}
                <div style={{ marginBottom: '30px' }}>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        border: '2px solid #4A90A4'
                    }}>
                        {/* Table Header */}
                        <thead>
                            <tr style={{ backgroundColor: '#4A90A4', color: 'white' }}>
                                <th style={{ 
                                    padding: '12px 8px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #ffffff'
                                }}>
                                    Item
                                </th>
                                <th style={{ 
                                    padding: '12px 8px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #ffffff',
                                    minWidth: '80px'
                                }}>
                                    GST Rate
                                </th>
                                <th style={{ 
                                    padding: '12px 8px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #ffffff',
                                    minWidth: '80px'
                                }}>
                                    Quantity
                                </th>
                                <th style={{ 
                                    padding: '12px 8px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #ffffff',
                                    minWidth: '80px'
                                }}>
                                    Rate
                                </th>
                                <th style={{ 
                                    padding: '12px 8px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #ffffff',
                                    minWidth: '100px'
                                }}>
                                    Amount
                                </th>
                                <th style={{ 
                                    padding: '12px 8px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #ffffff',
                                    minWidth: '80px'
                                }}>
                                    {projectData?.gst_type === 'CGST_SGST' ? 'CGST' : 'IGST'}
                                </th>
                                {projectData?.gst_type === 'CGST_SGST' && (
                                    <th style={{ 
                                        padding: '12px 8px', 
                                        textAlign: 'center', 
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        border: '1px solid #ffffff',
                                        minWidth: '80px'
                                    }}>
                                        SGST
                                    </th>
                                )}
                                <th style={{ 
                                    padding: '12px 8px', 
                                    textAlign: 'center', 
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '1px solid #ffffff',
                                    minWidth: '100px'
                                }}>
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {(invoiceData?.items || [
                                {
                                    description: 'Removal of existing Bare Galvalume sheet SAC Code:',
                                    gst_rate: 18,
                                    quantity: 8500,
                                    rate: 445,
                                    amount: 37825000.00
                                },
                                {
                                    description: 'Removal of existing Gutters,lighting & She SAC Code:',
                                    gst_rate: 18,
                                    quantity: 200,
                                    rate: 390,
                                    amount: 78000.00
                                },
                                {
                                    description: '1 coat of metal passivator - Rustoff 190 SAC Code:',
                                    gst_rate: 18,
                                    quantity: 80,
                                    rate: 5500,
                                    amount: 440000.00
                                },
                                {
                                    description: 'safety net+300micron LDPE sheet below SAC Code:',
                                    gst_rate: 18,
                                    quantity: 8500,
                                    rate: 125,
                                    amount: 1062500.00
                                }
                            ]).map((item, index) => {
                                const itemAmount = item.quantity * item.rate;
                                const gstBreakdown = calculateGSTBreakdown(
                                    itemAmount, 
                                    item.gst_rate || 18, 
                                    projectData?.gst_type || 'IGST'
                                );
                                const itemTotal = itemAmount + gstBreakdown.total;
                                const isAlternate = index % 2 === 1;

                                return (
                                    <tr 
                                        key={index}
                                        style={{ backgroundColor: isAlternate ? '#F0F8FF' : 'white' }}
                                    >
                                        <td style={{ 
                                            padding: '10px 8px', 
                                            border: '1px solid #B0BEC5',
                                            fontSize: '11px',
                                            verticalAlign: 'top'
                                        }}>
                                            {`${index + 1}.`}
                                            <br />
                                            {item.description}
                                        </td>
                                        <td style={{ 
                                            padding: '10px 8px', 
                                            textAlign: 'center', 
                                            border: '1px solid #B0BEC5',
                                            fontSize: '11px'
                                        }}>
                                            {item.gst_rate || 18}%
                                        </td>
                                        <td style={{ 
                                            padding: '10px 8px', 
                                            textAlign: 'right', 
                                            border: '1px solid #B0BEC5',
                                            fontSize: '11px'
                                        }}>
                                            {item.quantity?.toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ 
                                            padding: '10px 8px', 
                                            textAlign: 'right', 
                                            border: '1px solid #B0BEC5',
                                            fontSize: '11px'
                                        }}>
                                            ₹{item.rate?.toLocaleString('en-IN')}
                                        </td>
                                        <td style={{ 
                                            padding: '10px 8px', 
                                            textAlign: 'right', 
                                            border: '1px solid #B0BEC5',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        }}>
                                            ₹{itemAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ 
                                            padding: '10px 8px', 
                                            textAlign: 'right', 
                                            border: '1px solid #B0BEC5',
                                            fontSize: '11px'
                                        }}>
                                            ₹{(projectData?.gst_type === 'CGST_SGST' ? gstBreakdown.cgst : gstBreakdown.igst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        {projectData?.gst_type === 'CGST_SGST' && (
                                            <td style={{ 
                                                padding: '10px 8px', 
                                                textAlign: 'right', 
                                                border: '1px solid #B0BEC5',
                                                fontSize: '11px'
                                            }}>
                                                ₹{gstBreakdown.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        )}
                                        <td style={{ 
                                            padding: '10px 8px', 
                                            textAlign: 'right', 
                                            border: '1px solid #B0BEC5',
                                            fontSize: '11px',
                                            fontWeight: 'bold'
                                        }}>
                                            ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Total Summary - Matching your reference format */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <div style={{ flex: 1, paddingRight: '20px' }}>
                        <div style={{ 
                            fontSize: '12px', 
                            fontWeight: 'bold', 
                            marginBottom: '10px',
                            textTransform: 'uppercase'
                        }}>
                            Total (in words): SIXTY THREE LAKH TWENTY EIGHT THOUSAND THREE HUNDRED FORTY RUPEES ONLY
                        </div>
                    </div>
                    <div style={{ minWidth: '300px' }}>
                        <table style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse',
                            fontSize: '12px'
                        }}>
                            <tbody>
                                <tr>
                                    <td style={{ 
                                        padding: '8px', 
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        borderBottom: '1px solid #E0E0E0'
                                    }}>
                                        Amount
                                    </td>
                                    <td style={{ 
                                        padding: '8px', 
                                        textAlign: 'right',
                                        borderBottom: '1px solid #E0E0E0'
                                    }}>
                                        ₹53,63,000.00
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ 
                                        padding: '8px', 
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        borderBottom: '1px solid #E0E0E0'
                                    }}>
                                        IGST (18%)
                                    </td>
                                    <td style={{ 
                                        padding: '8px', 
                                        textAlign: 'right',
                                        borderBottom: '1px solid #E0E0E0'
                                    }}>
                                        ₹9,65,340.00
                                    </td>
                                </tr>
                                <tr style={{ backgroundColor: '#4A90A4', color: 'white' }}>
                                    <td style={{ 
                                        padding: '12px 8px', 
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                    }}>
                                        Total (INR)
                                    </td>
                                    <td style={{ 
                                        padding: '12px 8px', 
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                    }}>
                                        ₹63,28,340.00
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Signature Section */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    marginBottom: '40px',
                    minHeight: '80px'
                }}>
                    <div style={{ 
                        textAlign: 'center',
                        borderTop: '1px solid #000000',
                        paddingTop: '50px',
                        minWidth: '200px'
                    }}>
                        <div style={{ 
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }}>
                            Authorised Signatory
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PixelPerfectInvoiceTemplate;