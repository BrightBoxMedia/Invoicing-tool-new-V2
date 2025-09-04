#!/usr/bin/env python3
"""
COMPREHENSIVE QUANTITY VALIDATION TESTING
Testing both regular and enhanced invoice endpoints for quantity validation
"""

import requests
import sys
import json
from datetime import datetime

class ComprehensiveQuantityTester:
    def __init__(self):
        self.base_url = "https://billingflow-1.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test resources
        self.test_client_id = None
        self.test_project_id = None

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
        """Create test client and project"""
        # Create test client
        client_data = {
            "name": "Comprehensive Test Client Ltd",
            "gst_no": "29ABCDE1234F1Z5",
            "bill_to_address": "123 Test Street, Bangalore, Karnataka - 560001",
            "contact_person": "Test Manager",
            "phone": "+91-9876543210",
            "email": "test@comprehensive.com"
        }
        
        success, result = self.make_request('POST', 'clients', client_data)
        if success and 'client_id' in result:
            self.test_client_id = result['client_id']
            self.log_test("Create test client", True, f"- Client ID: {self.test_client_id}")
        else:
            self.log_test("Create test client", False, f"- {result}")
            return False
        
        # Create test project with BOQ items
        project_data = {
            "project_name": "Comprehensive Quantity Test Project",
            "architect": "Test Architect",
            "client_id": self.test_client_id,
            "client_name": "Comprehensive Test Client Ltd",
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Test Foundation Work",
                    "unit": "Cum",
                    "quantity": 100.0,
                    "rate": 1500.0,
                    "amount": 150000.0,
                    "gst_rate": 18.0,
                    "billed_quantity": 95.0  # 5.0 remaining
                },
                {
                    "serial_number": "2", 
                    "description": "Test Steel Work",
                    "unit": "Kg",
                    "quantity": 1000.0,
                    "rate": 65.0,
                    "amount": 65000.0,
                    "gst_rate": 18.0,
                    "billed_quantity": 0.0  # Full quantity available
                }
            ],
            "total_project_value": 215000.0,
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

    def test_ra_tracking_endpoint(self):
        """Test RA tracking endpoint to verify balance calculations"""
        print("\n📊 Testing RA Tracking Endpoint...")
        
        success, result = self.make_request('GET', f'projects/{self.test_project_id}/ra-tracking')
        
        if success:
            ra_tracking = result.get('ra_tracking', [])
            self.log_test("Get RA tracking data", len(ra_tracking) > 0, 
                        f"- Found {len(ra_tracking)} tracked items")
            
            # Check balance calculations
            for item in ra_tracking:
                description = item.get('description', '')
                overall_qty = item.get('overall_qty', 0)
                balance_qty = item.get('balance_qty', 0)
                
                print(f"   {description}: Overall={overall_qty}, Balance={balance_qty}")
                
                if description == "Test Foundation Work":
                    expected_balance = 5.0  # 100.0 - 95.0
                    is_correct = abs(balance_qty - expected_balance) < 0.01
                    self.log_test(f"Foundation work balance calculation", is_correct,
                                f"- Expected: {expected_balance}, Actual: {balance_qty}")
                elif description == "Test Steel Work":
                    expected_balance = 1000.0  # 1000.0 - 0.0
                    is_correct = abs(balance_qty - expected_balance) < 0.01
                    self.log_test(f"Steel work balance calculation", is_correct,
                                f"- Expected: {expected_balance}, Actual: {balance_qty}")
        else:
            self.log_test("Get RA tracking data", False, f"- {result}")

    def test_quantity_validation_endpoint(self):
        """Test the quantity validation endpoint directly"""
        print("\n🔍 Testing Quantity Validation Endpoint...")
        
        # Test 1: Valid quantities (should pass)
        valid_validation_data = {
            "project_id": self.test_project_id,
            "selected_items": [
                {
                    "description": "Test Foundation Work",
                    "requested_qty": 3.0  # Less than balance of 5.0
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', valid_validation_data)
        
        if success:
            is_valid = result.get('valid', False)
            errors = result.get('errors', [])
            self.log_test("Valid quantity validation", is_valid and len(errors) == 0,
                        f"- Valid: {is_valid}, Errors: {len(errors)}")
        else:
            self.log_test("Valid quantity validation", False, f"- {result}")
        
        # Test 2: Invalid quantities (should fail)
        invalid_validation_data = {
            "project_id": self.test_project_id,
            "selected_items": [
                {
                    "description": "Test Foundation Work",
                    "requested_qty": 10.0  # More than balance of 5.0
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', invalid_validation_data)
        
        if success:
            is_valid = result.get('valid', True)
            errors = result.get('errors', [])
            self.log_test("Invalid quantity validation", not is_valid and len(errors) > 0,
                        f"- Valid: {is_valid}, Errors: {len(errors)}")
        else:
            self.log_test("Invalid quantity validation", False, f"- {result}")

    def test_regular_invoice_endpoint_vulnerability(self):
        """Test the regular invoice endpoint for quantity validation vulnerability"""
        print("\n🚨 Testing Regular Invoice Endpoint Vulnerability...")
        
        # Try to create over-quantity invoice using regular endpoint
        over_quantity_invoice = {
            "project_id": self.test_project_id,
            "project_name": "Comprehensive Quantity Test Project",
            "client_id": self.test_client_id,
            "client_name": "Comprehensive Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Test Foundation Work",
                    "unit": "Cum",
                    "quantity": 20.0,  # WAY MORE than balance of 5.0
                    "rate": 1500.0,
                    "amount": 30000.0,
                    "gst_rate": 18.0,
                    "gst_amount": 5400.0,
                    "total_with_gst": 35400.0
                }
            ],
            "subtotal": 30000.0,
            "total_gst_amount": 5400.0,
            "total_amount": 35400.0,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        # This should be blocked but currently isn't
        success, result = self.make_request('POST', 'invoices', over_quantity_invoice)
        
        if success and 'invoice_id' in result:
            self.log_test("VULNERABILITY: Regular endpoint allows over-quantity", False,
                        f"- CRITICAL: Over-quantity invoice was CREATED: {result['invoice_id']}")
        else:
            self.log_test("Regular endpoint blocks over-quantity", True,
                        f"- Correctly blocked over-quantity invoice")

    def test_enhanced_invoice_endpoint_protection(self):
        """Test the enhanced invoice endpoint for quantity validation protection"""
        print("\n🛡️ Testing Enhanced Invoice Endpoint Protection...")
        
        # Try to create over-quantity invoice using enhanced endpoint
        over_quantity_enhanced_invoice = {
            "project_id": self.test_project_id,
            "project_name": "Comprehensive Quantity Test Project",
            "client_id": self.test_client_id,
            "client_name": "Comprehensive Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id",
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Test Foundation Work",
                    "unit": "Cum",
                    "quantity": 20.0,  # WAY MORE than balance of 5.0
                    "rate": 1500.0,
                    "amount": 30000.0
                }
            ],
            "subtotal": 30000.0,
            "cgst_amount": 2700.0,
            "sgst_amount": 2700.0,
            "total_gst_amount": 5400.0,
            "total_amount": 35400.0
        }
        
        # This should be blocked and currently is
        success, result = self.make_request('POST', 'invoices/enhanced', over_quantity_enhanced_invoice, expected_status=400)
        
        if success:
            self.log_test("Enhanced endpoint blocks over-quantity", True,
                        f"- Correctly blocked over-quantity invoice")
        else:
            # Check if it was created (would be bad)
            success_created, created_result = self.make_request('POST', 'invoices/enhanced', over_quantity_enhanced_invoice)
            if success_created:
                self.log_test("Enhanced endpoint blocks over-quantity", False,
                            f"- PROBLEM: Enhanced endpoint created over-quantity invoice")
            else:
                self.log_test("Enhanced endpoint blocks over-quantity", True,
                            f"- Enhanced endpoint correctly rejected over-quantity invoice")

    def test_valid_invoices_both_endpoints(self):
        """Test that valid invoices work on both endpoints"""
        print("\n✅ Testing Valid Invoices on Both Endpoints...")
        
        # Valid invoice data
        valid_invoice_data = {
            "project_id": self.test_project_id,
            "project_name": "Comprehensive Quantity Test Project",
            "client_id": self.test_client_id,
            "client_name": "Comprehensive Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Test Foundation Work",
                    "unit": "Cum",
                    "quantity": 3.0,  # Less than balance of 5.0
                    "rate": 1500.0,
                    "amount": 4500.0,
                    "gst_rate": 18.0,
                    "gst_amount": 810.0,
                    "total_with_gst": 5310.0
                }
            ],
            "subtotal": 4500.0,
            "total_gst_amount": 810.0,
            "total_amount": 5310.0,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        # Test regular endpoint with valid data
        success, result = self.make_request('POST', 'invoices', valid_invoice_data)
        
        if success and 'invoice_id' in result:
            self.log_test("Regular endpoint creates valid invoice", True,
                        f"- Valid invoice created: {result['invoice_id']}")
        else:
            self.log_test("Regular endpoint creates valid invoice", False, f"- {result}")
        
        # Test enhanced endpoint with valid data
        valid_enhanced_invoice_data = {
            "project_id": self.test_project_id,
            "project_name": "Comprehensive Quantity Test Project",
            "client_id": self.test_client_id,
            "client_name": "Comprehensive Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id",
            "invoice_items": [
                {
                    "boq_item_id": "2",
                    "serial_number": "2",
                    "description": "Test Steel Work",
                    "unit": "Kg",
                    "quantity": 500.0,  # Less than balance of 1000.0
                    "rate": 65.0,
                    "amount": 32500.0
                }
            ],
            "subtotal": 32500.0,
            "cgst_amount": 2925.0,
            "sgst_amount": 2925.0,
            "total_gst_amount": 5850.0,
            "total_amount": 38350.0
        }
        
        success, result = self.make_request('POST', 'invoices/enhanced', valid_enhanced_invoice_data)
        
        if success and 'invoice_id' in result:
            self.log_test("Enhanced endpoint creates valid invoice", True,
                        f"- Valid enhanced invoice created: {result['invoice_id']}")
        else:
            self.log_test("Enhanced endpoint creates valid invoice", False, f"- {result}")

    def run_comprehensive_tests(self):
        """Run all comprehensive tests"""
        print("🔍 COMPREHENSIVE QUANTITY VALIDATION TESTING")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate():
            return False
        
        # Step 2: Setup test data
        if not self.setup_test_data():
            return False
        
        # Step 3: Test RA tracking
        self.test_ra_tracking_endpoint()
        
        # Step 4: Test validation endpoint
        self.test_quantity_validation_endpoint()
        
        # Step 5: Test regular endpoint vulnerability
        self.test_regular_invoice_endpoint_vulnerability()
        
        # Step 6: Test enhanced endpoint protection
        self.test_enhanced_invoice_endpoint_protection()
        
        # Step 7: Test valid invoices
        self.test_valid_invoices_both_endpoints()
        
        # Final results
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE TEST RESULTS")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return True

if __name__ == "__main__":
    tester = ComprehensiveQuantityTester()
    tester.run_comprehensive_tests()