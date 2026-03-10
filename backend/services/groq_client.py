"""
services/groq_client.py
------------------------
Groq API wrapper for all LLM calls in MindProtocol.

⚠️  SUJAN: This file is your domain. Nishant has set up the
    scaffolding and the function signatures. Replace each stub's
    return value with a real Groq API call + your system prompt.

    The function signatures and return types are FROZEN — do not
    change them, or the routers that call them will break.

All functions are async to keep FastAPI non-blocking.
"""

import os
import json
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

# Initialize the async Groq client once at import time
_groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", ""))

# Model to use — llama-3.3-70b-versatile is on the free Groq tier
GROQ_MODEL = "llama-3.3-70b-versatile"


# ──────────────────────────────────────────────────────────
# 1. GENERATE EVENING QUESTIONS
# Called by: routers/evening.py → step="generate_questions"
# ──────────────────────────────────────────────────────────

async def generate_evening_questions(
    state_flag: str,
    event_tag: str,
    open_text: str | None,
) -> dict:
    """
    Generate 3 personalized evening reflection questions based on the
    user's morning check-in state.

    Parameters
    ----------
    state_flag : "HIGH_REACTIVITY" | "LOW_BASELINE" | "PHYSICAL_DEPLETION" | "STABLE"
    event_tag  : "EVENT_TRIGGER" | "GENERAL_STATE"
    open_text  : The user's optional morning free-text (may be None)

    Returns
    -------
    dict with keys "q1", "q2", "q3" — each a question string.

    SUJAN: Replace the stub below with your Groq call.
    Your system prompt should instruct the model to:
      - Use state_flag to calibrate emotional depth
      - Use event_tag to decide if questions reference open_text
      - Return ONLY valid JSON: {"q1": "...", "q2": "...", "q3": "..."}
      - Avoid clinical language; use warm, curious tone
    """

    # ── SUJAN: Replace this stub with your real Groq call ──
    # Example structure for your implementation:
    #
    # system_prompt = f"""You are a compassionate mental health reflection guide...
    #   State: {state_flag}
    #   Event context: {open_text or 'none'}
    #   Return ONLY JSON: {{"q1": "...", "q2": "...", "q3": "..."}}
    # """
    # response = await _groq_client.chat.completions.create(
    #     model=GROQ_MODEL,
    #     messages=[{"role": "system", "content": system_prompt},
    #               {"role": "user", "content": "Generate the 3 questions now."}],
    #     temperature=0.7,
    #     max_tokens=300,
    # )
    # return json.loads(response.choices[0].message.content)

    # Stub response so the endpoint works before Sujan wires the LLM
    return {
        "q1": f"[STUB] How did today unfold for you? (state: {state_flag})",
        "q2": "[STUB] What was the most significant moment of your day?",
        "q3": "[STUB] What would you like to carry forward into tomorrow?",
    }


# ──────────────────────────────────────────────────────────
# 2. GENERATE AI REFRAME RESPONSE
# Called by: routers/evening.py → step="submit_answers"
# ──────────────────────────────────────────────────────────

async def generate_reframe_response(
    state_flag: str,
    open_text: str | None,
    q1: str, a1: str,
    q2: str, a2: str,
    q3: str, a3: str,
) -> dict:
    """
    Generate a 3-part AI reframe response after the user completes
    all 3 evening journal questions.

    Parameters
    ----------
    state_flag : morning state flag (for emotional calibration)
    open_text  : morning free-text context
    q1..q3     : the three AI-generated questions
    a1..a3     : the user's answers to each question

    Returns
    -------
    dict with keys:
      "acknowledgment" : validates the user's experience (1–2 sentences)
      "insight"        : gentle reframe or observation (1–2 sentences)
      "invitation"     : a micro-action or intention for tomorrow (1 sentence)
      "crisis_detected": bool — True if any answer signals self-harm risk

    SUJAN: Replace the stub below with your Groq call.
    Your system prompt must:
      - Instruct the model to detect crisis signals (self-harm, hopelessness)
      - Return ONLY valid JSON matching the dict structure above
      - Never be preachy — warm, specific, and grounded in the user's words
    """

    # ── SUJAN: Replace this stub ──
    # response = await _groq_client.chat.completions.create(...)
    # parsed = json.loads(response.choices[0].message.content)
    # return parsed

    return {
        "acknowledgment": "[STUB] You showed up for yourself today — that matters.",
        "insight": "[STUB] The pattern you described suggests growing self-awareness.",
        "invitation": "[STUB] Tomorrow, notice one moment where you feel genuinely at ease.",
        "crisis_detected": False,
    }


# ──────────────────────────────────────────────────────────
# 3. GENERATE WEEKLY SUMMARY
# Called by: routers/weekly.py
# ──────────────────────────────────────────────────────────

async def generate_weekly_summary(journal_context: str, state_flags: list[str]) -> str:
    """
    Generate a 2–3 sentence paragraph summarizing recurring themes
    across the user's past 7 evening journal sessions.

    Parameters
    ----------
    journal_context : All Q&A text from the week, concatenated and
                      formatted for the prompt. Nishant builds this string.
    state_flags     : List of state_flag strings from each morning session
                      e.g. ["STABLE", "HIGH_REACTIVITY", "STABLE", ...]

    Returns
    -------
    str — A warm, observational paragraph (not clinical, not preachy).

    SUJAN: Replace the stub below with your Groq call.
    """

    # ── SUJAN: Replace this stub ──
    return (
        "[STUB] This week, your journals reveal a recurring theme of "
        "navigating pressure with resilience. You consistently returned "
        "to reflection even on difficult days — that consistency is the practice."
    )
