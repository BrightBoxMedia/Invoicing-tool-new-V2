#!/usr/bin/env python3
"""
Debug test to understand why quantity validation is failing
"""

import requests
import json

class DebugTester:
    def __init__(self):
        try:
            with open('/app/frontend/.env', 'r') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        self.base_url = line.split('=')[1].strip()
                        break
                else:
                    self.base_url = "https://activus-manager.preview.emergentagent.com"
        except:
            self.base_url = "https://activus-manager.preview.emergentagent.com"
        
        self.api_url = f"{self.base_url}/api"
        self.token = None

    def authenticate(self):
        response = requests.post(f"{self.api_url}/auth/login", 
                               json={'email': 'brightboxm@gmail.com', 'password': 'admin123'})
        if response.status_code == 200:
            result = response.json()
            self.token = result['access_token']
            return True
        return False

    def get_project_details(self, project_id):
        headers = {'Authorization': f'Bearer {self.token}'}
        response = requests.get(f"{self.api_url}/projects/{project_id}", headers=headers)
        if response.status_code == 200:
            return response.json()
        return None

    def debug_project(self):
        if not self.authenticate():
            print("❌ Authentication failed")
            return
        
        # Get recent projects
        headers = {'Authorization': f'Bearer {self.token}'}
        response = requests.get(f"{self.api_url}/projects", headers=headers)
        if response.status_code == 200:
            projects = response.json()
            
            # Find our test project
            test_project = None
            for project in projects:
                if "Critical Security Test Project" in project.get('project_name', ''):
                    test_project = project
                    break
            
            if test_project:
                project_id = test_project['id']
                print(f"🔍 Found test project: {project_id}")
                
                # Get detailed project info
                project_details = self.get_project_details(project_id)
                if project_details:
                    print("\n📋 BOQ Items:")
                    boq_items = project_details.get('boq_items', [])
                    for i, item in enumerate(boq_items):
                        print(f"  {i+1}. Description: '{item.get('description', '')}'")
                        print(f"     Quantity: {item.get('quantity', 0)}")
                        print(f"     Billed Quantity: {item.get('billed_quantity', 0)}")
                        print(f"     Balance: {item.get('quantity', 0) - item.get('billed_quantity', 0)}")
                        print()
                
                # Get invoices for this project
                response = requests.get(f"{self.api_url}/invoices", headers=headers)
                if response.status_code == 200:
                    all_invoices = response.json()
                    project_invoices = [inv for inv in all_invoices if inv.get('project_id') == project_id]
                    
                    print(f"📄 Found {len(project_invoices)} invoices for this project:")
                    for i, invoice in enumerate(project_invoices):
                        print(f"  Invoice {i+1}: {invoice.get('invoice_number', 'N/A')}")
                        for item in invoice.get('items', []):
                            print(f"    - Description: '{item.get('description', '')}'")
                            print(f"    - Quantity: {item.get('quantity', 0)}")
                        print()
                
                # Test RA tracking
                response = requests.get(f"{self.api_url}/projects/{project_id}/ra-tracking", headers=headers)
                if response.status_code == 200:
                    ra_data = response.json()
                    print("📊 RA Tracking Data:")
                    items = ra_data.get('items', [])
                    print(f"  Found {len(items)} items in RA tracking")
                    for item in items:
                        print(f"    - Description: '{item.get('description', '')}'")
                        print(f"    - Overall: {item.get('overall_qty', 0)}")
                        print(f"    - Used: {item.get('used_qty', 0)}")
                        print(f"    - Balance: {item.get('balance_qty', 0)}")
                        print(f"    - RA Usage: {item.get('ra_usage', {})}")
                        print()
                else:
                    print(f"❌ RA tracking failed: {response.status_code} - {response.text}")
            else:
                print("❌ Test project not found")
        else:
            print(f"❌ Failed to get projects: {response.status_code}")

if __name__ == "__main__":
    tester = DebugTester()
    tester.debug_project()