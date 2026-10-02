"""
Lecture Productivity Scoring Engine.
Computes composite productivity score from multi-signal inputs.
"""


WEIGHTS = {
    "attendance": 0.40,
    "engagement": 0.30,
    "learning": 0.20,
    "feedback": 0.10,
}


def compute_productivity_score(
    attendance_rate: float,
    engagement_score: float,
    learning_score: float,
    feedback_score: float,
    custom_weights: dict = None,
) -> dict:
    """
    Compute composite productivity score.

    All inputs must be normalized to [0.0, 1.0].
    Returns score in [0, 100].

    Formula:
        P = 100 × (0.40 × A + 0.30 × E + 0.20 × L + 0.10 × F)
    """
    w = custom_weights or WEIGHTS

    # Clamp all inputs to [0, 1]
    a = max(0.0, min(1.0, attendance_rate))
    e = max(0.0, min(1.0, engagement_score))
    l = max(0.0, min(1.0, learning_score))
    f = max(0.0, min(1.0, feedback_score))

    composite = 100.0 * (
        w.get("attendance", 0.4) * a
        + w.get("engagement", 0.3) * e
        + w.get("learning", 0.2) * l
        + w.get("feedback", 0.1) * f
    )

    if composite >= 85:
        rating = "EXCELLENT"
    elif composite >= 70:
        rating = "GOOD"
    elif composite >= 55:
        rating = "AVERAGE"
    else:
        rating = "NEEDS_IMPROVEMENT"

    return {
        "compositeScore": round(composite, 2),
        "rating": rating,
        "breakdown": {
            "attendanceContribution": round(w.get("attendance", 0.4) * a * 100, 2),
            "engagementContribution": round(w.get("engagement", 0.3) * e * 100, 2),
            "learningContribution": round(w.get("learning", 0.2) * l * 100, 2),
            "feedbackContribution": round(w.get("feedback", 0.1) * f * 100, 2),
        },
        "rawSignals": {
            "attendanceRate": round(a * 100, 1),
            "engagementScore": round(e * 100, 1),
            "learningScore": round(l * 100, 1),
            "feedbackScore": round(f * 100, 1),
        },
    }
