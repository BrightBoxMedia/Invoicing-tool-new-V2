#!/usr/bin/env python3
"""
CRITICAL USER ISSUE TESTING - QUANTITY VALIDATION BLOCKER
Testing the exact user scenario: "Bill Qty 7.30" accepted when "Remaining was 1.009"

This test focuses specifically on:
1. Regular Invoice Creation with Over-Quantity (/api/invoices)
2. Enhanced Invoice Creation (/api/invoices/enhanced) 
3. RA Tracking System (/api/projects/{project_id}/ra-tracking)
4. Quantity Validation Endpoint (/api/invoices/validate-quantities)
5. BOQ Data Structure and billed_quantity updates
"""

import requests
import sys
import json
from datetime import datetime

class QuantityValidationTester:
    def __init__(self, base_url="https://template-maestro.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_project_id = None
        self.test_client_id = None

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
        """Authenticate with super admin credentials"""
        print("🔐 Authenticating...")
        
        success, result = self.make_request('POST', 'auth/login', 
                                          {'email': 'brightboxm@gmail.com', 'password': 'admin123'})
        
        if success and 'access_token' in result:
            self.token = result['access_token']
            self.user_data = result['user']
            self.log_test("Authentication", True, f"- Logged in as {self.user_data['role']}")
            return True
        else:
            self.log_test("Authentication", False, f"- {result}")
            return False

    def setup_test_data(self):
        """Create test client and project with BOQ items for quantity validation testing"""
        print("\n🏗️ Setting up test data...")
        
        # Create test client
        client_data = {
            "name": "Quantity Test Client Ltd",
            "gst_no": "29ABCDE1234F1Z5",
            "bill_to_address": "123 Test Street, Bangalore, Karnataka - 560001",
            "contact_person": "Test Manager",
            "phone": "+91-9876543210",
            "email": "test@quantitytest.com"
        }
        
        success, result = self.make_request('POST', 'clients', client_data)
        if success and 'client_id' in result:
            self.test_client_id = result['client_id']
            self.log_test("Create test client", True, f"- Client ID: {self.test_client_id}")
        else:
            self.log_test("Create test client", False, f"- {result}")
            return False

        # Create test project with specific BOQ items for quantity testing
        project_data = {
            "project_name": "Quantity Validation Test Project",
            "architect": "Test Architect",
            "client_id": self.test_client_id,
            "client_name": "Quantity Test Client Ltd",
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Foundation Work",
                    "unit": "Cum",
                    "quantity": 100.0,  # Total available quantity
                    "rate": 5000.0,
                    "amount": 500000.0,
                    "billed_quantity": 0.0,  # Initially no quantity billed
                    "gst_rate": 18.0
                },
                {
                    "serial_number": "2", 
                    "description": "Steel Structure Work",
                    "unit": "Kg",
                    "quantity": 50.0,  # Small quantity for testing edge cases
                    "rate": 350.0,
                    "amount": 17500.0,
                    "billed_quantity": 0.0,
                    "gst_rate": 18.0
                }
            ],
            "total_project_value": 517500.0,
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'projects', project_data)
        if success and 'project_id' in result:
            self.test_project_id = result['project_id']
            self.log_test("Create test project", True, f"- Project ID: {self.test_project_id}")
            return True
        else:
            self.log_test("Create test project", False, f"- {result}")
            return False

    def test_ra_tracking_system(self):
        """Test RA Tracking Balance Calculation System"""
        print("\n📊 Testing RA Tracking System...")
        
        if not self.test_project_id:
            self.log_test("RA Tracking - Setup", False, "- No test project available")
            return False
        
        # Test RA tracking endpoint
        success, result = self.make_request('GET', f'projects/{self.test_project_id}/ra-tracking')
        
        if success:
            items = result.get('items', [])
            project_id = result.get('project_id')
            
            self.log_test("RA Tracking endpoint", True, f"- Found {len(items)} trackable items")
            
            # Check if items have proper balance calculations
            if items:
                first_item = items[0]
                has_balance_fields = all(field in first_item for field in ['overall_qty', 'balance_qty', 'description'])
                self.log_test("RA Tracking item structure", has_balance_fields, 
                            f"- Item: {first_item.get('description', 'Unknown')}, Balance: {first_item.get('balance_qty', 0)}")
                
                # Check if balance calculations are correct (should equal overall_qty initially)
                balance_correct = first_item.get('balance_qty') == first_item.get('overall_qty')
                self.log_test("RA Tracking balance calculation", balance_correct,
                            f"- Overall: {first_item.get('overall_qty', 0)}, Balance: {first_item.get('balance_qty', 0)}")
                return True
            else:
                self.log_test("RA Tracking items", False, "- No items returned despite BOQ having items")
                return False
        else:
            self.log_test("RA Tracking endpoint", False, f"- {result}")
            return False

    def test_quantity_validation_endpoint(self):
        """Test Quantity Validation Endpoint"""
        print("\n🔍 Testing Quantity Validation Endpoint...")
        
        if not self.test_project_id:
            self.log_test("Quantity Validation - Setup", False, "- No test project available")
            return False
        
        # Test 1: Valid quantity (within limits)
        valid_validation_data = {
            "project_id": self.test_project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "description": "Foundation Work",
                    "quantity": 50.0  # Half of available 100.0
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', valid_validation_data)
        if success:
            is_valid = result.get('valid', False)
            self.log_test("Quantity Validation - Valid case", is_valid, 
                        f"- 50.0 Cum from 100.0 available: {'Valid' if is_valid else 'Invalid'}")
        else:
            self.log_test("Quantity Validation - Valid case", False, f"- {result}")
        
        # Test 2: User's exact scenario - Over quantity (7.30 vs 1.009)
        # First, let's simulate that 98.991 has already been billed (leaving 1.009)
        # We'll create an invoice first to reduce available quantity
        
        # Create first invoice to consume most quantity
        first_invoice_data = {
            "project_id": self.test_project_id,
            "project_name": "Quantity Validation Test Project",
            "client_id": self.test_client_id,
            "client_name": "Quantity Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - First Invoice",
                    "unit": "Cum",
                    "quantity": 98.991,  # Leave only 1.009 remaining
                    "rate": 5000.0,
                    "amount": 494955.0,
                    "gst_rate": 18.0,
                    "gst_amount": 89091.9,
                    "total_with_gst": 584046.9
                }
            ],
            "subtotal": 494955.0,
            "total_gst_amount": 89091.9,
            "total_amount": 584046.9,
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices', first_invoice_data)
        if success:
            first_invoice_id = result.get('invoice_id')
            self.log_test("Create first invoice (consume 98.991)", True, 
                        f"- Invoice ID: {first_invoice_id}, Remaining should be 1.009")
        else:
            self.log_test("Create first invoice (consume 98.991)", False, f"- {result}")
        
        # Now test the user's exact scenario - try to bill 7.30 when only 1.009 remaining
        user_scenario_validation = {
            "project_id": self.test_project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "description": "Foundation Work",
                    "quantity": 7.30  # User's exact scenario - should be rejected
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', user_scenario_validation)
        if success:
            is_valid = result.get('valid', False)
            errors = result.get('errors', [])
            warnings = result.get('warnings', [])
            
            # This should be INVALID (False) - if it returns True, it's the bug
            expected_invalid = not is_valid
            self.log_test("USER SCENARIO - Quantity Validation (7.30 vs 1.009)", expected_invalid,
                        f"- Valid: {is_valid}, Errors: {len(errors)}, Warnings: {len(warnings)}")
            
            if is_valid:
                print("🚨 CRITICAL BUG CONFIRMED: Validation endpoint allows over-quantity (7.30 > 1.009)")
            else:
                print("✅ Validation endpoint correctly blocks over-quantity")
                
        else:
            self.log_test("USER SCENARIO - Quantity Validation", False, f"- {result}")

    def test_regular_invoice_creation_over_quantity(self):
        """Test Regular Invoice Creation with Over-Quantity - User's Main Concern"""
        print("\n🧾 Testing Regular Invoice Creation - Over Quantity Blocking...")
        
        if not self.test_project_id:
            self.log_test("Regular Invoice - Setup", False, "- No test project available")
            return False
        
        # Test user's exact scenario: Try to create invoice with 7.30 when only 1.009 remaining
        user_scenario_invoice = {
            "project_id": self.test_project_id,
            "project_name": "Quantity Validation Test Project", 
            "client_id": self.test_client_id,
            "client_name": "Quantity Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - Second Invoice",  # Different description to test matching
                    "unit": "Cum",
                    "quantity": 7.30,  # User's exact over-quantity scenario
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
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        # This should FAIL (return error) - if it succeeds, it's the bug
        success, result = self.make_request('POST', 'invoices', user_scenario_invoice, expected_status=400)
        
        if success:
            # If we get here, it means the request was rejected (400 status) - GOOD
            self.log_test("USER SCENARIO - Regular Invoice Over-Quantity Block", True,
                        f"- Correctly blocked 7.30 > 1.009: {result}")
        else:
            # If we get here, check if it actually created the invoice (status 200) - BAD
            success_created, created_result = self.make_request('POST', 'invoices', user_scenario_invoice, expected_status=200)
            if success_created and 'invoice_id' in created_result:
                self.log_test("USER SCENARIO - Regular Invoice Over-Quantity Block", False,
                            f"- 🚨 CRITICAL BUG: Invoice created with ID {created_result['invoice_id']} despite over-quantity!")
                print("🚨 CRITICAL VULNERABILITY CONFIRMED: Regular invoice endpoint allows over-billing!")
                return False
            else:
                self.log_test("USER SCENARIO - Regular Invoice Over-Quantity Block", True,
                            f"- Invoice creation failed as expected: {result}")
        
        return True

    def test_enhanced_invoice_creation_over_quantity(self):
        """Test Enhanced Invoice Creation with Over-Quantity"""
        print("\n🧾 Testing Enhanced Invoice Creation - Over Quantity Blocking...")
        
        if not self.test_project_id:
            self.log_test("Enhanced Invoice - Setup", False, "- No test project available")
            return False
        
        # Test enhanced invoice with over-quantity
        enhanced_over_quantity_invoice = {
            "project_id": self.test_project_id,
            "project_name": "Quantity Validation Test Project",
            "client_id": self.test_client_id,
            "client_name": "Quantity Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id",
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - Enhanced Over-Quantity",
                    "unit": "Cum",
                    "quantity": 7.30,  # Same over-quantity scenario
                    "rate": 5000.0,
                    "amount": 36500.0
                }
            ],
            "subtotal": 36500.0,
            "cgst_amount": 3285.0,
            "sgst_amount": 3285.0,
            "total_gst_amount": 6570.0,
            "total_amount": 43070.0
        }
        
        # This should FAIL (return error) - enhanced endpoint should have validation
        success, result = self.make_request('POST', 'invoices/enhanced', enhanced_over_quantity_invoice, expected_status=400)
        
        if success:
            self.log_test("Enhanced Invoice Over-Quantity Block", True,
                        f"- Enhanced endpoint correctly blocked over-quantity: {result}")
        else:
            # Check if it actually created the invoice
            success_created, created_result = self.make_request('POST', 'invoices/enhanced', enhanced_over_quantity_invoice, expected_status=200)
            if success_created and 'invoice_id' in created_result:
                self.log_test("Enhanced Invoice Over-Quantity Block", False,
                            f"- Enhanced endpoint also allows over-quantity! Invoice ID: {created_result['invoice_id']}")
                return False
            else:
                self.log_test("Enhanced Invoice Over-Quantity Block", True,
                            f"- Enhanced invoice creation failed as expected: {result}")
        
        return True

    def test_boq_billed_quantity_updates(self):
        """Test if BOQ billed_quantity fields are being updated correctly"""
        print("\n📋 Testing BOQ billed_quantity Updates...")
        
        if not self.test_project_id:
            self.log_test("BOQ Updates - Setup", False, "- No test project available")
            return False
        
        # Get current project to check BOQ billed_quantity
        success, project = self.make_request('GET', f'projects/{self.test_project_id}')
        
        if success:
            boq_items = project.get('boq_items', [])
            if boq_items:
                foundation_item = next((item for item in boq_items if 'Foundation' in item.get('description', '')), None)
                if foundation_item:
                    billed_qty = foundation_item.get('billed_quantity', 0.0)
                    total_qty = foundation_item.get('quantity', 0.0)
                    remaining_qty = total_qty - billed_qty
                    
                    self.log_test("BOQ billed_quantity tracking", True,
                                f"- Total: {total_qty}, Billed: {billed_qty}, Remaining: {remaining_qty}")
                    
                    # Check if billed_quantity reflects the invoices created
                    expected_billed = 98.991  # From first invoice
                    quantity_updated = abs(billed_qty - expected_billed) < 0.01
                    self.log_test("BOQ quantity update accuracy", quantity_updated,
                                f"- Expected: {expected_billed}, Actual: {billed_qty}")
                    
                    return quantity_updated
                else:
                    self.log_test("BOQ Foundation item", False, "- Foundation item not found in BOQ")
            else:
                self.log_test("BOQ items", False, "- No BOQ items found in project")
        else:
            self.log_test("Get project for BOQ check", False, f"- {project}")
        
        return False

    def test_edge_cases(self):
        """Test edge cases and boundary conditions"""
        print("\n⚠️ Testing Edge Cases...")
        
        if not self.test_project_id:
            self.log_test("Edge Cases - Setup", False, "- No test project available")
            return False
        
        # Test 1: Exact remaining quantity (should be allowed)
        exact_quantity_validation = {
            "project_id": self.test_project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "description": "Foundation Work",
                    "quantity": 1.009  # Exact remaining quantity
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', exact_quantity_validation)
        if success:
            is_valid = result.get('valid', False)
            self.log_test("Edge Case - Exact remaining quantity", is_valid,
                        f"- 1.009 Cum (exact remaining): {'Valid' if is_valid else 'Invalid'}")
        
        # Test 2: Slightly less than remaining (should be allowed)
        under_quantity_validation = {
            "project_id": self.test_project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1", 
                    "description": "Foundation Work",
                    "quantity": 1.008  # Slightly less than remaining
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', under_quantity_validation)
        if success:
            is_valid = result.get('valid', False)
            self.log_test("Edge Case - Under remaining quantity", is_valid,
                        f"- 1.008 Cum (under remaining): {'Valid' if is_valid else 'Invalid'}")
        
        # Test 3: Slightly more than remaining (should be rejected)
        over_quantity_validation = {
            "project_id": self.test_project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "description": "Foundation Work", 
                    "quantity": 1.010  # Slightly more than remaining
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', over_quantity_validation)
        if success:
            is_valid = result.get('valid', False)
            expected_invalid = not is_valid
            self.log_test("Edge Case - Over remaining quantity", expected_invalid,
                        f"- 1.010 Cum (over remaining): {'Valid' if is_valid else 'Invalid'}")

    def run_all_tests(self):
        """Run all quantity validation tests"""
        print("🚨 CRITICAL USER ISSUE TESTING - QUANTITY VALIDATION BLOCKER")
        print("=" * 70)
        print("Testing user scenario: 'Bill Qty 7.30' accepted when 'Remaining was 1.009'")
        print("=" * 70)
        
        # Authenticate
        if not self.authenticate():
            print("❌ Authentication failed, cannot proceed with tests")
            return False
        
        # Setup test data
        if not self.setup_test_data():
            print("❌ Test data setup failed, cannot proceed with tests")
            return False
        
        # Run all tests
        self.test_ra_tracking_system()
        self.test_quantity_validation_endpoint()
        self.test_regular_invoice_creation_over_quantity()
        self.test_enhanced_invoice_creation_over_quantity()
        self.test_boq_billed_quantity_updates()
        self.test_edge_cases()
        
        # Print summary
        print("\n" + "=" * 70)
        print(f"📊 TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED - Quantity validation is working correctly!")
        else:
            print("🚨 SOME TESTS FAILED - Critical quantity validation issues found!")
            print("\n🔍 ANALYSIS:")
            print("- If 'Regular Invoice Over-Quantity Block' failed: Regular /api/invoices endpoint vulnerable")
            print("- If 'RA Tracking' tests failed: Balance calculation system broken")
            print("- If 'Quantity Validation' tests failed: Validation endpoint not working")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = QuantityValidationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)