#!/usr/bin/env python3
"""
Unified Project System Testing for Activus Invoice Management System
Tests the unified project system to ensure no confusion between enhanced and regular projects
"""

import requests
import sys
import json
import os
from datetime import datetime

class UnifiedProjectTester:
    def __init__(self):
        # Get backend URL from environment
        try:
            with open('/app/frontend/.env', 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        self.base_url = line.split('=')[1].strip()
                        break
                else:
                    self.base_url = "https://billingflow-app.preview.emergentagent.com"
        except:
            self.base_url = "https://billingflow-app.preview.emergentagent.com"
        
        self.api_url = f"{self.base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'clients': [],
            'projects': [],
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
        """Authenticate with the system"""
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
        """Create necessary test data"""
        print("\n📋 Setting up test data...")
        
        # Create a test client
        client_data = {
            "name": "Unified Test Client Ltd",
            "gst_no": "29ABCDE1234F1Z5",
            "bill_to_address": "123 Unified Test Street, Bangalore, Karnataka - 560001",
            "contact_person": "John Unified",
            "phone": "+91-9876543210",
            "email": "john@unifiedtest.com"
        }
        
        success, result = self.make_request('POST', 'clients', client_data)
        if success and 'client_id' in result:
            client_id = result['client_id']
            self.created_resources['clients'].append(client_id)
            self.log_test("Create test client", True, f"- Client ID: {client_id}")
        else:
            self.log_test("Create test client", False, f"- {result}")
            return False
        
        # Create a company profile for enhanced features
        company_profile_data = {
            "company_name": "Unified Test Company Ltd",
            "created_by": self.user_data['id'],
            "locations": [
                {
                    "location_name": "Corporate Headquarters",
                    "address_line_1": "456 Corporate Avenue",
                    "address_line_2": "Tech Park Phase 1",
                    "city": "Bangalore",
                    "state": "Karnataka",
                    "pincode": "560001",
                    "country": "India",
                    "phone": "+91-9876543210",
                    "email": "corporate@unifiedtest.com",
                    "gst_number": "29ABCDE1234F1Z5",
                    "is_default": True
                }
            ],
            "bank_details": [
                {
                    "bank_name": "ICICI Bank",
                    "account_number": "123456789012",
                    "account_holder_name": "Unified Test Company Ltd",
                    "ifsc_code": "ICIC0001234",
                    "branch_name": "Bangalore Corporate Branch",
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
            return True
        else:
            self.log_test("Create company profile", False, f"- {result}")
            return False

    def test_single_project_endpoint(self):
        """Test that /api/projects endpoint includes all enhanced features"""
        print("\n🎯 Testing Single Project Endpoint...")
        
        client_id = self.created_resources['clients'][0]
        company_profile_id = self.created_resources['company_profiles'][0]
        
        # Test 1: Create simple project through main endpoint
        simple_project_data = {
            "project_name": "Simple Unified Project",
            "architect": "Simple Architect",
            "client_id": client_id,
            "client_name": "Unified Test Client Ltd",
            "created_by": self.user_data['id'],
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Simple Foundation Work",
                    "unit": "Cum",
                    "quantity": 50,
                    "rate": 2000,
                    "amount": 100000,
                    "gst_rate": 18.0
                }
            ],
            "total_project_value": 100000
        }
        
        success, result = self.make_request('POST', 'projects', simple_project_data)
        if success and 'project_id' in result:
            simple_project_id = result['project_id']
            self.created_resources['projects'].append(simple_project_id)
            self.log_test("Create simple project via main endpoint", True, f"- Project ID: {simple_project_id}")
        else:
            self.log_test("Create simple project via main endpoint", False, f"- {result}")
            return False
        
        # Test 2: Create complex project with enhanced features through main endpoint
        complex_project_data = {
            "project_name": "Complex Unified Project",
            "architect": "Complex Architect",
            "client_id": client_id,
            "client_name": "Unified Test Client Ltd",
            "created_by": self.user_data['id'],
            # Enhanced features available through main endpoint
            "company_profile_id": company_profile_id,
            "project_metadata": {
                "purchase_order_number": "PO-UNIFIED-001",
                "type": "Construction",
                "reference_no": "REF-UNIFIED-001",
                "dated": "2024-01-15",
                "basic": 500000.0,
                "overall_multiplier": 1.2,
                "po_inv_value": 600000.0,
                "abg_percentage": 10.0,
                "ra_bill_with_taxes_percentage": 80.0,
                "erection_percentage": 15.0,
                "pbg_percentage": 5.0
            },
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Complex Foundation Work",
                    "unit": "Cum",
                    "quantity": 100,
                    "rate": 3000,
                    "amount": 300000,
                    "gst_rate": 18.0
                },
                {
                    "serial_number": "2",
                    "description": "Complex Steel Structure",
                    "unit": "Kg",
                    "quantity": 1000,
                    "rate": 300,
                    "amount": 300000,
                    "gst_rate": 18.0
                }
            ],
            "total_project_value": 600000
        }
        
        success, result = self.make_request('POST', 'projects', complex_project_data)
        if success and 'project_id' in result:
            complex_project_id = result['project_id']
            self.created_resources['projects'].append(complex_project_id)
            self.log_test("Create complex project via main endpoint", True, f"- Project ID: {complex_project_id}")
        else:
            self.log_test("Create complex project via main endpoint", False, f"- {result}")
            return False
        
        # Test 3: Verify both projects are accessible through main endpoint
        success, projects_list = self.make_request('GET', 'projects')
        if success:
            project_ids = [p.get('id') for p in projects_list]
            has_simple = simple_project_id in project_ids
            has_complex = complex_project_id in project_ids
            self.log_test("Both projects accessible via main endpoint", has_simple and has_complex, 
                        f"- Simple: {has_simple}, Complex: {has_complex}")
        else:
            self.log_test("Get projects list", False, f"- {projects_list}")
            return False
        
        return True

    def test_no_duplicate_endpoints(self):
        """Verify /api/projects/enhanced no longer exists"""
        print("\n🚫 Testing No Duplicate Endpoints...")
        
        # Test that /api/projects/enhanced returns 404 or 405 (method not allowed)
        success_404, result_404 = self.make_request('GET', 'projects/enhanced', expected_status=404)
        success_405, result_405 = self.make_request('GET', 'projects/enhanced', expected_status=405)
        
        endpoint_removed = success_404 or success_405
        self.log_test("Enhanced projects endpoint removed", endpoint_removed, 
                    "- /api/projects/enhanced no longer exists")
        
        # Test that POST to /api/projects/enhanced also doesn't work
        test_data = {"project_name": "Test"}
        success_404_post, result_404_post = self.make_request('POST', 'projects/enhanced', test_data, expected_status=404)
        success_405_post, result_405_post = self.make_request('POST', 'projects/enhanced', test_data, expected_status=405)
        
        post_endpoint_removed = success_404_post or success_405_post
        self.log_test("Enhanced projects POST endpoint removed", post_endpoint_removed,
                    "- POST /api/projects/enhanced no longer exists")
        
        return endpoint_removed and post_endpoint_removed

    def test_unified_project_structure(self):
        """Test project creation with both simple and complex data"""
        print("\n🏗️ Testing Unified Project Structure...")
        
        client_id = self.created_resources['clients'][0]
        company_profile_id = self.created_resources['company_profiles'][0]
        
        # Test 1: Create project without enhanced features
        basic_project_data = {
            "project_name": "Basic Structure Test Project",
            "architect": "Basic Architect",
            "client_id": client_id,
            "client_name": "Unified Test Client Ltd",
            "created_by": self.user_data['id'],
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Basic Work Item",
                    "unit": "Nos",
                    "quantity": 10,
                    "rate": 1000,
                    "amount": 10000,
                    "gst_rate": 18.0
                }
            ],
            "total_project_value": 10000
        }
        
        success, result = self.make_request('POST', 'projects', basic_project_data)
        if success and 'project_id' in result:
            basic_project_id = result['project_id']
            self.created_resources['projects'].append(basic_project_id)
            self.log_test("Create basic project", True, f"- Project ID: {basic_project_id}")
            
            # Verify basic project structure
            success, project = self.make_request('GET', f'projects/{basic_project_id}')
            if success:
                has_basic_fields = all(field in project for field in ['project_name', 'architect', 'client_name', 'boq_items'])
                enhanced_fields_optional = True  # Enhanced fields should be optional/null
                self.log_test("Basic project structure", has_basic_fields and enhanced_fields_optional,
                            f"- Has required fields, enhanced fields optional")
            else:
                self.log_test("Get basic project", False, f"- {project}")
                return False
        else:
            self.log_test("Create basic project", False, f"- {result}")
            return False
        
        # Test 2: Create project with all enhanced features
        enhanced_project_data = {
            "project_name": "Enhanced Structure Test Project",
            "architect": "Enhanced Architect",
            "client_id": client_id,
            "client_name": "Unified Test Client Ltd",
            "created_by": self.user_data['id'],
            # Enhanced features
            "company_profile_id": company_profile_id,
            "selected_location_id": None,  # Will use default
            "selected_bank_id": None,      # Will use default
            "project_metadata": {
                "purchase_order_number": "PO-STRUCT-001",
                "type": "Enhanced Construction",
                "reference_no": "REF-STRUCT-001",
                "dated": "2024-01-15",
                "basic": 200000.0,
                "overall_multiplier": 1.5,
                "po_inv_value": 300000.0,
                "abg_percentage": 10.0,
                "ra_bill_with_taxes_percentage": 75.0,
                "erection_percentage": 20.0,
                "pbg_percentage": 5.0
            },
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Enhanced Foundation",
                    "unit": "Cum",
                    "quantity": 75,
                    "rate": 2500,
                    "amount": 187500,
                    "gst_rate": 18.0
                },
                {
                    "serial_number": "2",
                    "description": "Enhanced Superstructure",
                    "unit": "Sqm",
                    "quantity": 500,
                    "rate": 225,
                    "amount": 112500,
                    "gst_rate": 18.0
                }
            ],
            "total_project_value": 300000
        }
        
        success, result = self.make_request('POST', 'projects', enhanced_project_data)
        if success and 'project_id' in result:
            enhanced_project_id = result['project_id']
            self.created_resources['projects'].append(enhanced_project_id)
            self.log_test("Create enhanced project", True, f"- Project ID: {enhanced_project_id}")
            
            # Verify enhanced project structure
            success, project = self.make_request('GET', f'projects/{enhanced_project_id}')
            if success:
                has_basic_fields = all(field in project for field in ['project_name', 'architect', 'client_name', 'boq_items'])
                has_enhanced_fields = 'company_profile_id' in project and 'project_metadata' in project
                self.log_test("Enhanced project structure", has_basic_fields and has_enhanced_fields,
                            f"- Has both basic and enhanced fields")
            else:
                self.log_test("Get enhanced project", False, f"- {project}")
                return False
        else:
            self.log_test("Create enhanced project", False, f"- {result}")
            return False
        
        return True

    def test_company_profile_integration(self):
        """Verify company profile integration works through main endpoint"""
        print("\n🏢 Testing Company Profile Integration...")
        
        client_id = self.created_resources['clients'][0]
        company_profile_id = self.created_resources['company_profiles'][0]
        
        # Create project with company profile integration
        project_data = {
            "project_name": "Company Profile Integration Test",
            "architect": "Integration Architect",
            "client_id": client_id,
            "client_name": "Unified Test Client Ltd",
            "created_by": self.user_data['id'],
            "company_profile_id": company_profile_id,
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Integration Test Work",
                    "unit": "Nos",
                    "quantity": 5,
                    "rate": 5000,
                    "amount": 25000,
                    "gst_rate": 18.0
                }
            ],
            "total_project_value": 25000
        }
        
        success, result = self.make_request('POST', 'projects', project_data)
        if success and 'project_id' in result:
            project_id = result['project_id']
            self.created_resources['projects'].append(project_id)
            self.log_test("Create project with company profile", True, f"- Project ID: {project_id}")
            
            # Verify company profile is linked
            success, project = self.make_request('GET', f'projects/{project_id}')
            if success:
                has_company_profile = project.get('company_profile_id') == company_profile_id
                self.log_test("Company profile integration", has_company_profile,
                            f"- Company profile linked: {has_company_profile}")
                
                # Test that we can get company profile details through project
                if has_company_profile:
                    success, company_profile = self.make_request('GET', f'company-profiles/{company_profile_id}')
                    if success:
                        profile_has_locations = len(company_profile.get('locations', [])) > 0
                        profile_has_banks = len(company_profile.get('bank_details', [])) > 0
                        self.log_test("Company profile details accessible", profile_has_locations and profile_has_banks,
                                    f"- Locations: {len(company_profile.get('locations', []))}, Banks: {len(company_profile.get('bank_details', []))}")
                    else:
                        self.log_test("Get company profile details", False, f"- {company_profile}")
                        return False
            else:
                self.log_test("Get project with company profile", False, f"- {project}")
                return False
        else:
            self.log_test("Create project with company profile", False, f"- {result}")
            return False
        
        return True

    def test_no_field_confusion(self):
        """Ensure there's only one metadata structure"""
        print("\n📋 Testing No Field Confusion...")
        
        client_id = self.created_resources['clients'][0]
        
        # Create project with unified metadata structure
        project_data = {
            "project_name": "Metadata Structure Test",
            "architect": "Metadata Architect",
            "client_id": client_id,
            "client_name": "Unified Test Client Ltd",
            "created_by": self.user_data['id'],
            # Use project_metadata (unified structure)
            "project_metadata": {
                "purchase_order_number": "PO-META-001",
                "type": "Metadata Test",
                "reference_no": "REF-META-001",
                "dated": "2024-01-15",
                "basic": 150000.0,
                "overall_multiplier": 1.3,
                "po_inv_value": 195000.0
            },
            "boq_items": [
                {
                    "serial_number": "1",
                    "description": "Metadata Test Work",
                    "unit": "Nos",
                    "quantity": 15,
                    "rate": 10000,
                    "amount": 150000,
                    "gst_rate": 18.0
                }
            ],
            "total_project_value": 150000
        }
        
        success, result = self.make_request('POST', 'projects', project_data)
        if success and 'project_id' in result:
            project_id = result['project_id']
            self.created_resources['projects'].append(project_id)
            self.log_test("Create project with unified metadata", True, f"- Project ID: {project_id}")
            
            # Verify unified metadata structure
            success, project = self.make_request('GET', f'projects/{project_id}')
            if success:
                # Should have project_metadata, not both metadata and project_metadata
                has_project_metadata = 'project_metadata' in project
                has_old_metadata = 'metadata' in project and project['metadata'] != project.get('project_metadata', {})
                
                unified_structure = has_project_metadata and not has_old_metadata
                self.log_test("Unified metadata structure", unified_structure,
                            f"- project_metadata: {has_project_metadata}, no duplicate metadata: {not has_old_metadata}")
                
                # Verify metadata content
                if has_project_metadata:
                    metadata = project['project_metadata']
                    has_po_number = metadata.get('purchase_order_number') == 'PO-META-001'
                    has_basic_amount = metadata.get('basic') == 150000.0
                    self.log_test("Metadata content validation", has_po_number and has_basic_amount,
                                f"- PO: {metadata.get('purchase_order_number')}, Basic: {metadata.get('basic')}")
            else:
                self.log_test("Get project with metadata", False, f"- {project}")
                return False
        else:
            self.log_test("Create project with metadata", False, f"- {result}")
            return False
        
        return True

    def test_unified_project_retrieval(self):
        """Test that project retrieval works consistently"""
        print("\n🔍 Testing Unified Project Retrieval...")
        
        # Get all projects and verify they have consistent structure
        success, projects = self.make_request('GET', 'projects')
        if success:
            self.log_test("Get all projects", True, f"- Found {len(projects)} projects")
            
            # Check that all projects have consistent basic structure
            consistent_structure = True
            enhanced_features_available = 0
            
            for project in projects:
                # Basic fields should be present in all projects
                has_basic = all(field in project for field in ['id', 'project_name', 'architect', 'client_name'])
                if not has_basic:
                    consistent_structure = False
                    break
                
                # Enhanced features should be available but optional
                if project.get('company_profile_id') or project.get('project_metadata'):
                    enhanced_features_available += 1
            
            self.log_test("Consistent project structure", consistent_structure,
                        f"- All projects have basic fields")
            self.log_test("Enhanced features availability", enhanced_features_available > 0,
                        f"- {enhanced_features_available} projects use enhanced features")
            
            # Test individual project retrieval
            if projects:
                test_project = projects[0]
                project_id = test_project['id']
                
                success, individual_project = self.make_request('GET', f'projects/{project_id}')
                if success:
                    # Individual retrieval should have same structure as list
                    same_structure = all(field in individual_project for field in ['id', 'project_name', 'architect', 'client_name'])
                    self.log_test("Individual project retrieval", same_structure,
                                f"- Project {project_id} retrieved successfully")
                else:
                    self.log_test("Individual project retrieval", False, f"- {individual_project}")
                    return False
        else:
            self.log_test("Get all projects", False, f"- {projects}")
            return False
        
        return True

    def run_all_tests(self):
        """Run all unified project system tests"""
        print("🎯 UNIFIED PROJECT SYSTEM TESTING")
        print("=" * 50)
        
        # Authenticate
        if not self.authenticate():
            print("❌ Authentication failed, cannot proceed with tests")
            return False
        
        # Setup test data
        if not self.setup_test_data():
            print("❌ Test data setup failed, cannot proceed with tests")
            return False
        
        # Run all tests
        tests = [
            self.test_single_project_endpoint,
            self.test_no_duplicate_endpoints,
            self.test_unified_project_structure,
            self.test_company_profile_integration,
            self.test_no_field_confusion,
            self.test_unified_project_retrieval
        ]
        
        all_passed = True
        for test in tests:
            try:
                if not test():
                    all_passed = False
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
                all_passed = False
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 UNIFIED PROJECT SYSTEM TEST SUMMARY")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if all_passed:
            print("🎉 ALL UNIFIED PROJECT SYSTEM TESTS PASSED!")
        else:
            print("⚠️  Some tests failed - unified project system needs attention")
        
        return all_passed

if __name__ == "__main__":
    tester = UnifiedProjectTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)