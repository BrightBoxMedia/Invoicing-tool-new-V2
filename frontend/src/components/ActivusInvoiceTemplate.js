import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';

const ActivusInvoiceTemplate = ({ invoiceData, projectData, clientData, companyData }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableCompanyData, setEditableCompanyData] = useState({
        address: companyData?.address || 'Flat No.125 7th Cross Rd, Opp Rangneghatta Road, Dollar Layout, Bengaluru, Karnataka, India - 560076',
        phone: companyData?.phone || '+91 87785 07177',
        email: companyData?.email || 'finance@activusdesignbuild.in',
        gstin: companyData?.gstin || '29ACGFA5744D1ZF',
        pan: companyData?.pan || 'ACGFA5744D'
    });

    // Company logo URL
    const logoUrl = 'https://customer-assets.emergentagent.com/job_activus-manager/artifacts/8scn4iq7_horizontal-with-tagline-bg-fff-1500x1500.pdf.png';

    // Calculate GST breakdown based on project GST type
    const calculateGSTBreakdown = (amount, gstRate, gstType) => {
        const gstAmount = amount * (gstRate / 100);
        
        if (gstType === 'CGST_SGST') {
            return {
                cgst: gstAmount / 2,
                sgst: gstAmount / 2,
                igst: 0,
                total: gstAmount
            };
        } else {
            return {
                cgst: 0,
                sgst: 0,
                igst: gstAmount,
                total: gstAmount
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
            grandTotal
        };
    };

    const totals = calculateTotals();

    // Convert number to words (simplified version)
    const numberToWords = (num) => {
        const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
        const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
        const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
        
        if (num === 0) return 'ZERO';
        
        let words = '';
        const crores = Math.floor(num / 10000000);
        const lakhs = Math.floor((num % 10000000) / 100000);
        const thousands = Math.floor((num % 100000) / 1000);
        const hundreds = Math.floor((num % 1000) / 100);
        const remainder = num % 100;
        
        if (crores > 0) {
            words += ones[crores] + ' CRORE ';
        }
        if (lakhs > 0) {
            if (lakhs < 10) {
                words += ones[lakhs] + ' LAKH ';
            } else {
                const lakhTens = Math.floor(lakhs / 10);
                const lakhOnes = lakhs % 10;
                words += tens[lakhTens] + ' ';
                if (lakhOnes > 0) words += ones[lakhOnes] + ' ';
                words += 'LAKH ';
            }
        }
        if (thousands > 0) {
            if (thousands < 10) {
                words += ones[thousands] + ' THOUSAND ';
            } else {
                const thousandTens = Math.floor(thousands / 10);
                const thousandOnes = thousands % 10;
                words += tens[thousandTens] + ' ';
                if (thousandOnes > 0) words += ones[thousandOnes] + ' ';
                words += 'THOUSAND ';
            }
        }
        if (hundreds > 0) {
            words += ones[hundreds] + ' HUNDRED ';
        }
        if (remainder > 0) {
            if (remainder < 10) {
                words += ones[remainder] + ' ';
            } else if (remainder < 20) {
                words += teens[remainder - 10] + ' ';
            } else {
                const remainderTens = Math.floor(remainder / 10);
                const remainderOnes = remainder % 10;
                words += tens[remainderTens] + ' ';
                if (remainderOnes > 0) words += ones[remainderOnes] + ' ';
            }
        }
        
        return words.trim();
    };

    const exportToPDF = () => {
        const element = document.getElementById('invoice-template');
        const options = {
            margin: 0.5,
            filename: `invoice-${invoiceData?.invoice_number || 'new'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().set(options).from(element).save();
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

    return (
        <div className="bg-white">
            {/* Editor Controls */}
            <div className="mb-4 p-4 bg-gray-50 border-b print:hidden">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Invoice Template Editor</h3>
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
                        ℹ️ Only company address, phone, and email can be customized. All other elements are locked to maintain professional consistency.
                    </p>
                )}
            </div>

            {/* Invoice Template */}
            <div 
                id="invoice-template" 
                className="bg-white"
                style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    margin: '0 auto', 
                    padding: '20mm',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#000000'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ 
                            fontSize: '28px', 
                            fontWeight: 'bold', 
                            color: '#4A90A4', 
                            margin: '0 0 10px 0',
                            letterSpacing: '1px'
                        }}>
                            TAX Invoice
                        </h1>
                        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>Invoice No #</strong> {invoiceData?.invoice_number || 'AIDB/25-26/0019'}
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>Invoice Date</strong> {new Date(invoiceData?.invoice_date || new Date()).toLocaleDateString('en-GB', { 
                                    day: '2-digit', 
                                    month: 'short', 
                                    year: 'numeric' 
                                })}
                            </div>
                            <div>
                                <strong>Created By</strong> {invoiceData?.created_by || 'Sathiya Narayanan Kannan'}
                            </div>
                        </div>
                    </div>
                    <div style={{ width: '200px', height: '80px' }}>
                        <img 
                            src={logoUrl}
                            alt="Activus Industrial Design & Build"
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'contain',
                                backgroundColor: '#4A90A4',
                                borderRadius: '8px',
                                padding: '10px'
                            }}
                        />
                    </div>
                </div>

                {/* Billed By and Billed To */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
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
                                <div style={{ marginBottom: '5px' }}>{editableCompanyData.address}</div>
                            )}
                            <div style={{ marginBottom: '5px' }}>
                                <strong>GSTIN:</strong> {editableCompanyData.gstin}
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>PAN:</strong> {editableCompanyData.pan}
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
                                            marginLeft: '5px'
                                        }}
                                    />
                                ) : (
                                    editableCompanyData.email
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
                                            marginLeft: '5px'
                                        }}
                                    />
                                ) : (
                                    editableCompanyData.phone
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
                                {clientData?.name || 'UNITED BREWERIES LIMITED'}
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                {clientData?.address || 'PLOT NO M-1 & M-1 /2,TALOJA DIST. RAIGAD,Maharashtra-410206'}
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                Taloja,
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                Maharashtra, India - 410206
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>GSTIN:</strong> {clientData?.gst_no || '27AAACU6053C1ZL'}
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>PAN:</strong> {clientData?.pan || 'AAACU6053C'}
                            </div>
                            <div style={{ marginBottom: '5px' }}>
                                <strong>Email:</strong> {clientData?.email || 'ubl.taloja@ubmail.com'}
                            </div>
                            <div>
                                <strong>Phone:</strong> {clientData?.phone || '+91 82706 64250'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
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
                                    description: 'Removal of existing Bare Galvalume Sheet SAC Code:',
                                    gst_rate: 18,
                                    quantity: 8500,
                                    rate: 445,
                                    amount: 37825000.00
                                },
                                {
                                    description: 'Removal of existing Gutters, lighting & She SAC Code:',
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
                                    description: 'Galvalume+ 300micron LDPE sheet below SAC Code:',
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

                {/* Total Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    <div style={{ flex: 1, paddingRight: '20px' }}>
                        <div style={{ 
                            fontSize: '12px', 
                            fontWeight: 'bold', 
                            marginBottom: '10px',
                            textTransform: 'uppercase'
                        }}>
                            Total (in words): {numberToWords(Math.floor(totals.grandTotal))} RUPEES ONLY
                        </div>
                    </div>
                    <div style={{ minWidth: '300px' }}>
                        <table style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse',
                            fontSize: '12px'
                        }}>
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
                                    ₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                            {projectData?.gst_type === 'CGST_SGST' ? (
                                <>
                                    <tr>
                                        <td style={{ 
                                            padding: '8px', 
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            borderBottom: '1px solid #E0E0E0'
                                        }}>
                                            CGST ({(invoiceData?.items?.[0]?.gst_rate || 18) / 2}%)
                                        </td>
                                        <td style={{ 
                                            padding: '8px', 
                                            textAlign: 'right',
                                            borderBottom: '1px solid #E0E0E0'
                                        }}>
                                            ₹{totals.totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ 
                                            padding: '8px', 
                                            textAlign: 'right',
                                            fontWeight: 'bold',
                                            borderBottom: '1px solid #E0E0E0'
                                        }}>
                                            SGST ({(invoiceData?.items?.[0]?.gst_rate || 18) / 2}%)
                                        </td>
                                        <td style={{ 
                                            padding: '8px', 
                                            textAlign: 'right',
                                            borderBottom: '1px solid #E0E0E0'
                                        }}>
                                            ₹{totals.totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td style={{ 
                                        padding: '8px', 
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        borderBottom: '1px solid #E0E0E0'
                                    }}>
                                        IGST ({invoiceData?.items?.[0]?.gst_rate || 18}%)
                                    </td>
                                    <td style={{ 
                                        padding: '8px', 
                                        textAlign: 'right',
                                        borderBottom: '1px solid #E0E0E0'
                                    }}>
                                        ₹{totals.totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            )}
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
                                    ₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
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
                        paddingTop: '10px',
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

                {/* Terms and Conditions */}
                <div style={{ 
                    borderTop: '2px solid #4A90A4',
                    paddingTop: '20px',
                    fontSize: '11px'
                }}>
                    <h4 style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold', 
                        color: '#4A90A4',
                        marginBottom: '10px'
                    }}>
                        Terms and Conditions
                    </h4>
                    <div style={{ lineHeight: '1.5' }}>
                        <div>1. Kindly clear the payment base on payment terms mentioned</div>
                        <div>2. 440021002 & 19.02.2025</div>
                        <div>3. 45 % of RA bills with Taxes after receipt of material at site</div>
                        <div style={{ marginTop: '15px', textAlign: 'center' }}>
                            For any enquiry, reach out via email at finance@activusdesignbuild.in, call on +91 87785 07177
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivusInvoiceTemplate;