"""
Teacher Workload Equity & Fairness Engine.
Computes Gini coefficient and slot desirability variance across teachers.
"""
from typing import List, Dict


def compute_gini(values: List[float]) -> float:
    """Compute Gini coefficient of a list of values."""
    n = len(values)
    if n == 0:
        return 0.0
    mean_val = sum(values) / n
    if mean_val == 0:
        return 0.0
    total = sum(abs(x - y) for x in values for y in values)
    return total / (2 * n * n * mean_val)


def compute_fairness_index(
    teacher_sessions: Dict[str, List[float]],  # teacher_id -> list of slot desirability scores
) -> Dict:
    """
    Compute comprehensive fairness metrics across teachers.
    
    Args:
        teacher_sessions: dict mapping teacher_id to list of desirability scores for their sessions
    
    Returns:
        dict with gini, variance, per-teacher stats, fairness_rating
    """
    teacher_undesirable_counts = {}
    teacher_avg_desirability = {}

    UNDESIRABLE_THRESHOLD = 2.0

    for teacher_id, scores in teacher_sessions.items():
        undesirable = sum(1 for s in scores if s <= UNDESIRABLE_THRESHOLD)
        avg = sum(scores) / len(scores) if scores else 0.0
        teacher_undesirable_counts[teacher_id] = undesirable
        teacher_avg_desirability[teacher_id] = round(avg, 2)

    undesirable_values = list(teacher_undesirable_counts.values())
    gini = compute_gini([float(v) for v in undesirable_values])

    mean_undesirable = sum(undesirable_values) / len(undesirable_values) if undesirable_values else 0
    variance = sum((x - mean_undesirable) ** 2 for x in undesirable_values) / len(undesirable_values) if undesirable_values else 0

    if gini < 0.10:
        fairness_rating = "EXCELLENT"
    elif gini < 0.20:
        fairness_rating = "GOOD"
    elif gini < 0.35:
        fairness_rating = "MODERATE"
    else:
        fairness_rating = "POOR"

    return {
        "gini": round(gini, 3),
        "variance": round(variance, 3),
        "meanUndesirableSlots": round(mean_undesirable, 2),
        "fairnessRating": fairness_rating,
        "perTeacher": {
            tid: {
                "undesirableSlots": teacher_undesirable_counts[tid],
                "avgDesirability": teacher_avg_desirability[tid],
            }
            for tid in teacher_sessions
        },
    }
