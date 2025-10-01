#!/usr/bin/env python3
"""
🔍 RA TRACKING DEBUG TEST
Debug the RA tracking system to understand why validation endpoint fails
"""

import requests
import sys
import json
from datetime import datetime

class RATrackingDebugTester:
    def __init__(self):
        self.base_url = "https://template-maestro.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if data is not None:
            headers['Content-Type'] = 'application/json'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
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
        print("🔐 Authenticating...")
        
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

    def debug_ra_tracking(self):
        """Debug RA tracking for existing projects"""
        print("\n🔍 Debugging RA Tracking System...")
        
        # Get all projects
        success, projects = self.make_request('GET', 'projects')
        if not success:
            print(f"❌ Failed to get projects: {projects}")
            return
        
        print(f"📊 Found {len(projects)} projects")
        
        # Test RA tracking for each project
        for i, project in enumerate(projects[:3]):  # Test first 3 projects
            project_id = project.get('id')
            project_name = project.get('project_name', 'Unknown')
            
            print(f"\n🏗️ Project {i+1}: {project_name} (ID: {project_id})")
            
            # Get project details
            success, project_details = self.make_request('GET', f'projects/{project_id}')
            if success:
                boq_items = project_details.get('boq_items', [])
                print(f"   📋 BOQ Items: {len(boq_items)}")
                
                for j, item in enumerate(boq_items[:2]):  # Show first 2 items
                    desc = item.get('description', 'Unknown')[:50]
                    total_qty = item.get('quantity', 0)
                    billed_qty = item.get('billed_quantity', 0)
                    remaining = total_qty - billed_qty
                    
                    print(f"      Item {j+1}: {desc}")
                    print(f"         Total: {total_qty}, Billed: {billed_qty}, Remaining: {remaining}")
            
            # Test RA tracking endpoint
            success, ra_tracking = self.make_request('GET', f'projects/{project_id}/ra-tracking')
            if success:
                items = ra_tracking.get('items', [])
                print(f"   🔄 RA Tracking Items: {len(items)}")
                
                for j, item in enumerate(items[:2]):  # Show first 2 items
                    desc = item.get('description', 'Unknown')[:50]
                    balance_qty = item.get('balance_qty', 0)
                    overall_qty = item.get('overall_qty', 0)
                    ra_usage = item.get('ra_usage', {})
                    
                    print(f"      RA Item {j+1}: {desc}")
                    print(f"         Overall: {overall_qty}, Balance: {balance_qty}, Usage: {ra_usage}")
            else:
                print(f"   ❌ RA Tracking failed: {ra_tracking}")
            
            # Test validation endpoint
            if boq_items:
                validation_data = {
                    "project_id": project_id,
                    "invoice_items": [
                        {
                            "boq_item_id": "1",
                            "quantity": 1.0,
                            "description": boq_items[0].get('description', 'Test Item')
                        }
                    ]
                }
                
                success, validation_result = self.make_request('POST', 'invoices/validate-quantities', validation_data)
                if success:
                    is_valid = validation_result.get('valid', False)
                    errors = validation_result.get('errors', [])
                    warnings = validation_result.get('warnings', [])
                    
                    print(f"   ✅ Validation: Valid={is_valid}, Errors={len(errors)}, Warnings={len(warnings)}")
                    
                    if errors:
                        for error in errors[:2]:
                            print(f"      Error: {error}")
                    if warnings:
                        for warning in warnings[:2]:
                            print(f"      Warning: {warning}")
                else:
                    print(f"   ❌ Validation failed: {validation_result}")

    def test_specific_project_validation(self):
        """Test validation on a specific project with known data"""
        print("\n🎯 Testing Specific Project Validation...")
        
        # Create a test project with known quantities
        client_data = {
            "name": "Debug Test Client",
            "gst_no": "29ABCDE1234F1Z5",
            "bill_to_address": "Debug Address, Bangalore, Karnataka - 560001",
            "contact_person": "Debug Person",
            "phone": "+91-9876543210",
            "email": "debug@test.com"
        }
        
        success, result = self.make_request('POST', 'clients', client_data)
        if not success:
            print(f"❌ Failed to create client: {result}")
            return
        
        client_id = result['client_id']
        print(f"✅ Created client: {client_id}")
        
        # Create project with specific BOQ data
        project_data = {
            "project_name": "Debug RA Tracking Project",
            "architect": "Debug Architect",
            "client_id": client_id,
            "client_name": "Debug Test Client",
            "project_metadata": {
                "project_name": "Debug RA Tracking Project",
                "architect": "Debug Architect",
                "client": "Debug Test Client",
                "location": "Debug Location"
            },
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Foundation Work",
                    "unit": "Cum",
                    "quantity": 100.0,
                    "rate": 5000.0,
                    "amount": 500000.0,
                    "billed_quantity": 95.0,  # 5.0 remaining
                    "gst_rate": 18.0
                },
                {
                    "serial_number": "2",
                    "description": "Steel Structure",
                    "unit": "Kg",
                    "quantity": 1000.0,
                    "rate": 350.0,
                    "amount": 350000.0,
                    "billed_quantity": 0.0,  # 1000.0 remaining
                    "gst_rate": 18.0
                }
            ],
            "total_project_value": 850000.0,
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'projects', project_data)
        if not success:
            print(f"❌ Failed to create project: {result}")
            return
        
        project_id = result['project_id']
        print(f"✅ Created project: {project_id}")
        
        # Test RA tracking
        success, ra_tracking = self.make_request('GET', f'projects/{project_id}/ra-tracking')
        if success:
            print(f"✅ RA Tracking successful")
            items = ra_tracking.get('items', [])
            print(f"   Items returned: {len(items)}")
            
            for i, item in enumerate(items):
                print(f"   Item {i+1}:")
                print(f"      Description: {item.get('description', 'Unknown')}")
                print(f"      Overall Qty: {item.get('overall_qty', 0)}")
                print(f"      Balance Qty: {item.get('balance_qty', 0)}")
                print(f"      RA Usage: {item.get('ra_usage', {})}")
        else:
            print(f"❌ RA Tracking failed: {ra_tracking}")
        
        # Test validation with different scenarios
        test_scenarios = [
            (4.0, "Under limit - should be valid"),
            (6.0, "Over limit - should be invalid"),
            (5.0, "Exact limit - should be valid"),
            (100.0, "Way under limit for item 2 - should be valid"),
            (1001.0, "Over limit for item 2 - should be invalid"),
        ]
        
        for quantity, description in test_scenarios:
            print(f"\n   Testing: {description} (Qty: {quantity})")
            
            validation_data = {
                "project_id": project_id,
                "invoice_items": [
                    {
                        "boq_item_id": "1" if quantity <= 10 else "2",
                        "quantity": quantity,
                        "description": "Foundation Work" if quantity <= 10 else "Steel Structure"
                    }
                ]
            }
            
            success, validation_result = self.make_request('POST', 'invoices/validate-quantities', validation_data)
            if success:
                is_valid = validation_result.get('valid', False)
                errors = validation_result.get('errors', [])
                warnings = validation_result.get('warnings', [])
                
                print(f"      Result: Valid={is_valid}, Errors={len(errors)}, Warnings={len(warnings)}")
                
                if errors:
                    for error in errors:
                        print(f"         Error: {error}")
            else:
                print(f"      ❌ Validation failed: {validation_result}")

    def run_debug_tests(self):
        """Run all debug tests"""
        print("🔍 RA TRACKING DEBUG TEST")
        print("=" * 60)
        
        if not self.authenticate():
            return False
        
        self.debug_ra_tracking()
        self.test_specific_project_validation()
        
        print("\n" + "=" * 60)
        print("🔍 DEBUG TEST COMPLETED")
        print("=" * 60)

if __name__ == "__main__":
    tester = RATrackingDebugTester()
    tester.run_debug_tests()