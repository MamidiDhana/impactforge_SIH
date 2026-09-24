from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 1. Resources & Support Schemas
# ---------------------------------------------------------------------------

class UniversityResourceRequestItem(BaseModel):
    """
    Structured resource/support requirement associated with an active university project.
    """
    id: int
    report_id: int
    track_id: str
    problem_title: str
    required_resource: str
    resource_category: str
    quantity_details: str
    requested_date: datetime
    request_status: str
    approval_status: str
    support_provider: Optional[str] = None
    requested_by_name: str
    institution_id: str
    notes: Optional[str] = None


class UniversityResourceCreateRequest(BaseModel):
    """
    Payload to request resources or technical equipment for a university problem.
    """
    required_resource: str = Field(..., min_length=2, max_length=255)
    resource_category: str = Field(..., min_length=2, max_length=100)
    quantity_details: str = Field(..., min_length=1, max_length=255)
    support_provider: Optional[str] = None
    notes: Optional[str] = None


class UniversityResourceActionResponse(BaseModel):
    status: str = "success"
    message: str
    track_id: str
    request: Optional[UniversityResourceRequestItem] = None


# ---------------------------------------------------------------------------
# 2. Industry / CSR Collaboration Schemas
# ---------------------------------------------------------------------------

class UniversityCollaborationItem(BaseModel):
    """
    Real industry or CSR collaboration record attached to a university problem.
    """
    id: int
    report_id: int
    track_id: str
    problem_title: str
    partner_id: str
    partner_name: str
    partner_type: str
    support_provided: str
    technical_support: str
    funding_contribution: str
    collaboration_status: str
    start_date: datetime
    current_progress: int
    contact_email: Optional[str] = None
    notes: Optional[str] = None


class UniversityCollaborationCreateRequest(BaseModel):
    """
    Payload to initiate an industry/CSR collaboration request for an assigned project.
    """
    partner_id: str
    support_type: Optional[str] = "Equipment & Funding Support"
    proposed_amount: Optional[float] = 0.0
    notes: Optional[str] = None


class UniversityCollaborationActionResponse(BaseModel):
    status: str = "success"
    message: str
    track_id: str
    collaboration: Optional[UniversityCollaborationItem] = None


# ---------------------------------------------------------------------------
# 3. Government Feedback Schemas
# ---------------------------------------------------------------------------

class UniversityGovernmentFeedbackItem(BaseModel):
    """
    Direct Government feedback item on a university project with response tracking.
    """
    id: int
    report_id: int
    track_id: str
    problem_title: str
    government_officer_department: str
    government_officer_name: str
    government_department: str
    feedback: str
    requested_changes: Optional[str] = None
    university_response: Optional[str] = None
    responded_by_name: Optional[str] = None
    responded_at: Optional[datetime] = None
    feedback_status: str
    date: datetime
    current_project_stage: str


class UniversityFeedbackRespondRequest(BaseModel):
    """
    Payload for University to submit official response/action to Government feedback.
    """
    university_response: str = Field(..., min_length=3, max_length=3000)
    feedback_status: Optional[str] = "Responded"


class UniversityFeedbackActionResponse(BaseModel):
    status: str = "success"
    message: str
    track_id: str
    feedback_item: Optional[UniversityGovernmentFeedbackItem] = None
