import json
import logging
from typing import Optional

from groq import AsyncGroq
from app.config import get_settings
from app.prompts.question_prompt import (
    QUESTION_SYSTEM_PROMPT,
    QUESTION_USER_TEMPLATE,
)
from app.prompts.reframe_prompt import (
    REFRAME_SYSTEM_PROMPT,
    REFRAME_USER_TEMPLATE,
    PAST_CONTEXT_TEMPLATE,
    CRISIS_KEYWORDS,
    CRISIS_SUPPORT_MESSAGE,
    CRISIS_RESOURCES,
)
from app.prompts.weekly_prompt import WEEKLY_SYSTEM_PROMPT, WEEKLY_USER_TEMPLATE

logger = logging.getLogger(__name__)

MODEL = "llama-3.3-70b-versatile"


def _get_groq_client() -> AsyncGroq:
    settings = get_settings()
    return AsyncGroq(api_key=settings.groq_api_key)


def _detect_crisis(text: str) -> bool:
    """Check if text contains crisis indicators."""
    lower = text.lower()
    return any(keyword in lower for keyword in CRISIS_KEYWORDS)


async def _call_groq(system_prompt: str, user_message: str, max_tokens: int = 800) -> str:
    """Generic Groq API call wrapper."""
    client = _get_groq_client()
    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_tokens=max_tokens,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


async def generate_evening_questions(
    state_flag: str,
    morning_text: str,
    sleep_score: int,
    mood_score: int,
    stress_score: int,
    exercise: bool,
) -> list[str]:
    """Generate 3 personalised evening reflection questions."""
    user_message = QUESTION_USER_TEMPLATE.format(
        state_flag=state_flag,
        morning_text=morning_text or "No notes provided.",
        sleep_score=sleep_score,
        mood_score=mood_score,
        stress_score=stress_score,
        exercise="Yes" if exercise else "No",
    )

    try:
        raw = await _call_groq(QUESTION_SYSTEM_PROMPT, user_message, max_tokens=400)
        questions = _parse_numbered_list(raw)
        if len(questions) < 3:
            raise ValueError("Insufficient questions returned.")
        return questions[:3]
    except Exception as e:
        logger.error(f"generate_evening_questions failed: {e}")
        return _fallback_questions(state_flag)


async def generate_reframe_response(
    state_flag: str,
    morning_text: str,
    answer_1: str,
    answer_2: str,
    answer_3: str,
    past_entries: Optional[list[str]] = None,
) -> dict:
    """
    Generate a cognitive reframe response.
    Returns crisis structure if crisis indicators detected.
    """
    combined_text = f"{answer_1} {answer_2} {answer_3}"

    # Crisis detection gate
    if _detect_crisis(combined_text):
        logger.warning("Crisis indicators detected in journal entry.")
        return {
            "reflection": CRISIS_SUPPORT_MESSAGE,
            "reframe": "CRISIS_DETECTED",
            "micro_action": "Please reach out to a crisis line right now — you deserve support.",
            "crisis_detected": True,
            "support_message": CRISIS_SUPPORT_MESSAGE,
            "help_resources": CRISIS_RESOURCES,
        }

    # Build past context block
    past_context = ""
    if past_entries:
        entries_text = "\n".join(
            f"- {entry}" for entry in past_entries[:3]
        )
        past_context = PAST_CONTEXT_TEMPLATE.format(past_entries=entries_text)

    user_message = REFRAME_USER_TEMPLATE.format(
        state_flag=state_flag,
        morning_text=morning_text or "No notes provided.",
        answer_1=answer_1,
        answer_2=answer_2,
        answer_3=answer_3,
        past_context=past_context,
    )

    try:
        raw = await _call_groq(REFRAME_SYSTEM_PROMPT, user_message, max_tokens=600)
        parsed = _parse_json_response(raw)
        parsed["crisis_detected"] = False
        return parsed
    except Exception as e:
        logger.error(f"generate_reframe_response failed: {e}")
        return _fallback_reframe()


async def generate_weekly_summary(sessions: list[dict]) -> dict:
    """Generate a weekly mental health insight summary."""
    if not sessions:
        return {
            "mood_trend": "stable",
            "stress_trend": "stable",
            "sleep_trend": "stable",
            "weekly_summary": "Not enough data for a weekly summary yet. Keep logging daily!",
        }

    avg_mood = sum(s["mood_score"] for s in sessions) / len(sessions)
    avg_stress = sum(s["stress_score"] for s in sessions) / len(sessions)
    avg_sleep = sum(s["sleep_score"] for s in sessions) / len(sessions)
    exercise_days = sum(1 for s in sessions if s.get("exercise"))
    state_flags = list({s["state_flag"] for s in sessions})

    sessions_data = "\n".join(
        f"Day {i+1}: mood={s['mood_score']}, stress={s['stress_score']}, "
        f"sleep={s['sleep_score']}, exercise={s['exercise']}, state={s['state_flag']}"
        for i, s in enumerate(sessions)
    )

    user_message = WEEKLY_USER_TEMPLATE.format(
        sessions_data=sessions_data,
        avg_mood=round(avg_mood, 1),
        avg_stress=round(avg_stress, 1),
        avg_sleep=round(avg_sleep, 1),
        exercise_days=exercise_days,
        state_flags=", ".join(state_flags),
    )

    try:
        raw = await _call_groq(WEEKLY_SYSTEM_PROMPT, user_message, max_tokens=500)
        return _parse_json_response(raw)
    except Exception as e:
        logger.error(f"generate_weekly_summary failed: {e}")
        return _fallback_weekly()


# ── Parsing Helpers ──────────────────────────────────────────────────────────

def _parse_numbered_list(text: str) -> list[str]:
    """Extract numbered list items from LLM output."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    questions = []
    for line in lines:
        # Remove leading number and punctuation
        for prefix in ["1.", "2.", "3.", "1)", "2)", "3)"]:
            if line.startswith(prefix):
                questions.append(line[len(prefix):].strip())
                break
    return questions


def _parse_json_response(raw: str) -> dict:
    """Parse JSON from LLM output, stripping markdown fences."""
    clean = raw.strip()
    if clean.startswith("```"):
        clean = clean.split("```")[1]
        if clean.startswith("json"):
            clean = clean[4:]
    clean = clean.strip().rstrip("```").strip()
    return json.loads(clean)


# ── Fallbacks ────────────────────────────────────────────────────────────────

def _fallback_questions(state_flag: str) -> list[str]:
    return [
        "What was one moment today that felt manageable, even briefly?",
        "How did your body feel throughout the day, and what did it need?",
        "What is one thing you could release or let go of before tomorrow?",
    ]


def _fallback_reframe() -> dict:
    return {
        "reflection": (
            "Thank you for sharing your thoughts today. "
            "It takes courage to reflect honestly."
        ),
        "reframe": (
            "Every difficult day holds information about what you need. "
            "Consider this data, not a verdict on who you are."
        ),
        "micro_action": "Take 5 slow breaths before you sleep tonight.",
        "crisis_detected": False,
    }


def _fallback_weekly() -> dict:
    return {
        "mood_trend": "fluctuating",
        "stress_trend": "fluctuating",
        "sleep_trend": "stable",
        "weekly_summary": (
            "You've shown up every day this week — that matters. "
            "Continue tracking to uncover deeper patterns over time."
        ),
    }
