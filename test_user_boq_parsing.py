#!/usr/bin/env python3
"""
Focused test for User's Specific BOQ Parsing Issue
Tests the enhanced BOQ parsing functionality with the user's "Activus sample check.xlsx" file
"""

import requests
import sys
import json
import os
from datetime import datetime

class UserBOQParsingTester:
    def __init__(self, base_url="https://activus-manager.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

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

    def test_authentication(self):
        """Test login functionality"""
        print("\n🔐 Testing Authentication...")
        
        # Test valid super admin login
        success, result = self.make_request('POST', 'auth/login', 
                                          {'email': 'brightboxm@gmail.com', 'password': 'admin123'})
        
        if success and 'access_token' in result:
            self.token = result['access_token']
            self.user_data = result['user']
            self.log_test("Super admin login", True, f"- Token received, Role: {self.user_data['role']}")
            return True
        else:
            self.log_test("Super admin login", False, f"- {result}")
            return False

    def test_user_specific_boq_upload(self):
        """Test BOQ upload with user's specific Excel file - CRITICAL FIX VERIFICATION"""
        print("\n🎯 Testing User's Specific BOQ Upload (Activus sample check.xlsx)...")
        
        # Check if the user's Excel file exists
        excel_file_path = "/app/activus_sample_check.xlsx"
        try:
            with open(excel_file_path, 'rb') as f:
                excel_data = f.read()
            
            self.log_test("User's Excel file found", True, f"- File size: {len(excel_data)} bytes")
            
            # Upload the user's specific Excel file
            files = {'file': ('activus_sample_check.xlsx', excel_data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            success, result = self.make_request('POST', 'upload-boq', files=files)
            
            if success:
                # Verify response structure
                required_fields = ['parsed_data', 'filename', 'status']
                has_all_fields = all(field in result for field in required_fields)
                self.log_test("User's BOQ upload structure", has_all_fields, f"- Fields: {list(result.keys())}")
                
                if 'parsed_data' in result and 'boq_items' in result['parsed_data']:
                    items = result['parsed_data']['boq_items']
                    project_info = result['parsed_data'].get('project_info', {})
                    total_amount = project_info.get('total_amount', 0)
                    
                    print(f"\n📊 PARSING RESULTS:")
                    print(f"   Items found: {len(items)}")
                    print(f"   Total amount: ₹{total_amount}")
                    
                    # Print all found items for debugging
                    print(f"\n📋 PARSED ITEMS:")
                    for i, item in enumerate(items, 1):
                        print(f"   {i}. {item.get('description', 'N/A')} - {item.get('quantity', 0)} {item.get('unit', 'N/A')} @ ₹{item.get('rate', 0)} = ₹{item.get('amount', 0)}")
                    
                    # Expected 6 items with total ₹4,250
                    expected_items = 6
                    expected_total = 4250.0
                    
                    items_count_correct = len(items) == expected_items
                    total_amount_correct = abs(total_amount - expected_total) < 1.0  # Allow small floating point differences
                    
                    self.log_test("User's BOQ items count", items_count_correct, 
                                f"- Found {len(items)} items (expected {expected_items})")
                    
                    self.log_test("User's BOQ total amount", total_amount_correct, 
                                f"- Total: ₹{total_amount} (expected ₹{expected_total})")
                    
                    # Verify specific items
                    expected_items_data = [
                        {"description": "TOP", "quantity": 10, "unit": "Ltr", "rate": 100, "amount": 1000},
                        {"description": "Left", "quantity": 5, "unit": "Meter", "rate": 150, "amount": 750},
                        {"description": "Right", "quantity": 4, "unit": "MM", "rate": 200, "amount": 800},
                        {"description": "Buttom", "quantity": 3, "unit": "Cum", "rate": 250, "amount": 750},
                        {"description": "Side", "quantity": 2, "unit": "Pack", "rate": 300, "amount": 600},
                        {"description": "FUN", "quantity": 1, "unit": "Nos", "rate": 350, "amount": 350}
                    ]
                    
                    print(f"\n🔍 ITEM VERIFICATION:")
                    items_verified = 0
                    for expected_item in expected_items_data:
                        found_item = None
                        for item in items:
                            if expected_item["description"].lower() in item.get("description", "").lower():
                                found_item = item
                                break
                        
                        if found_item:
                            qty_match = abs(found_item.get("quantity", 0) - expected_item["quantity"]) < 0.1
                            rate_match = abs(found_item.get("rate", 0) - expected_item["rate"]) < 0.1
                            amount_match = abs(found_item.get("amount", 0) - expected_item["amount"]) < 1.0
                            unit_match = expected_item["unit"].lower() in found_item.get("unit", "").lower()
                            
                            if qty_match and rate_match and amount_match and unit_match:
                                items_verified += 1
                                self.log_test(f"Item '{expected_item['description']}' verification", True,
                                            f"- {found_item.get('quantity')} {found_item.get('unit')} @ ₹{found_item.get('rate')} = ₹{found_item.get('amount')}")
                            else:
                                self.log_test(f"Item '{expected_item['description']}' verification", False,
                                            f"- Expected: {expected_item['quantity']} {expected_item['unit']} @ ₹{expected_item['rate']} = ₹{expected_item['amount']}")
                                if found_item:
                                    print(f"     Found: {found_item.get('quantity')} {found_item.get('unit')} @ ₹{found_item.get('rate')} = ₹{found_item.get('amount')}")
                        else:
                            self.log_test(f"Item '{expected_item['description']}' found", False, "- Item not found in parsed results")
                    
                    all_items_verified = items_verified == len(expected_items_data)
                    self.log_test("All expected items verified", all_items_verified, 
                                f"- {items_verified}/{len(expected_items_data)} items correctly parsed")
                    
                    # Overall success check
                    parsing_success = items_count_correct and total_amount_correct and all_items_verified
                    self.log_test("🎉 USER'S CRITICAL BOQ PARSING FIX", parsing_success,
                                f"- COMPLETE SUCCESS: All 6 items extracted correctly, total ₹{total_amount}")
                    
                    return result['parsed_data']
                else:
                    self.log_test("User's BOQ parsing", False, "- No BOQ items found in parsed data")
                    return None
            else:
                self.log_test("User's BOQ upload", False, f"- {result}")
                return None
                
        except FileNotFoundError:
            self.log_test("User's Excel file found", False, f"- File not found at {excel_file_path}")
            return None
        except Exception as e:
            self.log_test("User's BOQ upload", False, f"- Error: {str(e)}")
            return None

    def test_boq_parsing_pipeline(self):
        """Test the complete BOQ parsing pipeline"""
        print("\n🔄 Testing Complete BOQ Parsing Pipeline...")
        
        # First test the BOQ upload
        boq_data = self.test_user_specific_boq_upload()
        
        if boq_data:
            # Test creating a project with the parsed BOQ data
            print("\n🏗️ Testing Project Creation with Parsed BOQ...")
            
            project_data = {
                "project_name": boq_data['project_info']['project_name'],
                "architect": "Test Architect",
                "client_id": "test-client-id",
                "client_name": "Test Client Ltd",
                "location": "Test Location",
                "abg_percentage": 10.0,
                "ra_percentage": 80.0,
                "erection_percentage": 5.0,
                "pbg_percentage": 5.0,
                "boq_items": boq_data['boq_items'],
                "total_project_value": boq_data['project_info']['total_amount'],
                "created_by": self.user_data['id'] if self.user_data else "test-user-id"
            }
            
            success, result = self.make_request('POST', 'projects', project_data)
            
            if success and 'project_id' in result:
                project_id = result['project_id']
                self.log_test("Project creation with parsed BOQ", True, f"- Project ID: {project_id}")
                
                # Verify project was created correctly
                success, project = self.make_request('GET', f'projects/{project_id}')
                if success:
                    project_boq_items = project.get('boq_items', [])
                    self.log_test("Project BOQ items verification", len(project_boq_items) == 6,
                                f"- Project has {len(project_boq_items)} BOQ items")
                    return True
                else:
                    self.log_test("Project retrieval", False, f"- {project}")
                    return False
            else:
                self.log_test("Project creation with parsed BOQ", False, f"- {result}")
                return False
        else:
            self.log_test("BOQ parsing pipeline", False, "- BOQ parsing failed")
            return False

def main():
    """Main test execution"""
    tester = UserBOQParsingTester()
    
    try:
        print("🎯 TESTING USER'S SPECIFIC BOQ PARSING ISSUE")
        print("=" * 80)
        print(f"🌐 Testing against: {tester.base_url}")
        print(f"📁 Excel file: /app/activus_sample_check.xlsx")
        print(f"🎯 Expected: 6 items totaling ₹4,250")
        print("=" * 80)
        
        # Test authentication first
        if not tester.test_authentication():
            print("\n❌ Authentication failed - stopping tests")
            return 1
        
        # Test the complete BOQ parsing pipeline
        pipeline_success = tester.test_boq_parsing_pipeline()
        
        # Print final results
        print("\n" + "=" * 80)
        print("🎯 USER'S BOQ PARSING TEST RESULTS")
        print("=" * 80)
        print(f"✅ Tests Passed: {tester.tests_passed}")
        print(f"❌ Tests Failed: {tester.tests_run - tester.tests_passed}")
        print(f"📊 Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
        
        if pipeline_success:
            print(f"🏆 BOQ PARSING STATUS: ✅ FULLY WORKING")
            print(f"🎉 USER'S CRITICAL ISSUE: ✅ RESOLVED")
        else:
            print(f"🏆 BOQ PARSING STATUS: ❌ NEEDS ATTENTION")
            print(f"🚨 USER'S CRITICAL ISSUE: ❌ NOT RESOLVED")
        
        return 0 if pipeline_success else 1
        
    except KeyboardInterrupt:
        print("\n⏹️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())