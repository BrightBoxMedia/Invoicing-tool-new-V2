#!/usr/bin/env python3
"""
Check current state of projects and invoices to understand the quantity validation issue
"""

import requests
import json

def check_current_state():
    base_url = 'https://projectpulse-42.preview.emergentagent.com/api'
    
    # Authenticate
    login_response = requests.post(f'{base_url}/auth/login', 
                                 json={'email': 'brightboxm@gmail.com', 'password': 'admin123'})
    
    if login_response.status_code != 200:
        print("❌ Authentication failed")
        return
    
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    print("🔍 CHECKING CURRENT STATE OF PROJECTS AND INVOICES")
    print("=" * 60)
    
    # Get projects
    projects_response = requests.get(f'{base_url}/projects', headers=headers)
    if projects_response.status_code == 200:
        projects = projects_response.json()
        print(f"📊 Found {len(projects)} projects")
        
        for i, project in enumerate(projects[:5]):  # Check first 5 projects
            project_id = project['id']
            project_name = project['project_name']
            print(f"\n🏗️ Project {i+1}: {project_name}")
            print(f"   ID: {project_id}")
            
            # Check BOQ items
            boq_items = project.get('boq_items', [])
            print(f"   📋 BOQ Items: {len(boq_items)}")
            
            for j, item in enumerate(boq_items[:3]):  # First 3 items per project
                desc = item.get('description', 'Unknown')[:40]
                qty = item.get('quantity', 0)
                billed = item.get('billed_quantity', 0)
                remaining = qty - billed
                unit = item.get('unit', 'nos')
                
                print(f"     {j+1}. {desc}")
                print(f"        Total: {qty} {unit}, Billed: {billed} {unit}, Remaining: {remaining} {unit}")
                
                # Check if this matches user's scenario (remaining around 1.009)
                if 0.5 < remaining < 2.0:
                    print(f"        ⚠️  LOW REMAINING QUANTITY - Potential test case for user scenario")
            
            # Check RA tracking for this project
            ra_response = requests.get(f'{base_url}/projects/{project_id}/ra-tracking', headers=headers)
            if ra_response.status_code == 200:
                ra_data = ra_response.json()
                ra_items = ra_data.get('items', [])
                print(f"   📊 RA Tracking: {len(ra_items)} items tracked")
                
                if len(ra_items) == 0 and len(boq_items) > 0:
                    print(f"   🚨 RA TRACKING ISSUE: {len(boq_items)} BOQ items but 0 RA tracking items")
            else:
                print(f"   ❌ RA Tracking Error: {ra_response.status_code}")
            
            # Get invoices for this project
            invoices_response = requests.get(f'{base_url}/invoices', headers=headers)
            if invoices_response.status_code == 200:
                all_invoices = invoices_response.json()
                project_invoices = [inv for inv in all_invoices if inv.get('project_id') == project_id]
                print(f"   🧾 Invoices: {len(project_invoices)} for this project")
                
                total_billed_by_invoices = 0
                for invoice in project_invoices:
                    for item in invoice.get('items', []):
                        if 'Foundation' in item.get('description', ''):
                            total_billed_by_invoices += item.get('quantity', 0)
                
                if total_billed_by_invoices > 0:
                    print(f"   📈 Total Foundation work billed via invoices: {total_billed_by_invoices}")
            
            print("-" * 50)
    
    # Test the validation endpoint with a known over-quantity scenario
    print("\n🧪 TESTING VALIDATION ENDPOINT WITH KNOWN DATA")
    
    # Find a project with BOQ items
    if projects:
        test_project = projects[0]
        test_project_id = test_project['id']
        boq_items = test_project.get('boq_items', [])
        
        if boq_items:
            test_item = boq_items[0]
            total_qty = test_item.get('quantity', 0)
            billed_qty = test_item.get('billed_quantity', 0)
            remaining_qty = total_qty - billed_qty
            
            print(f"Testing with project: {test_project['project_name']}")
            print(f"Item: {test_item.get('description', 'Unknown')}")
            print(f"Remaining quantity: {remaining_qty}")
            
            # Test with over-quantity
            over_qty = remaining_qty + 10.0 if remaining_qty > 0 else 50.0
            
            validation_data = {
                "project_id": test_project_id,
                "invoice_items": [
                    {
                        "boq_item_id": test_item.get('serial_number', '1'),
                        "description": test_item.get('description', 'Test Item'),
                        "quantity": over_qty
                    }
                ]
            }
            
            validation_response = requests.post(f'{base_url}/invoices/validate-quantities', 
                                              json=validation_data, headers=headers)
            
            if validation_response.status_code == 200:
                result = validation_response.json()
                is_valid = result.get('valid', False)
                errors = result.get('errors', [])
                
                print(f"Validation test: Requesting {over_qty} when {remaining_qty} available")
                print(f"Result: Valid={is_valid}, Errors={len(errors)}")
                
                if is_valid and over_qty > remaining_qty:
                    print("🚨 VALIDATION ENDPOINT BUG CONFIRMED: Allows over-quantity!")
                elif not is_valid and over_qty > remaining_qty:
                    print("✅ Validation endpoint working correctly")
            else:
                print(f"❌ Validation test failed: {validation_response.status_code}")

if __name__ == "__main__":
    check_current_state()