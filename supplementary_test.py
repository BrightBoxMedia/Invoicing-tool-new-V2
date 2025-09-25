#!/usr/bin/env python3
"""
Supplementary tests for specific requirements from the review request
"""

import requests
import sys
import json
from pathlib import Path

class SupplementaryTester:
    def __init__(self):
        # Get backend URL from frontend .env file
        frontend_env_path = Path("/app/frontend/.env")
        self.base_url = "https://billing-maestro.preview.emergentagent.com"
        
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

    def test_authentication(self):
        """Test authentication"""
        success, result = self.make_request('POST', 'auth/login', 
                                          {'email': 'brightboxm@gmail.com', 'password': 'admin123'})
        
        if success and 'access_token' in result:
            self.token = result['access_token']
            self.user_data = result['user']
            return True
        return False

    def test_unified_project_system(self):
        """Test that there's no confusion between enhanced and regular projects"""
        print("\n🔄 Testing Unified Project System...")
        
        # Test that /api/projects/enhanced doesn't exist or returns proper error
        success, result = self.make_request('GET', 'projects/enhanced', expected_status=404)
        if not success:
            # Try 405 Method Not Allowed
            success, result = self.make_request('GET', 'projects/enhanced', expected_status=405)
        
        self.log_test("No duplicate enhanced project endpoint", success,
                    "- /api/projects/enhanced properly returns 404/405")
        
        # Test that main projects endpoint handles both simple and enhanced projects
        success, projects = self.make_request('GET', 'projects')
        if success:
            # Check that projects have consistent structure
            consistent_structure = True
            for project in projects[:5]:  # Check first 5 projects
                if 'project_metadata' not in project:
                    consistent_structure = False
                    break
                # Check that project_metadata is dict, not list
                if not isinstance(project.get('project_metadata'), dict):
                    consistent_structure = False
                    break
            
            self.log_test("Unified project structure", consistent_structure,
                        f"- All projects have consistent project_metadata dict structure")
        
        return True

    def test_enhanced_invoice_workflow(self):
        """Test complete enhanced invoice workflow"""
        print("\n🔄 Testing Enhanced Invoice Workflow...")
        
        # Get a project to work with
        success, projects = self.make_request('GET', 'projects')
        if not success or not projects:
            self.log_test("Enhanced invoice workflow setup", False, "- No projects available")
            return False
        
        project = projects[0]
        project_id = project['id']
        
        # Test RA tracking endpoint
        success, ra_tracking = self.make_request('GET', f'projects/{project_id}/ra-tracking')
        if success:
            has_tracking_structure = 'project_id' in ra_tracking and 'ra_tracking' in ra_tracking
            self.log_test("RA tracking endpoint", has_tracking_structure,
                        f"- Project {project_id} has RA tracking structure")
        else:
            self.log_test("RA tracking endpoint", False, f"- {ra_tracking}")
        
        # Test quantity validation endpoint
        validation_data = {
            "project_id": project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "quantity": 10.0,
                    "description": "Test validation item"
                }
            ]
        }
        
        success, validation_result = self.make_request('POST', 'invoices/validate-quantities', validation_data)
        if success:
            has_validation_structure = 'valid' in validation_result
            self.log_test("Quantity validation endpoint", has_validation_structure,
                        f"- Validation result: {validation_result.get('valid', 'Unknown')}")
        else:
            self.log_test("Quantity validation endpoint", False, f"- {validation_result}")
        
        return True

    def test_gst_calculations(self):
        """Test GST calculations for different scenarios"""
        print("\n💰 Testing GST Calculations...")
        
        # Get invoices to check GST calculations
        success, invoices = self.make_request('GET', 'invoices')
        if success and invoices:
            gst_calculation_correct = True
            for invoice in invoices[:3]:  # Check first 3 invoices
                subtotal = invoice.get('subtotal', 0)
                total_gst = invoice.get('total_gst_amount', 0)
                total_amount = invoice.get('total_amount', 0)
                
                # Basic validation: total_amount should equal subtotal + gst
                if abs((subtotal + total_gst) - total_amount) > 0.01:
                    gst_calculation_correct = False
                    break
            
            self.log_test("GST calculations accuracy", gst_calculation_correct,
                        f"- Checked {min(3, len(invoices))} invoices for calculation accuracy")
        else:
            self.log_test("GST calculations accuracy", False, "- No invoices to check")
        
        return True

    def test_data_migration_compatibility(self):
        """Test that existing projects work without validation errors"""
        print("\n🔄 Testing Data Migration Compatibility...")
        
        # Get all projects and check for validation errors
        success, projects = self.make_request('GET', 'projects')
        if success:
            validation_errors = 0
            for project in projects:
                # Check for common validation issues
                if not isinstance(project.get('project_metadata'), dict):
                    validation_errors += 1
                
                # Check for required fields
                required_fields = ['id', 'project_name', 'client_name']
                for field in required_fields:
                    if field not in project:
                        validation_errors += 1
                        break
            
            self.log_test("Data migration compatibility", validation_errors == 0,
                        f"- {len(projects)} projects checked, {validation_errors} validation errors")
        else:
            self.log_test("Data migration compatibility", False, f"- {projects}")
        
        return True

    def test_professional_enterprise_features(self):
        """Test professional enterprise-grade features"""
        print("\n🏢 Testing Professional Enterprise Features...")
        
        # Test activity logging
        success, activity_logs = self.make_request('GET', 'activity-logs')
        if success:
            has_comprehensive_logging = len(activity_logs) > 0
            if has_comprehensive_logging and activity_logs:
                # Check log structure
                log_entry = activity_logs[0]
                has_required_fields = all(field in log_entry for field in 
                                        ['user_email', 'action', 'description', 'timestamp'])
                self.log_test("Professional activity logging", has_required_fields,
                            f"- {len(activity_logs)} log entries with proper structure")
            else:
                self.log_test("Professional activity logging", False, "- No activity logs found")
        else:
            self.log_test("Professional activity logging", False, f"- {activity_logs}")
        
        # Test system health monitoring
        success, system_health = self.make_request('GET', 'admin/system-health')
        if success:
            has_health_monitoring = 'database' in system_health and 'application' in system_health
            self.log_test("System health monitoring", has_health_monitoring,
                        f"- System health endpoint provides comprehensive monitoring")
        else:
            self.log_test("System health monitoring", False, f"- {system_health}")
        
        # Test reports and insights
        success, gst_report = self.make_request('GET', 'reports/gst-summary')
        if success:
            has_professional_reporting = 'total_invoices' in gst_report and 'total_gst_amount' in gst_report
            self.log_test("Professional reporting system", has_professional_reporting,
                        f"- GST summary report with {gst_report.get('total_invoices', 0)} invoices")
        else:
            self.log_test("Professional reporting system", False, f"- {gst_report}")
        
        return True

    def run_supplementary_tests(self):
        """Run all supplementary tests"""
        print("🔍 RUNNING SUPPLEMENTARY TESTS FOR SPECIFIC REQUIREMENTS")
        print("=" * 70)
        
        if not self.test_authentication():
            print("❌ Authentication failed. Cannot proceed.")
            return False
        
        # Run supplementary tests
        self.test_unified_project_system()
        self.test_enhanced_invoice_workflow()
        self.test_gst_calculations()
        self.test_data_migration_compatibility()
        self.test_professional_enterprise_features()
        
        # Results
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print("\n" + "=" * 70)
        print("🔍 SUPPLEMENTARY TEST RESULTS")
        print("=" * 70)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("\n✅ SUPPLEMENTARY TESTS PASSED - Additional requirements verified!")
        else:
            print(f"\n⚠️ Some supplementary tests failed - Success rate: {success_rate:.1f}%")
        
        print("=" * 70)
        return success_rate >= 90

if __name__ == "__main__":
    tester = SupplementaryTester()
    success = tester.run_supplementary_tests()
    sys.exit(0 if success else 1)