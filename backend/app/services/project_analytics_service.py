import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.report import Report
from app.schemas.project_analytics_schema import (
    ScoreDetail,
    ProjectAnalyticsDetail,
    ProjectAnalyticsResponse,
    CitizenProjectAnalyticsResponse,
    ImpactSummaryResponse,
    ImpactTrendItem,
    ImpactTrendsResponse,
    DistrictImpactItem,
    DistrictImpactResponse,
    CategoryImpactItem,
    CategoryImpactResponse,
    ResolutionPerformanceCategoryItem,
    ResolutionPerformanceDistrictItem,
    ResolutionPerformanceResponse,
)

logger = logging.getLogger("project_analytics_service")

# -------------------------------------------------------------------------
# Score Threshold Mapping
# -------------------------------------------------------------------------
def score_to_level(score: float) -> str:
    """
    Standard 4-tier level mapping:
    - 85-100: excellent
    - 70-84:  strong
    - 45-69:  moderate
    - 0-44:   low
    """
    if score >= 85.0:
        return "excellent"
    elif score >= 70.0:
        return "strong"
    elif score >= 45.0:
        return "moderate"
    else:
        return "low"


# -------------------------------------------------------------------------
# Scoring Calculations
# -------------------------------------------------------------------------
def calculate_feasibility_score(report: Report) -> ScoreDetail:
    """
    Feasibility Score (0-100):
    - Capability coverage (40%): derived from capability-gap analysis overall coverage
    - HEI match quality (25%): best HEI recommendation score
    - Partner support availability (20%): best partner match score
    - Complexity/Budget scale sanity (15%): inversely proportional to complexity
    """
    # 1. Capability Coverage (40%)
    gap_analysis = report.ai_capability_gap_analysis or {}
    coverage_pct = report.ai_capability_gap_score
    if coverage_pct is None:
        coverage_pct = gap_analysis.get("overall_coverage_percentage", 65.0)
    coverage_score = (min(100.0, max(0.0, float(coverage_pct))) / 100.0) * 40.0

    # 2. HEI Match (25%)
    hei_matches = report.ai_hei_matches or []
    top_hei_score = 0.0
    if hei_matches and isinstance(hei_matches, list):
        top_hei_score = float(hei_matches[0].get("score", 0.0))
    hei_component = (min(100.0, max(0.0, top_hei_score)) / 100.0) * 25.0

    # 3. Partner Match (20%)
    partner_matches = report.ai_partner_matches or []
    top_partner_score = 0.0
    if partner_matches and isinstance(partner_matches, list):
        top_partner_score = float(partner_matches[0].get("score", 0.0))
    partner_component = (min(100.0, max(0.0, top_partner_score)) / 100.0) * 20.0

    # 4. Complexity & Execution feasibility (15%)
    # Baseline from urgency and category
    complexity_score = 12.0  # default moderate
    if report.priority in ["Low", "Medium"]:
        complexity_score = 14.0
    elif report.priority == "Critical":
        complexity_score = 8.0

    total_score = round(coverage_score + hei_component + partner_component + complexity_score, 1)
    total_score = min(100.0, max(0.0, total_score))
    level = score_to_level(total_score)

    explanation = (
        f"Feasibility rated as {level} ({total_score}/100) based on {round(coverage_pct, 1)}% capability coverage, "
        f"top HEI match score of {round(top_hei_score, 1)}, and partner support readiness of {round(top_partner_score, 1)}."
    )

    breakdown = {
        "capability_coverage_component": round(coverage_score, 1),
        "hei_match_component": round(hei_component, 1),
        "partner_support_component": round(partner_component, 1),
        "complexity_feasibility_component": round(complexity_score, 1),
        "max_possible": 100.0,
    }

    return ScoreDetail(
        score=total_score,
        level=level,
        explanation=explanation,
        breakdown=breakdown,
    )


def calculate_impact_score(report: Report) -> ScoreDetail:
    """
    Impact Potential Score (0-100):
    - Priority / Urgency tier (30%): Critical=30, High=22, Medium=15, Low=8
    - Beneficiary reach tier (30%): Estimated citizen population affected
    - Category criticality (20%): Public Health/Sanitation/Water=20, Roads/Infra=16, Other=12
    - Systemic / Cluster indicator (20%): Duplicate or similar problem frequency
    """
    # 1. Priority tier (30%)
    prio = (report.ai_priority or report.priority or "Medium").capitalize()
    prio_map = {"Critical": 30.0, "High": 23.0, "Medium": 15.0, "Low": 8.0}
    prio_score = prio_map.get(prio, 15.0)

    # 2. Beneficiary Reach (30%)
    # Population density tier by district
    high_density_districts = ["Ranchi", "Dhanbad", "East Singhbhum", "Bokaro", "Hazaribagh"]
    if report.district in high_density_districts:
        reach_score = 26.0
    else:
        reach_score = 18.0

    # 3. Category Criticality (20%)
    cat = (report.ai_category or report.category or "").lower()
    if any(k in cat for k in ["water", "sanitation", "health", "drainage"]):
        cat_score = 20.0
    elif any(k in cat for k in ["road", "transport", "electric", "power", "bridge"]):
        cat_score = 16.0
    elif any(k in cat for k in ["waste", "environment", "education"]):
        cat_score = 14.0
    else:
        cat_score = 12.0

    # 4. Cluster / Duplicate Indicator (20%)
    duplicates = report.ai_duplicate_candidates or []
    similar = report.ai_similarity_matches or []
    cluster_count = len(duplicates) + len(similar)
    if cluster_count >= 3:
        cluster_score = 20.0
    elif cluster_count >= 1:
        cluster_score = 15.0
    else:
        cluster_score = 10.0

    total_score = round(prio_score + reach_score + cat_score + cluster_score, 1)
    total_score = min(100.0, max(0.0, total_score))
    level = score_to_level(total_score)

    explanation = (
        f"Civic impact potential rated as {level} ({total_score}/100) reflecting {prio} priority, "
        f"service footprint in {report.district}, and public criticality of {report.category}."
    )

    breakdown = {
        "priority_urgency_component": round(prio_score, 1),
        "beneficiary_reach_component": round(reach_score, 1),
        "category_criticality_component": round(cat_score, 1),
        "cluster_recurrence_component": round(cluster_score, 1),
        "max_possible": 100.0,
    }

    return ScoreDetail(
        score=total_score,
        level=level,
        explanation=explanation,
        breakdown=breakdown,
    )


def calculate_readiness_score(report: Report) -> ScoreDetail:
    """
    Readiness Score (0-100):
    - Available skills & tools (35%): proportion of required skills available
    - Institutional & partner alignment (35%): top HEI + partner combined alignment
    - Context clarity & site detail (30%): completeness of report inputs
    """
    # 1. Available Skills & Tools (35%)
    gap_data = report.ai_capability_gap_analysis or {}
    available_skills = gap_data.get("available_skills", [])
    missing_skills = gap_data.get("missing_skills", [])
    total_skills = len(available_skills) + len(missing_skills)
    if total_skills > 0:
        skill_ratio = len(available_skills) / total_skills
    else:
        skill_ratio = 0.5
    skills_score = skill_ratio * 35.0

    # 2. Institutional Alignment (35%)
    hei_matches = report.ai_hei_matches or []
    partner_matches = report.ai_partner_matches or []
    has_strong_hei = any(m.get("score", 0) >= 70 for m in hei_matches) if isinstance(hei_matches, list) else False
    has_partner = len(partner_matches) > 0 if isinstance(partner_matches, list) else False

    alignment_score = 15.0
    if has_strong_hei:
        alignment_score += 12.0
    if has_partner:
        alignment_score += 8.0

    # 3. Context & Site Detail (30%)
    detail_score = 0.0
    if report.problem_title and len(report.problem_title) >= 10:
        detail_score += 8.0
    if report.context_and_desired_outcome and len(report.context_and_desired_outcome) >= 30:
        detail_score += 10.0
    if report.address_or_landmark:
        detail_score += 6.0
    if report.latitude is not None and report.longitude is not None:
        detail_score += 6.0
    detail_score = min(30.0, detail_score)

    total_score = round(skills_score + alignment_score + detail_score, 1)
    total_score = min(100.0, max(0.0, total_score))
    level = score_to_level(total_score)

    explanation = (
        f"Readiness score is {level} ({total_score}/100) with {len(available_skills)} confirmed skill areas, "
        f"institutional alignment of {round(alignment_score, 1)}/35, and site detail completeness of {round(detail_score, 1)}/30."
    )

    breakdown = {
        "skills_tools_component": round(skills_score, 1),
        "institutional_alignment_component": round(alignment_score, 1),
        "context_clarity_component": round(detail_score, 1),
        "max_possible": 100.0,
    }

    return ScoreDetail(
        score=total_score,
        level=level,
        explanation=explanation,
        breakdown=breakdown,
    )


def calculate_risk_score(report: Report) -> ScoreDetail:
    """
    Risk Score (0-100):
    - Capability-gap severity (35%): critical=35, high=28, moderate=18, minimal=5
    - Budget & resource deficit (25%): missing materials/funding without confirmed partner
    - Technical & operational complexity (25%): high urgency or multi-disciplinary requirement
    - Geographic & verification factors (15%): remote location or unverified partner support
    """
    # 1. Capability gap severity (35%)
    severity = (report.ai_capability_gap_severity or "moderate").lower()
    sev_map = {"critical": 35.0, "high": 28.0, "moderate": 18.0, "minimal": 6.0}
    severity_score = sev_map.get(severity, 18.0)

    # 2. Budget & resource deficit (25%)
    gap_data = report.ai_capability_gap_analysis or {}
    missing_equipment = gap_data.get("missing_equipment", [])
    missing_materials = gap_data.get("missing_materials", [])
    missing_budget = gap_data.get("missing_budget", False)
    partner_matches = report.ai_partner_matches or []

    deficit_score = 10.0
    if missing_equipment or missing_materials:
        deficit_score += 8.0
    if missing_budget:
        deficit_score += 7.0
    # Relieved if verified or strong partner available
    if partner_matches and isinstance(partner_matches, list) and len(partner_matches) > 0:
        deficit_score = max(5.0, deficit_score - 8.0)

    # 3. Technical Complexity (25%)
    prio = (report.ai_priority or report.priority or "Medium").capitalize()
    if prio == "Critical":
        complexity_risk = 22.0
    elif prio == "High":
        complexity_risk = 16.0
    else:
        complexity_risk = 10.0

    # 4. Geographic & verification risk (15%)
    # Remote districts
    remote_districts = ["Simdega", "Khunti", "Pakur", "Sahebganj", "Latehar", "Garhwa"]
    if report.district in remote_districts:
        geo_risk = 12.0
    else:
        geo_risk = 5.0

    total_score = round(severity_score + deficit_score + complexity_risk + geo_risk, 1)
    total_score = min(100.0, max(0.0, total_score))
    level = score_to_level(total_score)

    explanation = (
        f"Implementation risk evaluated as {level} ({total_score}/100) reflecting {severity} capability gaps, "
        f"resource deficit risk of {round(deficit_score, 1)}/25, and operational complexity risk of {round(complexity_risk, 1)}/25."
    )

    breakdown = {
        "capability_gap_severity_component": round(severity_score, 1),
        "resource_deficit_component": round(deficit_score, 1),
        "technical_complexity_component": round(complexity_risk, 1),
        "geographic_logistics_component": round(geo_risk, 1),
        "max_possible": 100.0,
    }

    return ScoreDetail(
        score=total_score,
        level=level,
        explanation=explanation,
        breakdown=breakdown,
    )


def calculate_confidence_score(report: Report) -> ScoreDetail:
    """
    Confidence Score (0-100):
    Composite of extraction confidence, match confidence, and input completeness.
    """
    # 1. Extraction confidence (35%)
    cap_conf = report.ai_capability_confidence or 0.70
    extraction_score = float(cap_conf) * 35.0

    # 2. Matching confidence (35%)
    hei_matches = report.ai_hei_matches or []
    top_hei_conf = 0.65
    if hei_matches and isinstance(hei_matches, list):
        top_hei_conf = float(hei_matches[0].get("confidence", 0.70))
    match_score = top_hei_conf * 35.0

    # 3. Completeness (30%)
    completeness = 25.0
    if report.context_and_desired_outcome and len(report.context_and_desired_outcome) > 50:
        completeness += 5.0

    total_score = round(extraction_score + match_score + completeness, 1)
    total_score = min(100.0, max(0.0, total_score))
    level = score_to_level(total_score)

    explanation = (
        f"Analytics confidence rated as {level} ({total_score}/100) backed by {round(cap_conf * 100, 1)}% capability "
        f"extraction confidence and {round(top_hei_conf * 100, 1)}% HEI match confidence."
    )

    breakdown = {
        "capability_extraction_confidence": round(extraction_score, 1),
        "matching_pipeline_confidence": round(match_score, 1),
        "data_completeness_component": round(completeness, 1),
        "max_possible": 100.0,
    }

    return ScoreDetail(
        score=total_score,
        level=level,
        explanation=explanation,
        breakdown=breakdown,
    )


# -------------------------------------------------------------------------
# Quantitative Heuristics & Summaries
# -------------------------------------------------------------------------
def determine_complexity(report: Report) -> str:
    """Determine implementation complexity: low, moderate, high, extreme."""
    prio = (report.ai_priority or report.priority or "Medium").capitalize()
    gap_analysis = report.ai_capability_gap_analysis or {}
    missing_equipment = gap_analysis.get("missing_equipment", [])
    missing_materials = gap_analysis.get("missing_materials", [])

    if prio == "Critical" and (len(missing_equipment) >= 2 or len(missing_materials) >= 2):
        return "extreme"
    elif prio in ["Critical", "High"] or len(missing_equipment) >= 1:
        return "high"
    elif prio == "Low":
        return "low"
    else:
        return "moderate"


def estimate_duration_weeks(complexity: str) -> Dict[str, Any]:
    """Provide estimated timeline with explicit estimation metadata."""
    if complexity == "extreme":
        return {
            "min_weeks": 16,
            "max_weeks": 36,
            "is_estimate": True,
            "basis": "Multi-institution engineering intervention requiring structural procurement and heavy machinery.",
        }
    elif complexity == "high":
        return {
            "min_weeks": 8,
            "max_weeks": 16,
            "is_estimate": True,
            "basis": "Standard engineering resolution with specialized equipment, laboratory tests, or partner mobilization.",
        }
    elif complexity == "low":
        return {
            "min_weeks": 1,
            "max_weeks": 3,
            "is_estimate": True,
            "basis": "Localized maintenance or minor remediation with readily available resources.",
        }
    else:
        return {
            "min_weeks": 3,
            "max_weeks": 8,
            "is_estimate": True,
            "basis": "Moderate civic engineering project requiring student team deployment and supervisor guidance.",
        }


def estimate_budget_inr(report: Report, complexity: str) -> Dict[str, Any]:
    """Provide estimated budget range in INR with explicit estimation metadata."""
    cat = (report.ai_category or report.category or "").lower()
    
    if complexity == "extreme":
        min_b, max_b = 250000.0, 1200000.0
    elif complexity == "high":
        min_b, max_b = 80000.0, 350000.0
    elif complexity == "low":
        min_b, max_b = 5000.0, 25000.0
    else:
        if "road" in cat or "transport" in cat:
            min_b, max_b = 40000.0, 150000.0
        elif "water" in cat or "drainage" in cat:
            min_b, max_b = 30000.0, 120000.0
        else:
            min_b, max_b = 20000.0, 80000.0

    return {
        "min_budget": min_b,
        "max_budget": max_b,
        "currency": "INR",
        "is_estimate": True,
        "basis": f"Material benchmarks, tooling mobilization, and operational costs for {complexity} complexity in {report.district}.",
    }


def estimate_beneficiary_reach(report: Report) -> Dict[str, Any]:
    """Estimate direct and indirect citizens impacted."""
    high_density_districts = ["Ranchi", "Dhanbad", "East Singhbhum", "Bokaro"]
    mid_density_districts = ["Hazaribagh", "Deoghar", "Giridih", "Ramgarh"]
    
    cat = (report.ai_category or report.category or "").lower()
    is_wide_impact = any(k in cat for k in ["water", "road", "drainage", "health", "electricity"])

    if report.district in high_density_districts:
        min_r = 1500 if is_wide_impact else 500
        max_r = 8500 if is_wide_impact else 3000
    elif report.district in mid_density_districts:
        min_r = 800 if is_wide_impact else 300
        max_r = 4500 if is_wide_impact else 1800
    else:
        min_r = 300 if is_wide_impact else 100
        max_r = 2000 if is_wide_impact else 800

    return {
        "min_reach": min_r,
        "max_reach": max_r,
        "reach_type": "direct_citizens",
        "is_estimate": True,
        "basis": f"Census population density and ward infrastructure catchments for {report.district}.",
    }


def extract_risk_factors(report: Report, complexity: str) -> List[Dict[str, Any]]:
    """Extract granular risk factors and recommended mitigation."""
    risks = []
    gap_data = report.ai_capability_gap_analysis or {}
    
    if gap_data.get("missing_equipment"):
        risks.append({
            "risk": "Equipment Access Bottleneck",
            "severity": "high",
            "mitigation": f"Partner matching recommended for missing equipment: {', '.join(gap_data.get('missing_equipment', [])[:3])}."
        })
    if gap_data.get("missing_materials"):
        risks.append({
            "risk": "Material Procurement Delay",
            "severity": "moderate",
            "mitigation": "Initiate CSR sponsorship or local supplier quotation early."
        })
    if complexity in ["high", "extreme"]:
        risks.append({
            "risk": "Site Safety & Operational Supervision",
            "severity": "high",
            "mitigation": "Ensure certified faculty or industrial supervisor conducts mandatory pre-execution safety review."
        })
    if not risks:
        risks.append({
            "risk": "Minor Execution Delay",
            "severity": "low",
            "mitigation": "Standard project milestones and bi-weekly milestone check-ins."
        })
    return risks


def extract_dependency_factors(report: Report) -> List[str]:
    """Identify project pre-requisite dependencies."""
    deps = []
    cat = (report.ai_category or report.category or "").lower()
    
    if "road" in cat or "bridge" in cat or "culvert" in cat:
        deps.append("Right-of-way permission from Urban Local Body / Rural Works Department")
        deps.append("Weather window clearance (dry season for asphalt / concrete work)")
    elif "water" in cat or "drainage" in cat:
        deps.append("Municipal drainage network mapping clearance")
        deps.append("Water quality baseline testing before remediation")
    elif "electric" in cat or "power" in cat:
        deps.append("Electricity distribution company (JBVNL) line shutdown clearance")
        deps.append("Certified high-voltage protective equipment protocol")
    else:
        deps.append("Local administrative authorization and resident notification")

    deps.append("HEI Faculty supervisor sign-off on technical execution plan")
    return deps


def extract_institutional_support(report: Report) -> List[str]:
    """HEI and academic requirements."""
    hei_matches = report.ai_hei_matches or []
    top_hei_name = hei_matches[0].get("hei_name", "Local Engineering HEI") if hei_matches and isinstance(hei_matches, list) else "Affiliated Technical Institute"
    return [
        f"Technical laboratory testing & design validation from {top_hei_name}",
        "Faculty project lead assignment for academic credit supervision",
        "Student engineering team deployment (3-6 student cohorts)",
    ]


def extract_partner_support(report: Report) -> List[str]:
    """Industry and CSR partner requirements."""
    partner_matches = report.ai_partner_matches or []
    top_partner = partner_matches[0].get("organization_name", "Industry/CSR Partner") if partner_matches and isinstance(partner_matches, list) else "CSR/Industry Partner"
    gap_data = report.ai_capability_gap_analysis or {}
    missing_equipment = gap_data.get("missing_equipment", [])

    supports = [
        f"Co-funding or material sponsorship through {top_partner}",
    ]
    if missing_equipment:
        supports.append(f"Machinery and tool loan: {', '.join(missing_equipment[:2])}")
    supports.append("On-site industrial mentorship and quality assurance review")
    return supports


def generate_next_steps(report: Report, complexity: str) -> List[str]:
    """Actionable advisory next steps for officials and HEI leads."""
    return [
        "Review and approve HEI faculty supervisor recommendation.",
        "Formalize partner support proposal for missing equipment and funding.",
        "Issue municipal clearance or right-of-way permit for site inspection.",
        "Establish milestone tracking schedule with 2-week interim deliverables.",
    ]


# -------------------------------------------------------------------------
# Core Service Entrypoint
# -------------------------------------------------------------------------
def generate_project_analytics(report: Report) -> ProjectAnalyticsDetail:
    """
    Synthesizes all 10 preceding AI modules into explainable project analytics.
    Zero-mutation: purely computes and formats analytics detail.
    """
    feasibility = calculate_feasibility_score(report)
    impact = calculate_impact_score(report)
    readiness = calculate_readiness_score(report)
    risk = calculate_risk_score(report)
    confidence = calculate_confidence_score(report)

    complexity = determine_complexity(report)
    duration = estimate_duration_weeks(complexity)
    budget = estimate_budget_inr(report, complexity)
    beneficiaries = estimate_beneficiary_reach(report)

    # Summaries
    feasibility_summary = (
        f"Project feasibility is rated {feasibility.level.upper()} ({feasibility.score}/100) with "
        f"{complexity} implementation complexity. Estimated execution timeline is {duration['min_weeks']}–{duration['max_weeks']} weeks."
    )
    social_impact_summary = (
        f"Implementation will directly benefit an estimated {beneficiaries['min_reach']} to {beneficiaries['max_reach']} citizens "
        f"in {report.district}, mitigating public safety hazards and restoring essential community infrastructure."
    )

    gap_data = report.ai_capability_gap_analysis or {}
    capability_coverage = {
        "overall_coverage_percentage": report.ai_capability_gap_score or gap_data.get("overall_coverage_percentage", 70.0),
        "gap_severity": report.ai_capability_gap_severity or gap_data.get("gap_severity", "moderate"),
        "available_skills": gap_data.get("available_skills", []),
        "missing_skills": gap_data.get("missing_skills", []),
        "missing_equipment": gap_data.get("missing_equipment", []),
    }

    risk_factors = extract_risk_factors(report, complexity)
    dependency_factors = extract_dependency_factors(report)
    institutional_support = extract_institutional_support(report)
    partner_support = extract_partner_support(report)
    next_steps = generate_next_steps(report, complexity)

    transparency = {
        "is_estimate": True,
        "input_factors": [
            "Category and problem context",
            "AI Capability extraction outputs",
            "HEI and faculty match rankings",
            "Capability gap severity analysis",
            "CSR & industry partner availability",
            "District demographic benchmarks",
        ],
        "assumptions": [
            "Normal weather and operational conditions without prolonged seasonal interruption.",
            "Timely institutional clearance from Urban Local Body or relevant administrative department.",
            "Standard civic material cost indices in the state of Jharkhand.",
        ],
        "calculation_explanation": (
            "Composite scoring using weighted rubrics across Feasibility (40% coverage, 25% HEI, 20% Partner, 15% Complexity), "
            "Impact (30% Priority, 30% Reach, 20% Criticality, 20% Cluster), Readiness (35% Skills, 35% Alignment, 30% Context), "
            "and Risk (35% Gaps, 25% Deficit, 25% Complexity, 15% Geography)."
        ),
        "data_limitations": [
            "Beneficiary reach is estimated from ward-level population approximations.",
            "Budgets are indicative estimates and require detailed contractor/supplier quotation.",
        ],
        "advisory_disclaimer": "Advisory AI estimate for decision-support only. Does not modify official report status, priority, or assignment.",
    }

    return ProjectAnalyticsDetail(
        feasibility_score=feasibility,
        impact_score=impact,
        readiness_score=readiness,
        risk_score=risk,
        confidence_score=confidence,
        feasibility_summary=feasibility_summary,
        implementation_complexity=complexity,
        estimated_duration_weeks=duration,
        estimated_budget_inr=budget,
        beneficiary_reach=beneficiaries,
        social_impact_summary=social_impact_summary,
        risk_factors=risk_factors,
        dependency_factors=dependency_factors,
        required_institutional_support=institutional_support,
        required_partner_support=partner_support,
        capability_coverage=capability_coverage,
        recommended_next_steps=next_steps,
        transparency=transparency,
    )


def analyze_and_store_report_project_analytics(db: Session, report: Report) -> Dict[str, Any]:
    """
    Generates and stores project analytics for a report.
    Adheres strictly to the Zero-Mutation Guarantee:
    Never mutates report.status, report.priority, or report.assigned_to.
    """
    detail = generate_project_analytics(report)
    dumped = detail.model_dump()

    report.ai_project_analytics = dumped
    report.ai_project_feasibility_score = detail.feasibility_score.score
    report.ai_project_impact_score = detail.impact_score.score
    report.ai_project_readiness_score = detail.readiness_score.score
    report.ai_project_risk_score = detail.risk_score.score
    report.ai_project_analytics_status = "completed"
    report.ai_project_analytics_model = "impactforge-analytics-v1"
    report.ai_project_analytics_analyzed_at = datetime.now(timezone.utc)

    db.add(report)
    db.commit()
    db.refresh(report)

    logger.info(
        f"Generated project analytics for report {report.track_id}: "
        f"feasibility={report.ai_project_feasibility_score}, impact={report.ai_project_impact_score}"
    )
    return dumped


def mask_project_analytics_for_citizen(report: Report, analytics_data: Dict[str, Any]) -> CitizenProjectAnalyticsResponse:
    """
    Creates a privacy-safe, civic-friendly subset of analytics for citizens.
    Omits sensitive partner pricing, private contact data, and internal risk flags.
    """
    analytics = analytics_data or {}
    feasibility_summary = analytics.get("feasibility_summary", "Community civic solution under technical assessment.")
    impact_info = analytics.get("impact_score", {})
    impact_level = impact_info.get("level", "moderate")

    duration = analytics.get("estimated_duration_weeks", {
        "min_weeks": 2, "max_weeks": 6, "is_estimate": True, "basis": "Civic engineering assessment"
    })
    reach = analytics.get("beneficiary_reach", {
        "min_reach": 100, "max_reach": 500, "reach_type": "direct_citizens", "is_estimate": True, "basis": "Locality estimates"
    })
    social_summary = analytics.get("social_impact_summary", "Resolution will enhance public safety and civic infrastructure.")
    next_steps = analytics.get("recommended_next_steps", ["Institutional coordination in progress."])

    return CitizenProjectAnalyticsResponse(
        track_id=report.track_id,
        problem_title=report.problem_title,
        feasibility_summary=feasibility_summary,
        impact_level=impact_level,
        estimated_duration_weeks=duration,
        beneficiary_reach=reach,
        social_impact_summary=social_summary,
        recommended_next_steps=next_steps,
        disclaimer="Advisory community impact projection for public awareness. Actual timelines depend on departmental approvals."
    )


# -------------------------------------------------------------------------
# Aggregate Analytics Calculations (Real Data Only)
# -------------------------------------------------------------------------
def get_aggregate_impact_summary(db: Session) -> ImpactSummaryResponse:
    """
    Platform-wide aggregate impact summary computed from database records.
    Never fabricates figures; flags insufficient_data if no records exist.
    """
    total_reports = db.query(Report).filter(Report.is_active == True).count()
    if total_reports == 0:
        return ImpactSummaryResponse(
            total_reports=0,
            analyzed_reports=0,
            avg_feasibility_score=None,
            avg_impact_score=None,
            avg_readiness_score=None,
            avg_risk_score=None,
            total_estimated_beneficiaries=None,
            high_impact_count=0,
            critical_risk_count=0,
            insufficient_data=True,
        )

    analyzed_reports = db.query(Report).filter(Report.is_active == True, Report.ai_project_analytics_status == "completed").count()
    if analyzed_reports == 0:
        return ImpactSummaryResponse(
            total_reports=total_reports,
            analyzed_reports=0,
            avg_feasibility_score=None,
            avg_impact_score=None,
            avg_readiness_score=None,
            avg_risk_score=None,
            total_estimated_beneficiaries=None,
            high_impact_count=0,
            critical_risk_count=0,
            insufficient_data=True,
        )

    # Compute averages from real numeric columns
    avg_feasibility = db.query(func.avg(Report.ai_project_feasibility_score)).filter(Report.is_active == True, Report.ai_project_analytics_status == "completed").scalar()
    avg_impact = db.query(func.avg(Report.ai_project_impact_score)).filter(Report.is_active == True, Report.ai_project_analytics_status == "completed").scalar()
    avg_readiness = db.query(func.avg(Report.ai_project_readiness_score)).filter(Report.is_active == True, Report.ai_project_analytics_status == "completed").scalar()
    avg_risk = db.query(func.avg(Report.ai_project_risk_score)).filter(Report.is_active == True, Report.ai_project_analytics_status == "completed").scalar()

    high_impact_count = db.query(Report).filter(
        Report.is_active == True,
        Report.ai_project_analytics_status == "completed",
        Report.ai_project_impact_score >= 70.0
    ).count()

    critical_risk_count = db.query(Report).filter(
        Report.is_active == True,
        Report.ai_project_analytics_status == "completed",
        Report.ai_project_risk_score >= 70.0
    ).count()

    # Sum estimated beneficiaries across completed reports
    completed_reports = db.query(Report).filter(Report.is_active == True, Report.ai_project_analytics_status == "completed").all()
    total_beneficiaries = 0
    for r in completed_reports:
        an = r.ai_project_analytics or {}
        reach = an.get("beneficiary_reach", {})
        total_beneficiaries += int(reach.get("max_reach", 0))

    return ImpactSummaryResponse(
        total_reports=total_reports,
        analyzed_reports=analyzed_reports,
        avg_feasibility_score=round(float(avg_feasibility), 1) if avg_feasibility is not None else None,
        avg_impact_score=round(float(avg_impact), 1) if avg_impact is not None else None,
        avg_readiness_score=round(float(avg_readiness), 1) if avg_readiness is not None else None,
        avg_risk_score=round(float(avg_risk), 1) if avg_risk is not None else None,
        total_estimated_beneficiaries=total_beneficiaries if total_beneficiaries > 0 else None,
        high_impact_count=high_impact_count,
        critical_risk_count=critical_risk_count,
        insufficient_data=False,
    )


def get_aggregate_impact_trends(db: Session) -> ImpactTrendsResponse:
    """
    Computes time-series impact trends from created_at timestamps.
    """
    total_reports = db.query(Report).filter(Report.is_active == True).count()
    if total_reports == 0:
        return ImpactTrendsResponse(trends=[], insufficient_data=True)

    reports = db.query(Report).filter(Report.is_active == True).order_by(Report.created_at.asc()).all()
    period_map: Dict[str, List[Report]] = {}
    
    for r in reports:
        dt = r.created_at
        if dt:
            period_key = dt.strftime("%Y-%m")
        else:
            period_key = "Recent"
        period_map.setdefault(period_key, []).append(r)

    trend_items = []
    for period, r_list in period_map.items():
        count = len(r_list)
        impact_scores = [r.ai_project_impact_score for r in r_list if r.ai_project_impact_score is not None]
        feasibility_scores = [r.ai_project_feasibility_score for r in r_list if r.ai_project_feasibility_score is not None]
        
        avg_imp = round(sum(impact_scores) / len(impact_scores), 1) if impact_scores else None
        avg_feas = round(sum(feasibility_scores) / len(feasibility_scores), 1) if feasibility_scores else None
        
        beneficiaries = 0
        for r in r_list:
            reach = (r.ai_project_analytics or {}).get("beneficiary_reach", {})
            beneficiaries += int(reach.get("max_reach", 0))

        trend_items.append(ImpactTrendItem(
            period=period,
            report_count=count,
            avg_impact_score=avg_imp,
            avg_feasibility_score=avg_feas,
            estimated_beneficiaries=beneficiaries,
        ))

    return ImpactTrendsResponse(trends=trend_items, insufficient_data=len(trend_items) == 0)


def get_aggregate_district_impact(db: Session) -> DistrictImpactResponse:
    """
    Aggregates impact and feasibility by Jharkhand district.
    """
    total_reports = db.query(Report).filter(Report.is_active == True).count()
    if total_reports == 0:
        return DistrictImpactResponse(districts=[], insufficient_data=True)

    districts = db.query(Report.district).filter(Report.is_active == True).distinct().all()
    district_items = []

    for (d_name,) in districts:
        if not d_name:
            continue
        d_reports = db.query(Report).filter(Report.is_active == True, Report.district == d_name).all()
        count = len(d_reports)
        
        impact_scores = [r.ai_project_impact_score for r in d_reports if r.ai_project_impact_score is not None]
        feasibility_scores = [r.ai_project_feasibility_score for r in d_reports if r.ai_project_feasibility_score is not None]
        
        avg_imp = round(sum(impact_scores) / len(impact_scores), 1) if impact_scores else None
        avg_feas = round(sum(feasibility_scores) / len(feasibility_scores), 1) if feasibility_scores else None

        beneficiaries = 0
        cat_counts: Dict[str, int] = {}
        for r in d_reports:
            cat_counts[r.category] = cat_counts.get(r.category, 0) + 1
            reach = (r.ai_project_analytics or {}).get("beneficiary_reach", {})
            beneficiaries += int(reach.get("max_reach", 0))

        top_cat = max(cat_counts, key=cat_counts.get) if cat_counts else None

        district_items.append(DistrictImpactItem(
            district=d_name,
            report_count=count,
            avg_impact_score=avg_imp,
            avg_feasibility_score=avg_feas,
            total_beneficiaries=beneficiaries,
            top_category=top_cat,
        ))

    # Sort by report count desc
    district_items.sort(key=lambda x: x.report_count, reverse=True)
    return DistrictImpactResponse(districts=district_items, insufficient_data=len(district_items) == 0)


def get_aggregate_category_impact(db: Session) -> CategoryImpactResponse:
    """
    Aggregates impact and feasibility by problem category.
    """
    total_reports = db.query(Report).filter(Report.is_active == True).count()
    if total_reports == 0:
        return CategoryImpactResponse(categories=[], insufficient_data=True)

    categories = db.query(Report.category).filter(Report.is_active == True).distinct().all()
    category_items = []

    for (cat_name,) in categories:
        if not cat_name:
            continue
        c_reports = db.query(Report).filter(Report.is_active == True, Report.category == cat_name).all()
        count = len(c_reports)
        
        impact_scores = [r.ai_project_impact_score for r in c_reports if r.ai_project_impact_score is not None]
        feasibility_scores = [r.ai_project_feasibility_score for r in c_reports if r.ai_project_feasibility_score is not None]
        
        avg_imp = round(sum(impact_scores) / len(impact_scores), 1) if impact_scores else None
        avg_feas = round(sum(feasibility_scores) / len(feasibility_scores), 1) if feasibility_scores else None

        beneficiaries = 0
        durations = []
        for r in c_reports:
            an = r.ai_project_analytics or {}
            reach = an.get("beneficiary_reach", {})
            beneficiaries += int(reach.get("max_reach", 0))
            dur = an.get("estimated_duration_weeks", {})
            if "max_weeks" in dur:
                durations.append(float(dur["max_weeks"]))

        avg_dur = round(sum(durations) / len(durations), 1) if durations else None

        category_items.append(CategoryImpactItem(
            category=cat_name,
            report_count=count,
            avg_impact_score=avg_imp,
            avg_feasibility_score=avg_feas,
            avg_duration_weeks=avg_dur,
            total_beneficiaries=beneficiaries,
        ))

    category_items.sort(key=lambda x: x.report_count, reverse=True)
    return CategoryImpactResponse(categories=category_items, insufficient_data=len(category_items) == 0)


def get_aggregate_resolution_performance(db: Session) -> ResolutionPerformanceResponse:
    """
    Calculates resolution duration, rate %, and breakdown across categories and districts.
    """
    total_reports = db.query(Report).filter(Report.is_active == True).count()
    if total_reports == 0:
        return ResolutionPerformanceResponse(
            total_resolved=0,
            overall_avg_days_to_resolve=None,
            overall_resolution_rate_percentage=0.0,
            by_category=[],
            by_district=[],
            insufficient_data=True,
        )

    resolved_reports = db.query(Report).filter(Report.is_active == True, Report.status == "Resolved").all()
    total_resolved = len(resolved_reports)
    resolution_rate = round((total_resolved / total_reports) * 100.0, 1) if total_reports > 0 else 0.0

    # Resolution days calculation
    resolution_days_list = []
    for r in resolved_reports:
        end_time = r.resolved_at or r.updated_at
        start_time = r.created_at
        if end_time and start_time:
            delta = (end_time - start_time).total_seconds() / 86400.0
            if delta >= 0:
                resolution_days_list.append(delta)

    overall_avg_days = round(sum(resolution_days_list) / len(resolution_days_list), 1) if resolution_days_list else None

    # Category breakdown
    cat_items = []
    for (cat_name,) in db.query(Report.category).filter(Report.is_active == True).distinct().all():
        if not cat_name:
            continue
        c_all = db.query(Report).filter(Report.is_active == True, Report.category == cat_name).count()
        c_resolved = db.query(Report).filter(Report.is_active == True, Report.category == cat_name, Report.status == "Resolved").all()
        c_rate = round((len(c_resolved) / c_all) * 100.0, 1) if c_all > 0 else 0.0

        c_days = []
        for r in c_resolved:
            end = r.resolved_at or r.updated_at
            if end and r.created_at:
                d = (end - r.created_at).total_seconds() / 86400.0
                if d >= 0:
                    c_days.append(d)
        cat_avg = round(sum(c_days) / len(c_days), 1) if c_days else None

        cat_items.append(ResolutionPerformanceCategoryItem(
            category=cat_name,
            total_reports=c_all,
            resolved_reports=len(c_resolved),
            resolution_rate=c_rate,
            avg_days_to_resolve=cat_avg,
        ))

    # District breakdown
    dist_items = []
    for (d_name,) in db.query(Report.district).filter(Report.is_active == True).distinct().all():
        if not d_name:
            continue
        d_all = db.query(Report).filter(Report.is_active == True, Report.district == d_name).count()
        d_resolved = db.query(Report).filter(Report.is_active == True, Report.district == d_name, Report.status == "Resolved").all()
        d_rate = round((len(d_resolved) / d_all) * 100.0, 1) if d_all > 0 else 0.0

        d_days = []
        for r in d_resolved:
            end = r.resolved_at or r.updated_at
            if end and r.created_at:
                d = (end - r.created_at).total_seconds() / 86400.0
                if d >= 0:
                    d_days.append(d)
        dist_avg = round(sum(d_days) / len(d_days), 1) if d_days else None

        dist_items.append(ResolutionPerformanceDistrictItem(
            district=d_name,
            total_reports=d_all,
            resolved_reports=len(d_resolved),
            resolution_rate=d_rate,
            avg_days_to_resolve=dist_avg,
        ))

    return ResolutionPerformanceResponse(
        total_resolved=total_resolved,
        overall_avg_days_to_resolve=overall_avg_days,
        overall_resolution_rate_percentage=resolution_rate,
        by_category=cat_items,
        by_district=dist_items,
        insufficient_data=False,
    )
