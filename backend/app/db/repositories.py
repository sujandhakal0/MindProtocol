import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional
from supabase import Client

logger = logging.getLogger(__name__)


class SessionRepository:
    def __init__(self, db: Client):
        self.db = db

    def create_session(
        self,
        user_id: str,
        sleep_score: int,
        mood_score: int,
        stress_score: int,
        exercise: bool,
        morning_text: Optional[str],
        state_flag: str,
    ) -> dict:
        session_id = str(uuid.uuid4())
        data = {
            "id": session_id,
            "user_id": str(user_id),
            "sleep_score": sleep_score,
            "mood_score": mood_score,
            "stress_score": stress_score,
            "exercise": exercise,
            "morning_text": morning_text or "",
            "state_flag": state_flag,
            "created_at": datetime.utcnow().isoformat(),
        }
        result = self.db.table("sessions").insert(data).execute()
        if not result.data:
            raise RuntimeError("Failed to create session in database.")
        logger.info(f"Session created: {session_id}")
        return result.data[0]

    def get_session(self, session_id: str) -> dict:
        result = (
            self.db.table("sessions").select("*").eq("id", session_id).execute()
        )
        if not result.data:
            raise ValueError(f"Session {session_id} not found.")
        return result.data[0]

    def get_sessions_for_user(self, user_id: str, days: int = 7) -> list[dict]:
        since = (datetime.utcnow() - timedelta(days=days)).isoformat()
        result = (
            self.db.table("sessions")
            .select("*")
            .eq("user_id", str(user_id))
            .gte("created_at", since)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []


class JournalRepository:
    def __init__(self, db: Client):
        self.db = db

    def create_entry(
        self,
        user_id: str,
        session_id: str,
        answer_1: str,
        answer_2: str,
        answer_3: str,
        ai_response: str,
    ) -> dict:
        entry_id = str(uuid.uuid4())
        data = {
            "id": entry_id,
            "user_id": str(user_id),
            "session_id": str(session_id),
            "answer_1": answer_1,
            "answer_2": answer_2,
            "answer_3": answer_3,
            "ai_response": ai_response,
            "created_at": datetime.utcnow().isoformat(),
        }
        result = self.db.table("journal_entries").insert(data).execute()
        if not result.data:
            raise RuntimeError("Failed to create journal entry.")
        logger.info(f"Journal entry created: {entry_id}")
        return result.data[0]


class EmbeddingRepository:
    def __init__(self, db: Client):
        self.db = db

    def store_embedding(
        self,
        user_id: str,
        embedding: list[float],
        journal_text: str,
    ) -> dict:
        embedding_id = str(uuid.uuid4())
        data = {
            "id": embedding_id,
            "user_id": str(user_id),
            "embedding": embedding,
            "journal_text": journal_text,
            "created_at": datetime.utcnow().isoformat(),
        }
        result = self.db.table("journal_embeddings").insert(data).execute()
        if not result.data:
            raise RuntimeError("Failed to store embedding.")
        logger.info(f"Embedding stored: {embedding_id}")
        return result.data[0]

    def similarity_search(
        self, user_id: str, query_embedding: list[float], top_k: int = 3
    ) -> list[dict]:
        """
        Calls a Supabase RPC function `match_journal_embeddings` for pgvector
        cosine similarity search scoped to a user.
        """
        try:
            result = self.db.rpc(
                "match_journal_embeddings",
                {
                    "query_embedding": query_embedding,
                    "match_user_id": str(user_id),
                    "match_count": top_k,
                },
            ).execute()
            return result.data or []
        except Exception as e:
            logger.warning(f"Vector similarity search failed: {e}")
            return []
