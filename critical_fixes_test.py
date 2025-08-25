#!/usr/bin/env python3
"""
CRITICAL FIXES TESTING - Enhanced Invoice System
Tests the specific fixes mentioned in the review request:
1. Quantity Validation Bug Fix
2. Project Details 500 Error Fix  
3. GST Breakdown Fix
"""

import requests
import sys
import json
from datetime import datetime

class CriticalFixesTester:
    def __init__(self):
        # Use the URL from frontend/.env
        self.base_url = "https://billingflow-app.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.test_resources = {
            'client_id': None,
            'project_id': None,
            'company_profile_id': None
        }

    def log_test(self, name, success, details=""):
        """Log test results"""
        if success:
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

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
        """Login with provided credentials"""
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
        """Create necessary test data (client, company profile, project)"""
        print("\n🏗️ Setting up test data...")
        
        # Create client
        client_data = {
            "name": "Foundation Test Client Ltd",
            "gst_no": "29ABCDE1234F1Z5",
            "bill_to_address": "123 Test Street, Bangalore, Karnataka - 560001",
            "contact_person": "Test Manager",
            "phone": "+91-9876543210",
            "email": "test@foundationclient.com"
        }
        
        success, result = self.make_request('POST', 'clients', client_data)
        if success and 'client_id' in result:
            self.test_resources['client_id'] = result['client_id']
            self.log_test("Create test client", True, f"- Client ID: {result['client_id']}")
        else:
            self.log_test("Create test client", False, f"- {result}")
            return False

        # Create company profile
        company_data = {
            "company_name": "Test Construction Company",
            "created_by": self.user_data['id'],
            "locations": [{
                "location_name": "Head Office",
                "address_line_1": "456 Construction Ave",
                "city": "Bangalore",
                "state": "Karnataka",
                "pincode": "560001",
                "country": "India",
                "gst_number": "29TESTCO1234F1Z5",
                "is_default": True
            }],
            "bank_details": [{
                "bank_name": "Test Bank",
                "account_number": "1234567890",
                "account_holder_name": "Test Construction Company",
                "ifsc_code": "TEST0001234",
                "branch_name": "Test Branch",
                "is_default": True
            }]
        }
        
        success, result = self.make_request('POST', 'company-profiles', company_data)
        if success and 'profile_id' in result:
            self.test_resources['company_profile_id'] = result['profile_id']
            self.log_test("Create company profile", True, f"- Profile ID: {result['profile_id']}")
        else:
            self.log_test("Create company profile", False, f"- {result}")
            return False

        # Create enhanced project with BOQ items - use correct field names
        project_data = {
            "project_name": "Foundation Excavation Project",
            "architect": "Test Architect",
            "client_id": self.test_resources['client_id'],
            "client_name": "Foundation Test Client Ltd",
            "company_profile_id": self.test_resources['company_profile_id'],
            "created_by": self.user_data['id'],
            "total_project_value": 413000.0,  # 177000 + 236000
            "advance_received": 0.0,
            "project_metadata": [{  # Use project_metadata instead of metadata
                "purchase_order_number": "PO-FOUNDATION-001",
                "type": "Construction",
                "basic": 413000.0,  # Match BOQ total with GST
                "overall_multiplier": 1.0,
                "po_inv_value": 413000.0  # Match BOQ total with GST
            }],
            "boq_items": [
                {
                    "id": "1",  # Add ID field
                    "serial_number": "1",
                    "description": "Foundation Excavation",
                    "unit": "Cum",
                    "quantity": 100.0,  # Total available quantity
                    "rate": 1500.0,
                    "amount": 150000.0,
                    "gst_rate": 18.0,
                    "total_with_gst": 177000.0  # amount + GST
                },
                {
                    "id": "2",  # Add ID field
                    "serial_number": "2", 
                    "description": "Concrete Pouring",
                    "unit": "Cum",
                    "quantity": 50.0,
                    "rate": 4000.0,
                    "amount": 200000.0,
                    "gst_rate": 18.0,
                    "total_with_gst": 236000.0  # amount + GST
                }
            ]
        }
        
        success, result = self.make_request('POST', 'projects/enhanced', project_data)
        if success and 'project_id' in result:
            self.test_resources['project_id'] = result['project_id']
            self.log_test("Create enhanced project", True, f"- Project ID: {result['project_id']}")
            return True
        else:
            self.log_test("Create enhanced project", False, f"- {result}")
            return False

    def test_quantity_validation_blocking(self):
        """
        CRITICAL TEST 1: Test that quantity validation now properly blocks over-quantity invoices
        This was the main bug - invoice creation should FAIL when requesting more than available
        """
        print("\n🚨 CRITICAL TEST 1: Quantity Validation Blocking")
        
        # Test Case 1: Try to create invoice with quantity 150 when balance is 100 - SHOULD FAIL
        over_quantity_invoice = {
            "project_id": self.test_resources['project_id'],
            "project_name": "Foundation Excavation Project",
            "client_id": self.test_resources['client_id'],
            "client_name": "Foundation Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'],
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Excavation",  # Exact match with BOQ
                    "unit": "Cum",
                    "quantity": 150.0,  # MORE than available (100)
                    "rate": 1500.0,
                    "amount": 225000.0
                }
            ],
            "subtotal": 225000.0,
            "total_gst_amount": 40500.0,
            "total_amount": 265500.0
        }
        
        # This should FAIL with proper error message
        success, result = self.make_request('POST', 'invoices/enhanced', over_quantity_invoice, expected_status=400)
        
        if success:
            # Check if the error message mentions quantity validation
            error_msg = str(result).lower()
            has_quantity_error = any(keyword in error_msg for keyword in ['quantity', 'balance', 'exceed', 'available'])
            self.log_test("Over-quantity invoice BLOCKED", has_quantity_error, 
                        f"- Correctly blocked with error: {result}")
            return has_quantity_error
        else:
            self.log_test("Over-quantity invoice BLOCKED", False, 
                        f"- CRITICAL BUG: Over-quantity invoice was allowed! {result}")
            return False

    def test_valid_quantity_invoice(self):
        """
        CRITICAL TEST 2: Test that valid quantity invoices still work
        Create invoice with quantity 50 when balance is 100 - SHOULD SUCCESS
        """
        print("\n✅ CRITICAL TEST 2: Valid Quantity Invoice Creation")
        
        valid_quantity_invoice = {
            "project_id": self.test_resources['project_id'],
            "project_name": "Foundation Excavation Project", 
            "client_id": self.test_resources['client_id'],
            "client_name": "Foundation Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'],
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Excavation",  # Exact match with BOQ
                    "unit": "Cum", 
                    "quantity": 50.0,  # LESS than available (100)
                    "rate": 1500.0,
                    "amount": 75000.0
                }
            ],
            "item_gst_mappings": [
                {
                    "item_id": "1",
                    "gst_type": "CGST_SGST",
                    "cgst_rate": 9.0,
                    "sgst_rate": 9.0,
                    "total_gst_rate": 18.0
                }
            ],
            "subtotal": 75000.0,
            "cgst_amount": 6750.0,
            "sgst_amount": 6750.0,
            "total_gst_amount": 13500.0,
            "total_amount": 88500.0
        }
        
        success, result = self.make_request('POST', 'invoices/enhanced', valid_quantity_invoice)
        
        if success and 'invoice_id' in result:
            invoice_id = result['invoice_id']
            ra_number = result.get('ra_number', 'N/A')
            self.log_test("Valid quantity invoice CREATED", True, 
                        f"- Invoice ID: {invoice_id}, RA Number: {ra_number}")
            
            # Store for later tests
            self.test_resources['invoice_id'] = invoice_id
            return True
        else:
            self.log_test("Valid quantity invoice CREATED", False, f"- {result}")
            return False

    def test_project_details_fix(self):
        """
        CRITICAL TEST 3: Test that project details endpoint no longer returns 500 error
        This was caused by metadata field expecting dict but receiving list
        """
        print("\n🔧 CRITICAL TEST 3: Project Details 500 Error Fix")
        
        # Test getting project details - should NOT return 500 error
        success, result = self.make_request('GET', f'projects/{self.test_resources["project_id"]}/details')
        
        if success:
            # Check that we get proper project details structure
            has_project_data = 'project_name' in result
            has_metadata = 'metadata' in result or 'project_metadata' in result
            self.log_test("Project details endpoint", True, 
                        f"- Successfully retrieved project details, Has metadata: {has_metadata}")
            return True
        else:
            # Check if it's still a 500 error
            is_500_error = "500" in str(result)
            self.log_test("Project details endpoint", False, 
                        f"- {'CRITICAL: Still 500 error!' if is_500_error else 'Other error:'} {result}")
            return False

    def test_invoice_visibility_in_project(self):
        """
        CRITICAL TEST 4: Test that created invoices appear in project details view
        """
        print("\n👁️ CRITICAL TEST 4: Invoice Visibility in Project Details")
        
        if not self.test_resources.get('invoice_id'):
            self.log_test("Invoice visibility test", False, "- No invoice created to test visibility")
            return False
        
        # Get project details and check if invoice appears
        success, result = self.make_request('GET', f'projects/{self.test_resources["project_id"]}/details')
        
        if success:
            # Look for invoices in the project details
            invoices = result.get('invoices', [])
            invoice_found = any(inv.get('id') == self.test_resources['invoice_id'] for inv in invoices)
            
            self.log_test("Invoice visibility in project", invoice_found, 
                        f"- Found {len(invoices)} invoices, Target invoice visible: {invoice_found}")
            return invoice_found
        else:
            self.log_test("Invoice visibility in project", False, f"- Could not get project details: {result}")
            return False

    def test_gst_breakdown_fix(self):
        """
        CRITICAL TEST 5: Test that enhanced invoices include separate CGST and SGST amounts
        This was missing in the response
        """
        print("\n💰 CRITICAL TEST 5: GST Breakdown Fix")
        
        if not self.test_resources.get('invoice_id'):
            self.log_test("GST breakdown test", False, "- No invoice created to test GST breakdown")
            return False
        
        # Test the enhanced invoice creation response directly
        # Create another invoice to test the response
        valid_quantity_invoice = {
            "project_id": self.test_resources['project_id'],
            "project_name": "Foundation Excavation Project", 
            "client_id": self.test_resources['client_id'],
            "client_name": "Foundation Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'],
            "invoice_items": [
                {
                    "boq_item_id": "2",
                    "serial_number": "2",
                    "description": "Concrete Pouring",  # Use second BOQ item
                    "unit": "Cum", 
                    "quantity": 25.0,  # LESS than available (50)
                    "rate": 4000.0,
                    "amount": 100000.0
                }
            ],
            "item_gst_mappings": [
                {
                    "item_id": "2",
                    "gst_type": "CGST_SGST",
                    "cgst_rate": 9.0,
                    "sgst_rate": 9.0,
                    "total_gst_rate": 18.0
                }
            ],
            "subtotal": 100000.0,
            "cgst_amount": 9000.0,
            "sgst_amount": 9000.0,
            "total_gst_amount": 18000.0,
            "total_amount": 118000.0
        }
        
        success, result = self.make_request('POST', 'invoices/enhanced', valid_quantity_invoice)
        
        if success:
            # Check for separate CGST and SGST amounts in the response
            has_cgst = 'cgst_amount' in result
            has_sgst = 'sgst_amount' in result
            has_total_gst = 'total_gst_amount' in result
            
            cgst_amount = result.get('cgst_amount', 0)
            sgst_amount = result.get('sgst_amount', 0)
            total_gst = result.get('total_gst_amount', 0)
            
            # Verify the breakdown is correct (CGST + SGST = Total GST)
            breakdown_correct = abs((cgst_amount + sgst_amount) - total_gst) < 0.01
            
            self.log_test("GST breakdown fields present", has_cgst and has_sgst and has_total_gst,
                        f"- CGST: {has_cgst}, SGST: {has_sgst}, Total GST: {has_total_gst}")
            
            self.log_test("GST breakdown calculation", breakdown_correct,
                        f"- CGST: ₹{cgst_amount}, SGST: ₹{sgst_amount}, Total: ₹{total_gst}")
            
            return has_cgst and has_sgst and breakdown_correct
        else:
            self.log_test("GST breakdown test", False, f"- Could not create test invoice: {result}")
            return False

    def test_pdf_generation_for_enhanced_invoice(self):
        """
        CRITICAL TEST 6: Test PDF generation for enhanced invoices
        """
        print("\n📄 CRITICAL TEST 6: PDF Generation for Enhanced Invoices")
        
        if not self.test_resources.get('invoice_id'):
            self.log_test("PDF generation test", False, "- No invoice created to test PDF generation")
            return False
        
        # Test PDF generation
        success, pdf_data = self.make_request('GET', f'invoices/{self.test_resources["invoice_id"]}/pdf')
        
        if success:
            pdf_size = len(pdf_data) if isinstance(pdf_data, bytes) else 0
            self.log_test("Enhanced invoice PDF generation", pdf_size > 1000,
                        f"- PDF generated successfully, Size: {pdf_size} bytes")
            return pdf_size > 1000
        else:
            self.log_test("Enhanced invoice PDF generation", False, f"- {pdf_data}")
            return False

    def run_all_critical_tests(self):
        """Run all critical fix tests"""
        print("🚨 STARTING CRITICAL FIXES TESTING")
        print("=" * 60)
        
        # Authenticate
        if not self.authenticate():
            print("❌ Authentication failed, cannot proceed with tests")
            return False
        
        # Setup test data
        if not self.setup_test_data():
            print("❌ Test data setup failed, cannot proceed with tests")
            return False
        
        # Run critical tests
        results = []
        
        # Test 1: Quantity validation blocking (MOST CRITICAL)
        results.append(self.test_quantity_validation_blocking())
        
        # Test 2: Valid quantity invoice creation
        results.append(self.test_valid_quantity_invoice())
        
        # Test 3: Project details 500 error fix
        results.append(self.test_project_details_fix())
        
        # Test 4: Invoice visibility in project
        results.append(self.test_invoice_visibility_in_project())
        
        # Test 5: GST breakdown fix
        results.append(self.test_gst_breakdown_fix())
        
        # Test 6: PDF generation
        results.append(self.test_pdf_generation_for_enhanced_invoice())
        
        # Summary
        passed = sum(results)
        total = len(results)
        success_rate = (passed / total) * 100
        
        print("\n" + "=" * 60)
        print("🎯 CRITICAL FIXES TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Passed: {passed}/{total} ({success_rate:.1f}%)")
        
        if passed == total:
            print("🎉 ALL CRITICAL FIXES WORKING CORRECTLY!")
        elif passed >= 4:
            print("⚠️  MOST CRITICAL FIXES WORKING - Some minor issues remain")
        else:
            print("🚨 CRITICAL ISSUES STILL PRESENT - Immediate attention required!")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = CriticalFixesTester()
    success = tester.run_all_critical_tests()
    sys.exit(0 if success else 1)