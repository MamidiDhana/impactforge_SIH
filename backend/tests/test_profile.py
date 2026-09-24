import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.migrate import run_migrations


class ProfileApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        run_migrations()
        cls.client = TestClient(app)

        # Login as Government officer
        resp = cls.client.post(
            "/api/auth/login",
            json={"email": "vikram.singh@jharkhand.gov.in", "password": "demo-password"},
        )
        assert resp.status_code == 200, f"Login failed for government: {resp.text}"
        cls.gov_token = resp.json()["access_token"]

        # Login as Citizen
        resp_citizen = cls.client.post(
            "/api/auth/login",
            json={"email": "asha.rao@jharkhand.in", "password": "demo-password"},
        )
        assert resp_citizen.status_code == 200
        cls.citizen_token = resp_citizen.json()["access_token"]

    def auth_header(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    # ==================== 1. Fetch Profile (GET /api/profile/me) ====================

    def test_01_get_profile_unauthorized(self):
        resp = self.client.get("/api/profile/me")
        self.assertEqual(resp.status_code, 401)

    def test_02_get_profile_government_success(self):
        resp = self.client.get("/api/profile/me", headers=self.auth_header(self.gov_token))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["email"], "vikram.singh@jharkhand.gov.in")
        self.assertEqual(data["role"], "government")
        self.assertIn("full_name", data)
        self.assertIn("department", data)
        self.assertIn("designation", data)
        self.assertIn("office_location", data)
        self.assertIn("phone", data)

    def test_03_get_profile_citizen_isolation(self):
        resp = self.client.get("/api/profile/me", headers=self.auth_header(self.citizen_token))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["email"], "asha.rao@jharkhand.in")
        self.assertEqual(data["role"], "citizen")

    # ==================== 2. Edit Profile (PUT /api/profile/me) ====================

    def test_04_update_profile_unauthorized(self):
        resp = self.client.put("/api/profile/me", json={"full_name": "Unauthorized Attempt"})
        self.assertEqual(resp.status_code, 401)

    def test_05_update_profile_government_success(self):
        payload = {
            "full_name": "Vikramaditya Singh",
            "department": "District Innovation Cell & Urban Development",
            "designation": "Senior Government Validator",
            "phone": "+91 94311 00099",
            "office_location": "Ranchi Collectorate, Jharkhand",
        }
        resp = self.client.put(
            "/api/profile/me",
            json=payload,
            headers=self.auth_header(self.gov_token),
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["full_name"], "Vikramaditya Singh")
        self.assertEqual(data["department"], "District Innovation Cell & Urban Development")
        self.assertEqual(data["designation"], "Senior Government Validator")
        self.assertEqual(data["phone"], "+91 94311 00099")
        self.assertEqual(data["office_location"], "Ranchi Collectorate, Jharkhand")
        self.assertEqual(data["email"], "vikram.singh@jharkhand.gov.in")  # Email remains untouched

        # Verify profile retrieval reflects updated values
        get_resp = self.client.get("/api/profile/me", headers=self.auth_header(self.gov_token))
        self.assertEqual(get_resp.status_code, 200)
        get_data = get_resp.json()
        self.assertEqual(get_data["full_name"], "Vikramaditya Singh")
        self.assertEqual(get_data["department"], "District Innovation Cell & Urban Development")

    def test_06_update_profile_validation_errors(self):
        # Invalid phone format
        resp = self.client.put(
            "/api/profile/me",
            json={"phone": "invalid-phone!!!"},
            headers=self.auth_header(self.gov_token),
        )
        self.assertEqual(resp.status_code, 422)

        # Name too short
        resp2 = self.client.put(
            "/api/profile/me",
            json={"full_name": "A"},
            headers=self.auth_header(self.gov_token),
        )
        self.assertEqual(resp2.status_code, 422)

    # ==================== 3. Change Password (POST /api/profile/change-password) ====================

    def test_07_change_password_unauthorized(self):
        resp = self.client.post(
            "/api/profile/change-password",
            json={
                "current_password": "demo-password",
                "new_password": "new-secure-password",
                "confirm_password": "new-secure-password",
            },
        )
        self.assertEqual(resp.status_code, 401)

    def test_08_change_password_wrong_current(self):
        resp = self.client.post(
            "/api/profile/change-password",
            json={
                "current_password": "wrong-current-password",
                "new_password": "new-secure-password",
                "confirm_password": "new-secure-password",
            },
            headers=self.auth_header(self.gov_token),
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Current password is incorrect", resp.json()["detail"])

    def test_09_change_password_mismatch(self):
        resp = self.client.post(
            "/api/profile/change-password",
            json={
                "current_password": "demo-password",
                "new_password": "new-secure-password-123",
                "confirm_password": "different-confirm-password",
            },
            headers=self.auth_header(self.gov_token),
        )
        self.assertEqual(resp.status_code, 422)

    def test_10_change_password_same_as_current(self):
        resp = self.client.post(
            "/api/profile/change-password",
            json={
                "current_password": "demo-password",
                "new_password": "demo-password",
                "confirm_password": "demo-password",
            },
            headers=self.auth_header(self.gov_token),
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("must be different", resp.json()["detail"])

    def test_11_change_password_success_and_relogin(self):
        new_pw = "JharkhandGov#2026Secure"
        resp = self.client.post(
            "/api/profile/change-password",
            json={
                "current_password": "demo-password",
                "new_password": new_pw,
                "confirm_password": new_pw,
            },
            headers=self.auth_header(self.gov_token),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["message"], "Password changed successfully.")

        # Verify old password fails to log in
        fail_login = self.client.post(
            "/api/auth/login",
            json={"email": "vikram.singh@jharkhand.gov.in", "password": "demo-password"},
        )
        self.assertEqual(fail_login.status_code, 401)

        # Verify new password succeeds
        success_login = self.client.post(
            "/api/auth/login",
            json={"email": "vikram.singh@jharkhand.gov.in", "password": new_pw},
        )
        self.assertEqual(success_login.status_code, 200)
        new_token = success_login.json()["access_token"]

        # Restore original demo password so other test suites aren't impacted
        restore_resp = self.client.post(
            "/api/profile/change-password",
            json={
                "current_password": new_pw,
                "new_password": "demo-password",
                "confirm_password": "demo-password",
            },
            headers=self.auth_header(new_token),
        )
        self.assertEqual(restore_resp.status_code, 200)


if __name__ == "__main__":
    unittest.main()
