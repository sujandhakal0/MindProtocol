import logging
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

from app.models.response_models import WeeklySummaryResponse
from app.services.ai_service import generate_weekly_summary
from app.services.trend_service import summarise_sessions
from app.db.repositories import SessionRepository
from app.dependencies import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/weekly-summary/{user_id}", response_model=WeeklySummaryResponse)
async def weekly_summary(
    user_id: UUID,
    db=Depends(get_db),
) -> WeeklySummaryResponse:
    """
    Generate a weekly mental health summary:
    1. Fetch last 7 days of sessions
    2. Calculate mood/stress/sleep trends
    3. Generate AI narrative insight
    """

    # Step 1: Fetch sessions
    session_repo = SessionRepository(db)
    try:
        sessions = session_repo.get_sessions_for_user(str(user_id), days=7)
    except Exception as e:
        logger.error(f"DB error fetching sessions: {e}")
        raise HTTPException(status_code=503, detail="Database error fetching sessions.")

    if not sessions:
        raise HTTPException(
            status_code=404,
            detail="No sessions found for this user in the past 7 days.",
        )

    # Step 2: Calculate trends
    stats = summarise_sessions(sessions)

    # Step 3: Generate AI summary
    try:
        ai_result = await generate_weekly_summary(sessions)
    except Exception as e:
        logger.error(f"AI weekly summary generation failed: {e}")
        # Graceful fallback
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
