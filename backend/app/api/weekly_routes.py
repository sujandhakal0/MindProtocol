import logging
from fastapi import APIRouter, Depends, HTTPException

from app.models.response_models import WeeklySummaryResponse
from app.services.ai_service import generate_weekly_summary
from app.services.auth_service import AuthenticatedUser
from app.services.trend_service import summarise_sessions
from app.db.repositories import SessionRepository
from app.dependencies import get_db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
async def weekly_summary(
    current_user: AuthenticatedUser = Depends(get_current_user),  # ← auth gate
    db=Depends(get_db),
) -> WeeklySummaryResponse:
    """
    Generate the authenticated user's weekly mental health summary.

    Authentication: Required — include Authorization: Bearer <token> header.

    Note: The old endpoint was GET /weekly-summary/{user_id} — the user_id in
    the URL is gone. The identity comes from the JWT token, so users can only
    ever access their own weekly summary. No user_id guessing possible.

    Steps:
    1. Fetch last 7 days of sessions for the authenticated user
    2. Calculate mood/stress/sleep trends
    3. Generate AI narrative insight
    """
    user_id = current_user.user_id  # Verified identity

    # Step 1: Fetch sessions
    session_repo = SessionRepository(db)
    try:
        sessions = session_repo.get_sessions_for_user(user_id, days=7)
    except Exception as e:
        logger.error(f"DB error fetching sessions: {e}")
        raise HTTPException(status_code=503, detail="Database error fetching sessions.")

    if not sessions:
        raise HTTPException(
            status_code=404,
            detail="No sessions found in the past 7 days. Complete at least one morning check-in first.",
        )

    # Step 2: Calculate trends
    stats = summarise_sessions(sessions)

    # Step 3: Generate AI summary
    try:
        ai_result = await generate_weekly_summary(sessions)
    except Exception as e:
        logger.error(f"AI weekly summary generation failed: {e}")
        ai_result = {
            "mood_trend": stats.get("mood_trend", "stable"),
            "stress_trend": stats.get("stress_trend", "stable"),
            "sleep_trend": stats.get("sleep_trend", "stable"),
            "weekly_summary": "Keep logging daily to unlock personalised weekly insights.",
        }

    return WeeklySummaryResponse(
        mood_trend=ai_result.get("mood_trend", stats.get("mood_trend", "stable")),
        stress_trend=ai_result.get("stress_trend", stats.get("stress_trend", "stable")),
        sleep_trend=ai_result.get("sleep_trend", stats.get("sleep_trend", "stable")),
        weekly_summary=ai_result.get("weekly_summary", ""),
        sessions_analyzed=len(sessions),
    )
