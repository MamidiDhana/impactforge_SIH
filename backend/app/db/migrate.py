import logging
from sqlalchemy import text, func
from app.db.base import Base
from app.db.session import engine, SessionLocal
import app.models  # Import all models to register with Base.metadata
from app.models.user import User
from app.models.report import Report
from app.models.report_status_history import ReportStatusHistory
from app.models.notification import Notification
from app.models.announcement import Announcement
from app.models.hei import HEIProfile, HEIInterest
from app.models.faculty_student import FacultyProfile, StudentProfile, FacultyInterest, StudentInterest
from app.models.partner import PartnerProfile, PartnerInterest
from app.models.rematching import AIRematchingEvent
from app.models.ai_management import AIFeedback, TrainingRecord, AIModelVersion, AIRetrainingJob
from app.services.hei_matching_service import SEED_HEI_PROFILES
from app.services.faculty_student_matching_service import SEED_FACULTY_PROFILES, SEED_STUDENT_PROFILES
from app.services.partner_matching_service import SEED_PARTNER_PROFILES
from app.core.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

DEMO_USERS = [
    {
        "full_name": "Asha Rao",
        "email": "asha.rao@jharkhand.in",
        "role": "citizen",
        "organization_name": "Community Member",
        "department": "Civil Society",
        "designation": "Citizen Contributor",
        "office_location": "Ranchi, Jharkhand",
        "phone": "+91 98765 43210",
        "password": "demo-password",
    },
    {
        "full_name": "Vikram Singh",
        "email": "vikram.singh@jharkhand.gov.in",
        "role": "government",
        "organization_name": "District Innovation Cell, Ranchi",
        "department": "District Innovation Cell",
        "designation": "Government Validator",
        "office_location": "Ranchi, Jharkhand",
        "phone": "+91 94311 00001",
        "password": "demo-password",
    },
    {
        "full_name": "Dr. Meera Nair",
        "email": "dean.rnd@bitmesra.ac.in",
        "role": "hei",
        "organization_name": "Birla Institute of Technology (BIT) Mesra",
        "department": "Dean R&D",
        "designation": "Institutional Dean",
        "office_location": "Mesra, Ranchi, Jharkhand",
        "phone": "+91 94311 00002",
        "password": "demo-password",
    },
    {
        "full_name": "Dr. Arjun Menon",
        "email": "prof.menon@tiss.edu",
        "role": "faculty",
        "organization_name": "Tata Institute of Social Sciences",
        "department": "Social Sciences",
        "designation": "Professor & Principal Investigator",
        "office_location": "Ranchi, Jharkhand",
        "phone": "+91 94311 00003",
        "password": "demo-password",
    },
    {
        "full_name": "Karan Patel",
        "email": "partner@impactforge.org",
        "role": "partner",
        "organization_name": "CivicGrid Technologies",
        "department": "Corporate Partnerships",
        "designation": "CSR Director",
        "office_location": "Jamshedpur, Jharkhand",
        "phone": "+91 94311 00004",
        "password": "demo-password",
    },
    {
        "full_name": "ImpactForge Admin",
        "email": "admin@impactforge.org",
        "role": "admin",
        "organization_name": "ImpactForge PMU",
        "department": "Project Monitoring Unit",
        "designation": "Super Admin",
        "office_location": "Ranchi, Jharkhand",
        "phone": "+91 94311 00005",
        "password": "demo-password",
    },
]


def run_migrations():
    logger.info("Starting safe idempotent database migration...")

    with engine.begin() as conn:
        # 1. Create Base tables if they don't exist
        Base.metadata.create_all(bind=conn)

        # 2. Add columns to reports table safely
        columns_to_add = [
            ("verification_status", "VARCHAR(30) DEFAULT 'Pending Verification'"),
            ("citizen_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
            ("affected_people", "INTEGER DEFAULT 0"),
            ("citizen_name", "VARCHAR(255)"),
            ("assigned_to", "VARCHAR(255)"),
            ("assigned_role", "VARCHAR(50)"),
            ("assigned_by", "VARCHAR(255)"),
            ("assigned_at", "TIMESTAMP WITH TIME ZONE"),
            ("official_remarks", "TEXT"),
            ("remarks_updated_by", "VARCHAR(255)"),
            ("remarks_updated_at", "TIMESTAMP WITH TIME ZONE"),
            ("resolved_at", "TIMESTAMP WITH TIME ZONE"),
            # AI Categorization and Analysis (Phase 1 Part 1)
            ("ai_category", "VARCHAR(100)"),
            ("ai_subcategory", "VARCHAR(100)"),
            ("ai_problem_type", "VARCHAR(100)"),
            ("ai_summary", "TEXT"),
            ("ai_confidence_score", "FLOAT"),
            ("ai_analysis_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("ai_model", "VARCHAR(100)"),
            ("ai_analyzed_at", "TIMESTAMP WITH TIME ZONE"),
            # AI Priority Scoring (Phase 1 Part 2)
            ("ai_priority", "VARCHAR(20)"),
            ("ai_priority_score", "INTEGER"),
            ("ai_priority_reasons", "JSON"),
            ("ai_priority_factors", "JSON"),
            ("ai_priority_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("ai_priority_model", "VARCHAR(100)"),
            ("ai_priority_analyzed_at", "TIMESTAMP WITH TIME ZONE"),
            # AI Similar-Problem Detection (Phase 1 Part 3)
            ("ai_embedding", "JSON"),
            ("ai_similarity_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("ai_similarity_matches", "JSON DEFAULT '[]'"),
            ("ai_similarity_model", "VARCHAR(100)"),
            ("ai_similarity_analyzed_at", "TIMESTAMP WITH TIME ZONE"),
            # AI Official Duplicate Analysis (Phase 1 Part 4)
            ("ai_duplicate_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("ai_duplicate_candidates", "JSON DEFAULT '[]'"),
            ("ai_duplicate_model", "VARCHAR(100)"),
            ("ai_duplicate_analyzed_at", "TIMESTAMP WITH TIME ZONE"),
            # AI Capability Extraction (Phase 1 Part 5)
            ("ai_capability_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("ai_capabilities", "JSON DEFAULT '{}'"),
            ("ai_capability_confidence", "FLOAT"),
            ("ai_capability_reasons", "JSON DEFAULT '[]'"),
            ("ai_capability_model", "VARCHAR(100)"),
            ("ai_capability_analyzed_at", "TIMESTAMP WITH TIME ZONE"),
            # AI HEI Matching (Phase 1 Part 6)
            ("ai_hei_matching_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("ai_hei_matches", "JSON DEFAULT '[]'"),
            ("ai_hei_matching_model", "VARCHAR(100)"),
            ("ai_hei_matching_analyzed_at", "TIMESTAMP WITH TIME ZONE"),
            # AI Faculty and Student Matching (Phase 1 Part 7)
            ("ai_faculty_matching_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("ai_faculty_matches", "JSON DEFAULT '[]'"),
            ("ai_student_matches", "JSON DEFAULT '[]'"),
            ("ai_faculty_matching_model", "VARCHAR(100)"),
            ("ai_faculty_matching_analyzed_at", "TIMESTAMP WITH TIME ZONE"),
            # AI Capability-Gap Analysis (Phase 1 Part 8)
            ("ai_capability_gap_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("ai_capability_gap_analysis", "JSON DEFAULT '{}'"),
            ("ai_capability_gap_score", "FLOAT"),
            ("ai_capability_gap_severity", "VARCHAR(30)"),
            ("ai_capability_gap_model", "VARCHAR(100)"),
            ("ai_capability_gap_analyzed_at", "TIMESTAMP WITH TIME ZONE"),
            # AI Partner Matching (Phase 1 Part 9)
            ("ai_partner_matching_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("ai_partner_matches", "JSON DEFAULT '[]'"),
            ("ai_partner_matching_model", "VARCHAR(100)"),
            ("ai_partner_matching_analyzed_at", "TIMESTAMP WITH TIME ZONE"),
            # AI Dynamic Re-Matching (Phase 1 Part 10)
            ("ai_rematching_status", "VARCHAR(30) DEFAULT 'idle'"),
            ("ai_last_rematched_at", "TIMESTAMP WITH TIME ZONE"),
            ("ai_rematching_reason", "TEXT"),
            ("ai_rematching_version", "INTEGER DEFAULT 1"),
            # AI Project and Impact Analytics (Phase 1 Part 11)
            ("ai_project_analytics_status", "VARCHAR(30) DEFAULT 'pending'"),
            ("ai_project_analytics", "JSON DEFAULT '{}'"),
            ("ai_project_feasibility_score", "FLOAT"),
            ("ai_project_impact_score", "FLOAT"),
            ("ai_project_readiness_score", "FLOAT"),
            ("ai_project_risk_score", "FLOAT"),
            ("ai_project_analytics_model", "VARCHAR(100)"),
            ("ai_project_analytics_analyzed_at", "TIMESTAMP WITH TIME ZONE"),
            ("is_active", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ]

        # Check and attempt pgvector extension safely without aborting transaction
        try:
            has_vector = conn.execute(
                text("SELECT 1 FROM pg_available_extensions WHERE name = 'vector';")
            ).scalar()
            if has_vector:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                logger.info("pgvector extension available and enabled.")
            else:
                logger.info("pgvector extension not installed in PostgreSQL; using JSON embedding & TF-IDF fallback.")
        except Exception as e:
            logger.info(f"pgvector extension check note: {e}; using JSON embedding & TF-IDF fallback.")

        existing_cols = {
            row[0].lower()
            for row in conn.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'reports';")
            )
        }
        for col_name, col_type in columns_to_add:
            if col_name.lower() not in existing_cols:
                try:
                    conn.execute(
                        text(f"ALTER TABLE reports ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                    )
                    logger.info(f"Column verified or added: reports.{col_name}")
                except Exception as e:
                    logger.warning(f"Note on adding column {col_name}: {e}")

        # 3. Add columns to users table safely
        user_columns_to_add = [
            ("department", "VARCHAR(255)"),
            ("designation", "VARCHAR(255)"),
            ("office_location", "VARCHAR(255)"),
            ("avatar_url", "VARCHAR(500)"),
        ]
        existing_user_cols = {
            row[0].lower()
            for row in conn.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users';")
            )
        }
        for col_name, col_type in user_columns_to_add:
            if col_name.lower() not in existing_user_cols:
                try:
                    conn.execute(
                        text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                    )
                    logger.info(f"Column verified or added: users.{col_name}")
                except Exception as e:
                    logger.warning(f"Note on adding user column {col_name}: {e}")

        # 4. Add columns to notifications table safely
        notification_columns_to_add = [
            ("action_url", "VARCHAR(255)"),
            ("read_at", "TIMESTAMP WITH TIME ZONE"),
            ("event_key", "VARCHAR(100)"),
            ("related_entity_id", "VARCHAR(100)"),
        ]
        existing_notif_cols = {
            row[0].lower()
            for row in conn.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications';")
            )
        }
        for col_name, col_type in notification_columns_to_add:
            if col_name.lower() not in existing_notif_cols:
                try:
                    conn.execute(
                        text(f"ALTER TABLE notifications ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                    )
                    logger.info(f"Column verified or added: notifications.{col_name}")
                except Exception as e:
                    logger.warning(f"Note on adding notification column {col_name}: {e}")

        # 5. Create indexes safely
        indexes_to_add = [
            "CREATE INDEX IF NOT EXISTS ix_reports_citizen_id ON reports (citizen_id);",
            "CREATE INDEX IF NOT EXISTS ix_reports_status ON reports (status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_district ON reports (district);",
            "CREATE INDEX IF NOT EXISTS ix_reports_category ON reports (category);",
            "CREATE INDEX IF NOT EXISTS ix_reports_priority ON reports (priority);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_analysis_status ON reports (ai_analysis_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_priority ON reports (ai_priority);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_priority_status ON reports (ai_priority_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_similarity_status ON reports (ai_similarity_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_duplicate_status ON reports (ai_duplicate_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_capability_status ON reports (ai_capability_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_hei_matching_status ON reports (ai_hei_matching_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_faculty_matching_status ON reports (ai_faculty_matching_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_capability_gap_status ON reports (ai_capability_gap_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_partner_matching_status ON reports (ai_partner_matching_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_rematching_status ON reports (ai_rematching_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_ai_project_analytics_status ON reports (ai_project_analytics_status);",
            "CREATE INDEX IF NOT EXISTS ix_reports_is_active ON reports (is_active);",
            "CREATE INDEX IF NOT EXISTS ix_notifications_event_key ON notifications (event_key);",
            "CREATE INDEX IF NOT EXISTS ix_notifications_related_entity_id ON notifications (related_entity_id);",
        ]

        for idx_sql in indexes_to_add:
            try:
                conn.execute(text(idx_sql))
            except Exception as e:
                logger.warning(f"Note on index creation: {e}")

    logger.info("Schema migrations completed successfully.")

    # 5. Seed demo users & backfill status history using Session
    db = SessionLocal()
    try:
        # Seed users
        for u in DEMO_USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                new_user = User(
                    full_name=u["full_name"],
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                    organization_name=u["organization_name"],
                    department=u.get("department"),
                    designation=u.get("designation"),
                    office_location=u.get("office_location"),
                    phone=u["phone"],
                    is_active=True,
                )
                db.add(new_user)
                logger.info(f"Seeded user: {u['email']} ({u['role']})")
            else:
                # Backfill department, designation, office_location if missing
                changed = False
                if not existing.department and u.get("department"):
                    existing.department = u["department"]
                    changed = True
                if not existing.designation and u.get("designation"):
                    existing.designation = u["designation"]
                    changed = True
                if not existing.office_location and u.get("office_location"):
                    existing.office_location = u["office_location"]
                    changed = True
                if not existing.phone and u.get("phone"):
                    existing.phone = u["phone"]
                    changed = True
                if not existing.organization_name and u.get("organization_name"):
                    existing.organization_name = u["organization_name"]
                    changed = True
                if changed:
                    logger.info(f"Updated profile fields for existing demo user: {u['email']}")
        db.commit()

        # Seed initial status history for reports that don't have any
        reports = db.query(Report).all()
        for r in reports:
            has_history = db.query(ReportStatusHistory).filter(ReportStatusHistory.report_id == r.id).first()
            if not has_history:
                init_hist = ReportStatusHistory(
                    report_id=r.id,
                    previous_status=None,
                    new_status=r.status,
                    changed_by="System (Initial Submission)",
                    changed_at=r.created_at,
                    remarks=f"Initial problem logged with status '{r.status}'",
                )
                db.add(init_hist)
                logger.info(f"Created initial status history for {r.track_id}")

        # Seed initial announcements if none exist
        announcement_count = db.query(Announcement).count()
        if announcement_count == 0:
            sample_announcements = [
                Announcement(
                    title="Jharkhand State Citizen Innovation Challenge 2026",
                    message="Higher Education Institutes and Research Faculty can now adopt verified citizen water and infrastructure challenges for R&D grants.",
                    priority="High",
                    target_role="All Users",
                    is_active=True,
                    created_by="ImpactForge PMU",
                ),
                Announcement(
                    title="District Validation Drive: Namkum & Doranda Clusters",
                    message="Government municipal teams are conducting on-site field visits for pipeline repair verifications.",
                    priority="Normal",
                    target_role="government",
                    is_active=True,
                    created_by="District Innovation Cell",
                ),
            ]
            db.add_all(sample_announcements)
            logger.info("Seeded initial announcements.")

        # Seed initial authentic Government alerts with idempotency (keyed by event_key)
        sample_gov_alerts = [
            {
                "event_key": "alert_high_priority_IF-JH-2026-0002",
                "role": "government",
                "type": "high_priority_problem",
                "title": "High-Priority Problem Awaiting Review",
                "message": "Contaminated Handpump Water Supply in Doranda Ward 4 requires immediate departmental verification and resource allocation.",
                "related_track_id": "IF-JH-2026-0002",
                "related_entity_id": "IF-JH-2026-0002",
                "priority": "Critical",
                "action_url": "/government/problems/IF-JH-2026-0002/review",
                "is_read": False,
            },
            {
                "event_key": "alert_high_priority_IF-JH-2026-0009",
                "role": "government",
                "type": "high_priority_problem",
                "title": "Critical Public Safety Hazard Logged",
                "message": "Open high voltage electrical wire sparking creating immediate danger near Ranchi residential corridor.",
                "related_track_id": "IF-JH-2026-0009",
                "related_entity_id": "IF-JH-2026-0009",
                "priority": "Critical",
                "action_url": "/government/problems/IF-JH-2026-0009/review",
                "is_read": False,
            },
            {
                "event_key": "alert_duplicate_detected_IF-JH-2026-0008",
                "role": "government",
                "type": "duplicate_detected",
                "title": "Duplicate Analysis Requires Attention",
                "message": "AI detected semantic similarity between pedestrian footbridge damage reports in Ranchi cluster.",
                "related_track_id": "IF-JH-2026-0008",
                "related_entity_id": "IF-JH-2026-0008",
                "priority": "Important",
                "action_url": "/government/duplicate-analysis",
                "is_read": False,
            },
            {
                "event_key": "alert_verification_pending_IF-JH-2026-0045",
                "role": "government",
                "type": "verification_pending",
                "title": "Drainage Infrastructure Verification Pending",
                "message": "Blocked storm drain near Kutchery Road is queued for on-ground municipal verification.",
                "related_track_id": "IF-JH-2026-0045",
                "related_entity_id": "IF-JH-2026-0045",
                "priority": "Normal",
                "action_url": "/government/problems/IF-JH-2026-0045/review",
                "is_read": False,
            },
            {
                "event_key": "alert_project_assigned_IF-JH-2026-0135",
                "role": "government",
                "type": "project_assigned",
                "title": "University Project Matching Recommended",
                "message": "Crop disease early detection challenge matched with BIT Mesra Agri-Tech research laboratory.",
                "related_track_id": "IF-JH-2026-0135",
                "related_entity_id": "IF-JH-2026-0135",
                "priority": "Normal",
                "action_url": "/government/hei-matching",
                "is_read": True,
            },
            {
                "event_key": "alert_milestone_IF-JH-2026-0423",
                "role": "government",
                "type": "milestone_approaching",
                "title": "Local Language Learning Pilot Milestone Approaching",
                "message": "Education department language curriculum pilot is approaching its Stage 2 review milestone.",
                "related_track_id": "IF-JH-2026-0423",
                "related_entity_id": "IF-JH-2026-0423",
                "priority": "Normal",
                "action_url": "/government/projects",
                "is_read": True,
            },
        ]

        for ga in sample_gov_alerts:
            existing_alert = db.query(Notification).filter(Notification.event_key == ga["event_key"]).first()
            if not existing_alert:
                new_alert = Notification(
                    event_key=ga["event_key"],
                    role=ga["role"],
                    type=ga["type"],
                    title=ga["title"],
                    message=ga["message"],
                    related_track_id=ga.get("related_track_id"),
                    related_entity_id=ga.get("related_entity_id"),
                    priority=ga["priority"],
                    action_url=ga.get("action_url"),
                    is_read=ga["is_read"],
                    is_dismissed=False,
                )
                db.add(new_alert)
        db.commit()

        # Seed initial demo HEI profiles if none exist
        hei_count = db.query(HEIProfile).count()
        if hei_count == 0:
            for sp in SEED_HEI_PROFILES:
                new_hei = HEIProfile(
                    hei_id=sp["hei_id"],
                    name=sp["name"],
                    district=sp["district"],
                    state=sp["state"],
                    institution_type=sp["institution_type"],
                    departments=sp["departments"],
                    available_skills=sp["available_skills"],
                    technical_domains=sp["technical_domains"],
                    laboratories=sp["laboratories"],
                    equipment=sp["equipment"],
                    software_tools=sp["software_tools"],
                    project_experience=sp["project_experience"],
                    available_faculty_capacity=sp["available_faculty_capacity"],
                    verification_status=sp["verification_status"],
                    contact_email=sp["contact_email"],
                    associated_user_email=sp["associated_user_email"],
                )
                db.add(new_hei)
            logger.info(f"Seeded {len(SEED_HEI_PROFILES)} demo HEI profiles.")

        # Seed initial demo Faculty profiles if none exist
        fac_count = db.query(FacultyProfile).count()
        if fac_count == 0:
            for sp in SEED_FACULTY_PROFILES:
                new_fac = FacultyProfile(
                    faculty_id=sp["faculty_id"],
                    name=sp["name"],
                    institution_id=sp["institution_id"],
                    institution_name=sp["institution_name"],
                    department=sp["department"],
                    skills=sp["skills"],
                    technical_domains=sp["technical_domains"],
                    research_expertise=sp["research_expertise"],
                    project_experience=sp["project_experience"],
                    availability=sp["availability"],
                    current_workload=sp["current_workload"],
                    district=sp["district"],
                    state=sp["state"],
                    verification_status=sp["verification_status"],
                    contact_email=sp["contact_email"],
                    associated_user_email=sp["associated_user_email"],
                )
                db.add(new_fac)
            logger.info(f"Seeded {len(SEED_FACULTY_PROFILES)} demo Faculty profiles.")

        # Seed initial demo Student profiles if none exist
        stu_count = db.query(StudentProfile).count()
        if stu_count == 0:
            for sp in SEED_STUDENT_PROFILES:
                new_stu = StudentProfile(
                    student_id=sp["student_id"],
                    name=sp["name"],
                    institution_id=sp["institution_id"],
                    institution_name=sp["institution_name"],
                    department=sp["department"],
                    skills=sp["skills"],
                    technical_domains=sp["technical_domains"],
                    interests=sp["interests"],
                    project_experience=sp["project_experience"],
                    availability=sp["availability"],
                    current_workload=sp["current_workload"],
                    district=sp["district"],
                    state=sp["state"],
                    verification_status=sp["verification_status"],
                    contact_email=sp["contact_email"],
                    associated_user_email=sp["associated_user_email"],
                )
                db.add(new_stu)
            logger.info(f"Seeded {len(SEED_STUDENT_PROFILES)} demo Student profiles.")

        # Seed initial demo Partner profiles if none exist
        partner_count = db.query(PartnerProfile).count()
        if partner_count == 0:
            for sp in SEED_PARTNER_PROFILES:
                new_partner = PartnerProfile(
                    partner_id=sp["partner_id"],
                    organization_name=sp["organization_name"],
                    partner_type=sp["partner_type"],
                    location=sp["location"],
                    service_districts=sp["service_districts"],
                    supported_domains=sp["supported_domains"],
                    supported_skills=sp["supported_skills"],
                    equipment=sp["equipment"],
                    materials=sp["materials"],
                    software_tools=sp["software_tools"],
                    manpower_support=sp["manpower_support"],
                    funding_capacity=sp["funding_capacity"],
                    maximum_project_budget=sp["maximum_project_budget"],
                    support_types=sp["support_types"],
                    previous_experience=sp["previous_experience"],
                    availability=sp["availability"],
                    verification_status=sp["verification_status"],
                    contact_email=sp["contact_email"],
                    associated_user_email=sp["associated_user_email"],
                )
                db.add(new_partner)
            logger.info(f"Seeded {len(SEED_PARTNER_PROFILES)} demo Partner profiles.")

        # Seed initial AI Model Versions if none exist
        model_ver_count = db.query(AIModelVersion).count()
        if model_ver_count == 0:
            active_model = AIModelVersion(
                version_tag="v1.0.0",
                model_name="gemini-1.5-flash",
                provider="gemini",
                status="active",
                dataset_version="v1.0",
                accuracy_score=94.8,
                f1_score=92.4,
                latency_ms=315.0,
                deployed_at=func.now(),
                created_by="ImpactForge PMU",
            )
            prev_model = AIModelVersion(
                version_tag="v0.9.0",
                model_name="gemini-1.0-pro",
                provider="gemini",
                status="deprecated",
                dataset_version="v0.9",
                accuracy_score=91.2,
                f1_score=89.0,
                latency_ms=480.0,
                deployed_at=None,
                created_by="ImpactForge PMU",
            )
            db.add_all([active_model, prev_model])
            logger.info("Seeded initial AI Model Versions (v1.0.0 active, v0.9.0 deprecated).")

        # Seed initial AI Feedback records if none exist
        feedback_count = db.query(AIFeedback).count()
        if feedback_count == 0:
            sample_feedback = [
                AIFeedback(
                    prediction_type="priority",
                    original_prediction={"priority": "High", "score": 85},
                    corrected_value={"priority": "Medium", "score": 60},
                    feedback_status="incorrect",
                    feedback_reason="The pipeline leak is localized to an internal lane in Ward 4 and does not affect the main municipal trunk.",
                    admin_feedback="Confirmed with local municipal executive engineer. Priority lowered to Medium.",
                    reviewer_email="admin@impactforge.org",
                    model_version="v1.0.0",
                ),
                AIFeedback(
                    prediction_type="category",
                    original_prediction={"category": "Other", "subcategory": "General Civic Issue"},
                    corrected_value={"category": "Public Safety", "subcategory": "Hazardous Conditions", "problem_type": "Exposed Live Wire"},
                    feedback_status="incorrect",
                    feedback_reason="Citizen report mentions dangling electricity cable over school route. Should be categorized as Public Safety.",
                    admin_feedback="Critical safety issue requiring rapid electrical board dispatch.",
                    reviewer_email="admin@impactforge.org",
                    model_version="v1.0.0",
                ),
                AIFeedback(
                    prediction_type="category",
                    original_prediction={"category": "Water and Sanitation", "subcategory": "Drinking Water Supply"},
                    corrected_value={"category": "Water and Sanitation", "subcategory": "Drinking Water Supply"},
                    feedback_status="correct",
                    feedback_reason="Classification accurately identified rural handpump contamination report.",
                    admin_feedback="Classification verified by district validator.",
                    reviewer_email="admin@impactforge.org",
                    model_version="v1.0.0",
                ),
            ]
            db.add_all(sample_feedback)
            logger.info("Seeded initial AI Feedback records.")

        # Seed initial Training Records if none exist
        training_count = db.query(TrainingRecord).count()
        if training_count == 0:
            sample_training_records = [
                TrainingRecord(
                    input_text="Severe sewage overflow near Bariatu Government School causing waterlogging and health hazard.",
                    prediction_type="category",
                    original_prediction={"category": "Other", "confidence": 0.52},
                    target_label={"category": "Water and Sanitation", "subcategory": "Sewage and Drainage", "problem_type": "Open Drain Overflow"},
                    feedback_reason="School waterlogging should be under Water and Sanitation Sewage and Drainage.",
                    approval_status="approved",
                    approved_by="admin@impactforge.org",
                    approved_at=func.now(),
                    dataset_version="v1.0",
                ),
                TrainingRecord(
                    input_text="Deep potholes and missing asphalt across 2km stretch on Namkum-Doranda road creating high collision risk for two-wheelers.",
                    prediction_type="priority",
                    original_prediction={"priority": "Medium", "score": 62},
                    target_label={"priority": "High", "score": 88},
                    feedback_reason="High arterial traffic route with severe collision hazard warrants High priority.",
                    approval_status="approved",
                    approved_by="admin@impactforge.org",
                    approved_at=func.now(),
                    dataset_version="v1.0",
                ),
                TrainingRecord(
                    input_text="Primary Health Center at Ratu lacks antivenom and essential pediatric antibiotics for past 3 weeks.",
                    prediction_type="category",
                    original_prediction={"category": "Healthcare", "subcategory": "Clinical Services", "problem_type": "Medicine Out of Stock"},
                    target_label={"category": "Healthcare", "subcategory": "Clinical Services", "problem_type": "Medicine Out of Stock"},
                    feedback_reason="Ground truth verified against district medical officer audit report.",
                    approval_status="approved",
                    approved_by="admin@impactforge.org",
                    approved_at=func.now(),
                    dataset_version="v1.0",
                ),
                TrainingRecord(
                    input_text="Streetlights completely defunct across Doranda residential block for 15 days.",
                    prediction_type="category",
                    original_prediction={"category": "Public Safety", "subcategory": "Hazardous Conditions", "problem_type": "Dark Unlit Alley"},
                    target_label={"category": "Public Safety", "subcategory": "Hazardous Conditions", "problem_type": "Dark Unlit Alley"},
                    feedback_reason="Accurate classification of street illumination civic failure.",
                    approval_status="approved",
                    approved_by="admin@impactforge.org",
                    approved_at=func.now(),
                    dataset_version="v1.0",
                ),
                TrainingRecord(
                    input_text="Borewell motor failure causing water supply disruption to 80 households in Chutia.",
                    prediction_type="priority",
                    original_prediction={"priority": "Low", "score": 40},
                    target_label={"priority": "High", "score": 82},
                    feedback_reason="Multi-household drinking water disruption is High priority.",
                    approval_status="approved",
                    approved_by="admin@impactforge.org",
                    approved_at=func.now(),
                    dataset_version="v1.0",
                ),
                TrainingRecord(
                    input_text="Illegal garbage dumping near Harmu riverbank during night hours.",
                    prediction_type="category",
                    original_prediction={"category": "Environment", "confidence": 0.60},
                    target_label={"category": "Environment", "subcategory": "Pollution Control", "problem_type": "Illegal Waste Dumping"},
                    feedback_reason="Pending final review by municipal sanitation inspector.",
                    approval_status="pending",
                    approved_by=None,
                    approved_at=None,
                    dataset_version="v1.0",
                ),
            ]
            db.add_all(sample_training_records)
            logger.info("Seeded initial AI Training Records.")

        # Seed initial Retraining Job if none exists
        jobs_count = db.query(AIRetrainingJob).count()
        if jobs_count == 0:
            hist_job = AIRetrainingJob(
                job_id="RT-2026-001",
                status="completed",
                base_model_version="v0.9.0",
                candidate_model_version="v1.0.0",
                dataset_version="v1.0",
                approved_records_count=5,
                progress_percent=100,
                logs=[
                    "2026-09-01T10:00:00Z - Job initiated by ImpactForge PMU.",
                    "2026-09-01T10:00:05Z - Training dataset validated with 5 verified ground-truth records.",
                    "2026-09-01T10:02:15Z - Fine-tuning embedding representations and category classification heads.",
                    "2026-09-01T10:05:30Z - Candidate model evaluated against held-out civic test split.",
                    "2026-09-01T10:06:00Z - Accuracy improved from 91.2% to 94.8%. Loss reduced by 18.4%.",
                    "2026-09-01T10:10:00Z - Approved and deployed to production by Super Admin.",
                ],
                evaluation_metrics={
                    "old_accuracy": 91.2,
                    "new_accuracy": 94.8,
                    "old_f1": 89.0,
                    "new_f1": 92.4,
                    "old_loss": 0.38,
                    "new_loss": 0.21,
                    "latency_ms": 315.0,
                },
                approval_status="approved",
                reviewed_by="admin@impactforge.org",
                reviewed_at=func.now(),
                started_by="admin@impactforge.org",
                started_at=func.now(),
                completed_at=func.now(),
            )
            db.add(hist_job)
            logger.info("Seeded initial historical AIRetrainingJob RT-2026-001.")

        db.commit()
        logger.info("All demo data seeded and verified.")

        # Ensure exactly 10 unique problems are active across all prototype portals
        from app.db.activate_ten_reports import activate_ten_reports
        activate_ten_reports()
    except Exception as e:
        db.rollback()
        logger.error(f"Error during data seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migrations()

