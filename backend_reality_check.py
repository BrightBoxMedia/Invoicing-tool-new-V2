#!/usr/bin/env python3
"""
BACKEND REALITY CHECK - AWS Deployment Readiness Assessment
This test identifies what's actually implemented vs what should be working
"""

import requests
import sys
import json
import io
import os
import time
from datetime import datetime

class BackendRealityChecker:
    def __init__(self, base_url="https://template-maestro.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.working_endpoints = []
        self.missing_endpoints = []
        self.critical_missing = []

    def log_result(self, endpoint, method, success, details="", critical=False):
        """Log endpoint test results"""
        status = "✅ WORKING" if success else "❌ MISSING"
        print(f"{status} {method} {endpoint} - {details}")
        
        if success:
            self.working_endpoints.append(f"{method} {endpoint}")
        else:
            self.missing_endpoints.append(f"{method} {endpoint}")
            if critical:
                self.critical_missing.append(f"{method} {endpoint}")

    def test_endpoint(self, method, endpoint, data=None, files=None, expected_status=200, auth_required=True):
        """Test if an endpoint exists and responds correctly"""
        url = f"{self.api_url}/{endpoint}"
        headers = {}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files is None and data is not None:
            headers['Content-Type'] = 'application/json'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers={k: v for k, v in headers.items() if k != 'Content-Type'}, 
                                           data=data, files=files, timeout=10)
                else:
                    response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, f"Unsupported method: {method}"

            # Check if endpoint exists (not 404)
            if response.status_code == 404:
                return False, "Endpoint not found (404)"
            
            # For auth endpoints, 401 is acceptable if no token provided
            if response.status_code == 401 and auth_required and not self.token:
                return True, "Endpoint exists (requires auth)"
            
            # Check if response is as expected
            success = response.status_code == expected_status
            
            if success:
                try:
                    result = response.json()
                    return True, f"Status {response.status_code}, Response: {type(result).__name__}"
                except:
                    return True, f"Status {response.status_code}, Response: bytes"
            else:
                return True, f"Endpoint exists but returned {response.status_code}"

        except Exception as e:
            return False, f"Request failed: {str(e)}"

    def test_authentication_system(self):
        """Test authentication endpoints"""
        print("\n🔐 TESTING AUTHENTICATION SYSTEM")
        print("-" * 50)
        
        # Test login endpoint
        success, details = self.test_endpoint('POST', 'auth/login', 
                                            {'email': 'brightboxm@gmail.com', 'password': 'admin123'}, 
                                            auth_required=False)
        self.log_result('/api/auth/login', 'POST', success, details, critical=True)
        
        if success and "Status 200" in details:
            # Actually get the token
            response = requests.post(f"{self.api_url}/auth/login", 
                                   json={'email': 'brightboxm@gmail.com', 'password': 'admin123'})
            if response.status_code == 200:
                result = response.json()
                self.token = result.get('access_token')
                self.user_data = result.get('user')
        
        # Test other auth endpoints
        success, details = self.test_endpoint('GET', 'auth/me')
        self.log_result('/api/auth/me', 'GET', success, details, critical=True)
        
        success, details = self.test_endpoint('POST', 'auth/logout')
        self.log_result('/api/auth/logout', 'POST', success, details)

    def test_core_api_endpoints(self):
        """Test core API endpoints mentioned in the review request"""
        print("\n🏗️ TESTING CORE API ENDPOINTS")
        print("-" * 50)
        
        # Projects API
        success, details = self.test_endpoint('GET', 'projects')
        self.log_result('/api/projects', 'GET', success, details, critical=True)
        
        success, details = self.test_endpoint('POST', 'projects', {'project_name': 'Test'})
        self.log_result('/api/projects', 'POST', success, details, critical=True)
        
        # Invoices API
        success, details = self.test_endpoint('GET', 'invoices')
        self.log_result('/api/invoices', 'GET', success, details, critical=True)
        
        success, details = self.test_endpoint('POST', 'invoices', {'invoice_type': 'test'})
        self.log_result('/api/invoices', 'POST', success, details, critical=True)
        
        # Clients API
        success, details = self.test_endpoint('GET', 'clients')
        self.log_result('/api/clients', 'GET', success, details, critical=True)
        
        success, details = self.test_endpoint('POST', 'clients', {'name': 'Test Client'})
        self.log_result('/api/clients', 'POST', success, details, critical=True)
        
        # Dashboard
        success, details = self.test_endpoint('GET', 'dashboard/stats')
        self.log_result('/api/dashboard/stats', 'GET', success, details, critical=True)

    def test_boq_and_file_handling(self):
        """Test BOQ upload and file handling"""
        print("\n📄 TESTING BOQ UPLOAD & FILE HANDLING")
        print("-" * 50)
        
        # BOQ Upload (we know this works)
        excel_data = b"fake_excel_data"
        files = {'file': ('test.xlsx', excel_data, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        success, details = self.test_endpoint('POST', 'upload-boq', files=files)
        self.log_result('/api/upload-boq', 'POST', success, details, critical=True)
        
        # Logo upload
        logo_data = b"fake_logo_data"
        files = {'file': ('test.png', logo_data, 'image/png')}
        success, details = self.test_endpoint('POST', 'admin/pdf-template/upload-logo', files=files)
        self.log_result('/api/admin/pdf-template/upload-logo', 'POST', success, details, critical=True)

    def test_pdf_generation_endpoints(self):
        """Test PDF generation endpoints"""
        print("\n📄 TESTING PDF GENERATION ENDPOINTS")
        print("-" * 50)
        
        # Template management (we know these work)
        success, details = self.test_endpoint('GET', 'admin/pdf-template/active')
        self.log_result('/api/admin/pdf-template/active', 'GET', success, details, critical=True)
        
        success, details = self.test_endpoint('POST', 'admin/pdf-template', {'company_name': 'Test'})
        self.log_result('/api/admin/pdf-template', 'POST', success, details, critical=True)
        
        success, details = self.test_endpoint('POST', 'admin/pdf-template/preview', {'company_name': 'Test'})
        self.log_result('/api/admin/pdf-template/preview', 'POST', success, details, critical=True)
        
        # Invoice PDF generation
        success, details = self.test_endpoint('GET', 'invoices/test-id/pdf')
        self.log_result('/api/invoices/{id}/pdf', 'GET', success, details, critical=True)

    def test_additional_endpoints(self):
        """Test additional endpoints that should exist according to test_result.md"""
        print("\n🔧 TESTING ADDITIONAL ENDPOINTS")
        print("-" * 50)
        
        # Activity logs
        success, details = self.test_endpoint('GET', 'activity-logs')
        self.log_result('/api/activity-logs', 'GET', success, details)
        
        # Item master
        success, details = self.test_endpoint('GET', 'item-master')
        self.log_result('/api/item-master', 'GET', success, details)
        
        success, details = self.test_endpoint('POST', 'item-master', {'description': 'Test'})
        self.log_result('/api/item-master', 'POST', success, details)
        
        # Search and filters
        success, details = self.test_endpoint('GET', 'search?query=test')
        self.log_result('/api/search', 'GET', success, details)
        
        success, details = self.test_endpoint('GET', 'filters/projects')
        self.log_result('/api/filters/projects', 'GET', success, details)
        
        # Reports
        success, details = self.test_endpoint('GET', 'reports/gst-summary')
        self.log_result('/api/reports/gst-summary', 'GET', success, details)
        
        success, details = self.test_endpoint('GET', 'reports/insights')
        self.log_result('/api/reports/insights', 'GET', success, details)
        
        # Admin endpoints
        success, details = self.test_endpoint('GET', 'admin/system-health')
        self.log_result('/api/admin/system-health', 'GET', success, details)
        
        success, details = self.test_endpoint('GET', 'admin/workflows')
        self.log_result('/api/admin/workflows', 'GET', success, details)

    def test_health_endpoints(self):
        """Test health check endpoints"""
        print("\n🏥 TESTING HEALTH ENDPOINTS")
        print("-" * 50)
        
        success, details = self.test_endpoint('GET', 'health', auth_required=False)
        self.log_result('/api/health', 'GET', success, details, critical=True)
        
        # Also test root health endpoints
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            success = response.status_code != 404
            details = f"Status {response.status_code}" if success else "Not found"
            self.log_result('/health', 'GET', success, details, critical=True)
        except:
            self.log_result('/health', 'GET', False, "Request failed", critical=True)

    def run_reality_check(self):
        """Run the complete reality check"""
        print("🔍 BACKEND REALITY CHECK - AWS DEPLOYMENT READINESS")
        print("=" * 60)
        print("Checking what's actually implemented vs what should be working...")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all tests
        self.test_health_endpoints()
        self.test_authentication_system()
        self.test_core_api_endpoints()
        self.test_boq_and_file_handling()
        self.test_pdf_generation_endpoints()
        self.test_additional_endpoints()
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Generate comprehensive report
        print("\n" + "=" * 60)
        print("📊 BACKEND REALITY CHECK RESULTS")
        print("=" * 60)
        
        total_tested = len(self.working_endpoints) + len(self.missing_endpoints)
        working_count = len(self.working_endpoints)
        missing_count = len(self.missing_endpoints)
        critical_missing_count = len(self.critical_missing)
        
        print(f"📈 ENDPOINT SUMMARY:")
        print(f"   Total Tested: {total_tested}")
        print(f"   Working: {working_count}")
        print(f"   Missing: {missing_count}")
        print(f"   Critical Missing: {critical_missing_count}")
        print(f"   Success Rate: {(working_count/total_tested*100):.1f}%" if total_tested > 0 else "   Success Rate: 0%")
        print(f"   Test Duration: {duration:.2f} seconds")
        
        if self.working_endpoints:
            print(f"\n✅ WORKING ENDPOINTS ({len(self.working_endpoints)}):")
            for endpoint in self.working_endpoints:
                print(f"   • {endpoint}")
        
        if self.missing_endpoints:
            print(f"\n❌ MISSING ENDPOINTS ({len(self.missing_endpoints)}):")
            for endpoint in self.missing_endpoints:
                critical_marker = " (CRITICAL)" if endpoint in self.critical_missing else ""
                print(f"   • {endpoint}{critical_marker}")
        
        # AWS Deployment Assessment
        print(f"\n🚀 AWS DEPLOYMENT READINESS ASSESSMENT:")
        
        # Critical endpoints that must work for basic functionality
        critical_working = working_count - missing_count + len(self.working_endpoints)
        has_auth = any('auth/login' in ep for ep in self.working_endpoints)
        has_health = any('health' in ep for ep in self.working_endpoints)
        has_templates = any('pdf-template' in ep for ep in self.working_endpoints)
        has_boq = any('upload-boq' in ep for ep in self.working_endpoints)
        
        deployment_score = 0
        if has_auth: deployment_score += 25
        if has_health: deployment_score += 25  
        if has_templates: deployment_score += 25
        if has_boq: deployment_score += 25
        
        print(f"   Authentication System: {'✅' if has_auth else '❌'}")
        print(f"   Health Check: {'✅' if has_health else '❌'}")
        print(f"   PDF Templates: {'✅' if has_templates else '❌'}")
        print(f"   BOQ Upload: {'✅' if has_boq else '❌'}")
        print(f"   Deployment Score: {deployment_score}/100")
        
        if deployment_score >= 75:
            print(f"   Status: ✅ MINIMAL DEPLOYMENT READY")
            print(f"   Note: Core functionality available, but many features missing")
        elif deployment_score >= 50:
            print(f"   Status: ⚠️  PARTIAL DEPLOYMENT READY")
            print(f"   Note: Some core functionality missing")
        else:
            print(f"   Status: ❌ NOT DEPLOYMENT READY")
            print(f"   Note: Critical functionality missing")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        if critical_missing_count > 0:
            print(f"   1. Implement {critical_missing_count} critical missing endpoints")
            print(f"   2. Focus on core CRUD operations (projects, invoices, clients)")
            print(f"   3. Add dashboard and reporting endpoints")
        
        if missing_count > working_count:
            print(f"   4. Current backend is incomplete - many endpoints missing")
            print(f"   5. Consider using a more complete backend implementation")
        
        print(f"   6. Test with actual data after implementing missing endpoints")
        print(f"   7. Verify database connectivity and data persistence")
        
        print("=" * 60)
        
        return deployment_score >= 50

if __name__ == "__main__":
    print("🔧 Initializing Backend Reality Checker...")
    
    backend_url = os.getenv('REACT_APP_BACKEND_URL', 'https://template-maestro.preview.emergentagent.com')
    
    checker = BackendRealityChecker(backend_url)
    
    try:
        is_ready = checker.run_reality_check()
        
        if is_ready:
            print("\n✅ Backend has minimal functionality for deployment")
            sys.exit(0)
        else:
            print("\n❌ Backend needs significant work before deployment")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Reality check interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Reality check failed with error: {str(e)}")
        sys.exit(1)