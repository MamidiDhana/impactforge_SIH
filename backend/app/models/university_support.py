from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Text, DateTime, Integer, Float, JSON, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class ProjectResourceRequest(Base):
    """
    Tracks institutional resource, laboratory equipment, hardware, software,
    and funding support requests associated with university-assigned problems.
    """
    __tablename__ = "project_resource_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), index=True, nullable=False)
    track_id: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    problem_title: Mapped[str] = mapped_column(String(255), nullable=False)
    required_resource: Mapped[str] = mapped_column(String(255), nullable=False)
    resource_category: Mapped[str] = mapped_column(String(100), nullable=False)  # Laboratory Equipment | Prototyping Hardware | Compute & Software | Material Supplies | Grant Funding
    quantity_details: Mapped[str] = mapped_column(String(255), nullable=False)
    requested_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    requested_by_name: Mapped[str] = mapped_column(String(150), nullable=False, default="Dr. Meera Nair (Dean R&D)")
    institution_id: Mapped[str] = mapped_column(String(100), nullable=False, default="bit-mesra")
    request_status: Mapped[str] = mapped_column(String(50), nullable=False, default="In Fulfillment")  # Pending | In Fulfillment | Allocated | Completed
    approval_status: Mapped[str] = mapped_column(String(50), nullable=False, default="Approved")  # Pending Approval | Approved | Under Review | Rejected
    support_provider: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<ProjectResourceRequest {self.id}: {self.required_resource} on {self.track_id} ({self.approval_status})>"


class GovernmentFeedback(Base):
    """
    Official Government feedback, directives, and requested modifications for university projects.
    Allows two-way structured communication between Government Officials/PMU and HEI project teams.
    """
    __tablename__ = "government_feedbacks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id: Mapped[int] = mapped_column(Integer, ForeignKey("reports.id", ondelete="CASCADE"), index=True, nullable=False)
    track_id: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    problem_title: Mapped[str] = mapped_column(String(255), nullable=False)
    government_officer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    government_department: Mapped[str] = mapped_column(String(150), nullable=False)
    feedback_text: Mapped[str] = mapped_column(Text, nullable=False)
    requested_changes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    university_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    responded_by_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="Action Required")  # Action Required | Responded | Acknowledged | Resolved
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<GovernmentFeedback {self.id}: {self.government_department} -> {self.track_id} ({self.status})>"
