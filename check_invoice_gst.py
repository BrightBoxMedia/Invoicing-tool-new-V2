#!/usr/bin/env python3
"""
Check Invoice GST Breakdown Data
"""

import requests
import json

def check_invoice_gst_breakdown():
    base_url = "https://template-maestro.preview.emergentagent.com"
    api_url = f"{base_url}/api"
    
    # Login
    login_data = {'email': 'brightboxm@gmail.com', 'password': 'admin123'}
    response = requests.post(f"{api_url}/auth/login", json=login_data)
    
    if response.status_code == 200:
        token = response.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Get invoices
        response = requests.get(f"{api_url}/invoices", headers=headers)
        
        if response.status_code == 200:
            invoices = response.json()
            print(f"Found {len(invoices)} invoices")
            
            # Check the last few invoices for GST breakdown
            for i, invoice in enumerate(invoices[-3:]):
                print(f"\n--- Invoice {i+1} ---")
                print(f"ID: {invoice.get('id')}")
                print(f"GST Type: {invoice.get('gst_type', 'Not set')}")
                print(f"CGST Amount: ₹{invoice.get('cgst_amount', 0)}")
                print(f"SGST Amount: ₹{invoice.get('sgst_amount', 0)}")
                print(f"IGST Amount: ₹{invoice.get('igst_amount', 0)}")
                print(f"Total GST: ₹{invoice.get('total_gst_amount', 0)}")
                print(f"Subtotal: ₹{invoice.get('subtotal', 0)}")
                print(f"Total Amount: ₹{invoice.get('total_amount', 0)}")
                
                # Check if GST breakdown matches expectations
                subtotal = invoice.get('subtotal', 0)
                gst_type = invoice.get('gst_type')
                
                if gst_type == 'CGST_SGST':
                    expected_cgst = subtotal * 0.09
                    expected_sgst = subtotal * 0.09
                    actual_cgst = invoice.get('cgst_amount', 0)
                    actual_sgst = invoice.get('sgst_amount', 0)
                    print(f"Expected CGST: ₹{expected_cgst:.2f}, Actual: ₹{actual_cgst}")
                    print(f"Expected SGST: ₹{expected_sgst:.2f}, Actual: ₹{actual_sgst}")
                elif gst_type == 'IGST':
                    expected_igst = subtotal * 0.18
                    actual_igst = invoice.get('igst_amount', 0)
                    print(f"Expected IGST: ₹{expected_igst:.2f}, Actual: ₹{actual_igst}")
        else:
            print(f"Failed to get invoices: {response.status_code}")
    else:
        print(f"Failed to login: {response.status_code}")

if __name__ == "__main__":
    check_invoice_gst_breakdown()