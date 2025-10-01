#!/usr/bin/env python3
"""
Debug Enhanced Invoice Endpoint
Test the specific issue with enhanced invoice quantity validation
"""

import requests
import json

def test_enhanced_invoice_debug():
    base_url = "https://template-maestro.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    # Login first
    login_response = requests.post(f"{api_url}/auth/login", 
                                 json={'email': 'brightboxm@gmail.com', 'password': 'admin123'})
    
    if login_response.status_code != 200:
        print("❌ Login failed")
        return
    
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # Create test client
    client_data = {
        "name": "Debug Test Client",
        "gst_no": "29ABCDE1234F1Z5",
        "bill_to_address": "Debug Address, Bangalore, Karnataka - 560001"
    }
    
    client_response = requests.post(f"{api_url}/clients", json=client_data, headers=headers)
    if client_response.status_code != 200:
        print("❌ Client creation failed")
        return
    
    client_id = client_response.json()['client_id']
    print(f"✅ Created client: {client_id}")
    
    # Create test project with BOQ
    project_data = {
        "project_name": "Debug Enhanced Invoice Test",
        "architect": "Debug Architect",
        "client_id": client_id,
        "client_name": "Debug Test Client",
        "boq_items": [
            {
                "serial_number": "1",
                "description": "Foundation Work",
                "unit": "Cum",
                "quantity": 100.0,
                "rate": 5000.0,
                "amount": 500000.0,
                "billed_quantity": 98.991,  # Remaining: 1.009
                "gst_rate": 18.0
            }
        ],
        "total_project_value": 500000.0,
        "created_by": "debug-user"
    }
    
    project_response = requests.post(f"{api_url}/projects", json=project_data, headers=headers)
    if project_response.status_code != 200:
        print(f"❌ Project creation failed: {project_response.text}")
        return
    
    project_id = project_response.json()['project_id']
    print(f"✅ Created project: {project_id}")
    
    # Test RA tracking data
    ra_response = requests.get(f"{api_url}/projects/{project_id}/ra-tracking", headers=headers)
    if ra_response.status_code == 200:
        ra_data = ra_response.json()
        ra_items = ra_data.get('ra_tracking', [])
        print(f"📊 RA Tracking items: {len(ra_items)}")
        
        if ra_items:
            for item in ra_items:
                print(f"   - {item['description']}: Balance {item['balance_qty']}")
        else:
            print("   ⚠️  No RA tracking items found")
    else:
        print(f"❌ RA tracking failed: {ra_response.text}")
    
    # Test quantity validation endpoint directly
    validation_data = {
        "project_id": project_id,
        "selected_items": [
            {
                "description": "Foundation Work",
                "requested_qty": 7.30
            }
        ]
    }
    
    validation_response = requests.post(f"{api_url}/invoices/validate-quantities", 
                                      json=validation_data, headers=headers)
    
    if validation_response.status_code == 200:
        validation_result = validation_response.json()
        print(f"🔍 Validation result: {validation_result}")
    else:
        print(f"❌ Validation failed: {validation_response.text}")
    
    # Test enhanced invoice with correct data structure
    enhanced_invoice_data = {
        "project_id": project_id,
        "project_name": "Debug Enhanced Invoice Test",
        "client_id": client_id,
        "client_name": "Debug Test Client",
        "invoice_type": "tax_invoice",
        "invoice_gst_type": "CGST_SGST",
        "created_by": "debug-user",
        "invoice_items": [  # Note: using invoice_items, not items
            {
                "boq_item_id": "1",
                "serial_number": "1",
                "description": "Foundation Work",
                "unit": "Cum",
                "quantity": 7.30,  # Over-quantity
                "rate": 5000.0,
                "amount": 36500.0
            }
        ],
        "subtotal": 36500.0,
        "total_gst_amount": 6570.0,
        "total_amount": 43070.0
    }
    
    enhanced_response = requests.post(f"{api_url}/invoices/enhanced", 
                                    json=enhanced_invoice_data, headers=headers)
    
    print(f"🧾 Enhanced invoice response: {enhanced_response.status_code}")
    print(f"   Response: {enhanced_response.text}")
    
    if enhanced_response.status_code == 400:
        print("✅ Enhanced invoice correctly blocked over-quantity")
    else:
        print("❌ Enhanced invoice did not block over-quantity")

if __name__ == "__main__":
    test_enhanced_invoice_debug()