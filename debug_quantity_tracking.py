#!/usr/bin/env python3
"""
DEBUG QUANTITY TRACKING SYSTEM
Debugging the quantity tracking and validation system to find root causes
"""

import requests
import sys
import json
from datetime import datetime

class QuantityTrackingDebugger:
    def __init__(self):
        self.base_url = "https://billingflow-app.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None

    def make_request(self, method, endpoint, data=None, files=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files is None and data is not None:
            headers['Content-Type'] = 'application/json'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers={k: v for k, v in headers.items() if k != 'Content-Type'}, 
                                           data=data, files=files)
                else:
                    response = requests.post(url, headers=headers, json=data)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.content
            else:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                except:
                    error_detail = response.text
                return False, f"Status {response.status_code}: {error_detail}"

        except Exception as e:
            return False, f"Request failed: {str(e)}"

    def authenticate(self):
        """Authenticate with the system"""
        success, result = self.make_request('POST', 'auth/login', 
                                          {'email': 'brightboxm@gmail.com', 'password': 'admin123'})
        
        if success and 'access_token' in result:
            self.token = result['access_token']
            self.user_data = result['user']
            print(f"✅ Authenticated as {self.user_data['email']}")
            return True
        else:
            print(f"❌ Authentication failed: {result}")
            return False

    def debug_existing_data(self):
        """Debug existing projects and invoices to understand the data structure"""
        print("\n🔍 DEBUGGING EXISTING DATA STRUCTURE")
        print("=" * 50)
        
        # Get all projects
        success, projects = self.make_request('GET', 'projects')
        if success:
            print(f"📊 Found {len(projects)} projects")
            
            for i, project in enumerate(projects[:3]):  # Check first 3 projects
                print(f"\n📋 Project {i+1}: {project.get('project_name', 'Unknown')}")
                print(f"   ID: {project.get('id', 'N/A')}")
                print(f"   BOQ Items: {len(project.get('boq_items', []))}")
                
                # Check BOQ items structure
                boq_items = project.get('boq_items', [])
                for j, item in enumerate(boq_items[:2]):  # Check first 2 items
                    print(f"   BOQ Item {j+1}:")
                    print(f"     Description: {item.get('description', 'N/A')}")
                    print(f"     Quantity: {item.get('quantity', 'N/A')}")
                    print(f"     Billed Quantity: {item.get('billed_quantity', 'N/A')}")
                    print(f"     Rate: {item.get('rate', 'N/A')}")
                
                # Get RA tracking for this project
                success_ra, ra_data = self.make_request('GET', f'projects/{project["id"]}/ra-tracking')
                if success_ra:
                    ra_tracking = ra_data.get('ra_tracking', [])
                    print(f"   RA Tracking Items: {len(ra_tracking)}")
                    
                    for k, ra_item in enumerate(ra_tracking[:2]):  # Check first 2 RA items
                        print(f"   RA Item {k+1}:")
                        print(f"     Description: {ra_item.get('description', 'N/A')}")
                        print(f"     Overall Qty: {ra_item.get('overall_qty', 'N/A')}")
                        print(f"     Balance Qty: {ra_item.get('balance_qty', 'N/A')}")
                        print(f"     RA Usage: {ra_item.get('ra_usage', {})}")
                else:
                    print(f"   ❌ Failed to get RA tracking: {ra_data}")
        else:
            print(f"❌ Failed to get projects: {projects}")
        
        # Get all invoices
        success, invoices = self.make_request('GET', 'invoices')
        if success:
            print(f"\n📄 Found {len(invoices)} invoices")
            
            # Group invoices by project
            project_invoices = {}
            for invoice in invoices:
                project_id = invoice.get('project_id', 'Unknown')
                if project_id not in project_invoices:
                    project_invoices[project_id] = []
                project_invoices[project_id].append(invoice)
            
            for project_id, proj_invoices in list(project_invoices.items())[:3]:  # Check first 3 projects
                print(f"\n📋 Project {project_id} has {len(proj_invoices)} invoices:")
                
                for i, invoice in enumerate(proj_invoices[:2]):  # Check first 2 invoices
                    print(f"   Invoice {i+1}:")
                    print(f"     ID: {invoice.get('id', 'N/A')}")
                    print(f"     Number: {invoice.get('invoice_number', 'N/A')}")
                    print(f"     RA Number: {invoice.get('ra_number', 'N/A')}")
                    print(f"     Type: {invoice.get('invoice_type', 'N/A')}")
                    print(f"     Items: {len(invoice.get('items', []))}")
                    
                    # Check invoice items
                    items = invoice.get('items', [])
                    for j, item in enumerate(items[:2]):  # Check first 2 items
                        print(f"     Item {j+1}:")
                        print(f"       Description: {item.get('description', 'N/A')}")
                        print(f"       Quantity: {item.get('quantity', 'N/A')}")
                        print(f"       BOQ Item ID: {item.get('boq_item_id', 'N/A')}")
        else:
            print(f"❌ Failed to get invoices: {invoices}")

    def test_validation_with_real_data(self):
        """Test validation with real existing data"""
        print("\n🧪 TESTING VALIDATION WITH REAL DATA")
        print("=" * 50)
        
        # Get a real project
        success, projects = self.make_request('GET', 'projects')
        if not success or not projects:
            print("❌ No projects available for testing")
            return
        
        test_project = projects[0]
        project_id = test_project['id']
        print(f"📋 Testing with project: {test_project.get('project_name', 'Unknown')}")
        
        # Get BOQ items
        boq_items = test_project.get('boq_items', [])
        if not boq_items:
            print("❌ No BOQ items in project")
            return
        
        test_item = boq_items[0]
        print(f"🔧 Testing with BOQ item: {test_item.get('description', 'Unknown')}")
        print(f"   Total Quantity: {test_item.get('quantity', 0)}")
        print(f"   Billed Quantity: {test_item.get('billed_quantity', 0)}")
        
        # Test validation endpoint with this real data
        validation_data = {
            "project_id": project_id,
            "selected_items": [
                {
                    "description": test_item.get('description', ''),
                    "requested_qty": float(test_item.get('quantity', 0)) + 100  # Request way more than available
                }
            ]
        }
        
        print(f"\n🔍 Testing validation with over-quantity request:")
        print(f"   Requested: {validation_data['selected_items'][0]['requested_qty']}")
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', validation_data)
        
        if success:
            is_valid = result.get('valid', True)
            errors = result.get('errors', [])
            print(f"   Validation Result: Valid={is_valid}, Errors={len(errors)}")
            
            if errors:
                for error in errors:
                    print(f"   Error: {error}")
            
            if is_valid:
                print("   ❌ PROBLEM: Validation passed when it should have failed")
            else:
                print("   ✅ Validation correctly failed")
        else:
            print(f"   ❌ Validation request failed: {result}")

    def test_invoice_creation_with_real_data(self):
        """Test invoice creation with real data to see what happens"""
        print("\n📄 TESTING INVOICE CREATION WITH REAL DATA")
        print("=" * 50)
        
        # Get a real project and client
        success, projects = self.make_request('GET', 'projects')
        if not success or not projects:
            print("❌ No projects available")
            return
        
        test_project = projects[0]
        project_id = test_project['id']
        client_id = test_project.get('client_id', '')
        
        print(f"📋 Using project: {test_project.get('project_name', 'Unknown')}")
        
        # Get BOQ items
        boq_items = test_project.get('boq_items', [])
        if not boq_items:
            print("❌ No BOQ items in project")
            return
        
        test_item = boq_items[0]
        total_qty = float(test_item.get('quantity', 0))
        
        # Try to create an invoice with way more quantity than available
        over_quantity = total_qty + 1000  # Way over the limit
        
        invoice_data = {
            "project_id": project_id,
            "project_name": test_project.get('project_name', ''),
            "client_id": client_id,
            "client_name": test_project.get('client_name', ''),
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": test_item.get('serial_number', '1'),
                    "serial_number": test_item.get('serial_number', '1'),
                    "description": test_item.get('description', ''),
                    "unit": test_item.get('unit', 'nos'),
                    "quantity": over_quantity,
                    "rate": float(test_item.get('rate', 1000)),
                    "amount": over_quantity * float(test_item.get('rate', 1000)),
                    "gst_rate": 18.0,
                    "gst_amount": (over_quantity * float(test_item.get('rate', 1000))) * 0.18,
                    "total_with_gst": (over_quantity * float(test_item.get('rate', 1000))) * 1.18
                }
            ],
            "subtotal": over_quantity * float(test_item.get('rate', 1000)),
            "total_gst_amount": (over_quantity * float(test_item.get('rate', 1000))) * 0.18,
            "total_amount": (over_quantity * float(test_item.get('rate', 1000))) * 1.18,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        print(f"🚨 Attempting to create invoice with MASSIVE over-quantity:")
        print(f"   Item: {test_item.get('description', 'Unknown')}")
        print(f"   BOQ Total Quantity: {total_qty}")
        print(f"   Requested Quantity: {over_quantity}")
        print(f"   Over by: {over_quantity - total_qty}")
        
        # Try regular endpoint
        success, result = self.make_request('POST', 'invoices', invoice_data)
        
        if success and 'invoice_id' in result:
            print(f"   ❌ CRITICAL: Regular endpoint CREATED over-quantity invoice: {result['invoice_id']}")
        else:
            print(f"   ✅ Regular endpoint blocked over-quantity invoice: {result}")
        
        # Try enhanced endpoint
        enhanced_invoice_data = {
            "project_id": project_id,
            "project_name": test_project.get('project_name', ''),
            "client_id": client_id,
            "client_name": test_project.get('client_name', ''),
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id",
            "invoice_items": [
                {
                    "boq_item_id": test_item.get('serial_number', '1'),
                    "serial_number": test_item.get('serial_number', '1'),
                    "description": test_item.get('description', ''),
                    "unit": test_item.get('unit', 'nos'),
                    "quantity": over_quantity,
                    "rate": float(test_item.get('rate', 1000)),
                    "amount": over_quantity * float(test_item.get('rate', 1000))
                }
            ],
            "subtotal": over_quantity * float(test_item.get('rate', 1000)),
            "cgst_amount": (over_quantity * float(test_item.get('rate', 1000))) * 0.09,
            "sgst_amount": (over_quantity * float(test_item.get('rate', 1000))) * 0.09,
            "total_gst_amount": (over_quantity * float(test_item.get('rate', 1000))) * 0.18,
            "total_amount": (over_quantity * float(test_item.get('rate', 1000))) * 1.18
        }
        
        success, result = self.make_request('POST', 'invoices/enhanced', enhanced_invoice_data, expected_status=400)
        
        if success:
            print(f"   ✅ Enhanced endpoint blocked over-quantity invoice")
        else:
            # Check if it was created
            success_created, created_result = self.make_request('POST', 'invoices/enhanced', enhanced_invoice_data)
            if success_created:
                print(f"   ❌ CRITICAL: Enhanced endpoint CREATED over-quantity invoice: {created_result.get('invoice_id', 'Unknown')}")
            else:
                print(f"   ✅ Enhanced endpoint blocked over-quantity invoice")

    def run_debug_session(self):
        """Run complete debugging session"""
        print("🐛 QUANTITY TRACKING SYSTEM DEBUG SESSION")
        print("=" * 60)
        
        if not self.authenticate():
            return False
        
        self.debug_existing_data()
        self.test_validation_with_real_data()
        self.test_invoice_creation_with_real_data()
        
        print("\n" + "=" * 60)
        print("🏁 DEBUG SESSION COMPLETE")
        print("=" * 60)
        
        return True

if __name__ == "__main__":
    debugger = QuantityTrackingDebugger()
    debugger.run_debug_session()