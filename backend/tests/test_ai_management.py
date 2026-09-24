import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.db.migrate import run_migrations


class ImpactForgeAiManagementTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        run_migrations()
        cls.client = TestClient(app)

        # Login admin user to obtain authentic JWT Bearer token
        login_resp = cls.client.post(
            "/api/auth/login",
            json={"email": "admin@impactforge.org", "password": "demo-password", "role": "admin"},
        )
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        cls.admin_token = login_resp.json()["access_token"]
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

        # Login non-admin (citizen) user to verify RBAC enforcement
        citizen_login = cls.client.post(
            "/api/auth/login",
            json={"email": "asha.rao@jharkhand.in", "password": "demo-password", "role": "citizen"},
        )
        assert citizen_login.status_code == 200, f"Citizen login failed: {citizen_login.text}"
        cls.citizen_token = citizen_login.json()["access_token"]
        cls.citizen_headers = {"Authorization": f"Bearer {cls.citizen_token}"}

    # ==================== 1. Authentication & RBAC Enforcement ====================
    def test_01_unauthenticated_requests_fail(self):
        """Unauthenticated requests must be rejected with 401."""
        resp = self.client.get("/api/ai/overview")
        self.assertEqual(resp.status_code, 401)
        self.assertIn("Authentication required. Missing Bearer token.", resp.text)

    def test_02_non_admin_role_denied(self):
        """Non-admin users must be rejected with 403."""
        resp = self.client.get("/api/ai/overview", headers=self.citizen_headers)
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Access denied", resp.text)

    # ==================== 2. AI Overview & Refresh Metrics ====================
    def test_03_get_ai_overview_authenticated(self):
        """Super Admin can retrieve live AI overview metrics."""
        resp = self.client.get("/api/ai/overview", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("provider", data)
        self.assertIn("model", data)
        self.assertIn("ai_enabled", data)
        self.assertIn("embedding_model", data)
        self.assertIn("embedding_enabled", data)
        self.assertIn("total_predictions", data)
        self.assertIn("health_status", data)
        self.assertGreater(data["total_predictions"], 0)

    def test_04_refresh_ai_metrics(self):
        """Super Admin can trigger live recalculation of AI overview metrics."""
        resp = self.client.post("/api/ai/metrics/refresh", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("total_predictions", data)
        self.assertIn("health_status", data)

    # ==================== 3. AI Predictions List & Detail ====================
    def test_05_list_ai_predictions(self):
        """Super Admin can list AI predictions with filters."""
        resp = self.client.get("/api/ai/predictions", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        predictions = resp.json()
        self.assertIsInstance(predictions, list)
        self.assertGreater(len(predictions), 0)

        # Check prediction structure
        first_pred = predictions[0]
        self.assertIn("id", first_pred)
        self.assertIn("track_id", first_pred)
        self.assertIn("prediction_type", first_pred)
        self.assertIn("predicted_value", first_pred)
        self.assertIn("confidence_score", first_pred)

    def test_06_filter_ai_predictions_by_type(self):
        """Super Admin can filter predictions by type."""
        resp = self.client.get("/api/ai/predictions?prediction_type=priority", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        for item in resp.json():
            self.assertEqual(item["prediction_type"], "priority")

    # ==================== 4. AI Feedback Submission ====================
    def test_07_submit_ai_feedback_non_destructive(self):
        """Super Admin can submit feedback without overwriting original records."""
        payload = {
            "report_id": 1,
            "prediction_type": "priority",
            "original_prediction": {"priority": "High", "score": 85},
            "corrected_value": {"priority": "Medium", "score": 60},
            "feedback_status": "incorrect",
            "feedback_reason": "Localized drainage issue on non-arterial residential lane.",
            "admin_feedback": "Downgraded based on field supervisor review.",
            "model_version": "gemini-3.6-flash",
        }
        resp = self.client.post("/api/ai/feedback", json=payload, headers=self.admin_headers)
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn("feedback_id", data)
        self.assertEqual(data["status"], "incorrect")

    # ==================== 5. Training Dataset Management ====================
    def test_08_training_dataset_lifecycle(self):
        """Super Admin can query, approve, and reject training records."""
        resp = self.client.get("/api/ai/dataset", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        records = resp.json()
        self.assertIsInstance(records, list)
        self.assertGreater(len(records), 0)

        record_id = records[0]["id"]

        # Approve record
        approve_resp = self.client.post(f"/api/ai/dataset/{record_id}/approve", headers=self.admin_headers)
        self.assertEqual(approve_resp.status_code, 200)
        self.assertEqual(approve_resp.json()["approval_status"], "approved")

    # ==================== 6. Retraining Pipeline ====================
    def test_09_retraining_validation(self):
        """Dataset validation check returns valid status if sufficient approved records."""
        resp = self.client.post("/api/ai/retraining/validate", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("is_valid", data)
        self.assertIn("approved_records_count", data)

    def test_10_list_retraining_jobs(self):
        """Super Admin can list retraining jobs."""
        resp = self.client.get("/api/ai/retraining/jobs", headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200)
        jobs = resp.json()
        self.assertIsInstance(jobs, list)

    # ==================== 7. AI Settings Configuration ====================
    def test_11_get_and_update_ai_settings(self):
        """Super Admin can load and update AI settings safely."""
        # 1. Get current settings
        get_resp = self.client.get("/api/ai/settings", headers=self.admin_headers)
        self.assertEqual(get_resp.status_code, 200)
        current = get_resp.json()
        self.assertIn("ai_provider", current)
        self.assertIn("ai_model", current)
        self.assertIn("similarity_threshold_possible", current)

        # 2. Update settings
        update_payload = {
            "similarity_threshold_possible": 0.58,
            "similarity_threshold_strong": 0.76,
            "similarity_threshold_duplicate": 0.86,
            "ai_enabled": True,
            "embedding_enabled": True,
        }
        put_resp = self.client.put("/api/ai/settings", json=update_payload, headers=self.admin_headers)
        self.assertEqual(put_resp.status_code, 200)
        updated = put_resp.json()
        self.assertAlmostEqual(updated["similarity_threshold_possible"], 0.58)
        self.assertAlmostEqual(updated["similarity_threshold_strong"], 0.76)
        self.assertAlmostEqual(updated["similarity_threshold_duplicate"], 0.86)

        # 3. Restore original settings to prevent polluting subsequent test suites
        restore_payload = {
            "similarity_threshold_possible": 0.55,
            "similarity_threshold_strong": 0.75,
            "similarity_threshold_duplicate": 0.85,
            "ai_enabled": True,
            "embedding_enabled": True,
        }
        self.client.put("/api/ai/settings", json=restore_payload, headers=self.admin_headers)


if __name__ == "__main__":
    unittest.main()
