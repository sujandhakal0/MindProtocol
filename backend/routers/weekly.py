"""
routers/weekly.py
------------------
GET /weekly-summary — AI-generated weekly mental health theme summary.

Fetches last 7 evening sessions, extracts journal text, sends to Groq,
runs detect_trend() on morning scores, and returns the full weekly report.

── BIDHUR (Frontend Contract) ────────────────────────────────────────
Request:
  GET /weekly-summary
  Headers: { Authorization: Bearer <token> }
  No body or query params needed — user_id comes from the JWT.

Response 200: {
  "week_summary": string,    // 2–3 sentence AI paragraph
  "trend":        "IMPROVING" | "DECLINING" | "FLAT",
  "days_logged":  number,    // how many days had sessions this week
  "average_scores": {
    "mood":   number,
    "sleep":  number,
    "stress": number
  }
}

── DANISH (Adaptive Engine) ───────────────────────────────────────────
The "trend" field in the response is computed by detect_trend() from
services/state_classifier.py. You can also call detect_trend() directly
from your adaptive engine using the morning_sessions data.

Direct Supabase query for your adaptive engine:
  SELECT sleep_score, mood_score, stress_score, created_at
  FROM morning_sessions
  WHERE user_id = '<uuid>'
  ORDER BY created_at DESC
  LIMIT 7;
──────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, HTTPException, Depends, status
from models.weekly import WeeklySummaryResponse, AverageScores
from services.supabase_client import supabase_admin
from services.state_classifier import detect_trend
from services.groq_client import generate_weekly_summary
from utils.auth_middleware import get_current_user

router = APIRouter(tags=["Weekly Summary"])


@router.get(
    "/weekly-summary",
    response_model=WeeklySummaryResponse,
    status_code=status.HTTP_200_OK,
)
async def weekly_summary(user_id: str = Depends(get_current_user)):
    """
    Generate a weekly mental health summary for the authenticated user.

    Steps:
    1. Fetch last 7 evening_sessions (with linked morning_sessions)
    2. Build a journal context string for the Groq prompt
    3. Call Groq to generate a 2–3 sentence summary paragraph
    4. Run detect_trend() on the 7 morning scores
    5. Compute average scores
    6. Return everything to the frontend
    """

    # Step 1 — Fetch last 7 evening sessions with morning context
    try:
        result = supabase_admin\
            .table("evening_sessions")\
            .select("q1_question, q1_answer, q2_question, q2_answer, q3_question, q3_answer, morning_sessions(sleep_score, mood_score, stress_score, state_flag)")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(7)\
            .execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch sessions: {str(e)}",
        )

    sessions = result.data or []
    days_logged = len(sessions)

    if days_logged == 0:
        # No sessions yet — return a friendly empty state
        return WeeklySummaryResponse(
            week_summary="No journal entries found yet. Complete your first evening session to begin tracking.",
            trend="FLAT",
            days_logged=0,
            average_scores=AverageScores(mood=0.0, sleep=0.0, stress=0.0),
        )

    # Step 2 — Build journal context string for Groq prompt
    # Format: "Day 1 - Q: <question> A: <answer> ..."
    journal_lines = []
    morning_scores = []
    state_flags = []

    for i, session in enumerate(sessions):
        morning = session.get("morning_sessions") or {}

        # Collect morning scores for trend detection
        if morning:
            morning_scores.append({
                "mood_score":   morning.get("mood_score", 5),
                "sleep_score":  morning.get("sleep_score", 5),
                "stress_score": morning.get("stress_score", 5),
            })
            state_flags.append(morning.get("state_flag", "STABLE"))

        # Build journal text block for this day
        day_text = f"--- Day {i + 1} ---\n"
        for q_num in range(1, 4):
            q_key = f"q{q_num}_question"
            a_key = f"q{q_num}_answer"
            question = session.get(q_key, "")
            answer = session.get(a_key, "") or "[no answer]"
            if question:
                day_text += f"Q: {question}\nA: {answer}\n"

        journal_lines.append(day_text)

    journal_context = "\n".join(journal_lines)

    # Step 3 — Call Groq for the weekly summary paragraph
    try:
        week_summary = await generate_weekly_summary(
            journal_context=journal_context,
            state_flags=state_flags,
        )
    except Exception as e:
        # Non-fatal — return data without AI summary rather than 500
        week_summary = "Unable to generate AI summary at this time. Your data has been recorded."

    # Step 4 — Compute trend from morning scores
    # detect_trend() expects oldest-first; our query returns newest-first
    trend = detect_trend(list(reversed(morning_scores)))

    # Step 5 — Compute average scores
    if morning_scores:
        avg_mood  = round(sum(s["mood_score"]  for s in morning_scores) / len(morning_scores), 1)
        avg_sleep = round(sum(s["sleep_score"] for s in morning_scores) / len(morning_scores), 1)
        avg_stress = round(sum(s["stress_score"] for s in morning_scores) / len(morning_scores), 1)
    else:
        avg_mood = avg_sleep = avg_stress = 0.0

    return WeeklySummaryResponse(
        week_summary=week_summary,
        trend=trend,
        days_logged=days_logged,
        average_scores=AverageScores(
            mood=avg_mood,
            sleep=avg_sleep,
            stress=avg_stress,
        ),
    )
