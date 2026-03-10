"""
request_models.py
-----------------
Pydantic models for incoming API request bodies.

IMPORTANT — user_id is NOT included in any of these models.
The user's identity is established by their JWT token (Authorization header),
not by anything the client sends in the request body.

Accepting user_id in the body would be a security vulnerability:
any client could claim to be any user simply by putting a different UUID.
"""

from pydantic import BaseModel, Field
from typing import Optional


class MorningCheckinRequest(BaseModel):
    sleep_score: int = Field(..., ge=0, le=10, description="Sleep quality score 0-10")
    mood_score: int = Field(..., ge=0, le=10, description="Mood score 0-10")
    stress_score: int = Field(..., ge=0, le=10, description="Stress score 0-10")
    exercise: bool = Field(..., description="Whether user exercised today")
    morning_text: Optional[str] = Field(None, max_length=1000, description="Free-form morning reflection")

    class Config:
        json_schema_extra = {
            "example": {
                "sleep_score": 6,
                "mood_score": 4,
                "stress_score": 8,
                "exercise": False,
                "morning_text": "Woke up feeling anxious about work presentation."
            }
        }


class EveningResponseRequest(BaseModel):
    session_id: str = Field(..., description="The session_id returned from morning check-in")
    answer_1: str = Field(..., min_length=1, max_length=2000)
    answer_2: str = Field(..., min_length=1, max_length=2000)
    answer_3: str = Field(..., min_length=1, max_length=2000)

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "123e4567-e89b-12d3-a456-426614174001",
                "answer_1": "I felt overwhelmed during the morning but found calm after lunch.",
                "answer_2": "Taking a short walk helped me reset my stress levels.",
                "answer_3": "Tomorrow I want to start with a 10-minute meditation."
            }
        }
