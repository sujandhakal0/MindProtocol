"""
routers/morning.py
-------------------
POST /morning-checkin — Submit daily morning brain scan.

Processes slider scores → classifies state → saves to Supabase.

── BIDHUR (Frontend Contract) ────────────────────────────────────────
Request:
  POST /morning-checkin
  Headers: { Authorization: Bearer <token> }
  Body: {
    "sleep_score":   number,   // 0–10
    "mood_score":    number,   // 0–10
    "stress_score":  number,   // 0–10
    "exercise_done": boolean,  // default false
    "open_text":     string    // optional, null if empty
  }

Response 201: {
  "morning_session_id": string,  // ← SAVE THIS. Send it to evening endpoint.
  "state_flag": string,
  "event_tag":  string,
  "message":    string
}

Store morning_session_id in your component state so the evening
journal screen can send it in the /evening-response request.
──────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, HTTPException, Depends, status
from models.morning import MorningCheckinRequest, MorningCheckinResponse
from services.supabase_client import supabase_admin
from services.state_classifier import classify_state
from utils.auth_middleware import get_current_user

router = APIRouter(tags=["Morning Check-In"])


@router.post(
    "/morning-checkin",
    response_model=MorningCheckinResponse,
    status_code=status.HTTP_201_CREATED,
)
async def morning_checkin(
    data: MorningCheckinRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Submit the user's morning brain scan.

    Processing steps:
    1. Validate all slider scores (Pydantic handles 0–10 range)
    2. Run classify_state() → state_flag + event_tag (pure function, no DB)
    3. Insert one row into morning_sessions table
    4. Return session ID + classification

    The state_flag and event_tag are used by Sujan's prompt engine
    in the evening session to generate personalized questions.
    """

    # Step 1 — Classify state (pure function, no DB involved)
    classification = classify_state(
        sleep=data.sleep_score,
        mood=data.mood_score,
        stress=data.stress_score,
        exercise=data.exercise_done,
        open_text=data.open_text,
    )

    state_flag = classification["state_flag"]
    event_tag = classification["event_tag"]

    # Step 2 — Insert into Supabase morning_sessions table
    # We use supabase_admin here so the insert bypasses RLS while still
    # tagging the row with the correct user_id from the JWT.
    try:
        result = supabase_admin.table("morning_sessions").insert({
            "user_id":       user_id,
            "sleep_score":   data.sleep_score,
            "mood_score":    data.mood_score,
            "stress_score":  data.stress_score,
            "exercise_done": data.exercise_done,
            "open_text":     data.open_text,
            "state_flag":    state_flag,
            "event_tag":     event_tag,
        }).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save morning check-in: {str(e)}",
        )

    # Extract the UUID of the newly created row
    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Morning session was not saved. Please try again.",
        )

    morning_session_id = result.data[0]["id"]

    return MorningCheckinResponse(
        morning_session_id=morning_session_id,
        state_flag=state_flag,
        event_tag=event_tag,
        message="Morning check-in recorded. See you this evening.",
    )
