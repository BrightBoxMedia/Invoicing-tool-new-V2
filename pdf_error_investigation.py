#!/usr/bin/env python3
"""
PDF Generation Error Investigation - CRITICAL ISSUE ANALYSIS
Focused testing to identify exact errors causing PDF download failures
"""

import requests
import sys
import json
import traceback
from datetime import datetime

class PDFErrorInvestigator:
    def __init__(self, base_url="https://projectpulse-42.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.errors_found = []

    def log_result(self, name, success, details=""):
        """Log test results"""
        if success:
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
            self.errors_found.append(f"{name}: {details}")
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
        """Authenticate with super admin credentials"""
        print("🔐 Authenticating...")
        
        success, result = self.make_request('POST', 'auth/login', 
                                          {'email': 'brightboxm@gmail.com', 'password': 'admin123'})
        
        if success and 'access_token' in result:
            self.token = result['access_token']
            self.user_data = result['user']
            self.log_result("Authentication", True, f"- Role: {self.user_data['role']}")
            return True
        else:
            self.log_result("Authentication", False, f"- {result}")
            return False

    def get_test_invoices(self):
        """Get existing invoices for PDF testing"""
        print("\n📋 Getting invoices for PDF testing...")
        
        success, result = self.make_request('GET', 'invoices')
        
        if success:
            invoice_count = len(result)
            self.log_result("Get invoices", True, f"- Found {invoice_count} invoices")
            return result[:3]  # Test first 3 invoices
        else:
            self.log_result("Get invoices", False, f"- {result}")
            return []

    def test_pdf_generation_detailed(self, invoice_id, invoice_number):
        """Test PDF generation with detailed error capture"""
        print(f"\n📄 Testing PDF generation for {invoice_number} (ID: {invoice_id[:8]}...)")
        
        # Make the PDF request
        url = f"{self.api_url}/invoices/{invoice_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers)
            
            print(f"   📊 Response Status: {response.status_code}")
            print(f"   📊 Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                # Success case
                content = response.content
                content_type = response.headers.get('Content-Type', '')
                content_length = len(content)
                
                # Validate PDF
                is_pdf = content.startswith(b'%PDF')
                
                self.log_result(f"PDF Generation - {invoice_number}", is_pdf, 
                              f"- Size: {content_length} bytes, Valid PDF: {is_pdf}")
                
                if is_pdf:
                    # Check PDF content
                    try:
                        pdf_text = content.decode('latin-1', errors='ignore')
                        has_invoice_data = any(keyword in pdf_text.lower() for keyword in 
                                             ['invoice', 'tax', 'amount', 'total'])
                        
                        self.log_result(f"PDF Content - {invoice_number}", has_invoice_data,
                                      f"- Contains invoice data: {has_invoice_data}")
                    except Exception as e:
                        self.log_result(f"PDF Content Analysis - {invoice_number}", False,
                                      f"- Error analyzing content: {str(e)}")
                
                return True
                
            elif response.status_code == 500:
                # Server error - capture detailed error
                try:
                    error_data = response.json()
                    error_detail = error_data.get('detail', 'Unknown server error')
                    
                    print(f"   🚨 500 Error Details: {error_detail}")
                    
                    # Analyze specific error patterns
                    if "name 'letter' is not defined" in error_detail:
                        self.errors_found.append("CRITICAL: 'letter' variable not defined in PDF generation")
                        print("   🔍 IDENTIFIED: Missing 'letter' import or definition")
                        
                    elif "name 'items_table' is not defined" in error_detail:
                        self.errors_found.append("CRITICAL: 'items_table' variable not defined in PDF generation")
                        print("   🔍 IDENTIFIED: 'items_table' variable referenced but not defined")
                        
                    elif "TA_RIGHT" in error_detail:
                        self.errors_found.append("CRITICAL: 'TA_RIGHT' import missing")
                        print("   🔍 IDENTIFIED: Missing TA_RIGHT import from reportlab.lib.enums")
                        
                    else:
                        self.errors_found.append(f"UNKNOWN 500 ERROR: {error_detail}")
                        print(f"   🔍 UNKNOWN ERROR: {error_detail}")
                    
                    self.log_result(f"PDF Generation - {invoice_number}", False,
                                  f"- 500 Error: {error_detail}")
                    
                except Exception as e:
                    error_text = response.text[:500]
                    self.errors_found.append(f"500 ERROR (unparseable): {error_text}")
                    self.log_result(f"PDF Generation - {invoice_number}", False,
                                  f"- 500 Error (unparseable): {error_text}")
                
                return False
                
            else:
                # Other HTTP errors
                try:
                    error_data = response.json()
                    error_detail = error_data.get('detail', 'Unknown error')
                except:
                    error_detail = response.text[:200]
                
                self.log_result(f"PDF Generation - {invoice_number}", False,
                              f"- HTTP {response.status_code}: {error_detail}")
                
                return False
                
        except Exception as e:
            self.log_result(f"PDF Generation - {invoice_number}", False,
                          f"- Request Exception: {str(e)}")
            self.errors_found.append(f"REQUEST EXCEPTION: {str(e)}")
            return False

    def run_investigation(self):
        """Run the PDF error investigation"""
        print("🎯 STARTING PDF GENERATION ERROR INVESTIGATION")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("❌ Authentication failed - cannot proceed")
            return False
        
        # Step 2: Get test invoices
        invoices = self.get_test_invoices()
        if not invoices:
            print("❌ No invoices available for testing")
            return False
        
        # Step 3: Test PDF generation for each invoice
        successful_tests = 0
        total_tests = len(invoices)
        
        for i, invoice in enumerate(invoices, 1):
            invoice_id = invoice.get('id', 'unknown')
            invoice_number = invoice.get('invoice_number', f'Invoice-{i}')
            
            success = self.test_pdf_generation_detailed(invoice_id, invoice_number)
            if success:
                successful_tests += 1
        
        # Step 4: Analysis and Recommendations
        print("\n" + "=" * 60)
        print("🎯 PDF ERROR INVESTIGATION RESULTS")
        print("=" * 60)
        
        print(f"📊 Test Results:")
        print(f"   Total Invoices Tested: {total_tests}")
        print(f"   Successful PDF Generation: {successful_tests}")
        print(f"   Failed PDF Generation: {total_tests - successful_tests}")
        print(f"   Success Rate: {(successful_tests/total_tests*100):.1f}%")
        
        if self.errors_found:
            print(f"\n🚨 CRITICAL ERRORS IDENTIFIED:")
            for i, error in enumerate(self.errors_found, 1):
                print(f"   {i}. {error}")
            
            print(f"\n💡 SPECIFIC FIXES NEEDED:")
            
            # Check for specific error patterns and provide exact fixes
            letter_error = any("'letter' is not defined" in error for error in self.errors_found)
            items_table_error = any("'items_table' is not defined" in error for error in self.errors_found)
            ta_right_error = any("TA_RIGHT" in error for error in self.errors_found)
            
            if letter_error:
                print("   🔧 FIX 1: 'letter' import issue")
                print("      - Check line ~1104 in server.py: pagesize=letter")
                print("      - Verify: from reportlab.lib.pagesizes import A4, letter")
                print("      - Possible solution: Use A4 instead of letter if import fails")
            
            if items_table_error:
                print("   🔧 FIX 2: 'items_table' variable issue")
                print("      - Check line ~1322 in server.py: elements.append(items_table)")
                print("      - Should be: elements.append(invoice_table)")
                print("      - Variable 'items_table' is not defined, but 'invoice_table' is")
            
            if ta_right_error:
                print("   🔧 FIX 3: 'TA_RIGHT' import issue")
                print("      - Check imports: from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT")
                print("      - Verify TA_RIGHT is properly imported and used")
            
            print(f"\n🎯 NEXT STEPS:")
            print("   1. Fix the identified code issues in server.py")
            print("   2. Restart the backend service")
            print("   3. Re-test PDF generation")
            print("   4. Verify all invoices can generate PDFs successfully")
            
        else:
            print("\n✅ No critical errors found - PDF generation working correctly")
        
        return successful_tests == total_tests

def main():
    """Main investigation execution"""
    investigator = PDFErrorInvestigator()
    
    try:
        success = investigator.run_investigation()
        
        if success:
            print("\n🎉 PDF GENERATION WORKING CORRECTLY!")
        else:
            print("\n❌ PDF GENERATION ISSUES IDENTIFIED - See fixes above")
        
    except Exception as e:
        print(f"\n💥 INVESTIGATION FAILED: {str(e)}")
        print(f"Stack trace: {traceback.format_exc()}")

if __name__ == "__main__":
    main()