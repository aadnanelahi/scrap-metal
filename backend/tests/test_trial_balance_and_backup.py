"""
Test Trial Balance Report and Scheduled Backups APIs
Covers:
- GET /api/reports/trial-balance - Trial Balance Report
- GET /api/admin/backup-schedule - Get backup schedule settings
- POST /api/admin/backup-schedule - Save backup schedule settings
- POST /api/admin/backup-now - Run immediate backup
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@scrapos.ae"
ADMIN_PASSWORD = "password"

class TestAuth:
    """Get authentication token for tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin to get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        # API returns access_token
        assert "access_token" in data, f"No access_token in response: {data}"
        return data["access_token"]


class TestTrialBalanceAPI(TestAuth):
    """Trial Balance Report API Tests"""
    
    def test_trial_balance_report_success(self, admin_token):
        """Test GET /api/reports/trial-balance returns account balances"""
        response = requests.get(
            f"{BASE_URL}/api/reports/trial-balance",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Trial balance API failed: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "as_of_date" in data
        assert "generated_at" in data
        assert "accounts" in data
        assert isinstance(data["accounts"], list)
        assert "total_debit" in data
        assert "total_credit" in data
        assert "difference" in data
        assert "is_balanced" in data
        
        print(f"Trial Balance: Total Debit={data['total_debit']}, Total Credit={data['total_credit']}, Balanced={data['is_balanced']}")
        
    def test_trial_balance_with_date_filter(self, admin_token):
        """Test GET /api/reports/trial-balance with as_of_date parameter"""
        response = requests.get(
            f"{BASE_URL}/api/reports/trial-balance",
            params={"as_of_date": "2026-01-31"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["as_of_date"] == "2026-01-31"
        assert isinstance(data["accounts"], list)
        
    def test_trial_balance_accounts_structure(self, admin_token):
        """Test that each account in trial balance has proper structure"""
        response = requests.get(
            f"{BASE_URL}/api/reports/trial-balance",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["accounts"]) > 0:
            account = data["accounts"][0]
            assert "account_code" in account
            assert "account_name" in account
            assert "account_type" in account
            assert "debit" in account
            assert "credit" in account
            print(f"Sample account: {account['account_code']} - {account['account_name']}")
        
    def test_trial_balance_unauthorized(self):
        """Test GET /api/reports/trial-balance without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/reports/trial-balance")
        assert response.status_code in [401, 403]


class TestScheduledBackupAPIs(TestAuth):
    """Scheduled Backup API Tests"""
    
    def test_get_backup_schedule(self, admin_token):
        """Test GET /api/admin/backup-schedule returns schedule settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/backup-schedule",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Get backup schedule failed: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "enabled" in data
        assert "frequency" in data
        assert "time" in data
        assert "history" in data
        assert isinstance(data["enabled"], bool)
        assert data["frequency"] in ["daily", "weekly", "monthly"]
        
        print(f"Backup Schedule: Enabled={data['enabled']}, Frequency={data['frequency']}, Time={data['time']}")
        print(f"Backup History Count: {len(data['history'])}")
        
    def test_save_backup_schedule_enable(self, admin_token):
        """Test POST /api/admin/backup-schedule to enable daily backup"""
        schedule_data = {
            "enabled": True,
            "frequency": "daily",
            "time": "03:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/backup-schedule",
            json=schedule_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Save backup schedule failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert data["enabled"] == True
        
        # Verify settings were saved
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/backup-schedule",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["enabled"] == True
        assert verify_data["frequency"] == "daily"
        assert verify_data["time"] == "03:00"
        
    def test_save_backup_schedule_disable(self, admin_token):
        """Test POST /api/admin/backup-schedule to disable backup"""
        schedule_data = {
            "enabled": False,
            "frequency": "daily",
            "time": "02:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/backup-schedule",
            json=schedule_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] == False
        
    def test_save_backup_schedule_weekly(self, admin_token):
        """Test POST /api/admin/backup-schedule with weekly frequency"""
        schedule_data = {
            "enabled": True,
            "frequency": "weekly",
            "time": "04:30"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/backup-schedule",
            json=schedule_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        
    def test_save_backup_schedule_invalid_frequency(self, admin_token):
        """Test POST /api/admin/backup-schedule with invalid frequency returns 400"""
        schedule_data = {
            "enabled": True,
            "frequency": "invalid_freq",
            "time": "02:00"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/backup-schedule",
            json=schedule_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
    def test_save_backup_schedule_invalid_time(self, admin_token):
        """Test POST /api/admin/backup-schedule with invalid time returns 400"""
        schedule_data = {
            "enabled": True,
            "frequency": "daily",
            "time": "25:00"  # Invalid hour
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/backup-schedule",
            json=schedule_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400
        
    def test_run_backup_now(self, admin_token):
        """Test POST /api/admin/backup-now triggers immediate backup"""
        response = requests.post(
            f"{BASE_URL}/api/admin/backup-now",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Run backup now failed: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "message" in data
        assert "status" in data
        assert data["status"] == "success"
        
        print(f"Backup Now Result: {data['message']}")
        
        # Verify backup appears in history
        history_response = requests.get(
            f"{BASE_URL}/api/admin/backup-schedule",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert history_response.status_code == 200
        history_data = history_response.json()
        
        # Should have at least one backup in history
        assert len(history_data["history"]) >= 1
        latest_backup = history_data["history"][0]
        assert latest_backup["status"] == "success"
        if "total_records" in latest_backup:
            print(f"Latest backup total records: {latest_backup['total_records']}")
        
    def test_backup_schedule_unauthorized(self):
        """Test backup schedule endpoints without auth return 401"""
        response = requests.get(f"{BASE_URL}/api/admin/backup-schedule")
        assert response.status_code in [401, 403]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/backup-schedule",
            json={"enabled": True, "frequency": "daily", "time": "02:00"}
        )
        assert response.status_code in [401, 403]
        
        response = requests.post(f"{BASE_URL}/api/admin/backup-now")
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
