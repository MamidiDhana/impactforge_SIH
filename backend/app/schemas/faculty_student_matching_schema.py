from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class FacultyFactorScores(BaseModel):
    """
    Explainable factor scores for Faculty matching (Total: 100%).
    """
    skills: float = Field(..., ge=0.0, le=35.0, description="Skill Match (35%)")
    technical_domains: float = Field(..., ge=0.0, le=25.0, description="Technical Domain Match (25%)")
    relevant_experience: float = Field(..., ge=0.0, le=15.0, description="Relevant Research & Project Experience (15%)")
    availability_workload: float = Field(..., ge=0.0, le=15.0, description="Availability and Workload (15%)")
    location_hei_relevance: float = Field(..., ge=0.0, le=10.0, description="Location and HEI Relevance (10%)")


class StudentFactorScores(BaseModel):
    """
    Explainable factor scores for Student matching (Total: 100%).
    """
    skills: float = Field(..., ge=0.0, le=30.0, description="Required Skills Match (30%)")
    technical_domains: float = Field(..., ge=0.0, le=20.0, description="Technical Domain Match (20%)")
    student_interests: float = Field(..., ge=0.0, le=20.0, description="Student Interests Alignment (20%)")
    availability_workload: float = Field(..., ge=0.0, le=15.0, description="Availability and Current Workload (15%)")
    location_hei_relevance: float = Field(..., ge=0.0, le=15.0, description="Institution and Location Relevance (15%)")


class FacultyRecommendationMatch(BaseModel):
    """
    A single recommended faculty member matched to a civic report.
    """
    faculty_id: str
    name: str
    institution_id: str
    institution_name: str
    department: str
    district: str
    state: str = "Jharkhand"
    verification_status: str = "unverified"
    availability: str = "available"
    current_workload: int = 2
    research_expertise: List[str] = Field(default_factory=list)
    match_score: float = Field(..., ge=0.0, le=100.0)
    recommendation_level: str = Field(..., description="low, moderate, strong, excellent")
    factor_scores: FacultyFactorScores
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    reasons: List[str] = Field(default_factory=list)
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)


class StudentRecommendationMatch(BaseModel):
    """
    A single recommended student matched to a civic report.
    """
    student_id: str
    name: str
    institution_id: str
    institution_name: str
    department: str
    district: str
    state: str = "Jharkhand"
    verification_status: str = "unverified"
    availability: str = "available"
    current_workload: int = 1
    interests: List[str] = Field(default_factory=list)
    match_score: float = Field(..., ge=0.0, le=100.0)
    recommendation_level: str = Field(..., description="low, moderate, strong, excellent")
    factor_scores: StudentFactorScores
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    reasons: List[str] = Field(default_factory=list)
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)


class FacultyInterestRecord(BaseModel):
    """
    Historical log of an official recommendation or expression of interest for a faculty profile.
    """
    id: int
    report_id: int
    track_id: str
    faculty_id: str
    faculty_name: str
    institution_id: str
    action_type: str  # official_recommendation | expression_of_interest
    actor_user_id: Optional[int] = None
    actor_name: str
    actor_role: str
    actor_email: str
    remarks: str
    created_at: datetime


class StudentInterestRecord(BaseModel):
    """
    Historical log of an official recommendation or expression of interest for a student profile.
    """
    id: int
    report_id: int
    track_id: str
    student_id: str
    student_name: str
    institution_id: str
    action_type: str  # official_recommendation | expression_of_interest
    actor_user_id: Optional[int] = None
    actor_name: str
    actor_role: str
    actor_email: str
    remarks: str
    created_at: datetime


class FacultyMatchingResponse(BaseModel):
    """
    Response returned by GET /api/reports/{track_id}/faculty-matches
    """
    track_id: str
    ai_faculty_matching_status: str
    matches: List[FacultyRecommendationMatch] = Field(default_factory=list)
    recorded_interests: List[FacultyInterestRecord] = Field(default_factory=list)
    model: Optional[str] = None
    analyzed_at: Optional[datetime] = None
    disclaimer: str = (
        "AI recommendations are advisory only. Academic collaboration requires "
        "official administrative approval and institutional consent."
    )


class StudentMatchingResponse(BaseModel):
    """
    Response returned by GET /api/reports/{track_id}/student-matches
    """
    track_id: str
    ai_student_matching_status: str
    matches: List[StudentRecommendationMatch] = Field(default_factory=list)
    recorded_interests: List[StudentInterestRecord] = Field(default_factory=list)
    model: Optional[str] = None
    analyzed_at: Optional[datetime] = None
    disclaimer: str = (
        "AI recommendations are advisory only. Student engagement requires "
        "faculty mentorship approval and institutional verification."
    )


class FacultyInterestCreate(BaseModel):
    """
    Payload to record faculty recommendation or interest.
    """
    faculty_id: str
    remarks: str = Field(..., min_length=3, max_length=1000)


class FacultyInterestActionResponse(BaseModel):
    status: str = "success"
    action_type: str
    track_id: str
    faculty_id: str
    faculty_name: str
    recorded_by: str
    remarks: str
    created_at: datetime
    disclaimer: str = (
        "AI recommendations are advisory only. Academic collaboration requires "
        "official administrative approval and institutional consent."
    )


class StudentInterestCreate(BaseModel):
    """
    Payload to record student recommendation or interest.
    """
    student_id: str
    remarks: str = Field(..., min_length=3, max_length=1000)


class StudentInterestActionResponse(BaseModel):
    status: str = "success"
    action_type: str
    track_id: str
    student_id: str
    student_name: str
    recorded_by: str
    remarks: str
    created_at: datetime
    disclaimer: str = (
        "AI recommendations are advisory only. Student engagement requires "
        "faculty mentorship approval and institutional verification."
    )


class FacultyAssignmentItem(BaseModel):
    """
    Live assignment representation connecting a problem/project to a faculty member.
    """
    id: int
    track_id: str
    problem_title: str
    category: str
    district: str
    locality: str
    location: str
    affected_people: int = 0
    priority: str = "Medium"
    verification_status: str = "Verified"
    assigned_faculty_id: Optional[str] = None
    assigned_faculty_name: str
    faculty_department: str
    faculty_expertise: List[str] = Field(default_factory=list)
    faculty_email: Optional[str] = None
    faculty_institution_id: Optional[str] = None
    faculty_institution_name: Optional[str] = None
    assignment_date: Optional[datetime] = None
    assignment_status: str = "In Progress"
    current_project_stage: str = "Problem Analysis"
    overall_progress: int = 45
    solution_title: Optional[str] = None
    remarks: Optional[str] = None


class FacultyRegistryItem(BaseModel):
    """
    Detailed profile item for a registered HEI faculty member.
    """
    faculty_id: str
    name: str
    institution_id: str
    institution_name: str
    department: str
    designation: Optional[str] = "Associate Professor"
    skills: List[str] = Field(default_factory=list)
    technical_domains: List[str] = Field(default_factory=list)
    research_expertise: List[str] = Field(default_factory=list)
    project_experience: str = "high"
    availability: str = "available"
    current_workload: int = 1
    district: str = "Ranchi"
    state: str = "Jharkhand"
    verification_status: str = "verified"
    contact_email: Optional[str] = None
    associated_user_email: Optional[str] = None
    active_assignments_count: int = 0
    assigned_problem_track_ids: List[str] = Field(default_factory=list)


class FacultyAssignmentAssignRequest(BaseModel):
    """
    Payload to assign or reassign a verified problem report to a faculty mentor.
    """
    faculty_id: str
    remarks: Optional[str] = "Assigned via University Faculty Portal"
    project_stage: Optional[str] = None


class FacultyAssignmentActionResponse(BaseModel):
    status: str = "success"
    message: str
    track_id: str
    assignment: Optional[FacultyAssignmentItem] = None

