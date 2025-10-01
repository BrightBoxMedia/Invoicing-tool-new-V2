#!/usr/bin/env python3
"""
Debug Canvas Elements Implementation
"""

import requests
import json

def test_canvas_elements():
    base_url = "https://template-maestro.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    # Authenticate
    auth_response = requests.post(f"{api_url}/auth/login", 
                                json={'email': 'brightboxm@gmail.com', 'password': 'admin123'})
    
    if auth_response.status_code != 200:
        print("❌ Authentication failed")
        return
    
    token = auth_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    print("✅ Authenticated successfully")
    
    # Test 1: Check current template structure
    print("\n🔍 Testing current template structure...")
    get_response = requests.get(f"{api_url}/admin/pdf-template/active", headers=headers)
    
    if get_response.status_code == 200:
        current_template = get_response.json()
        print(f"✅ Current template loaded")
        print(f"   Has canvas_elements: {'canvas_elements' in current_template}")
        if 'canvas_elements' in current_template:
            print(f"   Canvas elements type: {type(current_template['canvas_elements'])}")
            print(f"   Canvas elements content: {current_template['canvas_elements']}")
    else:
        print(f"❌ Failed to get current template: {get_response.status_code}")
        return
    
    # Test 2: Try to save template with canvas_elements as dict (correct format)
    print("\n🎨 Testing canvas elements save (dict format)...")
    
    canvas_template_dict = {
        "company_name": "Test Company Dict",
        "canvas_elements": {
            "text-element-1": {
                "type": "text",
                "x": 50,
                "y": 100,
                "width": 200,
                "height": 40,
                "content": "Sample Text",
                "style": {"fontSize": 14, "color": "#000000"},
                "editable": True
            }
        }
    }
    
    save_response = requests.post(f"{api_url}/admin/pdf-template", 
                                json=canvas_template_dict, headers=headers)
    
    print(f"Save response status: {save_response.status_code}")
    if save_response.status_code != 200:
        print(f"Save response error: {save_response.text}")
    else:
        print("✅ Template with canvas_elements (dict) saved successfully")
    
    # Test 3: Verify the saved template
    print("\n📥 Testing template retrieval after save...")
    get_response2 = requests.get(f"{api_url}/admin/pdf-template/active", headers=headers)
    
    if get_response2.status_code == 200:
        saved_template = get_response2.json()
        print(f"✅ Template retrieved after save")
        print(f"   Has canvas_elements: {'canvas_elements' in saved_template}")
        if 'canvas_elements' in saved_template:
            canvas_elements = saved_template['canvas_elements']
            print(f"   Canvas elements type: {type(canvas_elements)}")
            print(f"   Canvas elements keys: {list(canvas_elements.keys()) if isinstance(canvas_elements, dict) else 'Not a dict'}")
            
            if isinstance(canvas_elements, dict) and 'text-element-1' in canvas_elements:
                element = canvas_elements['text-element-1']
                print(f"   Element structure: {element}")
                print("✅ Canvas element preserved correctly")
            else:
                print("❌ Canvas element not preserved correctly")
    else:
        print(f"❌ Failed to retrieve template after save: {get_response2.status_code}")
    
    # Test 4: Test PDF generation with canvas elements
    print("\n📄 Testing PDF generation with canvas elements...")
    
    pdf_data = {
        "invoice_data": {
            "invoice_number": "TEST-001",
            "invoice_date": "2024-01-15",
            "subtotal": 100000.0,
            "gst_amount": 18000.0,
            "total_amount": 118000.0
        },
        "client_data": {
            "name": "Test Client",
            "address": "Test Address"
        },
        "project_data": {
            "project_name": "Test Project",
            "location": "Test Location"
        }
    }
    
    pdf_response = requests.post(f"{api_url}/admin/pdf-template/preview", 
                               json=pdf_data, headers=headers)
    
    print(f"PDF generation status: {pdf_response.status_code}")
    if pdf_response.status_code == 200:
        pdf_content = pdf_response.content
        if isinstance(pdf_content, bytes) and pdf_content.startswith(b'%PDF'):
            print(f"✅ PDF generated successfully: {len(pdf_content)} bytes")
        else:
            print(f"❌ Invalid PDF content: {pdf_content[:100]}")
    else:
        print(f"❌ PDF generation failed: {pdf_response.text}")

if __name__ == "__main__":
    test_canvas_elements()