import logging
from typing import Optional

logger = logging.getLogger(__name__)


def calculate_trend(values: list[float]) -> str:
    """
    Determine trend direction from a time-ordered list of values.
    Returns: 'improving' | 'declining' | 'fluctuating' | 'stable'
    Note: For stress, higher = worse; for mood/sleep, higher = better.
    """
    if len(values) < 2:
        return "stable"

    # Simple linear regression slope
    n = len(values)
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n

    numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    denominator = sum((i - x_mean) ** 2 for i in range(n))

    if denominator == 0:
        return "stable"

    slope = numerator / denominator

    # Variance check for fluctuation
    variance = sum((v - y_mean) ** 2 for v in values) / n
    std_dev = variance ** 0.5

    if std_dev > 2.0 and abs(slope) < 0.3:
        return "fluctuating"
    elif abs(slope) < 0.2:
        return "stable"
    elif slope > 0:
        return "improving"
    else:
        return "declining"


def calculate_stress_trend(values: list[float]) -> str:
    """
    For stress, a declining slope means improvement.
    Inverts the direction label accordingly.
    """
    raw = calculate_trend(values)
    inverse = {"improving": "declining", "declining": "improving"}
    return inverse.get(raw, raw)


def summarise_sessions(sessions: list[dict]) -> dict:
    """Compute aggregate statistics from a list of sessions."""
    if not sessions:
        return {}

    mood_values = [s["mood_score"] for s in sessions]
    stress_values = [s["stress_score"] for s in sessions]
    sleep_values = [s["sleep_score"] for s in sessions]

    return {
        "avg_mood": round(sum(mood_values) / len(mood_values), 1),
        "avg_stress": round(sum(stress_values) / len(stress_values), 1),
        "avg_sleep": round(sum(sleep_values) / len(sleep_values), 1),
        "exercise_days": sum(1 for s in sessions if s.get("exercise")),
        "mood_trend": calculate_trend(mood_values),
        "stress_trend": calculate_stress_trend(stress_values),
        "sleep_trend": calculate_trend(sleep_values),
        "session_count": len(sessions),
    }
