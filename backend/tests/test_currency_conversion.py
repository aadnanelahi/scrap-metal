"""
Currency Conversion Bug Fix Tests
=================================
Tests for multi-currency support in ScrapOS ERP system.
Verifies that foreign currency transactions (USD) are properly converted to base currency (AED).

Features tested:
- Dashboard Total Sales with AED conversion
- Receivables Report with AED amounts for USD sales
- Payables Report with AED amounts for international purchases
- P&L Report data integrity
- Balance Sheet Report data integrity
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCurrencyConversion:
    """Tests for currency conversion in financial reports"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup for each test - ensures we have auth"""
        self.client = api_client
        self.token = auth_token
        self.client.headers.update({"Authorization": f"Bearer {self.token}"})
    
    # ==================== DASHBOARD TESTS ====================
    
    def test_dashboard_kpis_returns_data(self, api_client, auth_token):
        """Test that dashboard KPIs endpoint returns data"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/dashboard/kpis")
        
        assert response.status_code == 200, f"Dashboard KPIs failed: {response.text}"
        data = response.json()
        
        # Check required fields exist
        assert "total_sales" in data, "Missing total_sales in dashboard"
        assert "total_purchases" in data, "Missing total_purchases in dashboard"
        assert "gross_margin" in data, "Missing gross_margin in dashboard"
        
        print(f"Dashboard Total Sales: {data['total_sales']}")
        print(f"Dashboard Total Purchases: {data['total_purchases']}")
        print(f"Dashboard Gross Margin: {data['gross_margin']}")
    
    def test_dashboard_total_sales_includes_usd_converted_to_aed(self, api_client, auth_token):
        """Test that dashboard total_sales includes USD export sales converted to AED"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # First get export sales to find USD transactions
        export_response = api_client.get(f"{BASE_URL}/api/export-sales?status=posted")
        assert export_response.status_code == 200
        export_sales = export_response.json()
        
        # Check if there are any USD export sales
        usd_sales = [s for s in export_sales if s.get('currency') == 'USD']
        print(f"Found {len(usd_sales)} USD export sales")
        
        if usd_sales:
            # Calculate expected AED amount from USD sales
            expected_usd_converted = sum(
                s.get('total_amount', 0) * s.get('exchange_rate', 1) 
                for s in usd_sales
            )
            print(f"Expected USD->AED conversion total: {expected_usd_converted}")
            
            # Get dashboard and verify sales are converted
            dashboard_response = api_client.get(f"{BASE_URL}/api/dashboard/kpis")
            assert dashboard_response.status_code == 200
            dashboard = dashboard_response.json()
            
            # Total sales should include converted USD amount
            assert dashboard['total_sales'] >= expected_usd_converted, \
                f"Dashboard total_sales ({dashboard['total_sales']}) should include USD converted amount ({expected_usd_converted})"
            
            print(f"Dashboard total_sales ({dashboard['total_sales']}) includes USD converted amount")
    
    # ==================== RECEIVABLES REPORT TESTS ====================
    
    def test_receivables_report_returns_data(self, api_client, auth_token):
        """Test that receivables report endpoint returns data"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/accounting/reports/receivables")
        
        assert response.status_code == 200, f"Receivables report failed: {response.text}"
        data = response.json()
        
        # Check structure
        assert "summary" in data, "Missing summary in receivables report"
        assert "receivables" in data, "Missing receivables list"
        assert "count" in data, "Missing count field"
        
        print(f"Receivables Report - Count: {data['count']}")
        print(f"Receivables Report - Total: {data['summary'].get('total_receivables', 0)}")
    
    def test_receivables_report_has_aed_fields_for_usd_sales(self, api_client, auth_token):
        """Test that receivables report shows AED amounts for USD sales"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/accounting/reports/receivables")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check each receivable item
        usd_receivables = []
        for item in data.get('receivables', []):
            # Check if it's a USD transaction
            if item.get('currency') == 'USD':
                usd_receivables.append(item)
                
                # Verify AED fields exist
                assert 'invoice_amount_aed' in item, f"Missing invoice_amount_aed for {item.get('reference_number')}"
                assert 'balance_aed' in item, f"Missing balance_aed for {item.get('reference_number')}"
                assert 'paid_amount_aed' in item, f"Missing paid_amount_aed for {item.get('reference_number')}"
                
                # Verify AED amount is converted (USD * exchange_rate)
                original_amount = item.get('invoice_amount', 0)
                aed_amount = item.get('invoice_amount_aed', 0)
                exchange_rate = item.get('exchange_rate', 1)
                
                expected_aed = original_amount * exchange_rate
                
                # Allow small floating point difference
                assert abs(aed_amount - expected_aed) < 0.1, \
                    f"AED conversion mismatch: {aed_amount} != {expected_aed} (rate: {exchange_rate})"
                
                print(f"USD Receivable {item.get('reference_number')}: {item.get('currency')} {original_amount} -> AED {aed_amount} (rate: {exchange_rate})")
        
        print(f"Found {len(usd_receivables)} USD receivables with proper AED conversion")
    
    def test_receivables_summary_in_aed(self, api_client, auth_token):
        """Test that receivables summary totals are in AED"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/accounting/reports/receivables")
        
        assert response.status_code == 200
        data = response.json()
        
        summary = data.get('summary', {})
        
        # All summary amounts should be in AED (converted)
        print(f"Receivables Summary:")
        print(f"  Total Receivables: {summary.get('total_receivables', 0)}")
        print(f"  Current: {summary.get('current', 0)}")
        print(f"  1-30 Days: {summary.get('days_1_30', 0)}")
        print(f"  31-60 Days: {summary.get('days_31_60', 0)}")
        print(f"  61-90 Days: {summary.get('days_61_90', 0)}")
        print(f"  Over 90 Days: {summary.get('days_over_90', 0)}")
        
        # Verify total matches sum of aging buckets
        aging_sum = sum([
            summary.get('current', 0),
            summary.get('days_1_30', 0),
            summary.get('days_31_60', 0),
            summary.get('days_61_90', 0),
            summary.get('days_over_90', 0)
        ])
        
        assert abs(summary.get('total_receivables', 0) - aging_sum) < 1, \
            f"Total receivables ({summary.get('total_receivables')}) should equal sum of aging ({aging_sum})"
    
    # ==================== PAYABLES REPORT TESTS ====================
    
    def test_payables_report_returns_data(self, api_client, auth_token):
        """Test that payables report endpoint returns data"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/accounting/reports/payables")
        
        assert response.status_code == 200, f"Payables report failed: {response.text}"
        data = response.json()
        
        # Check structure
        assert "summary" in data, "Missing summary in payables report"
        assert "payables" in data, "Missing payables list"
        assert "count" in data, "Missing count field"
        
        print(f"Payables Report - Count: {data['count']}")
        print(f"Payables Report - Total: {data['summary'].get('total_payables', 0)}")
    
    def test_payables_report_has_aed_fields_for_intl_purchases(self, api_client, auth_token):
        """Test that payables report shows AED amounts for international (USD) purchases"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        response = api_client.get(f"{BASE_URL}/api/accounting/reports/payables")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check each payable item
        intl_payables = []
        for item in data.get('payables', []):
            # Check if it's an international (non-AED) transaction
            if item.get('currency') and item.get('currency') != 'AED':
                intl_payables.append(item)
                
                # Verify AED fields exist
                assert 'invoice_amount_aed' in item, f"Missing invoice_amount_aed for {item.get('reference_number')}"
                assert 'balance_aed' in item, f"Missing balance_aed for {item.get('reference_number')}"
                assert 'paid_amount_aed' in item, f"Missing paid_amount_aed for {item.get('reference_number')}"
                
                # Verify conversion is correct
                original_amount = item.get('invoice_amount', 0)
                aed_amount = item.get('invoice_amount_aed', 0)
                exchange_rate = item.get('exchange_rate', 1)
                
                expected_aed = original_amount * exchange_rate
                
                assert abs(aed_amount - expected_aed) < 0.1, \
                    f"AED conversion mismatch: {aed_amount} != {expected_aed}"
                
                print(f"Intl Payable {item.get('reference_number')}: {item.get('currency')} {original_amount} -> AED {aed_amount}")
        
        print(f"Found {len(intl_payables)} international payables with proper AED conversion")
    
    # ==================== P&L REPORT TESTS ====================
    
    def test_pnl_report_returns_data(self, api_client, auth_token):
        """Test that P&L report endpoint returns data without errors"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        # P&L requires start_date and end_date parameters
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        start_of_year = datetime.now().strftime("%Y-01-01")
        response = api_client.get(f"{BASE_URL}/api/accounting/reports/profit-loss?start_date={start_of_year}&end_date={today}")
        
        assert response.status_code == 200, f"P&L report failed: {response.text}"
        data = response.json()
        
        # Check structure
        assert "income" in data or "total_income" in data, "Missing income data in P&L"
        
        print(f"P&L Report Response: {list(data.keys())}")
    
    # ==================== BALANCE SHEET REPORT TESTS ====================
    
    def test_balance_sheet_returns_data(self, api_client, auth_token):
        """Test that Balance Sheet endpoint returns data without errors"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        # Balance Sheet requires as_of_date parameter
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        response = api_client.get(f"{BASE_URL}/api/accounting/reports/balance-sheet?as_of_date={today}")
        
        assert response.status_code == 200, f"Balance Sheet report failed: {response.text}"
        data = response.json()
        
        # Check structure
        assert "assets" in data or "total_assets" in data, "Missing assets data in Balance Sheet"
        
        print(f"Balance Sheet Response: {list(data.keys())}")
    
    # ==================== SPECIFIC USD SALE VERIFICATION ====================
    
    def test_specific_export_sale_currency_conversion(self, api_client, auth_token):
        """Test specific export sale EXP-202602-0001 currency conversion"""
        api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
        
        # Get all export sales
        response = api_client.get(f"{BASE_URL}/api/export-sales")
        assert response.status_code == 200
        export_sales = response.json()
        
        # Find the specific sale
        target_sale = None
        for sale in export_sales:
            order_num = sale.get('order_number') or sale.get('contract_number', '')
            if 'EXP-202602-0001' in order_num:
                target_sale = sale
                break
        
        if target_sale:
            currency = target_sale.get('currency', 'AED')
            total_amount = target_sale.get('total_amount', 0)
            exchange_rate = target_sale.get('exchange_rate', 1)
            
            print(f"Found EXP-202602-0001:")
            print(f"  Currency: {currency}")
            print(f"  Amount: {total_amount}")
            print(f"  Exchange Rate: {exchange_rate}")
            
            if currency == 'USD':
                expected_aed = total_amount * exchange_rate
                print(f"  Expected AED: {expected_aed}")
                
                # Verify in receivables report
                recv_response = api_client.get(f"{BASE_URL}/api/accounting/reports/receivables")
                if recv_response.status_code == 200:
                    recv_data = recv_response.json()
                    for recv in recv_data.get('receivables', []):
                        if 'EXP-202602-0001' in recv.get('reference_number', ''):
                            assert recv.get('invoice_amount_aed') is not None, "Missing invoice_amount_aed"
                            assert abs(recv.get('invoice_amount_aed', 0) - expected_aed) < 1, \
                                f"AED amount mismatch in receivables"
                            print(f"  Receivables AED Amount: {recv.get('invoice_amount_aed')}")
        else:
            print("EXP-202602-0001 not found in export sales - may not exist yet")


# ==================== FIXTURES ====================

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@scrapos.ae",
        "password": "Admin!234"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.text}")
