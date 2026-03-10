"""
models/morning.py
------------------
Pydantic v2 models for the /morning-checkin endpoint.

Bidhur: The frontend should send a POST body matching MorningCheckinRequest.
        The response will match MorningCheckinResponse.
"""

from pydantic import BaseModel, Field
from typing import Optional


class MorningCheckinRequest(BaseModel):
    """
    Validated request body for POST /morning-checkin.
    FastAPI will return 422 automatically if any field is invalid.
    """

    sleep_score: int = Field(
        ...,
        ge=0, le=10,
        description="Sleep quality score from 0 (terrible) to 10 (excellent)",
        json_schema_extra={"example": 6},
    )
    mood_score: int = Field(
        ...,
        ge=0, le=10,
        description="Mood score from 0 (very low) to 10 (excellent)",
        json_schema_extra={"example": 4},
    )
    stress_score: int = Field(
        ...,
        ge=0, le=10,
        description="Stress level from 0 (none) to 10 (extreme)",
        json_schema_extra={"example": 8},
    )
    exercise_done: bool = Field(
        default=False,
        description="Whether the user exercised this morning",
    )
    open_text: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Optional free-text describing today's context",
        json_schema_extra={"example": "I have a big exam today and I'm really anxious"},
    )


class MorningCheckinResponse(BaseModel):
    """Response returned after a successful morning check-in."""

    morning_session_id: str = Field(description="UUID of the created morning session")
    state_flag: str = Field(
        description="HIGH_REACTIVITY | LOW_BASELINE | PHYSICAL_DEPLETION | STABLE"
    )
    event_tag: str = Field(description="EVENT_TRIGGER | GENERAL_STATE")
    message: str = Field(default="Morning check-in recorded. See you this evening.")
