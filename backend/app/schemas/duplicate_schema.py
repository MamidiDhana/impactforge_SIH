from typing import List, Optional, Literal
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class OfficialReviewDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    decision: Literal["confirm_duplicate", "merge_duplicate", "not_duplicate", "needs_review"]
    reviewed_by_id: int
    reviewed_by_email: str
    reviewed_by_role: str
    official_remarks: str
    reviewed_at: datetime


class DuplicateCandidate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    matching_track_id: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    duplicate_classification: Literal[
        "not_duplicate",
        "possible_duplicate",
        "likely_duplicate",
        "confirmed_duplicate_candidate",
    ]
    reasons: List[str] = Field(default_factory=list)
    current_status: str
    current_priority: str
    district_location: str
    created_date: str
    title: Optional[str] = None
    category: Optional[str] = None
    official_review: Optional[OfficialReviewDetail] = None


class DuplicateAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    track_id: str
    ai_duplicate_status: str
    ai_duplicate_model: Optional[str] = None
    ai_duplicate_analyzed_at: Optional[datetime] = None
    total_candidates: int
    candidates: List[DuplicateCandidate]


class DuplicateReviewRequest(BaseModel):
    candidate_track_id: str
    decision: Literal["confirm_duplicate", "not_duplicate", "needs_review"]
    official_remarks: str = Field(..., min_length=1, max_length=1000)
