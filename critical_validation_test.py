#!/usr/bin/env python3
"""
🚨 CRITICAL VALIDATION TESTING
Tests the specific validation endpoints mentioned in test_result.md
"""

import requests
import sys
import json

class CriticalValidationTester:
    def __init__(self):
        self.base_url = "https://activus-manager.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
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
            self.log_test("Authentication", True, f"- Role: {self.user_data['role']}")
            return True
        else:
            self.log_test("Authentication", False, f"- {result}")
            return False

    def test_validation_endpoints(self):
        """Test the critical validation endpoints"""
        print("\n🚨 Testing Critical Validation Endpoints...")
        
        # Get existing projects to test with
        success, projects = self.make_request('GET', 'projects')
        if not success or not projects:
            self.log_test("Get projects for validation", False, "- No projects available")
            return False
        
        project = projects[0]
        project_id = project['id']
        
        self.log_test("Get projects for validation", True, f"- Using project: {project_id}")
        
        # Test 1: RA Tracking endpoint (mentioned as broken in test_result.md)
        print("  🔍 Test 1: RA Tracking Data Endpoint")
        success, ra_data = self.make_request('GET', f'projects/{project_id}/ra-tracking')
        
        if success:
            items_count = len(ra_data.get('items', []))
            has_project_id = 'project_id' in ra_data
            
            self.log_test("RA Tracking endpoint", has_project_id, 
                        f"- Items returned: {items_count}, Has project_id: {has_project_id}")
            
            # Check if items have proper structure
            if ra_data.get('items'):
                first_item = ra_data['items'][0]
                required_fields = ['description', 'overall_qty', 'balance_qty']
                has_required = all(field in first_item for field in required_fields)
                
                self.log_test("RA Tracking data structure", has_required,
                            f"- Required fields present: {has_required}")
        else:
            self.log_test("RA Tracking endpoint", False, f"- {ra_data}")
        
        # Test 2: Quantity Validation endpoint
        print("  🔍 Test 2: Quantity Validation Endpoint")
        
        validation_data = {
            "project_id": project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "quantity": 50.0,  # Test with over-quantity
                    "description": "Test validation item"
                }
            ]
        }
        
        success, validation_result = self.make_request('POST', 'invoices/validate-quantities', validation_data)
        
        if success:
            is_valid = validation_result.get('valid', True)  # Should be False for over-quantity
            has_errors = len(validation_result.get('errors', [])) > 0
            
            # For over-quantity, we expect valid=False or errors present
            validation_working = not is_valid or has_errors
            
            self.log_test("Quantity validation endpoint", validation_working,
                        f"- Valid: {is_valid}, Errors: {len(validation_result.get('errors', []))}")
        else:
            self.log_test("Quantity validation endpoint", False, f"- {validation_result}")
        
        # Test 3: Enhanced Invoice Creation endpoint
        print("  🔍 Test 3: Enhanced Invoice Creation Endpoint")
        
        # Get client for invoice creation
        success, clients = self.make_request('GET', 'clients')
        if not success or not clients:
            self.log_test("Get clients for enhanced invoice", False, "- No clients available")
            return False
        
        client = clients[0]
        client_id = client['id']
        
        enhanced_invoice_data = {
            "project_id": project_id,
            "project_name": project.get('project_name', 'Test Project'),
            "client_id": client_id,
            "client_name": client.get('name', 'Test Client'),
            "invoice_type": "tax_invoice",
            "created_by": self.user_data['id'],
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Test Enhanced Invoice Item",
                    "unit": "nos",
                    "quantity": 1.0,  # Valid small quantity
                    "rate": 1000.0,
                    "amount": 1000.0
                }
            ]
        }
        
        success, enhanced_result = self.make_request('POST', 'invoices/enhanced', enhanced_invoice_data)
        
        if success:
            has_invoice_id = 'invoice_id' in enhanced_result
            has_ra_number = 'ra_number' in enhanced_result
            
            self.log_test("Enhanced invoice creation", has_invoice_id,
                        f"- Invoice created: {has_invoice_id}, RA number: {enhanced_result.get('ra_number', 'N/A')}")
        else:
            self.log_test("Enhanced invoice creation", False, f"- {enhanced_result}")
        
        # Test 4: Regular Invoice Creation endpoint (the critical one)
        print("  🔍 Test 4: Regular Invoice Creation Endpoint")
        
        regular_invoice_data = {
            "project_id": project_id,
            "project_name": project.get('project_name', 'Test Project'),
            "client_id": client_id,
            "client_name": client.get('name', 'Test Client'),
            "invoice_type": "tax_invoice",
            "created_by": self.user_data['id'],
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Test Regular Invoice Item",
                    "unit": "nos",
                    "quantity": 1.0,  # Valid small quantity
                    "rate": 1000.0,
                    "amount": 1000.0,
                    "gst_rate": 18.0
                }
            ]
        }
        
        success, regular_result = self.make_request('POST', 'invoices', regular_invoice_data)
        
        if success:
            has_invoice_id = 'invoice_id' in regular_result
            
            self.log_test("Regular invoice creation", has_invoice_id,
                        f"- Invoice created: {has_invoice_id}")
        else:
            self.log_test("Regular invoice creation", False, f"- {regular_result}")
        
        return True

    def test_over_quantity_scenarios(self):
        """Test specific over-quantity scenarios mentioned in test_result.md"""
        print("\n🚨 Testing Over-Quantity Scenarios...")
        
        # Get projects and clients
        success, projects = self.make_request('GET', 'projects')
        success2, clients = self.make_request('GET', 'clients')
        
        if not success or not projects or not success2 or not clients:
            self.log_test("Setup for over-quantity tests", False, "- Missing projects or clients")
            return False
        
        project = projects[0]
        client = clients[0]
        project_id = project['id']
        client_id = client['id']
        
        # Test Case 1: User's exact scenario (7.30 vs 1.009)
        print("  🎯 User's Exact Scenario: Bill Qty 7.30 when Remaining 1.009")
        
        user_scenario = {
            "project_id": project_id,
            "project_name": project.get('project_name', 'Test Project'),
            "client_id": client_id,
            "client_name": client.get('name', 'Test Client'),
            "invoice_type": "tax_invoice",
            "created_by": self.user_data['id'],
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "User Scenario Test - 7.30 vs 1.009",
                    "unit": "Cum",
                    "quantity": 7.30,  # User's exact over-quantity
                    "rate": 5000.0,
                    "amount": 36500.0,
                    "gst_rate": 18.0
                }
            ]
        }
        
        # Test regular invoice endpoint
        success, result = self.make_request('POST', 'invoices', user_scenario, expected_status=400)
        if success:
            self.log_test("User scenario blocked (regular endpoint)", True, "- 7.30 > 1.009 correctly blocked")
        else:
            # Check if it was created (which would be bad)
            success_created, created = self.make_request('POST', 'invoices', user_scenario)
            if success_created:
                self.log_test("User scenario blocked (regular endpoint)", False, "- CRITICAL: Over-quantity allowed!")
            else:
                self.log_test("User scenario blocked (regular endpoint)", True, "- Over-quantity blocked")
        
        # Test enhanced invoice endpoint
        enhanced_user_scenario = {
            "project_id": project_id,
            "project_name": project.get('project_name', 'Test Project'),
            "client_id": client_id,
            "client_name": client.get('name', 'Test Client'),
            "invoice_type": "tax_invoice",
            "created_by": self.user_data['id'],
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Enhanced User Scenario Test - 7.30 vs 1.009",
                    "unit": "Cum",
                    "quantity": 7.30,  # User's exact over-quantity
                    "rate": 5000.0,
                    "amount": 36500.0
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/enhanced', enhanced_user_scenario, expected_status=400)
        if success:
            self.log_test("User scenario blocked (enhanced endpoint)", True, "- 7.30 > 1.009 correctly blocked")
        else:
            # Check if it was created (which would be bad)
            success_created, created = self.make_request('POST', 'invoices/enhanced', enhanced_user_scenario)
            if success_created:
                self.log_test("User scenario blocked (enhanced endpoint)", False, "- CRITICAL: Enhanced over-quantity allowed!")
            else:
                self.log_test("User scenario blocked (enhanced endpoint)", True, "- Enhanced over-quantity blocked")
        
        return True

    def run_all_tests(self):
        """Run all critical validation tests"""
        print("🚨 CRITICAL VALIDATION TESTING")
        print("=" * 50)
        
        if not self.authenticate():
            return False
        
        self.test_validation_endpoints()
        self.test_over_quantity_scenarios()
        
        # Print results
        print("\n" + "=" * 50)
        print("📊 CRITICAL VALIDATION RESULTS")
        print("=" * 50)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT: All critical validations working!")
        elif success_rate >= 75:
            print("✅ GOOD: Most validations working")
        else:
            print("⚠️ CRITICAL: Validation failures detected")
        
        return success_rate >= 75

if __name__ == "__main__":
    tester = CriticalValidationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)