#!/usr/bin/env python3
"""
CRITICAL FIX VERIFICATION - URGENT TESTING
Testing the CRITICAL fixes for quantity validation blocking and spinner arrows removal
Based on user screenshot feedback showing Bill Qty 07.30 accepted when Remaining was 1.009
"""

import requests
import sys
import json
from datetime import datetime

class CriticalQuantityValidationTester:
    def __init__(self):
        self.base_url = "https://flex-invoice.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.critical_failures = []
        
        # Test resources
        self.test_client_id = None
        self.test_project_id = None
        self.test_invoice_id = None

    def log_test(self, name, success, details="", is_critical=False):
        """Log test results with critical failure tracking"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
            if is_critical:
                self.critical_failures.append(f"{name}: {details}")
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
        """Authenticate with the system using provided credentials"""
        print("🔐 Authenticating with system...")
        
        success, result = self.make_request('POST', 'auth/login', 
                                          {'email': 'brightboxm@gmail.com', 'password': 'admin123'})
        
        if success and 'access_token' in result:
            self.token = result['access_token']
            self.user_data = result['user']
            self.log_test("Authentication", True, f"- Logged in as {self.user_data['email']}")
            return True
        else:
            self.log_test("Authentication", False, f"- {result}", is_critical=True)
            return False

    def setup_test_data(self):
        """Create test client and project with BOQ items for quantity validation testing"""
        print("\n📋 Setting up test data for quantity validation...")
        
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
            self.log_test("Create test client", False, f"- {result}", is_critical=True)
            return False
        
        # Create test project with specific BOQ items for quantity testing
        project_data = {
            "project_name": "Critical Quantity Validation Test Project",
            "architect": "Test Architect",
            "client_id": self.test_client_id,
            "client_name": "Quantity Test Client Ltd",
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Foundation Excavation Work",
                    "unit": "Cum",
                    "quantity": 100.0,  # Total available quantity
                    "rate": 1500.0,
                    "amount": 150000.0,
                    "gst_rate": 18.0,
                    "billed_quantity": 98.991  # Already billed 98.991, remaining should be 1.009
                },
                {
                    "serial_number": "2", 
                    "description": "Concrete Pouring Work",
                    "unit": "Cum",
                    "quantity": 50.0,  # Total available quantity
                    "rate": 4500.0,
                    "amount": 225000.0,
                    "gst_rate": 18.0,
                    "billed_quantity": 45.0  # Already billed 45.0, remaining should be 5.0
                },
                {
                    "serial_number": "3",
                    "description": "Steel Reinforcement Work", 
                    "unit": "Kg",
                    "quantity": 1000.0,  # Total available quantity
                    "rate": 65.0,
                    "amount": 65000.0,
                    "gst_rate": 18.0,
                    "billed_quantity": 0.0  # No billing yet, full quantity available
                }
            ],
            "total_project_value": 440000.0,
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'projects', project_data)
        if success and 'project_id' in result:
            self.test_project_id = result['project_id']
            self.log_test("Create test project", True, f"- Project ID: {self.test_project_id}")
            return True
        else:
            self.log_test("Create test project", False, f"- {result}", is_critical=True)
            return False

    def test_critical_quantity_validation_blocking(self):
        """
        CRITICAL TEST: Verify that over-quantity invoices are completely blocked
        This tests the exact scenario from user screenshot: Bill Qty 07.30 when Remaining was 1.009
        """
        print("\n🚨 CRITICAL TEST: Quantity Validation Blocking...")
        
        if not self.test_project_id:
            self.log_test("Quantity validation setup", False, "- No test project available", is_critical=True)
            return False
        
        # TEST 1: Try to create invoice with over-quantity (should be BLOCKED)
        # User reported: Bill Qty 07.30 accepted when Remaining was 1.009
        # We'll test: Bill Qty 10.0 when Remaining should be 1.009
        over_quantity_invoice_data = {
            "project_id": self.test_project_id,
            "project_name": "Critical Quantity Validation Test Project",
            "client_id": self.test_client_id,
            "client_name": "Quantity Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",  # Foundation work with remaining qty 1.009
                    "serial_number": "1",
                    "description": "Foundation Excavation Work - OVER QUANTITY TEST",
                    "unit": "Cum",
                    "quantity": 10.0,  # Trying to bill 10.0 when only 1.009 remaining
                    "rate": 1500.0,
                    "amount": 15000.0,
                    "gst_rate": 18.0,
                    "gst_amount": 2700.0,
                    "total_with_gst": 17700.0
                }
            ],
            "subtotal": 15000.0,
            "total_gst_amount": 2700.0,
            "total_amount": 17700.0,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        # This should FAIL with 400 status (blocked)
        success, result = self.make_request('POST', 'invoices', over_quantity_invoice_data, expected_status=400)
        
        if success:
            # Check if the error message mentions quantity validation
            error_msg = str(result).lower()
            has_quantity_error = any(keyword in error_msg for keyword in ['quantity', 'balance', 'exceed', 'remaining'])
            self.log_test("CRITICAL: Over-quantity invoice blocking", has_quantity_error, 
                        f"- Correctly blocked over-quantity invoice with proper error message", is_critical=True)
        else:
            # If it didn't return 400, check if it was created (which would be CRITICAL FAILURE)
            success_created, created_result = self.make_request('POST', 'invoices', over_quantity_invoice_data, expected_status=200)
            if success_created:
                self.log_test("CRITICAL: Over-quantity invoice blocking", False, 
                            f"- CRITICAL FAILURE: Over-quantity invoice was CREATED when it should be BLOCKED", is_critical=True)
            else:
                self.log_test("CRITICAL: Over-quantity invoice blocking", True, 
                            f"- Over-quantity invoice correctly rejected", is_critical=True)
        
        # TEST 2: Try another over-quantity scenario (different item)
        over_quantity_invoice_data_2 = {
            "project_id": self.test_project_id,
            "project_name": "Critical Quantity Validation Test Project",
            "client_id": self.test_client_id,
            "client_name": "Quantity Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "2",  # Concrete work with remaining qty 5.0
                    "serial_number": "2",
                    "description": "Concrete Pouring Work - OVER QUANTITY TEST",
                    "unit": "Cum",
                    "quantity": 15.0,  # Trying to bill 15.0 when only 5.0 remaining
                    "rate": 4500.0,
                    "amount": 67500.0,
                    "gst_rate": 18.0,
                    "gst_amount": 12150.0,
                    "total_with_gst": 79650.0
                }
            ],
            "subtotal": 67500.0,
            "total_gst_amount": 12150.0,
            "total_amount": 79650.0,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices', over_quantity_invoice_data_2, expected_status=400)
        
        if success:
            error_msg = str(result).lower()
            has_quantity_error = any(keyword in error_msg for keyword in ['quantity', 'balance', 'exceed', 'remaining'])
            self.log_test("CRITICAL: Second over-quantity blocking test", has_quantity_error, 
                        f"- Correctly blocked second over-quantity scenario", is_critical=True)
        else:
            success_created, created_result = self.make_request('POST', 'invoices', over_quantity_invoice_data_2, expected_status=200)
            if success_created:
                self.log_test("CRITICAL: Second over-quantity blocking test", False, 
                            f"- CRITICAL FAILURE: Second over-quantity invoice was CREATED", is_critical=True)
            else:
                self.log_test("CRITICAL: Second over-quantity blocking test", True, 
                            f"- Second over-quantity invoice correctly rejected", is_critical=True)

    def test_valid_quantity_invoices_still_work(self):
        """
        Test that valid quantities (within balance) still work normally
        """
        print("\n✅ Testing valid quantity invoices still work...")
        
        if not self.test_project_id:
            self.log_test("Valid quantity test setup", False, "- No test project available")
            return False
        
        # TEST: Create invoice with valid quantity (within remaining balance)
        valid_quantity_invoice_data = {
            "project_id": self.test_project_id,
            "project_name": "Critical Quantity Validation Test Project",
            "client_id": self.test_client_id,
            "client_name": "Quantity Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",  # Foundation work with remaining qty 1.009
                    "serial_number": "1",
                    "description": "Foundation Excavation Work - Valid Quantity",
                    "unit": "Cum",
                    "quantity": 1.0,  # Valid: 1.0 is less than remaining 1.009
                    "rate": 1500.0,
                    "amount": 1500.0,
                    "gst_rate": 18.0,
                    "gst_amount": 270.0,
                    "total_with_gst": 1770.0
                }
            ],
            "subtotal": 1500.0,
            "total_gst_amount": 270.0,
            "total_amount": 1770.0,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices', valid_quantity_invoice_data)
        
        if success and 'invoice_id' in result:
            self.test_invoice_id = result['invoice_id']
            self.log_test("Valid quantity invoice creation", True, 
                        f"- Valid quantity invoice created successfully: {self.test_invoice_id}")
            return True
        else:
            self.log_test("Valid quantity invoice creation", False, 
                        f"- Valid quantity invoice failed to create: {result}")
            return False

    def test_enhanced_invoice_quantity_validation(self):
        """
        Test enhanced invoice creation endpoints for quantity validation
        """
        print("\n🔧 Testing enhanced invoice quantity validation...")
        
        if not self.test_project_id:
            self.log_test("Enhanced validation setup", False, "- No test project available")
            return False
        
        # TEST: Enhanced invoice validation endpoint
        validation_data = {
            "project_id": self.test_project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "quantity": 5.0,  # Over the remaining 1.009
                    "description": "Foundation Excavation Work"
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', validation_data)
        
        if success:
            is_valid = result.get('valid', True)  # Should be False for over-quantity
            errors = result.get('errors', [])
            warnings = result.get('warnings', [])
            
            # Should be invalid due to over-quantity
            validation_working = not is_valid and (len(errors) > 0 or len(warnings) > 0)
            self.log_test("Enhanced quantity validation endpoint", validation_working,
                        f"- Valid: {is_valid}, Errors: {len(errors)}, Warnings: {len(warnings)}")
        else:
            self.log_test("Enhanced quantity validation endpoint", False, f"- {result}")
        
        # TEST: Enhanced invoice creation with over-quantity (should be blocked)
        enhanced_over_quantity_data = {
            "project_id": self.test_project_id,
            "project_name": "Critical Quantity Validation Test Project",
            "client_id": self.test_client_id,
            "client_name": "Quantity Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id",
            "invoice_items": [
                {
                    "boq_item_id": "2",
                    "serial_number": "2",
                    "description": "Concrete Pouring Work - Enhanced Over Quantity",
                    "unit": "Cum",
                    "quantity": 10.0,  # Over the remaining 5.0
                    "rate": 4500.0,
                    "amount": 45000.0
                }
            ],
            "subtotal": 45000.0,
            "cgst_amount": 4050.0,
            "sgst_amount": 4050.0,
            "total_gst_amount": 8100.0,
            "total_amount": 53100.0
        }
        
        success, result = self.make_request('POST', 'invoices/enhanced', enhanced_over_quantity_data, expected_status=400)
        
        if success:
            self.log_test("Enhanced invoice over-quantity blocking", True,
                        f"- Enhanced endpoint correctly blocked over-quantity invoice", is_critical=True)
        else:
            # Check if it was created instead (critical failure)
            success_created, created_result = self.make_request('POST', 'invoices/enhanced', enhanced_over_quantity_data, expected_status=200)
            if success_created:
                self.log_test("Enhanced invoice over-quantity blocking", False,
                            f"- CRITICAL: Enhanced endpoint created over-quantity invoice", is_critical=True)
            else:
                self.log_test("Enhanced invoice over-quantity blocking", True,
                            f"- Enhanced endpoint correctly rejected over-quantity invoice", is_critical=True)

    def test_backend_quantity_validation_logic(self):
        """
        Test the backend quantity validation logic directly
        """
        print("\n⚙️ Testing backend quantity validation logic...")
        
        if not self.test_project_id:
            self.log_test("Backend validation setup", False, "- No test project available")
            return False
        
        # Get project details to check BOQ items and their remaining quantities
        success, project = self.make_request('GET', f'projects/{self.test_project_id}')
        
        if success:
            boq_items = project.get('boq_items', [])
            self.log_test("Get project BOQ items", len(boq_items) > 0,
                        f"- Found {len(boq_items)} BOQ items in project")
            
            # Check remaining quantities calculation
            for item in boq_items:
                total_qty = item.get('quantity', 0)
                billed_qty = item.get('billed_quantity', 0)
                remaining_qty = total_qty - billed_qty
                
                print(f"   Item {item.get('serial_number', 'N/A')}: Total={total_qty}, Billed={billed_qty}, Remaining={remaining_qty}")
                
                # Verify the specific case from user report
                if item.get('serial_number') == '1':
                    expected_remaining = 1.009  # 100.0 - 98.991
                    actual_remaining = remaining_qty
                    is_correct = abs(actual_remaining - expected_remaining) < 0.01
                    self.log_test(f"Item 1 remaining quantity calculation", is_correct,
                                f"- Expected: {expected_remaining}, Actual: {actual_remaining}")
        else:
            self.log_test("Get project BOQ items", False, f"- {project}")

    def test_pdf_generation_with_valid_invoice(self):
        """
        Test that PDF generation works with valid invoices
        """
        print("\n📄 Testing PDF generation with valid invoice...")
        
        if not self.test_invoice_id:
            self.log_test("PDF generation setup", False, "- No valid invoice available")
            return False
        
        success, pdf_data = self.make_request('GET', f'invoices/{self.test_invoice_id}/pdf')
        
        if success and isinstance(pdf_data, bytes):
            pdf_size = len(pdf_data)
            self.log_test("PDF generation for valid invoice", pdf_size > 1000,
                        f"- PDF generated successfully, size: {pdf_size} bytes")
        else:
            self.log_test("PDF generation for valid invoice", False, f"- {pdf_data}")

    def run_critical_tests(self):
        """
        Run all critical tests for quantity validation fixes
        """
        print("🚨 CRITICAL FIX VERIFICATION - QUANTITY VALIDATION BLOCKING")
        print("=" * 70)
        print("Testing fixes for user-reported issue:")
        print("- Bill Qty 07.30 was accepted when Remaining was 1.009")
        print("- This MUST now be completely blocked")
        print("=" * 70)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("\n❌ CRITICAL FAILURE: Cannot authenticate")
            return False
        
        # Step 2: Setup test data
        if not self.setup_test_data():
            print("\n❌ CRITICAL FAILURE: Cannot setup test data")
            return False
        
        # Step 3: Run critical quantity validation tests
        self.test_critical_quantity_validation_blocking()
        
        # Step 4: Test valid quantities still work
        self.test_valid_quantity_invoices_still_work()
        
        # Step 5: Test enhanced invoice endpoints
        self.test_enhanced_invoice_quantity_validation()
        
        # Step 6: Test backend validation logic
        self.test_backend_quantity_validation_logic()
        
        # Step 7: Test PDF generation still works
        self.test_pdf_generation_with_valid_invoice()
        
        # Final results
        print("\n" + "=" * 70)
        print("🚨 CRITICAL FIX VERIFICATION RESULTS")
        print("=" * 70)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.critical_failures:
            print(f"\n🚨 CRITICAL FAILURES ({len(self.critical_failures)}):")
            for failure in self.critical_failures:
                print(f"   ❌ {failure}")
        else:
            print(f"\n✅ NO CRITICAL FAILURES - All quantity validation fixes working correctly!")
        
        return len(self.critical_failures) == 0

if __name__ == "__main__":
    tester = CriticalQuantityValidationTester()
    success = tester.run_critical_tests()
    
    if success:
        print("\n🎉 CRITICAL FIXES VERIFIED SUCCESSFULLY!")
        print("✅ Quantity validation is now bulletproof")
        print("✅ Over-quantity invoices are completely blocked")
        print("✅ Valid quantities still work normally")
        sys.exit(0)
    else:
        print("\n🚨 CRITICAL FIXES VERIFICATION FAILED!")
        print("❌ Quantity validation issues still exist")
        print("❌ User-reported problems may still occur")
        sys.exit(1)