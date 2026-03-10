import logging
from fastapi import APIRouter, Depends, HTTPException

from app.models.request_models import MorningCheckinRequest
from app.models.response_models import MorningCheckinResponse
from app.services.classification_service import classify_mental_state
from app.services.ai_service import generate_evening_questions
from app.services.auth_service import AuthenticatedUser
from app.db.repositories import SessionRepository
from app.dependencies import get_db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/morning-checkin", response_model=MorningCheckinResponse)
async def morning_checkin(
    body: MorningCheckinRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),  # ← auth gate
    db=Depends(get_db),
) -> MorningCheckinResponse:
    """
    Process morning brain scan.

    Authentication: Required — include Authorization: Bearer <token> header.
    The user_id is taken from the verified JWT, NOT from the request body.

    Steps:
    1. Classify mental state from slider scores
    2. Persist session to database (linked to the verified user)
    3. Generate personalised evening reflection questions
    """
    user_id = current_user.user_id  # Verified identity — cannot be faked

    # Step 1: Classify mental state
    state_flag = classify_mental_state(
        sleep_score=body.sleep_score,
        mood_score=body.mood_score,
        stress_score=body.stress_score,
        exercise=body.exercise,
    )
    logger.info(f"User {user_id} → state: {state_flag}")

    # Step 2: Persist session
    session_repo = SessionRepository(db)
    try:
        session = session_repo.create_session(
            user_id=user_id,
            sleep_score=body.sleep_score,
            mood_score=body.mood_score,
            stress_score=body.stress_score,
            exercise=body.exercise,
            morning_text=body.morning_text,
            state_flag=state_flag,
        )
    except Exception as e:
        logger.error(f"DB error creating session: {e}")
        raise HTTPException(status_code=503, detail="Database error saving session.")

    # Step 3: Generate evening questions via AI
    try:
        questions = await generate_evening_questions(
            state_flag=state_flag,
            morning_text=body.morning_text or "",
            sleep_score=body.sleep_score,
            mood_score=body.mood_score,
            stress_score=body.stress_score,
            exercise=body.exercise,
        )
    except Exception as e:
        logger.error(f"AI question generation failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable.")

    return MorningCheckinResponse(
        session_id=session["id"],
        state_flag=state_flag,
        evening_questions=questions,
    )
