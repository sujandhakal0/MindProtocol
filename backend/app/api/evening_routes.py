import logging
from fastapi import APIRouter, Depends, HTTPException

from app.models.request_models import EveningResponseRequest
from app.models.response_models import EveningReframeResponse
from app.services.ai_service import generate_reframe_response
from app.services.auth_service import AuthenticatedUser
from app.db.repositories import SessionRepository, JournalRepository
from app.rag.retriever import JournalRetriever
from app.rag.vector_store import VectorStore
from app.utils.helpers import combine_journal_answers
from app.dependencies import get_db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/evening-response", response_model=EveningReframeResponse)
async def evening_response(
    body: EveningResponseRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),  # ← auth gate
    db=Depends(get_db),
) -> EveningReframeResponse:
    """
    Process evening journal submission.

    Authentication: Required — include Authorization: Bearer <token> header.

    Security: We verify the session belongs to the authenticated user before
    processing. This prevents User A from submitting journals against User B's session.

    Steps:
    1. Fetch associated morning session (and verify ownership)
    2. Combine journal answers and embed
    3. Store embedding in vector DB
    4. Retrieve similar past journals (RAG)
    5. Generate cognitive reframe via LLM
    6. Persist journal entry
    """
    user_id = current_user.user_id  # Verified identity

    # Step 1: Fetch session and verify ownership
    session_repo = SessionRepository(db)
    try:
        session = session_repo.get_session(str(body.session_id))
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Session {body.session_id} not found.")
    except Exception as e:
        logger.error(f"DB error fetching session: {e}")
        raise HTTPException(status_code=503, detail="Database error.")

    # SECURITY CHECK: ensure this session belongs to the requesting user
    # Without this, any authenticated user could journal against any session
    if session["user_id"] != user_id:
        logger.warning(
            f"User {user_id} attempted to access session belonging to {session['user_id']}"
        )
        raise HTTPException(status_code=403, detail="You do not have access to this session.")

    # Step 2: Combine answers
    journal_text = combine_journal_answers(body.answer_1, body.answer_2, body.answer_3)

    # Step 3: Store embedding
    vector_store = VectorStore(db)
    try:
        await vector_store.add_journal(user_id=user_id, journal_text=journal_text)
    except Exception as e:
        logger.warning(f"Embedding storage failed (non-fatal): {e}")

    # Step 4: RAG — retrieve similar past entries (only this user's data)
    retriever = JournalRetriever(db)
    past_entries = await retriever.get_relevant_context(
        user_id=user_id,
        query_text=journal_text,
    )

    # Step 5: Generate reframe
    try:
        result = await generate_reframe_response(
            state_flag=session["state_flag"],
            morning_text=session.get("morning_text", ""),
            answer_1=body.answer_1,
            answer_2=body.answer_2,
            answer_3=body.answer_3,
            past_entries=past_entries,
        )
    except Exception as e:
        logger.error(f"AI reframe generation failed: {e}")
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable.")

    # Step 6: Persist journal entry
    journal_repo = JournalRepository(db)
    ai_response_text = (
        result.get("reframe", "") + " " + result.get("micro_action", "")
    ).strip()

    try:
        journal_repo.create_entry(
            user_id=user_id,
            session_id=str(body.session_id),
            answer_1=body.answer_1,
            answer_2=body.answer_2,
            answer_3=body.answer_3,
            ai_response=ai_response_text,
        )
    except Exception as e:
        logger.error(f"DB error creating journal entry: {e}")
        # Non-fatal — still return the reframe

    return EveningReframeResponse(
        reflection=result.get("reflection", ""),
        reframe=result.get("reframe", ""),
        micro_action=result.get("micro_action", ""),
        crisis_detected=result.get("crisis_detected", False),
        support_message=result.get("support_message"),
        help_resources=result.get("help_resources"),
    )
