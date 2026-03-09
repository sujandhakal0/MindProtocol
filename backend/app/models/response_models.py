from pydantic import BaseModel, UUID4
from typing import Optional, List
from datetime import datetime


class MorningCheckinResponse(BaseModel):
    session_id: UUID4
    state_flag: str
    evening_questions: List[str]
    message: str = "Morning check-in recorded successfully."


class EveningReframeResponse(BaseModel):
    reflection: str
    reframe: str
    micro_action: str
    crisis_detected: bool = False
    support_message: Optional[str] = None
    help_resources: Optional[List[str]] = None


class WeeklySummaryResponse(BaseModel):
    mood_trend: str
    stress_trend: str
    sleep_trend: str
    weekly_summary: str
    sessions_analyzed: int


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str = "1.0.0"
