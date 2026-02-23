#!/usr/bin/env python3
"""
ScrapOS ERP Backend API Testing Suite
Tests all major API endpoints for the Scrap Metal ERP system
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

class ScrapOSAPITester:
    def __init__(self, base_url="https://scrapos-erp-preview.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.company_id = None
        self.branch_id = None
        self.customer_id = None
        self.supplier_id = None
        self.scrap_item_id = None
        self.vat_code_id = None

    def log(self, message: str):
        """Log test messages"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                
                self.failed_tests.append({
                    'name': name,
                    'endpoint': endpoint,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'error': response.text[:200]
                })
                return False, {}

        except requests.exceptions.RequestException as e:
            self.log(f"❌ {name} - Network Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'endpoint': endpoint,
                'error': f"Network error: {str(e)}"
            })
            return False, {}

    def test_user_registration(self):
        """Test user registration with admin role"""
        test_email = f"test@scrapos.ae"
        test_data = {
            "email": test_email,
            "password": "Test@123",
            "full_name": "Test Admin User",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log(f"✅ Registered and logged in as: {test_email}")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": "test@scrapos.ae",
            "password": "Test@123"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_auth_me(self):
        """Test get current user"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)[0]

    def test_dashboard_kpis(self):
        """Test dashboard KPIs endpoint"""
        return self.run_test("Dashboard KPIs", "GET", "dashboard/kpis", 200)[0]

    def test_seed_data(self):
        """Test seed data creation"""
        success, response = self.run_test("Seed Data", "POST", "seed-data", 200)
        if success:
            self.log("✅ UAE seed data loaded successfully")
        return success

    def test_companies_crud(self):
        """Test Companies CRUD operations"""
        # Create company
        company_data = {
            "name": "Test Scrap Trading LLC",
            "code": "TST001",
            "address": "Dubai Industrial Area",
            "country": "UAE",
            "currency": "AED",
            "vat_number": "100123456789003",
            "phone": "+971-4-1234567",
            "email": "info@testscrap.ae"
        }
        
        success, response = self.run_test(
            "Create Company",
            "POST",
            "companies",
            200,
            data=company_data
        )
        
        if success and 'id' in response:
            self.company_id = response['id']
            self.log(f"✅ Created company with ID: {self.company_id}")
            
            # Test list companies
            list_success = self.run_test("List Companies", "GET", "companies", 200)[0]
            
            # Test get company
            get_success = self.run_test("Get Company", "GET", f"companies/{self.company_id}", 200)[0]
            
            return success and list_success and get_success
        
        return False

    def test_branches_crud(self):
        """Test Branches CRUD operations"""
        if not self.company_id:
            self.log("❌ Cannot test branches - no company_id")
            return False
            
        branch_data = {
            "name": "Main Yard Dubai",
            "code": "MYD001",
            "company_id": self.company_id,
            "address": "Al Qusais Industrial Area",
            "city": "Dubai",
            "country": "UAE",
            "is_yard": True
        }
        
        success, response = self.run_test(
            "Create Branch",
            "POST",
            "branches",
            200,
            data=branch_data
        )
        
        if success and 'id' in response:
            self.branch_id = response['id']
            self.log(f"✅ Created branch with ID: {self.branch_id}")
            
            # Test list branches
            list_success = self.run_test("List Branches", "GET", "branches", 200)[0]
            
            return success and list_success
        
        return False

    def test_customers_crud(self):
        """Test Customers CRUD operations"""
        if not self.company_id:
            self.log("❌ Cannot test customers - no company_id")
            return False
            
        customer_data = {
            "name": "ABC Steel Industries",
            "code": "CUST001",
            "type": "local",
            "company_id": self.company_id,
            "address": "Sharjah Industrial Area",
            "city": "Sharjah",
            "country": "UAE",
            "vat_number": "100987654321003",
            "phone": "+971-6-5555555",
            "email": "orders@abcsteel.ae",
            "currency": "AED",
            "credit_limit": 50000
        }
        
        success, response = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data=customer_data
        )
        
        if success and 'id' in response:
            self.customer_id = response['id']
            self.log(f"✅ Created customer with ID: {self.customer_id}")
            
            # Test list customers
            list_success = self.run_test("List Customers", "GET", "customers", 200)[0]
            
            return success and list_success
        
        return False

    def test_suppliers_crud(self):
        """Test Suppliers CRUD operations"""
        if not self.company_id:
            self.log("❌ Cannot test suppliers - no company_id")
            return False
            
        supplier_data = {
            "name": "Emirates Scrap Suppliers",
            "code": "SUPP001",
            "type": "local",
            "company_id": self.company_id,
            "address": "Abu Dhabi Industrial City",
            "city": "Abu Dhabi",
            "country": "UAE",
            "vat_number": "100555666777003",
            "phone": "+971-2-4444444",
            "email": "sales@emiratesscrap.ae",
            "currency": "AED"
        }
        
        success, response = self.run_test(
            "Create Supplier",
            "POST",
            "suppliers",
            200,
            data=supplier_data
        )
        
        if success and 'id' in response:
            self.supplier_id = response['id']
            self.log(f"✅ Created supplier with ID: {self.supplier_id}")
            
            # Test list suppliers
            list_success = self.run_test("List Suppliers", "GET", "suppliers", 200)[0]
            
            return success and list_success
        
        return False

    def test_vat_codes(self):
        """Test VAT Codes"""
        success, response = self.run_test("List VAT Codes", "GET", "vat-codes", 200)
        
        if success and response:
            # Find standard VAT code
            for vat in response:
                if vat.get('rate') == 5.0:
                    self.vat_code_id = vat['id']
                    break
            
            if self.vat_code_id:
                self.log(f"✅ Found VAT code with ID: {self.vat_code_id}")
            
        return success

    def test_scrap_items(self):
        """Test Scrap Items"""
        success, response = self.run_test("List Scrap Items", "GET", "scrap-items", 200)
        
        if success and response:
            # Get first scrap item for testing
            if response:
                self.scrap_item_id = response[0]['id']
                self.log(f"✅ Found scrap item with ID: {self.scrap_item_id}")
            
        return success

    def test_weighbridge_operations(self):
        """Test Weighbridge operations"""
        if not self.branch_id:
            self.log("❌ Cannot test weighbridge - no branch_id")
            return False
            
        # List weighbridges
        wb_success = self.run_test("List Weighbridges", "GET", "weighbridges", 200)
        
        # List weighbridge entries
        entries_success = self.run_test("List Weighbridge Entries", "GET", "weighbridge-entries", 200)
        
        return wb_success[0] and entries_success[0]

    def test_inventory_operations(self):
        """Test Inventory operations"""
        # Get inventory stock
        stock_success = self.run_test("Get Inventory Stock", "GET", "inventory/stock", 200)
        
        # Get inventory movements
        movements_success = self.run_test("Get Inventory Movements", "GET", "inventory/movements", 200)
        
        return stock_success[0] and movements_success[0]

    def test_purchase_operations(self):
        """Test Purchase operations"""
        # List local purchases
        local_success = self.run_test("List Local Purchases", "GET", "local-purchases", 200)
        
        # List international purchases
        intl_success = self.run_test("List International Purchases", "GET", "intl-purchases", 200)
        
        return local_success[0] and intl_success[0]

    def test_sales_operations(self):
        """Test Sales operations"""
        # List local sales
        local_success = self.run_test("List Local Sales", "GET", "local-sales", 200)
        
        # List export sales
        export_success = self.run_test("List Export Sales", "GET", "export-sales", 200)
        
        return local_success[0] and export_success[0]

    def test_reports_operations(self):
        """Test Reports operations"""
        # Test VAT report
        vat_success = self.run_test("VAT Report", "GET", "reports/vat", 200)
        
        return vat_success[0]

    def test_master_data_endpoints(self):
        """Test other master data endpoints"""
        endpoints = [
            ("currencies", "List Currencies"),
            ("ports", "List Ports"),
            ("incoterms", "List Incoterms"),
            ("payment-terms", "List Payment Terms"),
            ("brokers", "List Brokers"),
            ("scrap-categories", "List Scrap Categories")
        ]
        
        all_success = True
        for endpoint, name in endpoints:
            success = self.run_test(name, "GET", endpoint, 200)[0]
            all_success = all_success and success
            
        return all_success

    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting ScrapOS ERP Backend API Tests")
        self.log(f"📡 Testing against: {self.base_url}")
        
        # Authentication Tests
        self.log("\n📋 AUTHENTICATION TESTS")
        auth_success = self.test_user_registration()
        if not auth_success:
            # Try login if registration fails (user might already exist)
            auth_success = self.test_user_login()
        
        if not auth_success:
            self.log("❌ Authentication failed - cannot continue tests")
            return False
            
        self.test_auth_me()
        
        # Dashboard Tests
        self.log("\n📊 DASHBOARD TESTS")
        self.test_dashboard_kpis()
        
        # Seed Data Test
        self.log("\n🌱 SEED DATA TESTS")
        self.test_seed_data()
        
        # Master Data Tests
        self.log("\n🏢 MASTER DATA TESTS")
        self.test_companies_crud()
        self.test_branches_crud()
        self.test_customers_crud()
        self.test_suppliers_crud()
        self.test_vat_codes()
        self.test_scrap_items()
        self.test_master_data_endpoints()
        
        # Operations Tests
        self.log("\n⚖️ WEIGHBRIDGE TESTS")
        self.test_weighbridge_operations()
        
        self.log("\n📦 INVENTORY TESTS")
        self.test_inventory_operations()
        
        self.log("\n🛒 PURCHASE TESTS")
        self.test_purchase_operations()
        
        self.log("\n💰 SALES TESTS")
        self.test_sales_operations()
        
        self.log("\n📈 REPORTS TESTS")
        self.test_reports_operations()
        
        return True

    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*60)
        self.log("📊 TEST SUMMARY")
        self.log("="*60)
        self.log(f"Total Tests: {self.tests_run}")
        self.log(f"Passed: {self.tests_passed}")
        self.log(f"Failed: {len(self.failed_tests)}")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                self.log(f"  • {test['name']}: {test.get('error', 'Unknown error')}")
        
        self.log("="*60)

def main():
    """Main test execution"""
    tester = ScrapOSAPITester()
    
    try:
        success = tester.run_all_tests()
        tester.print_summary()
        
        # Return appropriate exit code
        if tester.tests_passed == tester.tests_run:
            return 0
        else:
            return 1
            
    except KeyboardInterrupt:
        tester.log("\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        tester.log(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())