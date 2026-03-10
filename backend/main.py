# backend/main.py
# MindProtocol FastAPI Backend

import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from ai.groq_client import call_groq
from ai.prompts import (
    MORNING_CLASSIFICATION_PROMPT,
    EVENING_QUESTION_GENERATION_PROMPT,
    EVENING_REFRAME_PROMPT
)
from ai.state_classifier import classify_state, get_micro_action

app = FastAPI(
    title="MindProtocol API",
    description="Backend for MindProtocol — Nepal-US Hackathon 2026",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── REQUEST / RESPONSE MODELS ────────────────────────────────

class MorningCheckinRequest(BaseModel):
    user_id: str
    sleep: int
    mood: int
    stress: int
    exercise: str
    open_text: Optional[str] = None


class EveningResponseRequest(BaseModel):
    user_id: str
    morning_session_id: str
    state_flag: str
    event_tag: str
    event_summary: Optional[str] = None
    q1_answer: str
    q2_answer: str
    q3_answer: str


# ─── ENDPOINTS ────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "project": "MindProtocol"}


@app.get("/test-ai")
def test_ai():
    """TEMPORARY — confirms Groq API is working. Remove before demo."""
    try:
        response = call_groq(
            system_prompt="You are MindProtocol, a mental health companion.",
            user_message="Say hello and share one grounding technique.",
            temperature=0.7
        )
        return {"status": "success", "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/morning-checkin")
async def morning_checkin(data: MorningCheckinRequest):
    try:
        # Step 1 — classify state from sliders (pure Python, no LLM)
        state_flag = classify_state(
            sleep=data.sleep,
            mood=data.mood,
            stress=data.stress,
            exercise=data.exercise
        )

        # Step 2 — classify open text with LLM (only if text was provided)
        event_tag = "GENERAL_STATE"
        event_summary = None

        if data.open_text and data.open_text.strip():
            raw = call_groq(
                system_prompt=MORNING_CLASSIFICATION_PROMPT,
                user_message=data.open_text,
                temperature=0.1  # low temp for classification = consistent
            )
            try:
                parsed = json.loads(raw)
                event_tag = parsed.get("tag", "GENERAL_STATE")
                event_summary = parsed.get("event_summary", None)
            except json.JSONDecodeError:
                # if LLM returns malformed JSON, default to GENERAL_STATE
                event_tag = "GENERAL_STATE"

        # Step 3 — generate state reflection and micro-action
        state_reflections = {
            "HIGH_REACTIVITY": "Your sleep was poor and your stress is high. On days like this, your emotional brain is working overtime and your rational brain is running on low fuel. Small things may feel bigger than they are — and that is completely expected.",
            "LOW_BASELINE": "Your emotional resources are running low today. This is not a character flaw — it is your brain telling you it needs care. Be gentle with yourself today.",
            "PHYSICAL_DEPLETION": "Your body has been missing movement for a few days. Physical activity is neurological maintenance — your energy and mood are connected to it more than it might seem.",
            "STABLE": "You are starting from a solid baseline today. Your brain has the resources it needs. This is a good day to be intentional."
        }

        state_reflection = state_reflections.get(state_flag, state_reflections["STABLE"])
        micro_action = get_micro_action(state_flag, "")

        # Step 4 — generate evening preview
        if event_tag == "EVENT_TRIGGER" and event_summary:
            evening_preview = f"Tonight I will ask you about {event_summary} and how you are feeling about it now that the day is behind you."
        else:
            evening_preview = "Tonight I will ask you how your day unfolded and what you are carrying into the evening."

        return {
            "state_flag": state_flag,
            "event_tag": event_tag,
            "event_summary": event_summary,
            "state_reflection": state_reflection,
            "micro_action": micro_action,
            "evening_preview": evening_preview
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evening-response")
async def evening_response(data: EveningResponseRequest):
    try:
        # Build the full context package for the LLM
        context = f"""
MORNING STATE TODAY:
State flag: {data.state_flag}
Event: {data.event_tag} — {data.event_summary or 'no specific event'}

EVENING JOURNAL ANSWERS:
Q1 (how was your day): {data.q1_answer}
Q2 (personalized question): {data.q2_answer}
Q3 (one thing that went okay): {data.q3_answer}
"""

        raw = call_groq(
            system_prompt=EVENING_REFRAME_PROMPT,
            user_message=context,
            temperature=0.7
        )

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            # Fallback if JSON is malformed
            parsed = {
                "is_crisis": False,
                "validation": "Today asked something of you.",
                "reframe_questions": ["What would you tell a close friend who had the same day?"],
                "bridge": "Notice tomorrow whether today's weight feels any lighter."
            }

        return parsed

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/weekly-summary/{user_id}")
async def weekly_summary(user_id: str):
    # Placeholder — Danish will wire real Supabase data here
    return {
        "mood_scores": [5, 6, 4, 7, 6, 5, 8],
        "sleep_scores": [6, 5, 7, 6, 8, 7, 6],
        "stress_scores": [7, 8, 6, 5, 7, 6, 4],
        "trend": "IMPROVING",
        "ai_theme_summary": "Dashboard coming in Week 2."
    }