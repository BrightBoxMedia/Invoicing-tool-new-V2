#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Activus Invoice Management System
Tests all API endpoints with proper authentication and data flow
"""

import requests
import sys
import json
import io
import os
from datetime import datetime
from pathlib import Path

class ActivusAPITester:
    def __init__(self, base_url="https://8aea94e1-2e18-444c-b499-642bffd4fba3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
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

    def test_authentication(self):
        """Test login functionality"""
        print("\n🔐 Testing Authentication...")
        
        # Test invalid login (should return 401, not 200)
        success, result = self.make_request('POST', 'auth/login', 
                                          {'email': 'invalid@test.com', 'password': 'wrong'}, 
                                          expected_status=401)
        self.log_test("Invalid login rejection", not success, "- Correctly rejected invalid credentials")
        
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

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n📊 Testing Dashboard Stats...")
        
        success, result = self.make_request('GET', 'dashboard/stats')
        
        if success:
            required_fields = ['total_projects', 'total_invoices', 'total_invoiced_value', 'advance_received', 'pending_payment']
            has_all_fields = all(field in result for field in required_fields)
            self.log_test("Dashboard stats structure", has_all_fields, f"- Fields: {list(result.keys())}")
            self.log_test("Dashboard stats values", True, f"- Projects: {result.get('total_projects', 0)}, Invoices: {result.get('total_invoices', 0)}")
            return True
        else:
            self.log_test("Dashboard stats", False, f"- {result}")
            return False

    def test_client_management(self):
        """Test client CRUD operations"""
        print("\n👥 Testing Client Management...")
        
        # Test getting clients (initially empty)
        success, result = self.make_request('GET', 'clients')
        self.log_test("Get clients list", success, f"- Found {len(result) if success else 0} clients")
        
        # Test creating a client
        client_data = {
            "name": "Test Client Ltd",
            "gst_no": "27ABCDE1234F1Z5",
            "bill_to_address": "123 Test Street, Test City, Test State - 123456",
            "ship_to_address": "456 Ship Street, Ship City, Ship State - 654321",
            "contact_person": "John Doe",
            "phone": "+91-9876543210",
            "email": "john@testclient.com"
        }
        
        success, result = self.make_request('POST', 'clients', client_data, expected_status=200)
        
        if success and 'client_id' in result:
            client_id = result['client_id']
            self.created_resources['clients'].append(client_id)
            self.log_test("Create client", True, f"- Client ID: {client_id}")
            
            # Verify client was created by fetching list again
            success, clients = self.make_request('GET', 'clients')
            if success:
                created_client = next((c for c in clients if c['id'] == client_id), None)
                self.log_test("Verify client creation", created_client is not None, 
                            f"- Client found in list: {created_client['name'] if created_client else 'Not found'}")
                return True
        else:
            self.log_test("Create client", False, f"- {result}")
            return False

    def create_sample_excel_boq(self):
        """Create a sample Excel BOQ file for testing"""
        try:
            import openpyxl
            from openpyxl import Workbook
            
            wb = Workbook()
            ws = wb.active
            ws.title = "BOQ"
            
            # Add project metadata
            ws['A1'] = 'Project Name:'
            ws['B1'] = 'Test Construction Project'
            ws['A2'] = 'Client:'
            ws['B2'] = 'Test Client Ltd'
            ws['A3'] = 'Architect:'
            ws['B3'] = 'Test Architect'
            ws['A4'] = 'Location:'
            ws['B4'] = 'Test Location'
            
            # Add BOQ headers
            headers = ['S.No', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount']
            for col, header in enumerate(headers, 1):
                ws.cell(row=6, column=col, value=header)
            
            # Add sample BOQ items
            boq_items = [
                [1, 'Excavation for foundation', 'Cum', 100, 150, 15000],
                [2, 'Concrete M20 for foundation', 'Cum', 50, 4500, 225000],
                [3, 'Steel reinforcement', 'Kg', 2000, 65, 130000],
                [4, 'Brick masonry', 'Cum', 200, 3500, 700000],
                [5, 'Plastering internal', 'Sqm', 500, 180, 90000]
            ]
            
            for row, item in enumerate(boq_items, 7):
                for col, value in enumerate(item, 1):
                    ws.cell(row=row, column=col, value=value)
            
            # Save to bytes
            excel_buffer = io.BytesIO()
            wb.save(excel_buffer)
            excel_buffer.seek(0)
            return excel_buffer.getvalue()
            
        except ImportError:
            print("⚠️  openpyxl not available, creating minimal Excel data")
            # Return minimal Excel-like data for testing
            return b"Sample Excel BOQ data"

    def test_boq_upload(self):
        """Test BOQ Excel file upload and parsing"""
        print("\n📄 Testing BOQ Upload...")
        
        excel_data = self.create_sample_excel_boq()
        
        files = {'file': ('test_boq.xlsx', excel_data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        
        success, result = self.make_request('POST', 'upload-boq', files=files)
        
        if success:
            required_fields = ['metadata', 'items', 'total_value', 'filename']
            has_all_fields = all(field in result for field in required_fields)
            self.log_test("BOQ upload structure", has_all_fields, f"- Fields: {list(result.keys())}")
            
            if 'items' in result:
                self.log_test("BOQ items parsed", len(result['items']) > 0, 
                            f"- Found {len(result['items'])} items, Total: ₹{result.get('total_value', 0)}")
                return result
        else:
            self.log_test("BOQ upload", False, f"- {result}")
            return None

    def test_project_management(self, boq_data=None):
        """Test project creation and management"""
        print("\n🏗️ Testing Project Management...")
        
        # Get initial projects list
        success, result = self.make_request('GET', 'projects')
        initial_count = len(result) if success else 0
        self.log_test("Get projects list", success, f"- Found {initial_count} projects")
        
        # Create a project
        if not self.created_resources['clients']:
            print("⚠️  No clients available, creating one first...")
            self.test_client_management()
        
        client_id = self.created_resources['clients'][0] if self.created_resources['clients'] else "test-client-id"
        
        project_data = {
            "project_name": "Test Construction Project",
            "architect": "Test Architect",
            "client_id": client_id,
            "client_name": "Test Client Ltd",
            "metadata": {
                "project_name": "Test Construction Project",
                "architect": "Test Architect",
                "client": "Test Client Ltd",
                "location": "Test Location"
            },
            "boq_items": boq_data['items'] if boq_data else [
                {
                    "serial_number": "1",
                    "description": "Test Item",
                    "unit": "nos",
                    "quantity": 10,
                    "rate": 1000,
                    "amount": 10000
                }
            ],
            "total_project_value": boq_data['total_value'] if boq_data else 10000,
            "advance_received": 0,
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'projects', project_data)
        
        if success and 'project_id' in result:
            project_id = result['project_id']
            self.created_resources['projects'].append(project_id)
            self.log_test("Create project", True, f"- Project ID: {project_id}")
            
            # Test getting specific project
            success, project = self.make_request('GET', f'projects/{project_id}')
            self.log_test("Get specific project", success, 
                        f"- Project: {project.get('project_name', 'Unknown') if success else 'Failed'}")
            
            return project_id
        else:
            self.log_test("Create project", False, f"- {result}")
            return None

    def test_invoice_management(self):
        """Test invoice creation and PDF generation"""
        print("\n🧾 Testing Invoice Management...")
        
        # Get initial invoices
        success, result = self.make_request('GET', 'invoices')
        initial_count = len(result) if success else 0
        self.log_test("Get invoices list", success, f"- Found {initial_count} invoices")
        
        # Create invoice (need project first)
        if not self.created_resources['projects']:
            print("⚠️  No projects available, creating one first...")
            self.test_project_management()
        
        if not self.created_resources['projects']:
            self.log_test("Invoice creation", False, "- No projects available")
            return False
        
        project_id = self.created_resources['projects'][0]
        client_id = self.created_resources['clients'][0] if self.created_resources['clients'] else "test-client-id"
        
        invoice_data = {
            "project_id": project_id,
            "project_name": "Test Construction Project",
            "client_id": client_id,
            "client_name": "Test Client Ltd",
            "invoice_type": "proforma",
            "items": [
                {
                    "serial_number": "1",
                    "description": "Test Invoice Item",
                    "unit": "nos",
                    "quantity": 5,
                    "rate": 2000,
                    "amount": 10000
                }
            ],
            "subtotal": 10000,
            "gst_amount": 1800,
            "total_amount": 11800,
            "status": "draft",
            "invoice_number": "TEST-INV-001",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'invoices', invoice_data)
        
        if success and 'invoice_id' in result:
            invoice_id = result['invoice_id']
            self.created_resources['invoices'].append(invoice_id)
            self.log_test("Create invoice", True, f"- Invoice ID: {invoice_id}")
            
            # Test PDF generation
            success, pdf_data = self.make_request('GET', f'invoices/{invoice_id}/pdf', expected_status=200)
            if success:
                self.log_test("Generate invoice PDF", True, f"- PDF size: {len(pdf_data) if isinstance(pdf_data, bytes) else 'Unknown'} bytes")
            else:
                self.log_test("Generate invoice PDF", False, f"- {pdf_data}")
            
            return True
        else:
            self.log_test("Create invoice", False, f"- {result}")
            return False

    def test_activity_logs(self):
        """Test activity logs (super admin only)"""
        print("\n📝 Testing Activity Logs...")
        
        if not self.user_data or self.user_data.get('role') != 'super_admin':
            self.log_test("Activity logs access", False, "- Not super admin")
            return False
        
        success, result = self.make_request('GET', 'activity-logs')
        
        if success:
            self.log_test("Get activity logs", True, f"- Found {len(result)} log entries")
            
            # Check log structure
            if result:
                log_entry = result[0]
                required_fields = ['user_email', 'action', 'description', 'timestamp']
                has_required = all(field in log_entry for field in required_fields)
                self.log_test("Activity log structure", has_required, 
                            f"- Sample action: {log_entry.get('action', 'Unknown')}")
            return True
        else:
            self.log_test("Get activity logs", False, f"- {result}")
            return False

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n⚠️ Testing Error Handling...")
        
        # Test unauthorized access (without token)
        old_token = self.token
        self.token = None
        
        success, result = self.make_request('GET', 'projects', expected_status=401)
        self.log_test("Unauthorized access rejection", not success, "- Correctly rejected request without token")
        
        # Restore token
        self.token = old_token
        
        # Test invalid project ID
        success, result = self.make_request('GET', 'projects/invalid-id', expected_status=404)
        self.log_test("Invalid project ID handling", not success, "- Correctly returned 404 for invalid ID")
        
        # Test invalid file upload
        files = {'file': ('test.txt', b'not an excel file', 'text/plain')}
        success, result = self.make_request('POST', 'upload-boq', files=files, expected_status=400)
        self.log_test("Invalid file type rejection", not success, "- Correctly rejected non-Excel file")

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Activus Invoice Management System API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 80)
        
        # Test authentication first
        if not self.test_authentication():
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Test all endpoints
        self.test_dashboard_stats()
        self.test_client_management()
        
        # Test BOQ upload and project creation
        boq_data = self.test_boq_upload()
        self.test_project_management(boq_data)
        
        # Test invoice management
        self.test_invoice_management()
        
        # Test activity logs
        self.test_activity_logs()
        
        # Test error handling
        self.test_error_handling()
        
        # Print summary
        print("\n" + "=" * 80)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.created_resources['clients']:
            print(f"👥 Created {len(self.created_resources['clients'])} clients")
        if self.created_resources['projects']:
            print(f"🏗️ Created {len(self.created_resources['projects'])} projects")
        if self.created_resources['invoices']:
            print(f"🧾 Created {len(self.created_resources['invoices'])} invoices")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"✅ Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = ActivusAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⏹️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())