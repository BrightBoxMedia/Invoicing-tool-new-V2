/**
 * Demo Data Setup for Client Showcase
 * Activus Invoice Management System
 */

const demoData = {
  // Sample company profile
  companyProfile: {
    id: 'demo-company-001',
    company_name: 'Activus Design & Build Pvt Ltd',
    company_address: {
      street: '123 Construction Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    },
    contact_details: {
      phone: '+91 98765 43210',
      email: 'info@activusdesign.com',
      website: 'www.activusdesign.com'
    },
    bank_details: {
      bank_name: 'HDFC Bank',
      account_number: '1234567890',
      ifsc_code: 'HDFC0001234',
      branch: 'Mumbai Main Branch'
    },
    gst_number: '27AABCA1234A1Z5',
    pan_number: 'AABCA1234A',
    is_default: true
  },

  // Sample project
  sampleProject: {
    id: 'demo-project-001',
    name: 'Luxury Residential Complex - Phase 1',
    client_name: 'Premium Developers Ltd',
    client_address: 'Bandra West, Mumbai - 400050',
    project_value: 5000000,
    start_date: '2024-01-15',
    expected_completion: '2024-12-31',
    status: 'active',
    project_metadata: {
      po_number: 'PO/2024/001',
      po_date: '2024-01-10',
      abg_percentage: 10.0,
      ra_bill_percentage: 80.0,
      erection_percentage: 15.0,
      pbg_percentage: 5.0
    },
    boq_items: [
      {
        id: '1',
        serial_number: '1',
        description: 'Foundation Work - Excavation and Concrete',
        unit: 'Cum',
        quantity: 100.0,
        rate: 5000.0,
        amount: 500000.0,
        billed_quantity: 25.0,
        remaining_quantity: 75.0
      },
      {
        id: '2',
        serial_number: '2',
        description: 'Structural Steel Work - Columns and Beams',
        unit: 'MT',
        quantity: 50.0,
        rate: 75000.0,
        amount: 3750000.0,
        billed_quantity: 10.0,
        remaining_quantity: 40.0
      },
      {
        id: '3',
        serial_number: '3',
        description: 'Masonry Work - Brick Wall Construction',
        unit: 'Sqm',
        quantity: 500.0,
        rate: 1500.0,
        amount: 750000.0,
        billed_quantity: 0.0,
        remaining_quantity: 500.0
      }
    ]
  },

  // Sample client
  sampleClient: {
    id: 'demo-client-001',
    client_name: 'Premium Developers Ltd',
    contact_person: 'Mr. Rajesh Sharma',
    email: 'rajesh@premiumdev.com',
    phone: '+91 98765 12345',
    address: {
      street: '456 Business District',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      country: 'India'
    },
    gst_number: '27AABCP1234B1Z5',
    pan_number: 'AABCP1234B'
  },

  // Sample invoice for demonstration
  sampleInvoice: {
    id: 'demo-invoice-001',
    invoice_number: 'INV-2024-001',
    ra_number: 'RA1',
    project_id: 'demo-project-001',
    project_name: 'Luxury Residential Complex - Phase 1',
    client_id: 'demo-client-001',
    client_name: 'Premium Developers Ltd',
    invoice_type: 'tax_invoice',
    items: [
      {
        boq_item_id: '1',
        description: 'Foundation Work - Excavation and Concrete',
        unit: 'Cum',
        quantity: 25.0,
        rate: 5000.0,
        amount: 125000.0,
        gst_rate: 18.0,
        gst_amount: 22500.0,
        total_with_gst: 147500.0
      }
    ],
    subtotal: 125000.0,
    total_gst_amount: 22500.0,
    total_amount: 147500.0,
    status: 'approved',
    invoice_date: '2024-01-20',
    due_date: '2024-02-20',
    is_partial: true
  },

  // Demo user accounts
  demoUsers: [
    {
      id: 'demo-admin-001',
      email: 'brightboxm@gmail.com',
      name: 'System Administrator',
      role: 'super_admin',
      password: 'admin123', // This will be hashed
      is_active: true,
      created_at: new Date().toISOString()
    },
    {
      id: 'demo-user-001',
      email: 'manager@activusdesign.com',
      name: 'Project Manager',
      role: 'admin',
      password: 'manager123',
      is_active: true,
      created_at: new Date().toISOString()
    }
  ]
};

module.exports = demoData;