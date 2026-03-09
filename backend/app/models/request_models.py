from pydantic import BaseModel, Field, UUID4
from typing import Optional
import uuid


class MorningCheckinRequest(BaseModel):
    user_id: UUID4
    sleep_score: int = Field(..., ge=0, le=10, description="Sleep quality score 0-10")
    mood_score: int = Field(..., ge=0, le=10, description="Mood score 0-10")
    stress_score: int = Field(..., ge=0, le=10, description="Stress score 0-10")
    exercise: bool = Field(..., description="Whether user exercised today")
    morning_text: Optional[str] = Field(None, max_length=1000, description="Free-form morning reflection")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "sleep_score": 6,
                "mood_score": 4,
                "stress_score": 8,
                "exercise": False,
                "morning_text": "Woke up feeling anxious about work presentation."
            }
        }


class EveningResponseRequest(BaseModel):
    session_id: UUID4
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
