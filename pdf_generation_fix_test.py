#!/usr/bin/env python3
"""
CRITICAL PDF GENERATION FIX TESTING
Tests the urgent fix for PDF generation Pydantic validation failures
"""

import requests
import sys
import json
import os
from datetime import datetime

class PDFGenerationFixTester:
    def __init__(self):
        # Get backend URL from environment
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
        self.critical_issues = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
            if "CRITICAL" in name.upper():
                self.critical_issues.append(f"{name}: {details}")
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
        """Authenticate with provided credentials"""
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

    def test_admin_fix_endpoint(self):
        """Test 1: Run Admin Fix Endpoint to fix existing project metadata"""
        print("\n🔧 Testing Admin Fix Endpoint...")
        
        success, result = self.make_request('POST', 'admin/fix-project-metadata')
        
        if success:
            fixed_count = result.get('fixed_count', 0)
            total_checked = result.get('total_checked', 0)
            self.log_test("CRITICAL: Admin Fix Endpoint", True, 
                        f"- Fixed {fixed_count} projects out of {total_checked} checked")
            return True
        else:
            self.log_test("CRITICAL: Admin Fix Endpoint", False, f"- {result}")
            return False

    def test_project_retrieval(self):
        """Test 2: Verify projects can be retrieved without Pydantic errors"""
        print("\n📋 Testing Project Retrieval...")
        
        success, result = self.make_request('GET', 'projects')
        
        if success:
            projects_count = len(result) if isinstance(result, list) else 0
            self.log_test("CRITICAL: Project Retrieval", True, 
                        f"- Retrieved {projects_count} projects without Pydantic errors")
            
            # Test individual project retrieval
            if projects_count > 0:
                project_id = result[0].get('id')
                if project_id:
                    success, project = self.make_request('GET', f'projects/{project_id}')
                    if success:
                        # Check project_metadata format
                        metadata = project.get('project_metadata', {})
                        is_dict = isinstance(metadata, dict)
                        self.log_test("Project Metadata Format", is_dict, 
                                    f"- project_metadata is {'dict' if is_dict else type(metadata).__name__}")
                        return True
                    else:
                        self.log_test("CRITICAL: Individual Project Retrieval", False, f"- {project}")
                        return False
            return True
        else:
            self.log_test("CRITICAL: Project Retrieval", False, f"- {result}")
            return False

    def test_invoice_retrieval(self):
        """Test 3: Verify invoices can be retrieved without errors"""
        print("\n🧾 Testing Invoice Retrieval...")
        
        success, result = self.make_request('GET', 'invoices')
        
        if success:
            invoices_count = len(result) if isinstance(result, list) else 0
            self.log_test("Invoice Retrieval", True, 
                        f"- Retrieved {invoices_count} invoices without errors")
            return result if invoices_count > 0 else []
        else:
            self.log_test("CRITICAL: Invoice Retrieval", False, f"- {result}")
            return []

    def test_pdf_generation(self, invoices):
        """Test 4: Test PDF generation for existing invoices"""
        print("\n📄 Testing PDF Generation...")
        
        if not invoices:
            self.log_test("PDF Generation", False, "- No invoices available for testing")
            return False
        
        pdf_success_count = 0
        pdf_total_count = 0
        
        # Test PDF generation for first few invoices
        test_invoices = invoices[:3] if len(invoices) > 3 else invoices
        
        for invoice in test_invoices:
            invoice_id = invoice.get('id')
            if not invoice_id:
                continue
                
            pdf_total_count += 1
            
            # Test PDF generation
            success, pdf_data = self.make_request('GET', f'invoices/{invoice_id}/pdf')
            
            if success and isinstance(pdf_data, bytes) and len(pdf_data) > 1000:
                pdf_success_count += 1
                self.log_test(f"PDF Generation - Invoice {invoice_id[:8]}", True, 
                            f"- PDF size: {len(pdf_data)} bytes")
            else:
                self.log_test(f"CRITICAL: PDF Generation - Invoice {invoice_id[:8]}", False, 
                            f"- {pdf_data if not isinstance(pdf_data, bytes) else 'Invalid PDF data'}")
        
        # Overall PDF generation test
        success_rate = (pdf_success_count / pdf_total_count * 100) if pdf_total_count > 0 else 0
        overall_success = success_rate >= 80  # At least 80% success rate
        
        self.log_test("CRITICAL: Overall PDF Generation", overall_success, 
                    f"- Success rate: {success_rate:.1f}% ({pdf_success_count}/{pdf_total_count})")
        
        return overall_success

    def test_create_new_invoice_and_pdf(self):
        """Test 5: Create a new invoice and generate PDF to ensure full workflow works"""
        print("\n🆕 Testing New Invoice Creation and PDF Generation...")
        
        # Get projects and clients first
        success, projects = self.make_request('GET', 'projects')
        if not success or not projects:
            self.log_test("New Invoice Test Setup", False, "- No projects available")
            return False
        
        success, clients = self.make_request('GET', 'clients')
        if not success or not clients:
            self.log_test("New Invoice Test Setup", False, "- No clients available")
            return False
        
        project = projects[0]
        client = clients[0]
        
        # Create a new invoice with proper structure
        invoice_data = {
            "project_id": project['id'],
            "project_name": project['project_name'],
            "client_id": client['id'],
            "client_name": client['name'],
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "test-item-1",
                    "serial_number": "1",
                    "description": "Test PDF Generation Item",
                    "unit": "nos",
                    "quantity": 1,
                    "rate": 10000,
                    "amount": 10000,
                    "gst_rate": 18.0,
                    "gst_amount": 1800,
                    "total_with_gst": 11800
                }
            ],
            "subtotal": 10000,
            "total_gst_amount": 1800,
            "total_amount": 11800,
            "status": "draft",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        # Create invoice
        success, result = self.make_request('POST', 'invoices', invoice_data)
        
        if success and 'invoice_id' in result:
            invoice_id = result['invoice_id']
            self.log_test("New Invoice Creation", True, f"- Invoice ID: {invoice_id}")
            
            # Test PDF generation for new invoice
            success, pdf_data = self.make_request('GET', f'invoices/{invoice_id}/pdf')
            
            if success and isinstance(pdf_data, bytes) and len(pdf_data) > 1000:
                self.log_test("CRITICAL: New Invoice PDF Generation", True, 
                            f"- PDF size: {len(pdf_data)} bytes")
                return True
            else:
                self.log_test("CRITICAL: New Invoice PDF Generation", False, 
                            f"- {pdf_data if not isinstance(pdf_data, bytes) else 'Invalid PDF data'}")
                return False
        else:
            self.log_test("New Invoice Creation", False, f"- {result}")
            return False

    def test_data_format_consistency(self):
        """Test 6: Verify all project_metadata fields are consistently dict format"""
        print("\n🔍 Testing Data Format Consistency...")
        
        success, projects = self.make_request('GET', 'projects')
        
        if not success:
            self.log_test("Data Format Check", False, "- Could not retrieve projects")
            return False
        
        dict_count = 0
        list_count = 0
        other_count = 0
        
        for project in projects:
            metadata = project.get('project_metadata', {})
            if isinstance(metadata, dict):
                dict_count += 1
            elif isinstance(metadata, list):
                list_count += 1
            else:
                other_count += 1
        
        total_projects = len(projects)
        consistency_rate = (dict_count / total_projects * 100) if total_projects > 0 else 100
        
        self.log_test("CRITICAL: Data Format Consistency", list_count == 0, 
                    f"- Dict: {dict_count}, List: {list_count}, Other: {other_count} (Consistency: {consistency_rate:.1f}%)")
        
        return list_count == 0

    def run_all_tests(self):
        """Run all PDF generation fix tests"""
        print("🚨 CRITICAL PDF GENERATION FIX TESTING")
        print("=" * 60)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed - cannot proceed with tests")
            return False
        
        # Run all tests in sequence
        test_results = []
        
        # Test 1: Admin Fix Endpoint
        test_results.append(self.test_admin_fix_endpoint())
        
        # Test 2: Project Retrieval
        test_results.append(self.test_project_retrieval())
        
        # Test 3: Invoice Retrieval
        invoices = self.test_invoice_retrieval()
        test_results.append(len(invoices) >= 0)  # Success if no errors
        
        # Test 4: PDF Generation for existing invoices
        test_results.append(self.test_pdf_generation(invoices))
        
        # Test 5: New invoice creation and PDF generation
        test_results.append(self.test_create_new_invoice_and_pdf())
        
        # Test 6: Data format consistency
        test_results.append(self.test_data_format_consistency())
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if self.critical_issues:
            print(f"\n🚨 CRITICAL ISSUES FOUND ({len(self.critical_issues)}):")
            for issue in self.critical_issues:
                print(f"  - {issue}")
        else:
            print("\n✅ NO CRITICAL ISSUES FOUND")
        
        # Overall result
        critical_tests_passed = all(test_results)
        if critical_tests_passed and not self.critical_issues:
            print("\n🎉 PDF GENERATION FIX VERIFICATION: SUCCESS")
            print("✅ All critical PDF generation issues have been resolved!")
            return True
        else:
            print("\n❌ PDF GENERATION FIX VERIFICATION: FAILED")
            print("🚨 Critical issues still exist that need immediate attention!")
            return False

if __name__ == "__main__":
    tester = PDFGenerationFixTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)