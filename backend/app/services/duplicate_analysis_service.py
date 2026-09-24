import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.report import Report
from app.models.report_status_history import ReportStatusHistory
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.duplicate_schema import (
    DuplicateAnalysisResponse,
    DuplicateCandidate,
    DuplicateReviewRequest,
    OfficialReviewDetail,
)
from app.services.similarity_service import find_similar_reports

logger = logging.getLogger("duplicate_analysis_service")


def classify_duplicate_candidate(
    report: Report, cand: Report, score: float
) -> Tuple[str, List[str]]:
    """
    Evaluates whether candidate report is an official duplicate candidate.
    Uses similarity score, geographic proximity, category, problem type,
    status, and infrastructure context.
    Returns: (duplicate_classification, explainable_reasons)
    """
    reasons: List[str] = []

    # Geographic and category matching
    same_district = bool(
        report.district
        and cand.district
        and report.district.strip().lower() == cand.district.strip().lower()
    )
    same_locality = bool(
        report.locality
        and cand.locality
        and report.locality.strip().lower() == cand.locality.strip().lower()
    )
    same_category = bool(
        (report.category and cand.category and report.category.strip().lower() == cand.category.strip().lower())
        or (report.ai_category and cand.ai_category and report.ai_category.strip().lower() == cand.ai_category.strip().lower())
    )
    same_problem_type = bool(
        report.ai_problem_type
        and cand.ai_problem_type
        and report.ai_problem_type.strip().lower() == cand.ai_problem_type.strip().lower()
    )

    # 1. Location & Category Reason
    if same_locality and same_category:
        reasons.append(f"Same locality ({cand.locality}) and category ({cand.category})")
    elif same_locality:
        reasons.append(f"Same locality ({cand.locality})")
    elif same_district and same_category:
        reasons.append(f"Same district ({cand.district}) and category ({cand.category})")
    elif same_district:
        reasons.append(f"Same district ({cand.district})")

    # 2. Textual & Semantic Similarity Reason
    if score >= 0.85:
        reasons.append("Highly similar problem description")
    elif score >= 0.75:
        reasons.append("Substantially similar problem description")
    elif score >= 0.55:
        reasons.append("Moderate contextual and issue similarity")

    # 3. Status and Resolution Context Reasons
    if cand.status == "Resolved":
        reasons.append("Existing report is already resolved")
    elif cand.status == "In Progress":
        reasons.append("Existing report is currently in progress")
    elif cand.status in ["Under Review", "Investigating"]:
        reasons.append("Existing report is under active investigation")

    # 4. Infrastructure and Problem Type Reasons
    infra_keywords = ["water", "leak", "pipe", "sewage", "drain", "wire", "electric", "road", "pothole", "light", "bridge"]
    text_combined = f"{report.problem_title} {cand.problem_title}".lower()
    if same_problem_type:
        reasons.append(f"Same infrastructure issue ({report.ai_problem_type})")
    elif any(k in text_combined for k in infra_keywords) and same_category:
        reasons.append("Same infrastructure issue")

    # Determine Classification Level
    if score >= 0.85 and (same_locality or same_category or same_problem_type):
        classification = "confirmed_duplicate_candidate"
    elif score >= 0.75 or (score >= 0.70 and same_locality and same_category):
        classification = "likely_duplicate"
    elif score >= 0.55:
        classification = "possible_duplicate"
    else:
        classification = "not_duplicate"
        if not reasons:
            reasons.append("Low overall similarity across location and problem description")

    return classification, reasons


def analyze_and_store_report_duplicates(db: Session, report: Report) -> List[Dict[str, Any]]:
    """
    Analyzes duplicate candidates for a report by inspecting similar reports.
    Saves candidate metadata in PostgreSQL without modifying official report status or priority.
    """
    try:
        # 1. Fetch similar reports (reuse Phase 1 Part 3)
        similar_matches = report.ai_similarity_matches
        if not similar_matches:
            # If not yet analyzed or empty, run similarity search
            similar_matches = find_similar_reports(db, report, top_k=5)

        if not similar_matches:
            report.ai_duplicate_status = "no_candidates"
            report.ai_duplicate_candidates = []
            report.ai_duplicate_model = settings.AI_EMBEDDING_MODEL
            report.ai_duplicate_analyzed_at = datetime.now(timezone.utc)
            db.commit()
            return []

        # 2. Extract candidate IDs and load Candidate Report objects
        cand_track_ids = [m["matching_track_id"] for m in similar_matches if "matching_track_id" in m]
        cand_map: Dict[str, Report] = {}
        if cand_track_ids:
            found_reports = db.query(Report).filter(Report.track_id.in_(cand_track_ids)).all()
            cand_map = {r.track_id: r for r in found_reports}

        # Existing reviews preserve dictionary if previously reviewed
        existing_reviews: Dict[str, Any] = {}
        if report.ai_duplicate_candidates:
            for old_cand in report.ai_duplicate_candidates:
                if isinstance(old_cand, dict) and old_cand.get("matching_track_id"):
                    t_id = old_cand["matching_track_id"]
                    if old_cand.get("official_review"):
                        existing_reviews[t_id] = old_cand["official_review"]

        # 3. Classify each candidate
        candidates: List[Dict[str, Any]] = []
        for match in similar_matches:
            t_id = match.get("matching_track_id")
            score = float(match.get("similarity_score", 0.0))
            cand_report = cand_map.get(t_id)

            if cand_report:
                classification, reasons = classify_duplicate_candidate(report, cand_report, score)
                created_str = (
                    cand_report.created_at.strftime("%b %d, %Y")
                    if cand_report.created_at
                    else "Recently"
                )
                cand_data = {
                    "matching_track_id": cand_report.track_id,
                    "similarity_score": round(score, 2),
                    "duplicate_classification": classification,
                    "reasons": reasons,
                    "current_status": cand_report.status,
                    "current_priority": cand_report.priority,
                    "district_location": f"{cand_report.district}, {cand_report.locality}",
                    "created_date": created_str,
                    "title": cand_report.problem_title,
                    "category": cand_report.category,
                    "official_review": existing_reviews.get(cand_report.track_id),
                }
                candidates.append(cand_data)

        # 4. Determine duplicate status
        if not candidates or all(c["duplicate_classification"] == "not_duplicate" for c in candidates):
            status = "no_candidates"
        elif any(c["duplicate_classification"] in ["confirmed_duplicate_candidate", "likely_duplicate"] for c in candidates):
            status = "needs_review"
        else:
            status = "completed"

        # If already reviewed by official, keep reviewed status
        if any(c.get("official_review") for c in candidates):
            status = "reviewed"

        report.ai_duplicate_status = status
        report.ai_duplicate_candidates = candidates
        report.ai_duplicate_model = settings.AI_EMBEDDING_MODEL
        report.ai_duplicate_analyzed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(report)
        logger.info(
            f"Official duplicate analysis stored for {report.track_id}: "
            f"{len(candidates)} candidates (status={status})"
        )
        return candidates

    except Exception as e:
        logger.error(f"Failed to analyze report duplicates for {report.track_id}: {e}", exc_info=True)
        report.ai_duplicate_status = "failed"
        report.ai_duplicate_candidates = []
        try:
            db.commit()
        except Exception:
            db.rollback()
        return []


def apply_official_duplicate_review(
    db: Session,
    report: Report,
    review_req: DuplicateReviewRequest,
    reviewer: User,
) -> DuplicateAnalysisResponse:
    """
    Applies an authorized official's decision on a duplicate candidate.
    - Saves audit log in PostgreSQL
    - Records official review in report candidate JSON
    - NEVER auto-merges, NEVER deletes, NEVER changes status or priority.
    """
    candidates = list(report.ai_duplicate_candidates or [])

    # Find candidate or create entry if missing
    target_idx = -1
    for idx, c in enumerate(candidates):
        if c.get("matching_track_id") == review_req.candidate_track_id:
            target_idx = idx
            break

    review_timestamp = datetime.now(timezone.utc)
    review_record = {
        "decision": review_req.decision,
        "reviewed_by_id": reviewer.id,
        "reviewed_by_email": reviewer.email,
        "reviewed_by_role": reviewer.role,
        "official_remarks": review_req.official_remarks.strip(),
        "reviewed_at": review_timestamp.isoformat(),
    }

    if target_idx >= 0:
        candidates[target_idx]["official_review"] = review_record
        if review_req.decision == "confirm_duplicate":
            candidates[target_idx]["duplicate_classification"] = "confirmed_duplicate_candidate"
        elif review_req.decision == "not_duplicate":
            candidates[target_idx]["duplicate_classification"] = "not_duplicate"
    else:
        # Fallback candidate entry if reviewing directly
        cand_rep_lookup = db.query(Report).filter(Report.track_id == review_req.candidate_track_id).first()
        classification = "confirmed_duplicate_candidate" if review_req.decision == "confirm_duplicate" else "not_duplicate"
        candidates.append({
            "matching_track_id": review_req.candidate_track_id,
            "similarity_score": 0.85,
            "duplicate_classification": classification,
            "reasons": ["Direct official review submission"],
            "current_status": cand_rep_lookup.status if cand_rep_lookup else "Open",
            "current_priority": cand_rep_lookup.priority if cand_rep_lookup else "Medium",
            "district_location": f"{cand_rep_lookup.district}, {cand_rep_lookup.locality}" if cand_rep_lookup else "Jharkhand",
            "created_date": cand_rep_lookup.created_at.strftime("%b %d, %Y") if (cand_rep_lookup and cand_rep_lookup.created_at) else "Recently",
            "title": cand_rep_lookup.problem_title if cand_rep_lookup else "Report",
            "category": cand_rep_lookup.category if cand_rep_lookup else "Civic Issue",
            "official_review": review_record,
        })

    # Handle Status Transitions and Routing Constraints
    prev_status = report.status
    if review_req.decision == "confirm_duplicate":
        report.status = "Duplicate"
        report.verification_status = "Duplicate"
        report.routing_target = None  # Prevent independent university or industry workflow dispatch
        if review_req.official_remarks:
            report.official_remarks = review_req.official_remarks.strip()
            report.remarks_updated_by = reviewer.email
            report.remarks_updated_at = review_timestamp

        if prev_status != "Duplicate":
            status_hist = ReportStatusHistory(
                report_id=report.id,
                previous_status=prev_status,
                new_status="Duplicate",
                changed_by=reviewer.email,
                remarks=f"Official duplicate review (Linked to canonical): Linked to canonical problem {review_req.candidate_track_id}. {review_req.official_remarks}".strip(),
            )
            db.add(status_hist)

    elif review_req.decision == "not_duplicate":
        report.status = "Open"
        report.verification_status = "Pending Verification"
        if review_req.official_remarks:
            report.official_remarks = review_req.official_remarks.strip()
            report.remarks_updated_by = reviewer.email
            report.remarks_updated_at = review_timestamp

        if prev_status != "Open":
            status_hist = ReportStatusHistory(
                report_id=report.id,
                previous_status=prev_status,
                new_status="Open",
                changed_by=reviewer.email,
                remarks=f"Official duplicate review (kept as separate problem): Unlinked from {review_req.candidate_track_id}. {review_req.official_remarks}".strip(),
            )
            db.add(status_hist)

    # Update report metadata
    report.ai_duplicate_candidates = candidates
    report.ai_duplicate_status = "reviewed"
    report.ai_duplicate_analyzed_at = review_timestamp

    # Mirror review on candidate report if it exists in the database
    cand_rep = db.query(Report).filter(Report.track_id == review_req.candidate_track_id).first()
    if cand_rep:
        cand_candidates = list(cand_rep.ai_duplicate_candidates or [])
        cand_match_idx = -1
        for c_idx, cc in enumerate(cand_candidates):
            if cc.get("matching_track_id") == report.track_id:
                cand_match_idx = c_idx
                break

        mirror_review = {
            "decision": review_req.decision,
            "reviewed_by_id": reviewer.id,
            "reviewed_by_email": reviewer.email,
            "reviewed_by_role": reviewer.role,
            "official_remarks": review_req.official_remarks.strip(),
            "reviewed_at": review_timestamp.isoformat(),
        }

        if cand_match_idx >= 0:
            cand_candidates[cand_match_idx]["official_review"] = mirror_review
            if review_req.decision == "confirm_duplicate":
                cand_candidates[cand_match_idx]["duplicate_classification"] = "confirmed_duplicate_candidate"
            elif review_req.decision == "not_duplicate":
                cand_candidates[cand_match_idx]["duplicate_classification"] = "not_duplicate"
        else:
            cand_candidates.append({
                "matching_track_id": report.track_id,
                "similarity_score": candidates[target_idx].get("similarity_score", 0.85) if target_idx >= 0 else 0.85,
                "duplicate_classification": "confirmed_duplicate_candidate" if review_req.decision == "confirm_duplicate" else "not_duplicate",
                "reasons": [f"Reciprocal review from {report.track_id}"],
                "current_status": report.status,
                "current_priority": report.priority,
                "district_location": f"{report.district}, {report.locality}",
                "created_date": report.created_at.strftime("%b %d, %Y") if report.created_at else "Recently",
                "title": report.problem_title,
                "category": report.category,
                "official_review": mirror_review,
            })
        cand_rep.ai_duplicate_candidates = cand_candidates
        cand_rep.ai_duplicate_status = "reviewed"
        cand_rep.ai_duplicate_analyzed_at = review_timestamp

    # Save to AuditLog
    audit_log = AuditLog(
        actor_user_id=reviewer.id,
        actor_email=reviewer.email,
        action="official_duplicate_review",
        entity_type="report",
        entity_id=report.track_id,
        metadata_json=json.dumps({
            "reviewer_user_id": reviewer.id,
            "reviewer_role": reviewer.role,
            "source_track_id": report.track_id,
            "candidate_track_id": review_req.candidate_track_id,
            "decision": review_req.decision,
            "official_remarks": review_req.official_remarks.strip(),
            "timestamp": review_timestamp.isoformat(),
        }),
    )
    db.add(audit_log)
    db.commit()
    db.refresh(report)

    logger.info(
        f"Official duplicate review submitted by user={reviewer.id} ({reviewer.role}) "
        f"for source={report.track_id}, candidate={review_req.candidate_track_id}, "
        f"decision={review_req.decision}"
    )

    formatted_candidates: List[DuplicateCandidate] = []
    for c in candidates:
        rev = None
        if c.get("official_review"):
            r_obj = c["official_review"]
            rev = OfficialReviewDetail(
                decision=r_obj["decision"],
                reviewed_by_id=r_obj["reviewed_by_id"],
                reviewed_by_email=r_obj["reviewed_by_email"],
                reviewed_by_role=r_obj["reviewed_by_role"],
                official_remarks=r_obj["official_remarks"],
                reviewed_at=datetime.fromisoformat(r_obj["reviewed_at"]),
            )
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
        ai_duplicate_status=report.ai_duplicate_status or "reviewed",
        ai_duplicate_model=report.ai_duplicate_model,
        ai_duplicate_analyzed_at=report.ai_duplicate_analyzed_at,
        total_candidates=len(formatted_candidates),
        candidates=formatted_candidates,
    )
