#!/usr/bin/env python3
"""
🎯 COMPREHENSIVE FINAL TESTING - 100% WORKING TOOL VERIFICATION
Tests all critical business logic and enterprise features for production readiness
"""

import requests
import sys
import json
import io
import os
from datetime import datetime
from pathlib import Path

class ComprehensiveFinalTester:
    def __init__(self):
        # Get backend URL from frontend .env file
        frontend_env_path = Path("/app/frontend/.env")
        self.base_url = "https://template-maestro.preview.emergentagent.com"  # Default
        
        if frontend_env_path.exists():
            with open(frontend_env_path, 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        self.base_url = line.split('=', 1)[1].strip()
                        break
        
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.critical_failures = []
        self.created_resources = {
            'clients': [],
            'projects': [],
            'invoices': [],
            'company_profiles': []
        }

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

    def test_authentication(self):
        """Test authentication with provided credentials"""
        print("\n🔐 Testing Authentication with Provided Credentials...")
        
        # Test with provided credentials: brightboxm@gmail.com / admin123
        success, result = self.make_request('POST', 'auth/login', 
                                          {'email': 'brightboxm@gmail.com', 'password': 'admin123'})
        
        if success and 'access_token' in result:
            self.token = result['access_token']
            self.user_data = result['user']
            self.log_test("Authentication with provided credentials", True, 
                        f"- Email: {self.user_data['email']}, Role: {self.user_data['role']}", is_critical=True)
            return True
        else:
            self.log_test("Authentication with provided credentials", False, 
                        f"- {result}", is_critical=True)
            return False

    def create_test_client(self):
        """Create a test client for project creation"""
        client_data = {
            "name": "Enterprise Test Client Ltd",
            "gst_no": "29ABCDE1234F1Z5",
            "bill_to_address": "123 Business District, Bangalore, Karnataka - 560001",
            "ship_to_address": "456 Industrial Area, Bangalore, Karnataka - 560002",
            "contact_person": "Rajesh Kumar",
            "phone": "+91-9876543210",
            "email": "rajesh@enterprisetestclient.com"
        }
        
        success, result = self.make_request('POST', 'clients', client_data)
        
        if success and 'client_id' in result:
            client_id = result['client_id']
            self.created_resources['clients'].append(client_id)
            return client_id, client_data
        return None, None

    def test_project_creation_with_percentages(self):
        """Test Project Creation with ABG/RA/Erection/PBG percentage fields"""
        print("\n🏗️ Testing Project Creation with Percentages...")
        
        # Create client first
        client_id, client_data = self.create_test_client()
        if not client_id:
            self.log_test("Project creation setup", False, "- Failed to create test client", is_critical=True)
            return None
        
        # Create project with percentage fields
        project_data = {
            "project_name": "Enterprise Construction Project",
            "architect": "Innovative Architects Ltd",
            "client_id": client_id,
            "client_name": client_data['name'],
            "project_metadata": {
                "purchase_order_number": "PO-ENT-2024-001",
                "type": "Industrial Construction",
                "reference_no": "REF-ENT-001",
                "dated": "2024-01-15",
                "basic": 5000000.0,
                "overall_multiplier": 1.2,
                "po_inv_value": 6000000.0,
                "abg_percentage": 10.0,  # Advance Bank Guarantee %
                "ra_bill_with_taxes_percentage": 80.0,  # RA Bill with Taxes %
                "erection_percentage": 15.0,  # Erection %
                "pbg_percentage": 5.0,  # Performance Bank Guarantee %
                # Calculated amounts
                "abg_amount": 600000.0,  # 10% of 6M
                "ra_bill_amount": 4800000.0,  # 80% of 6M
                "erection_amount": 900000.0,  # 15% of 6M
                "pbg_amount": 300000.0  # 5% of 6M
            },
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Foundation and Excavation Work",
                    "unit": "Cum",
                    "quantity": 500.0,
                    "rate": 2500.0,
                    "amount": 1250000.0,
                    "gst_rate": 18.0
                },
                {
                    "serial_number": "2", 
                    "description": "Steel Structure Fabrication and Erection",
                    "unit": "Kg",
                    "quantity": 10000.0,
                    "rate": 350.0,
                    "amount": 3500000.0,
                    "gst_rate": 18.0
                },
                {
                    "serial_number": "3",
                    "description": "Concrete Work M25 Grade",
                    "unit": "Cum",
                    "quantity": 300.0,
                    "rate": 4200.0,
                    "amount": 1260000.0,
                    "gst_rate": 18.0
                }
            ],
            "total_project_value": 6010000.0,
            "advance_received": 600000.0,
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'projects', project_data)
        
        if success and 'project_id' in result:
            project_id = result['project_id']
            self.created_resources['projects'].append(project_id)
            
            # Verify project was created with percentage fields
            success, project = self.make_request('GET', f'projects/{project_id}')
            if success:
                metadata = project.get('project_metadata', {})
                has_percentages = all(field in metadata for field in [
                    'abg_percentage', 'ra_bill_with_taxes_percentage', 
                    'erection_percentage', 'pbg_percentage'
                ])
                has_amounts = all(field in metadata for field in [
                    'abg_amount', 'ra_bill_amount', 'erection_amount', 'pbg_amount'
                ])
                
                self.log_test("Project creation with percentages", has_percentages and has_amounts,
                            f"- ABG: {metadata.get('abg_percentage', 0)}%, RA: {metadata.get('ra_bill_with_taxes_percentage', 0)}%, "
                            f"Erection: {metadata.get('erection_percentage', 0)}%, PBG: {metadata.get('pbg_percentage', 0)}%",
                            is_critical=True)
                
                return project_id
            else:
                self.log_test("Project creation verification", False, f"- {project}", is_critical=True)
        else:
            self.log_test("Project creation with percentages", False, f"- {result}", is_critical=True)
        
        return None

    def test_enhanced_invoice_creation_with_quantity_validation(self):
        """Test Enhanced Invoice Creation with quantity validation and ABG Release Mapping"""
        print("\n🧾 Testing Enhanced Invoice Creation with Quantity Validation...")
        
        # Ensure we have a project
        if not self.created_resources['projects']:
            project_id = self.test_project_creation_with_percentages()
        else:
            project_id = self.created_resources['projects'][0]
        
        if not project_id:
            self.log_test("Enhanced invoice setup", False, "- No project available", is_critical=True)
            return False
        
        client_id = self.created_resources['clients'][0] if self.created_resources['clients'] else None
        
        # Test 1: Valid quantity invoice (should pass)
        print("\n  📋 Testing Valid Quantity Invoice Creation...")
        valid_invoice_data = {
            "project_id": project_id,
            "project_name": "Enterprise Construction Project",
            "client_id": client_id,
            "client_name": "Enterprise Test Client Ltd",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation and Excavation Work - Partial",
                    "unit": "Cum",
                    "quantity": 200.0,  # Valid: 200 out of 500 available
                    "rate": 2500.0,
                    "amount": 500000.0,
                    "gst_rate": 18.0,
                    "gst_amount": 90000.0,
                    "total_with_gst": 590000.0
                }
            ],
            "subtotal": 500000.0,
            "total_gst_amount": 90000.0,
            "total_amount": 590000.0,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices', valid_invoice_data)
        
        if success and 'invoice_id' in result:
            valid_invoice_id = result['invoice_id']
            self.created_resources['invoices'].append(valid_invoice_id)
            ra_number = result.get('ra_number', 'N/A')
            self.log_test("Valid quantity invoice creation", True,
                        f"- Invoice ID: {valid_invoice_id}, RA Number: {ra_number}", is_critical=True)
        else:
            self.log_test("Valid quantity invoice creation", False, f"- {result}", is_critical=True)
        
        # Test 2: Over-quantity invoice (should be blocked) - Use enhanced endpoint for quantity validation
        print("\n  🚫 Testing Over-Quantity Blocking...")
        over_quantity_invoice_data = {
            "project_id": project_id,
            "project_name": "Enterprise Construction Project", 
            "client_id": client_id,
            "client_name": "Enterprise Test Client Ltd",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "invoice_items": [  # Use invoice_items for enhanced endpoint
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation and Excavation Work - Over Quantity",
                    "unit": "Cum",
                    "quantity": 400.0,  # Invalid: 400 + 200 (already billed) = 600 > 500 available
                    "rate": 2500.0,
                    "amount": 1000000.0
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
            "subtotal": 1000000.0,
            "cgst_amount": 90000.0,
            "sgst_amount": 90000.0,
            "total_gst_amount": 180000.0,
            "total_amount": 1180000.0,
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices/enhanced', over_quantity_invoice_data, expected_status=400)
        
        # This should fail (success=True means it correctly returned 400)
        if success:
            self.log_test("Over-quantity blocking", True,
                        "- Correctly blocked over-quantity invoice", is_critical=True)
        else:
            # If it didn't return 400, it might have been created (which is wrong)
            self.log_test("Over-quantity blocking", False,
                        f"- Over-quantity invoice was not blocked: {result}", is_critical=True)
        
        # Test 3: ABG Release Mapping Table visibility
        print("\n  📊 Testing ABG Release Mapping Table...")
        success, project_details = self.make_request('GET', f'projects/{project_id}')
        
        if success:
            metadata = project_details.get('project_metadata', {})
            has_abg_mapping = all(field in metadata for field in [
                'abg_percentage', 'abg_amount', 'ra_bill_with_taxes_percentage', 'ra_bill_amount'
            ])
            
            if has_abg_mapping:
                abg_percentage = metadata.get('abg_percentage', 0)
                ra_percentage = metadata.get('ra_bill_with_taxes_percentage', 0)
                self.log_test("ABG Release Mapping table visibility", True,
                            f"- ABG: {abg_percentage}%, RA: {ra_percentage}%", is_critical=True)
            else:
                self.log_test("ABG Release Mapping table visibility", False,
                            "- Missing ABG/RA mapping data", is_critical=True)
        else:
            self.log_test("ABG Release Mapping table visibility", False, f"- {project_details}", is_critical=True)
        
        return True

    def test_pdf_generation_comprehensive(self):
        """Test PDF Generation for all invoice types"""
        print("\n📄 Testing Comprehensive PDF Generation...")
        
        if not self.created_resources['invoices']:
            self.log_test("PDF generation setup", False, "- No invoices available", is_critical=True)
            return False
        
        pdf_tests_passed = 0
        total_pdf_tests = 0
        
        for invoice_id in self.created_resources['invoices']:
            total_pdf_tests += 1
            success, pdf_data = self.make_request('GET', f'invoices/{invoice_id}/pdf')
            
            if success and isinstance(pdf_data, bytes) and len(pdf_data) > 1000:
                pdf_tests_passed += 1
                self.log_test(f"PDF generation for invoice {invoice_id}", True,
                            f"- PDF size: {len(pdf_data)} bytes")
            else:
                self.log_test(f"PDF generation for invoice {invoice_id}", False,
                            f"- Failed: {pdf_data if not isinstance(pdf_data, bytes) else 'Invalid PDF data'}",
                            is_critical=True)
        
        success_rate = (pdf_tests_passed / total_pdf_tests * 100) if total_pdf_tests > 0 else 0
        self.log_test("Overall PDF generation", success_rate == 100,
                    f"- Success rate: {success_rate:.1f}% ({pdf_tests_passed}/{total_pdf_tests})",
                    is_critical=True)
        
        return success_rate == 100

    def test_company_profile_management(self):
        """Test Company Profile CRUD operations"""
        print("\n🏢 Testing Company Profile Management...")
        
        # Test creating company profile
        company_profile_data = {
            "company_name": "Activus Industrial Design & Build LLP",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id",
            "locations": [
                {
                    "location_name": "Corporate Headquarters",
                    "address_line_1": "No. 123, Industrial Estate",
                    "address_line_2": "Phase II, Electronic City",
                    "city": "Bangalore",
                    "state": "Karnataka",
                    "pincode": "560100",
                    "country": "India",
                    "phone": "+91-80-12345678",
                    "email": "corporate@activus.com",
                    "gst_number": "29ABCDE1234F1Z5",
                    "is_default": True
                }
            ],
            "bank_details": [
                {
                    "bank_name": "ICICI Bank",
                    "account_number": "123456789012",
                    "account_holder_name": "Activus Industrial Design & Build LLP",
                    "ifsc_code": "ICIC0001234",
                    "branch_name": "Electronic City Branch",
                    "account_type": "Current",
                    "is_default": True
                }
            ]
        }
        
        success, result = self.make_request('POST', 'company-profiles', company_profile_data)
        
        if success and 'profile_id' in result:
            profile_id = result['profile_id']
            self.created_resources['company_profiles'].append(profile_id)
            
            # Test retrieving the profile
            success, profile = self.make_request('GET', f'company-profiles/{profile_id}')
            if success:
                has_locations = len(profile.get('locations', [])) > 0
                has_bank_details = len(profile.get('bank_details', [])) > 0
                self.log_test("Company profile CRUD operations", has_locations and has_bank_details,
                            f"- Profile created with {len(profile.get('locations', []))} locations, "
                            f"{len(profile.get('bank_details', []))} bank accounts", is_critical=True)
                return profile_id
            else:
                self.log_test("Company profile retrieval", False, f"- {profile}", is_critical=True)
        else:
            self.log_test("Company profile creation", False, f"- {result}", is_critical=True)
        
        return None

    def test_data_consistency_and_validation(self):
        """Test data consistency and Pydantic validation"""
        print("\n🔍 Testing Data Consistency and Validation...")
        
        # Test projects data consistency
        success, projects = self.make_request('GET', 'projects')
        if success:
            pydantic_errors = 0
            for project in projects:
                # Check for consistent metadata structure
                metadata = project.get('project_metadata', {})
                if not isinstance(metadata, dict):
                    pydantic_errors += 1
            
            self.log_test("Projects data consistency", pydantic_errors == 0,
                        f"- {len(projects)} projects checked, {pydantic_errors} Pydantic errors",
                        is_critical=True)
        else:
            self.log_test("Projects data consistency", False, f"- {projects}", is_critical=True)
        
        # Test invoices data consistency
        success, invoices = self.make_request('GET', 'invoices')
        if success:
            validation_errors = 0
            for invoice in invoices:
                # Check required fields
                required_fields = ['invoice_number', 'project_id', 'client_id', 'items']
                missing_fields = [field for field in required_fields if field not in invoice]
                if missing_fields:
                    validation_errors += 1
            
            self.log_test("Invoices data consistency", validation_errors == 0,
                        f"- {len(invoices)} invoices checked, {validation_errors} validation errors",
                        is_critical=True)
        else:
            self.log_test("Invoices data consistency", False, f"- {invoices}", is_critical=True)

    def test_invoice_visibility_in_projects(self):
        """Test that invoices appear correctly in projects"""
        print("\n👁️ Testing Invoice Visibility in Projects...")
        
        if not self.created_resources['projects'] or not self.created_resources['invoices']:
            self.log_test("Invoice visibility setup", False, "- No projects or invoices available", is_critical=True)
            return False
        
        project_id = self.created_resources['projects'][0]
        
        # Get project details and check for invoices
        success, project = self.make_request('GET', f'projects/{project_id}')
        if success:
            # Check if project has invoice data or if we can get invoices for this project
            success, project_invoices = self.make_request('GET', f'invoices?project_id={project_id}')
            if success:
                invoice_count = len(project_invoices) if isinstance(project_invoices, list) else 0
                self.log_test("Invoice visibility in projects", invoice_count > 0,
                            f"- Found {invoice_count} invoices for project", is_critical=True)
                return invoice_count > 0
            else:
                # Try getting all invoices and filter by project
                success, all_invoices = self.make_request('GET', 'invoices')
                if success:
                    project_invoices = [inv for inv in all_invoices if inv.get('project_id') == project_id]
                    invoice_count = len(project_invoices)
                    self.log_test("Invoice visibility in projects", invoice_count > 0,
                                f"- Found {invoice_count} invoices for project (via filtering)", is_critical=True)
                    return invoice_count > 0
        
        self.log_test("Invoice visibility in projects", False, "- Could not verify invoice visibility", is_critical=True)
        return False

    def test_dynamic_calculations(self):
        """Test that all amounts are calculated in real-time (not from Excel)"""
        print("\n🧮 Testing Dynamic Calculations...")
        
        if not self.created_resources['invoices']:
            self.log_test("Dynamic calculations setup", False, "- No invoices available", is_critical=True)
            return False
        
        invoice_id = self.created_resources['invoices'][0]
        success, invoice = self.make_request('GET', f'invoices/{invoice_id}')
        
        if success:
            # Verify calculations
            items = invoice.get('items', [])
            calculated_subtotal = sum(item.get('amount', 0) for item in items)
            stored_subtotal = invoice.get('subtotal', 0)
            
            # Allow small floating point differences
            calculation_correct = abs(calculated_subtotal - stored_subtotal) < 0.01
            
            # Check GST calculations
            calculated_gst = calculated_subtotal * 0.18  # Assuming 18% GST
            stored_gst = invoice.get('total_gst_amount', 0)
            gst_calculation_correct = abs(calculated_gst - stored_gst) < 0.01
            
            self.log_test("Dynamic calculations", calculation_correct and gst_calculation_correct,
                        f"- Subtotal: ₹{stored_subtotal:,.2f} (calculated: ₹{calculated_subtotal:,.2f}), "
                        f"GST: ₹{stored_gst:,.2f} (calculated: ₹{calculated_gst:,.2f})",
                        is_critical=True)
            
            return calculation_correct and gst_calculation_correct
        else:
            self.log_test("Dynamic calculations", False, f"- {invoice}", is_critical=True)
            return False

    def test_input_fields_no_spinners(self):
        """Test that input fields have no spinner arrows (frontend behavior - backend validation)"""
        print("\n🎛️ Testing Input Fields Configuration...")
        
        # This is primarily a frontend test, but we can verify backend accepts decimal inputs properly
        test_data = {
            "project_name": "Spinner Test Project",
            "architect": "Test Architect",
            "client_id": self.created_resources['clients'][0] if self.created_resources['clients'] else "test-client",
            "client_name": "Test Client",
            "project_metadata": {
                "purchase_order_number": "PO-SPINNER-001",
                "basic": 1234567.89,  # Decimal value
                "abg_percentage": 10.5,  # Decimal percentage
                "ra_bill_with_taxes_percentage": 80.25,
                "erection_percentage": 15.75,
                "pbg_percentage": 5.33
            },
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Test Item",
                    "unit": "nos",
                    "quantity": 123.45,  # Decimal quantity
                    "rate": 678.90,  # Decimal rate
                    "amount": 8394.405,  # Calculated amount
                    "gst_rate": 18.0
                }
            ],
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'projects', test_data)
        
        if success:
            # Verify decimal values were stored correctly
            project_id = result.get('project_id')
            if project_id:
                success, project = self.make_request('GET', f'projects/{project_id}')
                if success:
                    metadata = project.get('project_metadata', {})
                    decimal_preserved = (
                        abs(metadata.get('basic', 0) - 1234567.89) < 0.01 and
                        abs(metadata.get('abg_percentage', 0) - 10.5) < 0.01
                    )
                    self.log_test("Input fields decimal handling", decimal_preserved,
                                "- Backend correctly handles decimal inputs", is_critical=True)
                    return decimal_preserved
        
        self.log_test("Input fields decimal handling", False, f"- {result}", is_critical=True)
        return False

    def run_comprehensive_final_test(self):
        """Run all comprehensive final tests"""
        print("🎯 STARTING COMPREHENSIVE FINAL TESTING - 100% WORKING TOOL VERIFICATION")
        print("=" * 80)
        print(f"Backend URL: {self.base_url}")
        print(f"API URL: {self.api_url}")
        print("=" * 80)
        
        # Authentication is critical - if this fails, stop testing
        if not self.test_authentication():
            print("\n❌ CRITICAL FAILURE: Authentication failed. Cannot proceed with testing.")
            return False
        
        # Run all critical business logic tests
        test_results = []
        
        # Core Features Testing
        test_results.append(self.test_project_creation_with_percentages())
        test_results.append(self.test_enhanced_invoice_creation_with_quantity_validation())
        test_results.append(self.test_pdf_generation_comprehensive())
        test_results.append(self.test_company_profile_management())
        test_results.append(self.test_data_consistency_and_validation())
        test_results.append(self.test_invoice_visibility_in_projects())
        test_results.append(self.test_dynamic_calculations())
        test_results.append(self.test_input_fields_no_spinners())
        
        # Calculate final results
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print("\n" + "=" * 80)
        print("🎯 COMPREHENSIVE FINAL TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.critical_failures:
            print(f"\n🚨 CRITICAL FAILURES ({len(self.critical_failures)}):")
            for failure in self.critical_failures:
                print(f"  ❌ {failure}")
        
        # Determine if tool is 100% ready
        is_production_ready = success_rate >= 95 and len(self.critical_failures) == 0
        
        if is_production_ready:
            print("\n✅ RESULT: 100% WORKING ENTERPRISE TOOL - PRODUCTION READY!")
            print("🎉 All critical business logic verified and working correctly.")
        else:
            print(f"\n❌ RESULT: Tool not ready for production use.")
            print(f"   Success rate: {success_rate:.1f}% (need ≥95%)")
            print(f"   Critical failures: {len(self.critical_failures)} (need 0)")
        
        print("=" * 80)
        return is_production_ready

if __name__ == "__main__":
    tester = ComprehensiveFinalTester()
    success = tester.run_comprehensive_final_test()
    sys.exit(0 if success else 1)