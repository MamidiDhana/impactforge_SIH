
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy import (
    String,
    Text,
    Float,
    DateTime,
    Integer,
    ForeignKey,
    JSON,
    Boolean,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    track_id: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    problem_title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    context_and_desired_outcome: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    existing_efforts: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    expected_outcome: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    state: Mapped[str] = mapped_column(String(50), nullable=False, default="Jharkhand")
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    locality: Mapped[str] = mapped_column(String(150), nullable=False)
    address_or_landmark: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), nullable=False, default="Medium")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Open", index=True)
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="Pending Verification", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    affected_people: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=0)
    citizen_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # User ownership, assignments, official remarks, and resolution lifecycle
    citizen_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    assigned_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    assigned_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    official_remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remarks_updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    remarks_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # AI Categorization and Analysis (Phase 1 Part 1)
    ai_category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_subcategory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_problem_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_analysis_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending")
    ai_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # AI Priority Scoring (Phase 1 Part 2)
    ai_priority: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ai_priority_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ai_priority_reasons: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ai_priority_factors: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ai_priority_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending")
    ai_priority_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_priority_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # AI Similar-Problem Detection (Phase 1 Part 3)
    ai_embedding: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ai_similarity_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending")
    ai_similarity_matches: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ai_similarity_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_similarity_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # AI Official Duplicate Analysis (Phase 1 Part 4)
    ai_duplicate_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending")
    ai_duplicate_candidates: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ai_duplicate_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_duplicate_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # AI Capability Extraction (Phase 1 Part 5)
    ai_capability_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending")
    ai_capabilities: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ai_capability_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_capability_reasons: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ai_capability_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_capability_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # AI HEI Matching (Phase 1 Part 6)
    ai_hei_matching_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending")
    ai_hei_matches: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    ai_hei_matching_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_hei_matching_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # AI Faculty and Student Matching (Phase 1 Part 7)
    ai_faculty_matching_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending")
    ai_faculty_matches: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    ai_student_matches: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    ai_faculty_matching_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_faculty_matching_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # AI Capability-Gap Analysis (Phase 1 Part 8)
    ai_capability_gap_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending")
    ai_capability_gap_analysis: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ai_capability_gap_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_capability_gap_severity: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    ai_capability_gap_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_capability_gap_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # AI Partner Matching (Phase 1 Part 9)
    ai_partner_matching_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending")
    ai_partner_matches: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    ai_partner_matching_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_partner_matching_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # AI Dynamic Re-Matching (Phase 1 Part 10)
    ai_rematching_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="idle")
    ai_last_rematched_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_rematching_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_rematching_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # AI Project and Impact Analytics (Phase 1 Part 11)
    ai_project_analytics_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, default="pending")
    ai_project_analytics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    ai_project_feasibility_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_project_impact_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_project_readiness_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_project_risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ai_project_analytics_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_project_analytics_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # AI-Driven Problem Routing & Dashboard Assignment (Government Validation Flow)
    routing_target: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    requires_funding: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    university_can_solve: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    ai_routing_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_routing_analyzed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ai_routing_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    @property
    def ai_pre_screening(self) -> Dict[str, Any]:
        has_similar = False
        top_match = None
        top_score = 0.0
        matches = self.ai_similarity_matches or []
        if isinstance(matches, list) and len(matches) > 0:
            candidate_match = matches[0]
            if isinstance(candidate_match, dict):
                top_match = candidate_match
                top_score = float(candidate_match.get("similarity_score", 0.0))
                # Threshold >= 0.55 flags possible / strong / duplicate similarity against live problems
                has_similar = top_score >= 0.55

        # Determine overall pre-screening status
        if self.ai_analysis_status == "failed" and self.ai_priority_status == "failed":
            overall_status = "failed"
        elif self.ai_analysis_status == "needs_review" or has_similar:
            overall_status = "needs_review"
        else:
            overall_status = "completed"

        return {
            "status": overall_status,
            "category": self.ai_category or self.category,
            "subcategory": self.ai_subcategory,
            "problem_type": self.ai_problem_type,
            "confidence_score": self.ai_confidence_score,
            "category_status": self.ai_analysis_status or "pending",
            "priority": self.ai_priority or self.priority,
            "priority_score": self.ai_priority_score,
            "priority_reasons": self.ai_priority_reasons or [],
            "priority_status": self.ai_priority_status or "pending",
            "has_similar_live_problem": has_similar,
            "top_similarity_score": top_score,
            "top_similar_match": top_match,
            "similar_matches": matches,
            "similarity_status": self.ai_similarity_status or "pending",
            "verification_status": self.verification_status or "Pending Verification",
        }

    def __repr__(self) -> str:
        return f"<Report {self.track_id}: {self.problem_title} ({self.status})>"
