import math
import logging
import re
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.report import Report
from app.schemas.similarity_schema import SimilarProblemMatch, SimilarProblemsResponse

logger = logging.getLogger("similarity_service")

# Basic stop words for civic problem text normalization
STOP_WORDS: Set[str] = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "is", "are", "was", "were", "be", "been", "has", "have", "had",
    "it", "this", "that", "these", "those", "our", "my", "we", "they", "there",
    "please", "near", "area", "jharkhand", "district", "locality", "problem", "issue",
}


def tokenize_text(text: str) -> List[str]:
    """Extracts clean alphanumeric word tokens, ignoring common stopwords."""
    if not text:
        return []
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    words = [w for w in cleaned.split() if len(w) >= 2 and w not in STOP_WORDS]
    return words


def compute_tf_idf_vector(tokens: List[str], idf_dict: Dict[str, float]) -> Dict[str, float]:
    """Computes an L2-normalized TF-IDF vector from tokens given precomputed corpus IDF."""
    if not tokens:
        return {}

    counts = Counter(tokens)
    total_tokens = len(tokens)
    vec: Dict[str, float] = {}

    for term, count in counts.items():
        tf = count / total_tokens
        idf = idf_dict.get(term, 1.5)  # default smoothing for unseen terms
        vec[term] = tf * idf

    # L2 normalize
    norm = math.sqrt(sum(v * v for v in vec.values()))
    if norm > 0.0:
        for term in vec:
            vec[term] /= norm

    return vec


def calculate_cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    """Calculates cosine similarity between two sparse L2-normalized vectors."""
    if not vec1 or not vec2:
        return 0.0

    # Dot product of normalized vectors equals cosine similarity
    common_keys = set(vec1.keys()) & set(vec2.keys())
    dot_product = sum(vec1[k] * vec2[k] for k in common_keys)
    return max(0.0, min(1.0, float(dot_product)))


def build_corpus_idf(documents: List[List[str]]) -> Dict[str, float]:
    """Computes smoothed IDF across a list of tokenized documents."""
    total_docs = max(1, len(documents))
    doc_frequencies: Counter = Counter()

    for doc in documents:
        unique_tokens = set(doc)
        for token in unique_tokens:
            doc_frequencies[token] += 1

    idf_dict: Dict[str, float] = {}
    for term, df in doc_frequencies.items():
        idf_dict[term] = math.log((total_docs + 1) / (df + 1)) + 1.0

    return idf_dict


def prepare_report_search_text(
    title: str,
    description: Optional[str] = None,
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    problem_type: Optional[str] = None,
    district: Optional[str] = None,
    locality: Optional[str] = None,
) -> str:
    """Prepares combined normalized text representation for embedding and similarity."""
    parts = [
        title or "",
        description or "",
        f"Category: {category or ''}",
        f"Subcategory: {subcategory or ''}",
        f"Type: {problem_type or ''}",
        f"Location: {district or ''}, {locality or ''}",
    ]
    return ". ".join([p for p in parts if p.strip()])


def determine_similarity_level(score: float) -> str:
    """Maps numeric cosine score to standard ImpactForge threshold levels."""
    if score >= settings.SIMILARITY_THRESHOLD_DUPLICATE:
        return "probable duplicate"
    if score >= settings.SIMILARITY_THRESHOLD_STRONG:
        return "strong similarity"
    if score >= settings.SIMILARITY_THRESHOLD_POSSIBLE:
        return "possible similarity"
    return "no similarity"


def calculate_report_similarity(
    target_report: Report,
    candidate_report: Report,
    idf_dict: Dict[str, float],
) -> Tuple[float, str]:
    """
    Computes explainable similarity between target report and candidate report.
    Applies text semantic similarity with metadata weighting for district, locality, and category.
    """
    target_text = prepare_report_search_text(
        title=target_report.problem_title,
        description=target_report.context_and_desired_outcome,
        category=target_report.category,
        subcategory=target_report.ai_subcategory,
        problem_type=target_report.ai_problem_type,
        district=target_report.district,
        locality=target_report.locality,
    )
    candidate_text = prepare_report_search_text(
        title=candidate_report.problem_title,
        description=candidate_report.context_and_desired_outcome,
        category=candidate_report.category,
        subcategory=candidate_report.ai_subcategory,
        problem_type=candidate_report.ai_problem_type,
        district=candidate_report.district,
        locality=candidate_report.locality,
    )

    vec_target = compute_tf_idf_vector(tokenize_text(target_text), idf_dict)
    vec_cand = compute_tf_idf_vector(tokenize_text(candidate_text), idf_dict)
    text_cosine = calculate_cosine_similarity(vec_target, vec_cand)

    # Metadata Weighting & Geographic/Domain Alignment:
    target_dist = (target_report.district or "").strip().lower()
    cand_dist = (candidate_report.district or "").strip().lower()
    same_district = bool(target_dist and cand_dist and target_dist == cand_dist)

    target_cat = (target_report.category or "").strip().lower()
    cand_cat = (candidate_report.category or "").strip().lower()
    same_category = bool(target_cat and cand_cat and target_cat == cand_cat)

    target_loc = (target_report.locality or "").strip().lower()
    cand_loc = (candidate_report.locality or "").strip().lower()
    loc_tokens_target = set(target_loc.split())
    loc_tokens_cand = set(cand_loc.split())
    shared_loc = bool(loc_tokens_target & loc_tokens_cand)

    # Weight adjustment formula:
    # 1. Same district boosts credibility of being the same issue
    # 2. Different district dampens similarity significantly
    # 3. Same locality gives additional local co-location confidence
    if same_district and same_category:
        if shared_loc or target_loc == cand_loc:
            # Identical locality and same category: boost to catch co-located & duplicate complaints
            final_score = text_cosine * 1.20
        else:
            final_score = text_cosine * 1.05
    elif same_district and not same_category:
        final_score = text_cosine * 0.80
    elif not same_district and same_category:
        final_score = text_cosine * 0.70
    else:
        # Different district and different category
        final_score = text_cosine * 0.50

    final_score = max(0.0, min(1.0, round(final_score, 4)))
    level = determine_similarity_level(final_score)

    return final_score, level


def find_similar_reports(
    db: Session,
    report: Report,
    top_k: int = 5,
) -> List[Dict[str, Any]]:
    """
    Finds top similar reports for a given report in PostgreSQL.
    Filters by minimum similarity threshold (0.55) and caps results at top_k (5).
    """
    # Exclude the report itself and filter strictly against active LIVE citizen problems
    candidates: List[Report] = (
        db.query(Report)
        .filter(Report.id != report.id)
        .filter(Report.track_id != report.track_id)
        .filter(Report.status != "Rejected")
        .filter(func.coalesce(Report.verification_status, "") != "Rejected")
        .all()
    )

    if not candidates:
        return []

    # Build corpus IDF across candidate documents + target report
    corpus_texts: List[List[str]] = [
        tokenize_text(
            prepare_report_search_text(
                r.problem_title,
                r.context_and_desired_outcome,
                r.category,
                r.ai_subcategory,
                r.ai_problem_type,
                r.district,
                r.locality,
            )
        )
        for r in candidates + [report]
    ]
    idf_dict = build_corpus_idf(corpus_texts)

    scored_matches: List[Dict[str, Any]] = []

    for cand in candidates:
        score, level = calculate_report_similarity(report, cand, idf_dict)
        if score >= settings.SIMILARITY_THRESHOLD_POSSIBLE:
            location_display = f"{cand.district}, {cand.locality}" if cand.locality else cand.district
            scored_matches.append({
                "matching_track_id": cand.track_id,
                "similarity_score": round(score, 2),
                "similarity_level": level,
                "category": cand.category,
                "district": cand.district,
                "location": location_display,
                "title": cand.problem_title,
                "status": cand.status,
            })

    # Sort descending by similarity score
    scored_matches.sort(key=lambda m: m["similarity_score"], reverse=True)

    # Return top 5 matches
    return scored_matches[:top_k]


def analyze_and_store_report_similarity(db: Session, report: Report) -> None:
    """
    Executes similar-problem analysis for a newly submitted report.
    Saves results in PostgreSQL without failing report creation.
    Never auto-merges, never auto-deletes, never changes report status.
    """
    try:
        if not settings.AI_EMBEDDING_ENABLED:
            report.ai_similarity_status = "no_matches"
            report.ai_similarity_matches = []
            report.ai_similarity_model = "disabled"
            report.ai_similarity_analyzed_at = datetime.now(timezone.utc)
            db.commit()
            return

        matches = find_similar_reports(db, report, top_k=5)

        # Determine status
        if not matches:
            status = "no_matches"
        elif any(m["similarity_level"] == "probable duplicate" for m in matches):
            status = "needs_review"
        else:
            status = "completed"

        report.ai_similarity_status = status
        report.ai_similarity_matches = matches
        report.ai_similarity_model = settings.AI_EMBEDDING_MODEL
        report.ai_similarity_analyzed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(report)
        logger.info(
            f"AI similarity analysis stored for {report.track_id}: "
            f"{len(matches)} matches found (status={status})"
        )
    except Exception as e:
        logger.error(f"Failed to persist AI similarity analysis for {report.track_id}: {e}", exc_info=True)
        try:
            report.ai_similarity_status = "failed"
            db.commit()
        except Exception:
            db.rollback()
