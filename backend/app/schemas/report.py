from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# 24 Canonical Jharkhand Districts
JHARKHAND_DISTRICTS: List[str] = [
    "Ranchi",
    "East Singhbhum",
    "West Singhbhum",
    "Dhanbad",
    "Bokaro",
    "Deoghar",
    "Hazaribagh",
    "Giridih",
    "Ramgarh",
    "Dumka",
    "Gumla",
    "Simdega",
    "Lohardaga",
    "Palamu",
    "Chatra",
    "Latehar",
    "Sahibganj",
    "Pakur",
    "Godda",
    "Koderma",
    "Garhwa",
    "Khunti",
    "Saraikela-Kharsawan",
    "Jamtara",
]

# Alias dictionary for common district name variants
DISTRICT_ALIASES: Dict[str, str] = {
    "east singhbhum (jamshedpur)": "East Singhbhum",
    "east singhbhum": "East Singhbhum",
    "jamshedpur": "East Singhbhum",
    "west singhbhum": "West Singhbhum",
    "saraikela-kharsawan": "Saraikela-Kharsawan",
    "saraikela kharsawan": "Saraikela-Kharsawan",
    "seraikela-kharsawan": "Saraikela-Kharsawan",
    "seraikela kharsawan": "Saraikela-Kharsawan",
}


def normalize_jharkhand_district(district_raw: str) -> str:
    """Validates and returns canonical Jharkhand district name."""
    cleaned = district_raw.strip()
    lower = cleaned.lower()

    if lower in DISTRICT_ALIASES:
        return DISTRICT_ALIASES[lower]

    for d in JHARKHAND_DISTRICTS:
        if d.lower() == lower:
            return d

    raise ValueError(
        f"District '{district_raw}' is not a valid Jharkhand district. "
        f"Must be one of the 24 Jharkhand districts: {', '.join(JHARKHAND_DISTRICTS)}"
    )


class ReportStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    REJECTED = "Rejected"
    VALIDATED = "Validated"


class ReportBase(BaseModel):
    problem_title: str = Field(..., min_length=3, max_length=255, description="Title of the reported problem")
    category: Optional[str] = Field(default=None, max_length=100, description="Category of problem (e.g., Water / Facilities) - optional, determined by AI if omitted")
    context_and_desired_outcome: Optional[str] = Field(None, description="Detailed problem background and desired outcome")
    existing_efforts: Optional[str] = Field(None, description="Previous or existing attempts to resolve the issue")
    expected_outcome: Optional[str] = Field(None, description="Measurable impact or expected resolution")
    state: str = Field(default="Jharkhand", description="State (restricted to Jharkhand)")
    district: str = Field(..., description="Jharkhand district name")
    locality: str = Field(..., min_length=1, max_length=150, description="City, village, block, or ward")
    address_or_landmark: str = Field(..., min_length=1, description="Specific location or landmark")
    latitude: Optional[float] = Field(None, description="GPS Latitude coordinate")
    longitude: Optional[float] = Field(None, description="GPS Longitude coordinate")
    priority: Optional[str] = Field(default=None, description="Priority level (Low, Medium, High, Critical) - optional, determined by AI if omitted")


class ReportCreate(ReportBase):
    @model_validator(mode="before")
    @classmethod
    def resolve_aliases(cls, data: Any) -> Any:
        """Allow common alternative field names sent from frontend or clients."""
        if isinstance(data, dict):
            # problem_title <- title
            if "problem_title" not in data and "title" in data:
                data["problem_title"] = data["title"]
            # context_and_desired_outcome <- description
            if "context_and_desired_outcome" not in data and "description" in data:
                data["context_and_desired_outcome"] = data["description"]
            # address_or_landmark <- address or landmark
            if "address_or_landmark" not in data:
                if "address" in data and data["address"]:
                    data["address_or_landmark"] = data["address"]
                elif "landmark" in data and data["landmark"]:
                    data["address_or_landmark"] = data["landmark"]
            # priority <- urgency
            if "priority" not in data and "urgency" in data:
                data["priority"] = data["urgency"]
        return data

    @field_validator("state")
    @classmethod
    def validate_state(cls, v: str) -> str:
        if v.strip().lower() != "jharkhand":
            raise ValueError("State must be restricted to 'Jharkhand'.")
        return "Jharkhand"

    @field_validator("district")
    @classmethod
    def validate_district(cls, v: str) -> str:
        return normalize_jharkhand_district(v)

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        allowed = ["Low", "Medium", "High", "Critical"]
        for p in allowed:
            if p.lower() == v.strip().lower():
                return p
        return v.strip().capitalize()


class ReportStatusUpdate(BaseModel):
    status: ReportStatus = Field(..., description="Updated status (Open, In Progress, Resolved, Rejected)")
    remarks: Optional[str] = Field(None, description="Optional notes/remarks on the status change")


class ReportAssignmentUpdate(BaseModel):
    assigned_to: str = Field(..., min_length=2, max_length=255, description="Name or team assigned")
    assigned_role: Optional[str] = Field(None, description="Role or department assigned (e.g. government, hei, faculty, partner)")
    remarks: Optional[str] = Field(None, description="Optional assignment justification")


class ReportRemarksUpdate(BaseModel):
    official_remarks: str = Field(..., description="Official government / department remarks")


class ReportVerificationUpdate(BaseModel):
    verification_status: str = Field(..., description="Verification status: 'Verified', 'Pending Verification', or 'Rejected'")
    official_remarks: Optional[str] = Field(None, description="Official government verification remarks")


class ReportStatusHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: int
    previous_status: Optional[str] = None
    new_status: str
    changed_by: Optional[str] = None
    changed_at: datetime
    remarks: Optional[str] = None


class AIPreScreeningSummary(BaseModel):
    status: str = "completed"
    category: str
    subcategory: Optional[str] = None
    problem_type: Optional[str] = None
    confidence_score: Optional[float] = None
    category_status: Optional[str] = "pending"
    priority: str
    priority_score: Optional[int] = None
    priority_reasons: Optional[List[str]] = None
    priority_status: Optional[str] = "pending"
    has_similar_live_problem: bool = False
    top_similarity_score: Optional[float] = None
    top_similar_match: Optional[Dict[str, Any]] = None
    similar_matches: Optional[List[Dict[str, Any]]] = None
    similarity_status: Optional[str] = "pending"
    verification_status: Optional[str] = "Pending Verification"


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    track_id: str
    problem_title: str
    category: str
    context_and_desired_outcome: Optional[str] = None
    existing_efforts: Optional[str] = None
    expected_outcome: Optional[str] = None
    state: str
    district: str
    locality: str
    address_or_landmark: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    priority: str
    status: str
    verification_status: Optional[str] = "Pending Verification"
    citizen_id: Optional[int] = None
    assigned_to: Optional[str] = None
    assigned_role: Optional[str] = None
    assigned_by: Optional[str] = None
    assigned_at: Optional[datetime] = None
    official_remarks: Optional[str] = None
    remarks_updated_by: Optional[str] = None
    remarks_updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    # Consolidated AI Pre-Screening summary for citizen problem submission
    ai_pre_screening: Optional[AIPreScreeningSummary] = None
    # AI Categorization and Analysis (Phase 1 Part 1)
    ai_category: Optional[str] = None
    ai_subcategory: Optional[str] = None
    ai_problem_type: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_confidence_score: Optional[float] = None
    ai_analysis_status: Optional[str] = None
    ai_model: Optional[str] = None
    ai_analyzed_at: Optional[datetime] = None
    # AI Priority Scoring (Phase 1 Part 2)
    ai_priority: Optional[str] = None
    ai_priority_score: Optional[int] = None
    ai_priority_reasons: Optional[List[str]] = None
    ai_priority_factors: Optional[Dict[str, Any]] = None
    ai_priority_status: Optional[str] = None
    ai_priority_model: Optional[str] = None
    ai_priority_analyzed_at: Optional[datetime] = None
    # AI Similar-Problem Detection (Phase 1 Part 3)
    ai_similarity_status: Optional[str] = None
    ai_similarity_matches: Optional[List[Dict[str, Any]]] = None
    ai_similarity_model: Optional[str] = None
    ai_similarity_analyzed_at: Optional[datetime] = None
    # AI Official Duplicate Analysis (Phase 1 Part 4)
    ai_duplicate_status: Optional[str] = None
    ai_duplicate_candidates: Optional[List[Dict[str, Any]]] = None
    ai_duplicate_model: Optional[str] = None
    ai_duplicate_analyzed_at: Optional[datetime] = None
    # AI Capability Extraction (Phase 1 Part 5)
    ai_capability_status: Optional[str] = None
    ai_capabilities: Optional[Any] = None
    ai_capability_confidence: Optional[float] = None
    ai_capability_reasons: Optional[List[str]] = None
    ai_capability_model: Optional[str] = None
    ai_capability_analyzed_at: Optional[datetime] = None
    # AI HEI Matching (Phase 1 Part 6)
    ai_hei_matching_status: Optional[str] = None
    ai_hei_matches: Optional[List[Dict[str, Any]]] = None
    ai_hei_matching_analyzed_at: Optional[datetime] = None
    ai_hei_matching_model: Optional[str] = None
    # AI Faculty and Student Matching (Phase 1 Part 7)
    ai_faculty_matching_status: Optional[str] = None
    ai_faculty_matches: Optional[List[Dict[str, Any]]] = None
    ai_student_matches: Optional[List[Dict[str, Any]]] = None
    ai_faculty_matching_model: Optional[str] = None
    ai_faculty_matching_analyzed_at: Optional[datetime] = None
    # AI Capability-Gap Analysis (Phase 1 Part 8)
    ai_capability_gap_status: Optional[str] = None
    ai_capability_gap_analysis: Optional[Dict[str, Any]] = None
    ai_capability_gap_score: Optional[float] = None
    ai_capability_gap_severity: Optional[str] = None
    ai_capability_gap_model: Optional[str] = None
    ai_capability_gap_analyzed_at: Optional[datetime] = None
    # AI Partner Matching (Phase 1 Part 9)
    ai_partner_matching_status: Optional[str] = None
    ai_partner_matches: Optional[List[Dict[str, Any]]] = None
    ai_partner_matching_model: Optional[str] = None
    ai_partner_matching_analyzed_at: Optional[datetime] = None
    # AI Dynamic Re-Matching (Phase 1 Part 10)
    ai_rematching_status: Optional[str] = None
    ai_last_rematched_at: Optional[datetime] = None
    ai_rematching_reason: Optional[str] = None
    ai_rematching_version: Optional[int] = 1
    # AI Project and Impact Analytics (Phase 1 Part 11)
    ai_project_analytics_status: Optional[str] = None
    ai_project_analytics: Optional[Dict[str, Any]] = None
    ai_project_feasibility_score: Optional[float] = None
    ai_project_impact_score: Optional[float] = None
    ai_project_readiness_score: Optional[float] = None
    ai_project_risk_score: Optional[float] = None
    ai_project_analytics_model: Optional[str] = None
    ai_project_analytics_analyzed_at: Optional[datetime] = None
    # AI-Driven Problem Routing & Dashboard Assignment (Government Validation Flow)
    routing_target: Optional[str] = None
    requires_funding: Optional[bool] = None
    university_can_solve: Optional[bool] = None
    ai_routing_reason: Optional[str] = None
    ai_routing_analyzed_at: Optional[datetime] = None
    ai_routing_model: Optional[str] = None
    created_at: datetime
    updated_at: datetime

