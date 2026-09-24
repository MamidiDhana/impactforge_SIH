import unittest
import json
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.db.migrate import run_migrations
from app.db.session import SessionLocal
from app.models.report import Report
from app.models.audit_log import AuditLog
from app.services.duplicate_analysis_service import (
    classify_duplicate_candidate,
    analyze_and_store_report_duplicates,
)


class ImpactForgeDuplicateTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        run_migrations()
        cls.client = TestClient(app)

        # Authenticate users for RBAC testing
        cls.tokens = {}
        for role, email in [
            ("citizen", "asha.rao@jharkhand.in"),
            ("government", "vikram.singh@jharkhand.gov.in"),
            ("admin", "admin@impactforge.org"),
            ("hei", "dean.rnd@bitmesra.ac.in"),
            ("faculty", "prof.menon@tiss.edu"),
            ("partner", "partner@impactforge.org"),
        ]:
            resp = cls.client.post(
                "/api/auth/login",
                json={"email": email, "password": "demo-password"},
            )
            assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
            cls.tokens[role] = resp.json()["access_token"]

    def auth_header(self, role: str) -> dict:
        return {"Authorization": f"Bearer {self.tokens[role]}"}

    # ==================== 1. Duplicate Classification Thresholds ====================
    def test_01_duplicate_classification_confirmed(self):
        """Score >= 0.85 with same locality and category is classified as confirmed_duplicate_candidate."""
        r1 = Report(
            problem_title="Severe drinking water pipeline rupture flooding street",
            category="Water and Sanitation",
            district="Ranchi",
            locality="Morabadi",
            status="Open",
            priority="High",
        )
        r2 = Report(
            problem_title="Severe drinking water pipeline burst flooding street",
            category="Water and Sanitation",
            district="Ranchi",
            locality="Morabadi",
            status="Open",
            priority="High",
        )
        classification, reasons = classify_duplicate_candidate(r1, r2, 0.90)
        self.assertEqual(classification, "confirmed_duplicate_candidate")
        self.assertTrue(any("Same locality" in r for r in reasons))
        self.assertTrue(any("Highly similar" in r for r in reasons))

    def test_02_duplicate_classification_likely(self):
        """Score in 0.75-0.84 range is classified as likely_duplicate."""
        r1 = Report(
            problem_title="Deep pothole causing accidents near roundabout",
            category="Roads and Transport",
            district="Dhanbad",
            locality="Bank More",
            status="Open",
            priority="Medium",
        )
        r2 = Report(
            problem_title="Multiple potholes near central market roundabout",
            category="Roads and Transport",
            district="Dhanbad",
            locality="Bank More",
            status="Open",
            priority="Medium",
        )
        classification, reasons = classify_duplicate_candidate(r1, r2, 0.78)
        self.assertEqual(classification, "likely_duplicate")
        self.assertTrue(any("Substantially similar" in r for r in reasons))

    def test_03_duplicate_classification_possible(self):
        """Score in 0.55-0.74 range is classified as possible_duplicate."""
        r1 = Report(
            problem_title="Broken streetlights in residential colony",
            category="Public Safety",
            district="Bokaro",
            locality="Sector 4",
            status="Open",
            priority="Low",
        )
        r2 = Report(
            problem_title="Dark streets due to failed lamp posts",
            category="Public Safety",
            district="Bokaro",
            locality="Sector 4",
            status="Open",
            priority="Low",
        )
        classification, reasons = classify_duplicate_candidate(r1, r2, 0.62)
        self.assertEqual(classification, "possible_duplicate")

    def test_04_duplicate_classification_not_duplicate(self):
        """Score < 0.55 is classified as not_duplicate."""
        r1 = Report(
            problem_title="Solar panel inverter failure at government high school",
            category="Education",
            district="Hazaribagh",
            locality="Sadar",
            status="Open",
            priority="Medium",
        )
        r2 = Report(
            problem_title="Garbage dumping along river bank",
            category="Environment",
            district="Deoghar",
            locality="Jasidih",
            status="Open",
            priority="Low",
        )
        classification, reasons = classify_duplicate_candidate(r1, r2, 0.20)
        self.assertEqual(classification, "not_duplicate")

    # ==================== 2. Status and Resolution Context Reasons ====================
    def test_05_resolved_report_handling(self):
        """When candidate is already resolved, explicit explainable reason is added."""
        r1 = Report(
            problem_title="Contaminated tap water with foul smell",
            category="Water and Sanitation",
            district="Ranchi",
            locality="Doranda",
            status="Open",
            priority="High",
        )
        r2 = Report(
            problem_title="Contaminated tap water smell and turbidity",
            category="Water and Sanitation",
            district="Ranchi",
            locality="Doranda",
            status="Resolved",
            priority="High",
        )
        classification, reasons = classify_duplicate_candidate(r1, r2, 0.88)
        self.assertEqual(classification, "confirmed_duplicate_candidate")
        self.assertIn("Existing report is already resolved", reasons)

    def test_06_in_progress_report_handling(self):
        """When candidate is in progress, explicit explainable reason is added."""
        r1 = Report(
            problem_title="Sewer overflow creating health hazard",
            category="Water and Sanitation",
            district="Jamshedpur",
            locality="Sakchi",
            status="Open",
            priority="High",
        )
        r2 = Report(
            problem_title="Sewer pipe overflow on commercial road",
            category="Water and Sanitation",
            district="Jamshedpur",
            locality="Sakchi",
            status="In Progress",
            priority="High",
        )
        classification, reasons = classify_duplicate_candidate(r1, r2, 0.86)
        self.assertIn("Existing report is currently in progress", reasons)

    # ==================== 3. No Candidate Result ====================
    def test_07_no_candidate_handling(self):
        """A completely unique civic report with no matches has no_candidates status."""
        from unittest.mock import patch

        with patch("app.services.similarity_service.find_similar_reports", return_value=[]), \
             patch("app.services.duplicate_analysis_service.find_similar_reports", return_value=[]):
            create_resp = self.client.post(
                "/api/reports",
                headers=self.auth_header("citizen"),
                json={
                    "title": "Quantum telescope sensor calibration anomaly",
                    "description": "Very unique research observatory diagnostic logging discrepancy.",
                    "category": "Education",
                    "state": "Jharkhand",
                    "district": "Simdega",
                    "locality": "Remote Border Hamlet",
                    "address_or_landmark": "Observatory Tower",
                    "priority": "Low",
                },
            )
            self.assertEqual(create_resp.status_code, 201)
            track_id = create_resp.json()["track_id"]

            gov_resp = self.client.get(
                f"/api/reports/{track_id}/duplicate-analysis",
                headers=self.auth_header("government"),
            )
            self.assertEqual(gov_resp.status_code, 200)
            data = gov_resp.json()
            self.assertEqual(data["track_id"], track_id)
            self.assertEqual(data["ai_duplicate_status"], "no_candidates")
            self.assertEqual(data["total_candidates"], 0)
            self.assertEqual(data["candidates"], [])

    # ==================== 4. RBAC: Unauthorized 401 & Disallowed 403 ====================
    def test_08_rbac_unauthenticated_401(self):
        """Unauthenticated requests to duplicate-analysis or duplicate-review return 401."""
        resp_get = self.client.get("/api/reports/IF-JH-2026-0001/duplicate-analysis")
        self.assertEqual(resp_get.status_code, 401)

        resp_patch = self.client.patch(
            "/api/reports/IF-JH-2026-0001/duplicate-review",
            json={
                "candidate_track_id": "IF-JH-2026-0002",
                "decision": "confirm_duplicate",
                "official_remarks": "Test review",
            },
        )
        self.assertEqual(resp_patch.status_code, 401)

    def test_09_rbac_disallowed_roles_403(self):
        """Citizens, HEI, Faculty, and Partner receive 403 Forbidden on duplicate endpoints."""
        track_id = "IF-JH-2026-0001"
        for role in ["citizen", "hei", "faculty", "partner"]:
            resp_get = self.client.get(
                f"/api/reports/{track_id}/duplicate-analysis",
                headers=self.auth_header(role),
            )
            self.assertEqual(resp_get.status_code, 403, f"Expected 403 for {role}")

            resp_patch = self.client.patch(
                f"/api/reports/{track_id}/duplicate-review",
                headers=self.auth_header(role),
                json={
                    "candidate_track_id": "IF-JH-2026-0002",
                    "decision": "confirm_duplicate",
                    "official_remarks": f"Unauthorized attempt by {role}",
                },
            )
            self.assertEqual(resp_patch.status_code, 403, f"Expected 403 for {role}")

    # ==================== 5. Malformed Review Requests ====================
    def test_10_malformed_review_requests_422(self):
        """Invalid review decisions, deprecated merge action, or missing remarks are rejected with 422."""
        # 1. Invalid decision enum
        resp1 = self.client.patch(
            "/api/reports/IF-JH-2026-0001/duplicate-review",
            headers=self.auth_header("government"),
            json={
                "candidate_track_id": "IF-JH-2026-0002",
                "decision": "auto_delete_and_merge",  # Invalid decision
                "official_remarks": "Test remarks",
            },
        )
        self.assertEqual(resp1.status_code, 422)

        # 2. Deprecated merge_duplicate decision is rejected with 422
        resp_merge = self.client.patch(
            "/api/reports/IF-JH-2026-0001/duplicate-review",
            headers=self.auth_header("government"),
            json={
                "candidate_track_id": "IF-JH-2026-0002",
                "decision": "merge_duplicate",
                "official_remarks": "Attempting merge",
            },
        )
        self.assertEqual(resp_merge.status_code, 422)

        # 3. Empty remarks
        resp2 = self.client.patch(
            "/api/reports/IF-JH-2026-0001/duplicate-review",
            headers=self.auth_header("government"),
            json={
                "candidate_track_id": "IF-JH-2026-0002",
                "decision": "confirm_duplicate",
                "official_remarks": "",  # Empty remarks
            },
        )
        self.assertEqual(resp2.status_code, 422)

    # ==================== 6. Successful Official Review & Audit Logging ====================
    def test_11_official_review_government_success(self):
        """Government official successfully reviews duplicate candidate; AuditLog row created."""
        # 1. Create a base report
        c1 = self.client.post(
            "/api/reports",
            headers=self.auth_header("citizen"),
            json={
                "title": "Major water pipe leak flooding residential lane",
                "description": "Clean drinking water leaking heavily from ruptured pipe line.",
                "category": "Water and Sanitation",
                "state": "Jharkhand",
                "district": "Ranchi",
                "locality": "Kanke",
                "address_or_landmark": "Near Kanke Block Office",
                "priority": "High",
            },
        )
        self.assertEqual(c1.status_code, 201)
        t1 = c1.json()["track_id"]

        # 2. Create duplicate candidate
        c2 = self.client.post(
            "/api/reports",
            headers=self.auth_header("citizen"),
            json={
                "title": "Major water pipe burst flooding residential lane",
                "description": "Clean drinking water bursting heavily from ruptured pipe line.",
                "category": "Water and Sanitation",
                "state": "Jharkhand",
                "district": "Ranchi",
                "locality": "Kanke",
                "address_or_landmark": "Near Kanke Block Office",
                "priority": "High",
            },
        )
        self.assertEqual(c2.status_code, 201)
        t2 = c2.json()["track_id"]

        # 3. Government submits official review
        remarks_text = "Verified on site by Municipal Water Engineer; duplicate confirmed."
        review_resp = self.client.patch(
            f"/api/reports/{t2}/duplicate-review",
            headers=self.auth_header("government"),
            json={
                "candidate_track_id": t1,
                "decision": "confirm_duplicate",
                "official_remarks": remarks_text,
            },
        )
        self.assertEqual(review_resp.status_code, 200)
        review_data = review_resp.json()
        self.assertEqual(review_data["ai_duplicate_status"], "reviewed")

        # 4. Verify candidate has official review attached
        candidate_entry = next((c for c in review_data["candidates"] if c["matching_track_id"] == t1), None)
        self.assertIsNotNone(candidate_entry)
        self.assertIsNotNone(candidate_entry["official_review"])
        self.assertEqual(candidate_entry["official_review"]["decision"], "confirm_duplicate")
        self.assertEqual(candidate_entry["official_review"]["official_remarks"], remarks_text)
        self.assertEqual(candidate_entry["official_review"]["reviewed_by_role"], "government")

        # 5. Verify AuditLog entry in database
        db = SessionLocal()
        try:
            audit = (
                db.query(AuditLog)
                .filter(
                    AuditLog.action == "official_duplicate_review",
                    AuditLog.entity_id == t2,
                )
                .order_by(AuditLog.id.desc())
                .first()
            )
            self.assertIsNotNone(audit)
            meta = json.loads(audit.metadata_json)
            self.assertEqual(meta["source_track_id"], t2)
            self.assertEqual(meta["candidate_track_id"], t1)
            self.assertEqual(meta["decision"], "confirm_duplicate")
            self.assertEqual(meta["official_remarks"], remarks_text)
            self.assertEqual(meta["reviewer_role"], "government")
        finally:
            db.close()

    def test_12_official_review_admin_success(self):
        """Super Admin can review duplicate candidate as 'not_duplicate'."""
        track_id = "IF-JH-2026-0001"
        cand_id = "IF-JH-2026-0002"
        review_resp = self.client.patch(
            f"/api/reports/{track_id}/duplicate-review",
            headers=self.auth_header("admin"),
            json={
                "candidate_track_id": cand_id,
                "decision": "not_duplicate",
                "official_remarks": "Distinct issues in different municipal wards.",
            },
        )
        self.assertEqual(review_resp.status_code, 200)
        review_data = review_resp.json()
        self.assertEqual(review_data["ai_duplicate_status"], "reviewed")

    # ==================== 7. Zero Auto-Mutation Guarantees ====================
    def test_13_no_auto_mutation_status_priority(self):
        """Official review never automatically changes status or priority, and never deletes reports."""
        import uuid
        unique_track = f"IF-JH-MUT-{uuid.uuid4().hex[:6]}"
        db = SessionLocal()
        try:
            # Create report with specific status and priority
            r = Report(
                track_id=unique_track,
                problem_title="Manhole cover missing on footpath",
                category="Public Safety",
                district="Ranchi",
                locality="Lalpur",
                address_or_landmark="Near Lalpur Chowk",
                priority="Critical",
                status="Open",
            )
            db.add(r)
            db.commit()

            # Submit review
            resp = self.client.patch(
                f"/api/reports/{unique_track}/duplicate-review",
                headers=self.auth_header("government"),
                json={
                    "candidate_track_id": "IF-JH-2026-0001",
                    "decision": "confirm_duplicate",
                    "official_remarks": "Duplicate confirmed by official inspector.",
                },
            )
            self.assertEqual(resp.status_code, 200)

            # Query database directly to confirm status transition and preservation
            db.refresh(r)
            self.assertEqual(r.status, "Duplicate", "Status should transition to Duplicate on confirm_duplicate!")
            self.assertEqual(r.verification_status, "Duplicate")
            self.assertEqual(r.priority, "Critical", "Priority must be preserved!")
            self.assertIsNone(r.resolved_at, "Must not auto-resolve report!")
        finally:
            db.close()

    # ==================== 8. Existing Parts 1, 2, 3, 4 Concurrency Intact ====================
    def test_14_existing_features_intact(self):
        """Verify report creation populates Part 1, Part 2, Part 3, and Part 4 concurrently."""
        create_resp = self.client.post(
            "/api/reports",
            headers=self.auth_header("citizen"),
            json={
                "title": "Open high voltage electrical wire sparking creating hazard",
                "description": "Exposed power wire near market entrance creating electrocution danger.",
                "category": "Public Safety",
                "state": "Jharkhand",
                "district": "Ranchi",
                "locality": "Hinoo",
                "address_or_landmark": "Near Main Gate",
                "priority": "Critical",
            },
        )
        self.assertEqual(create_resp.status_code, 201)
        rep = create_resp.json()

        # Official properties untouched
        self.assertEqual(rep["status"], "Open")

        # Part 1: Categorization populated
        self.assertEqual(rep["ai_category"], "Public Safety")

        # Part 2: Priority scoring populated
        self.assertIn(rep["ai_priority"], ["High", "Critical"])
        self.assertGreaterEqual(rep["ai_priority_score"], 50)

        # Part 3: Similar problems populated
        self.assertIn(rep["ai_similarity_status"], ["completed", "no_matches", "needs_review"])
        self.assertIsInstance(rep["ai_similarity_matches"], list)

        # Part 4: Duplicate analysis populated
        self.assertIn(rep["ai_duplicate_status"], ["no_candidates", "needs_review", "completed", "reviewed"])
        self.assertIsInstance(rep["ai_duplicate_candidates"], list)

    def test_15_citizen_name_and_affected_people_persistence(self):
        """Verify citizen submitter name and affected people count are saved and retrieved correctly."""
        create_resp = self.client.post(
            "/api/reports",
            headers=self.auth_header("citizen"),
            json={
                "title": "Severe contaminated ground water supply affecting community",
                "description": "Ground water smells of sulfur and 750 residents are affected.",
                "district": "Dhanbad",
                "locality": "Jharia",
                "address_or_landmark": "Ward 4 Community Center",
                "affected_people": 750,
            },
        )
        self.assertEqual(create_resp.status_code, 201)
        data = create_resp.json()
        track_id = data["track_id"]
        self.assertEqual(data["affected_people"], 750)
        self.assertEqual(data["citizen_name"], "Asha Rao")

        # Lookup via GET /api/reports/{track_id}
        get_resp = self.client.get(f"/api/reports/{track_id}")
        self.assertEqual(get_resp.status_code, 200)
        lookup_data = get_resp.json()
        self.assertEqual(lookup_data["affected_people"], 750)
        self.assertEqual(lookup_data["citizen_name"], "Asha Rao")

    def test_16_duplicate_linking_preserves_citizen_info(self):
        """Verify linking duplicate problem preserves affected people and citizen name in PostgreSQL."""
        # 1. Create canonical problem
        can_resp = self.client.post(
            "/api/reports",
            headers=self.auth_header("citizen"),
            json={
                "title": "Broken transformer in Sector 3 causing blackout",
                "description": "Power outage in Sector 3 for past 24 hours.",
                "district": "Bokaro",
                "locality": "Sector 3",
                "address_or_landmark": "Near Main Substation",
                "affected_people": 1200,
            },
        )
        self.assertEqual(can_resp.status_code, 201)
        can_track_id = can_resp.json()["track_id"]

        # 2. Create duplicate problem
        dup_resp = self.client.post(
            "/api/reports",
            headers=self.auth_header("citizen"),
            json={
                "title": "Blackout in Sector 3 due to damaged substation",
                "description": "Entire block without power due to blown transformer.",
                "district": "Bokaro",
                "locality": "Sector 3",
                "address_or_landmark": "Substation area",
                "affected_people": 450,
            },
        )
        self.assertEqual(dup_resp.status_code, 201)
        dup_track_id = dup_resp.json()["track_id"]

        # 3. Government officer links duplicate to canonical
        review_resp = self.client.patch(
            f"/api/reports/{dup_track_id}/duplicate-review",
            headers=self.auth_header("government"),
            json={
                "candidate_track_id": can_track_id,
                "decision": "confirm_duplicate",
                "official_remarks": "Confirmed duplicate issue in Sector 3 Bokaro.",
            },
        )
        self.assertEqual(review_resp.status_code, 200)

        # 4. Verify duplicate problem status is Duplicate and info preserved
        get_dup = self.client.get(f"/api/reports/{dup_track_id}")
        self.assertEqual(get_dup.status_code, 200)
        dup_data = get_dup.json()
        self.assertEqual(dup_data["status"], "Duplicate")
        self.assertEqual(dup_data["affected_people"], 450)
        self.assertEqual(dup_data["citizen_name"], "Asha Rao")


if __name__ == "__main__":
    unittest.main()
