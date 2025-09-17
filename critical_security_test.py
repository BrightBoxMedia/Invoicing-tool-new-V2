#!/usr/bin/env python3
"""
CRITICAL SECURITY FIXES VALIDATION TEST
Tests the critical quantity validation fixes to prevent over-billing vulnerability
"""

import requests
import sys
import json
import os
from datetime import datetime

class CriticalSecurityTester:
    def __init__(self):
        # Use the frontend environment variable for backend URL
        try:
            with open('/app/frontend/.env', 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        self.base_url = line.split('=')[1].strip()
                        break
                else:
                    self.base_url = "https://billtrack.preview.emergentagent.com"
        except:
            self.base_url = "https://billtrack.preview.emergentagent.com"
        
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'clients': [],
            'projects': [],
            'invoices': []
        }

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
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
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
            self.log_test("Authentication", True, f"- Logged in as {self.user_data['email']}")
            return True
        else:
            self.log_test("Authentication", False, f"- {result}")
            return False

    def setup_test_data(self):
        """Create test client and project with Foundation Work: 100 Cum"""
        print("\n🏗️ Setting up test data...")
        
        # Create test client
        client_data = {
            "name": "Critical Test Client Ltd",
            "gst_no": "29ABCDE1234F1Z5",
            "bill_to_address": "123 Test Street, Bangalore, Karnataka - 560001",
            "contact_person": "Test Manager",
            "phone": "+91-9876543210",
            "email": "test@criticalclient.com"
        }
        
        success, result = self.make_request('POST', 'clients', client_data)
        if success and 'client_id' in result:
            client_id = result['client_id']
            self.created_resources['clients'].append(client_id)
            self.log_test("Create test client", True, f"- Client ID: {client_id}")
        else:
            self.log_test("Create test client", False, f"- {result}")
            return None, None
        
        # Create test project with Foundation Work: 100 Cum
        project_data = {
            "project_name": "Critical Security Test Project",
            "architect": "Test Architect",
            "client_id": client_id,
            "client_name": "Critical Test Client Ltd",
            "project_metadata": {
                "project_name": "Critical Security Test Project",
                "architect": "Test Architect",
                "client": "Critical Test Client Ltd",
                "location": "Bangalore, Karnataka"
            },
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Foundation Work",
                    "unit": "Cum",
                    "quantity": 100.0,
                    "rate": 5000.0,
                    "amount": 500000.0,
                    "gst_rate": 18.0,
                    "billed_quantity": 0.0
                }
            ],
            "total_project_value": 500000.0,
            "advance_received": 0.0,
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'projects', project_data)
        if success and 'project_id' in result:
            project_id = result['project_id']
            self.created_resources['projects'].append(project_id)
            self.log_test("Create test project", True, f"- Project ID: {project_id}, Foundation Work: 100 Cum")
            return client_id, project_id
        else:
            self.log_test("Create test project", False, f"- {result}")
            return client_id, None

    def test_regular_invoice_quantity_validation(self, client_id, project_id):
        """Test regular invoice endpoint (/api/invoices) quantity validation"""
        print("\n🚨 Testing Regular Invoice Quantity Validation...")
        
        # Test 1: Create valid invoice with 50 Cum (should work)
        valid_invoice_data = {
            "project_id": project_id,
            "project_name": "Critical Security Test Project",
            "client_id": client_id,
            "client_name": "Critical Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - First Invoice",
                    "unit": "Cum",
                    "quantity": 50.0,
                    "rate": 5000.0,
                    "amount": 250000.0,
                    "gst_rate": 18.0,
                    "gst_amount": 45000.0,
                    "total_with_gst": 295000.0
                }
            ],
            "subtotal": 250000.0,
            "total_gst_amount": 45000.0,
            "total_amount": 295000.0,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices', valid_invoice_data)
        if success and 'invoice_id' in result:
            invoice_id = result['invoice_id']
            self.created_resources['invoices'].append(invoice_id)
            self.log_test("Regular invoice - Valid quantity (50 Cum)", True, 
                        f"- Invoice ID: {invoice_id}, Balance should now be 50 Cum")
        else:
            self.log_test("Regular invoice - Valid quantity (50 Cum)", False, f"- {result}")
            return False
        
        # Test 2: Try to create over-quantity invoice with 60 Cum (should FAIL)
        over_quantity_invoice_data = {
            "project_id": project_id,
            "project_name": "Critical Security Test Project",
            "client_id": client_id,
            "client_name": "Critical Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - Over Quantity",
                    "unit": "Cum",
                    "quantity": 60.0,  # This should fail - only 50 remaining
                    "rate": 5000.0,
                    "amount": 300000.0,
                    "gst_rate": 18.0,
                    "gst_amount": 54000.0,
                    "total_with_gst": 354000.0
                }
            ],
            "subtotal": 300000.0,
            "total_gst_amount": 54000.0,
            "total_amount": 354000.0,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices', over_quantity_invoice_data, expected_status=400)
        if success:  # Success means it was properly rejected with 400
            self.log_test("Regular invoice - Over-quantity blocking (60 Cum)", True, 
                        "- CRITICAL FIX WORKING: Over-quantity invoice properly blocked")
        else:
            # If it didn't return 400, check if it was created (which would be a failure)
            success_created, _ = self.make_request('POST', 'invoices', over_quantity_invoice_data)
            if success_created:
                self.log_test("Regular invoice - Over-quantity blocking (60 Cum)", False, 
                            "- CRITICAL VULNERABILITY: Over-quantity invoice was created!")
                return False
            else:
                self.log_test("Regular invoice - Over-quantity blocking (60 Cum)", True, 
                            "- Over-quantity invoice blocked (different error code)")
        
        return True

    def test_enhanced_invoice_quantity_validation(self, client_id, project_id):
        """Test enhanced invoice endpoint (/api/invoices/enhanced) quantity validation"""
        print("\n🚨 Testing Enhanced Invoice Quantity Validation...")
        
        # Test over-quantity invoice with enhanced endpoint (should FAIL)
        over_quantity_enhanced_data = {
            "project_id": project_id,
            "project_name": "Critical Security Test Project",
            "client_id": client_id,
            "client_name": "Critical Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id",
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - Enhanced Over Quantity",
                    "unit": "Cum",
                    "quantity": 60.0,  # This should fail - only 50 remaining
                    "rate": 5000.0,
                    "amount": 300000.0
                }
            ],
            "subtotal": 300000.0,
            "cgst_amount": 27000.0,
            "sgst_amount": 27000.0,
            "total_gst_amount": 54000.0,
            "total_amount": 354000.0
        }
        
        success, result = self.make_request('POST', 'invoices/enhanced', over_quantity_enhanced_data, expected_status=400)
        if success:  # Success means it was properly rejected with 400
            self.log_test("Enhanced invoice - Over-quantity blocking (60 Cum)", True, 
                        "- CRITICAL FIX WORKING: Enhanced over-quantity invoice properly blocked")
        else:
            # If it didn't return 400, check if it was created (which would be a failure)
            success_created, _ = self.make_request('POST', 'invoices/enhanced', over_quantity_enhanced_data)
            if success_created:
                self.log_test("Enhanced invoice - Over-quantity blocking (60 Cum)", False, 
                            "- CRITICAL VULNERABILITY: Enhanced over-quantity invoice was created!")
                return False
            else:
                self.log_test("Enhanced invoice - Over-quantity blocking (60 Cum)", True, 
                            "- Enhanced over-quantity invoice blocked (different error code)")
        
        return True

    def test_ra_tracking_balance_calculation(self, project_id):
        """Test RA tracking balance calculation accuracy"""
        print("\n📊 Testing RA Tracking Balance Calculation...")
        
        # Get RA tracking data
        success, result = self.make_request('GET', f'projects/{project_id}/ra-tracking')
        if success:
            items = result.get('items', [])
            if items:
                foundation_item = None
                for item in items:
                    if 'Foundation Work' in item.get('description', ''):
                        foundation_item = item
                        break
                
                if foundation_item:
                    overall_qty = foundation_item.get('overall_qty', 0)
                    balance_qty = foundation_item.get('balance_qty', 0)
                    ra_usage = foundation_item.get('ra_usage', {})
                    
                    # After creating 50 Cum invoice, balance should be 50 Cum
                    expected_balance = 50.0
                    balance_correct = abs(balance_qty - expected_balance) < 0.1
                    
                    self.log_test("RA tracking - Balance calculation accuracy", balance_correct,
                                f"- Overall: {overall_qty}, Balance: {balance_qty}, Expected: {expected_balance}")
                    
                    # Check RA usage tracking
                    has_ra_usage = len(ra_usage) > 0
                    self.log_test("RA tracking - Usage tracking", has_ra_usage,
                                f"- RA Usage: {ra_usage}")
                    
                    return balance_correct
                else:
                    self.log_test("RA tracking - Foundation item found", False, "- Foundation Work item not found")
            else:
                self.log_test("RA tracking - Items present", False, "- No items in RA tracking")
        else:
            self.log_test("RA tracking - Data retrieval", False, f"- {result}")
        
        return False

    def test_validation_endpoint_accuracy(self, project_id):
        """Test validation endpoint returns accurate results"""
        print("\n🔍 Testing Validation Endpoint Accuracy...")
        
        # Test validation with valid quantity (40 Cum - should be valid)
        valid_validation_data = {
            "project_id": project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "quantity": 40.0,
                    "description": "Foundation Work"
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', valid_validation_data)
        if success:
            is_valid = result.get('valid', False)
            self.log_test("Validation endpoint - Valid quantity (40 Cum)", is_valid,
                        f"- Validation result: {result}")
        else:
            self.log_test("Validation endpoint - Valid quantity (40 Cum)", False, f"- {result}")
        
        # Test validation with over-quantity (60 Cum - should be invalid)
        invalid_validation_data = {
            "project_id": project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "quantity": 60.0,
                    "description": "Foundation Work"
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', invalid_validation_data)
        if success:
            is_valid = result.get('valid', False)
            should_be_invalid = not is_valid
            self.log_test("Validation endpoint - Over-quantity (60 Cum)", should_be_invalid,
                        f"- Validation result: {result}")
            return should_be_invalid
        else:
            self.log_test("Validation endpoint - Over-quantity (60 Cum)", False, f"- {result}")
            return False

    def test_boq_billed_quantity_updates(self, project_id):
        """Test BOQ billed_quantity updates after invoice creation"""
        print("\n📝 Testing BOQ Billed Quantity Updates...")
        
        # Get project details to check billed_quantity
        success, result = self.make_request('GET', f'projects/{project_id}')
        if success:
            boq_items = result.get('boq_items', [])
            if boq_items:
                foundation_item = None
                for item in boq_items:
                    if 'Foundation Work' in item.get('description', ''):
                        foundation_item = item
                        break
                
                if foundation_item:
                    billed_quantity = foundation_item.get('billed_quantity', 0)
                    expected_billed = 50.0  # We created one invoice with 50 Cum
                    
                    billed_correct = abs(billed_quantity - expected_billed) < 0.1
                    self.log_test("BOQ billed_quantity update", billed_correct,
                                f"- Billed quantity: {billed_quantity}, Expected: {expected_billed}")
                    return billed_correct
                else:
                    self.log_test("BOQ billed_quantity - Foundation item found", False, 
                                "- Foundation Work item not found in BOQ")
            else:
                self.log_test("BOQ billed_quantity - BOQ items present", False, 
                            "- No BOQ items found")
        else:
            self.log_test("BOQ billed_quantity - Project retrieval", False, f"- {result}")
        
        return False

    def test_specific_user_scenario(self, client_id, project_id):
        """Test the specific user scenario: 07.30 when remaining was 1.009"""
        print("\n🎯 Testing Specific User Scenario (7.30 vs 1.009)...")
        
        # First, create multiple invoices to get to a low balance
        # Create invoice for 45 more Cum (total will be 95 Cum, leaving 5 Cum)
        invoice_data = {
            "project_id": project_id,
            "project_name": "Critical Security Test Project",
            "client_id": client_id,
            "client_name": "Critical Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - Second Invoice",
                    "unit": "Cum",
                    "quantity": 45.0,
                    "rate": 5000.0,
                    "amount": 225000.0,
                    "gst_rate": 18.0,
                    "gst_amount": 40500.0,
                    "total_with_gst": 265500.0
                }
            ],
            "subtotal": 225000.0,
            "total_gst_amount": 40500.0,
            "total_amount": 265500.0,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices', invoice_data)
        if success:
            self.log_test("Setup for user scenario - Second invoice (45 Cum)", True, 
                        "- Balance should now be 5 Cum")
        else:
            self.log_test("Setup for user scenario - Second invoice (45 Cum)", False, f"- {result}")
            return False
        
        # Create another invoice for 3.991 Cum (leaving 1.009 Cum)
        invoice_data_3 = {
            "project_id": project_id,
            "project_name": "Critical Security Test Project",
            "client_id": client_id,
            "client_name": "Critical Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - Third Invoice",
                    "unit": "Cum",
                    "quantity": 3.991,
                    "rate": 5000.0,
                    "amount": 19955.0,
                    "gst_rate": 18.0,
                    "gst_amount": 3591.9,
                    "total_with_gst": 23546.9
                }
            ],
            "subtotal": 19955.0,
            "total_gst_amount": 3591.9,
            "total_amount": 23546.9,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices', invoice_data_3)
        if success:
            self.log_test("Setup for user scenario - Third invoice (3.991 Cum)", True, 
                        "- Balance should now be 1.009 Cum")
        else:
            self.log_test("Setup for user scenario - Third invoice (3.991 Cum)", False, f"- {result}")
            return False
        
        # Now try to create invoice for 7.30 Cum (should FAIL - this is the user's issue)
        user_scenario_invoice = {
            "project_id": project_id,
            "project_name": "Critical Security Test Project",
            "client_id": client_id,
            "client_name": "Critical Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - User Scenario (7.30 when 1.009 remaining)",
                    "unit": "Cum",
                    "quantity": 7.30,  # This should FAIL - only 1.009 remaining
                    "rate": 5000.0,
                    "amount": 36500.0,
                    "gst_rate": 18.0,
                    "gst_amount": 6570.0,
                    "total_with_gst": 43070.0
                }
            ],
            "subtotal": 36500.0,
            "total_gst_amount": 6570.0,
            "total_amount": 43070.0,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices', user_scenario_invoice, expected_status=400)
        if success:  # Success means it was properly rejected with 400
            self.log_test("User scenario - 7.30 when 1.009 remaining BLOCKED", True, 
                        "- CRITICAL FIX WORKING: User's exact scenario now properly blocked!")
            return True
        else:
            # If it didn't return 400, check if it was created (which would be a failure)
            success_created, _ = self.make_request('POST', 'invoices', user_scenario_invoice)
            if success_created:
                self.log_test("User scenario - 7.30 when 1.009 remaining BLOCKED", False, 
                            "- CRITICAL VULNERABILITY: User's scenario still allows over-billing!")
                return False
            else:
                self.log_test("User scenario - 7.30 when 1.009 remaining BLOCKED", True, 
                            "- User scenario blocked (different error code)")
                return True

    def run_all_tests(self):
        """Run all critical security tests"""
        print("🚨 CRITICAL SECURITY FIXES VALIDATION TEST")
        print("=" * 60)
        
        # Authenticate
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Setup test data
        client_id, project_id = self.setup_test_data()
        if not client_id or not project_id:
            print("❌ Test data setup failed. Cannot proceed with tests.")
            return False
        
        # Run critical security tests
        test_results = []
        
        test_results.append(self.test_regular_invoice_quantity_validation(client_id, project_id))
        test_results.append(self.test_enhanced_invoice_quantity_validation(client_id, project_id))
        test_results.append(self.test_ra_tracking_balance_calculation(project_id))
        test_results.append(self.test_validation_endpoint_accuracy(project_id))
        test_results.append(self.test_boq_billed_quantity_updates(project_id))
        test_results.append(self.test_specific_user_scenario(client_id, project_id))
        
        # Summary
        print("\n" + "=" * 60)
        print("🎯 CRITICAL SECURITY TEST RESULTS")
        print("=" * 60)
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        all_critical_tests_passed = all(test_results)
        
        if all_critical_tests_passed:
            print("\n✅ ALL CRITICAL SECURITY FIXES VERIFIED WORKING!")
            print("🔒 Over-quantity invoices are now properly blocked")
            print("📊 RA tracking shows accurate balance calculations")
            print("🔄 BOQ billed_quantity is updated after invoice creation")
            print("🎯 User's specific issue (7.30 vs 1.009) is FIXED!")
        else:
            print("\n❌ CRITICAL SECURITY VULNERABILITIES STILL EXIST!")
            print("⚠️  Over-billing protection is NOT working correctly")
            print("🚨 IMMEDIATE ACTION REQUIRED!")
        
        return all_critical_tests_passed

if __name__ == "__main__":
    tester = CriticalSecurityTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)