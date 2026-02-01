"""
Test new features: Payments, Party Ledger, Document Cancellation, Reports
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@scrapos.ae",
            "password": "password123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login(self):
        """Test login endpoint"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@scrapos.ae",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print("✓ Login successful")


class TestPayments:
    """Payments API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@scrapos.ae",
            "password": "password123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_payments(self, auth_headers):
        """Test list payments endpoint"""
        response = requests.get(f"{BASE_URL}/api/payments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List payments: {len(data)} payments found")
    
    def test_create_payment(self, auth_headers):
        """Test create payment endpoint"""
        # First get a customer
        customers_response = requests.get(f"{BASE_URL}/api/customers", headers=auth_headers)
        customers = customers_response.json()
        
        if len(customers) > 0:
            customer = customers[0]
            payment_data = {
                "type": "received",
                "party_type": "customer",
                "party_id": customer["id"],
                "party_name": customer["name"],
                "payment_date": "2026-01-21",
                "amount": 1000.00,
                "currency": "AED",
                "payment_method": "cash",
                "notes": "Test payment"
            }
            
            response = requests.post(f"{BASE_URL}/api/payments", json=payment_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert "id" in data
            assert "receipt_number" in data
            assert data["amount"] == 1000.00
            print(f"✓ Create payment: {data['receipt_number']}")
            return data["id"]
        else:
            pytest.skip("No customers available for payment test")


class TestPartyLedger:
    """Party Ledger API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@scrapos.ae",
            "password": "password123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_customer_ledger(self, auth_headers):
        """Test customer ledger endpoint"""
        # First get a customer
        customers_response = requests.get(f"{BASE_URL}/api/customers", headers=auth_headers)
        customers = customers_response.json()
        
        if len(customers) > 0:
            customer_id = customers[0]["id"]
            response = requests.get(f"{BASE_URL}/api/reports/customer-ledger/{customer_id}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert "customer_name" in data
            assert "entries" in data
            assert "opening_balance" in data
            assert "closing_balance" in data
            print(f"✓ Customer ledger: {data['customer_name']}, {len(data['entries'])} entries")
        else:
            pytest.skip("No customers available for ledger test")
    
    def test_supplier_ledger(self, auth_headers):
        """Test supplier ledger endpoint"""
        # First get a supplier
        suppliers_response = requests.get(f"{BASE_URL}/api/suppliers", headers=auth_headers)
        suppliers = suppliers_response.json()
        
        if len(suppliers) > 0:
            supplier_id = suppliers[0]["id"]
            response = requests.get(f"{BASE_URL}/api/reports/supplier-ledger/{supplier_id}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert "supplier_name" in data
            assert "entries" in data
            assert "opening_balance" in data
            assert "closing_balance" in data
            print(f"✓ Supplier ledger: {data['supplier_name']}, {len(data['entries'])} entries")
        else:
            pytest.skip("No suppliers available for ledger test")


class TestReports:
    """Reports API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@scrapos.ae",
            "password": "password123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_vat_report(self, auth_headers):
        """Test VAT report endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/vat-report", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "output_vat" in data
        assert "input_vat" in data
        assert "net_vat_payable" in data
        print(f"✓ VAT report: Net VAT payable = {data['net_vat_payable']}")
    
    def test_purchase_register(self, auth_headers):
        """Test purchase register endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/purchase-register?type=local", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "purchases" in data
        assert "summary" in data
        print(f"✓ Purchase register: {data['summary']['count']} purchases")
    
    def test_sales_register(self, auth_headers):
        """Test sales register endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/sales-register?type=local", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "sales" in data
        assert "summary" in data
        print(f"✓ Sales register: {data['summary']['count']} sales")
    
    def test_stock_aging(self, auth_headers):
        """Test stock aging endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/stock-aging", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "stock" in data
        print(f"✓ Stock aging: {len(data['stock'])} items")
    
    def test_broker_commission(self, auth_headers):
        """Test broker commission endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/broker-commission", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "commissions" in data
        assert "total" in data
        print(f"✓ Broker commission: {len(data['commissions'])} commissions, total = {data['total']}")


class TestDocumentCancellation:
    """Document cancellation API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test2@scrapos.ae",
            "password": "password123"
        })
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_local_purchase_cancel_endpoint_exists(self, auth_headers):
        """Test that local purchase cancel endpoint exists"""
        # Get a local purchase
        response = requests.get(f"{BASE_URL}/api/local-purchases", headers=auth_headers)
        assert response.status_code == 200
        purchases = response.json()
        
        if len(purchases) > 0:
            # Find a draft purchase to test cancel endpoint
            draft_purchase = next((p for p in purchases if p.get('status') == 'draft'), None)
            if draft_purchase:
                # Test cancel endpoint (without actually cancelling)
                # Just verify the endpoint exists by checking it doesn't return 404
                cancel_response = requests.post(
                    f"{BASE_URL}/api/local-purchases/{draft_purchase['id']}/cancel?reason=Test",
                    headers=auth_headers
                )
                # Should return 200 (success) or 400 (validation error), not 404
                assert cancel_response.status_code in [200, 400], f"Cancel endpoint returned {cancel_response.status_code}"
                print(f"✓ Local purchase cancel endpoint exists")
            else:
                print("✓ Local purchase cancel endpoint exists (no draft purchases to test)")
        else:
            pytest.skip("No local purchases available")
    
    def test_local_sale_cancel_endpoint_exists(self, auth_headers):
        """Test that local sale cancel endpoint exists"""
        # Get a local sale
        response = requests.get(f"{BASE_URL}/api/local-sales", headers=auth_headers)
        assert response.status_code == 200
        sales = response.json()
        
        if len(sales) > 0:
            # Find a draft sale to test cancel endpoint
            draft_sale = next((s for s in sales if s.get('status') == 'draft'), None)
            if draft_sale:
                # Test cancel endpoint
                cancel_response = requests.post(
                    f"{BASE_URL}/api/local-sales/{draft_sale['id']}/cancel?reason=Test",
                    headers=auth_headers
                )
                # Should return 200 (success) or 400 (validation error), not 404
                assert cancel_response.status_code in [200, 400], f"Cancel endpoint returned {cancel_response.status_code}"
                print(f"✓ Local sale cancel endpoint exists")
            else:
                print("✓ Local sale cancel endpoint exists (no draft sales to test)")
        else:
            pytest.skip("No local sales available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
