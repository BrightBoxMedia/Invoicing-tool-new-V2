#!/usr/bin/env python3
"""
🚨 USER'S EXACT SCENARIO TEST - FINAL VALIDATION
Tests the EXACT scenario the user reported in their screenshot:
- User showed Bill Qty 07.30 accepted when Remaining was 1.009  
- This should now be COMPLETELY BLOCKED
"""

import requests
import sys
import json
from datetime import datetime

class UserExactScenarioTester:
    def __init__(self):
        self.base_url = "https://billing-maestro.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.critical_failures = []

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
        """Authenticate with the system"""
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

    def create_exact_scenario_project(self):
        """Create project with exact scenario: item with 1.009 remaining"""
        print("\n🏗️ Creating project with EXACT user scenario...")
        
        # Create client first
        client_data = {
            "name": "User Scenario Client",
            "gst_no": "29ABCDE1234F1Z5",
            "bill_to_address": "Test Address, Bangalore, Karnataka - 560001",
            "contact_person": "Test Person",
            "phone": "+91-9876543210",
            "email": "test@userscenario.com"
        }
        
        success, result = self.make_request('POST', 'clients', client_data)
        if not success or 'client_id' not in result:
            self.log_test("Create client", False, f"- {result}", is_critical=True)
            return None, None
        
        client_id = result['client_id']
        self.log_test("Create client", True, f"- Client ID: {client_id}")
        
        # Create project with BOQ item having exactly 1.009 remaining
        project_data = {
            "project_name": "User Exact Scenario Project",
            "architect": "Test Architect",
            "client_id": client_id,
            "client_name": "User Scenario Client",
            "project_metadata": {
                "project_name": "User Exact Scenario Project",
                "architect": "Test Architect",
                "client": "User Scenario Client",
                "location": "Test Location"
            },
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Foundation Work",
                    "unit": "Cum",
                    "quantity": 10.0,  # Total quantity
                    "rate": 5000.0,
                    "amount": 50000.0,
                    "billed_quantity": 8.991,  # Already billed, leaving exactly 1.009 remaining
                    "gst_rate": 18.0
                }
            ],
            "total_project_value": 50000.0,
            "created_by": self.user_data['id'] if self.user_data else "test-user-id"
        }
        
        success, result = self.make_request('POST', 'projects', project_data)
        if not success or 'project_id' not in result:
            self.log_test("Create project", False, f"- {result}", is_critical=True)
            return None, None
        
        project_id = result['project_id']
        
        # Verify the remaining quantity is exactly 1.009
        success, project = self.make_request('GET', f'projects/{project_id}')
        if success and project.get('boq_items'):
            item = project['boq_items'][0]
            total_qty = item.get('quantity', 0)
            billed_qty = item.get('billed_quantity', 0)
            remaining = total_qty - billed_qty
            
            self.log_test("Create project with exact scenario", True, 
                        f"- Project ID: {project_id}")
            self.log_test("Verify remaining quantity", abs(remaining - 1.009) < 0.001, 
                        f"- Total: {total_qty}, Billed: {billed_qty}, Remaining: {remaining}")
        
        return project_id, client_id

    def test_exact_user_scenario_regular_endpoint(self, project_id, client_id):
        """Test EXACT user scenario on regular invoice endpoint"""
        print("\n🚨 TESTING EXACT USER SCENARIO - Regular Invoice Endpoint")
        print("   Scenario: Bill Qty 07.30 when Remaining is 1.009")
        print("   REQUIREMENT: MUST BE BLOCKED!")
        
        invoice_data = {
            "project_id": project_id,
            "project_name": "User Exact Scenario Project",
            "client_id": client_id,
            "client_name": "User Scenario Client",
            "invoice_type": "tax_invoice",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - First Invoice",  # Variation like user might have
                    "unit": "Cum",
                    "quantity": 7.30,  # EXACT USER SCENARIO - EXCEEDS 1.009
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
        
        # This MUST be blocked (expect 400 error)
        success, result = self.make_request('POST', 'invoices', invoice_data, expected_status=400)
        
        if success:
            self.log_test("Regular Invoice - User Scenario BLOCKED", True, 
                        "- ✅ CORRECTLY BLOCKED: 7.30 > 1.009 rejected", is_critical=False)
        else:
            # Check if it was allowed (200 status) - CRITICAL FAILURE
            success_allowed, result_allowed = self.make_request('POST', 'invoices', invoice_data, expected_status=200)
            if success_allowed:
                invoice_id = result_allowed.get('invoice_id', 'Unknown')
                self.log_test("Regular Invoice - User Scenario BLOCKED", False, 
                            f"- 🚨 CRITICAL FAILURE: Invoice {invoice_id} CREATED with 7.30 > 1.009!", is_critical=True)
            else:
                self.log_test("Regular Invoice - User Scenario BLOCKED", False, 
                            f"- Unexpected error: {result}", is_critical=True)

    def test_exact_user_scenario_enhanced_endpoint(self, project_id, client_id):
        """Test EXACT user scenario on enhanced invoice endpoint"""
        print("\n🚨 TESTING EXACT USER SCENARIO - Enhanced Invoice Endpoint")
        
        invoice_data = {
            "project_id": project_id,
            "project_name": "User Exact Scenario Project",
            "client_id": client_id,
            "client_name": "User Scenario Client",
            "invoice_type": "tax_invoice",
            "invoice_gst_type": "CGST_SGST",
            "created_by": self.user_data['id'] if self.user_data else "test-user-id",
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work - Enhanced Test",
                    "unit": "Cum",
                    "quantity": 7.30,  # EXACT USER SCENARIO
                    "rate": 5000.0,
                    "amount": 36500.0
                }
            ],
            "subtotal": 36500.0,
            "total_amount": 43070.0
        }
        
        # This MUST be blocked (expect 400 error)
        success, result = self.make_request('POST', 'invoices/enhanced', invoice_data, expected_status=400)
        
        if success:
            self.log_test("Enhanced Invoice - User Scenario BLOCKED", True, 
                        "- ✅ CORRECTLY BLOCKED: 7.30 > 1.009 rejected", is_critical=False)
        else:
            # Check if it was allowed (200 status) - CRITICAL FAILURE
            success_allowed, result_allowed = self.make_request('POST', 'invoices/enhanced', invoice_data, expected_status=200)
            if success_allowed:
                invoice_id = result_allowed.get('invoice_id', 'Unknown')
                self.log_test("Enhanced Invoice - User Scenario BLOCKED", False, 
                            f"- 🚨 CRITICAL FAILURE: Enhanced invoice {invoice_id} CREATED with 7.30 > 1.009!", is_critical=True)
            else:
                self.log_test("Enhanced Invoice - User Scenario BLOCKED", False, 
                            f"- Unexpected error: {result}", is_critical=True)

    def test_validation_endpoint_user_scenario(self, project_id):
        """Test validation endpoint with user scenario"""
        print("\n🔍 TESTING Validation Endpoint - User Scenario")
        
        validation_data = {
            "project_id": project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "quantity": 7.30,
                    "description": "Foundation Work"
                }
            ]
        }
        
        success, result = self.make_request('POST', 'invoices/validate-quantities', validation_data)
        
        if success:
            is_valid = result.get('valid', True)
            errors = result.get('errors', [])
            warnings = result.get('warnings', [])
            
            if not is_valid:
                self.log_test("Validation Endpoint - User Scenario", True, 
                            f"- ✅ CORRECTLY INVALID: Errors: {len(errors)}, Warnings: {len(warnings)}", is_critical=False)
            else:
                self.log_test("Validation Endpoint - User Scenario", False, 
                            f"- 🚨 VALIDATION BUG: Says 7.30 > 1.009 is VALID!", is_critical=True)
        else:
            self.log_test("Validation Endpoint - User Scenario", False, 
                        f"- Validation failed: {result}", is_critical=True)

    def test_description_matching_variations(self, project_id):
        """Test different description variations that might cause matching issues"""
        print("\n🔤 TESTING Description Matching Variations")
        
        test_cases = [
            ("Foundation Work", "Exact match"),
            ("Foundation Work - First Invoice", "With suffix (user's likely scenario)"),
            ("Foundation Work - Phase 1", "Different suffix"),
            ("foundation work", "Case variation"),
            ("Foundation  Work", "Extra spaces"),
        ]
        
        for description, case_name in test_cases:
            validation_data = {
                "project_id": project_id,
                "invoice_items": [
                    {
                        "boq_item_id": "1",
                        "quantity": 7.30,  # Over-quantity
                        "description": description
                    }
                ]
            }
            
            success, result = self.make_request('POST', 'invoices/validate-quantities', validation_data)
            
            if success:
                is_valid = result.get('valid', True)
                if not is_valid:
                    self.log_test(f"Description Match: {case_name}", True, 
                                f"- ✅ Correctly identified over-quantity for '{description}'")
                else:
                    self.log_test(f"Description Match: {case_name}", False, 
                                f"- 🚨 Failed to match '{description}' - validation says VALID!", is_critical=True)
            else:
                self.log_test(f"Description Match: {case_name}", False, 
                            f"- Validation failed for '{description}': {result}")

    def test_edge_cases_around_limit(self, project_id, client_id):
        """Test edge cases around the 1.009 limit"""
        print("\n⚖️ TESTING Edge Cases Around 1.009 Limit")
        
        edge_cases = [
            (1.009, "Exact limit", "Should be allowed"),
            (1.010, "Just over limit", "Should be blocked"),
            (1.008, "Just under limit", "Should be allowed"),
            (2.000, "Double the limit", "Should be blocked"),
            (0.500, "Half the limit", "Should be allowed"),
        ]
        
        for quantity, case_name, expectation in edge_cases:
            print(f"\n   Testing: {case_name} (Qty: {quantity}) - {expectation}")
            
            invoice_data = {
                "project_id": project_id,
                "project_name": "User Exact Scenario Project",
                "client_id": client_id,
                "client_name": "User Scenario Client",
                "invoice_type": "proforma",  # Use proforma to avoid RA complications
                "items": [
                    {
                        "boq_item_id": "1",
                        "serial_number": "1",
                        "description": f"Foundation Work - Edge Case {quantity}",
                        "unit": "Cum",
                        "quantity": quantity,
                        "rate": 5000.0,
                        "amount": quantity * 5000.0,
                        "gst_rate": 18.0,
                        "gst_amount": quantity * 5000.0 * 0.18,
                        "total_with_gst": quantity * 5000.0 * 1.18
                    }
                ],
                "subtotal": quantity * 5000.0,
                "total_gst_amount": quantity * 5000.0 * 0.18,
                "total_amount": quantity * 5000.0 * 1.18,
                "status": "draft",
                "created_by": self.user_data['id'] if self.user_data else "test-user-id"
            }
            
            should_be_blocked = quantity > 1.009
            expected_status = 400 if should_be_blocked else 200
            
            success, result = self.make_request('POST', 'invoices', invoice_data, expected_status=expected_status)
            
            if success:
                if should_be_blocked:
                    self.log_test(f"Edge Case: {case_name}", True, 
                                f"- ✅ Correctly blocked quantity {quantity}")
                else:
                    invoice_id = result.get('invoice_id', 'Unknown')
                    self.log_test(f"Edge Case: {case_name}", True, 
                                f"- ✅ Correctly allowed quantity {quantity}, Invoice: {invoice_id}")
            else:
                if should_be_blocked:
                    # Check if it was unexpectedly allowed
                    success_allowed, result_allowed = self.make_request('POST', 'invoices', invoice_data, expected_status=200)
                    if success_allowed:
                        self.log_test(f"Edge Case: {case_name}", False, 
                                    f"- 🚨 Should be blocked but was allowed: {quantity}", is_critical=True)
                    else:
                        self.log_test(f"Edge Case: {case_name}", False, 
                                    f"- Unexpected error: {result}")
                else:
                    self.log_test(f"Edge Case: {case_name}", False, 
                                f"- Should be allowed but was blocked: {quantity}")

    def run_user_exact_scenario_tests(self):
        """Run all tests for user's exact scenario"""
        print("🚨 USER'S EXACT SCENARIO TEST - FINAL VALIDATION")
        print("=" * 80)
        print("CRITICAL REQUIREMENT: Bill Qty 07.30 when Remaining is 1.009 MUST BE BLOCKED!")
        print("User reported this was previously accepted - testing if now blocked.")
        print("=" * 80)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("\n❌ CRITICAL FAILURE: Cannot authenticate")
            return False
        
        # Step 2: Create exact scenario
        project_id, client_id = self.create_exact_scenario_project()
        if not project_id or not client_id:
            print("\n❌ CRITICAL FAILURE: Cannot create test scenario")
            return False
        
        # Step 3: Test exact user scenario
        self.test_exact_user_scenario_regular_endpoint(project_id, client_id)
        self.test_exact_user_scenario_enhanced_endpoint(project_id, client_id)
        self.test_validation_endpoint_user_scenario(project_id)
        
        # Step 4: Test variations and edge cases
        self.test_description_matching_variations(project_id)
        self.test_edge_cases_around_limit(project_id, client_id)
        
        # Step 5: Report results
        self.report_final_results()
        
        return len(self.critical_failures) == 0

    def report_final_results(self):
        """Report final test results"""
        print("\n" + "=" * 80)
        print("🚨 USER'S EXACT SCENARIO TEST RESULTS")
        print("=" * 80)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"📊 OVERALL RESULTS:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        if self.critical_failures:
            print(f"\n🚨 CRITICAL FAILURES ({len(self.critical_failures)}):")
            for i, failure in enumerate(self.critical_failures, 1):
                print(f"   {i}. {failure}")
            
            print(f"\n❌ FINAL RESULT: USER'S ISSUE NOT FULLY RESOLVED!")
            print(f"   The exact scenario (Bill Qty 7.30 vs Remaining 1.009) may still be vulnerable.")
            print(f"   IMMEDIATE MAIN AGENT ACTION REQUIRED!")
        else:
            print(f"\n✅ FINAL RESULT: USER'S EXACT SCENARIO COMPLETELY RESOLVED!")
            print(f"   Bill Qty 7.30 vs Remaining 1.009 is now properly blocked.")
            print(f"   All quantity validation security measures are working correctly.")
            print(f"   User's critical business logic failure has been fixed.")
        
        print("=" * 80)

if __name__ == "__main__":
    tester = UserExactScenarioTester()
    success = tester.run_user_exact_scenario_tests()
    sys.exit(0 if success else 1)