import unittest
import uuid
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.report import Report
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.hei import HEIProfile, HEIInterest
from app.schemas.capability_schema import ExtractedCapabilities
from app.db.migrate import run_migrations
from app.services.hei_matching_service import (
    calculate_hei_match,
    match_report_to_heis,
    SEED_HEI_PROFILES,
    analyze_and_store_report_hei_matches,
)


class TestHEIMatching(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        run_migrations()
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        def get_token(email, password="demo-password"):
            resp = cls.client.post("/api/auth/login", json={"email": email, "password": password})
            if resp.status_code == 200:
                return resp.json()["access_token"]
            raise ValueError(f"Login failed for {email}: {resp.status_code} {resp.text}")

        cls.citizen_token = get_token("asha.rao@jharkhand.in")
        cls.gov_token = get_token("vikram.singh@jharkhand.gov.in")
        cls.hei_token = get_token("dean.rnd@bitmesra.ac.in")
        cls.faculty_token = get_token("prof.menon@tiss.edu")
        cls.partner_token = get_token("partner@impactforge.org")
        cls.admin_token = get_token("admin@impactforge.org")

        cls.citizen_user = cls.db.query(User).filter(User.email == "asha.rao@jharkhand.in").first()
        cls.gov_user = cls.db.query(User).filter(User.email == "vikram.singh@jharkhand.gov.in").first()
        cls.hei_user = cls.db.query(User).filter(User.email == "dean.rnd@bitmesra.ac.in").first()
        cls.db.query(HEIInterest).delete()
        cls.db.commit()

    def setUp(self):
        self.db.query(HEIInterest).delete()
        self.db.commit()

    def tearDown(self):
        self.db.rollback()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_scoring_weights_total_100(self):
        """Test that the 6 component weights sum to exactly 100 points and score is clamped 0-100."""
        caps = ExtractedCapabilities(
            skills=["civil engineering", "water management", "surveying"],
            technical_domains=["water & wastewater", "civil infrastructure"],
            equipment=["Water Quality Testing Kit", "Total Station"],
            software_tools=["ArcGIS", "QGIS", "AutoCAD"],
            complexity="high",
            department_domain="water & wastewater",
        )
        hei_perfect = {
            "hei_id": "test-perfect",
            "name": "Perfect Institute",
            "district": "Ranchi",
            "state": "Jharkhand",
            "institution_type": "Technical Institute",
            "departments": ["Civil Engineering", "Water Management"],
            "available_skills": ["civil engineering", "water management", "surveying"],
            "technical_domains": ["water & wastewater", "civil infrastructure"],
            "laboratories": ["Water Lab", "Surveying Lab"],
            "equipment": ["Water Quality Testing Kit", "Total Station"],
            "software_tools": ["ArcGIS", "QGIS", "AutoCAD"],
            "project_experience": {"completed_civic_projects": 20, "complexity_level": "high"},
            "available_faculty_capacity": 30,
            "verification_status": "unverified",
        }
        match = calculate_hei_match(caps, "Ranchi", "Jharkhand", hei_perfect)
        fs = match.factor_scores
        total_factors = fs.skills + fs.technical_domains + fs.equipment + fs.software + fs.location + fs.complexity

        self.assertAlmostEqual(fs.skills, 30.0, places=1)
        self.assertAlmostEqual(fs.technical_domains, 25.0, places=1)
        self.assertAlmostEqual(fs.equipment, 15.0, places=1)
        self.assertAlmostEqual(fs.software, 10.0, places=1)
        self.assertAlmostEqual(fs.location, 10.0, places=1)
        self.assertAlmostEqual(fs.complexity, 10.0, places=1)
        self.assertAlmostEqual(total_factors, 100.0, places=1)
        self.assertEqual(match.match_score, 100.0)
        self.assertEqual(match.recommendation_level, "excellent")

    def test_match_calculation_breakdown(self):
        """Test factor scores when an HEI partially matches capabilities."""
        caps = ExtractedCapabilities(
            skills=["civil engineering", "water management"],
            technical_domains=["water & wastewater"],
            equipment=["Water Quality Testing Kit"],
            software_tools=["QGIS"],
            complexity="medium",
        )
        hei_partial = {
            "hei_id": "test-partial",
            "name": "Partial College",
            "district": "Dhanbad",
            "state": "Jharkhand",
            "institution_type": "State College",
            "departments": ["Civil Engineering"],
            "available_skills": ["civil engineering"],  # 1/2 skills = 15/30
            "technical_domains": ["civil infrastructure"],  # 0/1 domain = 0/25
            "laboratories": ["Basic Lab"],
            "equipment": [],  # 0/1 equipment = 0/15
            "software_tools": ["QGIS"],  # 1/1 software = 10/10
            "project_experience": {"completed_civic_projects": 3, "complexity_level": "medium"},
            "available_faculty_capacity": 18,  # Medium complexity + >= 15 cap = 10/10
            "verification_status": "unverified",
        }
        match = calculate_hei_match(caps, "Ranchi", "Jharkhand", hei_partial)
        fs = match.factor_scores

        self.assertEqual(fs.skills, 15.0)  # 50% of 30
        self.assertEqual(fs.technical_domains, 0.0)
        self.assertEqual(fs.equipment, 0.0)
        self.assertEqual(fs.software, 10.0)
        self.assertEqual(fs.location, 7.0)  # Same state (Jharkhand) but different district
        self.assertEqual(fs.complexity, 10.0)
        self.assertEqual(match.match_score, 42.0)
        self.assertEqual(match.recommendation_level, "moderate")

    def test_matched_and_missing_capabilities_tracking(self):
        """Test that matched and missing capabilities are properly partitioned."""
        caps = ExtractedCapabilities(
            skills=["civil engineering", "water management", "electrical engineering"],
            technical_domains=["water & wastewater", "electrical grid & power"],
            equipment=["Water Quality Testing Kit", "High Voltage Probe"],
            software_tools=["ArcGIS", "STAAD.Pro"],
        )
        hei = {
            "hei_id": "test-hei",
            "name": "Test HEI",
            "district": "Ranchi",
            "state": "Jharkhand",
            "institution_type": "University",
            "departments": ["Civil Engineering"],
            "available_skills": ["civil engineering", "water management"],
            "technical_domains": ["water & wastewater"],
            "laboratories": ["Water Lab"],
            "equipment": ["Water Quality Testing Kit"],
            "software_tools": ["ArcGIS"],
            "project_experience": {},
            "available_faculty_capacity": 12,
            "verification_status": "unverified",
        }
        match = calculate_hei_match(caps, "Ranchi", "Jharkhand", hei)
        self.assertIn("civil engineering", match.matched_capabilities.matched_skills)
        self.assertIn("water management", match.matched_capabilities.matched_skills)
        self.assertIn("electrical engineering", match.missing_capabilities.missing_skills)
        self.assertIn("electrical grid & power", match.missing_capabilities.missing_domains)
        self.assertIn("high voltage probe", match.missing_capabilities.missing_equipment)
        self.assertIn("staad.pro", match.missing_capabilities.missing_software)

    def test_location_relevance_tiers(self):
        """Test the 4 geographic relevance tiers: Same district, Same state, National, Other."""
        caps = ExtractedCapabilities(skills=["project management"])

        # 1. Same district (10 pts)
        hei_same_dist = {"district": "Ranchi", "state": "Jharkhand", "institution_type": "College"}
        m1 = calculate_hei_match(caps, "Ranchi", "Jharkhand", hei_same_dist)
        self.assertEqual(m1.factor_scores.location, 10.0)

        # 2. Same state, different district (7 pts)
        hei_diff_dist = {"district": "Bokaro", "state": "Jharkhand", "institution_type": "College"}
        m2 = calculate_hei_match(caps, "Ranchi", "Jharkhand", hei_diff_dist)
        self.assertEqual(m2.factor_scores.location, 7.0)

        # 3. National Institute outside state (5 pts)
        hei_nat = {"district": "Surathkal", "state": "Karnataka", "institution_type": "Institute of National Importance"}
        m3 = calculate_hei_match(caps, "Ranchi", "Jharkhand", hei_nat)
        self.assertEqual(m3.factor_scores.location, 5.0)

        # 4. Other State (3 pts)
        hei_other = {"district": "Pune", "state": "Maharashtra", "institution_type": "Private Institute"}
        m4 = calculate_hei_match(caps, "Ranchi", "Jharkhand", hei_other)
        self.assertEqual(m4.factor_scores.location, 3.0)

    def test_top_5_limit_and_sorting(self):
        """Test that matching limits results to top 5 and sorts descending by match score."""
        caps = ExtractedCapabilities(
            skills=["civil engineering", "water management", "environmental science"],
            technical_domains=["water & wastewater", "civil infrastructure"],
            equipment=["Water Quality Testing Kit"],
            software_tools=["ArcGIS"],
            complexity="high",
        )
        top_5, status, avg_conf, model = match_report_to_heis(
            caps=caps,
            report_district="Ranchi",
            report_state="Jharkhand",
            hei_profiles=SEED_HEI_PROFILES,
        )
        self.assertEqual(status, "completed")
        self.assertLessEqual(len(top_5), 5)
        self.assertEqual(len(top_5), 5)
        # Verify scores are sorted descending
        scores = [m.match_score for m in top_5]
        self.assertEqual(scores, sorted(scores, reverse=True))
        # BIT Mesra or CUJ (both in Ranchi with water/civil) should be ranked near top
        self.assertIn(top_5[0].hei_id, ["bit-mesra", "cuj-ranchi"])

    def test_recommendation_level_thresholds(self):
        """Test recommendation level mapping thresholds."""
        caps = ExtractedCapabilities(skills=["civil engineering"])
        hei_base = {
            "hei_id": "test",
            "name": "Test",
            "district": "Ranchi",
            "state": "Jharkhand",
            "institution_type": "University",
            "departments": [],
            "available_skills": [],
            "technical_domains": [],
            "laboratories": [],
            "equipment": [],
            "software_tools": [],
            "project_experience": {},
            "available_faculty_capacity": 5,
        }
        # Low match
        m_low = calculate_hei_match(caps, "Bokaro", "West Bengal", hei_base)
        self.assertIn(m_low.recommendation_level, ["low", "moderate"])

    def test_missing_capability_data(self):
        """Test that missing or empty capability requirements return needs_review."""
        top_5, status, conf, _ = match_report_to_heis(
            caps=None,
            report_district="Ranchi",
            report_state="Jharkhand",
            hei_profiles=SEED_HEI_PROFILES,
        )
        self.assertEqual(status, "needs_review")
        self.assertEqual(len(top_5), 0)

        empty_caps = ExtractedCapabilities(skills=[])
        top_5_empty, status_empty, _, _ = match_report_to_heis(
            caps=empty_caps,
            report_district="Ranchi",
            report_state="Jharkhand",
            hei_profiles=SEED_HEI_PROFILES,
        )
        self.assertEqual(status_empty, "needs_review")
        self.assertEqual(len(top_5_empty), 0)

    def test_no_hei_profiles(self):
        """Test behavior when no HEI profiles are provided."""
        caps = ExtractedCapabilities(skills=["civil engineering"])
        top_5, status, _, _ = match_report_to_heis(
            caps=caps,
            report_district="Ranchi",
            report_state="Jharkhand",
            hei_profiles=[],
        )
        self.assertEqual(status, "no_matches")
        self.assertEqual(len(top_5), 0)

    def test_malformed_hei_profile_handling(self):
        """Test that malformed HEI profile data does not crash the matching engine."""
        caps = ExtractedCapabilities(skills=["civil engineering"])
        malformed = [{"invalid_key": 123}, {"name": None}]
        top_5, status, _, _ = match_report_to_heis(
            caps=caps,
            report_district="Ranchi",
            report_state="Jharkhand",
            hei_profiles=malformed,
        )
        # Should gracefully process without throwing unhandled exceptions
        self.assertIn(status, ["completed", "no_matches"])

    def test_report_creation_resilience(self):
        """Test that report creation succeeds even if HEI matching encounters an error."""
        with patch("app.api.routes.reports.analyze_and_store_report_hei_matches") as mock_hei:
            mock_hei.side_effect = Exception("Simulated HEI matching failure")
            payload = {
                "problem_title": "Resilience Test for HEI Matching",
                "category": "Water and Sanitation",
                "description": "Ensuring report creation does not fail if HEI matching crashes.",
                "district": "Ranchi",
                "locality": "Kanke",
                "address": "Block 2",
                "priority": "Medium",
            }
            resp = self.client.post(
                "/api/reports",
                json=payload,
                headers={"Authorization": f"Bearer {self.citizen_token}"},
            )
            self.assertEqual(resp.status_code, 201)
            data = resp.json()
            self.assertTrue(data["track_id"].startswith("IF-JH-2026-"))

    def test_get_hei_matches_unauthenticated_401(self):
        """Test that GET /api/reports/{track_id}/hei-matches returns 401 for anonymous callers."""
        resp = self.client.get("/api/reports/IF-JH-2026-0001/hei-matches")
        self.assertEqual(resp.status_code, 401)

    def test_get_hei_matches_roles_403(self):
        """Test that HEI, Faculty, and Partner roles receive 403 Forbidden for GET /hei-matches."""
        # 1. HEI user
        resp_hei = self.client.get(
            "/api/reports/IF-JH-2026-0001/hei-matches",
            headers={"Authorization": f"Bearer {self.hei_token}"},
        )
        self.assertEqual(resp_hei.status_code, 403)

        # 2. Faculty user
        resp_fac = self.client.get(
            "/api/reports/IF-JH-2026-0001/hei-matches",
            headers={"Authorization": f"Bearer {self.faculty_token}"},
        )
        self.assertEqual(resp_fac.status_code, 403)

        # 3. Partner user
        resp_part = self.client.get(
            "/api/reports/IF-JH-2026-0001/hei-matches",
            headers={"Authorization": f"Bearer {self.partner_token}"},
        )
        self.assertEqual(resp_part.status_code, 403)

    def test_get_hei_matches_citizen_cross_access_403(self):
        """Test that a citizen receives 403 when requesting HEI matches for a report they do not own."""
        # Create a report owned by another citizen or system
        other_report = Report(
            track_id=f"IF-JH-OTHER-{uuid.uuid4().hex[:6]}",
            problem_title="Other Citizen Problem",
            category="Roads and Transport",
            district="Ranchi",
            locality="Doranda",
            address_or_landmark="Main Rd",
            priority="Medium",
            status="Open",
            citizen_id=self.gov_user.id,  # Not Asha Rao
        )
        self.db.add(other_report)
        self.db.commit()

        resp = self.client.get(
            f"/api/reports/{other_report.track_id}/hei-matches",
            headers={"Authorization": f"Bearer {self.citizen_token}"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_get_hei_matches_citizen_own_report_200(self):
        """Test that a citizen receives 200 when requesting HEI matches for their own report."""
        own_report = Report(
            track_id=f"IF-JH-OWN-{uuid.uuid4().hex[:6]}",
            problem_title="Citizen Own Problem for HEI",
            category="Water and Sanitation",
            district="Ranchi",
            locality="Morabadi",
            address_or_landmark="Near Stadium",
            priority="High",
            status="Open",
            citizen_id=self.citizen_user.id,
            ai_capabilities={
                "skills": ["civil engineering", "water management"],
                "technical_domains": ["water & wastewater"],
                "equipment": ["Water Quality Testing Kit"],
                "software_tools": ["QGIS"],
                "complexity": "medium",
            },
        )
        self.db.add(own_report)
        self.db.commit()

        resp = self.client.get(
            f"/api/reports/{own_report.track_id}/hei-matches",
            headers={"Authorization": f"Bearer {self.citizen_token}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["track_id"], own_report.track_id)
        self.assertIn("disclaimer", data)
        self.assertTrue(len(data["matches"]) > 0)

    def test_get_hei_matches_gov_and_admin_200(self):
        """Test that government officials and super admins can view HEI matches for any report."""
        report = Report(
            track_id=f"IF-JH-GOV-{uuid.uuid4().hex[:6]}",
            problem_title="Gov HEI Review Report",
            category="Water and Sanitation",
            district="Ranchi",
            locality="Harmu",
            address_or_landmark="Housing Colony",
            priority="High",
            status="Open",
            ai_capabilities={"skills": ["water management"], "complexity": "medium"},
        )
        self.db.add(report)
        self.db.commit()

        # Government access
        resp_gov = self.client.get(
            f"/api/reports/{report.track_id}/hei-matches",
            headers={"Authorization": f"Bearer {self.gov_token}"},
        )
        self.assertEqual(resp_gov.status_code, 200)

        # Admin access
        resp_admin = self.client.get(
            f"/api/reports/{report.track_id}/hei-matches",
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(resp_admin.status_code, 200)

    def test_hei_interest_unauthenticated_401(self):
        """Test that POST /api/reports/{track_id}/hei-interest returns 401 for unauthenticated calls."""
        resp = self.client.post(
            "/api/reports/IF-JH-2026-0001/hei-interest",
            json={"hei_id": "bit-mesra", "remarks": "Unauthorized test"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_hei_interest_unauthorized_roles_403(self):
        """Test that Citizen, Faculty, and Partner receive 403 on POST /hei-interest."""
        payload = {"hei_id": "bit-mesra", "remarks": "Invalid role test"}

        # Citizen 403
        resp_cit = self.client.post(
            "/api/reports/IF-JH-2026-0001/hei-interest",
            json=payload,
            headers={"Authorization": f"Bearer {self.citizen_token}"},
        )
        self.assertEqual(resp_cit.status_code, 403)

        # Faculty 403
        resp_fac = self.client.post(
            "/api/reports/IF-JH-2026-0001/hei-interest",
            json=payload,
            headers={"Authorization": f"Bearer {self.faculty_token}"},
        )
        self.assertEqual(resp_fac.status_code, 403)

        # Partner 403
        resp_part = self.client.post(
            "/api/reports/IF-JH-2026-0001/hei-interest",
            json=payload,
            headers={"Authorization": f"Bearer {self.partner_token}"},
        )
        self.assertEqual(resp_part.status_code, 403)

    def test_hei_self_interest_restriction(self):
        """Test that an HEI user can only express interest for their own institution."""
        # 1. Dean of BIT Mesra attempting to express interest for NIT Jamshedpur -> 403
        resp_forbidden = self.client.post(
            "/api/reports/IF-JH-2026-0001/hei-interest",
            json={"hei_id": "nit-jamshedpur", "remarks": "Unauthorized foreign HEI interest"},
            headers={"Authorization": f"Bearer {self.hei_token}"},
        )
        self.assertEqual(resp_forbidden.status_code, 403)

        # 2. Dean of BIT Mesra expressing interest for BIT Mesra -> 200
        resp_allowed = self.client.post(
            "/api/reports/IF-JH-2026-0001/hei-interest",
            json={"hei_id": "bit-mesra", "remarks": "BIT Mesra Environmental Lab is interested in adopting this pilot."},
            headers={"Authorization": f"Bearer {self.hei_token}"},
        )
        self.assertEqual(resp_allowed.status_code, 200)
        data = resp_allowed.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["action_type"], "expression_of_interest")
        self.assertEqual(data["hei_id"], "bit-mesra")

    def test_gov_admin_official_recommendation_200(self):
        """Test that government officials and admins can record official recommendations for any HEI."""
        resp_gov = self.client.post(
            "/api/reports/IF-JH-2026-0001/hei-interest",
            json={"hei_id": "nit-jamshedpur", "remarks": "District Innovation Cell recommends NIT Jamshedpur."},
            headers={"Authorization": f"Bearer {self.gov_token}"},
        )
        self.assertEqual(resp_gov.status_code, 200)
        data = resp_gov.json()
        self.assertEqual(data["action_type"], "official_recommendation")
        self.assertEqual(data["hei_id"], "nit-jamshedpur")

        resp_admin = self.client.post(
            "/api/reports/IF-JH-2026-0001/hei-interest",
            json={"hei_id": "iit-ism-dhanbad", "remarks": "PMU suggests IIT ISM Dhanbad for geotechnical analysis."},
            headers={"Authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(resp_admin.status_code, 200)
        data_admin = resp_admin.json()
        self.assertEqual(data_admin["action_type"], "official_recommendation")

    def test_audit_log_created_on_interest(self):
        """Test that recording an interest or recommendation creates an immutable AuditLog entry."""
        test_remarks = "Verifying audit log creation for institutional recommendation."
        resp = self.client.post(
            "/api/reports/IF-JH-2026-0001/hei-interest",
            json={"hei_id": "cuj-ranchi", "remarks": test_remarks},
            headers={"Authorization": f"Bearer {self.gov_token}"},
        )
        self.assertEqual(resp.status_code, 200)

        # Query audit log
        audit = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.entity_id == "IF-JH-2026-0001",
                AuditLog.action == "hei_recommendation_recorded",
            )
            .order_by(AuditLog.id.desc())
            .first()
        )
        self.assertIsNotNone(audit)
        self.assertIn("cuj-ranchi", audit.metadata_json)
        self.assertIn(test_remarks, audit.metadata_json)

    def test_no_automatic_assignment_or_status_mutation(self):
        """Test that recording an interest does NOT mutate report.status or report.assigned_to."""
        report = (
            self.db.query(Report)
            .filter(Report.track_id == "IF-JH-2026-0001")
            .first()
        )
        orig_status = report.status
        orig_assigned = report.assigned_to

        resp = self.client.post(
            "/api/reports/IF-JH-2026-0001/hei-interest",
            json={"hei_id": "bit-mesra", "remarks": "Zero-mutation verification"},
            headers={"Authorization": f"Bearer {self.gov_token}"},
        )
        self.assertEqual(resp.status_code, 200)

        self.db.refresh(report)
        self.assertEqual(report.status, orig_status)
        self.assertEqual(report.assigned_to, orig_assigned)

    def test_parts_1_to_5_intact(self):
        """Verify that Parts 1–5 endpoints remain intact after adding Part 6."""
        # Part 1: Categorization
        r1 = self.client.get("/api/reports/IF-JH-2026-0001/ai-analysis", headers={"Authorization": f"Bearer {self.gov_token}"})
        self.assertEqual(r1.status_code, 200)

        # Part 2: Priority
        r2 = self.client.get("/api/reports/IF-JH-2026-0001/ai-priority", headers={"Authorization": f"Bearer {self.gov_token}"})
        self.assertEqual(r2.status_code, 200)

        # Part 3: Similar Problems
        r3 = self.client.get("/api/reports/IF-JH-2026-0001/similar-problems", headers={"Authorization": f"Bearer {self.gov_token}"})
        self.assertEqual(r3.status_code, 200)

        # Part 4: Duplicate Analysis
        r4 = self.client.get("/api/reports/IF-JH-2026-0001/duplicate-analysis", headers={"Authorization": f"Bearer {self.gov_token}"})
        self.assertEqual(r4.status_code, 200)

        # Part 5: Capabilities
        r5 = self.client.get("/api/reports/IF-JH-2026-0001/capabilities", headers={"Authorization": f"Bearer {self.gov_token}"})
        self.assertEqual(r5.status_code, 200)


if __name__ == "__main__":
    unittest.main()
