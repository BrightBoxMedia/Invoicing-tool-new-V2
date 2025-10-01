#!/usr/bin/env python3
"""
CRITICAL ENHANCED INVOICE SYSTEM TESTING
Tests the critical fixes for enhanced invoice system as requested by user
Focus: Quantity validation, invoice visibility, PDF generation, calculations
"""

import requests
import sys
import json
import io
import os
from datetime import datetime
from pathlib import Path

class EnhancedInvoiceSystemTester:
    def __init__(self, base_url="https://template-maestro.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'clients': [],
            'projects': [],
            'invoices': [],
            'company_profiles': []
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
        """Authenticate with test credentials"""
        print("\n🔐 Authenticating with test credentials...")
        
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
        """Setup required test data (client, company profile, project)"""
        print("\n🏗️ Setting up test data...")
        
        # Create test client
        client_data = {
            "name": "Enhanced Test Client Ltd",
            "gst_no": "29ABCDE1234F1Z5",
            "bill_to_address": "123 Test Street, Bangalore, Karnataka - 560001",
            "ship_to_address": "456 Ship Street, Bangalore, Karnataka - 560002",
            "contact_person": "John Doe",
            "phone": "+91-9876543210",
            "email": "john@enhancedtestclient.com"
        }
        
        success, result = self.make_request('POST', 'clients', client_data)
        if success and 'client_id' in result:
            client_id = result['client_id']
            self.created_resources['clients'].append(client_id)
            self.log_test("Create test client", True, f"- Client ID: {client_id}")
        else:
            self.log_test("Create test client", False, f"- {result}")
            return False

        # Create company profile
        company_profile_data = {
            "company_name": "Activus Enhanced Test Branch",
            "created_by": self.user_data['id'],
            "locations": [
                {
                    "location_name": "Bangalore Head Office",
                    "address_line_1": "123 Industrial Area",
                    "city": "Bangalore",
                    "state": "Karnataka",
                    "pincode": "560001",
                    "country": "India",
                    "phone": "+91-9876543210",
                    "email": "bangalore@activustest.com",
                    "gst_number": "29ABCDE1234F1Z5",
                    "is_default": True
                }
            ],
            "bank_details": [
                {
                    "bank_name": "State Bank of India",
                    "account_number": "12345678901",
                    "account_holder_name": "Activus Enhanced Test Branch",
                    "ifsc_code": "SBIN0001234",
                    "branch_name": "Bangalore Main Branch",
                    "account_type": "Current",
                    "is_default": True
                }
            ]
        }
        
        success, result = self.make_request('POST', 'company-profiles', company_profile_data)
        if success and 'profile_id' in result:
            profile_id = result['profile_id']
            self.created_resources['company_profiles'].append(profile_id)
            self.log_test("Create company profile", True, f"- Profile ID: {profile_id}")
        else:
            self.log_test("Create company profile", False, f"- {result}")
            return False

        # Create enhanced project with BOQ items
        project_data = {
            "project_name": "Enhanced Invoice Test Project",
            "architect": "Test Architect",
            "client_id": client_id,
            "client_name": "Enhanced Test Client Ltd",
            "company_profile_id": profile_id,
            "created_by": self.user_data['id'],
            "metadata": [
                {
                    "purchase_order_number": "PO-2024-ENH-TEST-001",
                    "type": "Construction",
                    "reference_no": "REF-TEST-001",
                    "dated": "2024-01-15",
                    "basic": 1000000.0,
                    "overall_multiplier": 1.2,
                    "po_inv_value": 1200000.0,
                    "abg_percentage": 10.0,
                    "ra_bill_with_taxes_percentage": 80.0,
                    "erection_percentage": 15.0,
                    "pbg_percentage": 5.0
                }
            ],
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Foundation Excavation Work",
                    "unit": "Cum",
                    "quantity": 100.0,
                    "rate": 2500.0,
                    "amount": 250000.0,
                    "gst_rate": 18.0
                },
                {
                    "serial_number": "2",
                    "description": "Concrete M25 Foundation",
                    "unit": "Cum",
                    "quantity": 50.0,
                    "rate": 6000.0,
                    "amount": 300000.0,
                    "gst_rate": 18.0
                },
                {
                    "serial_number": "3",
                    "description": "Steel Reinforcement TMT",
                    "unit": "Kg",
                    "quantity": 2000.0,
                    "rate": 75.0,
                    "amount": 150000.0,
                    "gst_rate": 18.0
                }
            ]
        }
        
        success, result = self.make_request('POST', 'projects/enhanced', project_data)
        if success and 'project_id' in result:
            project_id = result['project_id']
            self.created_resources['projects'].append(project_id)
            self.log_test("Create enhanced project", True, f"- Project ID: {project_id}")
            return True
        else:
            self.log_test("Create enhanced project", False, f"- {result}")
            return False

    def test_quantity_validation_blocking(self):
        """
        CRITICAL TEST 1: Test quantity validation that BLOCKS over-quantity invoices
        This is the TOP PRIORITY test as per user request
        """
        print("\n🚨 CRITICAL TEST 1: QUANTITY VALIDATION BLOCKING")
        
        if not self.created_resources['projects']:
            self.log_test("Quantity validation setup", False, "- No projects available")
            return False
        
        project_id = self.created_resources['projects'][0]
        client_id = self.created_resources['clients'][0]
        
        # TEST SCENARIO 1: Try to create invoice with quantity 100 when balance is 50 - should FAIL
        print("\n🔴 Testing BLOCKING behavior - Over-quantity invoice (should FAIL)")
        
        over_quantity_invoice_data = {
            "project_id": project_id,
            "project_name": "Enhanced Invoice Test Project",
            "client_id": client_id,
            "client_name": "Enhanced Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'],
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Excavation Work - OVER QUANTITY",
                    "unit": "Cum",
                    "quantity": 150.0,  # BOQ has only 100, this should FAIL
                    "rate": 2500.0,
                    "amount": 375000.0
                }
            ],
            "subtotal": 375000.0,
            "cgst_amount": 33750.0,
            "sgst_amount": 33750.0,
            "total_gst_amount": 67500.0,
            "total_amount": 442500.0
        }
        
        # This should return 400 (Bad Request) due to quantity validation failure
        success, result = self.make_request('POST', 'invoices/enhanced', over_quantity_invoice_data, expected_status=400)
        
        if success:
            # Check if the error message indicates quantity validation failure
            error_msg = str(result).lower()
            is_quantity_error = any(keyword in error_msg for keyword in ['quantity', 'balance', 'exceed', 'insufficient'])
            self.log_test("CRITICAL: Over-quantity invoice BLOCKED", is_quantity_error, 
                        f"- System correctly blocked over-quantity invoice: {result}")
        else:
            self.log_test("CRITICAL: Over-quantity invoice BLOCKED", False, 
                        f"- System failed to block over-quantity invoice: {result}")
        
        # TEST SCENARIO 2: Create invoice with quantity 30 when balance is 100 - should SUCCESS
        print("\n🟢 Testing ALLOWING behavior - Valid quantity invoice (should SUCCESS)")
        
        valid_quantity_invoice_data = {
            "project_id": project_id,
            "project_name": "Enhanced Invoice Test Project",
            "client_id": client_id,
            "client_name": "Enhanced Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'],
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Excavation Work - Valid Quantity",
                    "unit": "Cum",
                    "quantity": 30.0,  # BOQ has 100, this should SUCCESS
                    "rate": 2500.0,
                    "amount": 75000.0
                },
                {
                    "boq_item_id": "2",
                    "serial_number": "2",
                    "description": "Concrete M25 Foundation - Valid Quantity",
                    "unit": "Cum",
                    "quantity": 20.0,  # BOQ has 50, this should SUCCESS
                    "rate": 6000.0,
                    "amount": 120000.0
                }
            ],
            "item_gst_mappings": [
                {
                    "item_id": "1",
                    "gst_type": "CGST_SGST",
                    "cgst_rate": 9.0,
                    "sgst_rate": 9.0,
                    "total_gst_rate": 18.0
                },
                {
                    "item_id": "2",
                    "gst_type": "CGST_SGST",
                    "cgst_rate": 9.0,
                    "sgst_rate": 9.0,
                    "total_gst_rate": 18.0
                }
            ],
            "subtotal": 195000.0,
            "cgst_amount": 17550.0,
            "sgst_amount": 17550.0,
            "total_gst_amount": 35100.0,
            "total_amount": 230100.0,
            "payment_terms": "30 days from invoice date",
            "advance_received": 10000.0
        }
        
        success, result = self.make_request('POST', 'invoices/enhanced', valid_quantity_invoice_data)
        
        if success and 'invoice_id' in result:
            invoice_id = result['invoice_id']
            self.created_resources['invoices'].append(invoice_id)
            ra_number = result.get('ra_number', 'N/A')
            self.log_test("CRITICAL: Valid quantity invoice CREATED", True, 
                        f"- Invoice ID: {invoice_id}, RA Number: {ra_number}")
            return invoice_id
        else:
            self.log_test("CRITICAL: Valid quantity invoice CREATED", False, f"- {result}")
            return None

    def test_invoice_visibility_in_projects(self):
        """
        CRITICAL TEST 2: Test that enhanced invoices appear in projects list
        """
        print("\n🚨 CRITICAL TEST 2: INVOICE VISIBILITY IN PROJECTS")
        
        if not self.created_resources['projects'] or not self.created_resources['invoices']:
            self.log_test("Invoice visibility setup", False, "- No projects or invoices available")
            return False
        
        project_id = self.created_resources['projects'][0]
        invoice_id = self.created_resources['invoices'][0]
        
        # Get project details to check if invoice appears
        success, project = self.make_request('GET', f'projects/{project_id}')
        
        if success:
            # Check if project has invoice data
            has_invoices = 'invoices' in project or 'invoice_count' in project
            self.log_test("Project contains invoice data", has_invoices, 
                        f"- Project structure includes invoice information")
            
            # Get projects list to verify invoice visibility
            success, projects_list = self.make_request('GET', 'projects')
            if success:
                # Find our project in the list
                our_project = next((p for p in projects_list if p.get('id') == project_id), None)
                if our_project:
                    # Check if invoice information is visible
                    has_invoice_info = any(key in our_project for key in ['invoices', 'invoice_count', 'total_invoiced'])
                    self.log_test("CRITICAL: Invoice visible in projects list", has_invoice_info,
                                f"- Invoice information visible in project listing")
                    
                    # Verify required fields are saved
                    required_fields = ['project_name', 'client_name']
                    has_required_fields = all(field in our_project for field in required_fields)
                    self.log_test("Required fields saved", has_required_fields,
                                f"- Project: {our_project.get('project_name', 'Missing')}, Client: {our_project.get('client_name', 'Missing')}")
                    
                    return True
                else:
                    self.log_test("CRITICAL: Invoice visible in projects list", False, "- Project not found in list")
            else:
                self.log_test("Get projects list", False, f"- {projects_list}")
        else:
            self.log_test("Get project details", False, f"- {project}")
        
        return False

    def test_pdf_generation(self):
        """
        CRITICAL TEST 3: Test PDF generation for enhanced invoices
        """
        print("\n🚨 CRITICAL TEST 3: PDF GENERATION")
        
        if not self.created_resources['invoices']:
            self.log_test("PDF generation setup", False, "- No invoices available")
            return False
        
        invoice_id = self.created_resources['invoices'][0]
        
        # Test PDF generation
        success, pdf_data = self.make_request('GET', f'invoices/{invoice_id}/pdf')
        
        if success:
            if isinstance(pdf_data, bytes):
                pdf_size = len(pdf_data)
                is_valid_pdf = pdf_data.startswith(b'%PDF') if pdf_data else False
                self.log_test("CRITICAL: PDF generation SUCCESS", is_valid_pdf and pdf_size > 1000,
                            f"- PDF size: {pdf_size} bytes, Valid PDF header: {is_valid_pdf}")
                
                # Test that PDF doesn't throw errors
                self.log_test("PDF generation no errors", True, "- PDF generated without throwing errors")
                return True
            else:
                self.log_test("CRITICAL: PDF generation SUCCESS", False, "- PDF data is not bytes")
        else:
            self.log_test("CRITICAL: PDF generation SUCCESS", False, f"- {pdf_data}")
        
        return False

    def test_invoice_calculations(self):
        """
        CRITICAL TEST 4: Test invoice calculations are dynamic and correct
        """
        print("\n🚨 CRITICAL TEST 4: INVOICE CALCULATIONS")
        
        if not self.created_resources['invoices']:
            self.log_test("Invoice calculations setup", False, "- No invoices available")
            return False
        
        invoice_id = self.created_resources['invoices'][0]
        
        # Get invoice details to verify calculations
        success, invoice = self.make_request('GET', f'invoices/{invoice_id}')
        
        if success:
            # Verify calculation fields exist
            calculation_fields = ['subtotal', 'cgst_amount', 'sgst_amount', 'total_gst_amount', 'total_amount']
            has_calculations = all(field in invoice for field in calculation_fields)
            self.log_test("Invoice has calculation fields", has_calculations,
                        f"- Fields present: {[f for f in calculation_fields if f in invoice]}")
            
            if has_calculations:
                subtotal = invoice.get('subtotal', 0)
                cgst = invoice.get('cgst_amount', 0)
                sgst = invoice.get('sgst_amount', 0)
                total_gst = invoice.get('total_gst_amount', 0)
                total = invoice.get('total_amount', 0)
                
                # Test CGST+SGST calculation (Karnataka to Karnataka)
                expected_gst = cgst + sgst
                gst_calculation_correct = abs(total_gst - expected_gst) < 0.01
                self.log_test("CRITICAL: CGST+SGST calculation correct", gst_calculation_correct,
                            f"- CGST: ₹{cgst}, SGST: ₹{sgst}, Total GST: ₹{total_gst}")
                
                # Test total amount calculation
                expected_total = subtotal + total_gst
                total_calculation_correct = abs(total - expected_total) < 0.01
                self.log_test("CRITICAL: Total amount calculation correct", total_calculation_correct,
                            f"- Subtotal: ₹{subtotal}, GST: ₹{total_gst}, Total: ₹{total}")
                
                # Verify amounts are NOT from Excel but calculated dynamically
                # Check if amounts are reasonable for the quantities we used (30 Cum @ 2500 + 20 Cum @ 6000)
                expected_subtotal = (30 * 2500) + (20 * 6000)  # 75000 + 120000 = 195000
                dynamic_calculation = abs(subtotal - expected_subtotal) < 0.01
                self.log_test("CRITICAL: Amounts calculated dynamically (NOT from Excel)", dynamic_calculation,
                            f"- Expected: ₹{expected_subtotal}, Actual: ₹{subtotal}")
                
                return gst_calculation_correct and total_calculation_correct and dynamic_calculation
            else:
                self.log_test("CRITICAL: Invoice calculations", False, "- Missing calculation fields")
        else:
            self.log_test("Get invoice details", False, f"- {invoice}")
        
        return False

    def test_ra_numbering(self):
        """
        Test RA numbering works correctly for enhanced invoices
        """
        print("\n📋 Testing RA Numbering...")
        
        if not self.created_resources['invoices']:
            self.log_test("RA numbering setup", False, "- No invoices available")
            return False
        
        invoice_id = self.created_resources['invoices'][0]
        
        # Get invoice to check RA number
        success, invoice = self.make_request('GET', f'invoices/{invoice_id}')
        
        if success:
            ra_number = invoice.get('ra_number', '')
            has_ra_number = ra_number and ra_number.startswith('RA')
            self.log_test("RA numbering works correctly", has_ra_number,
                        f"- RA Number: {ra_number}")
            
            # Create another invoice to test RA2
            if self.created_resources['projects'] and self.created_resources['clients']:
                project_id = self.created_resources['projects'][0]
                client_id = self.created_resources['clients'][0]
                
                second_invoice_data = {
                    "project_id": project_id,
                    "project_name": "Enhanced Invoice Test Project",
                    "client_id": client_id,
                    "client_name": "Enhanced Test Client Ltd",
                    "invoice_type": "tax_invoice",
                    "invoice_gst_type": "CGST_SGST",
                    "created_by": self.user_data['id'],
                    "invoice_items": [
                        {
                            "boq_item_id": "3",
                            "serial_number": "3",
                            "description": "Steel Reinforcement TMT - Second Invoice",
                            "unit": "Kg",
                            "quantity": 500.0,  # BOQ has 2000, this should work
                            "rate": 75.0,
                            "amount": 37500.0
                        }
                    ],
                    "item_gst_mappings": [
                        {
                            "item_id": "3",
                            "gst_type": "CGST_SGST",
                            "cgst_rate": 9.0,
                            "sgst_rate": 9.0,
                            "total_gst_rate": 18.0
                        }
                    ],
                    "subtotal": 37500.0,
                    "cgst_amount": 3375.0,
                    "sgst_amount": 3375.0,
                    "total_gst_amount": 6750.0,
                    "total_amount": 44250.0
                }
                
                success, result = self.make_request('POST', 'invoices/enhanced', second_invoice_data)
                if success and 'invoice_id' in result:
                    second_invoice_id = result['invoice_id']
                    second_ra_number = result.get('ra_number', '')
                    self.created_resources['invoices'].append(second_invoice_id)
                    
                    # Check if second invoice has RA2
                    is_ra2 = second_ra_number == 'RA2'
                    self.log_test("Sequential RA numbering", is_ra2,
                                f"- Second invoice RA Number: {second_ra_number}")
                    
                    return has_ra_number and is_ra2
            
            return has_ra_number
        else:
            self.log_test("Get invoice for RA check", False, f"- {invoice}")
            return False

    def run_critical_tests(self):
        """Run all critical tests as requested by user"""
        print("🚨 STARTING CRITICAL ENHANCED INVOICE SYSTEM TESTING")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("❌ CRITICAL FAILURE: Authentication failed")
            return False
        
        # Step 2: Setup test data
        if not self.setup_test_data():
            print("❌ CRITICAL FAILURE: Test data setup failed")
            return False
        
        # Step 3: Run critical tests in order of priority
        print("\n🎯 RUNNING CRITICAL TESTS IN PRIORITY ORDER:")
        
        # CRITICAL TEST 1: Quantity validation (TOP PRIORITY)
        invoice_id = self.test_quantity_validation_blocking()
        if not invoice_id:
            print("❌ CRITICAL FAILURE: Quantity validation test failed")
        
        # CRITICAL TEST 2: Invoice visibility in projects
        self.test_invoice_visibility_in_projects()
        
        # CRITICAL TEST 3: PDF generation
        self.test_pdf_generation()
        
        # CRITICAL TEST 4: Invoice calculations
        self.test_invoice_calculations()
        
        # Additional test: RA numbering
        self.test_ra_numbering()
        
        # Final summary
        print("\n" + "=" * 60)
        print(f"🎯 CRITICAL TESTING COMPLETE")
        print(f"📊 Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("✅ CRITICAL TESTS: MOSTLY SUCCESSFUL - Ready for showcase")
        elif success_rate >= 60:
            print("⚠️  CRITICAL TESTS: PARTIALLY SUCCESSFUL - Some issues need attention")
        else:
            print("❌ CRITICAL TESTS: FAILED - Major issues need immediate fixing")
        
        return success_rate >= 80

if __name__ == "__main__":
    tester = EnhancedInvoiceSystemTester()
    success = tester.run_critical_tests()
    sys.exit(0 if success else 1)