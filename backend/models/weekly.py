"""
models/weekly.py
-----------------
Pydantic v2 models for the GET /weekly-summary endpoint.

Danish: The "trend" field maps directly to your adaptive engine output:
  - "IMPROVING"  → green indicator on the dashboard
  - "FLAT"       → yellow indicator
  - "DECLINING"  → red indicator (may also trigger Sujan's crisis logic)
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional


class AverageScores(BaseModel):
    """Average morning scores across the logged days this week."""
    mood: float = Field(description="Average mood score (0–10)")
    sleep: float = Field(description="Average sleep score (0–10)")
    stress: float = Field(description="Average stress score (0–10)")


class WeeklySummaryResponse(BaseModel):
    """Response for GET /weekly-summary."""

    week_summary: str = Field(
        description="AI-generated 2–3 sentence paragraph summarizing weekly themes"
    )
    trend: Literal["IMPROVING", "DECLINING", "FLAT"] = Field(
        description="Computed by detect_trend() from state_classifier.py"
    )
    days_logged: int = Field(
        description="Number of days with at least one session this week (max 7)"
    )
    average_scores: AverageScores
