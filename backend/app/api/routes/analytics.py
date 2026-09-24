from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.report import Report
from app.schemas.analytics import (
    AnalyticsSummary,
    CategoryDistribution,
    DistrictDistribution,
    ResolutionPerformance,
    StatusDistribution,
    TrendDataPoint,
    UrgencyDistribution,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/summary",
    response_model=AnalyticsSummary,
    summary="Get overall platform report summary metrics",
)
def get_analytics_summary(
    district: Optional[str] = Query(None, description="Optional district filter"),
    db: Session = Depends(get_db),
) -> AnalyticsSummary:
    query = db.query(Report).filter(Report.is_active == True)
    if district:
        query = query.filter(func.lower(Report.district) == district.strip().lower())

    total = query.count()
    open_count = query.filter(func.lower(Report.status) == "open").count()
    in_progress_count = query.filter(func.lower(Report.status) == "in progress").count()
    resolved_count = query.filter(func.lower(Report.status) == "resolved").count()
    rejected_count = query.filter(func.lower(Report.status) == "rejected").count()

    resolution_rate = round((resolved_count / total * 100.0), 2) if total > 0 else 0.0

    # Calculate average resolution time using real resolved_at
    resolved_reports = (
        query.filter(
            Report.resolved_at != None,
            func.lower(Report.status) == "resolved",
        ).all()
    )

    avg_hours = None
    if resolved_reports:
        total_seconds = 0.0
        for r in resolved_reports:
            diff = (r.resolved_at - r.created_at).total_seconds()
            total_seconds += max(diff, 0.0)
        avg_hours = round((total_seconds / len(resolved_reports)) / 3600.0, 1)

    districts_count = query.with_entities(Report.district).distinct().count()

    return AnalyticsSummary(
        total_reports=total,
        open_reports=open_count,
        in_progress_reports=in_progress_count,
        resolved_reports=resolved_count,
        rejected_reports=rejected_count,
        resolution_rate_percent=resolution_rate,
        avg_resolution_hours=avg_hours,
        districts_covered=districts_count,
    )


@router.get(
    "/status",
    response_model=List[StatusDistribution],
    summary="Get status distribution counts and percentages",
)
def get_status_distribution(
    district: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> List[StatusDistribution]:
    query = db.query(Report.status, func.count(Report.id).label("count")).filter(Report.is_active == True)
    if district:
        query = query.filter(func.lower(Report.district) == district.strip().lower())

    results = query.group_by(Report.status).all()
    total = sum(r[1] for r in results) if results else 0

    return [
        StatusDistribution(
            status=r[0],
            count=r[1],
            percentage=round((r[1] / total * 100.0), 1) if total > 0 else 0.0,
        )
        for r in results
    ]


@router.get(
    "/categories",
    response_model=List[CategoryDistribution],
    summary="Get category distribution counts and percentages",
)
def get_category_distribution(
    district: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> List[CategoryDistribution]:
    query = db.query(Report.category, func.count(Report.id).label("count")).filter(Report.is_active == True)
    if district:
        query = query.filter(func.lower(Report.district) == district.strip().lower())

    results = query.group_by(Report.category).all()
    total = sum(r[1] for r in results) if results else 0

    return [
        CategoryDistribution(
            category=r[0],
            count=r[1],
            percentage=round((r[1] / total * 100.0), 1) if total > 0 else 0.0,
        )
        for r in results
    ]


@router.get(
    "/districts",
    response_model=List[DistrictDistribution],
    summary="Get district problem density and resolution counts",
)
def get_district_distribution(db: Session = Depends(get_db)) -> List[DistrictDistribution]:
    reports = db.query(Report.district, Report.status).filter(Report.is_active == True).all()
    district_map = {}
    for d, s in reports:
        if d not in district_map:
            district_map[d] = {"count": 0, "resolved": 0}
        district_map[d]["count"] += 1
        if s.lower() == "resolved":
            district_map[d]["resolved"] += 1

    return [
        DistrictDistribution(
            district=d,
            count=data["count"],
            resolved_count=data["resolved"],
        )
        for d, data in sorted(district_map.items(), key=lambda x: x[1]["count"], reverse=True)
    ]


@router.get(
    "/urgency",
    response_model=List[UrgencyDistribution],
    summary="Get report count by priority / urgency",
)
def get_urgency_distribution(
    district: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> List[UrgencyDistribution]:
    query = db.query(Report.priority, func.count(Report.id).label("count")).filter(Report.is_active == True)
    if district:
        query = query.filter(func.lower(Report.district) == district.strip().lower())

    results = query.group_by(Report.priority).all()
    return [UrgencyDistribution(priority=r[0], count=r[1]) for r in results]


@router.get(
    "/trends",
    response_model=List[TrendDataPoint],
    summary="Get report creation and resolution trends over time",
)
def get_trends(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
) -> List[TrendDataPoint]:
    reports = db.query(Report.created_at, Report.status).filter(Report.is_active == True).order_by(Report.created_at.asc()).all()
    date_map = {}
    for r in reports:
        date_str = r[0].strftime("%Y-%m-%d")
        if date_str not in date_map:
            date_map[date_str] = {"count": 0, "resolved": 0}
        date_map[date_str]["count"] += 1
        if r[1].lower() == "resolved":
            date_map[date_str]["resolved"] += 1

    return [
        TrendDataPoint(
            date=d,
            count=data["count"],
            resolved_count=data["resolved"],
        )
        for d, data in sorted(date_map.items())
    ]


from app.schemas.project_analytics_schema import (
    ImpactSummaryResponse,
    ImpactTrendsResponse,
    DistrictImpactResponse,
    CategoryImpactResponse,
    ResolutionPerformanceResponse,
)
from app.services.project_analytics_service import (
    get_aggregate_impact_summary,
    get_aggregate_impact_trends,
    get_aggregate_district_impact,
    get_aggregate_category_impact,
    get_aggregate_resolution_performance,
)


@router.get(
    "/resolution-performance",
    response_model=ResolutionPerformance,
    summary="Get real turnaround metrics based on resolved_at timestamps",
)
def get_resolution_performance(db: Session = Depends(get_db)) -> ResolutionPerformance:
    resolved = (
        db.query(Report)
        .filter(Report.is_active == True, Report.resolved_at != None, func.lower(Report.status) == "resolved")
        .all()
    )

    agg = get_aggregate_resolution_performance(db)

    if not resolved:
        return ResolutionPerformance(
            total_resolved=0,
            avg_days_to_resolve=0.0,
            median_days_to_resolve=0.0,
            target_compliance_percent=100.0,
            overall_resolution_rate_percentage=0.0,
            by_category=[c.model_dump() for c in agg.by_category],
            by_district=[d.model_dump() for d in agg.by_district],
            insufficient_data=True,
        )

    days_list = []
    compliance_count = 0
    for r in resolved:
        diff_days = (r.resolved_at - r.created_at).total_seconds() / 86400.0
        diff_days = max(diff_days, 0.0)
        days_list.append(diff_days)
        # Target SLA: 14 days
        if diff_days <= 14.0:
            compliance_count += 1

    days_list.sort()
    avg_days = sum(days_list) / len(days_list)
    mid = len(days_list) // 2
    median_days = days_list[mid] if len(days_list) % 2 != 0 else (days_list[mid - 1] + days_list[mid]) / 2.0
    compliance_rate = (compliance_count / len(days_list)) * 100.0

    return ResolutionPerformance(
        total_resolved=len(resolved),
        avg_days_to_resolve=round(avg_days, 1),
        median_days_to_resolve=round(median_days, 1),
        target_compliance_percent=round(compliance_rate, 1),
        overall_resolution_rate_percentage=agg.overall_resolution_rate_percentage,
        by_category=[c.model_dump() for c in agg.by_category],
        by_district=[d.model_dump() for d in agg.by_district],
        insufficient_data=False,
    )


@router.get(
    "/impact-summary",
    response_model=ImpactSummaryResponse,
    summary="Get platform-wide aggregate project feasibility and impact metrics",
)
def get_impact_summary(db: Session = Depends(get_db)) -> ImpactSummaryResponse:
    return get_aggregate_impact_summary(db)


@router.get(
    "/impact-trends",
    response_model=ImpactTrendsResponse,
    summary="Get periodic impact trends and beneficiary reach",
)
def get_impact_trends(db: Session = Depends(get_db)) -> ImpactTrendsResponse:
    return get_aggregate_impact_trends(db)


@router.get(
    "/district-impact",
    response_model=DistrictImpactResponse,
    summary="Get geographic impact scores and beneficiaries by district",
)
def get_district_impact(db: Session = Depends(get_db)) -> DistrictImpactResponse:
    return get_aggregate_district_impact(db)


@router.get(
    "/category-impact",
    response_model=CategoryImpactResponse,
    summary="Get category impact scores, duration, and beneficiaries",
)
def get_category_impact(db: Session = Depends(get_db)) -> CategoryImpactResponse:
    return get_aggregate_category_impact(db)

