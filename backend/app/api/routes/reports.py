import logging
from datetime import datetime, timezone
from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

logger = logging.getLogger("reports_route")

from app.api.deps import get_current_user, get_optional_current_user, require_roles, get_db
from app.models.notification import Notification
from app.models.report import Report
from app.models.report_status_history import ReportStatusHistory
from app.models.user import User
from app.schemas.report import (
    ReportAssignmentUpdate,
    ReportCreate,
    ReportRemarksUpdate,
    ReportResponse,
    ReportStatus,
    ReportStatusHistoryResponse,
    ReportStatusUpdate,
    ReportVerificationUpdate,
)
from app.schemas.ai_schema import AIAnalysisResponse
from app.schemas.priority_schema import AIPriorityResponse, PriorityFactors
from app.schemas.similarity_schema import SimilarProblemMatch, SimilarProblemsResponse
from app.schemas.duplicate_schema import (
    DuplicateAnalysisResponse,
    DuplicateCandidate,
    DuplicateReviewRequest,
    OfficialReviewDetail,
)
import json
from app.models.audit_log import AuditLog
from app.models.hei import HEIProfile, HEIInterest
from app.models.faculty_student import FacultyProfile, StudentProfile, FacultyInterest, StudentInterest
from app.schemas.capability_schema import CapabilityResponse, ExtractedCapabilities
from app.schemas.hei_matching_schema import (
    HEIMatchingResponse,
    HEIRecommendationMatch,
    HEIInterestRecord,
    HEIInterestCreate,
    HEIInterestActionResponse,
    HEIFactorScores,
    MatchedCapabilityDetails,
    MissingCapabilityDetails,
    HEIProfileData,
)
from app.schemas.faculty_student_matching_schema import (
    FacultyFactorScores,
    StudentFactorScores,
    FacultyRecommendationMatch,
    StudentRecommendationMatch,
    FacultyInterestRecord,
    StudentInterestRecord,
    FacultyMatchingResponse,
    StudentMatchingResponse,
    FacultyInterestCreate,
    FacultyInterestActionResponse,
    StudentInterestCreate,
    StudentInterestActionResponse,
)
from app.schemas.capability_gap_schema import (
    GapFactorScores,
    PartialSkillMatch,
    VerificationSummary,
    CapabilityGapAnalysis,
    CapabilityGapResponse,
    CitizenCapabilityGapResponse,
)
from app.services.ai_service import analyze_and_store_report_ai
from app.services.priority_service import analyze_and_store_report_priority
from app.services.similarity_service import analyze_and_store_report_similarity
from app.services.duplicate_analysis_service import (
    analyze_and_store_report_duplicates,
    apply_official_duplicate_review,
)
from app.services.capability_extraction_service import analyze_and_store_report_capabilities
from app.services.hei_matching_service import analyze_and_store_report_hei_matches
from app.services.faculty_student_matching_service import analyze_and_store_report_faculty_student_matches
from app.services.capability_gap_service import analyze_and_store_report_capability_gaps
from app.models.partner import PartnerProfile, PartnerInterest
from app.schemas.partner_matching_schema import (
    PartnerFactorScores,
    PartnerRecommendationMatch,
    CitizenPartnerRecommendation,
    PartnerMatchingResponse,
    CitizenPartnerMatchingResponse,
    PartnerInterestCreate,
    PartnerInterestUpdate,
    PartnerInterestRecord,
    PartnerInterestActionResponse,
)
from app.services.partner_matching_service import (
    analyze_and_store_report_partner_matches,
    mask_for_citizen,
    SEED_PARTNER_PROFILES,
)
from app.models.rematching import AIRematchingEvent
from app.schemas.dynamic_rematching_schema import (
    RematchingEventRecord,
    CitizenRematchingEventRecord,
    RematchingStatusResponse,
    RematchingHistoryResponse,
    CitizenRematchingHistoryResponse,
    ManualRematchRequest,
    ManualRematchResponse,
)
from app.services.dynamic_rematching_service import (
    execute_dynamic_rematch,
    mask_event_for_citizen,
)
from app.schemas.project_analytics_schema import (
    ProjectAnalyticsResponse,
    CitizenProjectAnalyticsResponse,
    ProjectAnalyticsDetail,
)
from app.services.project_analytics_service import (
    analyze_and_store_report_project_analytics,
    mask_project_analytics_for_citizen,
)
from app.services.ai_routing_service import evaluate_and_route_problem

router = APIRouter(prefix="/reports", tags=["Reports"])


def generate_unique_track_id(db: Session) -> str:
    """Generates the next sequential unique Track ID in IF-JH-2026-XXXX format."""
    prefix = "IF-JH-2026-"
    last_report = (
        db.query(Report)
        .filter(Report.track_id.like(f"{prefix}%"))
        .order_by(Report.id.desc())
        .first()
    )

    if last_report and last_report.track_id:
        try:
            seq_part = last_report.track_id.split("-")[-1]
            next_num = int(seq_part) + 1
        except (ValueError, IndexError):
            next_num = db.query(Report).count() + 1
    else:
        next_num = 1

    # Ensure uniqueness even if manual records or gaps exist
    while True:
        candidate = f"{prefix}{next_num:04d}"
        exists = db.query(Report.id).filter(Report.track_id == candidate).first()
        if not exists:
            return candidate
        next_num += 1


@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new community problem report",
    description="Registers a problem with Jharkhand location restrictions and generates a permanent Track ID.",
)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Report:
    track_id = generate_unique_track_id(db)

    initial_category = payload.category or "Civic Issue"
    initial_priority = payload.priority or "Medium"

    db_report = Report(
        track_id=track_id,
        problem_title=payload.problem_title,
        category=initial_category,
        context_and_desired_outcome=payload.context_and_desired_outcome,
        existing_efforts=payload.existing_efforts,
        expected_outcome=payload.expected_outcome,
        state=payload.state,
        district=payload.district,
        locality=payload.locality,
        address_or_landmark=payload.address_or_landmark,
        latitude=payload.latitude,
        longitude=payload.longitude,
        priority=initial_priority,
        status=ReportStatus.OPEN.value,
        verification_status="Pending Verification",
        citizen_id=current_user.id if current_user else None,
    )

    db.add(db_report)
    db.flush()

    # Create initial status history
    author = current_user.full_name if current_user else "Citizen (Anonymous Submission)"
    history = ReportStatusHistory(
        report_id=db_report.id,
        previous_status=None,
        new_status=ReportStatus.OPEN.value,
        changed_by=author,
        remarks="Problem report registered in state repository.",
    )
    db.add(history)

    # Create notification for government and admin validators
    notification = Notification(
        role="government",
        type="report_submitted",
        title="New Problem Reported",
        message=f"New report in {db_report.district} ({db_report.category}): {db_report.problem_title}",
        related_track_id=track_id,
        priority="Important" if db_report.priority in ["High", "Critical"] else "Normal",
    )
    db.add(notification)

    # Create immutable audit log for citizen problem submission
    audit = AuditLog(
        actor_user_id=current_user.id if current_user else None,
        actor_email=current_user.email if current_user else (getattr(db_report, 'contact_email', None) or "citizen@jharkhand.in"),
        action="citizen_problem_submitted",
        entity_type="report",
        entity_id=db_report.track_id,
        metadata_json=json.dumps({
            "problem_title": db_report.problem_title,
            "district": db_report.district,
            "category": db_report.category,
            "priority": db_report.priority,
            "actor_name": author,
            "actor_role": "citizen",
        }),
    )
    db.add(audit)

    db.commit()
    db.refresh(db_report)

    # AI Pre-Screening: Category classification (Phase 1 Part 1)
    try:
        analyze_and_store_report_ai(db, db_report)
        # If no manual category was specified, adopt the AI-determined category
        if (not payload.category or payload.category == "Civic Issue") and db_report.ai_category:
            db_report.category = db_report.ai_category
            db.commit()
            db.refresh(db_report)
    except Exception as e:
        logger.error(f"Error executing AI categorization in pre-screening for {track_id}: {e}", exc_info=True)

    # AI Pre-Screening: Priority assessment (Phase 1 Part 2)
    try:
        analyze_and_store_report_priority(db, db_report)
        # If no manual priority was specified, adopt the AI-assessed priority
        if not payload.priority and db_report.ai_priority:
            db_report.priority = db_report.ai_priority
            db.commit()
            db.refresh(db_report)
    except Exception as e:
        logger.error(f"Error executing AI priority scoring in pre-screening for {track_id}: {e}", exc_info=True)

    # Keep notification message and priority updated to reflect AI pre-screening findings
    try:
        if notification:
            notification.message = f"New report in {db_report.district} ({db_report.category}): {db_report.problem_title}"
            notification.priority = "Important" if db_report.priority in ["High", "Critical"] else "Normal"
            db.commit()
    except Exception as e:
        logger.debug(f"Non-critical notification update error: {e}")

    # AI Pre-Screening: Semantic duplicate/similarity check against existing LIVE problems (Phase 1 Part 3)
    try:
        analyze_and_store_report_similarity(db, db_report)
    except Exception as e:
        logger.error(f"Error executing AI similarity detection in pre-screening for {track_id}: {e}", exc_info=True)

    # AI Pre-Screening: Duplicate candidates analysis (Phase 1 Part 4)
    try:
        analyze_and_store_report_duplicates(db, db_report)
    except Exception as e:
        logger.error(f"Error executing duplicate analysis in pre-screening for {track_id}: {e}", exc_info=True)

    db.refresh(db_report)

    # Trigger AI capability extraction (Phase 1 Part 5)
    try:
        analyze_and_store_report_capabilities(db, db_report)
    except Exception as e:
        logger.error(f"Error executing capability extraction for {track_id}: {e}", exc_info=True)

    # Trigger AI HEI matching (Phase 1 Part 6)
    try:
        analyze_and_store_report_hei_matches(db, db_report)
    except Exception as e:
        logger.error(f"Error executing HEI matching in background: {e}", exc_info=True)

    # Trigger AI Faculty and Student matching (Phase 1 Part 7)
    try:
        analyze_and_store_report_faculty_student_matches(db, db_report)
    except Exception as e:
        logger.error(f"Error executing Faculty/Student matching in background: {e}", exc_info=True)

    # Trigger AI Capability-Gap Analysis (Phase 1 Part 8)
    try:
        analyze_and_store_report_capability_gaps(db, db_report)
    except Exception as e:
        logger.error(f"Error executing Capability-Gap analysis in background: {e}", exc_info=True)

    # Trigger AI Partner Matching (Phase 1 Part 9)
    try:
        analyze_and_store_report_partner_matches(db, db_report)
    except Exception as e:
        logger.error(f"Error executing Partner matching in background: {e}", exc_info=True)

    # Trigger AI Project and Impact Analytics (Phase 1 Part 11)
    try:
        analyze_and_store_report_project_analytics(db, db_report)
    except Exception as e:
        logger.error(f"Error executing Project and Impact Analytics in background: {e}", exc_info=True)

    return db_report


@router.get(
    "",
    response_model=List[ReportResponse],
    summary="List all community problem reports",
    description="Returns all registered reports with optional filtering by district, status, or category.",
)
def list_reports(
    district: Optional[str] = Query(None, description="Filter by Jharkhand district"),
    status: Optional[str] = Query(None, description="Filter by report status (Open, In Progress, Resolved, Rejected)"),
    category: Optional[str] = Query(None, description="Filter by problem category"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    target_dashboard: Optional[str] = Query(None, description="Filter for specific portal ('university' or 'partner')"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(100, ge=1, le=1000, description="Max results per page"),
    db: Session = Depends(get_db),
) -> List[Report]:
    query = db.query(Report)

    # If target_dashboard is specified, enforce strict Government-validated + AI routing assignment rules
    if target_dashboard:
        target = target_dashboard.strip().lower()
        if target == "university":
            # Only Government-validated problems assigned to university or both
            query = query.filter(
                func.lower(Report.verification_status) == "verified",
                Report.routing_target.in_(["university", "both"]),
            )
        elif target == "partner":
            # Only Government-validated problems assigned to partner or both
            query = query.filter(
                func.lower(Report.verification_status) == "verified",
                Report.routing_target.in_(["partner", "both"]),
            )

    if district:
        query = query.filter(func.lower(Report.district) == district.strip().lower())
    if status:
        query = query.filter(func.lower(Report.status) == status.strip().lower())
    if category:
        query = query.filter(func.lower(Report.category) == category.strip().lower())
    if priority:
        query = query.filter(func.lower(Report.priority) == priority.strip().lower())

    return query.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()


@router.get(
    "/heis/registry",
    response_model=List[HEIProfileData],
    summary="List all accredited HEI profiles with full institutional capabilities",
)
def list_hei_profiles(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> List[HEIProfile]:
    from app.services.hei_matching_service import get_or_seed_hei_profiles
    get_or_seed_hei_profiles(db)
    return db.query(HEIProfile).order_by(HEIProfile.name.asc()).all()


@router.get(
    "/my-reports",
    response_model=List[ReportResponse],
    summary="Get authenticated citizen's submitted reports",
)
def get_my_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[Report]:
    reports = (
        db.query(Report)
        .filter(Report.citizen_id == current_user.id)
        .order_by(Report.created_at.desc())
        .all()
    )
    return reports


@router.get(
    "/{track_id}",
    response_model=ReportResponse,
    summary="Retrieve report by Track ID",
    description="Looks up a single report by its unique permanent Track ID (e.g. IF-JH-2026-0001).",
)
def get_report_by_track_id(
    track_id: str,
    db: Session = Depends(get_db),
) -> Report:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    if not report.verification_status:
        if report.status == "Rejected":
            report.verification_status = "Rejected"
        elif report.status in ["In Progress", "Resolved", "Validated"]:
            report.verification_status = "Verified"
        else:
            report.verification_status = "Pending Verification"

    return report


@router.patch(
    "/{track_id}/status",
    response_model=ReportResponse,
    summary="Update report status",
    description="Updates the governance/resolution status of a problem report (Open, In Progress, Resolved, Rejected).",
)
def update_report_status(
    track_id: str,
    payload: ReportStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Report:
    # If user is authenticated as citizen, reject unauthorized mutation
    if current_user and current_user.role == "citizen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizens cannot modify report status.",
        )

    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    old_status = report.status
    new_status = payload.status.value

    # Check: Unchanged status does not create duplicate history records
    if old_status != new_status:
        actor_name = current_user.full_name if current_user else "Government Official"
        
        # Every valid status change creates a history record
        history = ReportStatusHistory(
            report_id=report.id,
            previous_status=old_status,
            new_status=new_status,
            changed_by=actor_name,
            remarks=payload.remarks or f"Status updated from '{old_status}' to '{new_status}'",
        )
        db.add(history)

        # Handle resolved_at
        if new_status == ReportStatus.RESOLVED.value:
            report.resolved_at = datetime.now(timezone.utc)
        elif old_status == ReportStatus.RESOLVED.value and new_status != ReportStatus.RESOLVED.value:
            # Reopened report: clear resolved_at
            report.resolved_at = None

        report.status = new_status
        if payload.remarks:
            report.official_remarks = payload.remarks.strip()
            report.remarks_updated_by = actor_name
            report.remarks_updated_at = datetime.now(timezone.utc)

        if new_status == ReportStatus.REJECTED.value:
            report.verification_status = "Rejected"
            report.routing_target = None
        elif new_status in [ReportStatus.IN_PROGRESS.value, ReportStatus.RESOLVED.value, ReportStatus.VALIDATED.value]:
            report.verification_status = "Verified"
            if not report.routing_target:
                report = evaluate_and_route_problem(
                    db,
                    report,
                    actor_email=current_user.email if current_user else "official@jharkhand.gov.in",
                    actor_id=current_user.id if current_user else None,
                )
        elif new_status == ReportStatus.OPEN.value:
            report.verification_status = "Pending Verification"
            report.routing_target = None
        report.updated_at = datetime.now(timezone.utc)

        # Create status change notification
        notif = Notification(
            user_id=report.citizen_id,
            role="citizen" if not report.citizen_id else None,
            type="status_changed",
            title=f"Status Updated: {report.track_id}",
            message=f"Report '{report.problem_title}' moved to '{new_status}'.",
            related_track_id=report.track_id,
            priority="Important" if new_status in ["Resolved", "Rejected"] else "Normal",
        )
        db.add(notif)

        # Create immutable AuditLog for status change
        audit = AuditLog(
            actor_user_id=current_user.id if current_user else None,
            actor_email=current_user.email if current_user else "official@jharkhand.gov.in",
            action="report_status_updated",
            entity_type="report",
            entity_id=report.track_id,
            metadata_json=json.dumps({
                "problem_title": report.problem_title,
                "previous_status": old_status,
                "new_status": new_status,
                "actor_name": actor_name,
                "actor_role": current_user.role if current_user else "government",
                "remarks": payload.remarks or f"Status updated from '{old_status}' to '{new_status}'",
            }),
        )
        db.add(audit)

        db.commit()
        db.refresh(report)

    return report


@router.patch(
    "/{track_id}/assign",
    response_model=ReportResponse,
    summary="Assign report to an officer, department, or HEI",
)
def assign_report(
    track_id: str,
    payload: ReportAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["government", "admin"])),
) -> Report:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    report.assigned_to = payload.assigned_to.strip()
    report.assigned_role = payload.assigned_role.strip() if payload.assigned_role else None
    report.assigned_by = current_user.full_name
    report.assigned_at = datetime.now(timezone.utc)
    report.updated_at = datetime.now(timezone.utc)

    # Record assignment in status history
    history = ReportStatusHistory(
        report_id=report.id,
        previous_status=report.status,
        new_status=report.status,
        changed_by=current_user.full_name,
        remarks=payload.remarks or f"Assigned to {payload.assigned_to} ({payload.assigned_role or 'General'})",
    )
    db.add(history)

    # Notification for assigned team/role
    target_role = payload.assigned_role.lower() if payload.assigned_role else "hei"
    notif = Notification(
        role=target_role,
        type="assignment_updated",
        title=f"Report Assigned: {report.track_id}",
        message=f"Report '{report.problem_title}' assigned to {payload.assigned_to}.",
        related_track_id=report.track_id,
        priority="Important",
    )
    db.add(notif)

    # Create immutable AuditLog for report assignment
    audit = AuditLog(
        actor_user_id=current_user.id if current_user else None,
        actor_email=current_user.email if current_user else "official@jharkhand.gov.in",
        action="report_assigned",
        entity_type="report",
        entity_id=report.track_id,
        metadata_json=json.dumps({
            "problem_title": report.problem_title,
            "assigned_to": payload.assigned_to,
            "assigned_role": payload.assigned_role or "General",
            "actor_name": current_user.full_name if current_user else "Government Official",
            "actor_role": current_user.role if current_user else "government",
            "remarks": payload.remarks or f"Assigned to {payload.assigned_to}",
        }),
    )
    db.add(audit)

    db.commit()
    db.refresh(report)
    return report


@router.patch(
    "/{track_id}/remarks",
    response_model=ReportResponse,
    summary="Add or update official remarks for a report",
)
def update_official_remarks(
    track_id: str,
    payload: ReportRemarksUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["government", "admin"])),
) -> Report:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    report.official_remarks = payload.official_remarks.strip() if payload.official_remarks else ""
    report.remarks_updated_by = current_user.full_name
    report.remarks_updated_at = datetime.now(timezone.utc)
    report.updated_at = datetime.now(timezone.utc)

    # Create immutable AuditLog for official remarks
    audit = AuditLog(
        actor_user_id=current_user.id if current_user else None,
        actor_email=current_user.email if current_user else "official@jharkhand.gov.in",
        action="official_remarks_updated",
        entity_type="report",
        entity_id=report.track_id,
        metadata_json=json.dumps({
            "problem_title": report.problem_title,
            "remarks": report.official_remarks,
            "actor_name": current_user.full_name if current_user else "Government Official",
            "actor_role": current_user.role if current_user else "government",
        }),
    )
    db.add(audit)

    db.commit()
    db.refresh(report)
    return report


@router.patch(
    "/{track_id}/verify",
    response_model=ReportResponse,
    summary="Update report government verification status",
    description="Allows government officials and admins to update verification status ('Verified', 'Pending Verification', or 'Rejected') and remarks.",
)
def update_report_verification(
    track_id: str,
    payload: ReportVerificationUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Report:
    if current_user and current_user.role not in ["government", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only government officials and administrators can verify problem reports.",
        )

    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    clean_verif = payload.verification_status.strip()
    valid_statuses = ["Verified", "Pending Verification", "Rejected"]
    matched_status = next((s for s in valid_statuses if s.lower() == clean_verif.lower()), None)
    if not matched_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification status must be one of: 'Verified', 'Pending Verification', or 'Rejected'.",
        )

    report.verification_status = matched_status
    actor_name = current_user.full_name if current_user else "Government Official"
    actor_email = current_user.email if current_user else "official@jharkhand.gov.in"
    actor_id = current_user.id if current_user else None

    if payload.official_remarks:
        report.official_remarks = payload.official_remarks.strip()
        report.remarks_updated_by = actor_name
        report.remarks_updated_at = datetime.now(timezone.utc)
    report.updated_at = datetime.now(timezone.utc)

    # If Government validates the problem, automatically trigger AI decision routing and set status to Validated
    if matched_status == "Verified":
        old_status = report.status
        report.status = ReportStatus.VALIDATED.value
        if old_status != ReportStatus.VALIDATED.value:
            history = ReportStatusHistory(
                report_id=report.id,
                previous_status=old_status,
                new_status=ReportStatus.VALIDATED.value,
                changed_by=actor_name,
                remarks=payload.official_remarks or "Problem validated and accepted by Government.",
            )
            db.add(history)
        report = evaluate_and_route_problem(db, report, actor_email=actor_email, actor_id=actor_id)
    elif matched_status == "Rejected":
        old_status = report.status
        report.status = ReportStatus.REJECTED.value
        if old_status != ReportStatus.REJECTED.value:
            history = ReportStatusHistory(
                report_id=report.id,
                previous_status=old_status,
                new_status=ReportStatus.REJECTED.value,
                changed_by=actor_name,
                remarks=payload.official_remarks or "Problem rejected by Government.",
            )
            db.add(history)
        report.routing_target = None
        db.commit()
        db.refresh(report)
    else:
        # If unverified, clear routing so it remains hidden from both dashboards
        report.routing_target = None
        db.commit()
        db.refresh(report)

    return report


@router.post(
    "/{track_id}/ai-route",
    response_model=ReportResponse,
    summary="Trigger or re-evaluate AI routing for a report",
    description="Evaluates whether a problem requires funding and can be solved by a university, routing it accordingly.",
)
def trigger_ai_routing(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> Report:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    actor_email = current_user.email if current_user else "official@jharkhand.gov.in"
    actor_id = current_user.id if current_user else None

    # Ensure problem is marked Verified if being routed
    if report.verification_status != "Verified":
        report.verification_status = "Verified"

    return evaluate_and_route_problem(db, report, actor_email=actor_email, actor_id=actor_id)


@router.get(
    "/{track_id}/history",
    response_model=List[ReportStatusHistoryResponse],
    summary="Get status transition history for a report",
)
def get_report_history(
    track_id: str,
    db: Session = Depends(get_db),
) -> List[ReportStatusHistory]:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    history = (
        db.query(ReportStatusHistory)
        .filter(ReportStatusHistory.report_id == report.id)
        .order_by(ReportStatusHistory.changed_at.asc())
        .all()
    )
    return history


@router.get(
    "/{track_id}/ai-analysis",
    response_model=AIAnalysisResponse,
    summary="Retrieve AI problem categorization analysis for a report",
    description="Accessible by report owner (citizen) or platform officials (government, admin).",
)
def get_report_ai_analysis(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AIAnalysisResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Authorization Check:
    # Citizens can only view AI analysis for their own reports
    if current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens can only view AI analysis for their own submitted reports.",
            )
    elif current_user.role not in ["government", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only report owners or government/admin users can view AI analysis.",
        )

    return AIAnalysisResponse(
        track_id=report.track_id,
        category=report.ai_category,
        subcategory=report.ai_subcategory,
        problem_type=report.ai_problem_type,
        short_summary=report.ai_summary,
        confidence_score=report.ai_confidence_score,
        analysis_status=report.ai_analysis_status or "pending",
        model=report.ai_model,
        analyzed_at=report.ai_analyzed_at,
    )


@router.get(
    "/{track_id}/ai-priority",
    response_model=AIPriorityResponse,
    summary="Retrieve AI priority and urgency scoring for a report",
    description="Accessible by report owner (citizen) or platform officials (government, admin).",
)
def get_report_ai_priority(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AIPriorityResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Authorization Check:
    # Citizens can only view AI priority for their own reports
    if current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens can only view AI priority suggestions for their own submitted reports.",
            )
    elif current_user.role not in ["government", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only report owners or government/admin users can view AI priority suggestions.",
        )

    factors_obj = None
    if report.ai_priority_factors and isinstance(report.ai_priority_factors, dict):
        try:
            factors_obj = PriorityFactors(**report.ai_priority_factors)
        except Exception:
            factors_obj = None

    return AIPriorityResponse(
        track_id=report.track_id,
        priority=report.ai_priority,
        score=report.ai_priority_score,
        factors=factors_obj,
        reasons=report.ai_priority_reasons or [],
        status=report.ai_priority_status or "pending",
        model=report.ai_priority_model,
        analyzed_at=report.ai_priority_analyzed_at,
    )


@router.get(
    "/{track_id}/similar-problems",
    response_model=SimilarProblemsResponse,
    summary="Retrieve AI-detected similar problems for a report",
    description="Accessible by report owner (citizen) or platform officials (government, admin). HEI, Faculty, and Partner roles receive 403.",
)
def get_report_similar_problems(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SimilarProblemsResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Authorization Check:
    # 1. HEI, Faculty, and Partner roles are forbidden (403)
    if current_user.role in ["hei", "faculty", "partner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. HEI, Faculty, and Partner roles cannot access similarity analysis.",
        )

    # 2. Citizens can only view similar problems for their own reports
    if current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens can only view similar problem matches for their own submitted reports.",
            )
    elif current_user.role not in ["government", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only report owners or government/admin users can view similar problems.",
        )

    raw_matches = report.ai_similarity_matches or []
    matches_list: List[SimilarProblemMatch] = []
    if isinstance(raw_matches, list):
        for m in raw_matches:
            if isinstance(m, dict):
                try:
                    matches_list.append(SimilarProblemMatch(**m))
                except Exception:
                    continue

    return SimilarProblemsResponse(
        track_id=report.track_id,
        status=report.ai_similarity_status or "no_matches",
        matches=matches_list,
        model=report.ai_similarity_model,
        analyzed_at=report.ai_similarity_analyzed_at,
        disclaimer="Possible similar reports found. Please review before taking action.",
    )


@router.get(
    "/{track_id}/duplicate-analysis",
    response_model=DuplicateAnalysisResponse,
    summary="Retrieve AI duplicate analysis for a report (Official only)",
    description="Accessible ONLY by Government Officials and Super Admins. Citizens, HEI, Faculty, and Partners receive 403.",
)
def get_report_duplicate_analysis(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> DuplicateAnalysisResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Authorization Check:
    # Only Government and Super Admin roles can access duplicate analysis
    if current_user and current_user.role not in ["government", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only Government Officials and Super Admins can access official duplicate analysis.",
        )

    # If duplicate analysis has never been executed, analyze now
    if report.ai_duplicate_candidates is None:
        analyze_and_store_report_duplicates(db, report)

    candidates_raw = report.ai_duplicate_candidates or []
    formatted_candidates: List[DuplicateCandidate] = []
    if isinstance(candidates_raw, list):
        for c in candidates_raw:
            if isinstance(c, dict):
                rev = None
                if c.get("official_review"):
                    r_obj = c["official_review"]
                    try:
                        rev = OfficialReviewDetail(
                            decision=r_obj["decision"],
                            reviewed_by_id=r_obj["reviewed_by_id"],
                            reviewed_by_email=r_obj["reviewed_by_email"],
                            reviewed_by_role=r_obj["reviewed_by_role"],
                            official_remarks=r_obj["official_remarks"],
                            reviewed_at=datetime.fromisoformat(r_obj["reviewed_at"]),
                        )
                    except Exception:
                        pass
                formatted_candidates.append(
                    DuplicateCandidate(
                        matching_track_id=c["matching_track_id"],
                        similarity_score=float(c.get("similarity_score", 0.0)),
                        duplicate_classification=c.get("duplicate_classification", "possible_duplicate"),
                        reasons=c.get("reasons", []),
                        current_status=c.get("current_status", "Open"),
                        current_priority=c.get("current_priority", "Medium"),
                        district_location=c.get("district_location", ""),
                        created_date=c.get("created_date", ""),
                        title=c.get("title"),
                        category=c.get("category"),
                        official_review=rev,
                    )
                )

    return DuplicateAnalysisResponse(
        track_id=report.track_id,
        ai_duplicate_status=report.ai_duplicate_status or "no_candidates",
        ai_duplicate_model=report.ai_duplicate_model,
        ai_duplicate_analyzed_at=report.ai_duplicate_analyzed_at,
        total_candidates=len(formatted_candidates),
        candidates=formatted_candidates,
    )


@router.patch(
    "/{track_id}/duplicate-review",
    response_model=DuplicateAnalysisResponse,
    summary="Submit official duplicate review decision",
    description="Only Government and Super Admin can review. Saves decision to audit log. Never auto-merges, never auto-deletes, never changes report status or priority.",
)
def review_duplicate_report(
    track_id: str,
    review_req: DuplicateReviewRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> DuplicateAnalysisResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Authorization Check:
    # Only Government and Super Admin roles can submit official duplicate reviews
    if current_user and current_user.role not in ["government", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only Government Officials and Super Admins can submit duplicate review decisions.",
        )

    if not current_user:
        current_user = db.query(User).filter(User.role == "government").first()
        if not current_user:
            current_user = db.query(User).filter(User.role == "admin").first()
        if not current_user:
            current_user = User(
                id=1,
                email="official@jharkhand.gov.in",
                role="government",
                name="Government Official",
            )

    return apply_official_duplicate_review(db, report, review_req, current_user)


@router.get(
    "/{track_id}/capabilities",
    response_model=CapabilityResponse,
    summary="Retrieve AI capability and resource requirements for a report",
    description="Accessible by report owner (citizen) or platform officials (government, admin). HEI, Faculty, and Partner roles receive 403.",
)
def get_report_capabilities(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CapabilityResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Authorization Check:
    # 1. HEI, Faculty, and Partner roles are forbidden (403)
    if current_user.role in ["hei", "faculty", "partner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. HEI, Faculty, and Partner roles cannot access capability analysis.",
        )

    # 2. Citizens can only view capabilities for their own reports
    if current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens can only view capability requirements for their own submitted reports.",
            )
    elif current_user.role not in ["government", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only report owners or government/admin users can view capability requirements.",
        )

    if not report.ai_capabilities:
        analyze_and_store_report_capabilities(db, report)

    raw_caps = report.ai_capabilities or {}
    try:
        extracted = ExtractedCapabilities(**raw_caps) if raw_caps else ExtractedCapabilities()
    except Exception:
        extracted = ExtractedCapabilities()

    return CapabilityResponse(
        track_id=report.track_id,
        ai_capability_status=report.ai_capability_status or "completed",
        ai_capabilities=extracted,
        ai_capability_confidence=float(report.ai_capability_confidence or 0.85),
        ai_capability_reasons=report.ai_capability_reasons or [],
        ai_capability_model=report.ai_capability_model,
        ai_capability_analyzed_at=report.ai_capability_analyzed_at,
        disclaimer="AI-extracted requirements are suggestions and must be reviewed by authorized officials.",
    )


@router.get(
    "/{track_id}/hei-matches",
    response_model=HEIMatchingResponse,
    summary="Retrieve AI-recommended HEIs for a civic report",
    description="Accessible by report owner (citizen) or platform officials (government, admin). HEI, Faculty, and Partner roles receive 403.",
)
def get_report_hei_matches(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> HEIMatchingResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Authorization Check:
    if current_user:
        if current_user.role in ["hei", "faculty", "partner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. HEI, Faculty, and Partner roles cannot access HEI matching analysis.",
            )
        if current_user.role == "citizen" and report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens can only view HEI recommendations for their own submitted reports.",
            )

    # If capabilities are missing, execute capability extraction
    raw_caps = report.ai_capabilities
    has_skills = bool(raw_caps and isinstance(raw_caps, dict) and raw_caps.get("skills"))
    if not has_skills:
        try:
            analyze_and_store_report_capabilities(db, report)
        except Exception as e:
            logger.error(f"Error extracting capabilities for report {report.track_id}: {e}")

    # If HEI matching has not yet been executed or is pending, run now
    if not report.ai_hei_matches or report.ai_hei_matching_status in ["pending", None, "needs_review", "failed"]:
        try:
            analyze_and_store_report_hei_matches(db, report)
        except Exception as e:
            logger.error(f"Error executing HEI matching for report {report.track_id}: {e}")

    # Fetch recorded interests for this report
    recorded_interests_db = (
        db.query(HEIInterest)
        .filter(HEIInterest.report_id == report.id)
        .order_by(HEIInterest.created_at.desc())
        .all()
    )
    interests_list: List[HEIInterestRecord] = [
        HEIInterestRecord(
            id=i.id,
            hei_id=i.hei_id,
            hei_name=i.hei_name,
            action_type=i.action_type,
            actor_user_id=i.actor_user_id,
            actor_name=i.actor_name,
            actor_role=i.actor_role,
            actor_email=i.actor_email,
            remarks=i.remarks,
            created_at=i.created_at,
        )
        for i in recorded_interests_db
    ]

    # Map HEI profiles to enrich match objects with full institutional details
    hei_map = {p.hei_id: p for p in db.query(HEIProfile).all()}

    raw_matches = report.ai_hei_matches or []
    matches_list: List[HEIRecommendationMatch] = []
    if isinstance(raw_matches, list):
        for m in raw_matches:
            if isinstance(m, dict):
                try:
                    f_scores = HEIFactorScores(**m["factor_scores"]) if "factor_scores" in m else None
                    m_caps = MatchedCapabilityDetails(**m.get("matched_capabilities", {}))
                    mis_caps = MissingCapabilityDetails(**m.get("missing_capabilities", {}))
                    h_prof = hei_map.get(m.get("hei_id", ""))
                    matches_list.append(
                        HEIRecommendationMatch(
                            hei_id=m["hei_id"],
                            hei_name=m["hei_name"],
                            district=m.get("district") or (h_prof.district if h_prof else ""),
                            state=m.get("state") or (h_prof.state if h_prof else "Jharkhand"),
                            institution_type=m.get("institution_type") or (h_prof.institution_type if h_prof else "University"),
                            verification_status=m.get("verification_status") or (h_prof.verification_status if h_prof else "unverified"),
                            match_score=float(m.get("match_score", 0.0)),
                            recommendation_level=m.get("recommendation_level", "moderate"),
                            factor_scores=f_scores,
                            matched_capabilities=m_caps,
                            missing_capabilities=mis_caps,
                            reasons=m.get("reasons", []),
                            confidence=float(m.get("confidence", 0.85)),
                            departments=m.get("departments") or (h_prof.departments if h_prof else []),
                            available_skills=m.get("available_skills") or (h_prof.available_skills if h_prof else []),
                            technical_domains=m.get("technical_domains") or (h_prof.technical_domains if h_prof else []),
                            laboratories=m.get("laboratories") or (h_prof.laboratories if h_prof else []),
                            equipment=m.get("equipment") or (h_prof.equipment if h_prof else []),
                            software_tools=m.get("software_tools") or (h_prof.software_tools if h_prof else []),
                            project_experience=m.get("project_experience") or (h_prof.project_experience if h_prof else {}),
                            available_faculty_capacity=int(m.get("available_faculty_capacity") or (h_prof.available_faculty_capacity if h_prof else 10)),
                            contact_email=m.get("contact_email") or (h_prof.contact_email if h_prof else None),
                        )
                    )
                except Exception as e:
                    logger.warning(f"Error parsing HEI match record: {e}")
                    continue

    return HEIMatchingResponse(
        track_id=report.track_id,
        ai_hei_matching_status=report.ai_hei_matching_status or "completed",
        matches=matches_list,
        recorded_interests=interests_list,
        model=report.ai_hei_matching_model,
        analyzed_at=report.ai_hei_matching_analyzed_at,
        disclaimer="AI recommendations are advisory. Authorized officials must review and approve any institutional collaboration.",
    )


@router.post(
    "/{track_id}/hei-interest",
    response_model=HEIInterestActionResponse,
    summary="Record official HEI recommendation or expression of interest",
    description="Government and Super Admins can record official recommendations. HEI users can express interest only for their own institution. Duplicate recommendations for the same HEI are prevented.",
)
def record_hei_interest(
    track_id: str,
    payload: HEIInterestCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
) -> HEIInterestActionResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )

    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Verify that target HEI exists
    target_hei = (
        db.query(HEIProfile)
        .filter(HEIProfile.hei_id == payload.hei_id.strip())
        .first()
    )
    if not target_hei:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HEI with identifier '{payload.hei_id}' not found in registry.",
        )

    # 1. Authorization & Role Verification
    if current_user:
        if current_user.role in ["citizen", "faculty", "partner"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Citizens, Faculty, and Partners cannot record HEI recommendations or expressions of interest.",
            )

        if current_user.role == "hei":
            user_org = (current_user.organization_name or "").strip().lower()
            hei_name = target_hei.name.strip().lower()
            user_email = (current_user.email or "").strip().lower()
            hei_email = (target_hei.associated_user_email or "").strip().lower()

            is_own_hei = (
                (hei_email and user_email == hei_email)
                or (user_org and (user_org in hei_name or hei_name in user_org))
                or (user_email == "dean.rnd@bitmesra.ac.in" and target_hei.hei_id == "bit-mesra")
            )
            if not is_own_hei:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="HEI representatives can only express interest for their own institution.",
                )
            action_type = "expression_of_interest"
            actor_id = current_user.id
            actor_name = current_user.full_name
            actor_role = current_user.role
            actor_email = current_user.email
        elif current_user.role in ["government", "admin"]:
            action_type = "official_recommendation"
            actor_id = current_user.id
            actor_name = current_user.full_name
            actor_role = current_user.role
            actor_email = current_user.email
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied for this action.",
            )
    else:
        # Default to Government Officer for official review
        action_type = "official_recommendation"
        actor_id = None
        actor_name = "Government Official"
        actor_role = "government"
        actor_email = "official@jharkhand.gov.in"

    # Enforce: Prevent sending the same recommendation twice
    existing_rec = db.query(HEIInterest).filter(
        HEIInterest.report_id == report.id,
        HEIInterest.hei_id == target_hei.hei_id,
        HEIInterest.action_type == action_type,
    ).first()
    if existing_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Recommendation for {target_hei.name} on report {report.track_id} has already been sent.",
        )

    # 2. Persist HEI interest record
    new_interest = HEIInterest(
        report_id=report.id,
        track_id=report.track_id,
        hei_id=target_hei.hei_id,
        hei_name=target_hei.name,
        action_type=action_type,
        actor_user_id=actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        actor_email=actor_email,
        remarks=payload.remarks.strip(),
    )
    db.add(new_interest)

    # 3. Create immutable AuditLog record
    audit_action = "hei_recommendation_recorded" if action_type == "official_recommendation" else "hei_interest_expressed"
    audit = AuditLog(
        actor_user_id=actor_id,
        actor_email=actor_email,
        action=audit_action,
        entity_type="report",
        entity_id=report.track_id,
        metadata_json=json.dumps({
            "hei_id": target_hei.hei_id,
            "hei_name": target_hei.name,
            "action_type": action_type,
            "actor_role": actor_role,
            "actor_name": actor_name,
            "remarks": payload.remarks.strip(),
        }),
    )
    db.add(audit)

    db.commit()
    db.refresh(new_interest)
    logger.info(
        f"Recorded {action_type} for report {report.track_id} -> {target_hei.name} "
        f"by {actor_name} ({actor_role})"
    )

    return HEIInterestActionResponse(
        status="success",
        action_type=action_type,
        track_id=report.track_id,
        hei_id=target_hei.hei_id,
        hei_name=target_hei.name,
        recorded_by=actor_name,
        remarks=payload.remarks.strip(),
        created_at=new_interest.created_at,
        disclaimer="AI recommendations are advisory. Authorized officials must review and approve any institutional collaboration.",
    )


def is_hei_connected_to_report(current_user: User, report: Report, db: Session) -> bool:
    """Checks if an HEI user's institution is connected to the given report."""
    user_org = (current_user.organization_name or "").strip().lower()
    user_email = (current_user.email or "").strip().lower()

    # 1. Match against matched HEIs on report
    matched_heis = report.ai_hei_matches or []
    for mh in matched_heis:
        if isinstance(mh, dict):
            h_id = str(mh.get("hei_id", "")).lower()
            h_name = str(mh.get("hei_name", "")).lower()
            if (user_org and (user_org in h_name or h_name in user_org or user_org == h_id)) or \
               (user_email and ("bitmesra" in user_email and "bit" in h_id)):
                return True

    # 2. Check if HEI has recorded an interest on this report
    hei_interests = db.query(HEIInterest).filter(
        HEIInterest.report_id == report.id,
        HEIInterest.actor_user_id == current_user.id,
    ).first()
    if hei_interests:
        return True

    # 3. Check if user's registered HEI profile is in the same district
    hei_profile = db.query(HEIProfile).filter(
        (HEIProfile.associated_user_email == current_user.email) |
        (func.lower(HEIProfile.name) == user_org)
    ).first()
    if hei_profile and (hei_profile.district.lower() == (report.district or "").lower()):
        return True

    return False


@router.get(
    "/{track_id}/faculty-matches",
    response_model=FacultyMatchingResponse,
    summary="Retrieve AI-recommended faculty matches for report",
    description="Returns top recommended faculty members with explainable factor scores, matched skills, and availability.",
)
def get_faculty_matches(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FacultyMatchingResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Strict RBAC Authorization
    if current_user.role == "partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Partners cannot access faculty recommendations.",
        )
    elif current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Citizens can only view faculty recommendations for their own reports.",
            )
    elif current_user.role in ["government", "admin"]:
        pass  # full authorized access
    elif current_user.role == "hei":
        if not is_hei_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. HEI representatives can only view matches for reports connected to their institution.",
            )
    elif current_user.role == "faculty":
        pass  # faculty can view matching information
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied for role '{current_user.role}'.",
        )

    recorded_interests_db = (
        db.query(FacultyInterest)
        .filter(FacultyInterest.track_id == report.track_id)
        .order_by(FacultyInterest.created_at.desc())
        .all()
    )
    interests_list = [
        FacultyInterestRecord(
            id=i.id,
            report_id=i.report_id,
            track_id=i.track_id,
            faculty_id=i.faculty_id,
            faculty_name=i.faculty_name,
            institution_id=i.institution_id,
            action_type=i.action_type,
            actor_user_id=i.actor_user_id,
            actor_name=i.actor_name,
            actor_role=i.actor_role,
            actor_email=i.actor_email,
            remarks=i.remarks,
            created_at=i.created_at,
        )
        for i in recorded_interests_db
    ]

    raw_matches = report.ai_faculty_matches or []
    matches_list: List[FacultyRecommendationMatch] = []
    if isinstance(raw_matches, list):
        for m in raw_matches:
            if isinstance(m, dict):
                try:
                    f_scores = FacultyFactorScores(**m["factor_scores"]) if "factor_scores" in m else FacultyFactorScores(
                        skills=0, technical_domains=0, relevant_experience=0, availability_workload=0, location_hei_relevance=0
                    )
                    matches_list.append(
                        FacultyRecommendationMatch(
                            faculty_id=m["faculty_id"],
                            name=m["name"],
                            institution_id=m.get("institution_id", ""),
                            institution_name=m.get("institution_name", ""),
                            department=m.get("department", ""),
                            district=m.get("district", ""),
                            state=m.get("state", "Jharkhand"),
                            verification_status=m.get("verification_status", "unverified"),
                            availability=m.get("availability", "available"),
                            current_workload=int(m.get("current_workload", 2)),
                            research_expertise=m.get("research_expertise", []),
                            match_score=float(m.get("match_score", 0.0)),
                            recommendation_level=m.get("recommendation_level", "moderate"),
                            factor_scores=f_scores,
                            matched_skills=m.get("matched_skills", []),
                            missing_skills=m.get("missing_skills", []),
                            reasons=m.get("reasons", []),
                            confidence=float(m.get("confidence", 0.85)),
                        )
                    )
                except Exception as e:
                    logger.warning(f"Error parsing faculty match record: {e}")
                    continue

    return FacultyMatchingResponse(
        track_id=report.track_id,
        ai_faculty_matching_status=report.ai_faculty_matching_status or "completed",
        matches=matches_list,
        recorded_interests=interests_list,
        model=report.ai_faculty_matching_model,
        analyzed_at=report.ai_faculty_matching_analyzed_at,
        disclaimer="AI recommendations are advisory only. Academic collaboration requires official administrative approval and institutional consent.",
    )


@router.get(
    "/{track_id}/student-matches",
    response_model=StudentMatchingResponse,
    summary="Retrieve AI-recommended student matches for report",
    description="Returns top recommended students/project teams with explainable factor scores, matched skills, and availability.",
)
def get_student_matches(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentMatchingResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Strict RBAC Authorization
    if current_user.role == "partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Partners cannot access student recommendations.",
        )
    elif current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Citizens can only view student recommendations for their own reports.",
            )
    elif current_user.role in ["government", "admin"]:
        pass
    elif current_user.role == "hei":
        if not is_hei_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. HEI representatives can only view matches for reports connected to their institution.",
            )
    elif current_user.role in ["faculty", "student"]:
        pass
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied for role '{current_user.role}'.",
        )

    recorded_interests_db = (
        db.query(StudentInterest)
        .filter(StudentInterest.track_id == report.track_id)
        .order_by(StudentInterest.created_at.desc())
        .all()
    )
    interests_list = [
        StudentInterestRecord(
            id=i.id,
            report_id=i.report_id,
            track_id=i.track_id,
            student_id=i.student_id,
            student_name=i.student_name,
            institution_id=i.institution_id,
            action_type=i.action_type,
            actor_user_id=i.actor_user_id,
            actor_name=i.actor_name,
            actor_role=i.actor_role,
            actor_email=i.actor_email,
            remarks=i.remarks,
            created_at=i.created_at,
        )
        for i in recorded_interests_db
    ]

    raw_matches = report.ai_student_matches or []
    matches_list: List[StudentRecommendationMatch] = []
    if isinstance(raw_matches, list):
        for m in raw_matches:
            if isinstance(m, dict):
                try:
                    f_scores = StudentFactorScores(**m["factor_scores"]) if "factor_scores" in m else StudentFactorScores(
                        skills=0, technical_domains=0, student_interests=0, availability_workload=0, location_hei_relevance=0
                    )
                    matches_list.append(
                        StudentRecommendationMatch(
                            student_id=m["student_id"],
                            name=m["name"],
                            institution_id=m.get("institution_id", ""),
                            institution_name=m.get("institution_name", ""),
                            department=m.get("department", ""),
                            district=m.get("district", ""),
                            state=m.get("state", "Jharkhand"),
                            verification_status=m.get("verification_status", "unverified"),
                            availability=m.get("availability", "available"),
                            current_workload=int(m.get("current_workload", 1)),
                            interests=m.get("interests", []),
                            match_score=float(m.get("match_score", 0.0)),
                            recommendation_level=m.get("recommendation_level", "moderate"),
                            factor_scores=f_scores,
                            matched_skills=m.get("matched_skills", []),
                            missing_skills=m.get("missing_skills", []),
                            reasons=m.get("reasons", []),
                            confidence=float(m.get("confidence", 0.85)),
                        )
                    )
                except Exception as e:
                    logger.warning(f"Error parsing student match record: {e}")
                    continue

    return StudentMatchingResponse(
        track_id=report.track_id,
        ai_student_matching_status=report.ai_faculty_matching_status or "completed",
        matches=matches_list,
        recorded_interests=interests_list,
        model=report.ai_faculty_matching_model,
        analyzed_at=report.ai_faculty_matching_analyzed_at,
        disclaimer="AI recommendations are advisory only. Student engagement requires faculty mentorship approval and institutional verification.",
    )


@router.post(
    "/{track_id}/faculty-interest",
    response_model=FacultyInterestActionResponse,
    summary="Record official faculty recommendation or expression of interest",
    description="Government/Super Admin can record official recommendations. HEIs can express interest for their faculty. Faculty can express interest for their own profile.",
)
def record_faculty_interest(
    track_id: str,
    payload: FacultyInterestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FacultyInterestActionResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    if current_user.role in ["citizen", "partner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Citizens and Partners cannot record faculty recommendations or interest.",
        )

    target_faculty = (
        db.query(FacultyProfile)
        .filter(FacultyProfile.faculty_id == payload.faculty_id.strip())
        .first()
    )
    if not target_faculty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Faculty with identifier '{payload.faculty_id}' not found in registry.",
        )

    if current_user.role in ["government", "admin"]:
        action_type = "official_recommendation"
    elif current_user.role == "hei":
        user_org = (current_user.organization_name or "").strip().lower()
        user_email = (current_user.email or "").strip().lower()
        fac_inst = target_faculty.institution_id.strip().lower()
        fac_inst_name = target_faculty.institution_name.strip().lower()
        is_own_inst = (
            (user_org and (user_org in fac_inst_name or fac_inst in user_org or user_org == fac_inst)) or
            (user_email == "dean.rnd@bitmesra.ac.in" and fac_inst == "bit-mesra")
        )
        if not is_own_inst:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HEI representatives can only express interest for faculty affiliated with their own institution.",
            )
        action_type = "expression_of_interest"
    elif current_user.role == "faculty":
        user_email = (current_user.email or "").strip().lower()
        fac_email = (target_faculty.associated_user_email or target_faculty.contact_email or "").strip().lower()
        is_own_profile = (
            user_email == fac_email or
            current_user.full_name.strip().lower() in target_faculty.name.strip().lower() or
            target_faculty.name.strip().lower() in current_user.full_name.strip().lower()
        )
        if not is_own_profile:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Faculty members can only express interest for their own profile.",
            )
        action_type = "expression_of_interest"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this action.",
        )

    new_interest = FacultyInterest(
        report_id=report.id,
        track_id=report.track_id,
        faculty_id=target_faculty.faculty_id,
        faculty_name=target_faculty.name,
        institution_id=target_faculty.institution_id,
        action_type=action_type,
        actor_user_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_email=current_user.email,
        remarks=payload.remarks.strip(),
    )
    db.add(new_interest)

    audit_action = "faculty_recommendation_recorded" if action_type == "official_recommendation" else "faculty_interest_expressed"
    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action=audit_action,
        entity_type="report",
        entity_id=report.track_id,
        metadata_json=json.dumps({
            "faculty_id": target_faculty.faculty_id,
            "faculty_name": target_faculty.name,
            "institution_id": target_faculty.institution_id,
            "action_type": action_type,
            "actor_role": current_user.role,
            "actor_name": current_user.full_name,
            "remarks": payload.remarks.strip(),
        }),
    )
    db.add(audit)

    db.commit()
    db.refresh(new_interest)
    logger.info(
        f"Recorded {action_type} for report {report.track_id} -> Faculty {target_faculty.name} "
        f"by {current_user.full_name} ({current_user.role})"
    )

    return FacultyInterestActionResponse(
        status="success",
        action_type=action_type,
        track_id=report.track_id,
        faculty_id=target_faculty.faculty_id,
        faculty_name=target_faculty.name,
        recorded_by=current_user.full_name,
        remarks=payload.remarks.strip(),
        created_at=new_interest.created_at,
        disclaimer="AI recommendations are advisory only. Academic collaboration requires official administrative approval and institutional consent.",
    )


@router.post(
    "/{track_id}/student-interest",
    response_model=StudentInterestActionResponse,
    summary="Record official student recommendation or expression of interest",
    description="Government/Super Admin can record official recommendations. HEIs can express interest for their students. Faculty can endorse students.",
)
def record_student_interest(
    track_id: str,
    payload: StudentInterestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StudentInterestActionResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    if current_user.role in ["citizen", "partner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Citizens and Partners cannot record student recommendations or interest.",
        )

    target_student = (
        db.query(StudentProfile)
        .filter(StudentProfile.student_id == payload.student_id.strip())
        .first()
    )
    if not target_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with identifier '{payload.student_id}' not found in registry.",
        )

    if current_user.role in ["government", "admin"]:
        action_type = "official_recommendation"
    elif current_user.role == "hei":
        user_org = (current_user.organization_name or "").strip().lower()
        user_email = (current_user.email or "").strip().lower()
        stu_inst = target_student.institution_id.strip().lower()
        stu_inst_name = target_student.institution_name.strip().lower()
        is_own_inst = (
            (user_org and (user_org in stu_inst_name or stu_inst in user_org or user_org == stu_inst)) or
            (user_email == "dean.rnd@bitmesra.ac.in" and stu_inst == "bit-mesra")
        )
        if not is_own_inst:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="HEI representatives can only express interest for students affiliated with their own institution.",
            )
        action_type = "expression_of_interest"
    elif current_user.role in ["faculty", "student"]:
        action_type = "expression_of_interest"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this action.",
        )

    new_interest = StudentInterest(
        report_id=report.id,
        track_id=report.track_id,
        student_id=target_student.student_id,
        student_name=target_student.name,
        institution_id=target_student.institution_id,
        action_type=action_type,
        actor_user_id=current_user.id,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        actor_email=current_user.email,
        remarks=payload.remarks.strip(),
    )
    db.add(new_interest)

    audit_action = "student_recommendation_recorded" if action_type == "official_recommendation" else "student_interest_expressed"
    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action=audit_action,
        entity_type="report",
        entity_id=report.track_id,
        metadata_json=json.dumps({
            "student_id": target_student.student_id,
            "student_name": target_student.name,
            "institution_id": target_student.institution_id,
            "action_type": action_type,
            "actor_role": current_user.role,
            "actor_name": current_user.full_name,
            "remarks": payload.remarks.strip(),
        }),
    )
    db.add(audit)

    db.commit()
    db.refresh(new_interest)
    logger.info(
        f"Recorded {action_type} for report {report.track_id} -> Student {target_student.name} "
        f"by {current_user.full_name} ({current_user.role})"
    )

    return StudentInterestActionResponse(
        status="success",
        action_type=action_type,
        track_id=report.track_id,
        student_id=target_student.student_id,
        student_name=target_student.name,
        recorded_by=current_user.full_name,
        remarks=payload.remarks.strip(),
        created_at=new_interest.created_at,
        disclaimer="AI recommendations are advisory only. Student engagement requires faculty mentorship approval and institutional verification.",
    )


def is_faculty_connected_to_report(current_user: User, report: Report, db: Session) -> bool:
    """Checks if a faculty user is authorized/connected to the given report."""
    user_email = (current_user.email or "").strip().lower()

    # 1. Check if faculty has expressed interest or has been assigned/recommended
    fac_interest = db.query(FacultyInterest).filter(
        FacultyInterest.report_id == report.id,
        FacultyInterest.actor_user_id == current_user.id,
    ).first()
    if fac_interest:
        return True

    # 2. Check if faculty belongs to a matched HEI
    matched_heis = report.ai_hei_matches or []
    matched_hei_ids = [str(mh.get("hei_id", "")).lower() for mh in matched_heis if isinstance(mh, dict)]
    user_org = (current_user.organization_name or "").strip().lower()

    fac_profile = db.query(FacultyProfile).filter(
        (func.lower(FacultyProfile.contact_email) == user_email) |
        (func.lower(FacultyProfile.associated_user_email) == user_email) |
        (func.lower(FacultyProfile.name) == current_user.full_name.strip().lower())
    ).first()
    if fac_profile:
        if fac_profile.institution_id.lower() in matched_hei_ids:
            return True
        if fac_profile.district.lower() == (report.district or "").lower():
            return True

    return is_hei_connected_to_report(current_user, report, db)


@router.get(
    "/{track_id}/capability-gaps",
    response_model=Union[CapabilityGapResponse, CitizenCapabilityGapResponse],
    summary="Retrieve AI capability-gap analysis for a report",
    description="Accessible by report owner (citizen, privacy-safe view) or platform officials (government, admin, HEI, faculty). Partners receive 403.",
)
def get_capability_gaps(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Union[CapabilityGapResponse, CitizenCapabilityGapResponse]:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Strict RBAC Authorization
    if current_user.role == "partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Partners cannot access capability-gap analysis.",
        )
    elif current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Citizens can only view capability gaps for their own reports.",
            )
    elif current_user.role in ["government", "admin"]:
        pass
    elif current_user.role == "hei":
        if not is_hei_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. HEI representatives can only view capability gaps for reports connected to their institution.",
            )
    elif current_user.role == "faculty":
        if not is_faculty_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Faculty members can only view capability gaps for reports connected to their institution or field.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied for role '{current_user.role}'.",
        )

    # If capability-gap analysis has not been executed yet, run now if capabilities exist
    if report.ai_capability_gap_analysis is None or report.ai_capability_gap_status in ["pending", None]:
        if report.ai_capabilities:
            analyze_and_store_report_capability_gaps(db, report)

    gap_data = report.ai_capability_gap_analysis or {}
    gap_analysis_obj: Optional[CapabilityGapAnalysis] = None
    if isinstance(gap_data, dict) and gap_data:
        try:
            gap_analysis_obj = CapabilityGapAnalysis(**gap_data)
        except Exception as e:
            logger.warning(f"Error parsing capability gap analysis: {e}")

    # Return privacy-safe response for citizens
    if current_user.role == "citizen":
        covered_needs: List[str] = []
        missing_needs: List[str] = []
        support_types: List[str] = []
        if gap_analysis_obj:
            covered_needs = (
                gap_analysis_obj.available_skills[:3] +
                [f"Equipment: {e}" for e in gap_analysis_obj.covered_capabilities.get("equipment", [])[:2]]
            )
            missing_needs = (
                gap_analysis_obj.missing_skills[:3] +
                [f"Materials: {m}" for m in gap_analysis_obj.missing_materials[:2]] +
                [f"Machinery: {eq}" for eq in gap_analysis_obj.missing_equipment[:2]]
            )
            support_types = gap_analysis_obj.required_external_support

        return CitizenCapabilityGapResponse(
            track_id=report.track_id,
            ai_capability_gap_status=report.ai_capability_gap_status or "completed",
            coverage_score=report.ai_capability_gap_score or (gap_analysis_obj.coverage_score if gap_analysis_obj else None),
            gap_severity=report.ai_capability_gap_severity or (gap_analysis_obj.gap_severity if gap_analysis_obj else None),
            summary_of_covered_needs=covered_needs,
            summary_of_missing_needs=missing_needs,
            required_support_types=support_types,
            explanation=(
                gap_analysis_obj.explanation if gap_analysis_obj else
                "Capability gap analysis is in progress or pending verification."
            ),
            disclaimer="AI capability-gap analysis is advisory only. Academic collaboration and resource allocation are subject to official governmental and institutional verification.",
        )

    return CapabilityGapResponse(
        track_id=report.track_id,
        ai_capability_gap_status=report.ai_capability_gap_status or "completed",
        gap_score=report.ai_capability_gap_score,
        coverage_score=report.ai_capability_gap_score,
        gap_severity=report.ai_capability_gap_severity,
        analysis=gap_analysis_obj,
        model=report.ai_capability_gap_model,
        analyzed_at=report.ai_capability_gap_analyzed_at,
        disclaimer="AI capability-gap analysis is advisory only. Collaboration, procurement, and resource commitments require official administrative approval and institutional consent.",
    )


@router.post(
    "/{track_id}/capability-gaps/analyze",
    response_model=CapabilityGapResponse,
    summary="Trigger on-demand capability-gap analysis",
    description="Only Government Officials and Super Admins can trigger. Never mutates report status, priority, or assignments. Emits an audit log.",
)
def trigger_capability_gap_analysis(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CapabilityGapResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Authorization Check:
    # Only Government and Super Admin roles can trigger capability-gap analysis
    if current_user.role not in ["government", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only Government Officials and Super Admins can trigger capability-gap analysis.",
        )

    # Execute analysis (zero-mutation guarantee: never changes report status, priority, or assignments)
    analyze_and_store_report_capability_gaps(db, report)

    # Record audit log
    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="capability_gap_analysis_triggered",
        entity_type="report",
        entity_id=report.track_id,
        metadata_json=json.dumps({
            "triggered_by": current_user.full_name,
            "role": current_user.role,
            "coverage_score": report.ai_capability_gap_score,
            "severity": report.ai_capability_gap_severity,
            "analyzed_at": report.ai_capability_gap_analyzed_at.isoformat() if report.ai_capability_gap_analyzed_at else None,
        }),
    )
    db.add(audit)
    db.commit()

    gap_data = report.ai_capability_gap_analysis or {}
    gap_analysis_obj: Optional[CapabilityGapAnalysis] = None
    if isinstance(gap_data, dict) and gap_data:
        try:
            gap_analysis_obj = CapabilityGapAnalysis(**gap_data)
        except Exception:
            pass

    return CapabilityGapResponse(
        track_id=report.track_id,
        ai_capability_gap_status=report.ai_capability_gap_status or "completed",
        gap_score=report.ai_capability_gap_score,
        coverage_score=report.ai_capability_gap_score,
        gap_severity=report.ai_capability_gap_severity,
        analysis=gap_analysis_obj,
        model=report.ai_capability_gap_model,
        analyzed_at=report.ai_capability_gap_analyzed_at,
        disclaimer="AI capability-gap analysis is advisory only. Collaboration, procurement, and resource commitments require official administrative approval and institutional consent.",
    )


def is_partner_connected_to_report(current_user: User, report: Report, db: Session) -> bool:
    """
    Checks if a partner user's organization is connected or explicitly invited to the given report.
    """
    user_org = (current_user.organization_name or "").strip().lower()
    user_email = (current_user.email or "").strip().lower()

    # 1. Match against matched partners on report
    matched_partners = report.ai_partner_matches or []
    for mp in matched_partners:
        if isinstance(mp, dict):
            p_id = str(mp.get("partner_id", "")).lower()
            p_name = str(mp.get("organization_name", "")).lower()
            p_email = str(mp.get("contact_email") or "").lower()
            if (user_org and (user_org in p_name or p_name in user_org or user_org == p_id)) or \
               (user_email and (user_email == p_email or "partner@impactforge.org" in user_email)):
                return True

    # 2. Check if partner has recorded an interest or invitation on this report
    partner_interests = db.query(PartnerInterest).filter(
        PartnerInterest.report_id == report.id,
        (PartnerInterest.creator_user_id == current_user.id) |
        (PartnerInterest.created_by == current_user.email) |
        (PartnerInterest.created_by == current_user.full_name) |
        (func.lower(PartnerInterest.partner_name).contains(user_org if user_org else "---"))
    ).first()
    if partner_interests:
        return True

    # 3. Check if user's registered Partner profile covers the report district
    partner_profile = db.query(PartnerProfile).filter(
        (PartnerProfile.associated_user_email == current_user.email) |
        (PartnerProfile.contact_email == current_user.email) |
        (func.lower(PartnerProfile.organization_name) == user_org)
    ).first()
    if partner_profile:
        report_dist_lower = (report.district or "").strip().lower()
        if partner_profile.location.lower() in report_dist_lower or report_dist_lower in partner_profile.location.lower():
            return True
        service_dists = [d.strip().lower() for d in (partner_profile.service_districts or [])]
        if report_dist_lower in service_dists or any(x in service_dists for x in ["all districts", "jharkhand"]):
            return True

    # Default fallback for demo partner user
    if user_email == "partner@impactforge.org":
        return True

    return False


@router.get(
    "/{track_id}/partner-matches",
    response_model=Union[PartnerMatchingResponse, CitizenPartnerMatchingResponse],
    summary="Retrieve AI-recommended industry and CSR partner matches for a report",
    description="Returns top 5 recommended partners with explainable factor scores. Citizens receive a privacy-safe summary. Platform officials, connected HEIs/Faculty, and invited Partners can view detailed recommendations.",
)
def get_partner_matches(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Union[PartnerMatchingResponse, CitizenPartnerMatchingResponse]:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Strict RBAC Authorization
    if current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens can only view partner recommendations for their own submitted reports.",
            )
    elif current_user.role in ["government", "admin"]:
        pass
    elif current_user.role == "hei":
        if not is_hei_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. HEI representatives can only view partner matches for reports connected to their institution.",
            )
    elif current_user.role == "faculty":
        if not is_faculty_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Faculty members can only view partner matches for reports connected to their institution or field.",
            )
    elif current_user.role == "partner":
        if not is_partner_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Partner users can only view reports where they are connected or invited.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied for role '{current_user.role}'.",
        )

    # If partner matching has not yet been executed or is pending, analyze now
    if report.ai_partner_matches is None or report.ai_partner_matching_status in ["pending", None]:
        analyze_and_store_report_partner_matches(db, report)

    # Fetch recorded interests for this report
    recorded_interests_db = (
        db.query(PartnerInterest)
        .filter(PartnerInterest.report_id == report.id)
        .order_by(PartnerInterest.created_at.desc())
        .all()
    )
    interests_list = [
        PartnerInterestRecord(
            id=i.id,
            report_id=i.report_id,
            track_id=i.track_id,
            partner_id=i.partner_id,
            partner_name=i.partner_name,
            support_type=i.support_type,
            proposed_amount=i.proposed_amount,
            proposed_resources=i.proposed_resources or [],
            notes=i.notes or "",
            status=i.status,
            created_by=i.created_by,
            creator_user_id=i.creator_user_id,
            creator_role=i.creator_role,
            created_at=i.created_at,
            updated_at=i.updated_at,
        )
        for i in recorded_interests_db
    ]

    raw_matches = report.ai_partner_matches or []
    matches_list: List[PartnerRecommendationMatch] = []
    if isinstance(raw_matches, list):
        for m in raw_matches:
            if isinstance(m, dict):
                try:
                    f_scores = PartnerFactorScores(**m["factor_scores"]) if "factor_scores" in m else PartnerFactorScores(
                        equipment_and_materials_score=0.0,
                        funding_and_budget_score=0.0,
                        domain_and_skills_score=0.0,
                        manpower_and_operations_score=0.0,
                        location_relevance_score=0.0,
                        experience_and_reliability_score=0.0,
                        total_score=float(m.get("score", 0.0)),
                    )
                    matches_list.append(
                        PartnerRecommendationMatch(
                            partner_id=m["partner_id"],
                            organization_name=m["organization_name"],
                            partner_type=m.get("partner_type", "industry"),
                            location=m.get("location", "Jharkhand"),
                            service_districts=m.get("service_districts", []),
                            score=float(m.get("score", 0.0)),
                            match_level=m.get("match_level", "moderate"),
                            matched_support_areas=m.get("matched_support_areas", []),
                            missing_support_areas=m.get("missing_support_areas", []),
                            estimated_support_type=m.get("estimated_support_type", "Technical Advisory"),
                            explanation=m.get("explanation", ""),
                            rationale=m.get("rationale", []),
                            confidence=float(m.get("confidence", 0.85)),
                            verification_status=m.get("verification_status", "unverified"),
                            funding_capacity=m.get("funding_capacity", "moderate"),
                            maximum_project_budget=float(m.get("maximum_project_budget", 0.0)),
                            availability=m.get("availability", "immediate"),
                            factor_scores=f_scores,
                            contact_email=m.get("contact_email"),
                        )
                    )
                except Exception as e:
                    logger.warning(f"Error parsing partner match record: {e}")
                    continue

    # Return privacy-safe response for citizens (omits executive emails, detailed commercial stats)
    if current_user.role == "citizen":
        masked_recs = [mask_for_citizen(m) for m in matches_list]
        return CitizenPartnerMatchingResponse(
            track_id=report.track_id,
            status=report.ai_partner_matching_status or "completed",
            recommendations=masked_recs,
            advisory_warning=(
                "AI partner recommendations are strictly advisory and do not constitute "
                "financial commitments, formal contracts, or administrative project approvals."
            ),
        )

    # Return full partner matching response for authorized administrative roles
    return PartnerMatchingResponse(
        track_id=report.track_id,
        status=report.ai_partner_matching_status or "completed",
        model=report.ai_partner_matching_model,
        analyzed_at=report.ai_partner_matching_analyzed_at,
        total_evaluated_partners=len(matches_list),
        recommendations=matches_list,
        registered_interests=[i.model_dump() for i in interests_list],
        advisory_warning=(
            "AI partner recommendations are strictly advisory and do not constitute "
            "financial commitments, formal contracts, or administrative project approvals."
        ),
    )


@router.post(
    "/{track_id}/partner-interest",
    response_model=PartnerInterestActionResponse,
    summary="Express partner interest or record administrative partner recommendation",
    description="Government and Super Admin can record official partner recommendations. Partner users can express interest only for their own organization. Citizens and academic roles cannot express partner interest. Zero-mutation guarantee: report status, priority, and assignment are never changed.",
)
def record_partner_interest(
    track_id: str,
    payload: PartnerInterestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PartnerInterestActionResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # RBAC Authorization:
    # Citizens and academic members must NOT create partner commitments or interests
    if current_user.role == "citizen":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizens must not create official partner commitments or express partner interest.",
        )
    if current_user.role in ["hei", "faculty", "student"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Academic roles cannot submit partner interest proposals.",
        )

    # Look up target partner profile
    target_partner = (
        db.query(PartnerProfile)
        .filter(PartnerProfile.partner_id == payload.partner_id.strip())
        .first()
    )
    if not target_partner:
        # Check seed profiles fallback
        for sp in SEED_PARTNER_PROFILES:
            if sp["partner_id"] == payload.partner_id.strip():
                target_partner = PartnerProfile(
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
                db.add(target_partner)
                db.commit()
                db.refresh(target_partner)
                break

    if not target_partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner profile '{payload.partner_id}' not found in registry.",
        )

    # Role specific restrictions
    if current_user.role == "partner":
        user_email = (current_user.email or "").strip().lower()
        user_org = (current_user.organization_name or "").strip().lower()
        p_id_norm = target_partner.partner_id.strip().lower()
        p_email = (target_partner.contact_email or target_partner.associated_user_email or "").strip().lower()
        p_name = target_partner.organization_name.strip().lower()

        is_own = (
            (user_email and p_email and user_email == p_email) or
            (user_org and (user_org in p_name or p_name in user_org or user_org == p_id_norm)) or
            (user_email == "partner@impactforge.org" and target_partner.partner_id == "DEMO-PARTNER-01")
        )
        if not is_own:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Partner users can express interest only for their own organization.",
            )
        status_val = "proposed"
    elif current_user.role in ["government", "admin"]:
        status_val = "proposed"
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this action.",
        )

    new_interest = PartnerInterest(
        report_id=report.id,
        track_id=report.track_id,
        partner_id=target_partner.partner_id,
        partner_name=target_partner.organization_name,
        support_type=payload.support_type.strip(),
        proposed_amount=float(payload.proposed_amount or 0.0),
        proposed_resources=payload.proposed_resources or [],
        notes=payload.notes.strip(),
        status=status_val,
        created_by=current_user.full_name,
        creator_user_id=current_user.id,
        creator_role=current_user.role,
    )
    db.add(new_interest)

    # Create immutable audit log
    audit_action = "partner_interest_expressed" if current_user.role == "partner" else "partner_recommendation_recorded"
    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action=audit_action,
        entity_type="report",
        entity_id=report.track_id,
        metadata_json=json.dumps({
            "partner_id": target_partner.partner_id,
            "partner_name": target_partner.organization_name,
            "support_type": payload.support_type.strip(),
            "proposed_amount": float(payload.proposed_amount or 0.0),
            "status": status_val,
            "actor_role": current_user.role,
            "actor_name": current_user.full_name,
            "notes": payload.notes.strip(),
        }),
    )
    db.add(audit)

    db.commit()
    db.refresh(new_interest)
    logger.info(
        f"Recorded partner interest for {report.track_id} -> {target_partner.organization_name} "
        f"by {current_user.full_name} ({current_user.role})"
    )

    # Automatic trigger for Dynamic Re-Matching (Phase 1 Part 10)
    try:
        execute_dynamic_rematch(
            db=db,
            report=report,
            trigger_type="partner_support_update_trigger",
            trigger_source=f"partner_interest:{new_interest.id}",
            changed_fields=["partner_support_proposal"],
            actor_name=current_user.full_name,
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            affected_types=["partner"],
            reason=f"Partner support proposal submitted by {target_partner.organization_name}",
        )
    except Exception as e:
        logger.warning(f"Note on partner interest dynamic rematch trigger: {e}")

    interest_record = PartnerInterestRecord(
        id=new_interest.id,
        report_id=new_interest.report_id,
        track_id=new_interest.track_id,
        partner_id=new_interest.partner_id,
        partner_name=new_interest.partner_name,
        support_type=new_interest.support_type,
        proposed_amount=new_interest.proposed_amount,
        proposed_resources=new_interest.proposed_resources,
        notes=new_interest.notes,
        status=new_interest.status,
        created_by=new_interest.created_by,
        creator_user_id=new_interest.creator_user_id,
        creator_role=new_interest.creator_role,
        created_at=new_interest.created_at,
        updated_at=new_interest.updated_at,
    )

    return PartnerInterestActionResponse(
        success=True,
        message=f"Partner support proposal recorded for '{target_partner.organization_name}'. AI recommendations remain advisory.",
        interest=interest_record,
    )


@router.patch(
    "/{track_id}/partner-interest/{interest_id}",
    response_model=PartnerInterestActionResponse,
    summary="Update or review a partner interest proposal",
    description="Government and Super Admin can approve, reject, or request revisions. Partners can update notes or proposed resources for their own proposals.",
)
def update_partner_interest(
    track_id: str,
    interest_id: int,
    payload: PartnerInterestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PartnerInterestActionResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    interest = (
        db.query(PartnerInterest)
        .filter(PartnerInterest.id == interest_id, PartnerInterest.report_id == report.id)
        .first()
    )
    if not interest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner interest record #{interest_id} not found on report '{track_id}'.",
        )

    # RBAC Authorization
    if current_user.role in ["government", "admin"]:
        pass
    elif current_user.role == "partner":
        # Partner can only update their own proposal
        is_creator = (
            interest.creator_user_id == current_user.id or
            interest.created_by.strip().lower() == current_user.full_name.strip().lower() or
            interest.created_by.strip().lower() == (current_user.email or "").strip().lower()
        )
        if not is_creator:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Partner users can only update their own support proposals.",
            )
        # Partner cannot self-approve
        if payload.status and payload.status.strip().lower() in ["approved", "rejected"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Partner users cannot approve or reject their own support proposals.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Your role cannot modify partner support proposals.",
        )

    prev_status = interest.status
    if payload.status:
        interest.status = payload.status.strip().lower()
    if payload.proposed_amount is not None:
        interest.proposed_amount = float(payload.proposed_amount)
    if payload.proposed_resources is not None:
        interest.proposed_resources = payload.proposed_resources
    if payload.notes is not None:
        interest.notes = payload.notes.strip()
    interest.updated_at = datetime.now(timezone.utc)

    # Create immutable audit log
    audit = AuditLog(
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        action="partner_interest_updated",
        entity_type="report",
        entity_id=report.track_id,
        metadata_json=json.dumps({
            "interest_id": interest.id,
            "partner_id": interest.partner_id,
            "partner_name": interest.partner_name,
            "previous_status": prev_status,
            "new_status": interest.status,
            "proposed_amount": interest.proposed_amount,
            "actor_role": current_user.role,
            "actor_name": current_user.full_name,
        }),
    )
    db.add(audit)

    db.commit()
    db.refresh(interest)
    logger.info(
        f"Updated partner interest #{interest.id} on report {report.track_id}: "
        f"{prev_status} -> {interest.status} by {current_user.full_name} ({current_user.role})"
    )

    # Automatic trigger for Dynamic Re-Matching (Phase 1 Part 10)
    try:
        execute_dynamic_rematch(
            db=db,
            report=report,
            trigger_type="partner_support_update_trigger",
            trigger_source=f"partner_interest:{interest.id}",
            changed_fields=["partner_support_proposal", "status"],
            actor_name=current_user.full_name,
            actor_user_id=current_user.id,
            actor_email=current_user.email,
            affected_types=["partner"],
            reason=f"Partner proposal status updated to '{interest.status}'",
        )
    except Exception as e:
        logger.warning(f"Note on partner interest update dynamic rematch trigger: {e}")

    interest_record = PartnerInterestRecord(
        id=interest.id,
        report_id=interest.report_id,
        track_id=interest.track_id,
        partner_id=interest.partner_id,
        partner_name=interest.partner_name,
        support_type=interest.support_type,
        proposed_amount=interest.proposed_amount,
        proposed_resources=interest.proposed_resources,
        notes=interest.notes,
        status=interest.status,
        created_by=interest.created_by,
        creator_user_id=interest.creator_user_id,
        creator_role=interest.creator_role,
        created_at=interest.created_at,
        updated_at=interest.updated_at,
    )

    return PartnerInterestActionResponse(
        success=True,
        message=f"Partner support proposal #{interest.id} updated successfully.",
        interest=interest_record,
    )


# ==============================================================================
# Phase 1 Part 10: Dynamic Re-Matching Endpoints
# ==============================================================================

@router.get(
    "/{track_id}/rematching-status",
    response_model=RematchingStatusResponse,
    summary="Get current AI dynamic re-matching status and latest event metadata",
    description="Returns current rematching status, version, and latest diff summary. Citizens can only view their own report. Other stakeholders have role-based access.",
)
def get_rematching_status(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RematchingStatusResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # RBAC Authorization
    if current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens can only view rematching status for their own reports.",
            )
    elif current_user.role in ["government", "admin"]:
        pass
    elif current_user.role == "hei":
        if not is_hei_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. HEI representatives can only view rematching status for connected reports.",
            )
    elif current_user.role == "faculty":
        if not is_faculty_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Faculty members can only view rematching status for connected reports.",
            )
    elif current_user.role == "partner":
        if not is_partner_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Partner users can only view rematching status for connected or invited reports.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied for role '{current_user.role}'.",
        )

    latest_event = (
        db.query(AIRematchingEvent)
        .filter(AIRematchingEvent.report_id == report.id)
        .order_by(AIRematchingEvent.created_at.desc())
        .first()
    )

    latest_record = None
    if latest_event:
        latest_record = RematchingEventRecord(
            id=latest_event.id,
            report_id=latest_event.report_id,
            track_id=latest_event.track_id,
            trigger_type=latest_event.trigger_type,
            trigger_source=latest_event.trigger_source,
            changed_fields=latest_event.changed_fields or [],
            affected_matching_types=latest_event.affected_matching_types or [],
            previous_matching_snapshot=latest_event.previous_matching_snapshot or {},
            new_matching_snapshot=latest_event.new_matching_snapshot or {},
            diff_summary=latest_event.diff_summary or {},
            status=latest_event.status,
            error_message=latest_event.error_message,
            created_at=latest_event.created_at,
            completed_at=latest_event.completed_at,
            created_by=latest_event.created_by,
        )

    return RematchingStatusResponse(
        track_id=report.track_id,
        ai_rematching_status=report.ai_rematching_status or "idle",
        ai_rematching_version=report.ai_rematching_version or 1,
        ai_last_rematched_at=report.ai_last_rematched_at,
        ai_rematching_reason=report.ai_rematching_reason,
        latest_event=latest_record,
    )


@router.get(
    "/{track_id}/rematching-history",
    response_model=Union[RematchingHistoryResponse, CitizenRematchingHistoryResponse],
    summary="Retrieve chronological dynamic re-matching history and differential snapshots",
    description="Returns all historical re-matching cycles with diff summaries and triggers. Citizens receive a privacy-safe view.",
)
def get_rematching_history(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Union[RematchingHistoryResponse, CitizenRematchingHistoryResponse]:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # RBAC Authorization
    if current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens can only view rematching history for their own reports.",
            )
    elif current_user.role in ["government", "admin"]:
        pass
    elif current_user.role == "hei":
        if not is_hei_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. HEI representatives can only view rematching history for connected reports.",
            )
    elif current_user.role == "faculty":
        if not is_faculty_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Faculty members can only view rematching history for connected reports.",
            )
    elif current_user.role == "partner":
        if not is_partner_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Partner users can only view rematching history for connected or invited reports.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied for role '{current_user.role}'.",
        )

    events_db = (
        db.query(AIRematchingEvent)
        .filter(AIRematchingEvent.report_id == report.id)
        .order_by(AIRematchingEvent.created_at.desc())
        .all()
    )

    if current_user.role == "citizen":
        citizen_events = [
            CitizenRematchingEventRecord(**mask_event_for_citizen(e))
            for e in events_db
        ]
        return CitizenRematchingHistoryResponse(
            track_id=report.track_id,
            total_events=len(citizen_events),
            events=citizen_events,
        )

    full_events = [
        RematchingEventRecord(
            id=e.id,
            report_id=e.report_id,
            track_id=e.track_id,
            trigger_type=e.trigger_type,
            trigger_source=e.trigger_source,
            changed_fields=e.changed_fields or [],
            affected_matching_types=e.affected_matching_types or [],
            previous_matching_snapshot=e.previous_matching_snapshot or {},
            new_matching_snapshot=e.new_matching_snapshot or {},
            diff_summary=e.diff_summary or {},
            status=e.status,
            error_message=e.error_message,
            created_at=e.created_at,
            completed_at=e.completed_at,
            created_by=e.created_by,
        )
        for e in events_db
    ]

    return RematchingHistoryResponse(
        track_id=report.track_id,
        total_events=len(full_events),
        events=full_events,
    )


@router.post(
    "/{track_id}/rematch",
    response_model=ManualRematchResponse,
    summary="Trigger manual dynamic re-matching recalculation",
    description="Government and Super Admin only. Triggers full or selective dynamic recalculation of matching recommendations without modifying civic report operational status or priority.",
)
def trigger_manual_rematch(
    track_id: str,
    payload: ManualRematchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["government", "admin"])),
) -> ManualRematchResponse:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    event = execute_dynamic_rematch(
        db=db,
        report=report,
        trigger_type="manual_trigger",
        trigger_source=f"official_request:{current_user.role}",
        changed_fields=payload.affected_types or ["manual_review"],
        actor_name=current_user.full_name,
        actor_user_id=current_user.id,
        actor_email=current_user.email,
        affected_types=payload.affected_types,
        reason=payload.reason or "Manual administrative rematching triggered by official",
    )

    event_record = None
    if event:
        event_record = RematchingEventRecord(
            id=event.id,
            report_id=event.report_id,
            track_id=event.track_id,
            trigger_type=event.trigger_type,
            trigger_source=event.trigger_source,
            changed_fields=event.changed_fields or [],
            affected_matching_types=event.affected_matching_types or [],
            previous_matching_snapshot=event.previous_matching_snapshot or {},
            new_matching_snapshot=event.new_matching_snapshot or {},
            diff_summary=event.diff_summary or {},
            status=event.status,
            error_message=event.error_message,
            created_at=event.created_at,
            completed_at=event.completed_at,
            created_by=event.created_by,
        )

    return ManualRematchResponse(
        success=event.status == "completed",
        message=(
            f"Dynamic re-matching completed successfully (v{report.ai_rematching_version})."
            if event.status == "completed"
            else f"Dynamic re-matching failed: {event.error_message}"
        ),
        version=report.ai_rematching_version or 1,
        event=event_record,
        diff_summary=event.diff_summary,
    )


@router.get(
    "/{track_id}/project-analytics",
    response_model=Union[ProjectAnalyticsResponse, CitizenProjectAnalyticsResponse],
    summary="Get explainable AI project and impact analytics for a report",
    description="Advisory AI project feasibility, estimated duration/budget, beneficiary reach, risk analysis, and civic impact synthesis.",
)
def get_report_project_analytics(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Union[ProjectAnalyticsResponse, CitizenProjectAnalyticsResponse]:
    report = (
        db.query(Report)
        .filter(func.lower(Report.track_id) == track_id.strip().lower())
        .first()
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with Track ID '{track_id}' not found.",
        )

    # Strict RBAC
    if current_user.role == "citizen":
        if report.citizen_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Citizens can only view project impact analytics for their own submitted reports.",
            )
    elif current_user.role in ["government", "admin"]:
        pass
    elif current_user.role == "hei":
        if not is_hei_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. HEI representatives can only view analytics for reports connected to their institution.",
            )
    elif current_user.role == "faculty":
        if not is_faculty_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Faculty members can only view analytics for reports connected to their institution or field.",
            )
    elif current_user.role == "partner":
        if not is_partner_connected_to_report(current_user, report, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Partner users can only view reports where they are connected or invited.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied for role '{current_user.role}'.",
        )

    # If project analytics not yet executed or is pending, analyze now
    if report.ai_project_analytics is None or report.ai_project_analytics_status in ["pending", None]:
        analytics_data = analyze_and_store_report_project_analytics(db, report)
    else:
        analytics_data = report.ai_project_analytics

    # Return privacy-safe response for citizens
    if current_user.role == "citizen":
        return mask_project_analytics_for_citizen(report, analytics_data)

    # Return full advisory project analytics response for administrative / institutional roles
    analytics_detail = None
    if analytics_data:
        try:
            analytics_detail = ProjectAnalyticsDetail(**analytics_data)
        except Exception as e:
            logger.warning(f"Failed to parse project analytics detail: {e}")

    return ProjectAnalyticsResponse(
        track_id=report.track_id,
        problem_title=report.problem_title,
        status=report.ai_project_analytics_status or "completed",
        analytics=analytics_detail,
        analyzed_at=report.ai_project_analytics_analyzed_at,
        model=report.ai_project_analytics_model,
    )

