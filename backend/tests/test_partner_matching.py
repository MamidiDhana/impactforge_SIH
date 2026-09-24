import json
import uuid
import unittest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.report import Report
from app.models.audit_log import AuditLog
from app.models.partner import PartnerProfile, PartnerInterest
from app.schemas.partner_matching_schema import (
    PartnerFactorScores,
    PartnerRecommendationMatch,
    PartnerMatchingResponse,
    CitizenPartnerMatchingResponse,
)
from app.services.partner_matching_service import (
    evaluate_equipment_materials_score,
    evaluate_funding_capacity_score,
    evaluate_domains_and_skills_score,
    evaluate_manpower_score,
    evaluate_location_score,
    evaluate_experience_score,
    score_single_partner,
    match_report_to_partners,
    mask_for_citizen,
    analyze_and_store_report_partner_matches,
    SEED_PARTNER_PROFILES,
)


class TestPartnerMatching(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Retrieve test users
        cls.citizen_user = cls.db.query(User).filter(User.email == "asha.rao@jharkhand.in").first()
        cls.gov_user = cls.db.query(User).filter(User.email == "vikram.singh@jharkhand.gov.in").first()
        cls.admin_user = cls.db.query(User).filter(User.email == "admin@impactforge.org").first()
        cls.hei_user = cls.db.query(User).filter(User.email == "dean.rnd@bitmesra.ac.in").first()
        cls.partner_user = cls.db.query(User).filter(User.email == "partner@impactforge.org").first()

        # Ensure faculty user exists
        cls.faculty_user = cls.db.query(User).filter(User.email == "alok.ranjan@bitmesra.ac.in").first()
        if not cls.faculty_user:
            from app.core.security import hash_password
            cls.faculty_user = User(
                full_name="Dr. Alok Ranjan",
                email="alok.ranjan@bitmesra.ac.in",
                password_hash=hash_password("demo-password"),
                role="faculty",
                organization_name="Birla Institute of Technology (BIT) Mesra",
                is_active=True,
            )
            cls.db.add(cls.faculty_user)
            cls.db.commit()
            cls.db.refresh(cls.faculty_user)

        # Ensure a second citizen user exists for cross-access testing
        cls.other_citizen = cls.db.query(User).filter(User.email == "other.citizen@jharkhand.in").first()
        if not cls.other_citizen:
            from app.core.security import hash_password
            cls.other_citizen = User(
                full_name="Other Citizen",
                email="other.citizen@jharkhand.in",
                password_hash=hash_password("demo-password"),
                role="citizen",
                is_active=True,
            )
            cls.db.add(cls.other_citizen)
            cls.db.commit()
            cls.db.refresh(cls.other_citizen)

        def get_auth_headers(email, password):
            resp = cls.client.post("/api/auth/login", json={"email": email, "password": password})
            if resp.status_code == 200:
                token = resp.json()["access_token"]
                return {"Authorization": f"Bearer {token}"}
            return {}

        cls.citizen_headers = get_auth_headers("asha.rao@jharkhand.in", "demo-password")
        cls.other_citizen_headers = get_auth_headers("other.citizen@jharkhand.in", "demo-password")
        cls.gov_headers = get_auth_headers("vikram.singh@jharkhand.gov.in", "demo-password")
        cls.admin_headers = get_auth_headers("admin@impactforge.org", "demo-password")
        cls.hei_headers = get_auth_headers("dean.rnd@bitmesra.ac.in", "demo-password")
        cls.faculty_headers = get_auth_headers("alok.ranjan@bitmesra.ac.in", "demo-password")
        cls.partner_headers = get_auth_headers("partner@impactforge.org", "demo-password")

    def setUp(self):
        self.db.rollback()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # -------------------------------------------------------------------------
    # 1. Scoring Rubric & Factor Breakdown Tests
    # -------------------------------------------------------------------------

    def test_equipment_and_materials_scoring(self):
        """Test equipment and materials coverage calculation (Weight: 25%)."""
        missing_equip = ["Backhoe Loader Excavator", "Industrial Dewatering Pumps"]
        missing_mat = ["TMT Steel Rebars", "Portland Slag Cement (PSC)"]
        p_equip = ["Backhoe Loader Excavator", "Industrial Dewatering Pumps", "Road Roller"]
        p_mat = ["TMT Steel Rebars", "Portland Slag Cement (PSC)"]
        p_supp_types = ["equipment", "materials", "funding"]

        score, matched, unmatched = evaluate_equipment_materials_score(
            missing_equip, missing_mat, p_equip, p_mat, p_supp_types
        )
        self.assertEqual(len(matched), 4)
        self.assertEqual(len(unmatched), 0)
        self.assertEqual(score, 25.0)

    def test_funding_capacity_scoring(self):
        """Test funding and budget capacity calculation (Weight: 20%)."""
        # Extensive funding partner with high headroom
        score, rationale = evaluate_funding_capacity_score(
            report_budget_max=1500000.0,
            budget_gap_str="Capital deficit of ₹15 Lakhs",
            partner_max_budget=2500000.0,
            funding_capacity="extensive",
            partner_type="CSR",
            partner_support_types=["funding", "materials"],
        )
        self.assertEqual(score, 20.0)
        self.assertTrue(any("fully covers" in r for r in rationale))

        # Supplier without funding
        sup_score, sup_rationale = evaluate_funding_capacity_score(
            report_budget_max=1500000.0,
            budget_gap_str=None,
            partner_max_budget=0.0,
            funding_capacity="low",
            partner_type="supplier",
            partner_support_types=["equipment"],
        )
        self.assertEqual(sup_score, 5.0)

    def test_domain_and_skills_scoring(self):
        """Test domain and skill support scoring (Weight: 20%)."""
        rep_domains = ["Water and Sanitation", "Civil Infrastructure"]
        missing_skills = ["Water Quality Management", "Structural Assessment"]
        p_domains = ["Water and Sanitation", "Civil Infrastructure", "Public Health"]
        p_skills = ["Water Quality Management", "Structural Assessment", "Civil Engineering"]

        score, matched, missing = evaluate_domains_and_skills_score(
            rep_domains, missing_skills, p_domains, p_skills
        )
        self.assertEqual(score, 20.0)
        self.assertEqual(len(missing), 0)

    def test_manpower_scoring(self):
        """Test manpower and operational support scoring (Weight: 15%)."""
        missing_crew = ["Civil Site Supervisors", "Heavy Machinery Operators"]
        p_crew = ["Civil Site Supervisors", "Heavy Machinery Operators", "Project Engineers"]
        p_supp = ["manpower", "equipment"]

        score, matched = evaluate_manpower_score(missing_crew, p_crew, p_supp)
        self.assertEqual(score, 15.0)
        self.assertEqual(len(matched), 2)

    def test_location_scoring(self):
        """Test location and service district relevance scoring (Weight: 10%)."""
        # Exact district match
        score_exact, exp_exact = evaluate_location_score("Ranchi", "Ranchi", ["Ranchi", "Khunti"])
        self.assertEqual(score_exact, 10.0)

        # Service district match
        score_svc, exp_svc = evaluate_location_score("Ramgarh", "Ranchi", ["Ranchi", "Ramgarh", "Bokaro"])
        self.assertEqual(score_svc, 8.5)

        # Statewide match
        score_state, exp_state = evaluate_location_score("Latehar", "Bokaro", ["All Districts", "Jharkhand"])
        self.assertEqual(score_state, 6.0)

        # Outside coverage
        score_out, exp_out = evaluate_location_score("Deoghar", "East Singhbhum", ["East Singhbhum", "Saraikela"])
        self.assertEqual(score_out, 3.0)

    def test_experience_and_reliability_scoring(self):
        """Test previous experience and reliability scoring (Weight: 10%)."""
        exp_dict = {"completed_projects": 48, "sector_experience_years": 15}
        score, rationale = evaluate_experience_score(exp_dict, "immediate", "CSR")
        self.assertEqual(score, 10.0)

    def test_match_level_thresholds(self):
        """Test that composite match scores map correctly to match levels."""
        # Check thresholds: low <40, moderate 40-64, strong 65-84, excellent 85-100
        mock_report = Report(
            track_id="IF-JH-2026-TEST",
            problem_title="Bridge Culvert Structural Damage",
            category="Civil Infrastructure",
            state="Jharkhand",
            district="East Singhbhum",
            locality="Golmuri",
            address_or_landmark="Near Golmuri Market",
            priority="High",
            status="Open",
        )
        caps = {
            "equipment": ["Backhoe Loader Excavator"],
            "materials": ["TMT Steel Rebars"],
            "technical_domains": ["Civil Infrastructure"],
            "required_skills": ["Civil Engineering"],
            "manpower": ["Civil Site Supervisors"],
            "budget_range": {"min": 500000.0, "max": 1500000.0, "currency": "INR"},
        }
        gaps = {
            "missing_equipment": ["Backhoe Loader Excavator"],
            "missing_materials": ["TMT Steel Rebars"],
            "missing_skills": ["Civil Engineering"],
            "missing_manpower": ["Civil Site Supervisors"],
        }
        match = score_single_partner(SEED_PARTNER_PROFILES[0], mock_report, caps, gaps)
        self.assertGreaterEqual(match.score, 85.0)
        self.assertEqual(match.match_level, "excellent")
        self.assertLessEqual(match.score, 100.0)

    # -------------------------------------------------------------------------
    # 2. Top-5 Limit and Unverified Status Handling
    # -------------------------------------------------------------------------

    def test_top_5_limit_and_ranking(self):
        """match_report_to_partners must return strictly the top 5 ranked recommendations."""
        mock_report = Report(
            track_id="IF-JH-2026-TEST",
            problem_title="Pipeline Leakage & Drainage Blockage",
            category="Water and Sanitation",
            state="Jharkhand",
            district="Ranchi",
            locality="Namkum",
            address_or_landmark="Industrial Area",
            priority="Medium",
            status="Open",
        )
        # Pass all 7 seed partner profiles
        top_5 = match_report_to_partners(
            report=mock_report,
            extracted_caps={"technical_domains": ["Water and Sanitation"]},
            gap_analysis={},
            partner_profiles=SEED_PARTNER_PROFILES,
        )
        self.assertEqual(len(top_5), 5)
        # Verify descending order of scores
        for i in range(len(top_5) - 1):
            self.assertGreaterEqual(top_5[i].score, top_5[i+1].score)

    def test_unverified_status_handling(self):
        """All demo partner profiles must retain verification_status='unverified'."""
        for p in SEED_PARTNER_PROFILES:
            self.assertEqual(p["verification_status"], "unverified")

        mock_report = Report(
            track_id="IF-JH-2026-TEST",
            problem_title="Road Repairs",
            category="Roads and Transport",
            state="Jharkhand",
            district="Ramgarh",
            locality="Patratu",
            address_or_landmark="Near Power Plant",
            priority="Medium",
            status="Open",
        )
        top_5 = match_report_to_partners(mock_report, {}, {}, SEED_PARTNER_PROFILES)
        for m in top_5:
            self.assertEqual(m.verification_status, "unverified")

    # -------------------------------------------------------------------------
    # 3. Privacy-Safe Citizen Masking
    # -------------------------------------------------------------------------

    def test_privacy_safe_masking_for_citizen(self):
        """mask_for_citizen must omit executive contact emails and private details."""
        mock_report = Report(
            track_id="IF-JH-2026-TEST",
            problem_title="Water Filter Deficit",
            category="Water and Sanitation",
            state="Jharkhand",
            district="Ranchi",
            locality="Doranda",
            address_or_landmark="Main Market",
            priority="Medium",
            status="Open",
        )
        match = score_single_partner(SEED_PARTNER_PROFILES[0], mock_report, {}, {})
        masked = mask_for_citizen(match)
        self.assertFalse(hasattr(masked, "contact_email"))
        self.assertEqual(masked.partner_id, match.partner_id)
        self.assertEqual(masked.organization_name, match.organization_name)
        self.assertEqual(masked.verification_status, "unverified")

    # -------------------------------------------------------------------------
    # 4. REST API & RBAC Tests
    # -------------------------------------------------------------------------

    def test_api_unauthenticated_partner_matches_receives_401(self):
        """Unauthenticated requests must receive HTTP 401."""
        resp = self.client.get("/api/reports/IF-JH-2026-0001/partner-matches")
        self.assertEqual(resp.status_code, 401)

    def test_api_citizen_view_own_report_privacy_safe(self):
        """Citizen can view a privacy-safe summary for their own report."""
        # Find a report owned by Asha Rao
        own_report = self.db.query(Report).filter(Report.citizen_id == self.citizen_user.id).first()
        if not own_report:
            own_report = Report(
                track_id=f"IF-JH-PART-OWN-{uuid.uuid4().hex[:8]}",
                problem_title="Drinking Water Contamination",
                category="Water and Sanitation",
                context_and_desired_outcome="Water has heavy mineral taste.",
                state="Jharkhand",
                district="Ranchi",
                locality="Namkum",
                address_or_landmark="Near High School",
                priority="High",
                status="Open",
                citizen_id=self.citizen_user.id,
            )
            self.db.add(own_report)
            self.db.commit()
            self.db.refresh(own_report)

        resp = self.client.get(
            f"/api/reports/{own_report.track_id}/partner-matches",
            headers=self.citizen_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("recommendations", data)
        self.assertIn("advisory_warning", data)
        # Ensure private emails are not in citizen payload
        for r in data["recommendations"]:
            self.assertNotIn("contact_email", r)
            self.assertNotIn("maximum_project_budget", r)

    def test_api_citizen_cross_report_access_receives_403(self):
        """Citizen cannot view partner matches for another citizen's report (403)."""
        # Create report owned by other_citizen
        other_report = Report(
            track_id=f"IF-JH-PART-OTH-{uuid.uuid4().hex[:8]}",
            problem_title="Broken Culvert",
            category="Civil Infrastructure",
            context_and_desired_outcome="Bridge slab broken.",
            state="Jharkhand",
            district="Dhanbad",
            locality="Jharia",
            address_or_landmark="Main Chowk",
            priority="Critical",
            status="Open",
            citizen_id=self.other_citizen.id,
        )
        self.db.add(other_report)
        self.db.commit()
        self.db.refresh(other_report)

        try:
            resp = self.client.get(
                f"/api/reports/{other_report.track_id}/partner-matches",
                headers=self.citizen_headers,  # Asha Rao accessing Other Citizen's report
            )
            self.assertEqual(resp.status_code, 403)
        finally:
            self.db.delete(other_report)
            self.db.commit()

    def test_api_government_and_admin_view_all_partner_recommendations(self):
        """Government and Super Admin can view all partner recommendations."""
        resp_gov = self.client.get(
            "/api/reports/IF-JH-2026-0001/partner-matches",
            headers=self.gov_headers,
        )
        self.assertEqual(resp_gov.status_code, 200)
        data_gov = resp_gov.json()
        self.assertIn("recommendations", data_gov)
        self.assertIn("registered_interests", data_gov)
        self.assertIn("advisory_warning", data_gov)
        self.assertLessEqual(len(data_gov["recommendations"]), 5)

        resp_admin = self.client.get(
            "/api/reports/IF-JH-2026-0001/partner-matches",
            headers=self.admin_headers,
        )
        self.assertEqual(resp_admin.status_code, 200)

    def test_api_hei_connected_report_access(self):
        """HEI users can view partners for connected reports, but receive 403 on unconnected reports."""
        connected_report = Report(
            track_id=f"IF-JH-PART-CONN-{uuid.uuid4().hex[:8]}",
            problem_title="Connected Water Problem",
            category="Water and Sanitation",
            context_and_desired_outcome="Water test needed.",
            state="Jharkhand",
            district="Ranchi",
            locality="Mesra",
            address_or_landmark="Near BIT",
            priority="Medium",
            status="Open",
            ai_hei_matches=[{"hei_id": "bit-mesra", "hei_name": "Birla Institute of Technology Mesra"}],
        )
        unconnected_report = Report(
            track_id=f"IF-JH-PART-UNCONN-{uuid.uuid4().hex[:8]}",
            problem_title="Unconnected Remote Issue",
            category="Rural Housing",
            context_and_desired_outcome="Village housing audit.",
            state="Jharkhand",
            district="Dumka",
            locality="Remote Hamlet",
            address_or_landmark="Far forest boundary",
            priority="Low",
            status="Open",
            ai_hei_matches=[],
        )
        self.db.add(connected_report)
        self.db.add(unconnected_report)
        self.db.commit()
        self.db.refresh(connected_report)
        self.db.refresh(unconnected_report)

        try:
            resp_conn = self.client.get(
                f"/api/reports/{connected_report.track_id}/partner-matches",
                headers=self.hei_headers,
            )
            self.assertEqual(resp_conn.status_code, 200)

            resp_unconn = self.client.get(
                f"/api/reports/{unconnected_report.track_id}/partner-matches",
                headers=self.hei_headers,
            )
            self.assertEqual(resp_unconn.status_code, 403)
        finally:
            self.db.delete(connected_report)
            self.db.delete(unconnected_report)
            self.db.commit()

    # -------------------------------------------------------------------------
    # 5. Partner Interest Proposal & Ownership Enforcement
    # -------------------------------------------------------------------------

    def test_api_partner_express_interest_for_own_organization(self):
        """Partner user can express interest for their own organization."""
        report = self.db.query(Report).filter(Report.track_id == "IF-JH-2026-0001").first()

        payload = {
            "partner_id": "DEMO-PARTNER-01",  # Linked to partner@impactforge.org
            "support_type": "equipment",
            "proposed_amount": 150000.0,
            "proposed_resources": ["Industrial Dewatering Pumps", "Backhoe Loader Excavator"],
            "notes": "We can mobilize heavy machinery within 48 hours for culvert dewatering.",
        }

        resp = self.client.post(
            f"/api/reports/{report.track_id}/partner-interest",
            json=payload,
            headers=self.partner_headers,
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["interest"]["status"], "proposed")
        self.assertEqual(data["interest"]["partner_id"], "DEMO-PARTNER-01")

        # Verify audit log was created
        audit = (
            self.db.query(AuditLog)
            .filter(AuditLog.entity_id == report.track_id, AuditLog.action == "partner_interest_expressed")
            .order_by(AuditLog.id.desc())
            .first()
        )
        self.assertIsNotNone(audit)
        self.assertIn("DEMO-PARTNER-01", audit.metadata_json)

    def test_api_partner_cannot_express_interest_for_other_organization(self):
        """Partner user receives 403 if attempting to express interest for another partner's organization."""
        report = self.db.query(Report).filter(Report.track_id == "IF-JH-2026-0001").first()

        payload = {
            "partner_id": "DEMO-PARTNER-03",  # BCCL Dhanbad - NOT owned by partner@impactforge.org
            "support_type": "funding",
            "proposed_amount": 500000.0,
            "proposed_resources": [],
            "notes": "Attempting unowned partner profile interest",
        }

        resp = self.client.post(
            f"/api/reports/{report.track_id}/partner-interest",
            json=payload,
            headers=self.partner_headers,
        )
        self.assertEqual(resp.status_code, 403)
        self.assertIn("own organization", resp.json()["detail"])

    def test_api_citizens_and_academic_roles_cannot_express_partner_interest(self):
        """Citizens, HEIs, and Faculty receive 403 when trying to express partner interest."""
        payload = {
            "partner_id": "DEMO-PARTNER-01",
            "support_type": "materials",
            "proposed_amount": 0.0,
            "proposed_resources": ["Cement"],
            "notes": "Citizen trying to submit partner interest",
        }

        resp_cit = self.client.post(
            "/api/reports/IF-JH-2026-0001/partner-interest",
            json=payload,
            headers=self.citizen_headers,
        )
        self.assertEqual(resp_cit.status_code, 403)

        resp_hei = self.client.post(
            "/api/reports/IF-JH-2026-0001/partner-interest",
            json=payload,
            headers=self.hei_headers,
        )
        self.assertEqual(resp_hei.status_code, 403)

    # -------------------------------------------------------------------------
    # 6. Proposal Status Updates & Self-Approval Prevention
    # -------------------------------------------------------------------------

    def test_api_partner_cannot_self_approve_proposals(self):
        """Partner cannot approve or reject their own support proposal (403)."""
        # Create an interest record first
        report = self.db.query(Report).filter(Report.track_id == "IF-JH-2026-0001").first()
        interest = PartnerInterest(
            report_id=report.id,
            track_id=report.track_id,
            partner_id="DEMO-PARTNER-01",
            partner_name="Tata Steel Foundation (Demo CSR)",
            support_type="materials",
            proposed_amount=50000.0,
            proposed_resources=["Portland Slag Cement"],
            notes="Initial proposal",
            status="proposed",
            created_by=self.partner_user.full_name,
            creator_user_id=self.partner_user.id,
            creator_role="partner",
        )
        self.db.add(interest)
        self.db.commit()
        self.db.refresh(interest)

        try:
            # Partner attempts self-approval
            resp = self.client.patch(
                f"/api/reports/{report.track_id}/partner-interest/{interest.id}",
                json={"status": "approved"},
                headers=self.partner_headers,
            )
            self.assertEqual(resp.status_code, 403)
            self.assertIn("cannot approve or reject", resp.json()["detail"])
        finally:
            self.db.delete(interest)
            self.db.commit()

    def test_api_government_can_review_and_approve_partner_proposal(self):
        """Government Official can review and approve a partner support proposal."""
        report = self.db.query(Report).filter(Report.track_id == "IF-JH-2026-0001").first()
        interest = PartnerInterest(
            report_id=report.id,
            track_id=report.track_id,
            partner_id="DEMO-PARTNER-01",
            partner_name="Tata Steel Foundation (Demo CSR)",
            support_type="equipment",
            proposed_amount=75000.0,
            proposed_resources=["Industrial Dewatering Pumps"],
            notes="Pending official administrative endorsement.",
            status="proposed",
            created_by=self.partner_user.full_name,
            creator_user_id=self.partner_user.id,
            creator_role="partner",
        )
        self.db.add(interest)
        self.db.commit()
        self.db.refresh(interest)

        try:
            resp = self.client.patch(
                f"/api/reports/{report.track_id}/partner-interest/{interest.id}",
                json={"status": "approved", "notes": "Approved for field coordination by District Cell."},
                headers=self.gov_headers,
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertTrue(data["success"])
            self.assertEqual(data["interest"]["status"], "approved")

            # Verify audit log recorded
            audit = (
                self.db.query(AuditLog)
                .filter(AuditLog.entity_id == report.track_id, AuditLog.action == "partner_interest_updated")
                .order_by(AuditLog.id.desc())
                .first()
            )
            self.assertIsNotNone(audit)
            self.assertIn("approved", audit.metadata_json)
        finally:
            self.db.delete(interest)
            self.db.commit()

    # -------------------------------------------------------------------------
    # 7. Zero-Mutation Guarantee
    # -------------------------------------------------------------------------

    def test_zero_mutation_guarantee(self):
        """Partner matching, interest recording, and approvals must NEVER mutate report status, priority, or assigned_to."""
        report = self.db.query(Report).filter(Report.track_id == "IF-JH-2026-0001").first()
        initial_status = report.status
        initial_priority = report.priority
        initial_assigned_to = report.assigned_to

        # 1. Trigger partner matching analysis
        analyze_and_store_report_partner_matches(self.db, report)
        self.db.refresh(report)
        self.assertEqual(report.status, initial_status)
        self.assertEqual(report.priority, initial_priority)
        self.assertEqual(report.assigned_to, initial_assigned_to)

        # 2. Record interest via API
        resp = self.client.post(
            f"/api/reports/{report.track_id}/partner-interest",
            json={
                "partner_id": "DEMO-PARTNER-01",
                "support_type": "materials",
                "proposed_amount": 20000.0,
                "notes": "Zero mutation test",
            },
            headers=self.partner_headers,
        )
        self.assertEqual(resp.status_code, 200)

        self.db.refresh(report)
        self.assertEqual(report.status, initial_status)
        self.assertEqual(report.priority, initial_priority)
        self.assertEqual(report.assigned_to, initial_assigned_to)


if __name__ == "__main__":
    unittest.main()
