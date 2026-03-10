"""
routers/evening.py
-------------------
POST /evening-response — Two-step evening journal flow.

Step 1 ("generate_questions"): Look up morning session → generate 3 AI questions
Step 2 ("submit_answers"):     Save answers → generate AI reframe → check for crisis

── BIDHUR (Frontend Contract) ────────────────────────────────────────
STEP 1 — Open the evening journal screen:
  POST /evening-response
  Headers: { Authorization: Bearer <token> }
  Body: {
    "step": "generate_questions",
    "morning_session_id": "<uuid from morning response>"
  }
  Response 200: {
    "evening_session_id": string,  // ← SAVE THIS for Step 2
    "questions": {
      "q1": string,
      "q2": string,
      "q3": string
    }
  }

STEP 2 — After user completes all 3 questions:
  POST /evening-response
  Headers: { Authorization: Bearer <token> }
  Body: {
    "step": "submit_answers",
    "evening_session_id": "<uuid from Step 1>",
    "q1_answer": string,
    "q2_answer": string,
    "q3_answer": string
  }
  Response 200: {
    "reframe_response": {
      "acknowledgment": string,
      "insight":        string,
      "invitation":     string
    },
    "crisis_detected": boolean   // ← if true, show crisis help resources immediately
  }

If crisis_detected is true, show the crisis resources screen before anything else.
──────────────────────────────────────────────────────────────────────
"""

import json
from fastapi import APIRouter, HTTPException, Depends, status
from models.evening import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    EveningQuestions,
    SubmitAnswersRequest,
    SubmitAnswersResponse,
    ReframeResponse,
)
from services.supabase_client import supabase_admin
from services.groq_client import generate_evening_questions, generate_reframe_response
from utils.auth_middleware import get_current_user
from typing import Union

router = APIRouter(tags=["Evening Journal"])


@router.post(
    "/evening-response",
    status_code=status.HTTP_200_OK,
)
async def evening_response(
    data: Union[GenerateQuestionsRequest, SubmitAnswersRequest],
    user_id: str = Depends(get_current_user),
):
    """
    Handles both steps of the evening journal flow.
    The 'step' field in the request body determines which path to execute.
    """

    if isinstance(data, GenerateQuestionsRequest):
        return await _step1_generate_questions(data, user_id)
    else:
        return await _step2_submit_answers(data, user_id)


# ── STEP 1 ─────────────────────────────────────────────────

async def _step1_generate_questions(
    data: GenerateQuestionsRequest,
    user_id: str,
) -> GenerateQuestionsResponse:
    """
    Look up the morning session, call Groq to generate 3 questions,
    create an evening_sessions row (partial — no answers yet),
    and return the questions to the frontend.
    """

    # 1a. Fetch the morning session to get context for question generation
    try:
        morning_result = supabase_admin.table("morning_sessions")\
            .select("*")\
            .eq("id", data.morning_session_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Morning session not found: {str(e)}",
        )

    if not morning_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Morning session not found or does not belong to this user.",
        )

    morning = morning_result.data

    # 1b. Call Groq to generate 3 personalized questions
    # Sujan's prompt logic is isolated inside groq_client.py
    try:
        questions = await generate_evening_questions(
            state_flag=morning["state_flag"],
            event_tag=morning["event_tag"],
            open_text=morning.get("open_text"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate questions from AI: {str(e)}",
        )

    # 1c. Insert a partial evening_session row (answers filled in Step 2)
    try:
        evening_result = supabase_admin.table("evening_sessions").insert({
            "user_id":             user_id,
            "morning_session_id":  data.morning_session_id,
            "q1_question":         questions["q1"],
            "q2_question":         questions["q2"],
            "q3_question":         questions["q3"],
            # Answers left null — populated in Step 2
        }).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create evening session: {str(e)}",
        )

    evening_session_id = evening_result.data[0]["id"]

    return GenerateQuestionsResponse(
        evening_session_id=evening_session_id,
        questions=EveningQuestions(
            q1=questions["q1"],
            q2=questions["q2"],
            q3=questions["q3"],
        ),
    )


# ── STEP 2 ─────────────────────────────────────────────────

async def _step2_submit_answers(
    data: SubmitAnswersRequest,
    user_id: str,
) -> SubmitAnswersResponse:
    """
    Save all 3 answers, send full journal context to Groq for reframing,
    check for crisis signals, update the evening_session row, and return
    the 3-part reframe response.
    """

    # 2a. Fetch the evening session (we need the questions + morning context)
    try:
        evening_result = supabase_admin.table("evening_sessions")\
            .select("*, morning_sessions(state_flag, open_text)")\
            .eq("id", data.evening_session_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evening session not found: {str(e)}",
        )

    if not evening_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evening session not found or does not belong to this user.",
        )

    session = evening_result.data
    morning_context = session.get("morning_sessions", {}) or {}

    # 2b. Call Groq for the AI reframe response
    try:
        reframe = await generate_reframe_response(
            state_flag=morning_context.get("state_flag", "STABLE"),
            open_text=morning_context.get("open_text"),
            q1=session["q1_question"], a1=data.q1_answer,
            q2=session["q2_question"], a2=data.q2_answer,
            q3=session["q3_question"], a3=data.q3_answer,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate reframe from AI: {str(e)}",
        )

    crisis_detected: bool = reframe.get("crisis_detected", False)

    # 2c. Update the evening_session row with answers + reframe
    try:
        supabase_admin.table("evening_sessions").update({
            "q1_answer":            data.q1_answer,
            "q2_answer":            data.q2_answer,
            "q3_answer":            data.q3_answer,
            # Store the full reframe as a JSON string for the RAG pipeline
            "ai_reframe_response":  json.dumps({
                "acknowledgment": reframe.get("acknowledgment", ""),
                "insight":        reframe.get("insight", ""),
                "invitation":     reframe.get("invitation", ""),
            }),
            "crisis_detected":      crisis_detected,
        }).eq("id", data.evening_session_id).execute()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save answers: {str(e)}",
        )

    return SubmitAnswersResponse(
        reframe_response=ReframeResponse(
            acknowledgment=reframe.get("acknowledgment", ""),
            insight=reframe.get("insight", ""),
            invitation=reframe.get("invitation", ""),
        ),
        crisis_detected=crisis_detected,
    )
