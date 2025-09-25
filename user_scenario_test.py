#!/usr/bin/env python3
"""
REPRODUCE USER'S EXACT SCENARIO - Bill Qty 7.30 vs Remaining 1.009
Test with existing project data to confirm the critical quantity validation bug
"""

import requests
import json

def test_user_scenario():
    base_url = 'https://billing-maestro.preview.emergentagent.com/api'
    
    # Authenticate
    login_response = requests.post(f'{base_url}/auth/login', 
                                 json={'email': 'brightboxm@gmail.com', 'password': 'admin123'})
    
    if login_response.status_code != 200:
        print("❌ Authentication failed")
        return
    
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    print("🚨 REPRODUCING USER'S EXACT SCENARIO")
    print("User reported: 'Bill Qty 7.30' was accepted when 'Remaining was 1.009'")
    print("=" * 70)
    
    # Find a suitable project with BOQ items
    projects_response = requests.get(f'{base_url}/projects', headers=headers)
    if projects_response.status_code != 200:
        print("❌ Failed to get projects")
        return
    
    projects = projects_response.json()
    test_project = None
    
    # Find project with BOQ items
    for project in projects:
        boq_items = project.get('boq_items', [])
        if boq_items:
            test_project = project
            break
    
    if not test_project:
        print("❌ No projects with BOQ items found")
        return
    
    project_id = test_project['id']
    project_name = test_project['project_name']
    boq_items = test_project['boq_items']
    
    print(f"📋 Using project: {project_name}")
    print(f"   Project ID: {project_id}")
    print(f"   BOQ Items: {len(boq_items)}")
    
    # Use first BOQ item for testing
    test_item = boq_items[0]
    item_desc = test_item.get('description', 'Unknown')
    total_qty = test_item.get('quantity', 0)
    billed_qty = test_item.get('billed_quantity', 0)
    remaining_qty = total_qty - billed_qty
    unit = test_item.get('unit', 'nos')
    
    print(f"\n📊 Test Item: {item_desc}")
    print(f"   Total Quantity: {total_qty} {unit}")
    print(f"   Billed Quantity: {billed_qty} {unit}")
    print(f"   Remaining Quantity: {remaining_qty} {unit}")
    
    # Step 1: Create invoices to simulate the user's scenario (remaining = 1.009)
    print(f"\n🎯 STEP 1: Creating invoices to leave exactly 1.009 {unit} remaining...")
    
    # Calculate how much to bill to leave 1.009 remaining
    target_remaining = 1.009
    qty_to_bill = total_qty - target_remaining
    
    if qty_to_bill > 0:
        # Create first invoice to consume most quantity
        invoice_data = {
            "project_id": project_id,
            "project_name": project_name,
            "client_id": test_project.get('client_id', 'test-client'),
            "client_name": test_project.get('client_name', 'Test Client'),
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": test_item.get('serial_number', '1'),
                    "serial_number": test_item.get('serial_number', '1'),
                    "description": f"{item_desc} - Setup Invoice",
                    "unit": unit,
                    "quantity": qty_to_bill,
                    "rate": test_item.get('rate', 1000),
                    "amount": qty_to_bill * test_item.get('rate', 1000),
                    "gst_rate": 18.0,
                    "gst_amount": qty_to_bill * test_item.get('rate', 1000) * 0.18,
                    "total_with_gst": qty_to_bill * test_item.get('rate', 1000) * 1.18
                }
            ],
            "subtotal": qty_to_bill * test_item.get('rate', 1000),
            "total_gst_amount": qty_to_bill * test_item.get('rate', 1000) * 0.18,
            "total_amount": qty_to_bill * test_item.get('rate', 1000) * 1.18,
            "created_by": "test-user"
        }
        
        # Try regular invoice endpoint first
        invoice_response = requests.post(f'{base_url}/invoices', json=invoice_data, headers=headers)
        
        if invoice_response.status_code == 200:
            setup_invoice_id = invoice_response.json().get('invoice_id')
            print(f"✅ Setup invoice created: {setup_invoice_id}")
            print(f"   Billed: {qty_to_bill} {unit}")
            print(f"   Should leave remaining: {target_remaining} {unit}")
        else:
            print(f"❌ Setup invoice failed: {invoice_response.status_code}")
            print(f"   Error: {invoice_response.text}")
            return
    
    # Step 2: Verify the remaining quantity
    print(f"\n🔍 STEP 2: Verifying remaining quantity...")
    
    # Get updated project data
    project_response = requests.get(f'{base_url}/projects/{project_id}', headers=headers)
    if project_response.status_code == 200:
        updated_project = project_response.json()
        updated_boq_items = updated_project.get('boq_items', [])
        updated_test_item = next((item for item in updated_boq_items 
                                if item.get('serial_number') == test_item.get('serial_number')), None)
        
        if updated_test_item:
            updated_billed = updated_test_item.get('billed_quantity', 0)
            updated_remaining = updated_test_item.get('quantity', 0) - updated_billed
            
            print(f"📊 Updated quantities:")
            print(f"   Total: {updated_test_item.get('quantity', 0)} {unit}")
            print(f"   Billed: {updated_billed} {unit}")
            print(f"   Remaining: {updated_remaining} {unit}")
            
            actual_remaining = updated_remaining
        else:
            print("❌ Could not find updated BOQ item")
            return
    else:
        print(f"❌ Failed to get updated project: {project_response.status_code}")
        return
    
    # Step 3: Test RA Tracking
    print(f"\n📊 STEP 3: Testing RA Tracking System...")
    
    ra_response = requests.get(f'{base_url}/projects/{project_id}/ra-tracking', headers=headers)
    if ra_response.status_code == 200:
        ra_data = ra_response.json()
        ra_items = ra_data.get('items', [])
        
        print(f"RA Tracking Response: {len(ra_items)} items")
        
        if len(ra_items) == 0:
            print("🚨 RA TRACKING BROKEN: No items returned despite BOQ having items")
        else:
            for ra_item in ra_items[:2]:
                print(f"   - {ra_item.get('description', 'Unknown')}: Balance {ra_item.get('balance_qty', 0)}")
    else:
        print(f"❌ RA Tracking failed: {ra_response.status_code}")
    
    # Step 4: Test Quantity Validation Endpoint
    print(f"\n🧪 STEP 4: Testing Quantity Validation Endpoint...")
    
    user_scenario_qty = 7.30  # User's exact scenario
    
    validation_data = {
        "project_id": project_id,
        "invoice_items": [
            {
                "boq_item_id": test_item.get('serial_number', '1'),
                "description": item_desc,
                "quantity": user_scenario_qty
            }
        ]
    }
    
    validation_response = requests.post(f'{base_url}/invoices/validate-quantities', 
                                      json=validation_data, headers=headers)
    
    if validation_response.status_code == 200:
        validation_result = validation_response.json()
        is_valid = validation_result.get('valid', False)
        errors = validation_result.get('errors', [])
        warnings = validation_result.get('warnings', [])
        
        print(f"Validation Test: {user_scenario_qty} {unit} when {actual_remaining:.3f} {unit} available")
        print(f"Result: Valid={is_valid}, Errors={len(errors)}, Warnings={len(warnings)}")
        
        if is_valid and user_scenario_qty > actual_remaining:
            print("🚨 VALIDATION ENDPOINT BUG CONFIRMED: Allows over-quantity!")
        elif not is_valid and user_scenario_qty > actual_remaining:
            print("✅ Validation endpoint correctly blocks over-quantity")
        
        if errors:
            for error in errors:
                print(f"   Error: {error}")
    else:
        print(f"❌ Validation test failed: {validation_response.status_code}")
    
    # Step 5: Test Regular Invoice Creation (User's main concern)
    print(f"\n🧾 STEP 5: Testing Regular Invoice Creation - USER'S EXACT SCENARIO...")
    
    user_invoice_data = {
        "project_id": project_id,
        "project_name": project_name,
        "client_id": test_project.get('client_id', 'test-client'),
        "client_name": test_project.get('client_name', 'Test Client'),
        "invoice_type": "tax_invoice",
        "items": [
            {
                "boq_item_id": test_item.get('serial_number', '1'),
                "serial_number": test_item.get('serial_number', '1'),
                "description": f"{item_desc} - User Scenario Test",
                "unit": unit,
                "quantity": user_scenario_qty,  # 7.30 - User's exact scenario
                "rate": test_item.get('rate', 1000),
                "amount": user_scenario_qty * test_item.get('rate', 1000),
                "gst_rate": 18.0,
                "gst_amount": user_scenario_qty * test_item.get('rate', 1000) * 0.18,
                "total_with_gst": user_scenario_qty * test_item.get('rate', 1000) * 1.18
            }
        ],
        "subtotal": user_scenario_qty * test_item.get('rate', 1000),
        "total_gst_amount": user_scenario_qty * test_item.get('rate', 1000) * 0.18,
        "total_amount": user_scenario_qty * test_item.get('rate', 1000) * 1.18,
        "created_by": "test-user"
    }
    
    print(f"Attempting to create invoice with {user_scenario_qty} {unit} when {actual_remaining:.3f} {unit} available...")
    
    # Test regular invoice endpoint
    regular_invoice_response = requests.post(f'{base_url}/invoices', json=user_invoice_data, headers=headers)
    
    if regular_invoice_response.status_code == 200:
        # Invoice was created - THIS IS THE BUG
        invoice_result = regular_invoice_response.json()
        invoice_id = invoice_result.get('invoice_id')
        print(f"🚨 CRITICAL BUG CONFIRMED: Regular invoice endpoint created invoice {invoice_id}")
        print(f"   This allows over-billing: {user_scenario_qty} > {actual_remaining:.3f}")
        print(f"   USER'S ISSUE REPRODUCED EXACTLY!")
        
    elif regular_invoice_response.status_code == 400:
        # Invoice was blocked - Good!
        error_detail = regular_invoice_response.json().get('detail', {})
        print(f"✅ Regular invoice endpoint correctly blocked over-quantity")
        print(f"   Error: {error_detail.get('message', 'Unknown error')}")
        
    else:
        print(f"❌ Unexpected response: {regular_invoice_response.status_code}")
        print(f"   Response: {regular_invoice_response.text}")
    
    # Step 6: Test Enhanced Invoice Creation
    print(f"\n🧾 STEP 6: Testing Enhanced Invoice Creation...")
    
    enhanced_invoice_data = {
        "project_id": project_id,
        "project_name": project_name,
        "client_id": test_project.get('client_id', 'test-client'),
        "client_name": test_project.get('client_name', 'Test Client'),
        "invoice_type": "tax_invoice",
        "invoice_gst_type": "CGST_SGST",
        "created_by": "test-user",
        "invoice_items": [
            {
                "boq_item_id": test_item.get('serial_number', '1'),
                "serial_number": test_item.get('serial_number', '1'),
                "description": f"{item_desc} - Enhanced Test",
                "unit": unit,
                "quantity": user_scenario_qty,
                "rate": test_item.get('rate', 1000),
                "amount": user_scenario_qty * test_item.get('rate', 1000)
            }
        ],
        "subtotal": user_scenario_qty * test_item.get('rate', 1000),
        "cgst_amount": user_scenario_qty * test_item.get('rate', 1000) * 0.09,
        "sgst_amount": user_scenario_qty * test_item.get('rate', 1000) * 0.09,
        "total_gst_amount": user_scenario_qty * test_item.get('rate', 1000) * 0.18,
        "total_amount": user_scenario_qty * test_item.get('rate', 1000) * 1.18
    }
    
    enhanced_invoice_response = requests.post(f'{base_url}/invoices/enhanced', json=enhanced_invoice_data, headers=headers)
    
    if enhanced_invoice_response.status_code == 200:
        enhanced_result = enhanced_invoice_response.json()
        enhanced_invoice_id = enhanced_result.get('invoice_id')
        print(f"🚨 Enhanced invoice endpoint also allows over-quantity: {enhanced_invoice_id}")
        
    elif enhanced_invoice_response.status_code == 400:
        error_detail = enhanced_invoice_response.json().get('detail', {})
        print(f"✅ Enhanced invoice endpoint correctly blocked over-quantity")
        print(f"   Error: {error_detail.get('message', 'Unknown error')}")
        
    else:
        print(f"❌ Enhanced invoice unexpected response: {enhanced_invoice_response.status_code}")
    
    # Summary
    print(f"\n" + "=" * 70)
    print(f"📊 USER SCENARIO TEST SUMMARY")
    print(f"=" * 70)
    print(f"Scenario: Bill Qty {user_scenario_qty} when Remaining {actual_remaining:.3f}")
    print(f"Regular Invoice Endpoint: {'VULNERABLE' if regular_invoice_response.status_code == 200 else 'PROTECTED'}")
    print(f"Enhanced Invoice Endpoint: {'VULNERABLE' if enhanced_invoice_response.status_code == 200 else 'PROTECTED'}")
    print(f"Validation Endpoint: {'BROKEN' if validation_result.get('valid') else 'WORKING'}")
    print(f"RA Tracking: {'BROKEN' if len(ra_items) == 0 else 'WORKING'}")
    
    if regular_invoice_response.status_code == 200:
        print(f"\n🚨 CRITICAL FINDING: User's exact issue reproduced!")
        print(f"   The regular /api/invoices endpoint allows over-billing")
        print(f"   This is a serious financial security vulnerability")
    else:
        print(f"\n✅ User's issue appears to be resolved")
        print(f"   Over-quantity invoices are being blocked correctly")

if __name__ == "__main__":
    test_user_scenario()