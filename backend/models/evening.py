"""
models/evening.py
------------------
Pydantic v2 models for the /evening-response endpoint.

This endpoint handles two distinct steps via the "step" discriminator field:
  - "generate_questions"  : Step 1 — fetch morning context, generate 3 questions
  - "submit_answers"      : Step 2 — save answers, get AI reframe

Bidhur: Call Step 1 when the user opens the evening journal screen.
        Call Step 2 after the user answers all 3 questions.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional


# ── STEP 1: Generate questions ─────────────────────────────

class GenerateQuestionsRequest(BaseModel):
    """Request body for Step 1 of POST /evening-response."""

    step: Literal["generate_questions"]
    morning_session_id: str = Field(
        description="UUID of today's morning session (from /morning-checkin response)",
        json_schema_extra={"example": "550e8400-e29b-41d4-a716-446655440000"},
    )


class EveningQuestions(BaseModel):
    """The 3 AI-generated questions."""
    q1: str
    q2: str
    q3: str


class GenerateQuestionsResponse(BaseModel):
    """Response for Step 1."""
    evening_session_id: str = Field(description="UUID of the created evening session")
    questions: EveningQuestions


# ── STEP 2: Submit answers + get reframe ───────────────────

class SubmitAnswersRequest(BaseModel):
    """Request body for Step 2 of POST /evening-response."""

    step: Literal["submit_answers"]
    evening_session_id: str = Field(
        description="UUID of the evening session from Step 1",
    )
    q1_answer: str = Field(max_length=2000)
    q2_answer: str = Field(max_length=2000)
    q3_answer: str = Field(max_length=2000)


class ReframeResponse(BaseModel):
    """The 3-part AI reframe returned after Step 2."""
    acknowledgment: str = Field(description="Validates the user's experience")
    insight: str = Field(description="Gentle observation or reframe")
    invitation: str = Field(description="Micro-action or intention for tomorrow")


class SubmitAnswersResponse(BaseModel):
    """Response for Step 2."""
    reframe_response: ReframeResponse
    crisis_detected: bool = Field(
        description="True if crisis signals detected — frontend shows help resources"
    )


# ── Union type for the router ───────────────────────────────
# FastAPI will try GenerateQuestionsRequest first, then SubmitAnswersRequest
from typing import Union
EveningRequest = Union[GenerateQuestionsRequest, SubmitAnswersRequest]
