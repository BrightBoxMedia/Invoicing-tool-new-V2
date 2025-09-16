#!/usr/bin/env python3
"""
Debug script to test quantity validation specifically
"""

import requests
import json

class QuantityValidationDebugger:
    def __init__(self, base_url="https://billingflow-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None

    def login(self):
        """Login to get token"""
        login_data = {'email': 'brightboxm@gmail.com', 'password': 'admin123'}
        response = requests.post(f"{self.api_url}/auth/login", json=login_data)
        
        if response.status_code == 200:
            result = response.json()
            self.token = result['access_token']
            print(f"✅ Login successful")
            return True
        else:
            print(f"❌ Login failed: {response.status_code}")
            return False

    def get_project_details(self, project_id):
        """Get project details to see BOQ items"""
        headers = {'Authorization': f'Bearer {self.token}'}
        response = requests.get(f"{self.api_url}/projects/{project_id}", headers=headers)
        
        if response.status_code == 200:
            project = response.json()
            print(f"\n📋 Project: {project.get('project_name')}")
            print(f"BOQ Items: {len(project.get('boq_items', []))}")
            
            for i, item in enumerate(project.get('boq_items', [])[:3]):  # Show first 3 items
                print(f"  {i+1}. {item.get('description')} - Qty: {item.get('quantity')} - Billed: {item.get('billed_quantity', 0)}")
            
            return project
        else:
            print(f"❌ Failed to get project: {response.status_code}")
            return None

    def test_quantity_validation_endpoint(self, project_id):
        """Test the quantity validation endpoint specifically"""
        headers = {'Authorization': f'Bearer {self.token}'}
        
        validation_data = {
            "project_id": project_id,
            "invoice_items": [
                {
                    "boq_item_id": "1",
                    "quantity": 7.30,  # User's exact scenario
                    "description": "Foundation Work"
                }
            ]
        }
        
        response = requests.post(f"{self.api_url}/invoices/validate-quantities", 
                               json=validation_data, headers=headers)
        
        print(f"\n🔍 Quantity Validation Endpoint Test:")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Valid: {result.get('valid')}")
            print(f"Errors: {result.get('errors', [])}")
            print(f"Warnings: {result.get('warnings', [])}")
        else:
            print(f"Error: {response.text}")

    def test_invoice_creation_with_over_quantity(self, project_id, client_id):
        """Test creating invoice with over-quantity"""
        headers = {'Authorization': f'Bearer {self.token}'}
        
        over_quantity_invoice = {
            "project_id": project_id,
            "project_name": "Test Construction Project",
            "client_id": client_id,
            "client_name": "Test Client Ltd",
            "invoice_type": "proforma",
            "items": [
                {
                    "boq_item_id": "1",
                    "serial_number": "1",
                    "description": "Foundation Work",  # Exact match
                    "unit": "Cum",
                    "quantity": 7.30,  # User's exact scenario
                    "rate": 5000,
                    "amount": 36500,
                    "gst_rate": 18.0,
                    "gst_amount": 6570,
                    "total_with_gst": 43070
                }
            ],
            "subtotal": 36500,
            "total_gst_amount": 6570,
            "total_amount": 43070,
            "status": "draft",
            "created_by": "test-user-id"
        }
        
        response = requests.post(f"{self.api_url}/invoices", 
                               json=over_quantity_invoice, headers=headers)
        
        print(f"\n🧾 Invoice Creation Test (Over-Quantity):")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"❌ CRITICAL: Invoice was created! ID: {result.get('invoice_id')}")
            print("This means quantity validation is NOT working!")
        elif response.status_code == 400:
            result = response.json()
            print(f"✅ GOOD: Invoice was blocked!")
            print(f"Error: {result.get('detail', {}).get('message', 'Unknown error')}")
        else:
            print(f"Unexpected status: {response.text}")

    def run_debug(self):
        """Run the debug tests"""
        print("🔍 QUANTITY VALIDATION DEBUG TEST")
        print("=" * 50)
        
        if not self.login():
            return
        
        # Get projects to find one with BOQ data
        headers = {'Authorization': f'Bearer {self.token}'}
        response = requests.get(f"{self.api_url}/projects", headers=headers)
        
        if response.status_code == 200:
            projects = response.json()
            print(f"Found {len(projects)} projects")
            
            # Find a project with BOQ items
            test_project = None
            for project in projects:
                if project.get('boq_items') and len(project['boq_items']) > 0:
                    test_project = project
                    break
            
            if test_project:
                project_id = test_project['id']
                print(f"Using project: {test_project['project_name']}")
                
                # Get detailed project info
                project_details = self.get_project_details(project_id)
                
                # Test validation endpoint
                self.test_quantity_validation_endpoint(project_id)
                
                # Get clients to find one for invoice creation
                response = requests.get(f"{self.api_url}/clients", headers=headers)
                if response.status_code == 200:
                    clients = response.json()
                    if clients:
                        client_id = clients[0]['id']
                        
                        # Test invoice creation
                        self.test_invoice_creation_with_over_quantity(project_id, client_id)
                    else:
                        print("No clients found")
                else:
                    print("Failed to get clients")
            else:
                print("No projects with BOQ items found")
        else:
            print(f"Failed to get projects: {response.status_code}")

if __name__ == "__main__":
    debugger = QuantityValidationDebugger()
    debugger.run_debug()