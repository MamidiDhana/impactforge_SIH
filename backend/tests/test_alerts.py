import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db.migrate import run_migrations


class AlertsApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        run_migrations()
        cls.client = TestClient(app)

        # Login as Government officer
        resp_gov = cls.client.post(
            "/api/auth/login",
            json={"email": "vikram.singh@jharkhand.gov.in", "password": "demo-password"},
        )
        assert resp_gov.status_code == 200, f"Login failed for government: {resp_gov.text}"
        cls.gov_token = resp_gov.json()["access_token"]

        # Login as Citizen
        resp_citizen = cls.client.post(
            "/api/auth/login",
            json={"email": "asha.rao@jharkhand.in", "password": "demo-password"},
        )
        assert resp_citizen.status_code == 200
        cls.citizen_token = resp_citizen.json()["access_token"]

    def auth_header(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    # ==================== 1. Fetch Alerts ====================

    def test_01_get_alerts_unauthorized(self):
        resp = self.client.get("/api/alerts")
        self.assertEqual(resp.status_code, 401)

    def test_02_get_alerts_government_success(self):
        resp = self.client.get("/api/alerts", headers=self.auth_header(self.gov_token))
        self.assertEqual(resp.status_code, 200)
        alerts = resp.json()
        self.assertIsInstance(alerts, list)
        self.assertGreater(len(alerts), 0)

        # Check fields of an alert item
        first = alerts[0]
        self.assertIn("id", first)
        self.assertIn("title", first)
        self.assertIn("message", first)
        self.assertIn("type", first)
        self.assertIn("priority", first)
        self.assertIn("is_read", first)
        self.assertIn("created_at", first)

    def test_03_get_alerts_unread_count(self):
        resp = self.client.get("/api/alerts/unread-count", headers=self.auth_header(self.gov_token))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("unread_count", data)
        self.assertIsInstance(data["unread_count"], int)

    def test_04_get_alerts_unread_filter(self):
        resp = self.client.get("/api/alerts?unread_only=true", headers=self.auth_header(self.gov_token))
        self.assertEqual(resp.status_code, 200)
        alerts = resp.json()
        for a in alerts:
            self.assertFalse(a["is_read"])

    # ==================== 2. Mark as Read Actions ====================

    def test_05_mark_single_alert_as_read(self):
        # Fetch unread alert
        resp = self.client.get("/api/alerts?unread_only=true", headers=self.auth_header(self.gov_token))
        self.assertEqual(resp.status_code, 200)
        unread_alerts = resp.json()
        if not unread_alerts:
            return  # skip if none unread

        target_id = unread_alerts[0]["id"]
        patch_resp = self.client.patch(
            f"/api/alerts/{target_id}/read",
            headers=self.auth_header(self.gov_token),
        )
        self.assertEqual(patch_resp.status_code, 200)
        updated = patch_resp.json()
        self.assertTrue(updated["is_read"])
        self.assertIsNotNone(updated.get("read_at"))

    def test_06_mark_all_alerts_as_read(self):
        resp = self.client.patch("/api/alerts/mark-all-read", headers=self.auth_header(self.gov_token))
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("message", data)

        # Verify unread count is 0
        count_resp = self.client.get("/api/alerts/unread-count", headers=self.auth_header(self.gov_token))
        self.assertEqual(count_resp.status_code, 200)
        self.assertEqual(count_resp.json()["unread_count"], 0)

    # ==================== 3. Dismiss Alert ====================

    def test_07_dismiss_alert(self):
        resp = self.client.get("/api/alerts", headers=self.auth_header(self.gov_token))
        self.assertEqual(resp.status_code, 200)
        alerts = resp.json()
        if not alerts:
            return

        target_id = alerts[0]["id"]
        dismiss_resp = self.client.patch(
            f"/api/alerts/{target_id}/dismiss",
            headers=self.auth_header(self.gov_token),
        )
        self.assertEqual(dismiss_resp.status_code, 200)
        self.assertTrue(dismiss_resp.json()["is_dismissed"])


if __name__ == "__main__":
    unittest.main()
